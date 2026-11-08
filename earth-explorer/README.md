# Earth Explorer

**Deployed application:** [Open the app](https://alphadyn.github.io/apps/earth-explorer/)

> Standalone Three.js browser visualization. See the [repository catalog](../README.md) for shared setup and deployment context.

An interactive browser app that renders a 3D model of the Earth, lets you inspect the
latitude/longitude of any point on its surface, and measure the great-circle (surface)
distance between any two points you click.

## Features
- **3D rotating globe** built with [Three.js](https://threejs.org/), textured with a real
  earth image, drag in any direction to orbit around the globe's fixed center,
  and scroll/pinch-to-zoom via `OrbitControls`
- **Zoom controls** with 12 surface-relative zoom-in steps from the default view to
  the closest level, plus a reset button to restore the original view. The closest camera distance is
  2.001 for a globe radius of 2, allowing street-level detail; wheel and pinch zoom use reduced sensitivity.
- **Double-click zoom** smoothly rotates the view to center the clicked location while
  zooming in, keeping the globe's center fixed; a fullscreen toggle is also available (press Esc to exit)
- **Optional national borders** overlaid on the globe surface, loaded from a public GeoJSON dataset
- **Street map on the globe**: enable **Streets** to project CARTO light basemap tiles
  based on OpenStreetMap onto the Earth's curved surface. Tiles follow globe rotation
  and progressively increase in detail as you zoom closer, without a separate flat map.
  Tiles load on demand with up to six concurrent requests and a bounded cache.
  Attribution remains visible, including in fullscreen, and tile failures are reported.
- **Progressive map details**: optional 30° grid and major-city markers at a distance;
  zooming in reveals 15°, 5°, and 2° grid lines, then adds increasingly local cities and towns.
  Additional city markers appear at a camera distance of 3.1 and town markers at 2.55;
  their names appear below 2.9 and 2.4, respectively. Locations are curated, not an exhaustive gazetteer.
  A further local-place tier appears at 2.3, with names below 2.2 for the closest views.
  Labels avoid overlaps and markers on the far side of the globe are hidden
- **Inspect Point mode**: click anywhere on the globe to drop a marker and see its latitude,
  longitude, hemisphere, and the country it falls within (with a flag and a link to that
  country's Wikipedia article, opened in a new tab)
- **Measure Distance mode**: click two points on the globe to drop markers, draw a great-circle
  arc between them, and see the surface distance in kilometers and miles
- Distance is computed from the true angular separation between the two points on the sphere
  (not a straight line through the globe), so it reflects real-world surface distance

## Run it
This app loads Three.js and the earth texture from public CDNs, so an internet connection is
required. Because it uses ES modules, open it through a local server rather than the `file://`
protocol:

```bash
cd earth-explorer
python3 -m http.server 8000
```

Then open http://localhost:8000 in your browser.

## How to use
1. **Inspect Point** (default mode): click anywhere on the globe. A marker appears and the side
   panel shows the latitude, longitude, hemisphere, and country (with its flag, if the point
   falls on land) for that point, along with a link to open that country's Wikipedia article in
   a new tab.
2. Switch to **Measure Distance** mode using the toggle at the top. Click a first point (green
   marker), then a second point (yellow marker). An arc is drawn between them and the panel shows
   the surface distance. Clicking again after two points are set starts a new measurement.
3. Use **Reset Points** to clear the current measurement.
4. Use **+**, **−**, or the scroll wheel/pinch gesture to zoom. The circular arrow resets
  the zoom and globe orientation. Use the checkboxes below the globe to show or hide
  national borders, coordinate grid, cities, or streets. More grid lines and city names appear as you zoom in.
5. Double-click a location to rotate it into the center and zoom in without selecting a point. Use the fullscreen button
  in the upper-right corner of the globe to expand it; click again or press Esc to exit.

## Main files
- `index.html` — page structure, mode toggle, and side panels
- `app.js` — Three.js scene/globe setup, raycasting for click detection, lat/lon conversion,
  and great-circle distance calculation
- `street-map.js` — Web Mercator tile selection, spherical projection, and tile loading/disposal
- `styles.css` — layout and visual styling

## Notes
- Street maps require internet access to CARTO's tile servers; Leaflet is not needed.
  Tile requests use the same browser-facing CARTO basemap key as Experiences.
  CARTO and OpenStreetMap usage terms apply; review provider limits before a high-traffic deployment.
  Web Mercator tiles stop at about 85.05° latitude, so the poles retain Earth imagery.
  Tile levels are selected from the current field of view (up to provider level 19);
  the request budget can lower the level for wide views. No geocoding requests are needed.
- Latitude/longitude are derived from the clicked point's position on the sphere; no external
  geocoding service is used.
- Distance uses the standard great-circle formula (angular separation between two unit vectors
  multiplied by Earth's mean radius, 6371 km).
- Country boundaries are loaded from a public GeoJSON dataset of national borders at page load
  and rendered as line segments just above the globe surface.
- The same GeoJSON dataset is used to determine which country (if any) a clicked point falls
  within, via a point-in-polygon test; ocean/unclaimed points show no country or Wikipedia link.
- Country flags are rendered as Unicode flag emoji from a built-in country-name-to-ISO-code
  table, so no extra flag images need to be downloaded.
