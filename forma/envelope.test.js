import test from "node:test";
import assert from "node:assert/strict";
import { createProject, createRoom, validateProject, validateRoom, parseProject, propertyStats } from "./model.js";
import { roofSettings, railingSettings, exposedRoofEdge, edgePrism, surfaceMarkup } from "./envelope.js";
import { fromMeters } from "./units.js";
import { outdoorControlsMarkup, roofControlsMarkup, readOutdoorControls, readRoofControls } from "./envelope-ui.js";
import { renderPropertyView } from "./property-view.js";
import { renderFloor3D } from "./floor-view.js";

test("legacy designs keep glass railings and membrane roofs without adding saved fields", () => {
  const project = createProject(), before = JSON.stringify(project);
  const room = project.floors[0].rooms.find(r => r.type === "terrace");
  assert.deepEqual(railingSettings({ ...room, railing: true }), { enabled: true, style: "glass", height: 1.1 });
  assert.deepEqual(roofSettings(project), { finish: "membrane", parapet: false, height: .45 });
  assert.deepEqual(parseProject(before), project);
  assert.equal(JSON.stringify(project), before);
});

test("outdoor and roof settings validate and round-trip with the project", () => {
  const project = createProject(), room = project.floors[0].rooms.find(r => r.type === "terrace");
  Object.assign(room, { railing: true, railingStyle: "metal", railingHeight: 1.4, material: "tile" });
  project.roof = { finish: "gravel", parapet: true, height: .6 };
  assert.equal(validateProject(project), project);
  assert.deepEqual(parseProject(JSON.stringify(project)), project);
  assert.ok(Math.abs(propertyStats(project).height - 6.2) < 1e-8);
  for (const railingStyle of ["glass", "metal", "solid"]) assert.equal(validateRoom({ ...room, railingStyle }).railingStyle, railingStyle);
  for (const fields of [{ railingHeight: .59 }, { railingHeight: 1.81 }, { railingHeight: NaN }, { railingHeight: "1.1" }, { railingStyle: "unknown" }, { railingStyle: "__proto__" }]) {
    assert.throws(() => validateRoom({ ...room, ...fields }), /[Rr]ailing/);
  }
  assert.throws(() => validateRoom({ ...project.floors[0].rooms[0], railingStyle: "metal" }), /[Rr]ailing/);
  for (const roof of [null, { finish: "unknown", parapet: true, height: .4 }, { finish: "__proto__", parapet: true, height: .4 }, { finish: "tile", parapet: "yes", height: .4 }, { finish: "tile", parapet: true, height: .1 }, { finish: "tile", parapet: true, height: Infinity }]) {
    assert.throws(() => validateProject({ ...project, roof }), /[Rr]oof/);
  }
});

test("parapets split around partially covered edges and exclude terrace access footprints", () => {
  const edge = { a: [0, 0], b: [10, 0], normal: [0, -1] };
  const partial = [[2, 0], [7, 0], [7, 4], [2, 4]];
  assert.deepEqual(exposedRoofEdge(edge, [partial]).map(e => [e.a, e.b]), [[[0, 0], [2, 0]], [[7, 0], [10, 0]]]);
  assert.deepEqual(exposedRoofEdge(edge, [[[0, 0], [10, 0], [10, 4], [0, 4]]]), []);
  assert.deepEqual(exposedRoofEdge(edge, []), [edge]);
  const diagonal = { a: [0, 0], b: [10, 10], normal: [1, -1] };
  assert.equal(exposedRoofEdge(diagonal, [[[0, 0], [5, 0], [5, 10], [0, 10]]])[0].a[0], 5);
  const prism = edgePrism(edge.a, edge.b, edge.normal, 3, .6);
  assert.equal(prism.length, 5);
  assert.ok(prism.every(face => face.vertices.every(vertex => vertex[2] >= 3 && vertex[2] <= 3.6)));
});

test("roof decks do not acquire parapets underneath them or phantom extra height", () => {
  const project = createProject();
  project.roof = { finish: "tile", parapet: true, height: 1.2 };
  project.floors = [
    { id: "base", name: "Base", rooms: [createRoom("living", "living", "Living", 0, 0, 6, 5)] },
    { id: "roof", name: "Roof deck", rooms: [createRoom("deck", "terrace", "Roof deck", 0, 0, 6, 5)] },
  ];
  assert.equal(propertyStats(project).height, project.ceiling + .08);
  assert.doesNotMatch(renderPropertyView(project, { view: "3d" }).markup, /data-roof-parapet/);
  project.floors[1].rooms[0].width = 3;
  assert.match(renderPropertyView(project, { view: "3d" }).markup, /data-roof-parapet/);
});

