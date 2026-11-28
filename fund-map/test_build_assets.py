import unittest
from unittest.mock import patch

import build_assets
import test_build_holdings


class AssetsTests(unittest.TestCase):
    def check_extracts_raw_asset_value_from_escaped_or_plain_json(self):
        for text in [r'{\"totalAssets\":{\"raw\":12345,\"fmt\":\"12.35K\"}}',
                     '{"totalAssets":{"raw":12345,"fmt":"12.35K"}}']:
            self.assertEqual(build_assets.parse_assets(text), 12345)

    def check_rejects_missing_invalid_or_conflicting_values(self):
        for text in ['{}', '{"totalAssets":{"raw":0}}',
                     '{"totalAssets":{"raw":1}} {"totalAssets":{"raw":2}}']:
            with self.assertRaises(ValueError):
                build_assets.parse_assets(text)

    def check_partial_failures_are_reported_and_not_fabricated(self):
        funds = [{"symbol": "A"}, {"symbol": "B"}]

        def fetch(fund):
            if fund["symbol"] == "B":
                raise ValueError("missing")
            return "A", 100

        with patch.object(build_assets, "FUNDS", funds), patch.object(build_assets, "fetch_assets", fetch):
            result = build_assets.build()
        self.assertEqual(result["assets"], {"A": 100})
        self.assertTrue(result["fetched_at"])

    def check_total_failure_does_not_replace_snapshot(self):
        with patch.object(build_assets, "FUNDS", [{"symbol": "A"}]), \
                patch.object(build_assets, "fetch_assets", side_effect=ValueError("missing")), \
                patch.object(build_assets.OUTPUT.__class__, "write_text") as write:
            with self.assertRaises(RuntimeError):
                build_assets.main()
            write.assert_not_called()

    def test_assets_and_holdings(self):
        for check in (
            self.check_extracts_raw_asset_value_from_escaped_or_plain_json,
            self.check_rejects_missing_invalid_or_conflicting_values,
            self.check_partial_failures_are_reported_and_not_fabricated,
            self.check_total_failure_does_not_replace_snapshot,
            test_build_holdings.HoldingsTests().check_ishares_holdings_accepts_human_and_iso_dates,
        ):
            with self.subTest(check=check.__name__):
                check()


if __name__ == "__main__":
    unittest.main()
