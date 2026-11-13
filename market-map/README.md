# Market Map

A viewport-filling S&P 500 treemap grouped into industry-sector rectangles. Sector area is proportional to its companies' combined market capitalization, and each company's area within a sector is proportional to its market capitalization. Positive implied DCF upside is green, negative upside is red, and larger magnitudes are progressively darker and more saturated on a continuous, unclipped scale. Gray means unavailable valuation; zero is neutral.

## Run

Serve the **repository root**, not this folder, because the app shares the Market Insights snapshot and valuation helpers:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/market-map/>. No new dependencies or API keys are required. If the snapshot is missing, generate it using the [Market Insights setup](../market-insights/README.md). The existing hourly Pages workflow generates and publishes that shared data.

On every page load and **Refresh**, Market Map removes the current map and requests current Yahoo Finance quotes and Nasdaq market caps through the shared [market quote API](../api/market-quotes.js), using a unique cache-busting query. Only those live prices and market caps are used for tile areas and DCF valuations; snapshot prices and market caps are never displayed or used as fallback, and fetched values are not persisted by the app. If live values are missing, affected companies are excluded from map area and valuation. The timestamp shows the most recent applied live quote. Quotes may be delayed and regular-session prices do not include extended-hours trades.

Constituent names, sectors, and earnings fundamentals are loaded from `../market-insights/data.json`; they are reference inputs, not saved market quotes. If the live request fails, the page reports the error and does not restore snapshot prices or caps.

## Explore

- Search a ticker or company to highlight matches **without resizing or removing tiles**. Press Enter to open the first match, including stocks missing market caps.
- Hover or keyboard-focus any tile to read its ticker, cap, and implied upside in the bottom readout. Click or tap to open full details. All tiles are native keyboard-accessible buttons.
- Tile labels scale with available space rather than distorting company areas. Small companies' labels may be too small to read at overview scale; search, tooltips, and the details readout provide readable values.
- Coverage explains missing caps and opens their company details. Unavailable caps are never fabricated or assigned arbitrary area; these companies are excluded from the map and its total but remain searchable.
- The main map fits the viewport without page scrolling. Details and methodology dialogs can scroll independently.

## Methodology

Stocks and earnings fundamentals come from `../market-insights/data.json`; funds are excluded. Current quotes and market caps are fetched on every page load and refresh. Companies without usable live prices and caps have no map area or DCF valuation. All constituent tickers are retained, but multiple share classes are grouped by SEC CIK to avoid double-counting company-wide caps. A combined tile lists every constituent ticker. Its cap and DCF use the first listed class with a positive finite live cap, matching Market Insights' first-issuer convention. Per-class valuations are shown in details. This is total company capitalization, **not float-adjusted S&P index weighting**. Quotes may be delayed; regular-session prices do not include extended-hours trades. This is not a licensed real-time streaming feed.

DCF and implied upside directly reuse [the existing helpers](../market-insights/ranking.js), not a duplicate model: five-year TTM net-income projection, earnings growth capped at +/-5%, 10% discount rate, 2.5% terminal growth, shares inferred from cap / price. Implied upside is `(DCF value - price) / price`. Missing or non-positive earnings, price, or cap yield unavailable valuation. This simplified earnings-based estimate is not an analyst target or investment advice.

The gapless squarified layout assigns each sector area in proportion to its combined company cap, then assigns each company area within the sector in proportion to its cap. Thin sector and tile separators do not change tile bounds. Source and coverage limitations are visible in the app.

## Text-message link previews

Share <https://alphadyn.github.io/apps/market-map/>. Static Open Graph and Twitter metadata in the HTML provide a title, description, canonical URL, and absolute HTTPS image URL for iMessage, SMS/RCS apps, and other link crawlers without executing JavaScript.

The committed 1200x630 [preview image](social-preview.png) uses an illustrative treemap rather than dated prices or valuations. Regenerate it with Pillow installed:

```bash
python3 market-map/generate_social_preview.py
```

Preview support depends on the messaging client (plain SMS itself does not carry a rich card). The page and image must be deployed publicly before the production URL can unfurl; clients may cache older previews.

## Validation

```bash
node --test market-map/model.test.js
python3 -m unittest discover -s market-map -p 'test_*.py'
```

Tests cover constituent coverage, multi-class grouping, missing values, continuous signed colors, financial formatting, and 503-tile area conservation, bounds, and non-overlap across desktop, mobile, landscape, and unit-square layouts.
