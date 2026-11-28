import json
import re
import unittest
from io import BytesIO
from pathlib import Path
from unittest.mock import patch

from scripts.update_photo_gallery_catalog import fetch_catalog


ROOT = Path(__file__).resolve().parents[1]


class PhotoGalleryTests(unittest.TestCase):
    def check_bundled_collection_size_uniqueness_and_quality(self):
        source = (ROOT / "photo-gallery" / "photos.js").read_text()
        photos = json.loads(source.split("const PICSUM_PHOTOS = ", 1)[1].rstrip(";\n"))
        app = (ROOT / "photo-gallery" / "app.js").read_text()
        unsplash_ids = re.findall(r'"(photo-[^"]+)"', app)
        self.assertGreater(len(photos) + len(unsplash_ids), 1000)
        self.assertEqual(len({photo["id"] for photo in photos}), len(photos))
        self.assertEqual(len(set(unsplash_ids)), len(unsplash_ids))
        for photo in photos:
            self.assertTrue(photo["id"].isdecimal())
            self.assertGreaterEqual(photo["width"], 1200)
            self.assertGreater(photo["height"], 0)

    def check_catalog_loads_before_app(self):
        html = (ROOT / "photo-gallery" / "index.html").read_text()
        self.assertLess(html.index('src="photos.js"'), html.index('src="app.js"'))

    @patch("scripts.update_photo_gallery_catalog.urlopen")
    def check_refresh_paginates_and_excludes_low_resolution(self, request):
        photos = [
            {"id": str(index), "width": 2400, "height": 1600}
            for index in range(987)
        ]
        photos.append({"id": "9999", "width": 600, "height": 400})
        request.side_effect = [
            BytesIO(json.dumps(photos[start:start + 100]).encode())
            for start in range(0, len(photos), 100)
        ]
        self.assertEqual(fetch_catalog(), photos[:-1])
        self.assertEqual(request.call_count, 10)
        self.assertIn("page=10&limit=100", request.call_args.args[0])

    @patch("scripts.update_photo_gallery_catalog.urlopen")
    def check_refresh_rejects_unexpectedly_small_collection(self, request):
        request.return_value = BytesIO(b"[]")
        with self.assertRaisesRegex(ValueError, "fewer than 981"):
            fetch_catalog()

    @patch("scripts.update_photo_gallery_catalog.urlopen")
    def check_refresh_rejects_invalid_dimensions(self, request):
        request.return_value = BytesIO(b'[{"id":"1","width":1200,"height":0}]')
        with self.assertRaisesRegex(ValueError, "Invalid Picsum photo"):
            fetch_catalog()

    def test_photo_gallery(self):
        for check in (
            self.check_bundled_collection_size_uniqueness_and_quality,
            self.check_catalog_loads_before_app,
            self.check_refresh_paginates_and_excludes_low_resolution,
            self.check_refresh_rejects_unexpectedly_small_collection,
            self.check_refresh_rejects_invalid_dimensions,
        ):
            with self.subTest(check=check.__name__):
                check()


if __name__ == "__main__":
    unittest.main()
