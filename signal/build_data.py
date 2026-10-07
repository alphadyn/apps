#!/usr/bin/env python3
"""Build the Google News snapshot served by GitHub Pages."""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from urllib.error import URLError
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
    with urlopen(request, timeout=30) as response:
        return parse_feed(response.read(), feed["section"])


def build_snapshot() -> dict[str, object]:
    news = []
    failures = []
    seen_links = set()
    with ThreadPoolExecutor(max_workers=3) as executor:
        requests = [(feed, executor.submit(fetch_feed, feed)) for feed in SOURCE_FEEDS]
        for feed, future in requests:
            try:
                stories = future.result()
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
