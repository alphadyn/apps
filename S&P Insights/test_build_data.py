from datetime import date, datetime, timezone
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import build_data


def fact(start, end, val, filed="2026-01-01", form="10-Q"):
    return {"start": start, "end": end, "val": val, "filed": filed, "form": form}


def quarters(year, values, prefix=""):
    """Calendar-year quarterly facts plus a 9-month YTD and annual (so Q4 must be derived)."""
    q1, q2, q3, q4 = values
    return [
        fact(f"{year}-01-01", f"{year}-03-31", q1),
        fact(f"{year}-04-01", f"{year}-06-30", q2),
        fact(f"{year}-07-01", f"{year}-09-30", q3),
        fact(f"{year}-01-01", f"{year}-09-30", q1 + q2 + q3),
        fact(f"{year}-01-01", f"{year}-12-31", q1 + q2 + q3 + q4, form="10-K"),
    ]


class FundamentalsTests(unittest.TestCase):
    def test_ttm_derives_fourth_quarter_and_compares_year_earlier(self):
        facts = quarters(2024, (1, 2, 3, 4)) + quarters(2025, (5, 6, 7, 8)) + [fact("2026-01-01", "2026-03-31", 10)]
        current, previous, end, basis = build_data.trailing_net_income(facts)
        self.assertEqual((current, previous, end, basis), (6 + 7 + 8 + 10, 2 + 3 + 4 + 5, date(2026, 3, 31), "ttm"))

    def test_latest_filing_wins_and_non_periodic_forms_are_ignored(self):
        facts = quarters(2024, (1, 1, 1, 1)) + quarters(2025, (2, 2, 2, 2))
        facts.append(fact("2025-07-01", "2025-09-30", 3, filed="2026-05-01"))
        facts.append(fact("2025-04-01", "2025-06-30", 999, filed="2027-01-01", form="DEF 14A"))
        current, previous, _, _ = build_data.trailing_net_income(facts)
        # Q3 is restated to 3; Q4 = annual 8 - nine-month YTD 6 = 2.
        self.assertEqual((current, previous), (2 + 2 + 3 + 2, 4))

    def test_falls_back_to_fiscal_years(self):
        facts = [
            fact("2024-01-01", "2024-12-31", 100, form="10-K"),
            fact("2025-01-01", "2025-12-31", 80, form="10-K"),
        ]
        self.assertEqual(build_data.trailing_net_income(facts), (80, 100, date(2025, 12, 31), "fiscal_year"))
        self.assertIsNone(build_data.trailing_net_income([]))

    def test_share_ratio_uses_latest_period_and_rejects_implausible_values(self):
        facts = [fact("2025-04-01", "2025-06-30", 100), fact("2026-04-01", "2026-06-30", 95)]
        self.assertEqual(build_data.share_count_ratio(facts), (0.95, date(2026, 6, 30)))
        bogus = [fact("2025-04-01", "2025-06-30", 1), fact("2026-04-01", "2026-06-30", 2000)]
        self.assertIsNone(build_data.share_count_ratio(bogus))

    def test_growth_handles_negative_and_missing_bases(self):
        self.assertEqual(build_data.growth(150, 100), 0.5)
        self.assertEqual(build_data.growth(50, -100), 1.5)
        self.assertIsNone(build_data.growth(1, 0))
        self.assertIsNone(build_data.growth(None, 1))

    def test_fundamentals_fall_back_to_company_facts_then_predecessor_cik(self):
        income = quarters(2025, (1, 1, 1, 1)) + quarters(2026, (2, 2, 2, 2))
        shares = [fact("2025-07-01", "2025-09-30", 100), fact("2026-07-01", "2026-09-30", 90)]
        history = {"NetIncomeLoss": income, "WeightedAverageNumberOfDilutedSharesOutstanding": shares}
        calls = []

        def concept(cik, name):
            calls.append((cik, name))
            return history.get(name, []) if cik == 7 else []

        with patch.object(build_data, "fetch_concept", side_effect=concept), \
                patch.object(build_data, "fetch_company_facts", return_value=lambda name: []), \
                patch.dict(build_data.PREDECESSOR_CIKS, {99: 7}):
            result = build_data.fetch_fundamentals(99, today=date(2027, 1, 15))
        self.assertEqual(result["net_income"], (8, 4, date(2026, 12, 31), "ttm"))
        self.assertEqual(result["share_ratio"], (0.9, date(2026, 9, 30)))
        self.assertIn((99, "NetIncomeLoss"), calls)


