"""Build the static S&P 500 Ranker snapshot (data.json) for GitHub Pages.

Sources:
  * S&P 500 constituents: datasets/s-and-p-500-companies (GitHub)
  * Current market capitalization: Nasdaq stock screener
  * Daily closing prices: Yahoo Finance chart API
  * Net income and diluted share counts: SEC EDGAR XBRL company concepts

If the constituent list or prices cannot be loaded, the existing snapshot is kept
so a transient upstream outage does not break the Pages deployment.
"""

from __future__ import annotations

import csv
import gzip
import io
import json
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

SP500_URL = "https://raw.githubusercontent.com/datasets/s-and-p-500-companies/master/data/constituents.csv"
SCREENER_URL = "https://api.nasdaq.com/api/screener/stocks"
CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/"
SEC_CONCEPT_URL = "https://data.sec.gov/api/xbrl/companyconcept/CIK{cik:010d}/us-gaap/{concept}.json"
SEC_FACTS_URL = "https://data.sec.gov/api/xbrl/companyfacts/CIK{cik:010d}.json"

OUTPUT = Path(__file__).with_name("data.json")
HISTORY_DIR = Path(__file__).with_name("history")
EPOCH = date(1970, 1, 1)
HISTORY_START = -2208988800  # 1900-01-01; Yahoo truncates at period1, so start before any listing
DAILY_HISTORY_DAYS = 2 * 366 + 14  # daily closes cover 1W-2Y; weekly closes cover 5Y, 10Y, and All
BROWSER_UA = "Mozilla/5.0 (compatible; AlphadynSP500Ranker/1.0)"
# SEC requires a descriptive User-Agent with contact details.
SEC_UA = "Alphadyn Apps S&P 500 Ranker contact@alphadyn.ai"
SEC_MIN_INTERVAL = 0.12  # stay under SEC's 10 requests/second limit

NET_INCOME_CONCEPTS = (
    "NetIncomeLoss",
    "NetIncomeLossAvailableToCommonStockholdersBasic",
    "ProfitLoss",
)
SHARE_CONCEPTS = (
    "WeightedAverageNumberOfDilutedSharesOutstanding",
    "WeightedAverageNumberOfSharesOutstandingBasic",
)
QUARTER_DAYS = (75, 105)
YTD_9M_DAYS = (250, 290)
ANNUAL_DAYS = (350, 380)
STALE_AFTER_DAYS = 550
# Holding-company reorganizations create a new CIK with no XBRL history; fall back to the predecessor's filings.
PREDECESSOR_CIKS = {
    2115436: 34088,  # ExxonMobil Holdings Corp -> Exxon Mobil Corp (2026)
}
# Share-count changes outside this band almost always reflect inconsistent XBRL tagging, not real issuance.
SHARE_RATIO_BOUNDS = (0.5, 2.0)


class _RateLimiter:
    def __init__(self, interval):
        self.interval = interval
        self.lock = threading.Lock()
        self.next_at = 0.0

    def wait(self):
        with self.lock:
            now = time.monotonic()
            delay = self.next_at - now
            self.next_at = max(now, self.next_at) + self.interval
        if delay > 0:
            time.sleep(delay)


_sec_limiter = _RateLimiter(SEC_MIN_INTERVAL)


def http_get(url, headers, attempts=4, timeout=30):
    """GET a URL and return bytes, or None for 404. Retries throttling and server errors."""
    headers = {**headers, "Accept-Encoding": "gzip"}
    for attempt in range(attempts):
        try:
            with urlopen(Request(url, headers=headers), timeout=timeout) as response:
                body = response.read()
                return gzip.decompress(body) if response.headers.get("Content-Encoding") == "gzip" else body
        except HTTPError as error:
            if error.code == 404:
                return None
            retryable = error.code in (403, 429) or error.code >= 500
            if not retryable or attempt == attempts - 1:
                raise
        except (URLError, TimeoutError):
            if attempt == attempts - 1:
                raise
        time.sleep(1.5 * (attempt + 1))
    return None


# ---------------------------------------------------------------------------
# Constituents and market caps
# ---------------------------------------------------------------------------

def normalize_symbol(symbol):
    return symbol.strip().upper().replace(".", "-").replace("/", "-")


