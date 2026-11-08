import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createStreetMap } from "./street-map.js?v=1";
import { setupLocationSearch } from "./location-search.js?v=1";

const EARTH_RADIUS_KM = 6371;
const GLOBE_RADIUS = 2;
const ZOOM_STEP = 2;
const MARKER_RADIUS = 0.035;
const MARKER_DIAMETER_PX = 7;

const container = document.getElementById("globeContainer");
const zoomInBtn = document.getElementById("zoomInBtn");
const zoomOutBtn = document.getElementById("zoomOutBtn");
const resetViewBtn = document.getElementById("resetViewBtn");
const fullscreenBtn = document.getElementById("fullscreenBtn");
const bordersLayer = document.getElementById("bordersLayer");
const gridLayer = document.getElementById("gridLayer");
const citiesLayer = document.getElementById("citiesLayer");
const mapLabels = document.getElementById("mapLabels");
const inspectModeBtn = document.getElementById("inspectModeBtn");
const measureModeBtn = document.getElementById("measureModeBtn");
const inspectPanel = document.getElementById("inspectPanel");
const measurePanel = document.getElementById("measurePanel");
const inspectEmpty = document.getElementById("inspectEmpty");
const inspectDetails = document.getElementById("inspectDetails");
const detailLat = document.getElementById("detailLat");
const detailLon = document.getElementById("detailLon");
const detailHemisphere = document.getElementById("detailHemisphere");
const detailCountry = document.getElementById("detailCountry");
const wikipediaLink = document.getElementById("wikipediaLink");
const streetsLayer = document.getElementById("streetsLayer");
const streetMapStatus = document.getElementById("streetMapStatus");
const streetMapCredit = document.getElementById("streetMapCredit");
const pointAEl = document.getElementById("pointA");
const pointBEl = document.getElementById("pointB");
const distanceValueEl = document.getElementById("distanceValue");
const resetMeasureBtn = document.getElementById("resetMeasureBtn");

let mode = "inspect"; // "inspect" | "measure"
let measurePoints = []; // holds up to two { vector, lat, lon } entries
const measureMarkers = [];
let measureLine = null;
let inspectMarker = null;
let countryFeatures = []; // GeoJSON features used for both the border overlay and name lookup

// --- Scene setup ---------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070d);

const camera = new THREE.PerspectiveCamera(45, 1, 0.00001, 100);
camera.position.set(0, 0, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 2.001;
controls.maxDistance = 10;
controls.zoomSpeed = 0.5;
// Let horizontal and vertical drags orbit freely around the globe's center.
// Disable translation so right-drag and two-finger gestures cannot move the
// orbit target away from the Earth; zooming also stays centered on the globe.
controls.enablePan = false;
let zoomTargetDistance = camera.position.distanceTo(controls.target);
let lastCameraDistance = zoomTargetDistance;
let applyingZoom = false;
let zoomFocusDirection = null;
controls.addEventListener("start", () => { zoomFocusDirection = null; });

// OrbitControls rotates by an angle per screen pixel, independent of zoom.
// At the center of a perspective-projected globe, a surface point moves by
// R / (distance - R) pixels per radian (times the camera's focal length).
// Match that motion to the pointer so zooming in does not amplify a swipe.
function updateRotateSpeed() {
  const distance = camera.position.distanceTo(controls.target);
  controls.rotateSpeed =
    ((distance - GLOBE_RADIUS) * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) /
    (Math.PI * GLOBE_RADIUS);
}

updateRotateSpeed();
controls.addEventListener("change", updateRotateSpeed);

function updateZoomButtons() {
  zoomInBtn.disabled = zoomTargetDistance <= controls.minDistance + 0.00001;
  zoomOutBtn.disabled = zoomTargetDistance >= controls.maxDistance - 0.00001;
}

function setCameraDistance(distance) {
  const offset = camera.position.clone().sub(controls.target).setLength(distance);
  camera.position.copy(controls.target).add(offset);
}

function captureDirectZoom() {
  const distance = camera.position.distanceTo(controls.target);
  const tolerance = Math.max(0.0000001, (lastCameraDistance - GLOBE_RADIUS) * 0.001);
  if (!applyingZoom && Math.abs(distance - lastCameraDistance) > tolerance) {
    zoomTargetDistance = THREE.MathUtils.clamp(distance, controls.minDistance, controls.maxDistance);
    setCameraDistance(lastCameraDistance);
  }
  updateZoomButtons();
}

controls.addEventListener("change", captureDirectZoom);

function zoomBy(factor) {
  zoomTargetDistance = THREE.MathUtils.clamp(
    GLOBE_RADIUS + (zoomTargetDistance - GLOBE_RADIUS) * factor,
    controls.minDistance,
    controls.maxDistance
  );
  updateZoomButtons();
}

function zoomToPoint(factor, point) {
  zoomFocusDirection = point.clone().sub(controls.target).normalize();
  zoomBy(factor);
}

zoomInBtn.addEventListener("click", () => zoomBy(1 / ZOOM_STEP));
zoomOutBtn.addEventListener("click", () => zoomBy(ZOOM_STEP));
resetViewBtn.addEventListener("click", () => {
  zoomFocusDirection = null;
  applyingZoom = true;
  controls.reset();
  applyingZoom = false;
  zoomTargetDistance = camera.position.distanceTo(controls.target);
  lastCameraDistance = zoomTargetDistance;
  updateZoomButtons();
});
controls.addEventListener("change", updateZoomButtons);
updateZoomButtons();

fullscreenBtn.disabled = !container.requestFullscreen || !document.exitFullscreen;
fullscreenBtn.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement === container) {
      await document.exitFullscreen();
    } else {
      await container.requestFullscreen();
    }
  } catch (error) {
    console.warn("Unable to toggle fullscreen:", error);
  }
});

document.addEventListener("fullscreenchange", () => {
  const isFullscreen = document.fullscreenElement === container;
  fullscreenBtn.setAttribute("aria-pressed", String(isFullscreen));
  fullscreenBtn.setAttribute("aria-label", isFullscreen ? "Exit fullscreen" : "Enter fullscreen");
  fullscreenBtn.title = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";
  resizeRendererToDisplaySize();
});

scene.add(new THREE.AmbientLight(0xffffff, 0.55));
const sunLight = new THREE.DirectionalLight(0xffffff, 1.1);
sunLight.position.set(5, 3, 5);
scene.add(sunLight);

// Starfield backdrop
const starGeometry = new THREE.BufferGeometry();
const starCount = 1500;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
  const radius = 40 + Math.random() * 40;
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
  starPositions[i * 3 + 2] = radius * Math.cos(phi);
}
starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
const starField = new THREE.Points(
  starGeometry,
  new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, sizeAttenuation: true })
);
scene.add(starField);

// Earth sphere
const textureLoader = new THREE.TextureLoader();
const earthTexture = textureLoader.load(
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg"
);
const earthGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 128, 128);
const earthMaterial = new THREE.MeshPhongMaterial({
  map: earthTexture,
  shininess: 8,
});
const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
earthMesh.renderOrder = -2;
scene.add(earthMesh);
const streetMap = createStreetMap(scene, camera, renderer, GLOBE_RADIUS, streetMapStatus);
streetsLayer.addEventListener("change", () => {
  streetMap.setEnabled(streetsLayer.checked);
  streetMapCredit.classList.toggle("hidden", !streetsLayer.checked);
});

