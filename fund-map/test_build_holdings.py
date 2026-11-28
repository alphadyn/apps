import csv
import io
import unittest

import build_holdings


class HoldingsTests(unittest.TestCase):
    def check_ishares_holdings_accepts_human_and_iso_dates(self):
        source = build_holdings.SOURCES["ITOT"]["name"]
        for date_text in ("Nov 25, 2026", "2026-11-25"):
            with self.subTest(date_text=date_text):
                output = io.StringIO()
                writer = csv.writer(output)
                writer.writerows([
                    [source],
                    ["Fund Holdings as of", date_text],
                    ["Ticker", "Asset Class", "Weight (%)"],
                    ["AAPL", "Equity", "1.0"],
                ])
                result = build_holdings.parse_ishares_holdings(
                    output.getvalue(),
                    "ITOT",
                )
                self.assertEqual(result["as_of"], "2026-11-25")
                self.assertEqual(result["holdings"], [{"symbol": "AAPL", "weight": 0.01}])


if __name__ == "__main__":
    unittest.main()