def parse_constituents(text):
    rows = []
    for row in csv.DictReader(io.StringIO(text)):
        symbol = (row.get("Symbol") or "").strip().upper()
        name = (row.get("Security") or "").strip()
        if not symbol or not name:
            continue
        cik = (row.get("CIK") or "").strip()
        rows.append({
            "symbol": symbol,
            "name": name,
            "sector": (row.get("GICS Sector") or "").strip() or None,
            "industry": (row.get("GICS Sub-Industry") or "").strip() or None,
            "cik": int(cik) if cik.isdigit() else None,
        })
    rows.sort(key=lambda item: item["symbol"])
    return rows


def parse_money(value):
    try:
        number = float(str(value).replace("$", "").replace(",", "").strip())
    except ValueError:
        return None
    return number if number > 0 else None


def fetch_market_caps(symbols):
    """Return {normalized symbol: (market cap, last sale price)} from the Nasdaq screener."""
    wanted = {normalize_symbol(symbol) for symbol in symbols}
    caps = {}
    offset, limit, total = 0, 1000, None
    headers = {"Accept": "application/json", "User-Agent": BROWSER_UA, "Referer": "https://www.nasdaq.com/"}
    while total is None or offset < total:
        query = urlencode({"tableonly": "true", "limit": limit, "offset": offset, "exchange": "all",
                           "sortColumn": "marketCap", "sortOrder": "DESC"})
        payload = json.loads(http_get(f"{SCREENER_URL}?{query}", headers) or b"{}")
        data = payload.get("data") or {}
        rows = (data.get("table") or {}).get("rows") or []
        total = int(data.get("totalrecords") or 0)
        for row in rows:
            symbol = normalize_symbol(str(row.get("symbol") or ""))
            cap, price = parse_money(row.get("marketCap")), parse_money(row.get("lastsale"))
            if symbol in wanted and cap and price:
                caps[symbol] = (cap, price)
        if not rows or wanted <= caps.keys():
            break
        offset += limit
    return caps


# ---------------------------------------------------------------------------
# Prices
# ---------------------------------------------------------------------------

def close_on_or_before(points, target):
    """Return the last (date, close) at or before target, or None."""
    chosen = None
    for point in points:
        if point[0] > target:
            break
        chosen = point
    return chosen


def growth(current, previous):
    """Fractional change; negative bases use their absolute value so direction stays intuitive."""
    if current is None or previous is None or previous == 0:
        return None
    return (current - previous) / abs(previous)


def shift_months(day, months):
    """Calendar shift, clamping to month end (e.g. Mar 31 - 1 month = Feb 28)."""
    index = day.year * 12 + day.month - 1 + months
    year, month = divmod(index, 12)
    next_month = date(year + (month == 11), (month + 1) % 12 + 1, 1)
    return date(year, month + 1, min(day.day, (next_month - timedelta(days=1)).day))


def chart_points(payload):
    """Return ([(date, close)], meta) from a Yahoo chart payload; closes are split-adjusted."""
    result = ((payload or {}).get("chart") or {}).get("result") or []
    if not result:
        return [], {}
    result = result[0]
    closes = ((result.get("indicators") or {}).get("quote") or [{}])[0].get("close") or []
    points = {}
    for stamp, close in zip(result.get("timestamp") or [], closes):
        if close is not None and close > 0:
            points[datetime.fromtimestamp(stamp, timezone.utc).date()] = float(close)
    return sorted(points.items()), result.get("meta") or {}


def price_metrics(payload):
    points, meta = chart_points(payload)
    if len(points) < 2:
        return None
    last_date, last_close = points[-1]
    price = meta.get("regularMarketPrice") or last_close
    year_ago = close_on_or_before(points, shift_months(last_date, -12))
    quarter_ago = close_on_or_before(points, shift_months(last_date, -3))
    return {
        "price": round(float(price), 4),
        "price_date": last_date.isoformat(),
        "last_close": last_close,
        "close_1y": year_ago[1] if year_ago else None,
        "price_change_1y": growth(last_close, year_ago[1]) if year_ago else None,
        "price_change_3m": growth(last_close, quarter_ago[1]) if quarter_ago else None,
    }


