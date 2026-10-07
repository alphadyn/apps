# Lexhaven Legal Docketing

**Deployed application:** [Open the app](https://alphadyn.github.io/apps/lexhaven-legal-docketing/)

> Standalone browser workflow for matters and deadlines. See the [repository catalog](../README.md) for shared setup and testing context.

This folder contains a fully functional, browser-based legal docketing application designed for law firms and legal teams that need to manage matters, deadlines, and tasks in one place.

## Features
- Dashboard summary cards for matters, pending tasks, and upcoming deadlines
- Matter management with case title, client, status, court, hearing date, and attorney details
- Task tracker with priority levels, due dates, completion toggles, and deletion
- Search and filtering so users can focus on the right matters quickly
- Local persistence using browser storage, so records remain available after refreshes
- Responsive light workspace with a navy brand header, labeled task fields, keyboard-accessible matter selection, and clear focus indicators
- Mobile layouts include workspace jump links, single-column forms, at least 44px action targets, 16px form text to avoid automatic input zoom on iOS, and safe-area spacing
- Task filtering preserves in-progress form entries; the overview shows hearings scheduled within the next 14 days

## How to run
Open the application directly in a browser:

```bash
open lexhaven-legal-docketing/index.html
```

If you prefer a local server, run:

```bash
cd lexhaven-legal-docketing
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

## Project structure
- `index.html` — main layout and UI structure
- `styles.css` — polished, professional visual design
- `app.js` — application logic, state handling, and local storage persistence

## Notes
- The app is intentionally lightweight and dependency-free.
- It is suitable for demos, prototypes, or as a foundation for a larger legal case-management system.

## Branding and link previews

The page includes SVG and PNG favicons, an Apple touch icon, and Open Graph/Twitter metadata pointing to a 1200 x 630 PNG preview. Messaging apps that support link previews can display the card when the deployed application URL is shared. Preview availability and caching depend on the messaging service; the assets and metadata must first be deployed.

The logo and icons use a gold scales-of-justice shield on navy, matching the app header and the link-preview card.

To regenerate all vector and raster assets on macOS from the app folder:

```bash
swift generate_brand_assets.swift
```

The generator maintains `logo.svg`, `favicon.svg`, the PNG favicon, the Apple touch icon, and the social preview together.

## Test the project
Run the repository-wide test suite from the project root:

```bash
./run_tests.sh
```

## Generate the report
Run the generator script to create a simple HTML artifact for this project:

```bash
python3 generate_report.py
```

This writes [generated_report.html](generated_report.html) in the same folder.
