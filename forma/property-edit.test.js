import test from "node:test";
import assert from "node:assert/strict";
import { createProject, parseProject, validateProject, propertyStats } from "./model.js";
import { propertyLayout, propertyFeatures, propertyItem, movePropertyItem, addPropertyItem, updatePropertyItem, removePropertyItem } from "./property-edit.js";
import { renderPropertyView } from "./property-view.js";

test("legacy landscaping stays generated without mutating saved designs", () => {
  const project = createProject(), before = JSON.stringify(project);
  const features = propertyFeatures(project);
  assert.ok(features.trees.length > 0);
  assert.ok(features.driveway.depth > 0);
  assert.equal(JSON.stringify(project), before);
  assert.deepEqual(movePropertyItem(project, "house", 0, 0), project);
  assert.deepEqual(movePropertyItem(project, "tree-0", Number.EPSILON, 0), project);
  assert.equal(project.property.layout, undefined);
});

test("moving the whole house moves every level without moving site items or boundary gates", () => {
  const project = createProject(), before = JSON.stringify(project), features = propertyFeatures(project);
  project.features = [{ id: "gate", type: "gate", name: "Gate", side: "south", offset: 1, width: 3, height: 1.8, sill: 0, style: "sliding", material: "steel", glazing: "none" }];
  const updated = movePropertyItem(project, "house", 2, 1);
  assert.equal(updated.property.houseX, project.property.houseX + 2);
  assert.equal(updated.property.houseY, project.property.houseY + 1);
  assert.deepEqual(updated.floors, project.floors);
  assert.deepEqual(updated.features, project.features);
  assert.deepEqual(propertyFeatures(updated), features);
  delete project.features;
  assert.equal(JSON.stringify(project), before);
});

test("trees and driveways move independently, persist, and match both rendered views", () => {
  const project = createProject(), initial = propertyFeatures(project);
  const movedTree = movePropertyItem(project, "tree-0", .5, .5);
  assert.equal(propertyItem(movedTree, "tree-0").x, initial.trees[0].x + .5);
  assert.deepEqual(propertyFeatures(movedTree).driveway, initial.driveway);
  assert.deepEqual(propertyFeatures(movedTree).trees.slice(1), initial.trees.slice(1));
  const movedDrive = movePropertyItem(movedTree, "driveway", -1, 1);
  const driveway = propertyFeatures(movedDrive).driveway;
  assert.equal(driveway.x, initial.driveway.x - 1);
  assert.equal(driveway.y, initial.driveway.y + 1);
  assert.equal(driveway.y + driveway.depth, movedDrive.property.depth);
  assert.deepEqual(parseProject(JSON.stringify(movedDrive)), movedDrive);
  for (const view of ["2d", "3d"]) {
    const markup = renderPropertyView(movedDrive, { view }).markup;
    assert.match(markup, /data-landscape-tree/);
    assert.match(markup, /data-property-driveway/);
    assert.doesNotMatch(markup, /NaN|undefined|Infinity/);
    assert.notEqual(markup, renderPropertyView(project, { view }).markup);
  }
});

test("site layout validation rejects invalid moves without changing the original design", () => {
  const project = createProject(), before = JSON.stringify(project);
  for (const [id, dx, dy] of [["house", Infinity, 0], ["house", 400, 0], ["tree-0", -100, 0], ["driveway", 100, 0], ["driveway", 0, 100], ["tree-99", 1, 1], ["unknown", 1, 1]]) {
    assert.throws(() => movePropertyItem(project, id, dx, dy));
    assert.equal(JSON.stringify(project), before);
  }
  for (const layout of [null, {}, { trees: [], driveway: {} }, { trees: [null], driveway: null }, { trees: [{ x: 2, y: 2, radius: NaN }], driveway: null }]) {
    assert.throws(() => validateProject({ ...project, property: { ...project.property, layout } }));
  }
});

test("hiding and restoring landscaping preserves manually arranged positions", () => {
  const updated = movePropertyItem(createProject(), "tree-0", .5, .5);
  const layout = propertyLayout(updated);
  updated.property.landscaping = false; updated.property.driveway = false;
  assert.deepEqual(propertyFeatures(updated), { trees: [], driveway: null });
  assert.throws(() => movePropertyItem(updated, "tree-0", 1, 0), /available/);
  assert.throws(() => movePropertyItem(updated, "driveway", 1, 0), /available/);
  updated.property.landscaping = true; updated.property.driveway = true;
  assert.deepEqual(propertyLayout(updated), layout);
});