def merge_history(daily_payload, weekly_payload):
    """Daily closes for the recent window, preceded by weekly closes for the full listed history."""
    daily, _ = chart_points(daily_payload)
    # Yahoo stamps weekly bars on Monday but reports the week's final close; date them on Friday.
    weekly = [(day + timedelta(days=4), close) for day, close in chart_points(weekly_payload)[0]]
    if daily:
        weekly = [point for point in weekly if point[0] < daily[0][0]]
    return weekly + daily


def encode_history(symbol, points):
    """Compact JSON payload: days since the Unix epoch and closes to six significant digits."""
    return {
        "symbol": symbol,
        "d": [(day - EPOCH).days for day, _ in points],
        "c": [float(f"{close:.6g}") for _, close in points],
    }


def _chart(symbol, params):
    body = http_get(f"{CHART_URL}{normalize_symbol(symbol)}?{urlencode(params)}",
                    {"User-Agent": BROWSER_UA, "Accept": "application/json"})
    return json.loads(body) if body else None


def fetch_prices(symbol):
    """Return {"metrics": ..., "history": [(date, close)]} for one ticker."""
    now = int(time.time())
    daily = _chart(symbol, {"period1": now - DAILY_HISTORY_DAYS * 86400, "period2": now, "interval": "1d"})
    metrics = price_metrics(daily)
    if not metrics:
        return None
    try:
        weekly = _chart(symbol, {"period1": HISTORY_START, "period2": now, "interval": "1wk"})
    except (HTTPError, URLError, TimeoutError, ValueError):
        weekly = None
    return {"metrics": metrics, "history": merge_history(daily, weekly)}


# ---------------------------------------------------------------------------
# SEC fundamentals
# ---------------------------------------------------------------------------

def _days(start, end):
    return (end - start).days


def latest_facts(facts):
    """Collapse facts to one value per (start, end), keeping the most recently filed (restated) value."""
    chosen = {}
    for fact in facts:
        if fact.get("start") is None or fact.get("val") is None or not fact.get("form", "").startswith("10-"):
            continue
        key = (date.fromisoformat(fact["start"]), date.fromisoformat(fact["end"]))
        if key not in chosen or fact.get("filed", "") >= chosen[key][1]:
            chosen[key] = (float(fact["val"]), fact.get("filed", ""))
    return {key: value for key, (value, _) in chosen.items()}


def _within(days, bounds):
    return bounds[0] <= days <= bounds[1]


def quarterly_values(values):
    """Map quarter end -> quarterly value, deriving fiscal Q4 as annual minus nine-month YTD."""
    quarters = {}
    for (start, end), value in values.items():
        if _within(_days(start, end), QUARTER_DAYS):
            quarters[end] = value
    for (start, end), annual in values.items():
        if not _within(_days(start, end), ANNUAL_DAYS) or end in quarters:
            continue
        for (ytd_start, ytd_end), ytd in values.items():
            if abs(_days(start, ytd_start)) <= 7 and _within(_days(ytd_start, ytd_end), YTD_9M_DAYS) \
                    and _within(_days(ytd_end, end), QUARTER_DAYS):
                quarters[end] = annual - ytd
                break
    return quarters


def _find_near(keys, target, tolerance=20):
    best = None
    for key in keys:
        gap = abs(_days(key, target))
        if gap <= tolerance and (best is None or gap < abs(_days(best, target))):
            best = key
    return best


def trailing_net_income(facts):
    """Return (current, year-earlier, period end, basis) using TTM sums when possible, else fiscal years."""
    values = latest_facts(facts)
    if not values:
        return None
    quarters = quarterly_values(values)
    ends = sorted(quarters)

    def ttm(index):
        if index < 3:
            return None
        window = ends[index - 3:index + 1]
        if all(_within(_days(a, b), QUARTER_DAYS) for a, b in zip(window, window[1:])):
            return sum(quarters[end] for end in window)
        return None

    annual = {end: value for (start, end), value in values.items() if _within(_days(start, end), ANNUAL_DAYS)}
    latest_annual_end = max(annual) if annual else None
    if ends and (latest_annual_end is None or ends[-1] >= latest_annual_end):
        last = len(ends) - 1
        prior_end = _find_near(ends, ends[last] - timedelta(days=365))
        if prior_end is not None:
            current, previous = ttm(last), ttm(ends.index(prior_end))
            if current is not None and previous is not None:
                return current, previous, ends[last], "ttm"
    if latest_annual_end is not None:
        prior_end = _find_near(annual, latest_annual_end - timedelta(days=365))
        previous = annual[prior_end] if prior_end is not None else None
        return annual[latest_annual_end], previous, latest_annual_end, "fiscal_year"
    return None


