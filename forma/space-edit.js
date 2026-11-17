import { roomOutline, roomVertices, validateRoom, hasRectangularOutline } from "./model.js?v=20261117-1";

const EPSILON = 1e-7;
const clean = value => Math.round(value * 1e9) / 1e9;
const same = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]) < EPSILON;
const cross = (a, b, p) => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
const onSegment = (a, b, p) => Math.abs(cross(a, b, p)) < EPSILON &&
  p[0] >= Math.min(a[0], b[0]) - EPSILON && p[0] <= Math.max(a[0], b[0]) + EPSILON &&
  p[1] >= Math.min(a[1], b[1]) - EPSILON && p[1] <= Math.max(a[1], b[1]) + EPSILON;
const signedArea = points => points.reduce((sum, [x, y], i) => {
  const next = points[(i + 1) % points.length];
  return sum + x * next[1] - next[0] * y;
}, 0);

function reshape(room, vertices) {
  const x = Math.min(...vertices.map(p => p[0])), y = Math.min(...vertices.map(p => p[1]));
  const width = clean(Math.max(...vertices.map(p => p[0])) - x);
  const depth = clean(Math.max(...vertices.map(p => p[1])) - y);
  const outline = vertices.map(([px, py]) => [clean(px - x), clean(py - y)]);
  const result = { ...room, x: clean(x), y: clean(y), width, depth, outline };
  const rectangle = [[0, 0], [width, 0], [width, depth], [0, depth]];
  if (outline.length === 4 && outline.every((p, i) => same(p, rectangle[i]))) delete result.outline;
  if (signedArea(roomOutline(room)) * signedArea(outline) <= 0) throw new Error("A wall cannot move past the opposite wall.");
  validateRoom(result);
  return result;
}

// Always edit the gesture's original geometry, not the previous pointer frame.
export function shiftSpaceBoundary(rooms, roomId, mode, index, dx, dy, shared = false, keepRightAngles = true) {
  const room = rooms.find(item => item.id === roomId);
  if (!room) throw new Error("Select a room before changing its boundary.");
  const points = roomVertices(room);
  if (!["wall", "corner"].includes(mode) || !Number.isInteger(index) || !points[index]) throw new Error("Select a valid wall or corner.");
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new Error("Boundary movement must be a finite distance.");
  const a = points[index], b = points[(index + 1) % points.length];
  if (mode === "wall") {
    const vx = b[0] - a[0], vy = b[1] - a[1], lengthSquared = vx * vx + vy * vy;
    const along = (dx * vx + dy * vy) / lengthSquared;
    dx -= along * vx;
    dy -= along * vy;
  }
  if (Math.hypot(dx, dy) < EPSILON) return rooms;
  const anchors = mode === "wall" ? [a, b] : [a];
  return rooms.map(item => {
    if (item.id !== roomId && !shared) return item;
    const original = roomVertices(item);
    const affected = p => mode === "wall" ? onSegment(a, b, p) : same(a, p);
    if (keepRightAngles && hasRectangularOutline(item)) {
      const left = item.x, right = item.x + item.width, top = item.y, bottom = item.y + item.depth;
      const touched = [...original.filter(affected), ...anchors.filter(anchor => original.some((p, i) => onSegment(p, original[(i + 1) % original.length], anchor)))];
      if (!touched.length) return item;
      const moves = (axis, at) => touched.some(p => Math.abs(p[axis] - at) < EPSILON);
      const x1 = clean(left + (moves(0, left) ? dx : 0));
      const x2 = clean(right + (moves(0, right) ? dx : 0));
      const y1 = clean(top + (moves(1, top) ? dy : 0));
      const y2 = clean(bottom + (moves(1, bottom) ? dy : 0));
      if (x2 - x1 < 1 || y2 - y1 < 1) throw new Error("Room dimensions must be between 1 and 30 meters.");
      return reshape(item, [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]);
    }
    const expanded = original.flatMap((p, i) => {
      const next = original[(i + 1) % original.length];
      // Split partial shared edges at junctions so both rooms keep the same seam.
      const inserted = shared ? anchors.filter(anchor => !same(anchor, p) && !same(anchor, next) && onSegment(p, next, anchor))
        .sort((u, v) => Math.hypot(u[0] - p[0], u[1] - p[1]) - Math.hypot(v[0] - p[0], v[1] - p[1])) : [];
      return [p, ...inserted];
    });
    let changed = false;
    const moved = expanded.map(p => {
      if (!affected(p)) return p;
      changed = true;
      return [clean(p[0] + dx), clean(p[1] + dy)];
    });
    return changed ? reshape(item, moved) : item;
  });
}
