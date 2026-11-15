import test from "node:test";
import assert from "node:assert/strict";
import { SAMPLE_DESIGNS, createSampleDesign } from "./samples.js";
import { createProject, isOutdoor, projectStats, propertyStats, unionArea, validateProject, parseProject } from "./model.js";
import { renderPropertyView } from "./property-view.js";
import { renderFloor3D } from "./floor-view.js";

test("fourteen samples cover different sizes, bedroom counts, levels and footprints", () => {
  assert.equal(SAMPLE_DESIGNS.length, 14);
  assert.equal(new Set(SAMPLE_DESIGNS.map(s => s.id)).size, 14);
  const expected = {
    "pocket-retreat": [80, 1, 1, 1],
    "garden-bungalow": [150, 2, 1, 1],
    "courtyard-house": [205, 3, 2, 2],
    "terrace-townhouse": [252, 3, 3, 3],
    "l-shaped-residence": [248, 3, 2, 1],
    "family-pavilion": [450, 4, 4, 2],
    "urban-duplex": [240, 3, 3, 2],
    "garden-duplex": [364, 4, 4, 2],
    "palm-maisonette": [176, 2, 2, 2],
    "terrace-maisonette": [288, 3, 3, 2],
    "horizon-mansion": [720, 5, 6, 2],
    "grand-courtyard-estate": [1088, 6, 7, 3],
    "roof-garden-family-home": [360, 3, 3, 3],
    "skyline-family-house": [511, 4, 4, 3],
  };
  for (const sample of SAMPLE_DESIGNS) {
    const design = sample.create(), stats = projectStats(design);
    assert.equal(validateProject(design), design);
    assert.deepEqual([stats.area, stats.bedrooms, stats.bathrooms, stats.floors], expected[sample.id], sample.id);
    assert.ok(sample.description && sample.story && sample.highlights.length >= 3);
    assert.equal(propertyStats(design).outsideRooms.length, 0, `${sample.id} fits inside its lot`);
    const enclosed = design.floors[0].rooms.filter(r => !isOutdoor(r));
    if (sample.id === "l-shaped-residence") {
      assert.equal(unionArea(enclosed), 172);
      assert.ok(enclosed.every(r => r.x < 8 || r.y < 6));
    }
    if (sample.id === "family-pavilion") {
      const upper = design.floors[1].rooms.filter(r => !isOutdoor(r));
      assert.ok(unionArea(upper) < unionArea(enclosed), "pavilion upper floor is stepped back");
    }
  }
});

test("single-family rooftop samples include railed terraces, stair access and editable opening specifications", () => {
  for (const id of ["roof-garden-family-home", "skyline-family-house"]) {
    const design = createSampleDesign(id), roof = design.floors.at(-1);
    assert.ok(roof.rooms.some(r => r.type === "terrace" && r.railing));
    assert.ok(roof.rooms.some(r => r.type === "stairs"));
    assert.ok(design.features.some(f => f.floorId === roof.id && f.type === "door"));
    assert.ok(design.features.some(f => f.type === "gate"));
    assert.ok(design.features.some(f => f.type === "window" && f.glazing === "double"));
    assert.match(renderPropertyView(design, { view: "3d" }).markup, /data-terrace-railing/);
  }
});
test("duplexes, maisonettes and mansions have their advertised distinguishing features", () => {
  for (const id of ["urban-duplex", "garden-duplex", "palm-maisonette", "terrace-maisonette"]) {
    const design = createSampleDesign(id);
    assert.equal(design.floors.length, 2);
    assert.ok(design.floors[0].rooms.some(r => r.type === "entry"), `${id}: ground-floor entrance`);
    assert.ok(design.floors[1].rooms.some(r => r.type === "bedroom"), `${id}: upstairs bedrooms`);
  }
  const horizon = createSampleDesign("horizon-mansion");
  assert.ok(horizon.floors[0].rooms.some(r => r.type === "garage" && r.width >= 9));
  assert.equal(unionArea(horizon.floors[1].rooms.filter(r => r.type === "balcony")), 70);
  const estate = createSampleDesign("grand-courtyard-estate");
  const ground = estate.floors[0].rooms.filter(r => !isOutdoor(r));
  assert.equal(unionArea(ground), 384);
  assert.ok(ground.every(r => r.x < 8 || r.x >= 16 || r.y >= 6), "estate wings frame an open court");
  assert.ok(estate.floors.slice(1).every(f => f.rooms.every(r =>
    r.x + r.width <= 8 || r.x >= 16 || r.y >= 4
  )), "the garden court stays open to the sky above its rear 32 square meters");
  assert.ok(estate.floors[2].rooms.some(r => r.name === "Cinema"));
  assert.ok(estate.floors[2].rooms.some(r => r.name === "Wellness studio"));
  assert.ok(unionArea(estate.floors[2].rooms.filter(r => !isOutdoor(r))) < unionArea(ground));
});

test("sample rooms never overlap on a floor and upper rooms are supported", () => {
  for (const sample of SAMPLE_DESIGNS) {
    const design = sample.create();
    design.floors.forEach((f, index) => {
      for (let i = 0; i < f.rooms.length; i++) {
        const a = f.rooms[i];
        for (const b of f.rooms.slice(i + 1)) {
          const overlaps = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.depth && a.y + a.depth > b.y;
          assert.ok(!overlaps, `${sample.id}: ${a.name} overlaps ${b.name}`);
        }
      }
      if (index) {
        const lower = design.floors[index - 1].rooms;
        const enclosed = f.rooms.filter(r => !isOutdoor(r));
        assert.equal(unionArea([...lower, ...enclosed]), unionArea(lower), `${sample.id}: upper enclosed rooms lie over the floor below`);
        const stairs = f.rooms.find(r => r.type === "stairs");
        assert.ok(stairs && lower.some(r => r.type === "stairs" && r.x === stairs.x && r.y === stairs.y && r.width === stairs.width && r.depth === stairs.depth), `${sample.id}: stairs align`);
      }
    });
  }
});

test("each sample opens as a fresh copy without mutating templates or the starter", () => {
  const starter = createProject();
  for (const sample of SAMPLE_DESIGNS) {
    const first = createSampleDesign(sample.id), saved = JSON.stringify(first);
    first.name = "Changed home";
    first.property.width = 100;
    first.floors[0].rooms[0].width = 1;
    first.floors.push({ id: "extra", name: "Extra floor", rooms: [] });
    assert.equal(JSON.stringify(sample.create()), saved);
    assert.deepEqual(parseProject(saved), createSampleDesign(sample.id));
  }
  assert.deepEqual(createProject(), starter);
  assert.throws(() => createSampleDesign("missing-sample"), /not available/);
});

test("all samples render as complete property plans and 3D floor previews", () => {
  for (const sample of SAMPLE_DESIGNS) {
    const design = sample.create();
    for (const view of ["2d", "3d"]) {
      const result = renderPropertyView(design, { view });
      assert.ok(result.scale > 0);
      assert.doesNotMatch(result.markup, /NaN|undefined|Infinity/, `${sample.id}: ${view}`);
    }
    for (const f of design.floors) {
      const markup = renderFloor3D(f.rooms, { ceiling: design.ceiling, features: (design.features || []).filter(item => item.floorId === f.id) });
      assert.doesNotMatch(markup, /NaN|undefined|Infinity/, `${sample.id}: ${f.name}`);
      assert.equal((markup.match(/class="iso-room"/g) || []).length, f.rooms.length);
    }
  }
});
