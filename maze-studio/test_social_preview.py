from html.parser import HTMLParser
from pathlib import Path
import unittest

from PIL import Image

HERE = Path(__file__).resolve().parent
URL = "https://alphadyn.github.io/apps/maze-studio/"


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.canonical = None
        self.feed((HERE / "index.html").read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "meta":
            self.meta[attrs.get("property") or attrs.get("name")] = attrs.get("content")
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href")


class SocialPreviewTests(unittest.TestCase):
    def test_static_crawler_metadata(self):
        metadata = Metadata()
        self.assertEqual(metadata.canonical, URL)
        self.assertEqual(metadata.meta["og:url"], URL)
        self.assertEqual(metadata.meta["og:type"], "website")
        self.assertEqual(metadata.meta["twitter:card"], "summary_large_image")
        for key in ("og:image", "og:image:secure_url", "twitter:image"):
            self.assertEqual(metadata.meta[key], URL + "social-preview.png")
        for field in ("title", "description", "image:alt"):
            self.assertTrue(metadata.meta[f"og:{field}"])
            self.assertEqual(metadata.meta[f"og:{field}"], metadata.meta[f"twitter:{field}"])
        self.assertEqual(metadata.meta["description"], metadata.meta["og:description"])

    def test_preview_asset_matches_declared_dimensions(self):
        metadata = Metadata()
        with Image.open(HERE / "social-preview.png") as image:
            self.assertEqual(image.format, "PNG")
            self.assertEqual(image.mode, "RGB")
            self.assertEqual(image.size, (1200, 630))
            self.assertEqual(image.width, int(metadata.meta["og:image:width"]))
            self.assertEqual(image.height, int(metadata.meta["og:image:height"]))
            image.verify()
        self.assertEqual(metadata.meta["og:image:type"], "image/png")
        self.assertLess((HERE / "social-preview.png").stat().st_size, 1_000_000)


if __name__ == "__main__":
    unittest.main()
