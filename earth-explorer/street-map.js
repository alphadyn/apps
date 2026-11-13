import * as THREE from "three";

const MAX_LATITUDE = 85.05112878;
const TILE_LIMIT = 64;
const TILE_SIZE = 512;
const TILE_URL = "https://a.basemaps.cartocdn.com/light_all";
const CARTO_KEY = "cb1_2w0f_1_82cba88eb21776b6335fa821";

export function tileCoordinates(lat, lon, zoom) {
  const count = 2 ** zoom;
  const latitude = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(lat, -MAX_LATITUDE, MAX_LATITUDE));
  return {
    x: (lon + 180) / 360 * count,
    y: (1 - Math.asinh(Math.tan(latitude)) / Math.PI) / 2 * count,
  };
}

export function tilePoint(x, y, zoom, radius) {
  const count = 2 ** zoom;
  const lon = x / count * 2 * Math.PI - Math.PI;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / count)));
  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * Math.cos(lat) * Math.sin(lon)
  );
}

function tileGeometry(x, y, zoom, radius) {
  const segments = Math.max(2, Math.ceil(64 / 2 ** zoom));
  const positions = [];
  const uvs = [];
  const indices = [];
  for (let row = 0; row <= segments; row++) {
    for (let col = 0; col <= segments; col++) {
      const point = tilePoint(x + col / segments, y + row / segments, zoom, radius);
      positions.push(point.x, point.y, point.z);
      uvs.push(col / segments, 1 - row / segments);
      if (row < segments && col < segments) {
        const a = row * (segments + 1) + col;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

export function createStreetMap(scene, camera, renderer, radius, status) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);
  const loader = new THREE.TextureLoader();
  const sphere = new THREE.Sphere(new THREE.Vector3(), radius);
  const raycaster = new THREE.Raycaster();
  const point = new THREE.Vector3();
  const cache = new Map();
  let enabled = false;
  let busy = false;
  let requestedKey = "";
  let completedKey = "";
  let pendingTiles = [];
  let polar = false;
  let lastCheck = 0;

  function visibleTiles() {
    const samples = [];
    const centerLon = THREE.MathUtils.radToDeg(Math.atan2(-camera.position.z, camera.position.x));
    for (let row = 0; row <= 12; row++) {
      for (let col = 0; col <= 12; col++) {
        raycaster.setFromCamera(new THREE.Vector2(col / 6 - 1, row / 6 - 1), camera);
        if (!raycaster.ray.intersectSphere(sphere, point)) continue;
        const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(point.y / radius, -1, 1)));
        let lon = THREE.MathUtils.radToDeg(Math.atan2(-point.z, point.x));
        lon = centerLon + THREE.MathUtils.euclideanModulo(lon - centerLon + 180, 360) - 180;
        samples.push({ lat, lon });
      }
    }
    polar = samples.some(({ lat }) => Math.abs(lat) > MAX_LATITUDE);
    const supported = samples.filter(({ lat }) => Math.abs(lat) <= MAX_LATITUDE);
    if (!supported.length) return [];
    const altitude = Math.max(camera.position.length() - radius, 0.00001);
    const latitudeScale = Math.max(0.08, Math.hypot(camera.position.x, camera.position.z) / camera.position.length());
    const pixels = renderer.domElement.clientHeight * renderer.getPixelRatio();
    const viewWidth = 2 * altitude * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    let zoom = THREE.MathUtils.clamp(Math.ceil(Math.log2(2 * Math.PI * radius * latitudeScale * pixels / (TILE_SIZE * viewWidth))), 0, 19);
    while (zoom >= 0) {
      const coords = supported.map(({ lat, lon }) => tileCoordinates(lat, lon, zoom));
      const count = 2 ** zoom;
      const minX = Math.floor(Math.min(...coords.map(({ x }) => x))) - 1;
      const maxX = Math.floor(Math.max(...coords.map(({ x }) => x))) + 1;
      const minY = Math.max(0, Math.floor(Math.min(...coords.map(({ y }) => y))) - 1);
      const maxY = Math.min(count - 1, Math.floor(Math.max(...coords.map(({ y }) => y))) + 1);
      const width = Math.min(count, maxX - minX + 1);
      if (width * (maxY - minY + 1) <= TILE_LIMIT) {
        const tiles = [];
        for (let y = minY; y <= maxY; y++) {
          for (let offset = 0; offset < width; offset++) {
            const x = THREE.MathUtils.euclideanModulo(minX + offset, count);
            tiles.push({ x, y, zoom, key: `${zoom}/${x}/${y}` });
          }
        }
        return tiles;
      }
      zoom--;
    }
    return [];
  }

  function disposeTile(mesh) {
    group.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.map.dispose();
    mesh.material.dispose();
  }

  async function loadTiles() {
    if (busy || !enabled || completedKey === requestedKey) return;
    busy = true;
    const key = requestedKey;
    const tiles = pendingTiles;
    let cursor = 0;
    let failed = false;
    status.textContent = "Loading street tiles on the globe...";
    async function worker() {
      while (cursor < tiles.length && enabled && requestedKey === key) {
        const tile = tiles[cursor++];
        if (cache.has(tile.key)) continue;
        try {
          const texture = await loader.loadAsync(`${TILE_URL}/${tile.key}@2x.png?key=${CARTO_KEY}`);
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          const mesh = new THREE.Mesh(
            tileGeometry(tile.x, tile.y, tile.zoom, radius + 0.000001),
            // Tile triangles and the imagery sphere have different tessellations.
            // Draw the outward-facing map after imagery without competing depths.
            new THREE.MeshBasicMaterial({ map: texture, depthTest: false, depthWrite: false })
          );
          mesh.renderOrder = -1;
          mesh.visible = false;
          cache.set(tile.key, mesh);
          group.add(mesh);
        } catch (error) {
          failed = true;
          console.error(`Street map tile ${tile.key} could not load`, error);
        }
      }
    }
    await Promise.all(Array.from({ length: 6 }, worker));
    if (enabled && requestedKey === key) {
      const wanted = new Set(tiles.map((tile) => tile.key));
      const complete = tiles.every((tile) => cache.has(tile.key));
      for (const [tileKey, mesh] of cache) {
        if (wanted.has(tileKey)) mesh.visible = true;
        else if (complete || !mesh.visible) {
          disposeTile(mesh);
          cache.delete(tileKey);
        }
      }
      completedKey = key;
      status.textContent = failed
        ? "Some street tiles could not load. Toggle Streets off and on to retry."
        : polar
          ? "Street maps end at 85.05° latitude; polar areas retain Earth imagery."
          : `Street map on globe (level ${tiles[0]?.zoom ?? 0}). Zoom closer for more detail.`;
    }
    // Also bound abandoned batches while the user is still rotating or zooming.
    for (const [tileKey, mesh] of cache) {
      if (cache.size <= TILE_LIMIT * 2) break;
      if (!mesh.visible) {
        disposeTile(mesh);
        cache.delete(tileKey);
      }
    }
    busy = false;
    if (enabled && requestedKey !== key) void loadTiles();
  }

  return {
    setEnabled(value) {
      enabled = value;
      group.visible = value;
      requestedKey = "";
      completedKey = "";
      lastCheck = 0;
      status.textContent = value ? "Loading street tiles on the globe..." : "";
    },
    update(time) {
      if (!enabled || time - lastCheck < 250) return;
      lastCheck = time;
      pendingTiles = visibleTiles();
      const key = pendingTiles.map((tile) => tile.key).join(",");
      if (!pendingTiles.length) {
        group.visible = false;
        requestedKey = "polar";
        status.textContent = "Street maps end at 85.05° latitude; polar areas retain Earth imagery.";
        return;
      }
      group.visible = true;
      requestedKey = key;
      void loadTiles();
    },
  };
}
