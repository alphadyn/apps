import { validateFeatures, validateFence } from "./architecture.js";

export const TYPES = {
  living: { name: "Living room", icon: "sofa", color: "#e5e8d5", category: "Living", width: 6, depth: 5 },
  bedroom: { name: "Bedroom", icon: "bed", color: "#e8e1d3", category: "Private", width: 4, depth: 4 },
  bathroom: { name: "Bathroom", icon: "bath", color: "#dce6df", category: "Service", width: 3, depth: 2.5 },
  kitchen: { name: "Kitchen", icon: "kitchen", color: "#e9e6d8", category: "Living", width: 4, depth: 4 },
  dining: { name: "Dining room", icon: "dining", color: "#e5e8d5", category: "Living", width: 4, depth: 4 },
  stairs: { name: "Staircase", icon: "stairs", color: "#e2e4d8", category: "Service", width: 2, depth: 4 },
  office: { name: "Home office", icon: "desk", color: "#e5dfd1", category: "Private", width: 3.5, depth: 3 },
  terrace: { name: "Terrace", icon: "sun", color: "#d9e2c9", category: "Outdoor", width: 6, depth: 3 },
  utility: { name: "Utility room", icon: "utility", color: "#dce6df", category: "Service", width: 2, depth: 2.5 },
  hallway: { name: "Hallway", icon: "hallway", color: "#e9e6db", category: "Service", width: 1.5, depth: 5 },
  closet: { name: "Closet", icon: "closet", color: "#e5dfd1", category: "Private", width: 2, depth: 2 },
  pantry: { name: "Pantry", icon: "pantry", color: "#e9e6d8", category: "Service", width: 2, depth: 2 },
  laundry: { name: "Laundry", icon: "utility", color: "#dce6df", category: "Service", width: 2.5, depth: 3 },
  garage: { name: "Garage", icon: "garage", color: "#d8dcd5", category: "Service", width: 6, depth: 6 },
  entry: { name: "Entry / foyer", icon: "door", color: "#e8e4d7", category: "Living", width: 3, depth: 2.5 },
  storage: { name: "Storage", icon: "storage", color: "#dfdfd3", category: "Service", width: 2.5, depth: 2 },
  balcony: { name: "Balcony", icon: "sun", color: "#d9e2c9", category: "Outdoor", width: 4, depth: 2 },
};

