import test from "node:test";
import assert from "node:assert/strict";
import { createProject, createRoom, roomArea, roomVertices, validateProject } from "./model.js";
import { shiftSpaceBoundary } from "./space-edit.js";

const room = (id, x = 0, y = 0, width = 4, depth = 4) => createRoom(id, "living", id, x, y, width, depth);
const shift = (rooms, index, dx, dy, shared = false, mode = "wall") =>
  shiftSpaceBoundary(rooms, rooms[0].id, mode, index, dx, dy, shared);

test("walls expand and contract beyond original bounds with the opposite wall fixed", () => {
  const original = [room("a")];
  for (const [index, dx, dy, expected] of [
    [0, 0, -1, { x: 0, y: -1, width: 4, depth: 5 }],
    [1, 1, 0, { x: 0, y: 0, width: 5, depth: 4 }],
    [2, 0, 1, { x: 0, y: 0, width: 4, depth: 5 }],
    [3, -1, 0, { x: -1, y: 0, width: 5, depth: 4 }],
    [1, -1, 0, { x: 0, y: 0, width: 3, depth: 4 }],
  ]) {
    const [updated] = shift(original, index, dx, dy);
    for (const key of ["x", "y", "width", "depth"]) assert.equal(updated[key], expected[key]);
    assert.equal(updated.outline, undefined);
  }
  assert.deepEqual(original, [room("a")]);
});

test("wall shifts are perpendicular, including diagonal custom walls", () => {
  assert.equal(shift([room("a")], 1, 0, 2)[0].width, 4);
  const triangle = { ...room("a"), outline: [[0, 0], [4, 0], [0, 4]] };
  const [updated] = shift([triangle], 1, 1, 0);
  assert.deepEqual(roomVertices(updated), [[0, 0], [4.5, .5], [.5, 4.5]]);
});

test("corners can expand the bounds while preserving untouched vertices", () => {
  const [updated] = shift([room("a")], 0, -1, -2, false, "corner");
  assert.deepEqual(roomVertices(updated), [[-1, -2], [4, 0], [4, 4], [0, 4]]);
  assert.equal(updated.width, 5);
  assert.equal(updated.depth, 6);
});

test("shared resizing changes both rooms atomically; independent mode leaves neighbors alone", () => {
  const rooms = [room("a"), room("b", 4)];
  const independent = shift(rooms, 1, 1, 0);
  assert.equal(independent[1], rooms[1]);
  const shared = shift(rooms, 1, 1, 0, true);
  assert.deepEqual(shared.map(r => [r.x, r.width, r.outline]), [[0, 5, undefined], [5, 3, undefined]]);
  assert.equal(shared.reduce((sum, r) => sum + roomArea(r), 0), 32);
  assert.deepEqual(rooms, [room("a"), room("b", 4)]);
});

test("shared mode moves multiple neighbors and preserves junctions on partial walls", () => {
  const rooms = [room("a"), room("b", 4, 0, 4, 2), room("c", 4, 2, 4, 2), room("untouched", 20)];
  const updated = shift(rooms, 1, 1, 0, true);
  assert.equal(updated[1].x, 5);
  assert.equal(updated[2].x, 5);
  assert.equal(updated[3], rooms[3]);
  const partial = shift([room("a", 0, 1, 4, 2), room("b", 4, 0, 4, 4)], 1, 1, 0, true);
  assert.deepEqual(roomVertices(partial[1]), [[4, 0], [8, 0], [8, 4], [4, 4], [5, 3], [5, 1]]);
});

test("shared corner shifts insert matching junctions and leave disconnected rooms untouched", () => {
  const updated = shift([room("a"), room("b", 4), room("c", 20)], 1, .5, -.5, true, "corner");
  assert.deepEqual(roomVertices(updated[0])[1], [4.5, -.5]);
  assert.deepEqual(roomVertices(updated[1])[0], [4.5, -.5]);
  assert.deepEqual(updated[2], room("c", 20));
});

test("invalid movements reject rather than mutate or invert rooms", () => {
  const rooms = [room("a"), room("b", 4)];
  for (const dx of [-4, -5, 30]) assert.throws(() => shift(rooms, 1, dx, 0));
  assert.throws(() => shift(rooms, 1, 3.5, 0, true), /dimensions/);
  assert.throws(() => shift(rooms, 99, 1, 0), /valid wall/);
  assert.throws(() => shift(rooms, 1, NaN, 0), /finite/);
  assert.deepEqual(rooms, [room("a"), room("b", 4)]);
});

test("resized rooms preserve valid opening specifications and reject invalid ones", () => {
  const project = createProject();
  project.features = [{
    id: "window", name: "Living window", type: "window", floorId: "ground", roomId: "living-1",
    side: "north", offset: 1, width: 1, height: 1, sill: 1,
    style: "fixed", material: "aluminum", glazing: "double",
  }];
  project.floors[0].rooms = shiftSpaceBoundary(project.floors[0].rooms, "living-1", "wall", 1, 1, 0);
  validateProject(project);
  const tooSmall = structuredClone(project);
  tooSmall.features[0].offset = 5;
  tooSmall.floors[0].rooms = shiftSpaceBoundary(tooSmall.floors[0].rooms, "living-1", "wall", 1, -2, 0);
  assert.throws(() => validateProject(tooSmall), /fit along/);
  const invalid = structuredClone(project);
  invalid.floors[0].rooms = shiftSpaceBoundary(invalid.floors[0].rooms, "living-1", "corner", 1, .5, .5);
  assert.throws(() => validateProject(invalid), /custom room corners/);
  assert.equal(project.floors[0].rooms[0].width, 7);
});

test("edited geometry persists through project serialization", () => {
  const project = createProject();
  project.floors[0].rooms = shiftSpaceBoundary(project.floors[0].rooms, "living-1", "wall", 1, .5, 0, true);
  validateProject(project);
  const restored = JSON.parse(JSON.stringify(project));
  validateProject(restored);
  assert.deepEqual(restored, project);
});
