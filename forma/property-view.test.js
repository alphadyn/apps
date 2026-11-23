import test from "node:test";
import assert from "node:assert/strict";
import { createProject, createRoom } from "./model.js";
import { renderPropertyView, propertyFeatures } from "./property-view.js";

test("site plan shows the lot, street, ground rooms and all upper footprints", () => {
  const p = createProject();
  const { markup, scale } = renderPropertyView(p);
  assert.ok(scale > 0);
  for (const marker of ['data-property-boundary="true"', 'data-property-road="true"', 'data-site-upper-floor="upper"', 'data-room="living-1"', "26 m", "32 m", "OAK LANE"]) assert.ok(markup.includes(marker), marker);
  assert.doesNotMatch(markup, /NaN|undefined|Infinity/);
});

test("site-plan dimensions follow the selected measurement system", () => {
  const { markup } = renderPropertyView(createProject(), { units: "imperial" });
  assert.ok(markup.includes("85.3 ft"));
  assert.ok(markup.includes("104.99 ft"));
});

test("custom room outlines render in the property plan and exterior wall study", () => {
  const project = createProject();
  project.floors[0].rooms[0].outline = [[0, 0], [6, 0], [6, 2], [3, 5], [0, 5]];
  const plan = renderPropertyView(project).markup;
  assert.ok(plan.includes('data-room="living-1"'));
  const model = renderPropertyView(project, { view: "3d" }).markup;
  assert.ok(model.includes('data-exterior-wall="custom"'));
  assert.doesNotMatch(model, /NaN|undefined|Infinity/);
});

test("full-house 3D stacks every floor with exterior windows and optional roofs", () => {
  const p = createProject();
  const normal = renderPropertyView(p, { view: "3d" }).markup;
  for (const marker of ['data-floor-level="0"', 'data-floor-level="1"', 'data-roof-level="0"', 'data-roof-level="1"', "data-exterior-window", "5.6 m HIGH"]) assert.ok(normal.includes(marker), marker);
  const open = renderPropertyView(p, { view: "3d", roof: false }).markup;
  assert.ok(open.includes("OPEN-TOP STUDY"));
  assert.ok(!open.includes("data-roof-level"));
  assert.ok(!open.includes("data-exterior-window"));
});

test("full-house 3D adds layered facade, window, roof, shadow, and landscape detail", () => {
  const { markup } = renderPropertyView(createProject(), { view: "3d" });
  for (const marker of ['data-facade-finish="true"', 'data-facade-plinth="true"', 'data-window-glass="true"', 'data-window-mullion="true"', 'data-window-sill="true"', 'url(#property-roof)', 'data-house-shadow="true"', 'data-tree-canopy="true"']) {
    assert.ok(markup.includes(marker), marker);
  }
  assert.doesNotMatch(markup, /NaN|undefined|Infinity/);
});

test("roof textures have an opaque base so lower floors cannot show through", () => {
  const { markup } = renderPropertyView(createProject(), { view: "3d" });
  const pattern = markup.match(/<pattern id="property-roof"[^>]*>([\s\S]*?)<\/pattern>/)[1];
  assert.match(pattern, /<rect width="18" height="18" fill="#d9dece"\/>/);
  assert.match(markup, /data-roof-level="\d+" data-roof-finish="membrane"/);
  assert.match(markup, /style="stroke:#d9dece;stroke-width:\.5;stroke-linejoin:round"/);
});

test("stacked facades meet exactly at floor elevations throughout orbit and tilt", () => {
  for (const outline of [undefined, [[0, 0], [6, 0], [6, 2], [3, 5], [0, 5]]]) {
    const project = createProject();
    project.floors = ["lower", "upper"].map(id => ({
      id, name: id, rooms: [{ ...createRoom(`${id}-room`, "living", id, 0, 0, 6, 5), ...(outline ? { outline } : {}) }],
    }));
    for (const yaw of [0, 45, 90, 135, 180, 225, 270, 315]) {
      for (const pitch of [10, 30, 70, 80]) {
        const { markup } = renderPropertyView(project, { view: "3d", camera: { yaw, pitch } });
        const levels = { lower: new Map(), upper: new Map() };
        for (const group of markup.matchAll(/<g class="property-floor" data-property-floor="([^"]+)"[^>]*>([\s\S]*?)<\/g>/g)) {
          for (const face of group[2].matchAll(/<polygon points="([^"]+)"[^>]*data-exterior-wall="([^"]+)"/g)) {
            levels[group[1]].set(face[2], face[1].split(" "));
          }
        }
        assert.ok(levels.lower.size > 0, `visible facade at ${yaw}/${pitch}`);
        assert.equal(levels.lower.size, levels.upper.size);
        for (const [side, lower] of levels.lower) {
          const upper = levels.upper.get(side);
          assert.deepEqual([lower[3], lower[2]], upper.slice(0, 2), `${side} joins at ${yaw}/${pitch}`);
        }
      }
    }
  }
});

test("landscape and driveway settings are reflected in both property views", () => {
  const p = createProject();
  const f = propertyFeatures(p);
  assert.ok(f.trees.length > 0);
  assert.ok(f.driveway.depth > 0);
  for (const t of f.trees) {
    assert.ok(t.x - t.radius >= 0 && t.x + t.radius <= p.property.width);
    assert.ok(t.y - t.radius >= 0 && t.y + t.radius <= p.property.depth);
  }
  p.property.landscaping = false;
  p.property.driveway = false;
  for (const view of ["2d", "3d"]) {
    const markup = renderPropertyView(p, { view }).markup;
    assert.ok(!markup.includes("data-landscape-tree"));
    assert.ok(!markup.includes("data-property-driveway"));
  }
});

test("empty, displaced, and eight-level projects produce finite geometry", () => {
  const p = createProject();
  p.property.houseX = -30;
  p.property.houseY = 60;
  for (let i = 2; i < 8; i++) p.floors.push({ id: `floor-${i}`, name: `Level ${i}`, rooms: [{ ...p.floors[0].rooms[0], id: `living-${i}` }] });
  for (const view of ["2d", "3d"]) {
    const result = renderPropertyView(p, { view });
    assert.ok(Number.isFinite(result.scale) && result.scale > 0);
    assert.doesNotMatch(result.markup, /NaN|undefined|Infinity/);
  }
  p.floors = [{ id: "empty", name: "Ground floor", rooms: [] }];
  assert.doesNotMatch(renderPropertyView(p, { view: "3d" }).markup, /NaN|undefined|Infinity/);
  assert.equal(propertyFeatures(p).driveway, null);
});

test("site text is escaped and dimensions and labels honor their controls", () => {
  const p = createProject();
  p.property.roadName = '<script>alert("street")</script>';
  assert.ok(!renderPropertyView(p).markup.includes("<script>"));
  assert.ok(renderPropertyView(p).markup.includes("&lt;SCRIPT&gt;"));
  const hidden = renderPropertyView(p, { dimensions: false, labels: false }).markup;
  assert.ok(!hidden.includes("26 m"));
  assert.ok(!hidden.includes("LANDSCAPED GROUNDS"));
});
