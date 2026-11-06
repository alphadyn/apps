# S&P Insights

**Deployed application:** [Open the app](https://alphadyn.github.io/apps/sp-insights/)

> S&P 500 ranking and price-history dashboard. See the [repository catalog](../README.md) for shared setup and deployment context.

A static equity screener for every listed S&P 500 security, backed by generated market and price-history snapshots. Filter the constituent table by:

- Market capitalization, including shorthand amounts such as `1B`
- P/E ratio, with a profitable-only option
- Share price
- Net income: trailing twelve months, year-over-year growth, or prior fiscal year
- Price performance across **1W, 1M, 3M, YTD, 1Y, 2Y, 5Y, 10Y, and All**
- Company name or ticker, and GICS sector

Use minimum/maximum inputs or presets. Net-income and performance bounds can be applied across multiple periods at once. Active criteria appear as removable chips with the matching-security count. **Hide criteria** keeps the table in focus without clearing filters; **Clear all filters** resets the screen.

## Sorting and market summary

The table initially sorts by market cap, highest first. Click a column heading to sort by that metric, then click again to reverse direction. Rankings apply to the filtered result set. Columns include valuation, price, a DCF fair-value estimate, its dollar difference from price and implied upside/downside, current and prior net income, income growth, and all nine performance periods.

The selected security, history range, and table sorting are represented in the URL hash. Do not assume that copying the URL preserves all numeric filter inputs.

A summary strip above the controls shows the combined market cap, total TTM net income, median 1Y return (with the leader), and the share of securities trading higher than a year ago. It follows the sector filter. Totals count each issuer once, so multi-class companies are not double-counted.

## Security history

Click any row to open that security's price history. Choose **1W, 1M, 3M, YTD, 1Y, 2Y, 5Y, 10Y, or All**. Each range button shows its return, and the view includes:

- an interactive chart (hover, or focus it and use ←/→, Shift+←/→, Home, and End) with an optional log scale;
- the start, end, change, annualized rate, high, and low for the selected period;
- the security's ranking metrics.

Each range measures from the last close on or before its start date (Dec 31 of the prior year for YTD), so the 1Y and 3M returns match the table. Ranges longer than a security's listed history are measured from its first close and marked with `*`. The open security and range are kept in the URL hash (for example `#symbol=AAPL&range=5y`). The browser Back button, Esc, and **Back to rankings** all return to the table.

## Link preview

Shared links unfurl in iMessage, SMS/RCS, WhatsApp, Slack, and similar apps.

- **Constituent-specific previews**: When a specific security is displayed in the app, the live document metadata (`<title>`, `<meta name="description">`, `og:title`, `og:description`, `og:url`, `twitter:title`, `twitter:description`, `canonical`) dynamically highlights that security's details: current price, 1Y price return, market capitalization, P/E ratio, and net income.
- **Dedicated crawler pages**: For message crawlers that do not execute client-side JavaScript, static preview pages are generated under `s/<symbol>/` (e.g. `s/NVDA/`, `s/AAPL/`) with that company's exact metrics. When a user taps or clicks the link, the page seamlessly opens the constituent's interactive detail view in the screener.
- **Messages / SMS preview mockup**: Open [share-preview.html](share-preview.html) to interactively preview what text message and SMS unfurls look like both for the general screener and for any specific constituent.
- **Social preview artwork**: Previews feature `social-preview.png` (1200×630). To regenerate the social preview artwork (requires Pillow):

```bash
python3 generate_social_preview.py
```

To build or update the crawler share pages for all constituents:

```bash
python3 build_share_pages.py
```

## Files

| File | Purpose |
| --- | --- |
| [index.html](index.html), [styles.css](styles.css), [app.js](app.js) | Page, styles, and DOM wiring |
| [ranking.js](ranking.js) | Pure ranking, URL-state, and formatting logic |
| [history.js](history.js), [detail.js](detail.js) | Range math and chart helpers; the security detail view |
| [share-preview.html](share-preview.html) | Mobile Messages / SMS link preview mockup |
| [build_share_pages.py](build_share_pages.py), [test_build_share_pages.py](test_build_share_pages.py) | Builds static crawler-readable preview pages for the current constituent list |
| [generate_social_preview.py](generate_social_preview.py) | Renders `social-preview.png` and `apple-touch-icon.png` |
| [build_data.py](build_data.py) | Builds `data.json` and `history/*.json` from public sources |
| [ranking.test.js](ranking.test.js), [history.test.js](history.test.js), [test_build_data.py](test_build_data.py) | Unit tests |

## Data and methodology

`build_data.py` combines:

- **Constituents** (ticker, name, GICS sector, CIK) from [datasets/s-and-p-500-companies](https://github.com/datasets/s-and-p-500-companies). Multi-class issuers appear once per listed security.
- **Market cap** from the Nasdaq stock screener, rescaled to the latest close.
- **Prices** from Yahoo Finance daily closes. 1Y and 3M growth compare the latest close with the split-adjusted close on or before the same date one year and three months earlier. Dividends are excluded.
- **Net income** from SEC EDGAR XBRL (`NetIncomeLoss`, with fallbacks). TTM sums the last four quarters, and fiscal Q4 is derived as annual minus nine-month YTD. If quarterly data is incomplete, the latest fiscal year is used. Growth against a negative base is measured relative to its absolute value.
- **DCF fair value** uses TTM net income as an equity-cash-flow proxy, projects it for five years using the latest YoY net-income growth capped at ±5% (0% when missing), discounts at 10%, and adds a 2.5% perpetual-growth terminal value. The per-share estimate divides by shares implied by market cap ÷ price. It does not use recent price performance or valuation multiples. This is a simplified estimate, not a full free-cash-flow forecast; it is unavailable for non-positive or missing net income and missing price or market cap.
- **DCF − price** is fair value per share minus current price. Positive values mean estimated fair value is above the market price; negative values mean it is below.
- **Implied upside/downside** is (DCF fair value − current price) ÷ current price, expressed as a percentage.
- **YoY market cap growth** = 1Y price growth × the change in split-restated weighted-average diluted shares from SEC filings. This captures buybacks and issuance. Implausible share changes (outside 0.5×–2×) are discarded.

Missing values display as — and always rank last.

**Price history** is written to `history/{SYMBOL}.json` (with `.` replaced by `-`), one file per security, about 14 MB in total. Each file holds daily closes for the last two years and weekly closes (dated the week's last trading day) back to the first listing. The format is `{"symbol", "d": [days since 1970-01-01], "c": [closes]}`. These files are generated at deploy time and are gitignored.

The GitHub Pages workflow runs the tests and rebuilds the snapshot on every deployment. In the repository's **Settings → Pages → Build and deployment**, **Source must be GitHub Actions**, not **Deploy from a branch**. Branch publishing does not generate the gitignored history files and can cancel the custom build, leaving every security's chart unavailable. The custom workflow publishes on pushes to `main`, hourly, or when run manually.

If an upstream source fails, the committed `data.json` stays in place. In that case no history files are produced, and the detail view reports that history is unavailable.

## Run locally

From this app's folder, install the build dependencies before refreshing the snapshot:

```bash
python3 -m pip install -r requirements-build.txt
python3 build_data.py          # refresh data.json and history/ (~3–4 minutes; needed for charts)
python3 -m http.server 8000    # then open http://localhost:8000
```

## Test

```bash
python3 -m unittest discover -s . -p test_build_data.py
python3 -m unittest discover -s . -p test_build_share_pages.py
node --test ranking.test.js history.test.js
```

## Limitations

This is a research and demonstration tool, not investment advice or a real-time market feed. Check the displayed snapshot timestamp and upstream methodology before interpreting results. Missing data and shorter listing histories affect comparisons; returns exclude dividends.
