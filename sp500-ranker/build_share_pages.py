"""Build crawler-readable link preview pages for every S&P 500 security.

When shared via SMS/iMessage, WhatsApp, Slack, or Twitter, crawlers inspect
these static HTML pages to highlight that specific security's price, 1Y return,
market cap, P/E ratio, and net income. Browsers immediately redirect to the
active security view in the main application.
"""

from __future__ import annotations

import html
import json
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parent
APP_URL = "https://alphadyn.github.io/apps/sp500-ranker/"
SHARE_URL = APP_URL + "s/"
IMAGE_URL = APP_URL + "social-preview.png?v=3"
DEFAULT_DATA = ROOT / "data.json"
OUTPUT_DIR = ROOT / "s"


def format_money(value: float | None) -> str:
    if value is None:
        return "—"
    sign = "−" if value < 0 else ""
    val = abs(value)
    if val >= 1e12:
        scaled = val / 1e12
        fmt = ".0f" if scaled >= 100 else ".1f" if scaled >= 10 else ".2f"
        return f"{sign}${scaled:{fmt}}T"
    if val >= 1e9:
        scaled = val / 1e9
        fmt = ".0f" if scaled >= 100 else ".1f" if scaled >= 10 else ".2f"
        return f"{sign}${scaled:{fmt}}B"
    if val >= 1e6:
        scaled = val / 1e6
        fmt = ".0f" if scaled >= 100 else ".1f" if scaled >= 10 else ".2f"
        return f"{sign}${scaled:{fmt}}M"
    if val >= 1e3:
        scaled = val / 1e3
        fmt = ".0f" if scaled >= 100 else ".1f" if scaled >= 10 else ".2f"
        return f"{sign}${scaled:{fmt}}K"
    return f"{sign}${val:.0f}"


def format_percent(value: float | None) -> str:
    if value is None:
        return "—"
    percent = value * 100
    digits = 0 if abs(percent) >= 1000 else 1
    text = f"{abs(percent):.{digits}f}%"
    if round(percent, digits) == 0:
        return f"{0:.{digits}f}%"
    sign = "+" if percent > 0 else "−"
    return f"{sign}{text}"


def format_price(value: float | None) -> str:
    if value is None:
        return "—"
    return f"${value:,.2f}"


def format_pe(value: float | None) -> str:
    if value is None or value <= 0:
        return "—"
    return f"{value:.1f}"


def describe_security(security: dict) -> str:
    symbol = security.get("symbol", "")
    name = security.get("name", symbol)
    price = format_price(security.get("price"))
    ret_1y = format_percent(security.get("price_change_1y"))
    pe = format_pe(security.get("pe"))
    mcap = format_money(security.get("market_cap"))
    net_income = format_money(security.get("net_income"))

    pe_clause = f", P/E: {pe}" if pe != "—" else ""
    ni_clause = f", Net Income: {net_income}" if net_income != "—" else ""

    perf = security.get("performance", {})
    perf_parts = []
    for k, label in [("1w", "1W"), ("1m", "1M"), ("3m", "3M"), ("ytd", "YTD"), ("1y", "1Y"), ("5y", "5Y")]:
        val = perf.get(k) if isinstance(perf, dict) else None
        if val is None:
            val = security.get(f"price_change_{k}")
        formatted = format_percent(val)
        if formatted != "—":
            perf_parts.append(f"{label} {formatted}")
    perf_clause = f" Performance: {', '.join(perf_parts)}." if perf_parts else ""

    return (
        f"{name} ({symbol}): {price} ({ret_1y} 1Y).{perf_clause} "
        f"Market Cap: {mcap}{pe_clause}{ni_clause}. "
        "Explore interactive price graph and performance across 9 periods."
    )


