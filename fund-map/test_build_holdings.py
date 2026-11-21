import unittest
import build_holdings


class HoldingsTests(unittest.TestCase):
    def test_extracts_dated_equity_weights_and_ignores_cash(self):
        text = ('iShares Core S&P Total U.S. Stock Market ETF\n'
                'Fund Holdings as of,"Nov 19, 2026"\n\n'
                'Ticker,Name,Sector,Asset Class,Market Value,Weight (%)\n'
                'A,Apple,Tech,Equity,100,7.33\n'
                'USD,Cash,Cash,Cash,10,1.00\n\nFooter')
        result = build_holdings.parse_holdings(text)
        self.assertEqual(result["as_of"], "2026-11-19")
        self.assertEqual(result["holdings"], [{"symbol": "A", "weight": 0.0733}])

    def test_rejects_bad_data(self):
        header = ('iShares Core S&P Total U.S. Stock Market ETF\n'
                  'Fund Holdings as of,"Nov 19, 2026"\n'
                  'Ticker,Name,Sector,Asset Class,Market Value,Weight (%)\n')
        for text in [header + 'A,Apple,Tech,Equity,100,-2\n',
                     header + 'A,Apple,Tech,Equity,100,102\n',
                     header + 'A,Apple,Tech,Equity,100,nope\n',
                     header.replace('iShares Core', 'Wrong')]:
            with self.assertRaises(ValueError):
                build_holdings.parse_holdings(text)


if __name__ == "__main__":
    unittest.main()
