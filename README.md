# Alphadyn AI Apps and Experiments

This repository is a portfolio-style collection of 21 independent projects: interactive demos, data visualizations, browser apps, and Python utilities. Each project is designed to be opened, adapted, or expanded on its own. The collection is intentionally mixed: some apps are static browser experiences, while others use Supabase, Flask, or Vercel APIs.

The root landing page in [index.html](index.html) links directly to the deployed apps and gives a quick overview of the portfolio. It includes a Featured area and a full Catalog of all available apps and experiments.

Deployment configuration and host-specific setup are documented in [DEPLOYMENT.md](DEPLOYMENT.md).

## Featured projects

The landing page highlights these projects:

1. [Pulse](pulse/) — Social/news app with posts, tags, and threaded discussion
2. [Market Curve Lab](market-curve-lab/) — S&P 500 rankings, performance, trendlines, and concavity
3. [Experiences](experiences/) — Maps and authenticated trip journal
4. [Market Lens](market-lens/) — Large-cap equity screening dashboard
5. [Nexus](nexus/) — Content and media workspace
6. [Atlas Store](atlas-store/) — Storefront and checkout experience
7. [Northstar EHR](northstar-ehr/) — Responsive electronic health record demo for patient care workflows and encounter documentation

## App catalog

Projects are listed alphabetically, matching the catalog on the landing page.

