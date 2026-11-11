# The Daily Brief

The Daily Brief gathers recent headlines from Google News, Reuters, CNN, BBC, Bloomberg, and CNBC, then groups overlapping headlines into a short, headline-based overview. The briefing is generated automatically when the page loads and can be refreshed at any time. Linked headlines open the original reporting.

The summary uses public RSS headlines rather than article text or a generative AI service. It is an editorial aid, not a substitute for reading the linked coverage. The app is a static GitHub Pages frontend; its RSS aggregation endpoint runs in the repository-root Vercel project at `/api/daily-brief`. Publisher-specific Google News RSS searches are used where direct feeds are unavailable or restrict server access.

Select the header wordmark to reload the app's entry page; the briefing is fetched automatically when the page loads.

The API keeps a five-minute in-memory cache, includes only stories from the last 24 hours when a feed supplies publication dates, and reports which sources could not be reached. Run the focused API tests with:

```sh
node --test daily-brief/api.test.js
```
