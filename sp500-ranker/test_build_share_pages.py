import json
from pathlib import Path
import tempfile
import unittest

import build_share_pages


class BuildSharePagesTests(unittest.TestCase):
    def test_describe_security_highlights_all_metrics(self):
        security = {
            "symbol": "NVDA",
            "name": "Nvidia",
            "price": 229.28,
            "price_change_1y": 0.191,
            "market_cap": 5_600_000_000_000,
            "pe": 58.4,
            "net_income": 63_100_000_000,
        }
        desc = build_share_pages.describe_security(security)
        self.assertIn("Nvidia (NVDA): $229.28 (+19.1% 1Y)", desc)
        self.assertIn("Market Cap: $5.60T", desc)
        self.assertIn("P/E: 58.4", desc)
        self.assertIn("Net Income: $63.1B", desc)

    def test_render_page_escapes_xss_and_contains_open_graph_tags(self):
        security = {
            "symbol": "TEST",
            "name": 'Test & Co </title><script>alert("xss")</script>',
            "price": 100.0,
            "price_change_1y": 0.05,
            "market_cap": 1_000_000_000,
            "pe": 20.0,
            "net_income": 50_000_000,
        }
        html_content = build_share_pages.render_page(security)
        self.assertNotIn('<script>alert("xss")</script>', html_content)
        self.assertIn("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;", html_content)
        self.assertIn('property="og:title" content="TEST · Test &amp; Co', html_content)
        self.assertIn('property="og:url" content="https://alphadyn.github.io/apps/sp500-ranker/s/TEST/"', html_content)
        self.assertIn('property="og:image" content="https://alphadyn.github.io/apps/sp500-ranker/s/TEST/preview.png?v=1"', html_content)
        self.assertIn('location.replace("https://alphadyn.github.io/apps/sp500-ranker/#symbol=TEST")', html_content)

    def test_build_pages_creates_directories_and_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir) / "s"
            securities = [
                {"symbol": "AAPL", "name": "Apple Inc.", "price": 336.64},
                {"symbol": "MSFT", "name": "Microsoft Corp.", "price": 450.0},
            ]
            count = build_share_pages.build_pages(output_dir, securities)
            self.assertEqual(count, 2)
            self.assertTrue((output_dir / "AAPL" / "index.html").exists())
            self.assertTrue((output_dir / "MSFT" / "index.html").exists())
            if build_share_pages.HAS_PILLOW:
                self.assertTrue((output_dir / "AAPL" / "preview.png").exists())
                self.assertTrue((output_dir / "MSFT" / "preview.png").exists())

            aapl_html = (output_dir / "AAPL" / "index.html").read_text(encoding="utf-8")
            self.assertIn("Apple Inc.", aapl_html)
            self.assertIn("AAPL", aapl_html)


if __name__ == "__main__":
    unittest.main()
