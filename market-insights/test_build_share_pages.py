import json
from pathlib import Path
import tempfile
import unittest

import build_share_pages


class BuildSharePagesTests(unittest.TestCase):
    def test_overview_metadata_uses_market_insights_url_and_brand(self):
        overview = (build_share_pages.ROOT / "index.html").read_text(encoding="utf-8")
        preview = (build_share_pages.ROOT / "share-preview.html").read_text(encoding="utf-8")
        self.assertIn('<meta property="og:title" content="Market Insights">', overview)
        self.assertIn('<meta name="twitter:title" content="Market Insights">', overview)
        self.assertIn(f'<link rel="canonical" href="{build_share_pages.APP_URL}">', overview)
        self.assertIn(f'<meta property="og:image" content="{build_share_pages.IMAGE_URL}">', overview)
        self.assertIn(f'<meta name="twitter:image" content="{build_share_pages.IMAGE_URL}">', overview)
        self.assertIn('href="favicon.svg?v=3"', overview)
        self.assertIn('href="apple-touch-icon.png?v=3"', overview)
        self.assertIn('src="social-preview.png?v=5"', preview)
        self.assertIn("Market <b>Insights</b>", overview)
        self.assertIn("Market Insights (Overview)", preview)
        self.assertIn(build_share_pages.APP_URL, preview)

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

    def test_describe_fund_uses_total_return_without_stock_only_metrics(self):
        security = {
            "symbol": "FXAIX",
            "name": "Fidelity 500 Index Fund",
            "price": 200.0,
            "price_change_1y": 0.1,
            "asset_type": "fund",
            "fund_type": "Mutual fund",
            "industry": "S&P 500",
        }
        desc = build_share_pages.describe_security(security)
        self.assertIn("Fidelity 500 Index Fund (FXAIX): $200.00 (+10.0% 1Y total return)", desc)
        self.assertIn("Mutual fund · S&P 500; returns include reinvested distributions.", desc)
        self.assertNotIn("Market Cap", desc)

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
        self.assertIn("— Market Insights", html_content)
        self.assertIn("Open TEST in Market Insights", html_content)
        self.assertIn('property="og:url" content="https://alphadyn.github.io/apps/market-insights/s/TEST/"', html_content)
        self.assertIn('property="og:image" content="https://alphadyn.github.io/apps/market-insights/s/TEST/preview.png?v=1"', html_content)
        self.assertIn(f'href="{build_share_pages.APP_URL}favicon.svg?v=3"', html_content)
        self.assertIn(f'href="{build_share_pages.APP_URL}apple-touch-icon.png?v=3"', html_content)
        self.assertIn('location.replace("https://alphadyn.github.io/apps/market-insights/#symbol=TEST")', html_content)

    def test_fund_share_page_marks_type_and_omits_stock_valuations(self):
        html_content = build_share_pages.render_page({
            "symbol": "VFIAX",
            "name": "Vanguard 500 Index Fund",
            "asset_type": "fund",
            "fund_type": "Mutual fund",
            "industry": "S&P 500",
            "performance": {"1y": 0.1},
        })
        self.assertIn("Mutual fund · S&amp;P 500", html_content)
        self.assertNotIn("Market Cap: <strong>—</strong>", html_content)
        self.assertIn("6M", html_content)

    def test_fund_share_chart_is_labeled_as_total_return(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            history_dir = root / "history"
            history_dir.mkdir()
            (history_dir / "VFIAX.json").write_text(json.dumps({
                "d": list(range(12)),
                "c": [100 + day for day in range(12)],
            }), encoding="utf-8")
            original_root = build_share_pages.ROOT
            try:
                build_share_pages.ROOT = root
                chart = build_share_pages.render_chart_svg("VFIAX", total_return=True)
            finally:
                build_share_pages.ROOT = original_root

        self.assertIn("1-Year Total Return Trend", chart)
        self.assertIn('aria-label="1-year total return chart for VFIAX"', chart)

    def test_share_chart_uses_normalized_history_symbol(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            root = Path(tmpdir)
            history_dir = root / "history"
            history_dir.mkdir()
            (history_dir / "BRK-B.json").write_text(json.dumps({
                "d": list(range(12)),
                "c": [100 + day for day in range(12)],
            }), encoding="utf-8")
            original_root = build_share_pages.ROOT
            try:
                build_share_pages.ROOT = root
                chart = build_share_pages.render_chart_svg("BRK.B")
            finally:
                build_share_pages.ROOT = original_root
        self.assertIn('aria-label="1-year price chart for BRK.B"', chart)

    def test_build_pages_creates_directories_and_files(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = Path(tmpdir) / "s"
            stale_page = output_dir / "OLD"
            stale_page.mkdir(parents=True)
            (stale_page / "index.html").write_text("stale", encoding="utf-8")
            securities = [
                {"symbol": "AAPL", "name": "Apple Inc.", "price": 336.64},
                {"symbol": "MSFT", "name": "Microsoft Corp.", "price": 450.0},
                {
                    "symbol": "VFIAX",
                    "name": "Vanguard 500 Index Fund",
                    "price": 100.0,
                    "price_change_1y": 0.1,
                    "asset_type": "fund",
                    "fund_type": "Mutual fund",
                    "industry": "S&P 500",
                },
            ]
            count = build_share_pages.build_pages(output_dir, securities)
            self.assertEqual(count, 3)
            self.assertTrue((output_dir / "AAPL" / "index.html").exists())
            self.assertTrue((output_dir / "MSFT" / "index.html").exists())
            self.assertTrue((output_dir / "VFIAX" / "index.html").exists())
            self.assertFalse(stale_page.exists())
            if build_share_pages.HAS_PILLOW:
                self.assertTrue((output_dir / "AAPL" / "preview.png").exists())
                self.assertTrue((output_dir / "MSFT" / "preview.png").exists())
                self.assertTrue((output_dir / "VFIAX" / "preview.png").exists())

            aapl_html = (output_dir / "AAPL" / "index.html").read_text(encoding="utf-8")
            self.assertIn("Apple Inc.", aapl_html)
            self.assertIn("AAPL", aapl_html)


if __name__ == "__main__":
    unittest.main()