test("finishes, slabs, parapets, and every railing style render across orbit extremes", () => {
  const project = createProject(), room = project.floors[0].rooms.find(r => r.type === "terrace");
  room.outline = [[0, 0], [10, 0], [8, 2.5], [0, 2.5]];
  Object.assign(room, { railing: true, railingHeight: 1.5 });
  for (const style of ["glass", "metal", "solid"]) for (const material of ["deck", "tile", "concrete"]) {
    room.railingStyle = style; room.material = material;
    project.roof = { finish: material === "deck" ? "gravel" : material === "tile" ? "tile" : "membrane", parapet: true, height: .5 };
    const before = JSON.stringify(project);
    for (const yaw of [0, 45, 135, 225, 315]) for (const pitch of [10, 80]) {
      const options = { view: "3d", camera: { yaw, pitch } };
      const house = renderPropertyView(project, options).markup;
      const floor = renderFloor3D([room], options);
      for (const markup of [house, floor]) {
        assert.match(markup, new RegExp(`data-railing-style="${style}"`));
        assert.match(markup, new RegExp(`data-surface-finish="${material}"`));
        assert.doesNotMatch(markup, /NaN|undefined|Infinity/);
      }
      assert.match(house, /data-outdoor-slab="true"/);
      assert.match(house, /data-roof-parapet="true"/);
      assert.match(house, new RegExp(`data-roof-finish="${project.roof.finish}"`));
    }
    assert.equal(JSON.stringify(project), before);
  }
  assert.doesNotMatch(renderPropertyView(project, { view: "3d", roof: false }).markup, /data-roof-parapet|data-roof-level/);
  assert.match(renderPropertyView(project, { view: "2d" }).markup, /data-railing-style="solid"/);
  room.railing = false;
  assert.doesNotMatch(renderFloor3D([room]), /data-terrace-railing/);
});

test("finish geometry is clipped to custom outlines and has an opaque base", () => {
  const vertices = [[0, 0, 3], [4, 0, 3], [2, 2, 3]];
  const markup = surfaceMarkup(vertices, "tile", (x, y) => ({ x, y }), "test-finish");
  assert.match(markup, /clip-path="url\(#test-finish\)"/);
  assert.match(markup, /fill="#dddace"/);
  assert.throws(() => surfaceMarkup(vertices, "unknown", (x, y) => ({ x, y }), "test"), /finish/);
});

test("finish clips stay scoped to each gallery scene instead of clipping other previews", () => {
  const project = createProject();
  const first = renderPropertyView(project, { view: "3d", idPrefix: "first" }).markup;
  const second = renderPropertyView(project, { view: "3d", idPrefix: "second" }).markup;
  const ids = [...(first + second).matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length);
  assert.match(first, /clip-path="url\(#first-property-finish-/);
  assert.match(second, /clip-path="url\(#second-property-finish-/);
});

test("unit-aware controls preserve disabled railing choices and use project validation for errors", () => {
  const room = { railing: false, railingStyle: "solid", railingHeight: 1.2 };
  const outdoor = outdoorControlsMarkup(room, "imperial");
  assert.match(outdoor, /Railing height \(ft\)/);
  assert.match(outdoor, /value="solid" selected/);
  assert.match(roofControlsMarkup(createProject()), /Flat-roof details/);
  const data = new Map([["railingStyle", "metal"], ["railingHeight", "4"], ["roofFinish", "gravel"], ["roofParapet", "on"], ["roofHeight", "2"]]);
  assert.deepEqual(readOutdoorControls(data, "imperial"), { railing: false, railingStyle: "metal", railingHeight: 1.2192 });
  assert.deepEqual(readRoofControls(data, "imperial"), { finish: "gravel", parapet: true, height: .6096 });
  for (const height of [.6, 1.8]) {
    data.set("railingHeight", String(fromMeters(height, "imperial")));
    const updated = { ...createRoom("edge", "balcony", "Balcony", 0, 0, 4, 2), ...readOutdoorControls(data, "imperial") };
    assert.equal(validateRoom(updated), updated);
  }
});