def render_chart_svg(symbol: str, width: int = 480, height: int = 180) -> str:
    history_file = ROOT / "history" / f"{symbol}.json"
    if not history_file.exists():
        return ""
    try:
        data = json.loads(history_file.read_text(encoding="utf-8"))
        days = data.get("d", [])
        closes = data.get("c", [])
        points = [(d, c) for d, c in zip(days, closes) if isinstance(d, int) and isinstance(c, (int, float))]
    except Exception:
        return ""

    if len(points) < 2:
        return ""

    # Slice the last 365 days (1 year) or last ~250 points
    last_day = points[-1][0]
    one_year_start = last_day - 365
    slice_points = [p for p in points if p[0] >= one_year_start]
    if len(slice_points) < 10:
        slice_points = points[-min(len(points), 250):]

    closes = [p[1] for p in slice_points]
    min_c = min(closes)
    max_c = max(closes)
    span_c = max_c - min_c if max_c > min_c else 1.0
    pad_top = 16
    pad_bottom = 20
    pad_left = 12
    pad_right = 64
    inner_w = width - pad_left - pad_right
    inner_h = height - pad_top - pad_bottom

    n = len(slice_points)
    coords = []
    for i, (_, c) in enumerate(slice_points):
        x = pad_left + (i / (n - 1)) * inner_w
        y = pad_top + (1.0 - (c - min_c) / span_c) * inner_h
        coords.append((x, y))

    line_d = " ".join(f"{'M' if i == 0 else 'L'}{x:.1f},{y:.1f}" for i, (x, y) in enumerate(coords))
    last_x, _ = coords[-1]
    first_x, _ = coords[0]
    bottom_y = pad_top + inner_h
    area_d = f"{line_d} L{last_x:.1f},{bottom_y:.1f} L{first_x:.1f},{bottom_y:.1f} Z"

    start_close = slice_points[0][1]
    last_close = slice_points[-1][1]
    is_up = last_close >= start_close
    stroke_color = "#10b981" if is_up else "#f43f5e"

    base_y = pad_top + (1.0 - (start_close - min_c) / span_c) * inner_h

    escaped_symbol = html.escape(symbol)

    return f"""<div class="chart-box">
  <div class="chart-header">
    <span class="chart-label">1-Year Price Trend</span>
    <span class="chart-change {'up' if is_up else 'down'}">{format_percent(last_close / start_close - 1)}</span>
  </div>
  <svg viewBox="0 0 {width} {height}" width="100%" height="{height}" class="preview-chart-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="1-year price chart for {escaped_symbol}">
    <defs>
      <linearGradient id="chart-fill-{escaped_symbol}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="{stroke_color}" stop-opacity="0.32"/>
        <stop offset="100%" stop-color="{stroke_color}" stop-opacity="0.0"/>
      </linearGradient>
    </defs>
    <line x1="{pad_left}" y1="{base_y:.1f}" x2="{pad_left + inner_w}" y2="{base_y:.1f}" stroke="rgba(255,255,255,0.15)" stroke-dasharray="4 4" stroke-width="1"/>
    <path d="{area_d}" fill="url(#chart-fill-{escaped_symbol})"/>
    <path d="{line_d}" fill="none" stroke="{stroke_color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="{width - 6}" y="{coords[-1][1]:.1f}" fill="{stroke_color}" font-size="11" font-weight="700" text-anchor="end" dy="0.35em">${last_close:,.2f}</text>
    <text x="{width - 6}" y="{base_y:.1f}" fill="#94a3b8" font-size="10" font-weight="600" text-anchor="end" dy="0.35em">${start_close:,.2f}</text>
  </svg>
</div>"""