def share_count_ratio(facts):
    """Return (latest weighted shares / year-earlier weighted shares, period end) on a restated basis."""
    values = latest_facts(facts)
    best = None
    for bounds in (QUARTER_DAYS, ANNUAL_DAYS):
        series = {end: value for (start, end), value in values.items() if _within(_days(start, end), bounds) and value > 0}
        if not series:
            continue
        end = max(series)
        prior = _find_near(series, end - timedelta(days=365))
        if prior is None:
            continue
        ratio = series[end] / series[prior]
        if _within(ratio, SHARE_RATIO_BOUNDS) and (best is None or end > best[1]):
            best = (ratio, end)
    return best


def _units(concept_payload):
    units = (concept_payload or {}).get("units") or {}
    return units.get("USD") or units.get("shares") or []


def fetch_concept(cik, concept):
    _sec_limiter.wait()
    body = http_get(SEC_CONCEPT_URL.format(cik=cik, concept=concept), {"User-Agent": SEC_UA, "Accept": "application/json"})
    return _units(json.loads(body)) if body else []


def fetch_company_facts(cik):
    _sec_limiter.wait()
    body = http_get(SEC_FACTS_URL.format(cik=cik), {"User-Agent": SEC_UA, "Accept": "application/json"})
    facts = {}
    if body:
        facts = (json.loads(body).get("facts") or {}).get("us-gaap") or {}
    return lambda concept: _units(facts.get(concept))


def _is_recent(period_end, today):
    return period_end is not None and (today - period_end).days <= STALE_AFTER_DAYS


def _first_recent(loader, concepts, compute, end_index, today):
    for concept in concepts:
        value = compute(loader(concept))
        if value and _is_recent(value[end_index], today):
            return value
    return None


def fetch_fundamentals(cik, today=None):
    today = today or date.today()
    result = {"net_income": None, "share_ratio": None}
    if not cik:
        return result
    loader = lambda concept: fetch_concept(cik, concept)  # noqa: E731
    for attempt in range(2):
        if result["net_income"] is None:
            result["net_income"] = _first_recent(loader, NET_INCOME_CONCEPTS, trailing_net_income, 2, today)
        if result["share_ratio"] is None:
            result["share_ratio"] = _first_recent(loader, SHARE_CONCEPTS, share_count_ratio, 1, today)
        if attempt or (result["net_income"] and result["share_ratio"]):
            break
        # The per-concept API occasionally returns empty units; the full company-facts file is authoritative.
        loader = fetch_company_facts(cik)
    predecessor = PREDECESSOR_CIKS.get(cik)
    if predecessor and not (result["net_income"] and result["share_ratio"]):
        fallback = fetch_fundamentals(predecessor, today)
        result = {key: result[key] or fallback[key] for key in result}
    return result


# ---------------------------------------------------------------------------
# Assembly
# ---------------------------------------------------------------------------

def build_record(company, prices, cap_entry, fundamentals):
    record = dict(company)
    prices = prices or {}
    record.update({
        "price": prices.get("price"),
        "price_date": prices.get("price_date"),
        "price_change_1y": prices.get("price_change_1y"),
        "price_change_3m": prices.get("price_change_3m"),
        "market_cap": None,
        "market_cap_change_1y": None,
        "net_income": None,
        "net_income_prior": None,
        "net_income_change_1y": None,
        "net_income_period_end": None,
        "net_income_basis": None,
    })
    last_close = prices.get("last_close")
    if cap_entry and last_close:
        cap, screener_price = cap_entry
        # Re-base the screener's cap onto the latest close so all price-derived fields agree.
        record["market_cap"] = round(cap * last_close / screener_price)
    ratio = (fundamentals or {}).get("share_ratio")
    if ratio and last_close and prices.get("close_1y"):
        # Year-ago cap = cap * (year-ago price / price) / share-count ratio, with split-restated shares.
        record["market_cap_change_1y"] = (last_close / prices["close_1y"]) * ratio[0] - 1
    income = (fundamentals or {}).get("net_income")
    if income:
        current, previous, period_end, basis = income
        record.update({
            "net_income": current,
            "net_income_prior": previous,
            "net_income_change_1y": growth(current, previous),
            "net_income_period_end": period_end.isoformat(),
            "net_income_basis": basis,
        })
    for key in ("price_change_1y", "price_change_3m", "market_cap_change_1y", "net_income_change_1y"):
        if record[key] is not None:
            record[key] = round(record[key], 6)
    return record


