export const DEFAULT_CAMERA = Object.freeze({ yaw: 45, pitch: 30 });
export const MIN_PITCH = 10;
export const MAX_PITCH = 80;

export function normalizeCamera({ yaw, pitch }) {
  if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) throw new Error("Camera angles must be finite numbers.");
  return { yaw: ((yaw % 360) + 360) % 360, pitch: Math.min(MAX_PITCH, Math.max(MIN_PITCH, pitch)) };
}

export function cameraFromDrag(start, dx, dy) {
  return normalizeCamera({ yaw: start.yaw - dx * .45, pitch: start.pitch + dy * .3 });
}

export function createCamera(angles = DEFAULT_CAMERA) {
  const { yaw, pitch } = normalizeCamera(angles);
  const a = yaw * Math.PI / 180, b = pitch * Math.PI / 180;
  const sin = Math.sin(a), cos = Math.cos(a), tilt = Math.sin(b), elevation = Math.cos(b);
  const toward = { x: elevation * sin, y: elevation * cos, z: tilt };
  return {
    yaw, pitch, toward,
    project: (x, y, z = 0) => ({ x: cos * x - sin * y, y: tilt * (sin * x + cos * y) - elevation * z }),
    depth: (x, y, z = 0) => toward.x * x + toward.y * y + toward.z * z,
    faces: { east: sin > 1e-8, west: sin < -1e-8, south: cos > 1e-8, north: cos < -1e-8 },
  };
}

// Axis-separated surfaces form a painter's order only where their projections overlap.
export function sortFaces(faces, camera) {
  const entries = faces.map((face, index) => {
    const projected = face.vertices.map(v => camera.project(...v));
    const limits = key => ({ min: Math.min(...projected.map(v => v[key])), max: Math.max(...projected.map(v => v[key])) });
    const world = [0, 1, 2].map(axis => ({ min: Math.min(...face.vertices.map(v => v[axis] || 0)), max: Math.max(...face.vertices.map(v => v[axis] || 0)) }));
    return { face, index, x: limits("x"), y: limits("y"), world, depth: face.vertices.reduce((sum, v) => sum + camera.depth(...v), 0) / face.vertices.length, before: new Set(), incoming: 0 };
  });
  const toward = [camera.toward.x, camera.toward.y, camera.toward.z];
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i], b = entries[j];
      if (a.x.max < b.x.min || b.x.max < a.x.min || a.y.max < b.y.min || b.y.max < a.y.min) continue;
      const directions = [];
      for (let axis = 0; axis < 3; axis++) {
        if (Math.abs(toward[axis]) < 1e-8) continue;
        const x = a.world[axis], y = b.world[axis];
        if (Math.abs(x.min - y.min) < 1e-8 && Math.abs(x.max - y.max) < 1e-8) continue;
        if (x.max <= y.min + 1e-8) directions.push(Math.sign(toward[axis]));
        else if (y.max <= x.min + 1e-8) directions.push(-Math.sign(toward[axis]));
      }
      if (!directions.length || directions.some(d => d !== directions[0])) continue;
      const [far, near] = directions[0] > 0 ? [a, b] : [b, a];
      far.before.add(near.index); near.incoming++;
    }
  }
  const remaining = new Set(entries), result = [];
  while (remaining.size) {
    let next;
    for (const entry of remaining) {
      if (entry.incoming) continue;
      if (!next || entry.depth < next.depth) next = entry;
    }
    if (!next) next = [...remaining].reduce((a, b) => a.depth < b.depth ? a : b);
    result.push(next.face); remaining.delete(next);
    for (const index of next.before) entries[index].incoming--;
  }
  return result;
}
