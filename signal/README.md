# Signal

**Deployed application:** [Open the app](https://alphadyn.github.io/apps/signal/)

> Google News headlines with ranked trends, search, and JSON export. See the [repository catalog](../README.md) for shared setup and deployment context.

The GitHub Pages app automatically loads a periodically generated Google News RSS snapshot when the page opens; **Capture today's headlines** can also be selected to refresh it. The app loads that snapshot rather than scraping Google News in the browser. Search headlines, select trending terms to filter stories, and download the original capture timestamp and metadata as JSON.

A separate local Flask app opens Google News in headless Chromium, scrolls the feed, and extracts headlines, links, and related reads. It also saves a copy as `google_news.json`. Both interfaces share the trend extractor, but the Pages app's shared removed-keyword management is not part of the Flask UI.

## Trending names and phrases

Both versions show up to **20 recurring proper-noun candidates and topic phrases**
in descending order of headline count. Each term counts at most once per
`header_title`; publisher suffixes and related-read subtitles are excluded.
Terms must appear in at least two headlines, so a small capture may show fewer
than 20 results. Search filters do not change the capture-wide ranking.

The shared browser extractor uses capitalization as a lightweight heuristic for
names, not a trained named-entity model. Sentence-initial capitalization alone
does not qualify a single word; acronyms, mixed-case names, and capitalized name
phrases do. Topic phrases contain two to four consecutive non-stop words and
cannot cross punctuation. Case and possessives are normalized, numeric-only
terms are ignored, and equally frequent fragments are replaced by their longer
phrase. Ties prefer longer phrases, then alphabetical order.

On the Pages version, select terms to filter headlines or remove unwanted terms
from the ranking; removed terms are excluded before selecting the top 20.
Select **Removed trends**, to the left of **Download JSON**, to search removed
keywords. Select **+** beside a keyword to restore its eligibility immediately.
Restored keywords only appear in the top 20 if their headline count qualifies. Removed keywords use the same compact pill layout as the ranked terms.

### Shared removed trends

The Pages frontend stores removed keywords in the Supabase `signal_removed_trends`
table, not in a writable GitHub Pages JSON file. Run the SQL in [supabase-schema.sql](./supabase-schema.sql) once in the
Supabase SQL Editor to create and seed the public shared list with the current
removed keywords. Configure the project URL and public key in [supabase-config.js](./supabase-config.js); never put a service-role key in the frontend.

Anyone visiting the app can add a removed term or restore one. Successful changes are stored in the shared table and loaded by other visitors when they open or reload the app; there is no live cross-browser subscription. A local browser cache is used if the database is temporarily unavailable, and the page reports when a change could not be shared. A browser-only change is not a successful shared save.

The schema intentionally permits public edits. Do not use this table for private data. Run the seed script only for initial setup: rerunning it can reinsert seeded keywords that users have restored.

## GitHub Pages

The Pages deployment fetches Google News RSS directly with `python3 signal/build_data.py`
and publishes `signal/news.json` alongside the page. The existing deployment workflow
is scheduled once an hour (GitHub may delay scheduled runs) and also runs on
pushes to `main` or manual dispatch. Browser captures load this same-origin snapshot;
they do not use an RSS conversion or CORS proxy.

The snapshot includes Top Stories and eight topic feeds, deduplicated by article URL.
The interface and JSON download preserve the snapshot's actual capture timestamp.
Failed sections are recorded in `failed_feeds`, logged during the build, and displayed
in the page. A build with no usable headlines fails instead of publishing an empty
snapshot. RSS headlines have an empty `subtitles` array; the Flask capture still
extracts related reads from Google News.

To preview the static page locally, generate the snapshot before serving this directory:

```sh
python3 build_data.py
python3 -m http.server 8000
```

Open <http://localhost:8000>. The builder uses only Python's standard library.
The generated `news.json` is ignored by Git and is regenerated during deployment.

Snapshot and browser-script regression tests run during deployment. To run them
locally (the browser-script tests require Node.js 18 or newer):

```sh
python3 -m unittest discover -s . -p test_build_data.py
node --test app.test.js
```

## Local Flask requirements

- Python 3.10 or newer
- Flask
- Playwright and its Chromium browser

Install the dependency and browser once from this directory:

```sh
python3 -m pip install -r requirements.txt
python3 -m playwright install chromium
```

## Run the local Flask app

```sh
python3 app.py
```

Open <http://127.0.0.1:5000> in your browser and select **Capture today’s headlines**. The server scrolls the feed until it stops adding stories (up to 15 passes), then displays the extracted cards and related reads. Select **Download JSON** to save the capture. The app is local-only by default; it binds to `127.0.0.1`.

Each entry in the `news` array has `header_title`, `header_url`, and a `subtitles` array of `{ "title", "url" }` objects. Google News may change its page markup, and available headlines vary by region and time. An internet connection is required. Only save content you're permitted to download and retain, and follow Google's applicable terms.

## Deployment troubleshooting

If the live page does not reflect a push, check the [Pages workflow](../.github/workflows/deploy-pages.yml). The previous site remains live if a test or build fails. After a successful deployment, reload the page. If the removed list cannot load or save, check its visible error message, Supabase table and policies, and public configuration.
