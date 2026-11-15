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
  return floor.rooms.reduce((sum, item) => sum + item.width * item.depth, 0);
}
export function projectStats(project) {
  const rooms = project.floors.flatMap(floor => floor.rooms);
  return { area: project.floors.reduce((sum, floor) => sum + floorArea(floor), 0), bedrooms: rooms.filter(r => r.type === "bedroom").length, bathrooms: rooms.filter(r => r.type === "bathroom").length, floors: project.floors.length, rooms: rooms.length };
}
export function bounds(rooms) {
  if (!rooms.length) return { x: 0, y: 0, width: 10, depth: 10 };
  const x = Math.min(...rooms.map(r => r.x));
  const y = Math.min(...rooms.map(r => r.y));
  return { x, y, width: Math.max(...rooms.map(r => r.x + r.width)) - x, depth: Math.max(...rooms.map(r => r.y + r.depth)) - y };
}
export function unionArea(rooms) {
  const xs = [...new Set(rooms.flatMap(r => [r.x, r.x + r.width]))].sort((a, b) => a - b);
  let area = 0;
  for (let i = 1; i < xs.length; i++) {
    const intervals = rooms.filter(r => r.x < xs[i] && r.x + r.width > xs[i - 1])
      .map(r => [r.y, r.y + r.depth]).sort((a, b) => a[0] - b[0]);
    let length = 0, end = -Infinity;
    for (const [start, stop] of intervals) {
      length += Math.max(0, stop - Math.max(start, end));
      end = Math.max(end, stop);
    }
    area += (xs[i] - xs[i - 1]) * length;
  }
  return area;
}
export function propertyStats(project) {
  const rooms = project.floors.flatMap(f => f.rooms);
  const p = project.property;
  const footprint = unionArea(rooms.filter(r => !isOutdoor(r)));
  const outsideRooms = rooms.filter(r => r.x + p.houseX < 0 || r.y + p.houseY < 0 || r.x + p.houseX + r.width > p.width || r.y + p.houseY + r.depth > p.depth);
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
  const walls = [];
  for (const r of rooms) {
    for (const axis of sides) {
      const vertical = axis === "east" || axis === "west";
      const positive = axis === "east" || axis === "south";
      const start = vertical ? r.y : r.x;
      const end = start + (vertical ? r.depth : r.width);
      const extent = vertical ? r.width : r.depth;
      const at = (vertical ? r.x : r.y) + (positive ? extent : 0);
      let spans = [[start, end]];
      for (const neighbor of rooms) {
        if (neighbor === r) continue;
        const low = vertical ? neighbor.x : neighbor.y;
        const high = low + (vertical ? neighbor.width : neighbor.depth);
        if (positive ? low > at + 1e-8 || high <= at + 1e-8 : low >= at - 1e-8 || high < at - 1e-8) continue;
        const from = vertical ? neighbor.y : neighbor.x;
        const to = from + (vertical ? neighbor.depth : neighbor.width);
        spans = spans.flatMap(([a, b]) => to <= a || from >= b ? [[a, b]] : [[a, Math.min(b, from)], [Math.max(a, to), b]].filter(([x, y]) => y - x > 1e-8));
      }
      for (const [from, to] of spans) walls.push({ axis, at, from, to, room: r });
    }
  }
  return walls;
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
