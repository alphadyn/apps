# Photo Gallery

**Deployed application:** [Open the app](https://alphadyn.github.io/apps/photo-gallery/)

> Standalone responsive browser gallery. See the [repository catalog](../README.md) for shared setup and deployment context.

A browser-based web app that selects 10 distinct photos from a pool of 20 on every page load/refresh and displays them in an auto-rotating carousel. The gallery UI renders without waiting for the photo service; if a photo cannot load, the local preview image is shown instead.

Photo Gallery has no clickable app icon or brand link. Reload the page to select a new set of photos and restart the carousel. Photos require an internet connection; the local preview image is used if the photo service is unavailable.

## Features

- 10 distinct photos randomly selected from a pool of 20 Unsplash images on every page load
- Auto-rotating carousel with a progress bar
- Previous / Next navigation buttons
- Play / Pause toggle
- Clickable thumbnail strip to jump to any photo
- Keyboard navigation (Left / Right arrow keys)
- Mobile swipe gestures to move between photos
- **Maximize photo button** (⛶) to view full-screen images
- **Full-screen navigation**: Swipe left/right to navigate, swipe up/down to exit
- Carousel auto-rotation pauses when viewing maximized images
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
4. Use the arrow buttons, thumbnails, or Left/Right keys to navigate manually.
5. On phones and tablets, swipe left or right on the image to move between photos.
6. Click the pause button to stop auto-rotation.
7. Click the maximize button (⛶) to view a photo full-screen.
8. In full-screen mode:
   - Swipe left to view the next photo
   - Swipe right to view the previous photo
   - Swipe up or down to exit full-screen mode
   - Press ESC to exit full-screen mode
   - Click outside the image to exit full-screen mode

## Test the project

Run the repository-wide test suite from the project root:

```bash
./run_tests.sh
```

## Notes

Photos are served by [Unsplash](https://unsplash.com/) from a curated pool of 20 images. Since the photos are fetched over the network, the app requires an active internet connection and will not work fully offline.