def render_page(security: dict) -> str:
    symbol = security.get("symbol", "")
    name = security.get("name", symbol)
    title = f"{symbol} · {name} — S&P 500 Screener & Ranker"
    description = describe_security(security)
    share_url = f"{SHARE_URL}{symbol}/"
    app_url = f"{APP_URL}#symbol={symbol}"
    destination = json.dumps(app_url)

    escaped_title = html.escape(title, quote=True)
    escaped_desc = html.escape(description, quote=True)
    escaped_share_url = html.escape(share_url, quote=True)
    escaped_app_url = html.escape(app_url, quote=True)
    escaped_symbol = html.escape(symbol)
    escaped_name = html.escape(name)
    escaped_price = html.escape(format_price(security.get("price")))
    escaped_ret_1y = html.escape(format_percent(security.get("price_change_1y")))
    escaped_mcap = html.escape(format_money(security.get("market_cap")))
    escaped_pe = html.escape(format_pe(security.get("pe")))
    escaped_net_income = html.escape(format_money(security.get("net_income")))

    chart_html = render_chart_svg(symbol)

    perf = security.get("performance", {})
    perf_chips = []
    for k, label in [
        ("1w", "1W"), ("1m", "1M"), ("3m", "3M"), ("ytd", "YTD"),
        ("1y", "1Y"), ("2y", "2Y"), ("5y", "5Y"), ("10y", "10Y"), ("all", "All"),
    ]:
        val = perf.get(k) if isinstance(perf, dict) else None
        if val is None:
            val = security.get(f"price_change_{k}")
        fmt = format_percent(val)
        is_up = val is not None and val > 0
        is_down = val is not None and val < 0
        tone = "up" if is_up else "down" if is_down else ""
        perf_chips.append(
            f'<div class="perf-chip {tone}"><span class="perf-label">{label}</span><strong class="perf-value">{fmt}</strong></div>'
        )
    perf_grid_html = "".join(perf_chips)

    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#0d141e">
  <title>{escaped_title}</title>
  <meta name="description" content="{escaped_desc}">
  <link rel="canonical" href="{escaped_share_url}">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Alphadyn Apps">
  <meta property="og:url" content="{escaped_share_url}">
  <meta property="og:title" content="{escaped_title}">
  <meta property="og:description" content="{escaped_desc}">
  <meta property="og:image" content="{IMAGE_URL}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="{escaped_title}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{escaped_title}">
  <meta name="twitter:description" content="{escaped_desc}">
  <meta name="twitter:image" content="{IMAGE_URL}">

  <style>
    body {{
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px 16px;
      box-sizing: border-box;
      background: #0d141e;
      color: #f1f5f9;
      font: 16px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }}
    main {{
      width: min(100%, 560px);
      padding: 28px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 18px;
      background: #151e2b;
      box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
    }}
    .badge {{
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(56, 189, 248, 0.15);
      color: #38bdf8;
      font-size: 0.85rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }}
    h1 {{
      margin: 12px 0 4px;
      font-size: 1.6rem;
      font-weight: 800;
      color: #fff;
    }}
    .quote-row {{
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      gap: 12px;
      margin: 8px 0 16px;
    }}
    .price {{
      font-size: 1.8rem;
      font-weight: 800;
      color: #fff;
    }}
    .change {{
      font-size: 1.1rem;
      font-weight: 700;
    }}
    .change.up, .perf-chip.up .perf-value, .chart-change.up {{ color: #10b981; }}
    .change.down, .perf-chip.down .perf-value, .chart-change.down {{ color: #f43f5e; }}

    .chart-box {{
      margin: 16px 0;
      padding: 12px 14px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.25);
    }}
    .chart-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 0.82rem;
      font-weight: 600;
      color: #94a3b8;
    }}
    .chart-change {{ font-weight: 700; }}

    .perf-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(52px, 1fr));
      gap: 6px;
      margin: 16px 0;
    }}
    .perf-chip {{
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 6px 4px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      background: rgba(255, 255, 255, 0.03);
      text-align: center;
    }}
    .perf-label {{
      font-size: 0.7rem;
      font-weight: 700;
      color: #94a3b8;
    }}
    .perf-value {{
      font-size: 0.82rem;
      font-weight: 700;
      margin-top: 2px;
    }}

    .stats-row {{
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin: 14px 0 20px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      font-size: 0.88rem;
      color: #94a3b8;
    }}
    .stats-row strong {{ color: #f1f5f9; }}

    p.summary {{
      margin: 0 0 22px;
      color: #94a3b8;
      font-size: 0.92rem;
      line-height: 1.5;
    }}
    a.btn {{
      display: inline-block;
      padding: 10px 20px;
      border-radius: 8px;
      background: #38bdf8;
      color: #0b1119;
      font-weight: 700;
      text-decoration: none;
      transition: background 0.15s;
    }}
    a.btn:hover {{
      background: #7dd3fc;
    }}
  </style>
</head>
<body>
  <main>
    <span class="badge">{escaped_symbol}</span>
    <h1>{escaped_name}</h1>
    <div class="quote-row">
      <span class="price">{escaped_price}</span>
      <span class="change {'up' if (security.get('price_change_1y') or 0) >= 0 else 'down'}">{escaped_ret_1y} 1Y</span>
    </div>

    {chart_html}

    <div class="perf-grid">
      {perf_grid_html}
    </div>

    <div class="stats-row">
      <span>Market Cap: <strong>{escaped_mcap}</strong></span>
      <span>P/E: <strong>{escaped_pe}</strong></span>
      <span>Net Income: <strong>{escaped_net_income}</strong></span>
    </div>

    <p class="summary">{escaped_desc}</p>
    <a class="btn" href="{escaped_app_url}">Open {escaped_symbol} in S&amp;P 500 Screener &amp; Ranker</a>
  </main>
  <script>location.replace({destination});</script>
</body>
</html>
"""


def build_pages(output_dir: Path, securities: list[dict]) -> int:
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    count = 0
    for security in securities:
        symbol = security.get("symbol")
        if not symbol:
            continue
        page_dir = output_dir / symbol
        page_dir.mkdir(parents=True, exist_ok=True)
        (page_dir / "index.html").write_text(render_page(security), encoding="utf-8")
        count += 1

    return count


def main() -> int:
    data_path = DEFAULT_DATA
    if not data_path.exists():
        print(f"Error: {data_path} not found", file=sys.stderr)
        return 1

    snapshot = json.loads(data_path.read_text(encoding="utf-8"))
    securities = snapshot.get("securities", [])
    count = build_pages(OUTPUT_DIR, securities)
    print(f"Wrote {count} security link preview pages to {OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
