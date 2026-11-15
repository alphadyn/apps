import test from "node:test";
import assert from "node:assert/strict";
import { createProject, createRoom, parseProject, validateProject, propertyStats, exteriorWalls } from "./model.js";
import { FEATURE_STYLES, featureHost, featureVertices, featureMarkup, boundaryFence, fenceSettings } from "./architecture.js";
import { renderPropertyView } from "./property-view.js";
import { renderFloor3D } from "./floor-view.js";
import { createSampleDesign } from "./samples.js";

const opening = (changes = {}) => ({
  id: "opening-1", type: "window", name: "Panorama window", floorId: "ground", roomId: "living-1",
  side: "north", offset: .5, width: 2, height: 1.2, sill: .8, style: "fixed", material: "aluminum", glazing: "double",
  ...changes,
});
const gate = changes => opening({
  id: "gate-1", type: "gate", name: "Vehicle gate", floorId: undefined, roomId: undefined,
  side: "south", offset: 10, width: 3.5, height: 1.8, sill: 0, style: "sliding", material: "steel", glazing: "none", ...changes,
});
function withFeatures(features = [opening(), gate()]) {
  const project = createProject(); project.features = features; return project;
}

test("legacy projects preserve their shape while specified features round-trip through saved designs", () => {
  const legacy = createProject();
  assert.deepEqual(parseProject(JSON.stringify(legacy)), legacy);
  assert.equal(legacy.features, undefined);
  const project = withFeatures();
  assert.equal(validateProject(project), project);
  assert.deepEqual(parseProject(JSON.stringify(project)), JSON.parse(JSON.stringify(project)));
  assert.equal(featureHost(project, project.features[0]).id, "living-1");
  assert.equal(featureHost(project, project.features[1]).width, project.property.width);
});

test("feature validation rejects malformed specifications, invalid references, dimensions and duplicates", () => {
  for (const changes of [
    { type: "__proto__" }, { id: "" }, { id: "ground" }, { name: "" }, { name: "x".repeat(61) },
    { side: "up" }, { style: "unsupported" }, { material: "constructor" }, { glazing: "none" },
    { floorId: "missing" }, { roomId: "missing" }, { roomId: "terrace-1" },
    { offset: -.1 }, { offset: NaN }, { offset: "1" }, { width: Infinity }, { width: .2 },
    { offset: 5, width: 2 }, { height: 3 }, { height: .2 }, { sill: -1 }, { sill: 2 },
  ]) assert.throws(() => validateProject(withFeatures([opening(changes)])), Error, JSON.stringify(changes));
  assert.throws(() => validateProject(withFeatures([opening(), opening()])), /unique ID/);
  assert.throws(() => validateProject(withFeatures(null)), /400/);
  assert.throws(() => validateProject(withFeatures(Array.from({ length: 401 }, (_, i) => opening({ id: String(i) })))), /400/);
});

test("doors and gates start at floor or ground level and glass requires glazing", () => {
  const door = opening({ type: "door", style: "pivot", sill: 0, height: 2.1, material: "timber", glazing: "none" });
  assert.equal(validateProject(withFeatures([door])).features[0], door);
  assert.throws(() => validateProject(withFeatures([{ ...door, sill: .1 }])), /sill 0/);
  assert.throws(() => validateProject(withFeatures([gate({ sill: .1 })])), /sill 0/);
  assert.throws(() => validateProject(withFeatures([gate({ height: 4.1 })])), /4 m/);
  assert.throws(() => validateProject(withFeatures([gate({ offset: 25 })])), /fit along/);
  assert.throws(() => validateProject(withFeatures([gate({ floorId: "ground" })])), /lot boundary/);
  assert.throws(() => validateProject(withFeatures([{ ...door, material: "glass" }])), /glazing/);
});

test("features fit exactly at wall and ceiling limits, and host edits cannot orphan them", () => {
  const project = withFeatures([opening({ offset: 4, width: 2, sill: 1.6, height: 1.2 })]);
  validateProject(project);
  const room = project.floors[0].rooms[0];
  room.width = 5.9;
  assert.throws(() => validateProject(project), /fit along/);
  room.width = 6;
  project.ceiling = 2.7;
  assert.throws(() => validateProject(project), /height plus sill/);
  project.ceiling = 2.8;
  project.floors[0].rooms.shift();
  assert.throws(() => validateProject(project), /attached/);
});

