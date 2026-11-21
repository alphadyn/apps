"""Build a holdings snapshot from the fund issuer's published CSV."""

import csv
import io
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "market-insights"))
from build_data import BROWSER_UA, http_get

OUTPUT = Path(__file__).with_name("holdings.json")
URL = "https://www.ishares.com/us/products/239724/x/latest-holdings.csv"


def parse_holdings(text):
    rows = list(csv.reader(io.StringIO(text.lstrip("\ufeff"))))
    if not rows or rows[0] != ["iShares Core S&P Total U.S. Stock Market ETF"]:
        raise ValueError("Unexpected fund identity in ITOT holdings")
    date_row = next((row for row in rows if row and row[0] == "Fund Holdings as of"), None)
    if not date_row or len(date_row) != 2:
        raise ValueError("Missing ITOT holdings date")
    as_of = datetime.strptime(date_row[1], "%b %d, %Y").date().isoformat()
    header = ["Ticker", "Name", "Sector", "Asset Class", "Market Value", "Weight (%)"]
    start = next((i for i, row in enumerate(rows) if row[:6] == header), None)
    if start is None:
        raise ValueError("Missing ITOT holdings columns")
    holdings = []
    for row in rows[start + 1:]:
        if not row:
            break
        if len(row) < 6:
            raise ValueError("Incomplete ITOT holdings row")
        if row[3] != "Equity":
            continue
        try:
            weight = float(row[5].replace(",", "")) / 100
        except ValueError as error:
            raise ValueError("Invalid ITOT holding weight") from error
        if not math.isfinite(weight) or weight < 0:
            raise ValueError("Invalid ITOT holding weight")
        if weight > 0 and row[0] and row[0] != "-":
            holdings.append({"symbol": row[0], "weight": weight})
    if not holdings or sum(item["weight"] for item in holdings) > 1.01:
        raise ValueError("Invalid ITOT equity holdings")
    return {"as_of": as_of, "source": URL, "holdings": holdings}


def main():
    body = http_get(URL, {"User-Agent": BROWSER_UA, "Accept": "text/csv"})
    if body is None:
        raise RuntimeError("ITOT holdings download not found")
    data = {"fetched_at": datetime.now(timezone.utc).isoformat(),
            "funds": {"ITOT": parse_holdings(body.decode("utf-8-sig"))}}
    OUTPUT.write_text(json.dumps(data, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {len(data['funds']['ITOT']['holdings'])} ITOT holdings to {OUTPUT}")


if __name__ == "__main__":
    main()
