import contextlib
from datetime import datetime, timezone
from email.message import Message
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import call, patch
from urllib.error import HTTPError, URLError

import build_data

RSS = b"""<rss><channel>
<item><title> Main   headline </title><link>https://example.com/main</link></item>
<item><title>Missing link</title></item>
<item><title>Unsafe link</title><link>javascript:alert(1)</link></item>
</channel></rss>"""


class SnapshotTests(unittest.TestCase):
    def setUp(self):
        sleep = patch("build_data.time.sleep")
        self.sleep = sleep.start()
        self.addCleanup(sleep.stop)

    def http_error(self, code=429, retry_after=None):
        headers = Message()
        if retry_after is not None:
            headers["Retry-After"] = retry_after
        return HTTPError(
            build_data.SOURCE_FEEDS[0]["url"], code, "Unavailable", headers, io.BytesIO()
        )

    def test_parse_normalizes_and_filters_unusable_items(self):
        self.assertEqual(build_data.parse_feed(RSS, "World"), [{
            "header_title": "Main headline",
            "header_url": "https://example.com/main",
            "section": "World",
            "subtitles": [],
        }])

    def test_parse_rejects_non_rss_and_empty_feeds(self):
        for content in (b"<html/>", b"<rss><channel/></rss>"):
            with self.subTest(content=content), self.assertRaises(ValueError):
                build_data.parse_feed(content, "World")

    def test_fetch_reads_google_directly_with_timeout(self):
        with patch("build_data.urlopen") as open_url:
            open_url.return_value.__enter__.return_value.read.return_value = RSS
            result = build_data.fetch_feed(build_data.SOURCE_FEEDS[0])
        request = open_url.call_args.args[0]
        self.assertTrue(request.full_url.startswith("https://news.google.com/rss?"))
        self.assertEqual(open_url.call_args.kwargs["timeout"], 30)
        self.assertEqual(result[0]["section"], "Top Stories")

    def test_snapshot_collects_all_nine_sections_and_deduplicates(self):
        def fetch(feed):
            return [
                {
                    "header_title": feed["section"],
                    "header_url": f'https://example.com/{feed["section"]}',
                    "section": feed["section"],
                    "subtitles": [],
                },
                build_data.parse_feed(RSS, feed["section"])[0],
            ]

        with patch("build_data.fetch_feed", side_effect=fetch):
            snapshot = build_data.build_snapshot()
        self.assertEqual(len(snapshot["source_feeds"]), 9)
        self.assertEqual(len(snapshot["news"]), 10)
        self.assertEqual(snapshot["failed_feeds"], [])
        self.assertEqual(snapshot["news"][1]["section"], "Top Stories")
        self.assertEqual(self.sleep.call_args_list, [call(2)] * 8)

    def test_fetch_retries_transient_http_errors_with_backoff(self):
        with patch("build_data.urlopen") as open_url, \
                contextlib.redirect_stderr(io.StringIO()) as log:
            response = open_url.return_value
            response.__enter__.return_value.read.return_value = RSS
            open_url.side_effect = [self.http_error(), self.http_error(503), response]
            stories = build_data.fetch_feed(build_data.SOURCE_FEEDS[0])
        self.assertEqual(stories[0]["section"], "Top Stories")
        self.assertEqual(open_url.call_count, 3)
        self.assertEqual(self.sleep.call_args_list, [call(5), call(10)])
        self.assertIn("retrying", log.getvalue())

    def test_retry_after_seconds_and_http_date(self):
        now = datetime(2026, 11, 17, tzinfo=timezone.utc)
        for header in ("30", "Tue, 17 Nov 2026 00:00:30 GMT"):
            with self.subTest(header=header), patch("build_data.datetime") as clock:
                clock.now.return_value = now
                self.assertEqual(build_data.retry_delay(self.http_error(retry_after=header), 0), 30)

    def test_recovered_rate_limit_does_not_mark_section_failed(self):
        with patch("build_data.urlopen") as open_url, \
                contextlib.redirect_stderr(io.StringIO()):
            response = open_url.return_value
            response.__enter__.return_value.read.return_value = RSS
            open_url.side_effect = [
                self.http_error(retry_after="120"), *[response] * len(build_data.SOURCE_FEEDS),
            ]
            snapshot = build_data.build_snapshot()
        self.assertEqual(snapshot["failed_feeds"], [])
        self.assertEqual(len(snapshot["news"]), 1)
        self.assertEqual(open_url.call_count, 10)
        self.assertEqual(self.sleep.call_args_list, [call(120), *[call(2)] * 8])

    def test_invalid_or_past_retry_after_uses_backoff(self):
        for header in ("invalid", "-1", "Thu, 01 Jan 1970 00:00:00 GMT"):
            with self.subTest(header=header):
                self.assertEqual(build_data.retry_delay(self.http_error(retry_after=header), 1), 10)

    def test_excessive_cooldown_does_not_overwrite_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "news.json"
            output.write_text("previous snapshot", encoding="utf-8")
            with patch("build_data.OUTPUT_PATH", output), \
                    patch("build_data.urlopen", side_effect=self.http_error(retry_after="121")), \
                    self.assertRaisesRegex(RuntimeError, "cooldown"):
                build_data.main()
            self.assertEqual(output.read_text(encoding="utf-8"), "previous snapshot")
        self.sleep.assert_not_called()

    def test_fetch_stops_after_three_attempts(self):
        with patch("build_data.urlopen", side_effect=self.http_error()) as open_url, \
                contextlib.redirect_stderr(io.StringIO()), \
                self.assertRaises(HTTPError):
            build_data.fetch_feed(build_data.SOURCE_FEEDS[0])
        self.assertEqual(open_url.call_count, 3)
        self.assertEqual(self.sleep.call_args_list, [call(5), call(10), call(20)])

    def test_fetch_does_not_retry_other_failures(self):
        for error in (self.http_error(404), URLError("offline"), ValueError("invalid RSS")):
            with self.subTest(error=error), \
                    patch("build_data.urlopen", side_effect=error) as open_url, \
                    self.assertRaises(type(error)):
                build_data.fetch_feed(build_data.SOURCE_FEEDS[0])
            self.assertEqual(open_url.call_count, 1)
        self.sleep.assert_not_called()

    def test_partial_failure_is_recorded_and_logged(self):
        def fetch(feed):
            if feed["section"] == "Nation":
                raise URLError("upstream unavailable")
            return build_data.parse_feed(RSS, feed["section"])

        log = io.StringIO()
        with patch("build_data.fetch_feed", side_effect=fetch), contextlib.redirect_stderr(log):
            snapshot = build_data.build_snapshot()
        self.assertEqual(len(snapshot["news"]), 1)
        self.assertEqual(snapshot["failed_feeds"][0]["section"], "Nation")
        self.assertIn("upstream unavailable", snapshot["failed_feeds"][0]["error"])
        self.assertIn("Nation", log.getvalue())

    def test_total_failure_does_not_overwrite_existing_snapshot(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "news.json"
            output.write_text("previous snapshot", encoding="utf-8")
            with patch("build_data.OUTPUT_PATH", output), \
                    patch("build_data.fetch_feed", side_effect=URLError("offline")), \
                    contextlib.redirect_stderr(io.StringIO()), \
                    self.assertRaisesRegex(RuntimeError, "All Google News feeds failed"):
                build_data.main()
            self.assertEqual(output.read_text(encoding="utf-8"), "previous snapshot")

    def test_main_writes_snapshot_schema(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "news.json"
            with patch("build_data.OUTPUT_PATH", output), \
                    patch("build_data.fetch_feed", return_value=build_data.parse_feed(RSS, "World")), \
                    contextlib.redirect_stdout(io.StringIO()):
                build_data.main()
            snapshot = json.loads(output.read_text(encoding="utf-8"))
        self.assertEqual(set(snapshot), {"news", "source_feeds", "failed_feeds", "captured_at_utc"})
        self.assertTrue(snapshot["captured_at_utc"].endswith("+00:00"))


if __name__ == "__main__":
    unittest.main()
