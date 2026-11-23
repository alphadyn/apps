import { bounds, validateProject } from "./model.js?v=20261122-9";

export function propertyLayout(project) {
  if (project.property.layout) return structuredClone(project.property.layout);
  const p = project.property;
  const rooms = project.floors.flatMap(f => f.rooms).map(r => ({ ...r, x: r.x + p.houseX, y: r.y + p.houseY }));
  const b = bounds(rooms), garage = project.floors[0].rooms.find(r => r.type === "garage");
  const width = garage ? Math.min(garage.width, 5) : 3.2;
  const x = Math.max(.5, Math.min(p.width - width - .5, garage ? garage.x + p.houseX : b.x + b.width - width));
  const y = Math.max(0, Math.min(p.depth, garage ? garage.y + p.houseY + garage.depth : b.y + b.depth));
  const driveway = rooms.length && y < p.depth ? { x, y, width } : null;
  const trees = [];
  for (const [px, py, size] of [[.12, .13, 1.4], [.34, .1, 1.2], [.76, .12, 1.5], [.9, .3, 1.3], [.1, .52, 1.2], [.9, .66, 1.4], [.14, .82, 1.4], [.34, .9, 1.1]]) {
    const x = p.width * px, y = p.depth * py, radius = Math.min(size, p.width * .065, p.depth * .065);
    const occupied = rooms.some(r => x + radius > r.x - .5 && x - radius < r.x + r.width + .5 && y + radius > r.y - .5 && y - radius < r.y + r.depth + .5);
    const onDrive = p.driveway && driveway && x + radius > driveway.x && x - radius < driveway.x + driveway.width && y + radius > driveway.y;
    if (!occupied && !onDrive) trees.push({ x, y, radius });
  }
  return { trees, driveway };
}

export function propertyFeatures(project) {
  const layout = propertyLayout(project), p = project.property;
  return {
    trees: p.landscaping ? layout.trees : [],
    driveway: p.driveway && layout.driveway ? { ...layout.driveway, depth: p.depth - layout.driveway.y } : null,
  };
}

export function propertyItem(project, id) {
  if (id === "house") return { name: "Whole house", x: project.property.houseX, y: project.property.houseY };
  const features = propertyFeatures(project);
  if (id === "driveway" && features.driveway) return { ...features.driveway, name: "Driveway" };
  const index = /^tree-(\d+)$/.exec(id)?.[1];
  if (index !== undefined && features.trees[Number(index)]) return { ...features.trees[Number(index)], name: `Tree ${Number(index) + 1}` };
  throw new Error("Select an available house, tree, or driveway in the site plan.");
}

export function movePropertyItem(project, id, dx, dy) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new Error("Site movement must be a finite distance.");
  propertyItem(project, id);
  const updated = structuredClone(project);
  dx = Math.round(dx * 1e9) / 1e9;
  dy = Math.round(dy * 1e9) / 1e9;
  if (dx === 0 && dy === 0) return updated;
  // Freeze generated landscaping before moving anything so unrelated objects stay put.
  updated.property.layout = propertyLayout(project);
  const item = id === "house" ? updated.property : id === "driveway" ? updated.property.layout.driveway : updated.property.layout.trees[Number(id.slice(5))];
  const keys = id === "house" ? ["houseX", "houseY"] : ["x", "y"];
  item[keys[0]] = Math.round((item[keys[0]] + dx) * 1e9) / 1e9;
  item[keys[1]] = Math.round((item[keys[1]] + dy) * 1e9) / 1e9;
  return validateProject(updated);
}
