# Market Insights

<img src="apple-touch-icon.png" alt="Market Insights logo: a chart-inspired M with a teal endpoint" width="72" height="72">

**Deployed application:** [Open the app](https://alphadyn.github.io/apps/market-insights/)

The app and its security share pages have moved to `/apps/market-insights/`. Existing `/apps/sp-insights/` links are not redirected; use the new links when sharing.

> Stock and fund ranking and price-history dashboard. See the [repository catalog](../README.md) for shared setup and deployment context.

Select the header brand to reload the app's entry page and return to the rankings, clearing any selected security from the URL.

A screener for S&P 500 stocks and a curated selection of index mutual funds and ETFs, with automatically refreshed Yahoo quotes and generated fundamentals and price-history snapshots. Filter the table by:

- Market capitalization, including shorthand amounts such as `1B`
- P/E ratio, with a profitable-only option
- Share price
- Net income: trailing twelve months, year-over-year growth, or prior fiscal year
- Price performance across **1W, 1M, 3M, 6M, YTD, 1Y, 2Y, 5Y, 10Y, and All**
- Security type (**Stocks** or **Funds**)
- Company name or ticker, and GICS sector

Criteria are hidden on page load; select **Show criteria** to expand them. Use minimum/maximum inputs or presets. Net-income and performance bounds can be applied across multiple periods at once. Active criteria appear as removable chips with the matching-security count. **Hide criteria** keeps the table in focus without clearing filters; **Clear all filters** resets the screen.

## Sorting and market summary

The table initially sorts by market cap, highest first. Click a column heading to sort by that metric, then click again to reverse direction. Rankings apply to the filtered result set. Columns include valuation, price, a DCF fair-value estimate, its dollar difference from price and implied upside/downside, current and prior net income, income growth, and all ten performance periods. Stock-only valuation and earnings fields display as unavailable for funds.

The selected security, history range, and table sorting are represented in the URL hash. Do not assume that copying the URL preserves all numeric filter inputs.

A summary strip above the controls shows the combined market cap, total TTM net income, median 1Y return (with the leader), and the share of securities trading higher than a year ago. It follows the sector filter. Totals count each issuer once, so multi-class companies are not double-counted.

## Security history

Click any row to open that security's price history. Choose **1W, 1M, 3M, 6M, YTD, 1Y, 2Y, 5Y, 10Y, or All**. Each range button shows its return, and the view includes:

- an interactive chart (hover, or focus it and use ←/→, Shift+←/→, Home, and End) with an optional log scale;
- the start, end, change, annualized rate, high, and low for the selected period;
- the security's ranking metrics.

Each range measures from the last close on or before its start date (Dec 31 of the prior year for YTD), so the 1Y, 6M, and 3M returns match the table. Fund returns use adjusted closes that include reinvested distributions; stock returns exclude dividends. Ranges longer than a security's listed history are measured from its first close and marked with `*`. The open security and range are kept in the URL hash (for example `#symbol=AAPL&range=5y`). The browser Back button, Esc, and **Back to rankings** all return to the table.

## Link preview

Shared links unfurl in iMessage, SMS/RCS, WhatsApp, Slack, and similar apps.

- **Constituent-specific previews**: When a specific security is displayed in the app, the live document metadata (`<title>`, `<meta name="description">`, `og:title`, `og:description`, `og:url`, `twitter:title`, `twitter:description`, `canonical`) dynamically highlights that security's details: current price, 1Y price return, market capitalization, P/E ratio, and net income.
- **Dedicated crawler pages**: For message crawlers that do not execute client-side JavaScript, static preview pages are generated under `s/<symbol>/` (e.g. `s/NVDA/`, `s/AAPL/`) with that company's exact metrics. When a user taps or clicks the link, the page seamlessly opens the constituent's interactive detail view in the screener.
- **Messages / SMS preview mockup**: Open [share-preview.html](share-preview.html) to interactively preview what text message and SMS unfurls look like both for the general screener and for any specific constituent.
- **Social preview artwork**: The overview link uses `social-preview.png` (1200×630), which features the Market Insights logo. The same mark appears in `favicon.svg` and `apple-touch-icon.png`. To regenerate the social preview and home-screen icon after updating the mark (requires Pillow):

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
| [quotes.js](quotes.js), [../api/market-quotes.js](../api/market-quotes.js) | Automatic quote polling, valuation updates, and the Vercel Yahoo Finance proxy |
| [share-preview.html](share-preview.html) | Mobile Messages / SMS link preview mockup |
| [build_share_pages.py](build_share_pages.py), [test_build_share_pages.py](test_build_share_pages.py) | Builds static crawler-readable preview pages for the current constituent list |
| [generate_social_preview.py](generate_social_preview.py) | Renders `social-preview.png` and `apple-touch-icon.png` |
| [build_data.py](build_data.py) | Builds `data.json` and `history/*.json` from public sources |
| [ranking.test.js](ranking.test.js), [history.test.js](history.test.js), [test_build_data.py](test_build_data.py) | Unit tests |

## Data and methodology

`build_data.py` combines:

- **Stocks** (ticker, name, GICS sector, CIK) from [datasets/s-and-p-500-companies](https://github.com/datasets/s-and-p-500-companies). Multi-class issuers appear once per listed security. A curated list of S&P 500, total U.S. market, international stock, and U.S. bond index funds is also fetched from Yahoo Finance.
- **Market cap** from the Nasdaq stock screener, rescaled to the latest close.
- **Prices** from Yahoo Finance. Stock returns use daily closes and exclude dividends; fund returns use adjusted closes to account for reinvested distributions. Both use the last close on or before each range's start date.
- **Net income** from SEC EDGAR XBRL (`NetIncomeLoss`, with fallbacks). TTM sums the last four quarters, and fiscal Q4 is derived as annual minus nine-month YTD. If quarterly data is incomplete, the latest fiscal year is used. Growth against a negative base is measured relative to its absolute value.
- **DCF fair value** uses TTM net income as an equity-cash-flow proxy, projects it for five years using the latest YoY net-income growth capped at ±5% (0% when missing), discounts at 10%, and adds a 2.5% perpetual-growth terminal value. The per-share estimate divides by shares implied by market cap ÷ price. It does not use recent price performance or valuation multiples. This is a simplified estimate, not a full free-cash-flow forecast; it is unavailable for non-positive or missing net income and missing price or market cap.
- **Implied upside/downside** is (DCF fair value − current price) ÷ current price, expressed as a percentage.
- **YoY market cap growth** = 1Y price growth × the change in split-restated weighted-average diluted shares from SEC filings. This captures buybacks and issuance. Implausible share changes (outside 0.5×–2×) are discarded.

Missing values display as — and always rank last.

**Price history** is written to `history/{SYMBOL}.json` (with `.` replaced by `-`), one file per security, about 14 MB in total. Each file holds daily closes for the last two years and weekly closes (dated the week's last trading day) back to the first listing. The format is `{"symbol", "d": [days since 1970-01-01], "c": [closes]}`. These files are generated at deploy time and are gitignored.

The GitHub Pages workflow runs the tests and rebuilds the snapshot on every deployment. In the repository's **Settings → Pages → Build and deployment**, **Source must be GitHub Actions**, not **Deploy from a branch**. Branch publishing does not generate the gitignored history files and can cancel the custom build, leaving every security's chart unavailable. The custom workflow publishes on pushes to `main`, hourly, or when run manually.

Each page load fetches `data.json` without using a cached copy, then requests the latest Yahoo Finance regular-session quotes through the repository-root Vercel endpoint `/api/market-quotes`. Quotes refresh every 60 seconds after the previous refresh finishes while the page is visible; returning to a hidden page refreshes immediately. Requests are batched at 20 tickers, with at most three batches in flight. The endpoint caches successful batches for up to 60 seconds. No API key is required.

Prices, estimated market caps (assuming unchanged shares), P/E, and price-dependent DCF upside follow these quotes without rebuilding or deploying the site. Hover a price for the provider's quote timestamp. Quotes may be delayed or rate-limited, regular-session prices do not include extended-hours trades, and mutual funds generally price only once daily. This is automatic polling, not a licensed real-time streaming feed.

Each refresh also requests `/api/market-quotes?marketCaps=1`, which fetches the complete Nasdaq screener in one request and caches successful results for up to one hour. Market caps are scaled from the provider's reference price to the displayed quote; P/E and DCF then use the recovered cap and snapshot earnings. This restores missing valuations even if the published snapshot has no market caps. A valuation-source failure does not discard working quotes or previous valuation bases, and is reported in the status. Hover valuation cells for the source date or the reason a metric is unavailable. Funds have no stock valuations; non-positive or missing earnings cannot produce P/E or DCF estimates.

Constituents, earnings, historical returns, and chart history remain deployment-built snapshots; quote polling does not recalculate historical return windows or fetch SEC filings. The status tooltip identifies the snapshot build time. Failed or partial quote refreshes show a warning, preserve last available values, and retry automatically. Returning through the browser's back/forward cache also refreshes the snapshot and any open security history.

**Initial setup:** Deploy the repository-root Vercel project to install `api/market-quotes.js`, and publish the updated page once. Subsequent quote updates need no deployments. GitHub Pages and localhost use `https://ai-orcin-eta-15.vercel.app/api/market-quotes`; Vercel-hosted pages use the same-origin endpoint. See the [deployment guide](../DEPLOYMENT.md). A static server alone cannot run the API.

If Nasdaq fails or omits a stock, the builder can retain a last-known cap from its existing snapshot, scale it to the latest close, and preserve its original date. It logs a warning and marks these retained estimates in the page status and valuation-cell tooltips until runtime data replaces them. Builds with market caps for fewer than 80% of stocks (including retained values) fail rather than publish widespread missing valuations. Other upstream failures that prevent the snapshot from being built also fail before deploying. The previously published site, including its snapshot and history files, remains available; check the failed workflow run for the error. This also delays unrelated site updates until a subsequent build succeeds.

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
node --test *.test.js
```

## Limitations

This is a research and demonstration tool, not investment advice or a real-time market feed. Check the displayed snapshot timestamp and upstream methodology before interpreting results. Missing data and shorter listing histories affect comparisons; returns exclude dividends.
