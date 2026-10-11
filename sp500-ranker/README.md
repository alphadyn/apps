# S&P 500 Ranker

A static web app that lists every security in the S&P 500 and ranks them by any combination of:

- Market capitalization
- Year-over-year market cap growth
- Net income (trailing twelve months)
- Year-over-year net income growth
- Price
- Yearly (1Y) price growth
- Quarterly (3M) price growth

Add criteria in any order (or none — the default is alphabetical by ticker), flip each between *High → Low* and *Low → High*, reorder them, and choose how they combine:

- **Priority order** — sort by criterion #1, break ties with #2, and so on.
- **Average rank** — rank the securities on each criterion separately, then order by the mean rank so every criterion counts equally.

Selected columns move to the left of the table in priority order, followed by the remaining columns in their default order. Click a column heading to add it as the next criterion, or click it again to flip its direction. Search and sector filters narrow the table without changing overall ranks. The current ranking is stored in the URL hash (for example `#sort=market_cap:desc,price_change_3m:asc&method=average`) so it can be bookmarked or shared.

A summary strip above the controls shows the combined market cap, total TTM net income, median 1Y return (with the leader), and the share of securities trading higher than a year ago. It follows the sector filter. Totals count each issuer once, so multi-class companies are not double-counted.

## Security history

Click any row to open that security's price history. Choose **1W, 1M, 3M, YTD, 1Y, 2Y, 5Y, 10Y, or All**. Each range button shows its return, and the view includes:

- an interactive chart (hover, or focus it and use ←/→, Shift+←/→, Home, and End) with an optional log scale;
- the start, end, change, annualized rate, high, and low for the selected period;
- the security's ranking metrics.

Each range measures from the last close on or before its start date (Dec 31 of the prior year for YTD), so the 1Y and 3M returns match the table. Ranges longer than a security's listed history are measured from its first close and marked with `*`. The open security and range are kept in the URL hash (for example `#symbol=AAPL&range=5y`). The browser Back button, Esc, and **Back to rankings** all return to the table.

## Link preview

Shared links unfurl in iMessage, SMS/RCS, WhatsApp, Slack, and similar apps. The preview uses the Open Graph and Twitter Card tags in `index.html`, which point to the absolute URL of `social-preview.png` (1200×630). `apple-touch-icon.png` is the home-screen and bookmark icon. The artwork contains no market data, so it never goes stale. To regenerate it (requires Pillow):

```bash
python3 generate_social_preview.py
```

Hash deep links such as `#symbol=AAPL` share the same generic preview, because the URL fragment is never sent to the server.

## Files

| File | Purpose |
| --- | --- |
| [index.html](index.html), [styles.css](styles.css), [app.js](app.js) | Page, styles, and DOM wiring |
| [ranking.js](ranking.js) | Pure ranking, URL-state, and formatting logic |
| [history.js](history.js), [detail.js](detail.js) | Range math and chart helpers; the security detail view |
| [generate_social_preview.py](generate_social_preview.py) | Renders `social-preview.png` and `apple-touch-icon.png` |
| [build_data.py](build_data.py) | Builds `data.json` and `history/*.json` from public sources |
| [ranking.test.js](ranking.test.js), [history.test.js](history.test.js), [test_build_data.py](test_build_data.py) | Unit tests |

## Data and methodology

`build_data.py` combines:

- **Constituents** (ticker, name, GICS sector, CIK) from [datasets/s-and-p-500-companies](https://github.com/datasets/s-and-p-500-companies). Multi-class issuers appear once per listed security.
- **Market cap** from the Nasdaq stock screener, rescaled to the latest close.
- **Prices** from Yahoo Finance daily closes. 1Y and 3M growth compare the latest close with the split-adjusted close on or before the same date one year and three months earlier. Dividends are excluded.
- **Net income** from SEC EDGAR XBRL (`NetIncomeLoss`, with fallbacks). TTM sums the last four quarters, and fiscal Q4 is derived as annual minus nine-month YTD. If quarterly data is incomplete, the latest fiscal year is used. Growth against a negative base is measured relative to its absolute value.
- **YoY market cap growth** = 1Y price growth × the change in split-restated weighted-average diluted shares from SEC filings. This captures buybacks and issuance. Implausible share changes (outside 0.5×–2×) are discarded.

Missing values display as — and always rank last.

**Price history** is written to `history/{SYMBOL}.json` (with `.` replaced by `-`), one file per security, about 14 MB in total. Each file holds daily closes for the last two years and weekly closes (dated the week's last trading day) back to the first listing. The format is `{"symbol", "d": [days since 1970-01-01], "c": [closes]}`. These files are generated at deploy time and are gitignored.

The GitHub Pages workflow runs the tests and rebuilds the snapshot on every deployment. In the repository's **Settings → Pages → Build and deployment**, **Source must be GitHub Actions**, not **Deploy from a branch**. Branch publishing does not generate the gitignored history files and can cancel the custom build, leaving every security's chart unavailable. The custom workflow publishes on pushes to `main`, hourly, or when run manually.

If an upstream source fails, the committed `data.json` stays in place. In that case no history files are produced, and the detail view reports that history is unavailable.

## Run locally

```bash
python3 build_data.py          # refresh data.json and history/ (~3–4 minutes; needed for charts)
python3 -m http.server 8000    # then open http://localhost:8000
```

## Test

```bash
python3 -m unittest discover -s . -p test_build_data.py
node --test ranking.test.js history.test.js
```
