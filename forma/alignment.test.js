import test from "node:test";
import assert from "node:assert/strict";
import { bounds, createProject, createRoom, parseProject } from "./model.js";
import { alignItems } from "./alignment.js";
import { propertyFeatures } from "./property-edit.js";
import { renderPropertyView } from "./property-view.js";
import { featureHost, featureVertices } from "./architecture.js";

function projectWithRooms() {
  const project = createProject();
  project.floors = [{ id: "floor", name: "Ground floor", rooms: [
    createRoom("a", "living", "A", 2, 3, 4, 5),
    createRoom("b", "bedroom", "B", 10, 12, 6, 3),
  ] }];
  return project;
}

test("aligns room bounds on all six edges and centers without changing other data", () => {
  const project = projectWithRooms(), before = JSON.stringify(project);
  for (const [mode, axis, offset] of [
    ["left", "x", 0], ["centerX", "x", .5], ["right", "x", 1],
    ["top", "y", 0], ["centerY", "y", .5], ["bottom", "y", 1],
  ]) {
    const updated = alignItems(project, "floor", "floor", ["a", "b"], mode);
    const boxes = updated.floors[0].rooms.map(room => bounds([room]));
    const size = axis === "x" ? "width" : "depth";
    assert.equal(boxes[0][axis] + boxes[0][size] * offset, boxes[1][axis] + boxes[1][size] * offset, mode);
    assert.deepEqual(updated.property, project.property);
    assert.deepEqual(parseProject(JSON.stringify(updated)), updated);
  }
  assert.equal(JSON.stringify(project), before);
});

test("uses actual custom-outline bounds and preserves room geometry", () => {
  const project = projectWithRooms();
  project.floors[0].rooms[0].outline = [[0, 0], [4, 0], [4, 2], [2, 5], [0, 5]];
  const updated = alignItems(project, "floor", "floor", ["a", "b"], "right");
  assert.equal(bounds([updated.floors[0].rooms[0]]).x + 4, 16);
  assert.deepEqual(updated.floors[0].rooms[0].outline, project.floors[0].rooms[0].outline);
});

test("room alignment keeps hosted openings attached", () => {
  const project = projectWithRooms();
  project.features = [{ id: "window", type: "window", name: "Window", floorId: "floor", roomId: "a",
    side: "north", offset: .5, width: 2, height: 1.2, sill: .8, style: "fixed", material: "aluminum", glazing: "double" }];
  const feature = project.features[0];
  const before = featureVertices(feature, featureHost(project, feature));
  const updated = alignItems(project, "floor", "floor", ["a", "b"], "right");
  const after = featureVertices(feature, featureHost(updated, feature));
  assert.deepEqual(updated.features, project.features);
  assert.deepEqual(after, before.map(([x, y, z]) => [x + 10, y, z]));
});

test("aligns house, structures and tree canopy bounds with generated landscaping frozen", () => {
  const project = projectWithRooms();
  project.property.layout = { trees: [{ x: 4, y: 4, radius: 1 }, { x: 14, y: 8, radius: 2 }], driveway: null,
    structures: [{ type: "other", name: "Studio", x: 17, y: 5, width: 3, depth: 4, height: 3 }] };
  project.property.driveway = false;
  const result = alignItems(project, "property", "floor", ["tree-0", "tree-1", "building-0", "house"], "left");
  const features = propertyFeatures(result);
  assert.equal(features.trees[0].x - features.trees[0].radius, 3);
  assert.equal(features.trees[1].x - features.trees[1].radius, 3);
  assert.equal(result.property.layout.structures[0].x, 3);
  assert.equal(result.property.houseX + bounds(project.floors[0].rooms).x, 3);
  assert.deepEqual(result.floors, project.floors);
});

test("driveway center alignment respects the fixed street edge", () => {
  const project = projectWithRooms();
  project.property.layout = { trees: [{ x: 4, y: 15, radius: 1 }], driveway: { x: 6, y: 8, width: 3 } };
  const updated = alignItems(project, "property", "floor", ["tree-0", "driveway"], "centerY");
  const { trees, driveway } = propertyFeatures(updated);
  assert.equal(trees[0].y, driveway.y + driveway.depth / 2);
  assert.equal(driveway.y + driveway.depth, project.property.depth);
});

test("invalid alignments are atomic and no-op alignment does not freeze generated layout", () => {
  const project = projectWithRooms(), before = JSON.stringify(project);
  assert.throws(() => alignItems(project, "floor", "floor", ["a"], "left"), /at least two/);
  assert.throws(() => alignItems(project, "floor", "floor", ["a", "a"], "left"), /different/);
  assert.throws(() => alignItems(project, "floor", "floor", ["a", "missing"], "left"), /available/);
  assert.throws(() => alignItems(project, "floor", "floor", ["a", "b"], "unknown"), /valid alignment/);
  assert.equal(JSON.stringify(project), before);
  const tree = propertyFeatures(project).trees[0];
  project.property.houseX = tree.x - tree.radius - bounds(project.floors[0].rooms).x;
  const noOp = alignItems(project, "property", "floor", ["house", "tree-0"], "left");
  assert.deepEqual(noOp, project);
  assert.equal(noOp.property.layout, undefined);
});

test("rejects out-of-lot alignment and a driveway bottom beyond the street", () => {
  const project = projectWithRooms();
  project.property.houseX = -10;
  project.property.houseY = project.property.depth;
  project.property.layout = { trees: [{ x: 4, y: 4, radius: 1 }], driveway: { x: 6, y: 8, width: 3 } };
  const before = JSON.stringify(project);
  assert.throws(() => alignItems(project, "property", "floor", ["house", "tree-0"], "left"), /Tree canopies/);
  assert.throws(() => alignItems(project, "property", "floor", ["house", "driveway"], "bottom"), /connected to the street/);
  assert.equal(JSON.stringify(project), before);
});

test("site rendering marks every selected item", () => {
  const markup = renderPropertyView(createProject(), { editable: true, selectedSites: ["house", "tree-0"] }).markup;
  assert.match(markup, /data-site-item="house" class="site-item site-selected"[^>]*aria-pressed="true"/);
  assert.match(markup, /data-site-item="tree-0" class="site-item site-selected"[^>]*aria-pressed="true"/);
  assert.match(markup, /data-site-item="driveway" class="site-item"[^>]*aria-pressed="false"/);
});