- [Architectural Design](architectural-design/) ([Open app](https://alphadyn.github.io/apps/architectural-design/)) — Architectural concept board and home design presentation.
- [Atlas Store](atlas-store/) ([Open app](https://alphadyn.github.io/apps/atlas-store/)) — Storefront mockup with catalog, cart, and checkout flow.
- [Audio Equalizer](audio-equalizer/) ([Open app](https://alphadyn.github.io/apps/audio-equalizer/)) — Browser media player with live waveform and spectrum analysis.
- [Crawler Indexer](crawler-indexer/) ([Open app](https://alphadyn.github.io/apps/crawler-indexer/)) — Domain-scoped crawler and indexer utility.
- [Earth 3D Explorer](earth-3d-explorer/) ([Open app](https://alphadyn.github.io/apps/earth-3d-explorer/)) — Three.js globe with overlays and inspection interactions.
- [Experiences](experiences/) ([Open app](https://alphadyn.github.io/apps/experiences/)) — Supabase-backed journal with trips, shareable Experience collections, Event maps, precise location picking, and media carousels.
- [Fractal Patterns](fractal-patterns/) ([Open app](https://alphadyn.github.io/apps/fractal-patterns/)) — Interactive fractal visualizer.
- [Lexhaven Legal Docketing](lexhaven-legal-docketing/) ([Open app](https://alphadyn.github.io/apps/lexhaven-legal-docketing/)) — Matter and deadline tracking app.
- [Market Curve Lab](market-curve-lab/) ([Open app](https://alphadyn.github.io/apps/market-curve-lab/)) — Rank all 500 S&P 500 companies by market cap, search stocks, and inspect selected-ticker all-time performance, trendlines, and concavity.
- [Market Lens](market-lens/) ([Open app](https://alphadyn.github.io/apps/market-lens/)) — Dashboard for screening and reviewing large-cap equities.
- [Meetings](meetings/) ([Open app](https://alphadyn.github.io/apps/meetings/)) — Encrypted WebRTC meetings with chat, file sharing, fullscreen mode, and responsive mobile controls.
- [Multi-Search Engine](multi-search-engine/) ([Open app](https://alphadyn.github.io/apps/multi-search-engine/)) — Search comparison page across multiple engines.
- [Nexus](nexus/) ([Open app](https://alphadyn.github.io/apps/nexus/)) — Media workspace with browser UI, sample media, filtering, metadata editing, and optional Supabase persistence.
- [Northstar EHR](northstar-ehr/) ([Open app](https://alphadyn.github.io/apps/northstar-ehr/)) — Responsive electronic health record demo for patient care workflows and encounter documentation.
- [Pencil Sketch](pencil-sketch/) ([Open app](https://alphadyn.github.io/apps/pencil-sketch/)) — Image-to-pencil-sketch converter.
- [Photo Gallery](photo-gallery/) ([Open app](https://alphadyn.github.io/apps/photo-gallery/)) — Responsive gallery app.
- [Postboard](postboard/) ([Open app](https://alphadyn.github.io/apps/postboard/)) — Personal post archive with rich text, uploads, and Supabase integration.
- [Pulse](pulse/) ([Open app](https://alphadyn.github.io/apps/pulse/)) — Social/news-style app with posts, tags, and discussion flows.
- [Signal](signal/) ([Open app](https://alphadyn.github.io/apps/signal/)) — Focused, searchable news-reading list that captures Google News headlines and related stories and downloads them as structured JSON.
- [Vault](vault/) ([Open app](https://alphadyn.github.io/apps/vault/)) — Browser-based text and file encryption app; all processing stays on-device.
- [vCard Generator](vcard-generator/) ([Open app](https://alphadyn.github.io/apps/vcard-generator/)) — Card generation and QR code output.

## Quick start

Most projects are static sites and can be opened directly in a browser. A simple local server is the safest way to run them consistently:

```bash
cd project_folder
python3 -m http.server 8000
```

Then visit http://localhost:8000.

Examples:

```bash
cd audio-equalizer
python3 -m http.server 8000

cd earth-3d-explorer
python3 -m http.server 8000

cd experiences
python3 -m http.server 8000

cd atlas-store
python3 -m http.server 8000

cd market-lens
python3 -m http.server 8000
```

### Nexus

[Nexus](nexus/) is currently a static browser app. Serve the repository or the project folder, then open `nexus/index.html`. Configure `nexus/supabase-config.js` when persistence is needed; the built-in Samples action is available without a configured backend.

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000/nexus/>.

### Market Curve Lab

The [Market Curve Lab](market-curve-lab/) web app builds a market-cap ranking of all 500 S&P 500 companies and lets you search any listed equity by ticker or company name. It computes adjusted all-time performance, linear and quadratic trendlines, and recent concavity for the selected ticker; histories are fetched on demand instead of requesting all 500 at startup. Start it with:

```bash
cd market-curve-lab
python3 -m pip install -r requirements.txt
python3 app.py
```

Open <http://127.0.0.1:5001>, type a ticker or company name, and choose a matching stock. The complete S&P 500 is listed in market-cap order; ranking data is cached for six hours, and selected-ticker histories for one hour. The dashboard shows the closest-fitting model by R² and classifies recent performance curvature as concave up or down.

### Postboard setup

The [Postboard](postboard/) project uses Supabase for persistence and API access. Configure it once:

1. Create a Supabase project.
2. In the SQL editor, run [postboard/supabase-schema.sql](postboard/supabase-schema.sql).
3. Copy [postboard/supabase-config.js](postboard/supabase-config.js) and replace the placeholder URL and anon key with your project values.
4. Serve the folder locally or deploy it to GitHub Pages.

If the app reports a `NetworkError`, the config file still contains placeholder values, or the Supabase URL is unreachable, re-check the project settings and the generated config file.

### Python utilities

Run utility scripts from the repo root or from the project folder as needed:

```bash
python3 crawler-indexer/indexer.py https://example.com --same-domain --max-pages 5 --output index.json
python3 -m pip install -r signal/requirements.txt
python3 -m playwright install chromium
python3 signal/app.py
```

Signal runs as a local web app. After starting it, open <http://127.0.0.1:5000> to capture and search headlines, then download the structured JSON results.

## Testing

This repo includes automated tests for the crawler and search engine utilities. Install the dev dependencies and run the suite:

```bash
python3 -m pip install -r requirements-dev.txt
python3 -m pytest
```

A convenience wrapper is also included:

```bash
./run_tests.sh
```

The pytest configuration is defined in [pytest.ini](pytest.ini).

## Documentation map

- Use [index.html](index.html) as the visual project catalog and launch page.
- Use each project README for its local features, dependencies, and service configuration.
- Use [DEPLOYMENT.md](DEPLOYMENT.md) for GitHub Pages, Vercel, and local validation details.

## Notes

- This is a collection of independent experiments rather than a single monolithic product.
- Each project is self-contained and can be reused, adapted, or repurposed.
- The root [index.html](index.html) provides a gallery-style landing page for the repo.

## Site analytics

The root catalog and top-level app entry pages load [analytics.js](analytics.js), which sends page-view events to the repository-root [api/events.js](api/events.js) handler on the `ai-orcin-eta-15` Vercel deployment. The Vercel project's Root Directory must be the repository root for this route to be available. The tracker uses a session-only random visitor identifier, records the page path/title, referrer without query strings, a coarse device category, the page's HTTP status (from the Navigation Timing API where the browser supports it), and session duration (updated when the tab is hidden or closed). The API marks a view as bounced until the same session views a second page, derives an approximate city/region/country location from Vercel's IP geolocation headers, and stores the full forwarded IP address when valid (or `Not recorded` when unavailable); treat IPs and locations as sensitive data. A best-effort per-instance throttle limits writes; add Vercel Firewall/rate limiting for stronger abuse protection. GitHub Pages does not expose server request logs, so these are browser page views only—not bot traffic or every asset request.

To enable ingestion, run [analytics-schema.sql](analytics-schema.sql) on a dedicated Supabase project (including the constraint migration for existing tables), then configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `ANALYTICS_READ_TOKEN` in the `ai-orcin-eta-15` Vercel project's server-side environment. Set its Root Directory to the repository root and redeploy to publish `/api/events`. The `deploy-pages.yml` workflow only deploys GitHub Pages and does not deploy this Vercel API. Keep the service-role key and read token out of this repository. Configure the analytics dashboard with the same read token; the events endpoint refuses reads without it. For data minimization, use the optional cleanup statement in the SQL file to enforce a retention period.

## License

The code in this repository is licensed under the GNU General Public License, version 3 or any later version (GPL-3.0-or-later). See [LICENSE](LICENSE) for the full terms.

Third-party dependencies, services, and assets remain subject to their own licenses and terms.

## Generation scripts

Most project folders include a lightweight `generate_report.py` or similar script that produces demo artifacts such as `generated_report.html` when run with Python 3.
