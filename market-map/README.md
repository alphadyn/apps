# Market Map

A viewport-filling S&P 500 treemap. Rectangle area is proportional to company market capitalization. Positive implied DCF upside is green, negative upside is red, and larger magnitudes are progressively darker on a continuous, unclipped scale. Gray means unavailable valuation; zero is neutral.

## Run

Serve the **repository root**, not this folder, because the app shares the Market Insights snapshot and valuation helpers:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/market-map/>. No new dependencies or API keys are required. If the snapshot is missing, generate it using the [Market Insights setup](../market-insights/README.md). The existing hourly Pages workflow generates and publishes that shared data.

Refresh reloads the published snapshot, not live prices. The app displays the snapshot price date and warns when it is over four days old. Failed requests show an explicit error and allow retry; a failed refresh retains the previous map with a warning.

## Explore

- Search a ticker or company to highlight matches **without resizing or removing tiles**. Press Enter to open the first match, including stocks missing market caps.
- Hover or keyboard-focus any tile to read its ticker, cap, and implied upside in the bottom readout. Click or tap to open full details. All tiles are native keyboard-accessible buttons.
- Tile labels scale with available space rather than distorting company areas. Small companies' labels may be too small to read at overview scale; search, tooltips, and the details readout provide readable values.
- Coverage explains missing caps and opens their company details. Unavailable caps are never fabricated or assigned arbitrary area; these companies are excluded from the map and its total but remain searchable.
- The main map fits the viewport without page scrolling. Details and methodology dialogs can scroll independently.

## Methodology

Stocks come from `../market-insights/data.json`; funds are excluded. All constituent tickers are retained, but multiple share classes are grouped by SEC CIK to avoid double-counting company-wide caps. A combined tile lists every constituent ticker. Its cap and DCF use the first listed class with a positive finite cap (the same first-issuer convention as Market Insights when that cap is available). Per-class valuations are shown in details. This is total company capitalization, **not float-adjusted S&P index weighting**.

DCF and implied upside directly reuse [the existing helpers](../market-insights/ranking.js), not a duplicate model: five-year TTM net-income projection, earnings growth capped at +/-5%, 10% discount rate, 2.5% terminal growth, shares inferred from cap / price. Implied upside is `(DCF value - price) / price`. Missing or non-positive earnings, price, or cap yield unavailable valuation. This simplified earnings-based estimate is not an analyst target or investment advice.

The gapless squarified layout assigns each company exactly `company cap / mapped total` of the rectangle's geometric area; thin inset separators do not change tile bounds. Source and coverage limitations are visible in the app.

## Tests

```bash
node --test market-map/model.test.js
```

Tests cover constituent coverage, multi-class grouping, missing values, continuous signed colors, financial formatting, and 503-tile area conservation, bounds, and non-overlap across desktop, mobile, landscape, and unit-square layouts.
