import test from "node:test";
import assert from "node:assert/strict";
import { createProject, parseProject, validateProject } from "./model.js";
import { featureHost, featureVertices } from "./architecture.js";
import { shiftOpening, openingEditMarkup } from "./opening-edit.js";

const opening = changes => ({
  id: "opening", type: "window", name: "Living window", floorId: "ground", roomId: "living-1",
  side: "north", offset: 1, width: 2, height: 1.2, sill: .8,
  style: "fixed", material: "aluminum", glazing: "double", ...changes,
});
function withOpenings(...features) {
  const project = createProject();
  project.features = features.length ? features : [opening()];
  return project;
}

test("doors and windows move along all four walls without changing other specifications", () => {
  for (const type of ["door", "window"]) for (const side of ["north", "south", "east", "west"]) {
    const feature = opening({ type, side, ...(type === "door" ? { sill: 0, style: "hinged" } : {}) });
    const project = withOpenings(feature);
    const vertical = ["east", "west"].includes(side);
    const result = shiftOpening(project, feature.id, "move", vertical ? 20 : .5, vertical ? .5 : 20);
    assert.deepEqual(result.features[0], { ...feature, offset: 1.5 });
    const before = featureVertices(feature, featureHost(project, feature));
    const after = featureVertices(result.features[0], featureHost(result, result.features[0]));
    assert.equal(after[0][vertical ? 1 : 0] - before[0][vertical ? 1 : 0], .5);
    assert.deepEqual(project.features[0], feature);
  }
});

test("start resizing fixes the far end, end resizing fixes the start, on every wall", () => {
  for (const side of ["north", "south", "east", "west"]) {
    const project = withOpenings(opening({ side }));
    const vertical = ["east", "west"].includes(side);
    const dx = vertical ? 0 : .5, dy = vertical ? .5 : 0;
    const start = shiftOpening(project, "opening", "start", dx, dy).features[0];
    assert.equal(start.offset, 1.5);
    assert.equal(start.width, 1.5);
    assert.equal(start.offset + start.width, 3);
    const end = shiftOpening(project, "opening", "end", dx, dy).features[0];
    assert.equal(end.offset, 1);
    assert.equal(end.width, 2.5);
    const expanded = shiftOpening(project, "opening", "start", -dx, -dy).features[0];
    assert.equal(expanded.offset, .5);
    assert.equal(expanded.width, 2.5);
  }
});

test("movement preserves off-grid offsets without floating point drift", () => {
  let project = withOpenings(opening({ offset: .55 }));
  for (let i = 0; i < 10; i++) project = shiftOpening(project, "opening", "move", .1, 0);
  assert.equal(project.features[0].offset, 1.55);
  for (let i = 0; i < 10; i++) project = shiftOpening(project, "opening", "move", -.1, 0);
  assert.equal(project.features[0].offset, .55);
});

test("movement normal to the wall does not change opening geometry", () => {
  const project = withOpenings();
  assert.deepEqual(shiftOpening(project, "opening", "end", 0, 3), project);
});

test("wall boundaries, minimum and maximum widths are enforced without mutating originals", () => {
  const project = withOpenings();
  const original = JSON.stringify(project);
  for (const [action, distance] of [["move", -1.1], ["move", 3.1], ["start", -1.1], ["start", 1.8], ["end", -1.8], ["end", 3.1]]) {
    assert.throws(() => shiftOpening(project, "opening", action, distance, 0), /fit along/);
  }
  assert.equal(shiftOpening(project, "opening", "start", 1.7, 0).features[0].width, .3);
  assert.equal(shiftOpening(project, "opening", "move", 3, 0).features[0].offset, 4);
  const large = withOpenings();
  large.floors[0].rooms[0].width = 30;
  assert.throws(() => shiftOpening(large, "opening", "end", 10.1, 0), /fit along/);
  assert.equal(JSON.stringify(project), original);
});

test("edits reject overlaps with openings on the same and opposite faces of shared walls", () => {
  const project = withOpenings(opening(), opening({ id: "other", offset: 4, width: 1 }));
  assert.throws(() => shiftOpening(project, "opening", "move", 1.1, 0), /overlaps/);
  assert.throws(() => shiftOpening(project, "opening", "end", 1.1, 0), /overlaps/);
  validateProject(shiftOpening(project, "opening", "end", 1, 0));
  const shared = withOpenings(
    opening({ side: "east", width: 1 }),
    opening({ id: "other", roomId: "kitchen-1", side: "west", offset: 3, width: 1 }),
  );
  assert.throws(() => shiftOpening(shared, "opening", "move", 0, 1.1), /overlaps/);
  assert.equal(shared.features[0].offset, 1);
});

test("only the chosen opening changes, and edited specifications survive saved designs", () => {
  const project = withOpenings(opening(), opening({ id: "upper-window", floorId: "upper", roomId: "bed-1" }));
  const result = shiftOpening(project, "opening", "end", .5, 0);
  assert.equal(result.features[1], project.features[1]);
  assert.equal(result.floors, project.floors);
  assert.deepEqual(parseProject(JSON.stringify(result)), result);
  assert.equal(project.features[0].width, 2);
});

test("invalid inputs and gates are rejected explicitly", () => {
  const project = withOpenings();
  assert.throws(() => shiftOpening(project, "missing", "move", 1, 0), /door or window/);
  assert.throws(() => shiftOpening(project, "opening", "unknown", 1, 0), /valid opening/);
  assert.throws(() => shiftOpening(project, "opening", "move", NaN, 0), /finite/);
  assert.throws(() => shiftOpening(project, "opening", "move", 0, Infinity), /finite/);
  assert.throws(() => shiftOpening(withOpenings(opening({ type: "gate" })), "opening", "move", 1, 0), /door or window/);
});

test("plan controls expose accessible move and resize handles, unit-aware width, and escaped names", () => {
  const feature = opening({ id: 'id"unsafe', name: '<img src=x onerror="bad">' });
  const vertices = [[1, 0], [3, 0]];
  const point = (x, y) => ({ x: x * 40, y: y * 40 });
  const metric = openingEditMarkup(feature, vertices, point);
  for (const action of ["move", "start", "end"]) assert.match(metric, new RegExp(`data-opening-action="${action}"`));
  assert.equal((metric.match(/tabindex="0"/g) || []).length, 3);
  assert.ok(metric.includes('data-feature="id&quot;unsafe"'));
  assert.ok(metric.includes("&lt;img"));
  assert.ok(!metric.includes("<img"));
  assert.match(metric, />2 m<\/text>/);
  assert.match(openingEditMarkup(feature, vertices, point, "imperial"), /ft/);
  assert.match(openingEditMarkup({ ...feature, side: "east" }, vertices, point), /ns-resize/);
});
