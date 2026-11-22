"""Build dated holdings snapshots from fund issuers' published holdings."""

import csv
import io
import json
import math
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "market-insights"))
from build_data import BROWSER_UA, http_get

OUTPUT = Path(__file__).with_name("holdings.json")
SOURCES = {
    "ITOT": {"url": "https://www.ishares.com/us/products/239724/x/latest-holdings.csv",
             "format": "ishares", "name": "iShares Core S&P Total U.S. Stock Market ETF"},
    "IVV": {"url": "https://www.ishares.com/us/products/239726/x/latest-holdings.csv",
            "format": "ishares", "name": "iShares Core S&P 500 ETF"},
    "SPY": {"url": "https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-spy.xlsx",
            "format": "spdr", "name": "State Street® SPDR® S&P 500® ETF Trust"},
    "SPYM": {"url": "https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-spym.xlsx",
             "format": "spdr", "name": "State Street® SPDR® Portfolio S&P 500® ETF"},
}


def parse_holdings(text):
    return parse_ishares_holdings(text, "ITOT")


def parse_ishares_holdings(text, symbol):
    rows = list(csv.reader(io.StringIO(text.lstrip("\ufeff"))))
    source = SOURCES[symbol]
    if not rows or rows[0] != [source["name"]]:
        raise ValueError(f"Unexpected fund identity in {symbol} holdings")
    date_row = next((row for row in rows if row and row[0] == "Fund Holdings as of"), None)
    if not date_row or len(date_row) != 2:
        raise ValueError(f"Missing {symbol} holdings date")
    as_of = datetime.strptime(date_row[1], "%b %d, %Y").date().isoformat()
    header_index = next((i for i, row in enumerate(rows)
                         if "Ticker" in row and "Asset Class" in row), None)
    if header_index is None:
        raise ValueError(f"Missing {symbol} holdings columns")
    header = rows[header_index]
    ticker_col = header.index("Ticker")
    asset_class_col = header.index("Asset Class")
    weight_col = next((header.index(name) for name in ("Weight (%)", "Market Weight") if name in header), None)
    if weight_col is None:
        raise ValueError(f"Missing {symbol} holding weights")
    holdings = []
    for row in rows[header_index + 1:]:
        if not row:
            break
        if max(ticker_col, asset_class_col, weight_col) >= len(row):
            raise ValueError(f"Incomplete {symbol} holding row")
        if row[asset_class_col] != "Equity":
            continue
        raw_weight = row[weight_col].replace(",", "").strip()
        if raw_weight in ("", "-"):
            continue
        try:
            weight = float(raw_weight) / 100
        except ValueError as error:
            raise ValueError(f"Invalid {symbol} holding weight") from error
        if not math.isfinite(weight) or weight < 0:
            raise ValueError(f"Invalid {symbol} holding weight")
        ticker = row[ticker_col].strip()
        if weight > 0 and ticker and ticker != "-":
            holdings.append({"symbol": ticker, "weight": weight})
    if not holdings or sum(item["weight"] for item in holdings) > 1.01:
        raise ValueError(f"Invalid {symbol} equity holdings")
    return {"as_of": as_of, "source": source["url"], "holdings": holdings}


def _column_index(reference):
    index = 0
    for char in reference:
        if not char.isalpha():
            break
        index = index * 26 + ord(char.upper()) - ord("A") + 1
    return index - 1


