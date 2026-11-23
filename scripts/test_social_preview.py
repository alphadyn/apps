import unittest
from html.parser import HTMLParser
from io import BytesIO
from pathlib import Path

import resvg_py
from PIL import Image, ImageChops


ROOT = Path(__file__).resolve().parent.parent


class MetadataParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}

    def handle_starttag(self, tag, attrs):
        if tag == "meta":
            attrs = dict(attrs)
            key = attrs.get("property") or attrs.get("name")
            if key:
                self.meta[key] = attrs.get("content")


class SocialPreviewTests(unittest.TestCase):
    def test_metadata_and_image(self):
        parser = MetadataParser()
        parser.feed((ROOT / "index.html").read_text(encoding="utf-8"))
        url = "https://alphadyn.github.io/apps/social-preview.png?v=4"
        for key in ("og:image", "og:image:secure_url", "twitter:image"):
            self.assertEqual(parser.meta[key], url)
        self.assertEqual(parser.meta["og:image:type"], "image/png")
        with Image.open(ROOT / "social-preview.png") as image:
            self.assertEqual(image.format, "PNG")
            self.assertEqual(image.size, (
                int(parser.meta["og:image:width"]),
                int(parser.meta["og:image:height"]),
            ))
            self.assertEqual(image.size, (1200, 630))
            mark_png = resvg_py.svg_to_bytes(
                svg_path=str(ROOT / "alphadyn-signika-mark.svg"),
                width=64,
                height=64,
            )
            with Image.open(BytesIO(mark_png)) as mark:
                actual = image.crop((66, 41, 130, 105)).convert("RGB")
                self.assertIsNone(ImageChops.difference(actual, mark.convert("RGB")).getbbox())
            apps_png = resvg_py.svg_to_bytes(
                svg_path=str(ROOT / "scripts" / "social-preview-apps.svg"),
                width=76,
                height=48,
            )
            with Image.open(BytesIO(apps_png)) as apps:
                apps = apps.convert("RGBA")
                actual = image.crop((300, 42, 376, 90)).convert("RGB")
                opaque_mask = apps.getchannel("A").point(lambda alpha: 255 if alpha == 255 else 0)
                self.assertIsNotNone(opaque_mask.getbbox())
                difference = ImageChops.difference(actual, apps.convert("RGB"))
                difference.paste((0, 0, 0), mask=ImageChops.invert(opaque_mask))
                self.assertIsNone(difference.getbbox())


if __name__ == "__main__":
    unittest.main()
