import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CAMERA, cameraFromDrag, createCamera, normalizeCamera, sortFaces } from "./camera.js";
import { createProject, exteriorWalls } from "./model.js";
import { renderFloor3D } from "./floor-view.js";
import { renderPropertyView } from "./property-view.js";

test("orbit angles wrap horizontally and clamp elevation without singular views", () => {
  assert.deepEqual(normalizeCamera({ yaw: -45, pitch: 0 }), { yaw: 315, pitch: 10 });
  assert.deepEqual(normalizeCamera({ yaw: 765, pitch: 100 }), { yaw: 45, pitch: 80 });
  for (const angles of [{ yaw: NaN, pitch: 30 }, { yaw: 45, pitch: Infinity }]) assert.throws(() => createCamera(angles), /finite/);
  const project = createCamera().project;
  assert.ok(project(1, 0).x > 0 && project(0, 1).x < 0);
  assert.ok(project(0, 0, 1).y < 0);
  for (const yaw of [0, 45, 90, 180, 270, 360]) {
    for (const pitch of [10, 30, 80]) {
      const { x, y } = createCamera({ yaw, pitch }).project(200, -200, 48);
      assert.ok(Number.isFinite(x) && Number.isFinite(y));
    }
  }
});

test("dragging moves the near side of the model with the pointer in both axes", () => {
  for (const yaw of [0, 45, 90, 135, 180, 225, 270, 315]) {
    const start = { yaw, pitch: 30 }, initial = createCamera(start);
    const near = [initial.toward.x, initial.toward.y, 0];
    const before = initial.project(...near);
    assert.ok(createCamera(cameraFromDrag(start, 20, 0)).project(...near).x > before.x, `right drag at ${yaw}`);
    assert.ok(createCamera(cameraFromDrag(start, -20, 0)).project(...near).x < before.x, `left drag at ${yaw}`);
    assert.ok(createCamera(cameraFromDrag(start, 0, 20)).project(...near).y > before.y, `down drag at ${yaw}`);
    assert.ok(createCamera(cameraFromDrag(start, 0, -20)).project(...near).y < before.y, `up drag at ${yaw}`);
  }
  assert.deepEqual(cameraFromDrag(DEFAULT_CAMERA, 100, 50), { yaw: 0, pitch: 45 });
  assert.deepEqual(cameraFromDrag(DEFAULT_CAMERA, 200, -200), { yaw: 315, pitch: 10 });
  assert.deepEqual(cameraFromDrag(DEFAULT_CAMERA, 0, 200), { yaw: 45, pitch: 80 });
  assert.deepEqual(DEFAULT_CAMERA, { yaw: 45, pitch: 30 });
});

test("the camera exposes the correct facades from all four quadrants", () => {
  const visible = yaw => Object.entries(createCamera({ yaw, pitch: 30 }).faces).filter(([, value]) => value).map(([key]) => key).sort();
  assert.deepEqual(visible(45), ["east", "south"]);
  assert.deepEqual(visible(135), ["east", "north"]);
  assert.deepEqual(visible(225), ["north", "west"]);
  assert.deepEqual(visible(315), ["south", "west"]);
  const rooms = [{ x: 0, y: 0, width: 4, depth: 4 }, { x: 4, y: 0, width: 4, depth: 2 }];
  const walls = exteriorWalls(rooms, ["west", "north"]);
  assert.equal(walls.reduce((sum, w) => sum + w.to - w.from, 0), 12);
  assert.ok(!walls.some(w => w.axis === "west" && w.at === 4));
});

test("surface ordering keeps roofs above floors independent of viewing direction", () => {
  const vertices = z => [[0, 0, z], [5, 0, z], [5, 5, z], [0, 5, z]];
  const faces = [{ vertices: vertices(3), id: "roof" }, { vertices: vertices(0), id: "floor" }];
  for (const yaw of [0, 45, 90, 135, 180, 225, 270, 315]) {
    assert.deepEqual(sortFaces(faces, createCamera({ yaw, pitch: 60 })).map(f => f.id), ["floor", "roof"]);
  }
  assert.deepEqual(sortFaces([], createCamera()), []);
});

test("overlapping wall projections reverse their painter order across the house", () => {
  const wall = (x, id) => ({ id, vertices: [[x, 0, 0], [x, 10, 0], [x, 10, 4], [x, 0, 4]] });
  const faces = [wall(2, "east"), wall(0, "west")];
  assert.deepEqual(sortFaces(faces, createCamera({ yaw: 45, pitch: 30 })).map(f => f.id), ["west", "east"]);
  assert.deepEqual(sortFaces(faces, createCamera({ yaw: 225, pitch: 30 })).map(f => f.id), ["east", "west"]);
});

test("both 3D renderers support all orbit angles and leave the project unchanged", () => {
  const p = createProject(), before = JSON.stringify(p);
  const seen = new Set();
  for (const yaw of [0, 45, 90, 135, 180, 225, 270, 315]) {
    for (const pitch of [10, 30, 80]) {
      const camera = { yaw, pitch };
      for (const roof of [false, true]) {
        const markup = renderPropertyView(p, { view: "3d", camera, roof }).markup;
        assert.doesNotMatch(markup, /NaN|undefined|Infinity/);
        for (const [side, visible] of Object.entries(createCamera(camera).faces)) {
          assert.equal(markup.includes(`data-exterior-wall="${side}"`), visible);
        }
        assert.ok(markup.includes('data-floor-level="0"') && markup.includes('data-floor-level="1"'));
        seen.add(markup);
      }
      const floor = renderFloor3D(p.floors[0].rooms, { camera });
      assert.doesNotMatch(floor, /NaN|undefined|Infinity/);
      assert.equal((floor.match(/class="iso-room"/g) || []).length, p.floors[0].rooms.length);
    }
  }
  assert.equal(seen.size, 48);
  assert.equal(JSON.stringify(p), before);
  assert.equal(renderFloor3D([]), "");
});

test("2D plans ignore orbit, while horizontal and vertical rotation change 3D geometry", () => {
  const p = createProject();
  assert.equal(renderPropertyView(p).markup, renderPropertyView(p, { camera: { yaw: 225, pitch: 75 } }).markup);
  for (const camera of [{ yaw: 135, pitch: 30 }, { yaw: 45, pitch: 70 }]) {
    assert.notEqual(renderPropertyView(p, { view: "3d" }).markup, renderPropertyView(p, { view: "3d", camera }).markup);
    assert.notEqual(renderFloor3D(p.floors[0].rooms), renderFloor3D(p.floors[0].rooms, { camera }));
  }
  assert.deepEqual(DEFAULT_CAMERA, { yaw: 45, pitch: 30 });
});