def parse_spdr_holdings(workbook, symbol):
    source = SOURCES[symbol]
    namespace = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    try:
        with zipfile.ZipFile(io.BytesIO(workbook)) as archive:
            shared_xml = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            strings = [
                "".join(text.text or "" for text in item.findall(".//m:t", namespace))
                for item in shared_xml.findall("m:si", namespace)
            ]
            sheet = ElementTree.fromstring(archive.read("xl/worksheets/sheet1.xml"))
    except (KeyError, zipfile.BadZipFile, ElementTree.ParseError) as error:
        raise ValueError(f"Invalid {symbol} holdings workbook") from error
    rows = []
    for row in sheet.findall(".//m:sheetData/m:row", namespace):
        values = []
        for cell in row.findall("m:c", namespace):
            value = cell.find("m:v", namespace)
            text = ""
            if value is not None:
                if cell.get("t") == "s":
                    string_index = int(value.text)
                    if string_index >= len(strings):
                        raise ValueError(f"Invalid shared-string index in {symbol} workbook")
                    text = strings[string_index]
                else:
                    text = value.text
            column = _column_index(cell.get("r", "A"))
            if len(values) <= column:
                values.extend([""] * (column + 1 - len(values)))
            values[column] = text
        rows.append(values)
    identity = next((row for row in rows if row[:1] == ["Fund Name:"]), None)
    ticker_row = next((row for row in rows if row[:1] == ["Ticker Symbol:"]), None)
    date_row = next((row for row in rows if row[:1] == ["Holdings:"]), None)
    header = next((row for row in rows if row[:3] == ["Name", "Ticker", "Identifier"]), None)
    if (not identity or len(identity) < 2 or identity[1] != source["name"]
        or not ticker_row or len(ticker_row) < 2 or ticker_row[1] != symbol
        or not date_row or len(date_row) < 2 or not header):
        raise ValueError(f"Unexpected fund identity or missing data in {symbol} workbook")
    as_of = datetime.strptime(date_row[1].removeprefix("As of "), "%d-%b-%Y").date().isoformat()
    ticker_col, weight_col = header.index("Ticker"), header.index("Weight")
    header_index = rows.index(header)
    holdings = []
    for row in rows[header_index + 1:]:
        if max(ticker_col, weight_col) >= len(row):
            continue
        ticker = row[ticker_col].strip()
        if not ticker or ticker == "-":
            continue
        try:
            weight = float(row[weight_col]) / 100
        except ValueError as error:
            raise ValueError(f"Invalid {symbol} holding weight for {ticker}: {row[weight_col]!r}") from error
        if not math.isfinite(weight):
            raise ValueError(f"Invalid {symbol} holding weight for {ticker}: {row[weight_col]!r}")
        if weight > 0:
            holdings.append({"symbol": ticker, "weight": weight})
    if not holdings or sum(item["weight"] for item in holdings) > 1.01:
        raise ValueError(f"Invalid {symbol} equity holdings")
    return {"as_of": as_of, "source": source["url"], "holdings": holdings}


def fetch_holdings(symbol):
    source = SOURCES[symbol]
    body = http_get(source["url"], {
        "User-Agent": BROWSER_UA,
        "Accept": "text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    if body is None:
        raise ValueError(f"{symbol}: issuer holdings file not found")
    if source["format"] == "ishares":
        return symbol, parse_ishares_holdings(body.decode("utf-8-sig"), symbol)
    return symbol, parse_spdr_holdings(body, symbol)


def build():
    from concurrent.futures import ThreadPoolExecutor

    funds = {}
    errors = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {symbol: pool.submit(fetch_holdings, symbol) for symbol in SOURCES}
        for symbol, future in futures.items():
            try:
                ticker, holdings = future.result()
                funds[ticker] = holdings
            except (OSError, ValueError, UnicodeError) as error:
                errors.append(f"{symbol}: {error}")
    if "ITOT" not in funds:
        raise RuntimeError("ITOT holdings unavailable; previous snapshot was not replaced. " + "; ".join(errors))
    if errors:
        print("Additional fund holdings unavailable: " + "; ".join(errors), file=sys.stderr)
        if OUTPUT.exists():
            try:
                previous = json.loads(OUTPUT.read_text(encoding="utf-8"))
                for symbol in SOURCES:
                    if symbol not in funds and symbol in previous.get("funds", {}):
                        funds[symbol] = previous["funds"][symbol]
            except (OSError, json.JSONDecodeError):
                print("Previous holdings snapshot could not be read; omitted unavailable funds.", file=sys.stderr)
    return {"fetched_at": datetime.now(timezone.utc).isoformat(), "funds": funds}


def main():
    data = build()
    OUTPUT.write_text(json.dumps(data, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote holdings for {len(data['funds'])} funds to {OUTPUT}")


if __name__ == "__main__":
    main()