class PriceAndRecordTests(unittest.TestCase):
    def chart(self, closes):
        stamps = [int(datetime(d.year, d.month, d.day, 20, tzinfo=timezone.utc).timestamp()) for d, _ in closes]
        return {"chart": {"result": [{
            "meta": {"regularMarketPrice": closes[-1][1]},
            "timestamp": stamps,
            "indicators": {"quote": [{"close": [value for _, value in closes]}]},
        }]}}

    def test_price_metrics_measures_one_year_and_one_quarter(self):
        payload = self.chart([
            (date(2025, 10, 8), 50.0), (date(2025, 10, 9), None), (date(2026, 7, 9), 80.0),
            (date(2026, 7, 13), 90.0), (date(2026, 10, 9), 100.0),
        ])
        metrics = build_data.price_metrics(payload)
        self.assertEqual(metrics["price"], 100.0)
        self.assertEqual(metrics["price_change_1y"], 1.0)
        self.assertEqual(metrics["price_change_3m"], 0.25)
        self.assertIsNone(build_data.price_metrics({"chart": {"result": []}}))

    def test_shift_months_clamps_to_month_end(self):
        self.assertEqual(build_data.shift_months(date(2026, 3, 31), -1), date(2026, 2, 28))
        self.assertEqual(build_data.shift_months(date(2024, 2, 29), -12), date(2023, 2, 28))
        self.assertEqual(build_data.shift_months(date(2026, 1, 15), -3), date(2025, 10, 15))
        self.assertEqual(build_data.shift_months(date(2025, 11, 30), 1), date(2025, 12, 30))

    def test_merge_history_dates_weekly_bars_on_friday_before_daily_window(self):
        weekly = self.chart([(date(2024, 1, 1), 10.0), (date(2024, 1, 8), 11.0), (date(2024, 1, 15), 12.0)])
        daily = self.chart([(date(2024, 1, 15), 12.5), (date(2024, 1, 16), 13.0)])
        self.assertEqual(build_data.merge_history(daily, weekly), [
            (date(2024, 1, 5), 10.0), (date(2024, 1, 12), 11.0), (date(2024, 1, 15), 12.5), (date(2024, 1, 16), 13.0),
        ])
        self.assertEqual(build_data.merge_history(daily, None)[0], (date(2024, 1, 15), 12.5))

    def test_encode_and_write_histories(self):
        points = [(date(1970, 1, 2), 1.23456789), (date(2026, 10, 9), 254.5)]
        self.assertEqual(build_data.encode_history("AAPL", points),
                         {"symbol": "AAPL", "d": [1, 20735], "c": [1.23457, 254.5]})
        with tempfile.TemporaryDirectory() as folder:
            directory = Path(folder) / "history"
            directory.mkdir()
            (directory / "OLD.json").write_text("{}")
            build_data.write_histories({"BRK-B": points}, directory)
            self.assertEqual(sorted(path.name for path in directory.iterdir()), ["BRK-B.json"])
            self.assertEqual(json.loads((directory / "BRK-B.json").read_text())["d"], [1, 20735])

    def test_build_record_combines_sources(self):
        company = {"symbol": "XYZ", "name": "XYZ Corp", "sector": "Tech", "industry": None, "cik": 1}
        prices = {"price": 110.0, "price_date": "2026-10-09", "last_close": 110.0, "close_1y": 100.0,
                  "price_change_1y": 0.1, "price_change_3m": 0.02}
        fundamentals = {"net_income": (120.0, 100.0, date(2026, 6, 30), "ttm"), "share_ratio": (0.9, date(2026, 6, 30))}
        record = build_data.build_record(company, prices, (1000.0, 100.0), fundamentals)
        self.assertEqual(record["market_cap"], 1100)
        self.assertAlmostEqual(record["market_cap_change_1y"], -0.01)
        self.assertEqual(record["net_income_change_1y"], 0.2)
        self.assertEqual(record["net_income_period_end"], "2026-06-30")
        empty = build_data.build_record(company, None, None, None)
        self.assertIsNone(empty["price"])
        self.assertIsNone(empty["market_cap"])

    def test_parse_constituents(self):
        text = 'Symbol,Security,GICS Sector,GICS Sub-Industry,CIK\nBRK.B,Berkshire Hathaway,Financials,Insurance,0001067983\n,Blank,,,\n'
        self.assertEqual(build_data.parse_constituents(text), [{
            "symbol": "BRK.B", "name": "Berkshire Hathaway", "sector": "Financials", "industry": "Insurance", "cik": 1067983,
        }])
        self.assertEqual(build_data.normalize_symbol("brk.b"), "BRK-B")


if __name__ == "__main__":
    unittest.main()