// Thin atmosphere glow shell
const atmosphereMesh = new THREE.Mesh(
  new THREE.SphereGeometry(GLOBE_RADIUS * 1.015, 64, 64),
  new THREE.MeshBasicMaterial({
    color: 0x4da3ff,
    transparent: true,
    opacity: 0.08,
    side: THREE.BackSide,
  })
);
scene.add(atmosphereMesh);

// Country boundary overlay, drawn just above the earth's surface
const COUNTRY_BORDERS_URL =
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";
const BORDER_RADIUS = GLOBE_RADIUS * 1.002;
let borderMesh = null;

bordersLayer.addEventListener("change", () => {
  if (borderMesh) borderMesh.visible = bordersLayer.checked;
});

// Reveal progressively finer coordinate lines as the camera approaches the globe.
const coordinateGrids = [];

function makeCoordinateGrid(step, opacity) {
  const positions = [];
  const radius = GLOBE_RADIUS * 1.006;
  function addSegment(lat1, lon1, lat2, lon2) {
    const a = latLonToVector3(lat1, lon1, radius);
    const b = latLonToVector3(lat2, lon2, radius);
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  }
  for (let lat = -90 + step; lat < 90; lat += step) {
    if (step < 30 && lat % (step === 2 ? 10 : step === 5 ? 15 : 30) === 0) continue;
    for (let lon = -180; lon < 180; lon += 2) {
      addSegment(lat, lon, lat, lon + 2);
    }
  }
  for (let lon = -180; lon < 180; lon += step) {
    if (step < 30 && lon % (step === 2 ? 10 : step === 5 ? 15 : 30) === 0) continue;
    for (let lat = -90; lat < 90; lat += 2) {
      addSegment(lat, lon, lat + 2, lon);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const grid = new THREE.LineSegments(
    geometry,
    new THREE.LineBasicMaterial({ color: 0xa7cdeb, transparent: true, opacity })
  );
  scene.add(grid);
  return grid;
}

coordinateGrids.push(
  { maxDistance: Infinity, mesh: makeCoordinateGrid(30, 0.22) },
  { maxDistance: 4.8, mesh: makeCoordinateGrid(15, 0.16) },
  { maxDistance: 3.5, mesh: makeCoordinateGrid(5, 0.12) },
  { maxDistance: 2.8, mesh: makeCoordinateGrid(2, 0.08) }
);

function updateCoordinateGrids() {
  const distance = camera.position.distanceTo(controls.target);
  for (const { maxDistance, mesh } of coordinateGrids) {
    mesh.visible = gridLayer.checked && distance <= maxDistance;
  }
}

gridLayer.addEventListener("change", updateCoordinateGrids);
controls.addEventListener("change", updateCoordinateGrids);
updateCoordinateGrids();

function addRingSegments(ring, positions) {
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    const p1 = latLonToVector3(lat1, lon1, BORDER_RADIUS);
    const p2 = latLonToVector3(lat2, lon2, BORDER_RADIUS);
    positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
  }
}

async function loadCountryBorders() {
  const response = await fetch(COUNTRY_BORDERS_URL);
  if (!response.ok) throw new Error(`Failed to fetch country borders: ${response.status}`);
  const geojson = await response.json();
  countryFeatures = geojson.features;

  const positions = [];
  for (const feature of geojson.features) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    if (geometry.type === "Polygon") {
      geometry.coordinates.forEach((ring) => addRingSegments(ring, positions));
    } else if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) =>
        polygon.forEach((ring) => addRingSegments(ring, positions))
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: 0x7fd8ff,
    transparent: true,
    opacity: 0.55,
  });
  borderMesh = new THREE.LineSegments(geometry, material);
  borderMesh.visible = bordersLayer.checked;
  scene.add(borderMesh);
}

loadCountryBorders().catch((error) => {
  console.warn("Country borders could not be loaded:", error);
});

// --- Country lookup (point-in-polygon over the loaded GeoJSON) ------------
/** Even-odd ray-casting test for whether [lon, lat] is inside a GeoJSON linear ring. */
function isPointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > lat !== yj > lat;
    if (crosses && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/** A GeoJSON Polygon's coordinates are [outerRing, ...holeRings]. */
function isPointInPolygonRings(lon, lat, rings) {
  if (!isPointInRing(lon, lat, rings[0])) return false;
  for (let i = 1; i < rings.length; i++) {
    if (isPointInRing(lon, lat, rings[i])) return false; // inside a hole
  }
  return true;
}

/** Find the name of the country whose polygon contains the given lat/lon, if any. */
function findCountryName(lat, lon) {
  for (const feature of countryFeatures) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    if (geometry.type === "Polygon") {
      if (isPointInPolygonRings(lon, lat, geometry.coordinates)) {
        return feature.properties?.name ?? null;
      }
    } else if (geometry.type === "MultiPolygon") {
      for (const polygon of geometry.coordinates) {
        if (isPointInPolygonRings(lon, lat, polygon)) {
          return feature.properties?.name ?? null;
        }
      }
    }
  }
  return null;
}

