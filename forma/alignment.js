import { bounds, validateProject } from "./model.js?v=20261125-1";
import { propertyItem, propertyLayout } from "./property-edit.js?v=20261125-1";

const modes = {
  left: ["x", "start"], centerX: ["x", "center"], right: ["x", "end"],
  top: ["y", "start"], centerY: ["y", "center"], bottom: ["y", "end"],
};
const clean = value => Math.round(value * 1e9) / 1e9;

function siteBounds(project, id) {
  const item = propertyItem(project, id);
  if (id === "house") {
    const rooms = project.floors.flatMap(floor => floor.rooms);
    if (!rooms.length) throw new Error("The house needs a space before it can be aligned.");
    const box = bounds(rooms);
    return { x: box.x + item.x, y: box.y + item.y, width: box.width, depth: box.depth };
  }
  if (id.startsWith("tree-")) return { x: item.x - item.radius, y: item.y - item.radius, width: 2 * item.radius, depth: 2 * item.radius };
  return { x: item.x, y: item.y, width: item.width, depth: item.depth };
}

export function alignItems(project, scope, floorId, ids, mode) {
  if (!Object.hasOwn(modes, mode)) throw new Error("Choose a valid alignment.");
  if (!Array.isArray(ids) || ids.length < 2 || new Set(ids).size !== ids.length) throw new Error("Select at least two different items to align.");
  if (!["floor", "property"].includes(scope)) throw new Error("Choose a valid design scope.");
  const floor = project.floors.find(item => item.id === floorId);
  if (scope === "floor" && !floor) throw new Error("Select an available floor.");
  const items = ids.map(id => {
    if (scope === "property") return siteBounds(project, id);
    const room = floor.rooms.find(item => item.id === id);
    if (!room) throw new Error("Select available spaces on this floor.");
    return bounds([room]);
  });
  const [axis, edge] = modes[mode], size = axis === "x" ? "width" : "depth";
  const start = Math.min(...items.map(item => item[axis]));
  const end = Math.max(...items.map(item => item[axis] + item[size]));
  const target = edge === "start" ? start : edge === "end" ? end : (start + end) / 2;
  const deltas = items.map((box, index) => {
    const current = box[axis] + (edge === "center" ? box[size] / 2 : edge === "end" ? box[size] : 0);
    if (ids[index] === "driveway" && axis === "y" && edge === "end" && Math.abs(target - current) > 1e-9) {
      throw new Error("The driveway must remain connected to the street and cannot align its bottom edge there.");
    }
    return clean((target - current) * (ids[index] === "driveway" && axis === "y" && edge === "center" ? 2 : 1));
  });
  if (deltas.every(delta => delta === 0)) return structuredClone(project);
  const updated = structuredClone(project);
  if (scope === "property") updated.property.layout = propertyLayout(project);
  const updatedFloor = updated.floors.find(item => item.id === floorId);
  ids.forEach((id, index) => {
    const item = scope === "floor" ? updatedFloor.rooms.find(room => room.id === id) :
      id === "house" ? updated.property : id === "driveway" ? updated.property.layout.driveway :
        updated.property.layout[id.startsWith("tree-") ? "trees" : "structures"][Number(id.split("-")[1])];
    const key = scope === "property" && id === "house" ? (axis === "x" ? "houseX" : "houseY") : axis;
    item[key] = clean(item[key] + deltas[index]);
  });
  return validateProject(updated);
}
