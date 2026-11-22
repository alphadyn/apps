"""Build dated holdings snapshots from fund issuers and SEC filings."""

import csv
import io
import json
import math
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlencode
from xml.etree import ElementTree

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "market-insights"))
from build_data import BROWSER_UA, SEC_UA, _sec_limiter, http_get

OUTPUT = Path(__file__).with_name("holdings.json")
MARKET_DATA = Path(__file__).resolve().parent.parent / "market-insights" / "data.json"
SEC_SEARCH_URL = "https://efts.sec.gov/LATEST/search-index"
SEC_ARCHIVE_URL = "https://www.sec.gov/Archives/edgar/data"
FXAIX_SERIES_ID = "S000006027"
SOURCES = {
    "FXAIX": {"url": SEC_SEARCH_URL, "format": "sec-nport", "series_id": FXAIX_SERIES_ID, "cik": "0000819118"},
    "FSKAX": {"url": SEC_SEARCH_URL, "format": "sec-nport", "series_id": "S000006026", "cik": "0000819118"},
    "SWPPX": {"url": SEC_SEARCH_URL, "format": "sec-nport", "series_id": "S000005911", "cik": "0000904333"},
    "SWTSX": {"url": SEC_SEARCH_URL, "format": "sec-nport", "series_id": "S000005913", "cik": "0000904333"},
    "SCHB": {"url": SEC_SEARCH_URL, "format": "sec-nport", "series_id": "S000026631", "cik": "0001454889"},
    "ITOT": {"url": "https://www.ishares.com/us/products/239724/x/latest-holdings.csv",
             "format": "ishares", "name": "iShares Core S&P Total U.S. Stock Market ETF"},
    "IVV": {"url": "https://www.ishares.com/us/products/239726/x/latest-holdings.csv",
            "format": "ishares", "name": "iShares Core S&P 500 ETF"},
    "SPY": {"url": "https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-spy.xlsx",
            "format": "spdr", "name": "State Street® SPDR® S&P 500® ETF Trust"},
    "SPYM": {"url": "https://www.ssga.com/library-content/products/fund-data/etfs/us/holdings-daily-us-en-spym.xlsx",
             "format": "spdr", "name": "State Street® SPDR® Portfolio S&P 500® ETF"},
    "VFIAX": {"url": "https://investor.vanguard.com/vmf/api/VFIAX/portfolio-holding/stock.json?start=1&count=20000",
              "format": "vanguard"},
    "VTSAX": {"url": "https://investor.vanguard.com/vmf/api/VTSAX/portfolio-holding/stock.json?start=1&count=20000",
              "format": "vanguard"},
    "VTIAX": {"url": "https://investor.vanguard.com/vmf/api/VTIAX/portfolio-holding/stock.json?start=1&count=20000",
              "format": "vanguard", "international": True},
    "VBTLX": {"url": "https://investor.vanguard.com/vmf/api/VBTLX/portfolio-holding/bond.json?start=1&count=20000",
              "format": "vanguard", "bonds": True},
}
CUSIP_SYMBOLS = {
    "02079K107": "GOOG",
    "02079K305": "GOOGL",
    "084670702": "BRK.B",
    "35137L105": "FOXA",
    "35137L204": "FOX",
    "65249B109": "NWSA",
    "65249B208": "NWS",
}


def _local_name(element):
    return element.tag.rsplit("}", 1)[-1]


def _child_text(element, name):
    return next((child.text for child in element if _local_name(child) == name), None)


def _normalize_company_name(value):
    tokens = value.upper().replace("&", " AND ").split()
    tokens = ["".join(char for char in token if char.isalnum()) for token in tokens]
    ignored = {
        "AND", "CO", "COM", "COMPANY", "CORP", "CORPORATION", "DE", "DEL",
        "HOLDINGS", "INC", "LLC", "LTD", "LIMITED", "LP", "NEW", "PLC", "THE",
    }
    return " ".join("CLASS" if token == "CL" else token for token in tokens if token not in ignored)


def _security_symbols_by_name(securities):
    symbols = {}
    for security in securities:
        if security.get("asset_type") != "fund" and isinstance(security.get("name"), str):
            symbols.setdefault(_normalize_company_name(security["name"]), []).append(security["symbol"])
    return symbols