// ISO 3166-1 alpha-2 codes for the country names used in the GeoJSON border dataset,
// used to render a flag emoji next to the inspected country's name.
const COUNTRY_ISO_CODES = {
  Afghanistan: "AF", Albania: "AL", Algeria: "DZ", Angola: "AO", Antarctica: "AQ",
  Argentina: "AR", Armenia: "AM", Australia: "AU", Austria: "AT", Azerbaijan: "AZ",
  Bangladesh: "BD", Belarus: "BY", Belgium: "BE", Belize: "BZ", Benin: "BJ",
  Bermuda: "BM", Bhutan: "BT", Bolivia: "BO", "Bosnia and Herzegovina": "BA",
  Botswana: "BW", Brazil: "BR", Brunei: "BN", Bulgaria: "BG", "Burkina Faso": "BF",
  Burundi: "BI", Cambodia: "KH", Cameroon: "CM", Canada: "CA",
  "Central African Republic": "CF", Chad: "TD", Chile: "CL", China: "CN",
  Colombia: "CO", "Costa Rica": "CR", Croatia: "HR", Cuba: "CU", Cyprus: "CY",
  "Czech Republic": "CZ", "Democratic Republic of the Congo": "CD", Denmark: "DK",
  Djibouti: "DJ", "Dominican Republic": "DO", "East Timor": "TL", Ecuador: "EC",
  Egypt: "EG", "El Salvador": "SV", "Equatorial Guinea": "GQ", Eritrea: "ER",
  Estonia: "EE", Ethiopia: "ET", "Falkland Islands": "FK", Fiji: "FJ",
  Finland: "FI", France: "FR", "French Guiana": "GF",
  "French Southern and Antarctic Lands": "TF", Gabon: "GA", Gambia: "GM",
  Georgia: "GE", Germany: "DE", Ghana: "GH", Greece: "GR", Greenland: "GL",
  Guatemala: "GT", Guinea: "GN", "Guinea Bissau": "GW", Guyana: "GY", Haiti: "HT",
  Honduras: "HN", Hungary: "HU", Iceland: "IS", India: "IN", Indonesia: "ID",
  Iran: "IR", Iraq: "IQ", Ireland: "IE", Israel: "IL", Italy: "IT",
  "Ivory Coast": "CI", Jamaica: "JM", Japan: "JP", Jordan: "JO", Kazakhstan: "KZ",
  Kenya: "KE", Kosovo: "XK", Kuwait: "KW", Kyrgyzstan: "KG", Laos: "LA",
  Latvia: "LV", Lebanon: "LB", Lesotho: "LS", Liberia: "LR", Libya: "LY",
  Lithuania: "LT", Luxembourg: "LU", Macedonia: "MK", Madagascar: "MG",
  Malawi: "MW", Malaysia: "MY", Mali: "ML", Malta: "MT", Mauritania: "MR",
  Mexico: "MX", Moldova: "MD", Mongolia: "MN", Montenegro: "ME", Morocco: "MA",
  Mozambique: "MZ", Myanmar: "MM", Namibia: "NA", Nepal: "NP", Netherlands: "NL",
  "New Caledonia": "NC", "New Zealand": "NZ", Nicaragua: "NI", Niger: "NE",
  Nigeria: "NG", "North Korea": "KP", "Northern Cyprus": "CY", Norway: "NO",
  Oman: "OM", Pakistan: "PK", Panama: "PA", "Papua New Guinea": "PG",
  Paraguay: "PY", Peru: "PE", Philippines: "PH", Poland: "PL", Portugal: "PT",
  "Puerto Rico": "PR", Qatar: "QA", "Republic of Serbia": "RS",
  "Republic of the Congo": "CG", Romania: "RO", Russia: "RU", Rwanda: "RW",
  "Saudi Arabia": "SA", Senegal: "SN", "Sierra Leone": "SL", Slovakia: "SK",
  Slovenia: "SI", "Solomon Islands": "SB", Somalia: "SO", Somaliland: "SO",
  "South Africa": "ZA", "South Korea": "KR", "South Sudan": "SS", Spain: "ES",
  "Sri Lanka": "LK", Sudan: "SD", Suriname: "SR", Swaziland: "SZ", Sweden: "SE",
  Switzerland: "CH", Syria: "SY", Taiwan: "TW", Tajikistan: "TJ", Thailand: "TH",
  "The Bahamas": "BS", Togo: "TG", "Trinidad and Tobago": "TT", Tunisia: "TN",
  Turkey: "TR", Turkmenistan: "TM", Uganda: "UG", Ukraine: "UA",
  "United Arab Emirates": "AE", "United Kingdom": "GB",
  "United Republic of Tanzania": "TZ", "United States of America": "US",
  Uruguay: "UY", Uzbekistan: "UZ", Vanuatu: "VU", Venezuela: "VE", Vietnam: "VN",
  "West Bank": "PS", "Western Sahara": "EH", Yemen: "YE", Zambia: "ZM",
  Zimbabwe: "ZW",
};

