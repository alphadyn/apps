#!/usr/bin/env python3
"""Build the Google News snapshot served by GitHub Pages."""

from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
import json
from pathlib import Path
import sys
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
import xml.etree.ElementTree as ET

REGION_QUERY = urlencode({"hl": "en-US", "gl": "US", "ceid": "US:en"})
SOURCE_FEEDS = [
    {"section": "Top Stories", "url": f"https://news.google.com/rss?{REGION_QUERY}"},
    *[
        {
            "section": topic.capitalize(),
            "url": f"https://news.google.com/rss/headlines/section/topic/{topic}?{REGION_QUERY}",
        }
        for topic in (
            "WORLD", "NATION", "BUSINESS", "TECHNOLOGY",
            "ENTERTAINMENT", "SPORTS", "SCIENCE", "HEALTH",
        )
    ],
]
OUTPUT_PATH = Path(__file__).with_name("news.json")
FEED_INTERVAL_SECONDS = 2
MAX_ATTEMPTS = 3
RETRY_BASE_SECONDS = 5
MAX_RETRY_DELAY_SECONDS = 120


def retry_delay(error: HTTPError, attempt: int) -> float:
    delay: float = RETRY_BASE_SECONDS * 2 ** attempt
    retry_after = error.headers.get("Retry-After") if error.headers else None
    if retry_after:
        seconds: float
        try:
            seconds = int(retry_after)
        except ValueError:
            try:
                retry_at = parsedate_to_datetime(retry_after)
                seconds = (retry_at - datetime.now(timezone.utc)).total_seconds()
            except (TypeError, ValueError, OverflowError):
                seconds = 0
        delay = max(delay, seconds)
    if delay > MAX_RETRY_DELAY_SECONDS:
        raise RuntimeError(
            f"Google News requested a {delay:g}s cooldown, exceeding the "
            f"{MAX_RETRY_DELAY_SECONDS}s build limit; no snapshot was written."
        ) from error
    return delay


def parse_feed(content: bytes, section: str) -> list[dict[str, object]]:
    root = ET.fromstring(content)
    if root.tag != "rss" or root.find("channel") is None:
        raise ValueError("The response is not an RSS feed.")
    stories = []
    for item in root.findall("channel/item"):
        title = " ".join((item.findtext("title") or "").split())
        link = (item.findtext("link") or "").strip()
        parsed_link = urlparse(link)
        if not title or parsed_link.scheme not in {"https", "http"} or not parsed_link.netloc:
            continue
        stories.append({
            "header_title": title,
            "header_url": link,
            "section": section,
            "subtitles": [],
        })
    if not stories:
        raise ValueError("The RSS feed contains no usable headlines.")
    return stories


def fetch_feed(feed: dict[str, str]) -> list[dict[str, object]]:
    request = Request(feed["url"], headers={"Accept": "application/rss+xml"})
    for attempt in range(MAX_ATTEMPTS):
        try:
            with urlopen(request, timeout=30) as response:
                return parse_feed(response.read(), feed["section"])
        except HTTPError as error:
            error.close()
            if error.code not in {429, 503}:
                raise
            delay = retry_delay(error, attempt)
            if attempt == MAX_ATTEMPTS - 1:
                print(
                    f'{feed["section"]}: HTTP {error.code}; attempts exhausted, '
                    f'cooling down for {delay:g}s before continuing.',
                    file=sys.stderr,
                )
                time.sleep(delay)
                raise
            print(
                f'{feed["section"]}: HTTP {error.code}; retrying in {delay:g}s '
                f'(attempt {attempt + 2}/{MAX_ATTEMPTS}).',
                file=sys.stderr,
            )
            time.sleep(delay)
    raise RuntimeError("The feed retry loop ended without a result.")


def build_snapshot() -> dict[str, object]:
    news = []
    failures = []
    seen_links = set()
    for index, feed in enumerate(SOURCE_FEEDS):
        if index:
            time.sleep(FEED_INTERVAL_SECONDS)
        try:
            stories = fetch_feed(feed)
        except (URLError, TimeoutError, OSError, ET.ParseError, ValueError) as error:
            message = str(error)
            print(f'{feed["section"]}: {message}', file=sys.stderr)
            failures.append({**feed, "error": message})
            continue
        for story in stories:
            if story["header_url"] not in seen_links:
                seen_links.add(story["header_url"])
                news.append(story)
    if not news:
        raise RuntimeError("All Google News feeds failed; no snapshot was written.")
    return {
        "source_feeds": SOURCE_FEEDS,
        "captured_at_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "failed_feeds": failures,
        "news": news,
    }


def main() -> None:
    snapshot = build_snapshot()
    OUTPUT_PATH.write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(
        f'Built {len(snapshot["news"])} headlines; '
        f'{len(snapshot["failed_feeds"])} of {len(SOURCE_FEEDS)} feeds failed.'
    )


if __name__ == "__main__":
    main()
