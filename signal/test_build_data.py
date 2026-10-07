import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import URLError

import build_data

RSS = b"""<rss><channel>
<item><title> Main   headline </title><link>https://example.com/main</link></item>
<item><title>Missing link</title></item>
<item><title>Unsafe link</title><link>javascript:alert(1)</link></item>
</channel></rss>"""


class SnapshotTests(unittest.TestCase):
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