/** Convert an ISO 3166-1 alpha-2 code into its flag emoji (regional indicator symbols). */
function countryCodeToFlagEmoji(isoCode) {
  if (!isoCode || isoCode.length !== 2) return "";
  const codePoints = [...isoCode.toUpperCase()].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

function resizeRendererToDisplaySize() {
  const width = container.clientWidth;
  const height = container.clientHeight;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

resizeRendererToDisplaySize();
window.addEventListener("resize", resizeRendererToDisplaySize);
new ResizeObserver(resizeRendererToDisplaySize).observe(container);

const cameraForward = new THREE.Vector3();
const markerOffset = new THREE.Vector3();

function updateMarkerSizes() {
  camera.getWorldDirection(cameraForward);
  const pixelsToWorld = (MARKER_DIAMETER_PX * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) /
    (MARKER_RADIUS * renderer.domElement.clientHeight);
  const elevation = Math.min(0.02, (camera.position.length() - GLOBE_RADIUS) * 0.1);
  function scaleMarker(marker) {
    marker.position.normalize().multiplyScalar(GLOBE_RADIUS + elevation);
    const depth = markerOffset.subVectors(marker.position, camera.position).dot(cameraForward);
    marker.scale.setScalar(depth * pixelsToWorld);
  }
  if (inspectMarker) scaleMarker(inspectMarker);
  for (const marker of measureMarkers) scaleMarker(marker);
  if (measureLine) {
    measureLine.scale.setScalar((GLOBE_RADIUS + elevation) / (GLOBE_RADIUS * 1.01));
  }
}

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  const delta = Math.min(clock.getDelta(), 0.05);
  const distance = camera.position.distanceTo(controls.target);
  const nextDistance = THREE.MathUtils.damp(distance, zoomTargetDistance, 12, delta);
  if (zoomFocusDirection || distance !== zoomTargetDistance) {
    applyingZoom = true;
    if (zoomFocusDirection) {
      const direction = camera.position.clone().sub(controls.target).normalize();
      const rotation = new THREE.Quaternion().setFromUnitVectors(direction, zoomFocusDirection);
      rotation.slerp(new THREE.Quaternion(), Math.exp(-12 * delta));
      direction.applyQuaternion(rotation);
      if (direction.angleTo(zoomFocusDirection) < 0.0001) {
        direction.copy(zoomFocusDirection);
        zoomFocusDirection = null;
      }
      camera.position.copy(controls.target).addScaledVector(direction, distance);
    }
    setCameraDistance(Math.abs(nextDistance - zoomTargetDistance) > Math.max(0.0000001, (zoomTargetDistance - GLOBE_RADIUS) * 0.001)
      ? nextDistance : zoomTargetDistance);
    controls.update();
    applyingZoom = false;
  }
  lastCameraDistance = camera.position.distanceTo(controls.target);
  updateZoomButtons();
  updateMarkerSizes();
  updateCityLabels();
  streetMap.update(performance.now());
  renderer.render(scene, camera);
}

// --- Coordinate helpers ---------------------------------------------------
// These match the UV unwrap of THREE.SphereGeometry for a standard equirectangular
// texture (prime meridian at the texture's horizontal center), so surface clicks,
// the earth texture, and the country border overlay all agree on the same lat/lon.

/** Convert a point on the sphere surface to { lat, lon } in degrees. */
function pointToLatLon(point) {
  const normalized = point.clone().normalize();
  const lat = (Math.asin(THREE.MathUtils.clamp(normalized.y, -1, 1)) * 180) / Math.PI;
  const lon = (Math.atan2(-normalized.z, normalized.x) * 180) / Math.PI;
  return { lat, lon };
}

/** Convert latitude/longitude in degrees to a point on the sphere surface (inverse of pointToLatLon). */
function latLonToVector3(lat, lon, radius) {
  const latRad = (lat * Math.PI) / 180;
  const lonRad = (lon * Math.PI) / 180;
  return new THREE.Vector3(
    radius * Math.cos(latRad) * Math.cos(lonRad),
    radius * Math.sin(latRad),
    -radius * Math.cos(latRad) * Math.sin(lonRad)
  );
}

const CITY_TIERS = [
  // Major hubs remain visible from the default view.
  { maxDistance: Infinity, nameDistance: 5.2, cities: [
  ["Los Angeles", 34.05, -118.24], ["New York", 40.71, -74.01],
  ["Mexico City", 19.43, -99.13], ["São Paulo", -23.55, -46.63],
  ["Buenos Aires", -34.60, -58.38], ["London", 51.51, -0.13],
  ["Paris", 48.86, 2.35], ["Cairo", 30.04, 31.24],
  ["Lagos", 6.52, 3.38], ["Johannesburg", -26.20, 28.05],
  ["Dubai", 25.20, 55.27], ["Mumbai", 19.08, 72.88],
  ["Singapore", 1.35, 103.82], ["Beijing", 39.90, 116.40],
  ["Tokyo", 35.68, 139.69], ["Sydney", -33.87, 151.21],
  ] },
  // Regional cities emerge alongside the 15° coordinate grid.
  { maxDistance: 4.8, nameDistance: 4.8, cities: [
    ["Vancouver", 49.28, -123.12], ["Seattle", 47.61, -122.33],
    ["San Francisco", 37.77, -122.42], ["Chicago", 41.88, -87.63],
    ["Toronto", 43.65, -79.38], ["Miami", 25.76, -80.19],
    ["Bogotá", 4.71, -74.07], ["Lima", -12.05, -77.04],
    ["Santiago", -33.45, -70.67], ["Rio de Janeiro", -22.91, -43.17],
    ["Lisbon", 38.72, -9.14], ["Madrid", 40.42, -3.70],
    ["Rome", 41.90, 12.50], ["Berlin", 52.52, 13.41],
    ["Istanbul", 41.01, 28.98], ["Moscow", 55.76, 37.62],
    ["Nairobi", -1.29, 36.82], ["Addis Ababa", 9.03, 38.75],
    ["Cape Town", -33.92, 18.42], ["Casablanca", 33.57, -7.59],
    ["Riyadh", 24.71, 46.67], ["Karachi", 24.86, 67.01],
    ["Delhi", 28.61, 77.21], ["Bangkok", 13.76, 100.50],
    ["Hanoi", 21.03, 105.85], ["Jakarta", -6.21, 106.85],
    ["Hong Kong", 22.32, 114.17], ["Shanghai", 31.23, 121.47],
    ["Seoul", 37.57, 126.98], ["Osaka", 34.69, 135.50],
    ["Melbourne", -37.81, 144.96], ["Auckland", -36.85, 174.76],
  ] },
  // Nearby cities become useful only at the closest zoom levels.
  { maxDistance: 3.5, nameDistance: 3.5, cities: [
    ["Portland", 45.52, -122.68], ["Las Vegas", 36.17, -115.14],
    ["San Diego", 32.72, -117.16], ["Phoenix", 33.45, -112.07],
    ["Dallas", 32.78, -96.80], ["Houston", 29.76, -95.37],
    ["Boston", 42.36, -71.06], ["Washington, DC", 38.91, -77.04],
    ["Montréal", 45.50, -73.57], ["Medellín", 6.24, -75.58],
    ["Brasília", -15.79, -47.88], ["Porto Alegre", -30.03, -51.23],
    ["Manchester", 53.48, -2.24], ["Amsterdam", 52.37, 4.90],
    ["Brussels", 50.85, 4.35], ["Munich", 48.14, 11.58],
    ["Milan", 45.46, 9.19], ["Athens", 37.98, 23.73],
    ["Alexandria", 31.20, 29.92], ["Accra", 5.60, -0.19],
    ["Abu Dhabi", 24.45, 54.38], ["Bengaluru", 12.97, 77.59],
    ["Chennai", 13.08, 80.27], ["Kolkata", 22.57, 88.36],
    ["Ho Chi Minh City", 10.82, 106.63], ["Kuala Lumpur", 3.14, 101.69],
    ["Taipei", 25.03, 121.56], ["Guangzhou", 23.13, 113.26],
    ["Kyoto", 35.01, 135.77], ["Canberra", -35.28, 149.13],
  ] },
  // Additional nearby cities appear only when zoomed in closely.
  { maxDistance: 2.9, nameDistance: 2.65, cities: [
    ["Sacramento", 38.58, -121.49], ["San Jose", 37.34, -121.89],
    ["Oakland", 37.80, -122.27], ["Boise", 43.62, -116.20],
    ["Salt Lake City", 40.76, -111.89], ["Denver", 39.74, -104.99],
    ["Albuquerque", 35.08, -106.65], ["Oklahoma City", 35.47, -97.52],
    ["Kansas City", 39.10, -94.58], ["St. Louis", 38.63, -90.20],
    ["Nashville", 36.16, -86.78], ["Atlanta", 33.75, -84.39],
    ["Charlotte", 35.23, -80.84], ["Philadelphia", 39.95, -75.16],
    ["Pittsburgh", 40.44, -80.00], ["Detroit", 42.33, -83.05],
    ["Cleveland", 41.50, -81.69], ["Ottawa", 45.42, -75.70],
    ["Québec City", 46.81, -71.21], ["San José", 9.93, -84.08],
    ["Quito", -0.18, -78.47], ["La Paz", -16.49, -68.12],
    ["Montevideo", -34.90, -56.19], ["Cordoba", -31.42, -64.19],
    ["Edinburgh", 55.95, -3.19], ["Copenhagen", 55.68, 12.57],
    ["Stockholm", 59.33, 18.07], ["Oslo", 59.91, 10.75],
    ["Warsaw", 52.23, 21.01], ["Prague", 50.08, 14.44],
    ["Vienna", 48.21, 16.37], ["Zurich", 47.38, 8.54],
    ["Budapest", 47.50, 19.04], ["Bucharest", 44.43, 26.10],
    ["Beirut", 33.89, 35.50], ["Amman", 31.95, 35.93],
    ["Tehran", 35.69, 51.39], ["Lahore", 31.52, 74.36],
    ["Hyderabad", 17.39, 78.49], ["Pune", 18.52, 73.86],
    ["Dhaka", 23.81, 90.41], ["Colombo", 6.93, 79.86],
    ["Phnom Penh", 11.56, 104.93], ["Manila", 14.60, 120.98],
    ["Hiroshima", 34.39, 132.46], ["Sapporo", 43.06, 141.35],
    ["Brisbane", -27.47, 153.03], ["Perth", -31.95, 115.86],
  ] },
  // Smaller regional hubs appear as users zoom closer.
  { maxDistance: 4.1, nameDistance: 3.8, cities: [
    ["Eugene", 44.05, -123.09], ["Reno", 39.53, -119.81],
    ["Fresno", 36.74, -119.79], ["Tucson", 32.22, -110.97],
    ["El Paso", 31.76, -106.49], ["San Antonio", 29.42, -98.49],
    ["Austin", 30.27, -97.74], ["Fort Worth", 32.76, -97.33],
    ["Memphis", 35.15, -90.05], ["New Orleans", 29.95, -90.07],
    ["Richmond", 37.54, -77.44], ["Baltimore", 39.29, -76.61],
    ["Buffalo", 42.89, -78.88], ["Halifax", 44.65, -63.57],
    ["Winnipeg", 49.90, -97.14], ["Calgary", 51.05, -114.07],
    ["Edmonton", 53.55, -113.49], ["Guadalajara", 20.66, -103.35],
    ["Monterrey", 25.69, -100.32], ["Havana", 23.11, -82.37],
    ["Kingston", 17.97, -76.79], ["Panama City", 8.98, -79.52],
    ["Guatemala City", 14.63, -90.51], ["Belize City", 17.50, -88.20],
    ["San Salvador", 13.69, -89.19], ["Tegucigalpa", 14.07, -87.19],
    ["Managua", 12.11, -86.24], ["San Pedro Sula", 15.50, -88.03],
    ["Liberia", 10.63, -85.44], ["San Miguel", 13.48, -88.18],
    ["Mérida", 20.97, -89.62], ["Campeche", 19.83, -90.53],
    ["Chetumal", 18.50, -88.30], ["Oaxaca", 17.07, -96.73],
    ["Tuxtla Gutiérrez", 16.75, -93.12], ["Veracruz", 19.17, -96.13],
    ["Santiago de Cuba", 20.02, -75.83], ["Port-au-Prince", 18.54, -72.34],
    ["Santo Domingo", 18.49, -69.93], ["Nassau", 25.04, -77.35],
    ["Cayenne", 4.93, -52.33], ["Paramaribo", 5.85, -55.17],
    ["Georgetown", 6.80, -58.16], ["Belém", -1.46, -48.50],
    ["Manaus", -3.12, -60.02], ["Fortaleza", -3.73, -38.52],
    ["Guayaquil", -2.17, -79.92], ["Arequipa", -16.41, -71.54],
    ["Rosario", -32.95, -60.66], ["Mendoza", -32.89, -68.85],
    ["Salvador", -12.98, -38.50], ["Recife", -8.05, -34.88],
    ["Curitiba", -25.43, -49.27], ["Belo Horizonte", -19.92, -43.94],
    ["Birmingham", 52.49, -1.90], ["Glasgow", 55.86, -4.25],
    ["Lyon", 45.76, 4.84], ["Marseille", 43.30, 5.37],
    ["Hamburg", 53.55, 9.99], ["Frankfurt", 50.11, 8.68],
    ["Barcelona", 41.39, 2.17], ["Valencia", 39.47, -0.38],
    ["Naples", 40.85, 14.27], ["Turin", 45.07, 7.69],
    ["Belgrade", 44.79, 20.45], ["Sofia", 42.70, 23.32],
    ["Kyiv", 50.45, 30.52], ["Tbilisi", 41.72, 44.79],
    ["Baku", 40.41, 49.87], ["Muscat", 23.59, 58.41],
    ["Jeddah", 21.49, 39.19], ["Kabul", 34.56, 69.21],
    ["Jaipur", 26.91, 75.79], ["Ahmedabad", 23.02, 72.57],
    ["Chittagong", 22.36, 91.80], ["Kathmandu", 27.72, 85.32],
    ["Yangon", 16.87, 96.20], ["Da Nang", 16.05, 108.20],
    ["Surabaya", -7.25, 112.75], ["Bandung", -6.92, 107.62],
    ["Cebu City", 10.32, 123.89], ["Fukuoka", 33.59, 130.40],
    ["Nagoya", 35.18, 136.91], ["Sendai", 38.27, 140.87],
    ["Adelaide", -34.93, 138.60], ["Wellington", -41.29, 174.78],
    ["Darwin", -12.46, 130.84], ["Christchurch", -43.53, 172.63],
    ["Dakar", 14.72, -17.47], ["Abidjan", 5.36, -4.01],
    ["Kampala", 0.35, 32.58], ["Kigali", -1.94, 29.87],
    ["Dar es Salaam", -6.79, 39.21], ["Maputo", -25.97, 32.58],
    ["Lusaka", -15.39, 28.32], ["Harare", -17.83, 31.05],
    ["Durban", -29.86, 31.02], ["Tunis", 36.81, 10.18],
    ["Algiers", 36.75, 3.06], ["Tripoli", 32.89, 13.19],
  ] },
  { maxDistance: 3.1, nameDistance: 2.9, cities: [
    ["Santa Barbara", 34.42, -119.70], ["Santa Cruz", 36.97, -122.03],
    ["Monterey", 36.60, -121.89], ["Santa Rosa", 38.44, -122.71],
    ["Bakersfield", 35.37, -119.02], ["Flagstaff", 35.20, -111.65],
    ["Santa Fe", 35.69, -105.94], ["Boulder", 40.02, -105.27],
    ["Colorado Springs", 38.83, -104.82], ["Spokane", 47.66, -117.43],
    ["Tacoma", 47.25, -122.44], ["Bellingham", 48.75, -122.48],
    ["Victoria", 48.43, -123.37], ["Kelowna", 49.89, -119.50],
    ["Kamloops", 50.67, -120.33], ["Saskatoon", 52.13, -106.67],
    ["Regina", 50.45, -104.62], ["Charlottetown", 46.24, -63.13],
    ["Charleston", 32.78, -79.93], ["Savannah", 32.08, -81.09],
    ["Asheville", 35.60, -82.55], ["Raleigh", 35.78, -78.64],
    ["Durham", 35.99, -78.90], ["Burlington", 44.48, -73.21],
    ["Providence", 41.82, -71.41], ["Albany", 42.65, -73.75],
    ["Antigua Guatemala", 14.56, -90.73], ["Quetzaltenango", 14.83, -91.52],
    ["Granada", 11.93, -85.96], ["Cartago", 9.86, -83.92],
    ["David", 8.43, -82.43], ["Cartagena", 10.39, -75.48],
    ["Santa Marta", 11.24, -74.21], ["Cusco", -13.53, -71.97],
    ["Cuenca", -2.90, -79.00], ["Valparaíso", -33.05, -71.62],
    ["Bath", 51.38, -2.36], ["Oxford", 51.75, -1.26],
    ["Cambridge", 52.21, 0.12], ["York", 53.96, -1.08],
    ["Inverness", 57.48, -4.22], ["Galway", 53.27, -9.05],
    ["Cork", 51.90, -8.47], ["Bergen", 60.39, 5.32],
    ["Uppsala", 59.86, 17.64], ["Aarhus", 56.16, 10.20],
    ["Bruges", 51.21, 3.22], ["Ghent", 51.05, 3.72],
    ["Heidelberg", 49.40, 8.67], ["Freiburg", 48.00, 7.85],
    ["Salzburg", 47.80, 13.04], ["Innsbruck", 47.27, 11.40],
    ["Lucerne", 47.05, 8.31], ["Lausanne", 46.52, 6.63],
    ["Verona", 45.44, 10.99], ["Siena", 43.32, 11.33],
    ["Coimbra", 40.21, -8.43], ["Granada, Spain", 37.18, -3.60],
    ["Marrakesh", 31.63, -8.00], ["Fes", 34.03, -5.00],
    ["Mombasa", -4.04, 39.67], ["Arusha", -3.37, 36.68],
    ["Kumasi", 6.69, -1.62], ["Ibadan", 7.38, 3.95],
    ["Enugu", 6.46, 7.55], ["Benin City", 6.34, 5.62],
    ["Udaipur", 24.59, 73.71], ["Jodhpur", 26.24, 73.02],
    ["Mysuru", 12.30, 76.64], ["Kochi", 9.93, 76.27],
    ["Kandy", 7.29, 80.64], ["Galle", 6.03, 80.22],
    ["Chiang Mai", 18.79, 98.99], ["Luang Prabang", 19.89, 102.14],
    ["Siem Reap", 13.36, 103.86], ["Hoi An", 15.88, 108.33],
    ["Hue", 16.46, 107.59], ["Yogyakarta", -7.80, 110.37],
    ["Nara", 34.69, 135.80], ["Kanazawa", 36.56, 136.66],
    ["Matsumoto", 36.24, 137.97], ["Hakodate", 41.77, 140.73],
    ["Dunedin", -45.87, 170.50], ["Queenstown", -45.03, 168.66],
    ["Nelson", -41.27, 173.28], ["Cairns", -16.92, 145.77],
    ["Hobart", -42.88, 147.33], ["Alice Springs", -23.70, 133.88],
  ] },
  { maxDistance: 2.55, nameDistance: 2.4, cities: [
    ["Ojai", 34.45, -119.24], ["Solvang", 34.60, -120.14],
    ["Carmel-by-the-Sea", 36.56, -121.92], ["Half Moon Bay", 37.46, -122.43],
    ["Sausalito", 37.86, -122.49], ["Sonoma", 38.29, -122.46],
    ["Healdsburg", 38.61, -122.87], ["Mendocino", 39.31, -123.80],
    ["Truckee", 39.33, -120.18], ["South Lake Tahoe", 38.94, -119.98],
    ["Sedona", 34.87, -111.76], ["Taos", 36.41, -105.57],
    ["Moab", 38.57, -109.55], ["Telluride", 37.94, -107.81],
    ["Estes Park", 40.38, -105.52], ["Leavenworth", 47.60, -120.66],
    ["Friday Harbor", 48.53, -123.02], ["Tofino", 49.15, -125.91],
    ["Whistler", 50.12, -122.96], ["Banff", 51.18, -115.57],
    ["Jasper", 52.87, -118.08], ["Niagara-on-the-Lake", 43.25, -79.07],
    ["Stowe", 44.47, -72.69], ["Bar Harbor", 44.39, -68.20],
    ["Woodstock, Vermont", 43.62, -72.52], ["Beaufort", 32.43, -80.67],
    ["Flores", 16.93, -89.89], ["Copán Ruinas", 14.84, -89.16],
    ["Suchitoto", 13.94, -89.03], ["León, Nicaragua", 12.44, -86.88],
    ["La Fortuna", 10.47, -84.65], ["Monteverde", 10.30, -84.82],
    ["Boquete", 8.78, -82.43], ["Bocas del Toro", 9.34, -82.24],
    ["Villa de Leyva", 5.63, -73.52], ["Salento", 4.64, -75.57],
    ["Ollantaytambo", -13.26, -72.26], ["Pisac", -13.42, -71.85],
    ["San Pedro de Atacama", -22.91, -68.20], ["Pucón", -39.28, -71.98],
    ["St Ives", 50.21, -5.48], ["Whitby", 54.49, -0.61],
    ["Ambleside", 54.43, -2.96], ["Fort William", 56.82, -5.11],
    ["Dingle", 52.14, -10.27], ["Kinsale", 51.71, -8.53],
    ["Hallstatt", 47.56, 13.65], ["Rothenburg ob der Tauber", 49.38, 10.18],
    ["Zermatt", 46.02, 7.75], ["Grindelwald", 46.62, 8.04],
    ["Lauterbrunnen", 46.59, 7.91], ["Chamonix", 45.92, 6.87],
    ["Annecy", 45.90, 6.13], ["Colmar", 48.08, 7.36],
    ["San Gimignano", 43.47, 11.04], ["Assisi", 43.07, 12.62],
    ["Ronda", 36.74, -5.17], ["Sintra", 38.80, -9.38],
    ["Chefchaouen", 35.17, -5.27], ["Essaouira", 31.51, -9.77],
    ["Naivasha", -0.72, 36.43], ["Moshi", -3.34, 37.34],
    ["Stellenbosch", -33.93, 18.86], ["Franschhoek", -33.91, 19.12],
    ["Pushkar", 26.49, 74.55], ["Darjeeling", 27.04, 88.26],
    ["Munnar", 10.09, 77.06], ["Ella", 6.87, 81.05],
    ["Pai", 19.36, 98.44], ["Vang Vieng", 18.93, 102.45],
    ["Ubud", -8.51, 115.26], ["Takayama", 36.15, 137.25],
    ["Nikko", 36.75, 139.60], ["Kamakura", 35.32, 139.55],
    ["Wanaka", -44.70, 169.14], ["Te Anau", -45.42, 167.72],
    ["Kaikoura", -42.40, 173.68], ["Port Douglas", -16.48, 145.46],
    ["Byron Bay", -28.65, 153.61], ["Margaret River", -33.95, 115.07],
  ] },
  { maxDistance: 2.3, nameDistance: 2.2, cities: [
    ["Ventura", 34.28, -119.29], ["Carpinteria", 34.40, -119.52],
    ["Goleta", 34.44, -119.83], ["Pismo Beach", 35.14, -120.64],
    ["Morro Bay", 35.37, -120.85], ["Cambria", 35.56, -121.08],
    ["Paso Robles", 35.63, -120.69], ["San Luis Obispo", 35.28, -120.66],
    ["Pacific Grove", 36.62, -121.92], ["Salinas", 36.68, -121.66],
    ["Watsonville", 36.91, -121.76], ["Capitola", 36.98, -121.95],
    ["Pescadero", 37.26, -122.38], ["Pacifica", 37.61, -122.49],
    ["Mill Valley", 37.91, -122.55], ["San Rafael", 37.97, -122.53],
    ["Petaluma", 38.23, -122.64], ["Napa", 38.30, -122.29],
    ["Calistoga", 38.58, -122.58], ["Sebastopol", 38.40, -122.82],
    ["Grass Valley", 39.22, -121.06], ["Nevada City", 39.26, -121.02],
    ["Auburn", 38.90, -121.08], ["Placerville", 38.73, -120.80],
    ["Bishop", 37.36, -118.40], ["Lone Pine", 36.61, -118.06],
    ["Durango", 37.28, -107.88], ["Ouray", 38.02, -107.67],
    ["Silverton", 37.81, -107.66], ["Salida", 38.53, -106.00],
    ["Port Townsend", 48.12, -122.76], ["Sequim", 48.08, -123.10],
    ["Langley", 48.04, -122.41], ["Coupeville", 48.22, -122.69],
    ["Sidney", 48.65, -123.40], ["Parksville", 49.32, -124.31],
    ["Ucluelet", 48.94, -125.55], ["Fernie", 49.50, -115.06],
    ["Revelstoke", 51.00, -118.20], ["Canmore", 51.09, -115.35],
    ["Antigonish", 45.62, -62.00], ["Lunenburg", 44.38, -64.32],
    ["Mahone Bay", 44.45, -64.38], ["Wolfville", 45.09, -64.37],
    ["San Juan del Sur", 11.25, -85.87], ["San Juan La Laguna", 14.69, -91.29],
    ["Panajachel", 14.74, -91.16], ["Ataco", 13.87, -89.85],
    ["Juayúa", 13.84, -89.75], ["Santa Elena, Costa Rica", 10.32, -84.83],
    ["Tamarindo", 10.30, -85.84], ["Puerto Viejo", 9.66, -82.75],
    ["El Valle de Antón", 8.60, -80.13], ["Santa Fe, Panama", 8.51, -81.08],
    ["Guatapé", 6.23, -75.16], ["Jardín", 5.60, -75.82],
    ["Barichara", 6.64, -73.22], ["Mompox", 9.24, -74.43],
    ["Chinchero", -13.39, -72.05], ["Urubamba", -13.30, -72.12],
    ["Keswick", 54.60, -3.14], ["Grasmere", 54.46, -3.02],
    ["Hawkshead", 54.37, -3.00], ["Bakewell", 53.21, -1.67],
    ["Bourton-on-the-Water", 51.89, -1.76], ["Stow-on-the-Wold", 51.93, -1.72],
    ["Broadway, England", 52.04, -1.86], ["Chipping Campden", 52.05, -1.78],
    ["Pitlochry", 56.70, -3.73], ["Dunkeld", 56.56, -3.58],
    ["Portree", 57.41, -6.19], ["Oban", 56.42, -5.47],
    ["Kenmare", 51.88, -9.58], ["Westport", 53.80, -9.52],
    ["Clifden", 53.49, -10.02], ["Adare", 52.56, -8.79],
    ["Bacharach", 50.06, 7.77], ["Cochem", 50.15, 7.17],
    ["Dinkelsbühl", 49.07, 10.32], ["Mittenwald", 47.44, 11.26],
    ["Alpbach", 47.40, 11.94], ["St Wolfgang", 47.74, 13.45],
    ["Wengen", 46.61, 7.92], ["Mürren", 46.56, 7.89],
    ["Bergün", 46.63, 9.75], ["Guarda", 46.78, 10.15],
    ["Eguisheim", 48.04, 7.31], ["Riquewihr", 48.17, 7.30],
    ["Gordes", 43.91, 5.20], ["Roussillon", 43.90, 5.29],
    ["Pienza", 43.08, 11.68], ["Montepulciano", 43.09, 11.78],
    ["Volterra", 43.40, 10.86], ["Orvieto", 42.72, 12.11],
    ["Nerja", 36.75, -3.88], ["Frigiliana", 36.79, -3.90],
    ["Óbidos", 39.36, -9.16], ["Monsaraz", 38.44, -7.38],
    ["Ifrane", 33.53, -5.11], ["Aït Benhaddou", 31.05, -7.13],
    ["Dullstroom", -25.42, 30.10], ["Clarens", -28.52, 28.42],
    ["Hermanus", -34.42, 19.23], ["Swellendam", -34.02, 20.44],
    ["Bundi", 25.44, 75.64], ["Orchha", 25.35, 78.64],
    ["Kalimpong", 27.06, 88.47], ["Kurseong", 26.88, 88.28],
    ["Haputale", 6.77, 80.96], ["Nuwara Eliya", 6.97, 80.77],
    ["Mae Hong Son", 19.30, 97.97], ["Chiang Dao", 19.37, 98.96],
    ["Nong Khiaw", 20.57, 102.62], ["Muang Ngoi", 20.71, 102.68],
    ["Sidemen", -8.47, 115.45], ["Munduk", -8.26, 115.06],
    ["Tsumago", 35.58, 137.60], ["Magome", 35.53, 137.57],
    ["Shirakawa-go", 36.26, 136.91], ["Gujo Hachiman", 35.75, 136.96],
    ["Arrowtown", -44.94, 168.84], ["Cromwell", -45.04, 169.20],
    ["Akaroa", -43.81, 172.97], ["Hanmer Springs", -42.52, 172.83],
    ["Hahndorf", -35.03, 138.81], ["Maleny", -26.76, 152.85],
    ["Montville", -26.69, 152.89], ["Yungaburra", -17.27, 145.58],
  ] },
];

const cityLabels = CITY_TIERS.flatMap(({ maxDistance, nameDistance, cities }) => cities.map(([name, lat, lon]) => {
  const element = document.createElement("span");
  element.className = "city-label";
  const nameElement = document.createElement("span");
  nameElement.className = "city-name";
  nameElement.textContent = name;
  element.appendChild(nameElement);
  mapLabels.appendChild(element);
  return { position: latLonToVector3(lat, lon, GLOBE_RADIUS * 1.012), element,
    maxDistance, nameDistance, nameWidth: name.length * 6.5 + 14 };
}));

const projectedCity = new THREE.Vector3();

function updateCityLabels() {
  mapLabels.hidden = !citiesLayer.checked;
  if (!citiesLayer.checked) return;
  const width = renderer.domElement.clientWidth;
  const height = renderer.domElement.clientHeight;
  const distance = camera.position.distanceTo(controls.target);
  // Reserve the corners for fullscreen and zoom buttons, then prioritize
  // major city names when labels are close together.
  const occupied = [
    { left: 0, right: 56, top: 0, bottom: 136 },
    { left: width - 56, right: width, top: 0, bottom: 52 },
  ];
  for (const { position, element, maxDistance, nameDistance, nameWidth } of cityLabels) {
    if (distance > maxDistance) {
      element.hidden = true;
      continue;
    }
    // Hide points behind the sphere, including those close to its horizon.
    if (position.dot(camera.position) <= position.lengthSq()) {
      element.hidden = true;
      continue;
    }
    projectedCity.copy(position).project(camera);
    element.hidden = Math.abs(projectedCity.x) > 1 || Math.abs(projectedCity.y) > 1;
    if (element.hidden) continue;
    const x = (projectedCity.x + 1) * width / 2;
    const y = (1 - projectedCity.y) * height / 2;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
    const label = { left: x - 3, right: x + nameWidth, top: y - 9, bottom: y + 9 };
    const showName = distance < nameDistance && label.left >= 0 && label.right < width &&
      label.top >= 0 && label.bottom < height &&
      !occupied.some((other) => label.left < other.right && label.right > other.left &&
        label.top < other.bottom && label.bottom > other.top);
    element.classList.toggle("show-name", showName);
    if (showName) occupied.push(label);
  }
}

citiesLayer.addEventListener("change", updateCityLabels);
animate();

function formatCoordinate(lat, lon) {
  const latDir = lat >= 0 ? "N" : "S";
  const lonDir = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}\u00B0${latDir}, ${Math.abs(lon).toFixed(2)}\u00B0${lonDir}`;
}

function hemisphereLabel(lat, lon) {
  const ns = lat >= 0 ? "Northern" : "Southern";
  const ew = lon >= 0 ? "Eastern" : "Western";
  return `${ns} / ${ew}`;
}

/** Great-circle distance in km between two points on the sphere surface. */
function surfaceDistanceKm(pointA, pointB) {
  const angle = pointA.clone().normalize().angleTo(pointB.clone().normalize());
  return angle * EARTH_RADIUS_KM;
}

function makeMarker(color) {
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(MARKER_RADIUS, 16, 16),
    new THREE.MeshBasicMaterial({ color })
  );
  scene.add(marker);
  return marker;
}

/** Build a great-circle arc line between two surface points, raised slightly above the globe. */
function buildArcLine(pointA, pointB) {
  const raised = 1.01;
  const start = pointA.clone().normalize().multiplyScalar(GLOBE_RADIUS * raised);
  const end = pointB.clone().normalize().multiplyScalar(GLOBE_RADIUS * raised);
  const angle = start.angleTo(end);
  const segments = Math.max(64, Math.ceil(angle / 0.01));
  const positions = [];
  const sinAngle = Math.sin(angle);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const slerped = new THREE.Vector3();
    if (angle > 0.0001) {
      // Spherical interpolation so the line follows the great-circle path
      const a = Math.sin((1 - t) * angle) / sinAngle;
      const b = Math.sin(t * angle) / sinAngle;
      slerped.copy(start).multiplyScalar(a).add(end.clone().multiplyScalar(b));
    } else {
      slerped.copy(start);
    }
    positions.push(slerped.x, slerped.y, slerped.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color: 0xffd166, linewidth: 2 });
  return new THREE.Line(geometry, material);
}

// --- Interaction ------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const earthSurface = new THREE.Sphere(new THREE.Vector3(), GLOBE_RADIUS);
const pointerNdc = new THREE.Vector2();
let pointerDownPos = null;
let pendingSelection = null;

function onPointerDown(event) {
  if (event.button !== 0) return;
  pointerDownPos = { x: event.clientX, y: event.clientY, id: event.pointerId };
}

function onPointerUp(event) {
  if (!pointerDownPos || event.pointerId !== pointerDownPos.id) return;
  const dx = event.clientX - pointerDownPos.x;
  const dy = event.clientY - pointerDownPos.y;
  pointerDownPos = null;
  // Ignore clicks that were actually drags used to rotate the globe
  if (Math.hypot(dx, dy) > 4) return;

  // Wait for the browser's dblclick event before selecting a point, so a
  // double-click zoom doesn't also drop an inspect/measurement marker.
  const { clientX, clientY } = event;
  clearTimeout(pendingSelection);
  pendingSelection = setTimeout(() => {
    pendingSelection = null;
    selectPoint(clientX, clientY);
  }, 300);
}

function selectPoint(clientX, clientY) {
  const point = pointAt(clientX, clientY);
  if (!point) return;

  if (mode === "inspect") {
    handleInspectClick(point);
  } else {
    handleMeasureClick(point);
  }
}

function pointAt(clientX, clientY) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointerNdc, camera);
  return raycaster.ray.intersectSphere(earthSurface, new THREE.Vector3());
}

renderer.domElement.addEventListener("pointerdown", onPointerDown);
renderer.domElement.addEventListener("pointerup", onPointerUp);
renderer.domElement.addEventListener("pointercancel", () => { pointerDownPos = null; });
renderer.domElement.addEventListener("dblclick", (event) => {
  event.preventDefault();
  clearTimeout(pendingSelection);
  pendingSelection = null;
  const point = pointAt(event.clientX, event.clientY);
  if (point) zoomToPoint(1 / ZOOM_STEP, point);
  else zoomBy(1 / ZOOM_STEP);
});

function handleInspectClick(point) {
  const { lat, lon } = pointToLatLon(point);

  if (!inspectMarker) {
    inspectMarker = makeMarker(0x4da3ff);
  }
  inspectMarker.position.copy(point.clone().normalize().multiplyScalar(GLOBE_RADIUS * 1.01));
  inspectMarker.visible = true;

  inspectEmpty.classList.add("hidden");
  inspectDetails.classList.remove("hidden");
  detailLat.textContent = `${lat.toFixed(3)}\u00B0`;
  detailLon.textContent = `${lon.toFixed(3)}\u00B0`;
  detailHemisphere.textContent = hemisphereLabel(lat, lon);

  const countryName = findCountryName(lat, lon);
  if (countryName) {
    const flag = countryCodeToFlagEmoji(COUNTRY_ISO_CODES[countryName]);
    detailCountry.textContent = flag ? `${flag} ${countryName}` : countryName;
    const title = encodeURIComponent(countryName.replace(/ /g, "_"));
    wikipediaLink.href = `https://en.wikipedia.org/wiki/${title}`;
    wikipediaLink.textContent = `View "${countryName}" on Wikipedia \u2197`;
    wikipediaLink.classList.remove("hidden");
  } else {
    detailCountry.textContent = "Ocean / unclaimed";
    wikipediaLink.classList.add("hidden");
  }
}

