import io
import json
import unittest
import zipfile
from unittest.mock import patch
from xml.sax.saxutils import escape
import build_holdings


def spdr_workbook(symbol, name):
    strings = ["Fund Name:", name, "Ticker Symbol:", symbol, "Holdings:",
               "As of 19-Nov-2026", "Name", "Ticker", "Identifier", "SEDOL",
               "Weight", "Sector", "Shares Held", "Local Currency",
               "Apple Inc", "AAPL", "123", "8.25", "USD",
               "Microsoft Corp", "MSFT", "456", "5.75"]
    shared = '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    shared += "".join(f"<si><t>{escape(value)}</t></si>" for value in strings) + "</sst>"
    rows = [
        [0, 1], [2, 3], [4, 5], [],
        list(range(6, 14)),
        [14, 15, 16, 16, 17, 16, 17, 18],
        [19, 20, 21, 21, 22, 21, 22, 18],
    ]
    sheet_rows = []
    for row_number, values in enumerate(rows, 1):
        cells = "".join(
            f'<c r="{chr(65 + column)}{row_number}" t="s"><v>{value}</v></c>'
            for column, value in enumerate(values)
        )
        sheet_rows.append(f'<row r="{row_number}">{cells}</row>')
    sheet = ('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
             f'<sheetData>{"".join(sheet_rows)}</sheetData></worksheet>')
    workbook = io.BytesIO()
    with zipfile.ZipFile(workbook, "w") as archive:
        archive.writestr("xl/sharedStrings.xml", shared)
        archive.writestr("xl/worksheets/sheet1.xml", sheet)
    return workbook.getvalue()


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

    def test_extracts_ivv_weights_from_ishares_market_weight_column(self):
        text = ('iShares Core S&P 500 ETF\n'
                'Fund Holdings as of,"Nov 19, 2026"\n\n'
                'Ticker,Name,Type,Sector,Asset Class,Market Value,Market Weight\n'
                'A,Apple,EQUITY,Technology,Equity,100,60.25\n'
                'USD,Cash,CASH,Cash,Cash,10,1.00\n'
                'B,Beta,EQUITY,Technology,Equity,50,30.50\n\nFooter')
        result = build_holdings.parse_ishares_holdings(text, "IVV")
        self.assertEqual(result["as_of"], "2026-11-19")
        self.assertEqual(result["holdings"], [
            {"symbol": "A", "weight": 0.6025},
            {"symbol": "B", "weight": 0.305},
        ])

    def test_extracts_dated_state_street_workbook_weights(self):
        symbol = "SPY"
        result = build_holdings.parse_spdr_holdings(
            spdr_workbook(symbol, build_holdings.SOURCES[symbol]["name"]), symbol)
        self.assertEqual(result["as_of"], "2026-11-19")
        self.assertEqual(result["holdings"], [
            {"symbol": "AAPL", "weight": 0.0825},
            {"symbol": "MSFT", "weight": 0.0575},
        ])

    def test_rejects_mismatched_state_street_ticker(self):
        with self.assertRaisesRegex(ValueError, "Unexpected fund identity"):
            build_holdings.parse_spdr_holdings(
                spdr_workbook("SPYM", build_holdings.SOURCES["SPY"]["name"]), "SPY")

    def test_retains_prior_snapshots_when_optional_sources_fail(self):
        previous = {"fetched_at": "2026-01-01T00:00:00Z", "funds": {
            "ITOT": {"as_of": "2026-01-01", "source": "https://www.ishares.com/test", "holdings": []},
            "SPY": {"as_of": "2026-01-01", "source": "https://www.ssga.com/test", "holdings": []},
        }}

        def fetch(symbol):
            if symbol == "ITOT":
                return symbol, previous["funds"][symbol]
            raise OSError("unavailable")

        with patch.object(build_holdings, "fetch_holdings", side_effect=fetch), \
                patch.object(build_holdings, "OUTPUT") as output, \
                patch("builtins.print"):
            output.exists.return_value = True
            output.read_text.return_value = json.dumps(previous)
            result = build_holdings.build()
        self.assertEqual(result["funds"]["SPY"], previous["funds"]["SPY"])


if __name__ == "__main__":
    unittest.main()