export const isOutdoor = item => TYPES[item.type].category === "Outdoor";
export const defaultProperty = () => ({ width: 26, depth: 32, houseX: 8, houseY: 7, roadName: "Oak Lane", landscaping: true, driveway: true });
export const roomOutline = item => item.outline || [[0, 0], [item.width, 0], [item.width, item.depth], [0, item.depth]];
export const roomVertices = item => roomOutline(item).map(([x, y]) => [item.x + x, item.y + y]);
export function hasRectangularOutline(item) {
  const points = roomOutline(item), near = (a, b) => Math.abs(a - b) < 1e-8;
  return near(roomArea(item), item.width * item.depth) && points.every(([x, y], index) => {
    const [nx, ny] = points[(index + 1) % points.length];
    return near(x, nx) && (near(x, 0) || near(x, item.width)) ||
      near(y, ny) && (near(y, 0) || near(y, item.depth));
  });
}
export function roomArea(item) {
  const points = roomOutline(item);
  return Math.abs(points.reduce((sum, [x, y], index) => {
    const next = points[(index + 1) % points.length];
    return sum + x * next[1] - next[0] * y;
  }, 0)) / 2;
}
export function roomCentroid(item) {
  const points = roomOutline(item);
  const area = points.reduce((sum, [x, y], index) => {
    const next = points[(index + 1) % points.length];
    return sum + x * next[1] - next[0] * y;
  }, 0);
  if (Math.abs(area) < 1e-8) return [item.width / 2, item.depth / 2];
  const centroid = points.reduce(([cx, cy], [x, y], index) => {
    const next = points[(index + 1) % points.length], cross = x * next[1] - next[0] * y;
    return [cx + (x + next[0]) * cross, cy + (y + next[1]) * cross];
  }, [0, 0]);
  return centroid.map(value => value / (3 * area));
}
const room = (id, type, name, x, y, width, depth) => ({
  id, type, name, x, y, width, depth,
  material: ["terrace", "balcony"].includes(type) ? "deck" : ["bathroom", "utility", "laundry", "entry"].includes(type) ? "tile" : type === "garage" ? "concrete" : "oak",
});
export { room as createRoom };
export function createProject() {
  return {
    version: 1, name: "The Courtyard House", style: "Contemporary", ceiling: 2.8, property: defaultProperty(),
    floors: [
      { id: "ground", name: "Ground floor", rooms: [
        room("living-1", "living", "Living room", 0, 0, 6, 5),
        room("kitchen-1", "kitchen", "Kitchen", 6, 0, 4, 5),
        room("dining-1", "dining", "Dining room", 0, 5, 6, 4),
        room("bath-1", "bathroom", "Bathroom", 6, 5, 2.5, 2.5),
        room("stairs-1", "stairs", "Staircase", 8.5, 5, 1.5, 4),
        room("utility-1", "utility", "Utility", 6, 7.5, 2.5, 1.5),
        room("terrace-1", "terrace", "Garden terrace", 0, 9, 10, 2.5),
      ] },
      { id: "upper", name: "First floor", rooms: [
        room("bed-1", "bedroom", "Primary bedroom", 0, 0, 6, 5),
        room("bed-2", "bedroom", "Bedroom 02", 6, 0, 4, 5),
        room("bed-3", "bedroom", "Bedroom 03", 0, 5, 4, 4),
        room("office-1", "office", "Home office", 4, 5, 2, 4),
        room("bath-2", "bathroom", "Bathroom", 6, 5, 2.5, 4),
        room("stairs-2", "stairs", "Staircase", 8.5, 5, 1.5, 4),
      ] },
    ],
  };
}
export function floorArea(floor) {
  return floor.rooms.reduce((sum, item) => sum + roomArea(item), 0);
}
export function projectStats(project) {
  const rooms = project.floors.flatMap(floor => floor.rooms);
  return { area: project.floors.reduce((sum, floor) => sum + floorArea(floor), 0), bedrooms: rooms.filter(r => r.type === "bedroom").length, bathrooms: rooms.filter(r => r.type === "bathroom").length, floors: project.floors.length, rooms: rooms.length };
}
export function bounds(rooms) {
  if (!rooms.length) return { x: 0, y: 0, width: 10, depth: 10 };
  const vertices = rooms.flatMap(roomVertices);
  const x = Math.min(...vertices.map(([px]) => px));
  const y = Math.min(...vertices.map(([, py]) => py));
  return { x, y, width: Math.max(...vertices.map(([px]) => px)) - x, depth: Math.max(...vertices.map(([, py]) => py)) - y };
}
export function unionArea(rooms) {
  if (!rooms.length) return 0;
  const edges = rooms.flatMap(room => {
    const vertices = roomVertices(room);
    return vertices.map((a, index) => [a, vertices[(index + 1) % vertices.length]]);
  }).filter(([[x1], [x2]]) => Math.abs(x2 - x1) > 1e-8);
  const xs = rooms.flatMap(roomVertices).map(([x]) => x);
  for (let i = 0; i < edges.length; i++) {
    const [[ax, ay], [bx, by]] = edges[i];
    for (const [[cx, cy], [dx, dy]] of edges.slice(i + 1)) {
      const denominator = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
      if (Math.abs(denominator) < 1e-10) continue;
      const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denominator;
      const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denominator;
      if (t > 1e-8 && t < 1 - 1e-8 && u > 1e-8 && u < 1 - 1e-8) xs.push(ax + t * (bx - ax));
    }
  }
  const breaks = [...new Set(xs)].sort((a, b) => a - b);
  const coveredLength = x => {
    const spans = rooms.flatMap(room => {
      const vertices = roomVertices(room), ys = [];
      for (let i = 0; i < vertices.length; i++) {
        const [x1, y1] = vertices[i], [x2, y2] = vertices[(i + 1) % vertices.length];
        if ((x1 < x && x2 > x) || (x2 < x && x1 > x)) ys.push(y1 + (y2 - y1) * (x - x1) / (x2 - x1));
      }
      ys.sort((a, b) => a - b);
      const pairs = [];
      for (let i = 1; i < ys.length; i += 2) pairs.push([ys[i - 1], ys[i]]);
      return pairs;
    }).sort((a, b) => a[0] - b[0]);
    let length = 0, end = -Infinity;
    for (const [start, stop] of spans) {
      length += Math.max(0, stop - Math.max(start, end));
      end = Math.max(end, stop);
    }
    return length;
  };
  let area = 0;
  for (let i = 1; i < breaks.length; i++) {
    const width = breaks[i] - breaks[i - 1], epsilon = Math.min(width * 1e-6, 1e-8);
    if (width > 1e-8) area += width * (coveredLength(breaks[i - 1] + epsilon) + coveredLength(breaks[i] - epsilon)) / 2;
  }
  return area;
}
export function propertyStats(project) {
  const rooms = project.floors.flatMap(f => f.rooms);
  const p = project.property;
  const footprint = unionArea(rooms.filter(r => !isOutdoor(r)));
  const outsideRooms = rooms.filter(r => {
    const b = bounds([r]);
    return b.x + p.houseX < 0 || b.y + p.houseY < 0 || b.x + b.width + p.houseX > p.width || b.y + b.depth + p.houseY > p.depth;
  });
  const height = project.floors.reduce((highest, f, index) => Math.max(highest, ...f.rooms.map(r => index * project.ceiling + (isOutdoor(r) ? r.railing ? 1.1 : .08 : project.ceiling))), 0);
  return { lotArea: p.width * p.depth, footprint, coverage: footprint / (p.width * p.depth) * 100, height, outsideRooms };
}
export function validateProperty(property) {
  if (!property) throw new Error("Property settings are missing.");
  for (const key of ["width", "depth"]) {
    if (!Number.isFinite(property[key]) || property[key] < 8 || property[key] > 200) throw new Error("Lot dimensions must be between 8 and 200 meters.");
  }
  for (const key of ["houseX", "houseY"]) {
    if (!Number.isFinite(property[key]) || Math.abs(property[key]) > 200) throw new Error("House positions must be within 200 meters of the lot origin.");
  }
  if (typeof property.roadName !== "string" || !property.roadName.trim() || property.roadName.length > 60) throw new Error("Street names must be between 1 and 60 characters.");
  if (typeof property.landscaping !== "boolean" || typeof property.driveway !== "boolean") throw new Error("Property landscape and driveway settings must be on or off.");
  validateFence(property.fence);
  return property;
}
export function exteriorWalls(rooms, sides = ["east", "south"]) {
  return exteriorRoomWalls(rooms).flatMap(({ a, b, room, normal }) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    if (Math.abs(dx) < 1e-8) {
      const axis = normal[0] > 0 ? "east" : "west";
      return sides.includes(axis) ? [{ axis, at: a[0], from: Math.min(a[1], b[1]), to: Math.max(a[1], b[1]), room }] : [];
    }
    if (Math.abs(dy) < 1e-8) {
      const axis = normal[1] > 0 ? "south" : "north";
      return sides.includes(axis) ? [{ axis, at: a[1], from: Math.min(a[0], b[0]), to: Math.max(a[0], b[0]), room }] : [];
    }
    return [];
  });
}
export function exteriorRoomWalls(rooms) {
  const edges = rooms.flatMap(room => {
    const points = roomVertices(room);
    return points.map((a, index) => ({ a, b: points[(index + 1) % points.length], room, index }));
  });
  return edges.flatMap(edge => {
    const [ax, ay] = edge.a, [bx, by] = edge.b, dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy);
    if (length < 1e-8) return [];
    const covered = [];
    for (const other of edges) {
      if (other.room === edge.room) continue;
      const [cx, cy] = other.a, [ex, ey] = other.b;
      if (Math.abs(dx * (cy - ay) - dy * (cx - ax)) > 1e-7 || Math.abs(dx * (ey - ay) - dy * (ex - ax)) > 1e-7) continue;
      const first = ((cx - ax) * dx + (cy - ay) * dy) / (length * length);
      const second = ((ex - ax) * dx + (ey - ay) * dy) / (length * length);
      const from = Math.max(0, Math.min(first, second)), to = Math.min(1, Math.max(first, second));
      if (to > from + 1e-8) covered.push([from, to]);
    }
    covered.sort((a, b) => a[0] - b[0]);
    const spans = [];
    let start = 0;
    for (const [from, to] of covered) {
      if (from > start + 1e-8) spans.push([start, from]);
      start = Math.max(start, to);
    }
    if (start < 1 - 1e-8) spans.push([start, 1]);
    const points = roomOutline(edge.room);
    const signedArea = points.reduce((sum, [x, y], i) => sum + x * points[(i + 1) % points.length][1] - points[(i + 1) % points.length][0] * y, 0);
    const normal = signedArea >= 0 ? [dy / length, -dx / length] : [-dy / length, dx / length];
    return spans.map(([from, to]) => ({
      room: edge.room,
      index: edge.index,
      a: [ax + dx * from, ay + dy * from],
      b: [ax + dx * to, ay + dy * to],
      normal,
    }));
  });
}
export function validateRoom(item) {
  if (!item || !Object.hasOwn(TYPES, item.type)) throw new Error("Choose a supported room type.");
  if (typeof item.id !== "string" || !item.id || item.id.length > 100) throw new Error("Room ID is invalid.");
  if (typeof item.name !== "string" || !item.name.trim() || item.name.length > 60) throw new Error("Room names must be between 1 and 60 characters.");
  for (const key of ["width", "depth"]) {
    if (typeof item[key] !== "number" || !Number.isFinite(item[key]) || item[key] < 1 || item[key] > 30) throw new Error("Room dimensions must be between 1 and 30 meters.");
  }
  for (const key of ["x", "y"]) {
    if (typeof item[key] !== "number" || !Number.isFinite(item[key]) || Math.abs(item[key]) > 200) throw new Error("Room positions must be within 200 meters of the origin.");
  }
  if (item.outline !== undefined) {
    if (!Array.isArray(item.outline) || item.outline.length < 3 || item.outline.length > 12) throw new Error("A custom room outline needs between 3 and 12 corners.");
    const points = item.outline;
    for (const point of points) {
      if (!Array.isArray(point) || point.length !== 2 || point.some(value => typeof value !== "number" || !Number.isFinite(value)) || point[0] < 0 || point[0] > item.width || point[1] < 0 || point[1] > item.depth) throw new Error("Room corners must stay within the room bounds.");
    }
    if (points.some((point, index) => {
      const next = points[(index + 1) % points.length];
      return Math.hypot(point[0] - next[0], point[1] - next[1]) < .5;
    })) throw new Error("Room walls must be at least 0.5 meters long.");
    const twiceArea = points.reduce((sum, [x, y], index) => {
      const next = points[(index + 1) % points.length];
      return sum + x * next[1] - next[0] * y;
    }, 0);
    if (Math.abs(twiceArea) < 2) throw new Error("Room outlines must enclose at least 1 square meter.");
    const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const onSegment = (a, b, p) => Math.abs(cross(a, b, p)) < 1e-8 && p[0] >= Math.min(a[0], b[0]) - 1e-8 && p[0] <= Math.max(a[0], b[0]) + 1e-8 && p[1] >= Math.min(a[1], b[1]) - 1e-8 && p[1] <= Math.max(a[1], b[1]) + 1e-8;
    const intersects = (a, b, c, d) => {
      const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
      return abC * abD < -1e-8 && cdA * cdB < -1e-8 || onSegment(a, b, c) || onSegment(a, b, d) || onSegment(c, d, a) || onSegment(c, d, b);
    };
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        if (j === i + 1 || i === 0 && j === points.length - 1) continue;
        if (intersects(points[i], points[(i + 1) % points.length], points[j], points[(j + 1) % points.length])) throw new Error("Room walls cannot cross.");
      }
    }
  }
  if (!["oak", "tile", "concrete", "deck"].includes(item.material)) throw new Error("Choose a supported floor finish.");
  if (item.railing !== undefined && (typeof item.railing !== "boolean" || !isOutdoor(item))) throw new Error("Railings are an on/off setting for terraces and balconies only.");
  return item;
}
export function validateProject(project) {
  if (!project || project.version !== 1) throw new Error("This is not a supported Forma project.");
  if (typeof project.name !== "string" || !project.name.trim() || project.name.length > 80) throw new Error("Project names must be between 1 and 80 characters.");
  if (!["Contemporary", "Minimalist", "Modern organic", "Mid-century"].includes(project.style)) throw new Error("Choose a supported design style.");
  if (!Number.isFinite(project.ceiling) || project.ceiling < 2 || project.ceiling > 6) throw new Error("Ceiling height must be between 2 and 6 meters.");
  validateProperty(project.property);
  if (!Array.isArray(project.floors) || project.floors.length < 1 || project.floors.length > 8) throw new Error("Projects must have between 1 and 8 floors.");
  const ids = new Set();
  for (const floor of project.floors) {
    if (!floor || typeof floor.id !== "string" || !floor.id || floor.id.length > 100 || ids.has(floor.id)) throw new Error("Each floor must have a unique ID.");
    ids.add(floor.id);
    if (typeof floor.name !== "string" || !floor.name.trim() || floor.name.length > 40) throw new Error("Floor names must be between 1 and 40 characters.");
    if (!Array.isArray(floor.rooms) || floor.rooms.length > 80) throw new Error("A floor supports up to 80 spaces.");
    for (const item of floor.rooms) {
      validateRoom(item);
      if (ids.has(item.id)) throw new Error("Each space must have a unique ID.");
      ids.add(item.id);
    }
  }
  validateFeatures(project, ids);
  return project;
}
export function makeRoom(type, rooms) {
  if (!Object.hasOwn(TYPES, type)) throw new Error("Choose a supported room type.");
  const spec = TYPES[type];
  if (rooms.length >= 80) throw new Error("This floor has reached the limit of 80 spaces.");
  let x = 0;
  let y = 0;
  const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.depth && a.y + a.depth > b.y;
  while (rooms.some(r => overlaps({ x, y, width: spec.width, depth: spec.depth }, r))) {
    x += .5;
    if (x + spec.width > 30) { x = 0; y += .5; }
    if (y > 200) throw new Error("No free space remains. Move existing rooms before adding another.");
  }
  const count = rooms.filter(r => r.type === type).length;
  return room(crypto.randomUUID(), type, `${spec.name}${count ? ` ${String(count + 1).padStart(2, "0")}` : ""}`, x, y, spec.width, spec.depth);
}
export function parseProject(text) {
  if (text.length > 1_000_000) throw new Error("Project files must be smaller than 1 MB.");
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error("The project file is not valid JSON."); }
  if (parsed && typeof parsed === "object" && parsed.property === undefined) parsed.property = defaultProperty();
  return validateProject(parsed);
}
export async function readProjectFile(file) {
  if (!file || typeof file.name !== "string" || !file.name.toLowerCase().endsWith(".json")) throw new Error("Choose a saved Forma .forma.json or .json project. Images, PDFs, and CAD files cannot be reopened as editable projects.");
  if (!Number.isFinite(file.size) || file.size > 1_000_000) throw new Error("Project files must be smaller than 1 MB.");
  return parseProject(await file.text());
}