def parse_vanguard_holdings(payload, symbol="VFIAX"):
    source = SOURCES[symbol]
    try:
        data = json.loads(payload)
        entities = data["fund"]["entity"]
        as_of = datetime.fromisoformat(data["asOfDate"]).date().isoformat()
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        raise ValueError(f"Invalid {symbol} Vanguard holdings response") from error
    if not isinstance(entities, list) or not entities:
        raise ValueError(f"Missing {symbol} Vanguard holdings")
    if data.get("next") or data.get("size") != len(entities):
        raise ValueError(f"Incomplete {symbol} Vanguard holdings")
    holdings = []
    for index, item in enumerate(entities):
        ticker = item.get("ticker")
        try:
            weight = float(item["percentWeight"]) / 100
        except (KeyError, TypeError, ValueError) as error:
            raise ValueError(f"Invalid {symbol} holding weight") from error
        if not math.isfinite(weight) or (weight < 0 and not source.get("bonds")):
            raise ValueError(f"Invalid {symbol} holding weight")

        ticker = ticker.strip() if isinstance(ticker, str) else ""
        if source.get("international") or source.get("bonds"):
            ticker = ""
        holding = {"symbol": ticker or f"UNKNOWN-{index}", "weight": weight}
        if source.get("international"):
            holding.update({
                "name": item.get("longName"), "ticker": item.get("ticker"),
                "isin": item.get("isin"), "market_value": item.get("marketValue"),
            })
        if source.get("bonds"):
            holding.update({
                "name": item.get("longName"), "cusip": item.get("cusip"), "isin": item.get("isin"),
                "market_value": item.get("marketValue"), "face_amount": item.get("faceAmount"),
                "coupon_rate": item.get("couponRate"), "maturity_date": item.get("maturityDate"),
            })
        holdings.append(holding)
    if not holdings or sum(item["weight"] for item in holdings) > 1.01:
        raise ValueError(f"Invalid {symbol} equity holdings")
    result = {"as_of": as_of, "source": source["url"], "holdings": holdings,
              "asset_class": "bond" if source.get("bonds") else "equity"}
    if symbol == "VTSAX":
        identifiers = {}
        for item in entities:
            cusip, ticker = item.get("cusip"), item.get("ticker")
            if isinstance(cusip, str) and cusip and isinstance(ticker, str) and ticker:
                identifiers.setdefault(cusip, set()).add(ticker)
        result["_cusip_symbols"] = {cusip: next(iter(tickers)) for cusip, tickers in identifiers.items()
                                    if len(tickers) == 1}
    return result


def parse_nport_holdings(xml, securities, source, expected_series_id=FXAIX_SERIES_ID,
                         symbol="FXAIX", cusip_symbols=None):
    try:
        root = ElementTree.fromstring(xml)
    except ElementTree.ParseError as error:
        raise ValueError(f"Invalid {symbol} N-PORT XML") from error
    series_ids = [element.text for element in root.iter() if _local_name(element) == "seriesId"]
    if expected_series_id not in series_ids:
        raise ValueError(f"SEC filing is not the expected {symbol} series")
    report_date = next((element.text for element in root.iter() if _local_name(element) == "repPdDate"), None)
    try:
        as_of = datetime.strptime(report_date, "%Y-%m-%d").date().isoformat()
    except (TypeError, ValueError) as error:
        raise ValueError(f"Missing or invalid {symbol} N-PORT report date") from error

    symbols_by_name = _security_symbols_by_name(securities)
    tracked = {security["symbol"].replace(".", "-") for security in securities
               if security.get("asset_type") != "fund" and isinstance(security.get("symbol"), str)}
    holdings = []
    for item in root.iter():
        if _local_name(item) != "invstOrSec" or _child_text(item, "assetCat") != "EC":
            continue
        name = _child_text(item, "name") or ""
        cusip = _child_text(item, "cusip") or ""
        raw_weight = _child_text(item, "pctVal")
        try:
            weight = float(raw_weight) / 100
        except (TypeError, ValueError) as error:
            raise ValueError(f"Invalid {symbol} N-PORT holding weight for {name or cusip}") from error
        if not math.isfinite(weight) or weight < 0:
            raise ValueError(f"Invalid {symbol} N-PORT holding weight for {name or cusip}")
        if weight == 0:
            continue
        mapped = CUSIP_SYMBOLS.get(cusip) or (cusip_symbols or {}).get(cusip)
        matches = [mapped] if mapped and mapped.replace(".", "-") in tracked else symbols_by_name.get(
            _normalize_company_name(name), [])
        ticker = matches[0] if len(matches) == 1 else f"UNKNOWN-{cusip or len(holdings)}"
        holdings.append({"symbol": ticker, "weight": weight})
    if not holdings or sum(item["weight"] for item in holdings) > 1.01:
        raise ValueError(f"Invalid {symbol} N-PORT equity holdings")
    return {"as_of": as_of, "source": source, "holdings": holdings}