function handleMeasureClick(point) {
  if (measurePoints.length >= 2) {
    clearMeasurement();
  }

  const { lat, lon } = pointToLatLon(point);
  const marker = makeMarker(measurePoints.length === 0 ? 0x06d6a0 : 0xffd166);
  marker.position.copy(point.clone().normalize().multiplyScalar(GLOBE_RADIUS * 1.01));
  measureMarkers.push(marker);
  measurePoints.push({ vector: point.clone(), lat, lon });

  if (measurePoints.length === 1) {
    pointAEl.textContent = formatCoordinate(lat, lon);
    pointBEl.textContent = "\u2014";
    distanceValueEl.textContent = "\u2014";
  } else {
    pointBEl.textContent = formatCoordinate(lat, lon);
    const km = surfaceDistanceKm(measurePoints[0].vector, measurePoints[1].vector);
    const miles = km * 0.621371;
    distanceValueEl.textContent = `${km.toFixed(1)} km (${miles.toFixed(1)} mi)`;

    if (measureLine) scene.remove(measureLine);
    measureLine = buildArcLine(measurePoints[0].vector, measurePoints[1].vector);
    scene.add(measureLine);
  }
}

function clearMeasurement() {
  measurePoints = [];
  measureMarkers.forEach((marker) => scene.remove(marker));
  measureMarkers.length = 0;
  if (measureLine) {
    scene.remove(measureLine);
    measureLine = null;
  }
  pointAEl.textContent = "\u2014";
  pointBEl.textContent = "\u2014";
  distanceValueEl.textContent = "\u2014";
}

