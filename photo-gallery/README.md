# Photo Gallery

**Deployed application:** [Open the app](https://alphadyn.github.io/apps/photo-gallery/)

> Standalone responsive browser gallery. See the [repository catalog](../README.md) for shared setup and deployment context.

A browser-based web app that selects 10 distinct photos from a pool of 20 on every page load/refresh and displays them in an auto-rotating carousel. The gallery UI renders without waiting for the photo service; if a photo cannot load, the local preview image is shown instead.

Photo Gallery has no clickable app icon or brand link. Reload the page to select a new set of photos and restart the carousel. Photos require an internet connection; the local preview image is used if the photo service is unavailable.

## Features

- 10 distinct photos randomly selected from a pool of 20 Unsplash images on every page load
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

## How To Run

No build tools or installation are required. An internet connection is required to load photos from Unsplash.

1. Open `index.html` in any modern browser.
2. Refresh the page to get a brand-new set of 10 photos.
3. The gallery rotates automatically every 4 seconds.
4. Tap or click the photo area once to show the controls. Tap the photo again or use the close button to hide them. With keyboard focus on the gallery, Enter or Space toggles the controls; Escape closes them.
5. Use the arrow buttons, thumbnails, Left/Right keys, or a horizontal swipe to navigate manually.
6. On phones and tablets, double-tap the photo area to pause or resume the slideshow. The play/pause button works on every device.

## Test the project

Run the repository-wide test suite from the project root:

```bash
./run_tests.sh
```

## Notes

Photos are served by [Unsplash](https://unsplash.com/) from a curated pool of 20 images. Since the photos are fetched over the network, the app requires an active internet connection and will not work fully offline.