def fetch_nport_holdings(symbol, cusip_symbols=None):
    series_id = SOURCES[symbol]["series_id"]
    cik = SOURCES[symbol]["cik"]
    params = urlencode({
        "q": series_id,
        "forms": "NPORT-P",
        "dateRange": "custom",
        "startdt": "2024-01-01",
        "enddt": datetime.now(timezone.utc).date().isoformat(),
        "size": "50",
    })
    _sec_limiter.wait()
    response = http_get(f"{SEC_SEARCH_URL}?{params}", {
        "User-Agent": SEC_UA, "Accept": "application/json",
    })
    if response is None:
        raise ValueError(f"SEC search returned no {symbol} N-PORT results")
    try:
        hits = json.loads(response)["hits"]["hits"]
    except (KeyError, TypeError, json.JSONDecodeError) as error:
        raise ValueError(f"Invalid SEC filing-search response for {symbol}") from error
    filings = sorted(
        (hit["_source"] for hit in hits
         if hit.get("_source", {}).get("file_type") in ("NPORT-P", "NPORT-P/A")
         and cik in hit.get("_source", {}).get("ciks", [])),
        key=lambda filing: (filing.get("period_ending", ""), filing.get("file_date", "")),
        reverse=True,
    )
    if not filings:
        raise ValueError(f"No SEC N-PORT filings found for {symbol}")
    securities = json.loads(MARKET_DATA.read_text(encoding="utf-8"))["securities"]
    errors = []
    for filing in filings:
        accession = filing.get("adsh", "").replace("-", "")
        if not accession.isdigit():
            continue
        source = f"{SEC_ARCHIVE_URL}/{int(cik)}/{accession}/primary_doc.xml"
        try:
            _sec_limiter.wait()
            body = http_get(source, {"User-Agent": SEC_UA, "Accept": "application/xml"})
            if body is None:
                continue
            return symbol, parse_nport_holdings(body, securities, source, series_id, symbol, cusip_symbols)
        except (OSError, ValueError, UnicodeError) as error:
            errors.append(str(error))
    raise ValueError(f"No usable {symbol} N-PORT report was found. " + "; ".join(errors))


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


def fetch_holdings(symbol, cusip_symbols=None):
    source = SOURCES[symbol]
    if source["format"] == "sec-nport":
        return fetch_nport_holdings(symbol, cusip_symbols)
    body = http_get(source["url"], {
        "User-Agent": BROWSER_UA,
        "Accept": "text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    if body is None:
        raise ValueError(f"{symbol}: issuer holdings file not found")
    if source["format"] == "ishares":
        return symbol, parse_ishares_holdings(body.decode("utf-8-sig"), symbol)
    if source["format"] == "vanguard":
        return symbol, parse_vanguard_holdings(body, symbol)
    return symbol, parse_spdr_holdings(body, symbol)


def build():
    from concurrent.futures import ThreadPoolExecutor

    funds = {}
    errors = []
    cusip_symbols = {}
    with ThreadPoolExecutor(max_workers=6) as pool:
        try:
            ticker, portfolio = fetch_holdings("VTSAX")
            cusip_symbols = portfolio.pop("_cusip_symbols", {})
            funds[ticker] = portfolio
        except (OSError, ValueError, UnicodeError) as error:
            errors.append(f"VTSAX: {error}")
        futures = {symbol: pool.submit(fetch_holdings, symbol, cusip_symbols)
                   for symbol in SOURCES if symbol != "VTSAX"}
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
    for primary, other in (("VFIAX", "VOO"), ("VTSAX", "VTI"),
                           ("VTIAX", "VXUS"), ("VBTLX", "BND")):
        if primary in funds:
            funds[other] = funds[primary]
    return {"fetched_at": datetime.now(timezone.utc).isoformat(), "funds": funds}


def main():
    data = build()
    OUTPUT.write_text(json.dumps(data, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote holdings for {len(data['funds'])} funds to {OUTPUT}")


if __name__ == "__main__":
    main()