def build_snapshot(log=print):
    constituents_text = (http_get(SP500_URL, {"User-Agent": BROWSER_UA}) or b"").decode("utf-8")
    companies = parse_constituents(constituents_text)
    if len(companies) < 490:
        raise RuntimeError(f"Only {len(companies)} S&P 500 constituents were found.")
    log(f"Loaded {len(companies)} constituents")

    try:
        caps = fetch_market_caps([company["symbol"] for company in companies])
    except (HTTPError, URLError, TimeoutError, ValueError) as error:
        log(f"Warning: Nasdaq market caps unavailable ({error})")
        caps = {}
    log(f"Market caps found for {len(caps)} securities")

    def safe(function, *args):
        try:
            return function(*args)
        except Exception as error:  # one bad ticker should not sink the snapshot
            log(f"Warning: {function.__name__}{args} failed: {error}")
            return None

    with ThreadPoolExecutor(max_workers=8) as pool:
        fetched = list(pool.map(lambda company: safe(fetch_prices, company["symbol"]), companies))
    prices = [item["metrics"] if item else None for item in fetched]
    histories = {
        normalize_symbol(company["symbol"]): item["history"]
        for company, item in zip(companies, fetched) if item and item["history"]
    }
    priced = sum(1 for item in prices if item)
    log(f"Prices found for {priced} securities")
    if priced < len(companies) * 0.8:
        raise RuntimeError(f"Prices were available for only {priced} securities.")

    fundamentals_by_cik = {}
    ciks = sorted({company["cik"] for company in companies if company["cik"]})
    with ThreadPoolExecutor(max_workers=6) as pool:
        for cik, result in zip(ciks, pool.map(lambda cik: safe(fetch_fundamentals, cik), ciks)):
            fundamentals_by_cik[cik] = result
    log(f"Net income found for {sum(1 for r in fundamentals_by_cik.values() if r and r['net_income'])} issuers")

    securities = [
        build_record(company, price, caps.get(normalize_symbol(company["symbol"])), fundamentals_by_cik.get(company["cik"]))
        for company, price in zip(companies, prices)
    ]
    price_dates = sorted(item["price_date"] for item in securities if item["price_date"])
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "price_as_of": price_dates[-1] if price_dates else None,
        "sources": {
            "constituents": SP500_URL,
            "market_cap": "Nasdaq stock screener",
            "prices": "Yahoo Finance daily closes",
            "fundamentals": "SEC EDGAR XBRL filings",
        },
        "securities": securities,
    }, histories


def write_histories(histories, directory=HISTORY_DIR):
    """Write one history file per ticker and drop files for tickers that left the index."""
    directory.mkdir(exist_ok=True)
    for stale in directory.glob("*.json"):
        if stale.stem not in histories:
            stale.unlink()
    for symbol, points in histories.items():
        (directory / f"{symbol}.json").write_text(json.dumps(encode_history(symbol, points), separators=(",", ":")),
                                                 encoding="utf-8")


def main():
    try:
        snapshot, histories = build_snapshot()
    except Exception as error:
        if OUTPUT.exists():
            print(f"Warning: snapshot build failed ({error}); keeping existing {OUTPUT.name}", file=sys.stderr)
            return 0
        raise
    OUTPUT.write_text(json.dumps(snapshot, separators=(",", ":")), encoding="utf-8")
    write_histories(histories)
    print(f"Wrote {len(snapshot['securities'])} securities to {OUTPUT} and {len(histories)} histories to {HISTORY_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