test("coincident or opposite-side shared-wall openings cannot overlap but touching spans and different floors can", () => {
  const a = opening(), b = opening({ id: "opening-2", offset: 2 });
  assert.throws(() => validateProject(withFeatures([a, b])), /overlaps/);
  validateProject(withFeatures([a, { ...b, offset: 2.5 }]));
  validateProject(withFeatures([a, { ...b, offset: .5, height: .5, sill: 2 }]));
  validateProject(withFeatures([a, { ...b, floorId: "upper", roomId: "bed-1" }]));
  const project = withFeatures([
    opening({ side: "east", offset: 1 }),
    opening({ id: "shared-wall", roomId: "kitchen-1", side: "west", offset: 1 }),
  ]);
  assert.throws(() => validateProject(project), /overlaps/);
});

test("wall-mounted vertices use explicit sides, offsets, sills, floor heights and house origins", () => {
  const host = { x: 2, y: 3, width: 6, depth: 5 };
  const vertices = side => featureVertices(opening({ side, offset: 1, width: 2, height: 1, sill: .5 }), host, 3, { x: 10, y: 20 });
  assert.deepEqual(vertices("north"), [[13, 23, 3.5], [15, 23, 3.5], [15, 23, 4.5], [13, 23, 4.5]]);
  assert.deepEqual(vertices("south")[0], [13, 28, 3.5]);
  assert.deepEqual(vertices("east")[0], [18, 24, 3.5]);
  assert.deepEqual(vertices("west")[0], [12, 24, 3.5]);
  host.x += 4;
  assert.equal(featureVertices(opening(), host)[0][0], 6.5);
});

test("doors, windows and gates render specified styles in plan and full-height 3D without altering the project", () => {
  const project = withFeatures([opening(), gate()]);
  const original = JSON.stringify(project);
  for (const [type, styles] of Object.entries(FEATURE_STYLES)) for (const style of styles) {
    const feature = type === "gate" ? gate({ style }) : opening({ type, style, sill: type === "door" ? 0 : .8 });
    for (const plan of [true, false]) {
      const markup = featureMarkup(feature, featureVertices(feature, featureHost(project, feature)), (x, y, z) => ({ x: x * 20, y: y * 20 - z * 10 }), plan);
      assert.match(markup, /data-feature=/);
      assert.match(markup, new RegExp(style));
      assert.doesNotMatch(markup, /NaN|undefined|Infinity/);
    }
  }
  for (const yaw of [0, 45, 135, 225, 315]) {
    const { markup } = renderPropertyView(project, { view: "3d", camera: { yaw, pitch: 30 } });
    assert.match(markup, /data-feature="gate-1"/);
    if (yaw === 135 || yaw === 225) assert.match(markup, /data-feature="opening-1"/);
    assert.doesNotMatch(markup, /NaN|undefined|Infinity/);
  }
  const site = renderPropertyView(project, { view: "2d" }).markup;
  assert.match(site, /data-feature="opening-1"/);
  assert.match(site, /data-feature="gate-1"/);
  const cutaway = renderFloor3D(project.floors[0].rooms, { features: project.features.filter(f => f.type !== "gate") });
  assert.match(cutaway, /data-feature="opening-1"/);
  assert.equal(JSON.stringify(project), original);
});

test("feature names and IDs are escaped in all SVG output and gates render on an empty lot", () => {
  const project = withFeatures([gate({ id: 'gate"<id>', name: '<img onerror="test">' })]);
  project.floors = [{ id: "empty", name: "Empty floor", rooms: [] }];
  for (const view of ["2d", "3d"]) {
    const { markup } = renderPropertyView(project, { view });
    assert.doesNotMatch(markup, /<img|data-feature="gate"</);
    assert.match(markup, /&lt;img/);
    assert.doesNotMatch(markup, /NaN|undefined|Infinity/);
  }
});

test("terrace railings validate, render from all quadrants, and contribute to overall height", () => {
  const project = createSampleDesign("roof-garden-family-home");
  const roof = project.floors.at(-1), terraces = roof.rooms.filter(r => r.type === "terrace");
  project.floors = [{ ...roof, rooms: terraces }];
  project.features = [];
  validateProject(project);
  assert.equal(propertyStats(project).height, 1.1);
  for (const yaw of [45, 135, 225, 315]) {
    assert.match(renderPropertyView(project, { view: "3d", camera: { yaw, pitch: 30 } }).markup, /data-terrace-railing/);
    assert.match(renderFloor3D(terraces, { camera: { yaw, pitch: 30 } }), /data-terrace-railing/);
  }
  terraces[0].railing = "yes";
  assert.throws(() => validateProject(project), /Railings/);
  const room = createRoom("indoor", "living", "Living room", 0, 0, 3, 3);
  room.railing = true;
  project.floors[0].rooms = [room];
  assert.throws(() => validateProject(project), /terraces and balconies/);
});

