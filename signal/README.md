# Signal

**Deployed application:** [Open the app](https://alphadyn.github.io/apps/signal/)

> A focused news-reading list powered by Google News. Signal collects headlines and related stories, then lets you search and download them as structured JSON.

Signal can run as a browser-based page or as a local Flask app. The local app opens Google News in headless Chromium, scrolls the feed to load additional stories, and extracts article titles, links, and related reads. Captures are shown in a responsive interface, can be searched, and can be downloaded as structured JSON. The local app also saves a copy beside itself as `google_news.json`.

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

## Requirements

- Python 3.10 or newer
- Flask
- Playwright and its Chromium browser

Install the dependency and browser once from this directory:

```sh
python3 -m pip install -r requirements.txt
python3 -m playwright install chromium
```

## Run

```sh
python3 app.py
```

Open <http://127.0.0.1:5000> in your browser and select **Capture today’s headlines**. The server scrolls the feed until it stops adding stories (up to 15 passes), then displays the extracted cards and related reads. Select **Download JSON** to save the capture. The app is local-only by default; it binds to `127.0.0.1`.

Each entry in the `news` array has `header_title`, `header_url`, and a `subtitles` array of `{ "title", "url" }` objects. Google News may change its page markup, and available headlines vary by region and time. An internet connection is required. Only save content you're permitted to download and retain, and follow Google's applicable terms.
