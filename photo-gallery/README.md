# Photo Gallery

**Deployed application:** [Open the app](https://alphadyn.github.io/apps/photo-gallery/)

> Standalone responsive browser gallery. See the [repository catalog](../README.md) for shared setup and deployment context.

A browser-based web app that selects 10 distinct catalog entries from a collection of 1,047 on every page load/refresh and displays them in an auto-rotating carousel. The collection combines 987 high-resolution Lorem Picsum photos with 60 supplemental Unsplash images, spanning landscapes, cities, architecture, travel, wildlife, flowers, and space photography. The catalog is bundled locally, so the gallery UI renders without waiting for a catalog service; if a photo cannot load, the local preview image is shown instead.

Photo Gallery has no clickable app icon or brand link. Reload the page to select a new set of photos and restart the carousel. Photos require an internet connection; the local preview image is used if the photo service is unavailable.

## Features

- 10 distinct catalog entries randomly selected from a collection of over 1,000 on every page load
- Full-size images retain the existing 1200-pixel requested width; Picsum originals are at least that wide and preserve their aspect ratio, while Unsplash retains its quality setting of 80
- Fullscreen-only layout that fills the browser viewport without cropping the photo
- Automatic slideshow with a compact control panel hidden by default
- Previous, next, play/pause, photo counter, and thumbnails available with one tap or click
- Keyboard navigation (Left / Right arrow keys)
- Mobile swipe gestures to move between photos
- Mobile double-tap to play or pause without opening the controls
- Responsive layout for desktop and mobile

## Project Structure

- `index.html` - Main page markup
- `styles.css` - App styling and responsive layout
- `app.js` - Fetches a fresh set of photo URLs and drives the carousel logic and rotation timer
- `photos.js` - Bundled high-resolution Picsum catalog with source dimensions

## How To Run

No build tools, API keys, or installation are required. An internet connection is required to load photos from Picsum and Unsplash.

1. Open `index.html` in any modern browser.
2. Refresh the page to get a brand-new set of 10 photos.
3. The gallery rotates automatically every 4 seconds.
4. Tap or click the photo area to show the controls, and again to hide them. With keyboard focus on the gallery, Enter or Space toggles the controls; Escape hides them.
5. Use the arrow buttons, thumbnails, Left/Right keys, or a horizontal swipe to navigate manually.
6. On phones and tablets, double-tap the photo area to pause or resume the slideshow. The play/pause button works on every device.

## Test the project

Run the repository-wide test suite from the project root:

```bash
./run_tests.sh
```

Run the focused catalog tests without installing dependencies:

```bash
python3 -m unittest scripts.test_photo_gallery
```

## Refresh the catalog

From the project root, run:

```bash
python3 scripts/update_photo_gallery_catalog.py
```

The script fetches the paginated Picsum catalog, excludes originals narrower than 1,200 pixels, validates entries, and regenerates `photos.js`. It fails without replacing the existing catalog if the response is invalid or the high-resolution collection unexpectedly drops below 981 entries. Update the counts above if the catalog changes.

## Notes

Photos are served by [Lorem Picsum](https://picsum.photos/) and [Unsplash](https://unsplash.com/). Random selection is independent on each refresh, so some overlap between visits is still possible. The slideshow continues to loop its selected 10 photos; reload for a new selection. Since the photos are fetched over the network, the app requires an active internet connection and will not work fully offline.