test("rooftop railings include every exposed perimeter edge at every camera angle, not just near-facing edges", () => {
  const project = createProject();
  const terrace = { ...createRoom("roof-deck", "terrace", "Roof deck", 0, 0, 10, 8), railing: true };
  project.floors = [{ id: "roof", name: "Roof", rooms: [terrace] }];
  for (const yaw of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const camera = { yaw, pitch: 30 };
    const house = renderPropertyView(project, { view: "3d", camera }).markup;
    const floor = renderFloor3D(project.floors[0].rooms, { camera });
    assert.equal((house.match(/data-terrace-railing="true"/g) || []).length, 4, `house yaw ${yaw}: four complete edges`);
    assert.equal((floor.match(/data-terrace-railing="true"/g) || []).length, 4, `cutaway yaw ${yaw}: four complete edges`);
  }
  for (const id of ["roof-garden-family-home", "skyline-family-house"]) {
    const design = createSampleDesign(id), roof = design.floors.at(-1);
    const edges = exteriorWalls(roof.rooms, ["north", "east", "south", "west"]).filter(w => w.room.railing);
    const perimeter = edges.reduce((sum, edge) => sum + edge.to - edge.from, 0);
    assert.equal(perimeter, id === "roof-garden-family-home" ? 42.5 : 45, `${id}: railing covers the entire exposed perimeter except the enclosed access lobby`);
    const house = renderPropertyView(design, { view: "3d" }).markup;
    assert.equal((house.match(/data-terrace-railing="true"/g) || []).length, edges.length);
  }
});

test("boundary fencing preserves ungated legacy designs and gates enable a complete default perimeter", () => {
  const legacy = createProject(), before = JSON.stringify(legacy);
  assert.equal(fenceSettings(legacy).enabled, false);
  assert.deepEqual(boundaryFence(legacy), []);
  assert.equal(JSON.stringify(legacy), before);
  const project = withFeatures();
  const segments = boundaryFence(project);
  assert.deepEqual(fenceSettings(project), { enabled: true, height: 1.8, style: "slatted", material: "steel" });
  assert.equal(new Set(segments.map(s => s.side)).size, 4);
  assert.equal(segments.reduce((total, s) => total + s.to - s.from, 0), 2 * (project.property.width + project.property.depth) - 3.5);
  assert.deepEqual(segments.filter(s => s.side === "south").map(s => [s.from, s.to]), [[0, 10], [13.5, 26]]);
  for (const yaw of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const markup = renderPropertyView(project, { view: "3d", camera: { yaw, pitch: 30 } }).markup;
    assert.equal((markup.match(/data-boundary-fence="true"/g) || []).length, 5);
    assert.match(markup, /data-feature="gate-1"/);
    assert.doesNotMatch(markup, /NaN|undefined|Infinity/);
  }
  assert.equal((renderPropertyView(project, { view: "2d" }).markup.match(/data-boundary-fence="true"/g) || []).length, 5);
});

test("fences subtract multiple gates including corners, and explicit disabling overrides the gate default", () => {
  const project = withFeatures([gate({ offset: 0 }), gate({ id: "gate-2", offset: 10 }), gate({ id: "gate-3", side: "east", offset: 28, width: 4 })]);
  project.property.fence = { enabled: true, height: 2.4, style: "solid", material: "timber" };
  validateProject(project);
  const segments = boundaryFence(project);
  assert.equal(segments.reduce((total, s) => total + s.to - s.from, 0), 116 - 3.5 - 3.5 - 4);
  assert.ok(segments.every(s => s.to > s.from));
  assert.ok(segments.every(s => s.vertices[2][2] === 2.4));
  assert.deepEqual(parseProject(JSON.stringify(project)), JSON.parse(JSON.stringify(project)));
  project.property.fence.enabled = false;
  assert.deepEqual(boundaryFence(project), []);
  assert.doesNotMatch(renderPropertyView(project, { view: "3d" }).markup, /data-boundary-fence/);
  assert.match(renderPropertyView(project, { view: "3d" }).markup, /data-feature="gate-1"/);
});

test("boundary fence validation rejects invalid heights, styles, materials and flags", () => {
  const project = withFeatures();
  const valid = { enabled: true, height: 1.8, style: "slatted", material: "steel" };
  for (const update of [{ height: .49 }, { height: 4.01 }, { height: NaN }, { height: "2" }, { enabled: "yes" }, { material: "__proto__" }, { style: "unknown" }]) {
    project.property.fence = { ...valid, ...update };
    assert.throws(() => validateProject(project), /fence/i);
  }
  project.property.fence = null;
  assert.throws(() => validateProject(project), /fence/i);
  project.property.fence = valid;
  validateProject(project);
});