test("only editable site plans expose movable controls and preserve framing during a gesture", () => {
  const project = createProject();
  const initial = renderPropertyView(project, { editable: true, selectedSite: "tree-0" });
  for (const id of ["house", "tree-0", "driveway"]) assert.match(initial.markup, new RegExp(`data-site-item="${id}"`));
  assert.match(initial.markup, /site-selected/);
  assert.match(initial.markup, /aria-label="Move whole house"/);
  assert.doesNotMatch(renderPropertyView(project).markup, /data-site-item/);
  assert.doesNotMatch(renderPropertyView(project, { editable: true, view: "3d" }).markup, /data-site-item/);
  const moved = movePropertyItem(project, "house", -20, 0);
  const stable = renderPropertyView(moved, { framing: initial.framing });
  assert.equal(stable.scale, initial.scale);
  assert.deepEqual(stable.framing, initial.framing);
  assert.notEqual(renderPropertyView(moved).framing.left, initial.framing.left);
});

test("site features can be added, edited, moved, removed and round-tripped", () => {
  const original = createProject(), before = JSON.stringify(original);
  let { project, id } = addPropertyItem(original, "tree");
  assert.equal(id, `tree-${propertyFeatures(original).trees.length}`);
  project = updatePropertyItem(project, id, { x: 3, y: 3, radius: 2 });
  assert.equal(propertyItem(project, id).radius, 2);
  project = movePropertyItem(project, id, 1, 0);
  assert.equal(propertyItem(project, id).x, 4);
  project = removePropertyItem(project, id);
  assert.equal(propertyFeatures(project).trees.length, propertyFeatures(original).trees.length);
  for (const type of ["guestHouse", "boysQuarters", "securityHouse", "detachedGarage", "other"]) {
    ({ project, id } = addPropertyItem(project, type));
    project = updatePropertyItem(project, id, { name: `Custom ${type}`, x: 1, y: 1, width: 4, depth: 5, height: 3 });
    assert.equal(propertyItem(project, id).type, type);
    project = movePropertyItem(project, id, 1, 0);
    assert.equal(propertyItem(project, id).x, 2);
  }
  assert.deepEqual(parseProject(JSON.stringify(project)), project);
  for (const view of ["2d", "3d"]) {
    const markup = renderPropertyView(project, { view, editable: true }).markup;
    assert.match(markup, view === "2d" ? /data-site-item="building-0"/ : /data-site-building-roof="true"/);
    assert.doesNotMatch(markup, /NaN|undefined|Infinity/);
  }
  const openTop = renderPropertyView(project, { view: "3d", roof: false }).markup;
  assert.match(openTop, /data-site-building-floor="true"/);
  assert.doesNotMatch(openTop, /data-site-building-roof="true"/);
  project = removePropertyItem(project, "building-1");
  assert.equal(project.property.layout.structures.length, 4);
  assert.equal(JSON.stringify(original), before);
});

test("site feature edits validate geometry, names, limits and driveway restoration", () => {
  const original = createProject();
  let { project, id } = addPropertyItem(original, "guestHouse");
  for (const values of [{ x: -1 }, { width: 500 }, { height: 0 }, { name: " " }, { type: "invalid" }]) {
    assert.throws(() => updatePropertyItem(project, id, values));
  }
  assert.throws(() => addPropertyItem(project, "invalid"));
  assert.throws(() => removePropertyItem(project, "house"));
  assert.throws(() => addPropertyItem(project, "driveway"), /already/);
  const oldDriveway = propertyFeatures(project).driveway;
  project.property.driveway = false;
  project = addPropertyItem(project, "driveway").project;
  assert.deepEqual(propertyFeatures(project).driveway, oldDriveway);
  project = removePropertyItem(project, "driveway");
  assert.equal(propertyFeatures(project).driveway, null);
  project = addPropertyItem(project, "driveway").project;
  project = updatePropertyItem(project, "driveway", { width: 4, x: 1, y: 2 });
  assert.equal(propertyFeatures(project).driveway.width, 4);
  assert.throws(() => validateProject({ ...project, property: { ...project.property, layout: { ...project.property.layout, structures: [null] } } }));
});

test("site coverage includes detached building footprint without double counting overlaps", () => {
  const original = createProject();
  const { project, id } = addPropertyItem(original, "detachedGarage");
  const positioned = updatePropertyItem(project, id, { x: original.property.houseX, y: original.property.houseY, width: 2, depth: 2 });
  assert.ok(propertyStats(project).footprint >= propertyStats(original).footprint);
  assert.ok(propertyStats(positioned).footprint >= propertyStats(original).footprint);
  const empty = createProject();
  empty.floors.forEach(floor => { floor.rooms = []; });
  const withBuilding = addPropertyItem(empty, "securityHouse").project;
  assert.ok(Math.abs(propertyStats(withBuilding).footprint - 9) < 1e-6);
});