resetMeasureBtn.addEventListener("click", clearMeasurement);

function setMode(nextMode) {
  mode = nextMode;
  const isInspect = mode === "inspect";
  inspectModeBtn.classList.toggle("active", isInspect);
  measureModeBtn.classList.toggle("active", !isInspect);
  inspectPanel.classList.toggle("hidden", !isInspect);
  measurePanel.classList.toggle("hidden", isInspect);
}

inspectModeBtn.addEventListener("click", () => setMode("inspect"));
measureModeBtn.addEventListener("click", () => setMode("measure"));

setupLocationSearch(({ lat, lon, bounds }) => {
  clearTimeout(pendingSelection);
  pendingSelection = null;
  setMode("inspect");
  const point = latLonToVector3(lat, lon, GLOBE_RADIUS);
  handleInspectClick(point);
  const latSpan = bounds ? bounds.north - bounds.south : 0;
  const lonSpan = bounds ? (bounds.east - bounds.west) * Math.cos(THREE.MathUtils.degToRad(lat)) : 0;
  const halfSpan = THREE.MathUtils.degToRad(Math.max(latSpan, lonSpan) / 2);
  const halfFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * Math.min(1, camera.aspect));
  const altitude = Math.max(0.003, GLOBE_RADIUS * halfSpan / Math.tan(halfFov) * 1.3);
  zoomFocusDirection = point.normalize();
  zoomTargetDistance = THREE.MathUtils.clamp(GLOBE_RADIUS + altitude, controls.minDistance, controls.maxDistance);
  updateZoomButtons();
});
