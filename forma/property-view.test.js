import test from "node:test";
import assert from "node:assert/strict";
import { createProject } from "./model.js";
import { renderPropertyView, propertyFeatures } from "./property-view.js";

test("site plan shows the lot, street, ground rooms and all upper footprints", () => {
  const p = createProject();
  const { markup, scale } = renderPropertyView(p);
  assert.ok(scale > 0);
  for (const marker of ['data-property-boundary="true"', 'data-property-road="true"', 'data-site-upper-floor="upper"', 'data-room="living-1"', "26 m", "32 m", "OAK LANE"]) assert.ok(markup.includes(marker), marker);
  assert.doesNotMatch(markup, /NaN|undefined|Infinity/);
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
