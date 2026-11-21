"""Build a dated snapshot of Yahoo Finance's reported fund net assets."""

import json
import math
import re
import sys
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "market-insights"))
from build_data import BROWSER_UA, FUNDS, http_get

OUTPUT = Path(__file__).with_name("assets.json")
ASSETS_PATTERN = re.compile(r'\\?"totalAssets\\?":\{\\?"raw\\?":([0-9.eE+-]+)')


def parse_assets(html):
    values = [float(value) for value in ASSETS_PATTERN.findall(html)]
    if not values or any(not math.isfinite(value) or value <= 0 for value in values):
        raise ValueError("No valid totalAssets value in Yahoo Finance response")
    if any(value != values[0] for value in values):
        raise ValueError("Conflicting totalAssets values in Yahoo Finance response")
    return values[0]


def fetch_assets(fund):
    symbol = fund["symbol"]
    body = http_get(f"https://finance.yahoo.com/quote/{symbol}/", {
        "User-Agent": BROWSER_UA, "Accept": "text/html",
    })
    if body is None:
        raise ValueError(f"{symbol}: Yahoo Finance page not found")
    return symbol, parse_assets(body.decode("utf-8"))


def build():
    assets = {}
    errors = []
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = [(fund["symbol"], pool.submit(fetch_assets, fund)) for fund in FUNDS]
        for symbol, future in futures:
            try:
                ticker, value = future.result()
                assets[ticker] = value
            except (OSError, ValueError, UnicodeError) as error:
                errors.append(f"{symbol}: {error}")
    if errors:
        print("Fund net assets unavailable for: " + "; ".join(errors), file=sys.stderr)
    if not assets:
        raise RuntimeError("Yahoo Finance returned no usable fund net assets")
    return {"fetched_at": datetime.now(timezone.utc).isoformat(), "assets": assets}


def main():
    snapshot = build()
    OUTPUT.write_text(json.dumps(snapshot, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(snapshot['assets'])} fund net-asset values to {OUTPUT}")


if __name__ == "__main__":
    main()
