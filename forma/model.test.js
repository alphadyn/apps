import test from "node:test";
import assert from "node:assert/strict";
import { TYPES, createProject, defaultProperty, floorArea, projectStats, propertyStats, validateProject, validateProperty, validateRoom, makeRoom, parseProject, readProjectFile, bounds, unionArea, exteriorWalls } from "./model.js";

test("sample home has editable essentials and accurate totals across both floors", () => {
  const p = createProject();
  assert.equal(validateProject(p), p);
  assert.deepEqual(projectStats(p), { area: 205, bedrooms: 3, bathrooms: 2, floors: 2, rooms: 13 });
  assert.equal(floorArea(p.floors[0]), 115);
  assert.deepEqual(bounds(p.floors[0].rooms), { x: 0, y: 0, width: 10, depth: 11.5 });
  for (const type of ["bedroom", "bathroom", "kitchen", "stairs", "living", "dining"]) {
    assert.ok(p.floors.some(f => f.rooms.some(r => r.type === type)));
  }
});
test("new rooms find unoccupied half-meter positions and validate", () => {
  const rooms = createProject().floors[0].rooms;
  const added = makeRoom("bedroom", rooms);
  validateRoom(added);
  assert.equal(added.x * 2 % 1, 0);
  assert.equal(added.y * 2 % 1, 0);
  assert.ok(rooms.every(r => added.x >= r.x + r.width || added.x + added.width <= r.x || added.y >= r.y + r.depth || added.y + added.depth <= r.y));
  for (const type of ["unknown", "__proto__", "toString", "constructor"]) assert.throws(() => makeRoom(type, []), /supported/);
  assert.throws(() => makeRoom("bedroom", Array(80).fill(rooms[0])), /80/);
});
test("room properties reject invalid dimensions, positions, types, and finishes", () => {
  const room = createProject().floors[0].rooms[0];
  for (const key of ["width", "depth"]) {
    for (const value of [0, .9, 30.1, NaN, Infinity, "4", null]) assert.throws(() => validateRoom({ ...room, [key]: value }));
  }
  for (const key of ["x", "y"]) {
    for (const value of [-201, 201, NaN, Infinity, null]) assert.throws(() => validateRoom({ ...room, [key]: value }));
  }
  for (const update of [{ name: "" }, { name: " " }, { name: "x".repeat(61) }, { type: "castle" }, { type: "__proto__" }, { type: "constructor" }, { material: "unknown" }, { id: "" }]) assert.throws(() => validateRoom({ ...room, ...update }));
});
test("projects round-trip and reject corrupt, unsupported, or oversized imports", () => {
  const p = createProject();
  assert.deepEqual(parseProject(JSON.stringify(p)), p);
  assert.throws(() => parseProject("{bad"), /JSON/);
  assert.throws(() => parseProject("x".repeat(1_000_001)), /1 MB/);
  for (const update of [{ version: 2 }, { name: "" }, { ceiling: 1.9 }, { style: "Castle" }, { floors: [] }, { floors: Array(9).fill(p.floors[0]) }]) assert.throws(() => validateProject({ ...p, ...update }));
  p.floors[1].rooms[0].id = p.floors[0].rooms[0].id;
  assert.throws(() => validateProject(p), /unique/);
});
test("counts and area reflect additions, resizing, and deletion", () => {
  const p = createProject();
  const before = projectStats(p);
  const added = makeRoom("bedroom", p.floors[0].rooms);
  p.floors[0].rooms.push(added);
  assert.equal(projectStats(p).bedrooms, before.bedrooms + 1);
  assert.equal(projectStats(p).area, before.area + 16);
  added.width = 5;
  assert.equal(projectStats(p).area, before.area + 20);
  p.floors[0].rooms.pop();
  assert.deepEqual(projectStats(p), before);
});

test("all supporting spaces have valid defaults and survive project export/import", () => {
  const p = createProject();
  for (const type of Object.keys(TYPES)) {
    const r = makeRoom(type, p.floors[0].rooms);
    validateRoom(r);
    p.floors[0].rooms.push(r);
  }
  for (const type of ["hallway", "closet", "pantry", "laundry", "garage", "entry", "storage", "balcony"]) {
    assert.ok(p.floors[0].rooms.some(r => r.type === type));
  }
  assert.equal(p.floors[0].rooms.find(r => r.type === "garage").material, "concrete");
  assert.equal(p.floors[0].rooms.find(r => r.type === "balcony").material, "deck");
  assert.deepEqual(parseProject(JSON.stringify(p)), p);
});

test("old projects acquire property defaults without changing rooms or floors", () => {
  const p = createProject();
  delete p.property;
  const imported = parseProject(JSON.stringify(p));
  assert.deepEqual(imported.property, defaultProperty());
  assert.deepEqual(imported.floors, p.floors);
  assert.throws(() => parseProject(JSON.stringify({ ...p, property: null })), /missing/);
});

test("lot settings reject invalid numbers, unsupported ranges, names and flags", () => {
  for (const key of ["width", "depth"]) {
    for (const value of [0, 7.9, 200.1, null, NaN, Infinity, "26"]) assert.throws(() => validateProperty({ ...defaultProperty(), [key]: value }));
  }
  for (const key of ["houseX", "houseY"]) {
    for (const value of [-201, 201, NaN, Infinity, "8", null]) assert.throws(() => validateProperty({ ...defaultProperty(), [key]: value }));
  }
  for (const update of [{ roadName: "" }, { roadName: " " }, { roadName: "x".repeat(61) }, { landscaping: "true" }, { driveway: 1 }]) assert.throws(() => validateProperty({ ...defaultProperty(), ...update }));
  assert.equal(validateProperty(defaultProperty()).width, 26);
});

test("footprint is the union across all floors, excluding outdoor spaces", () => {
  const p = createProject(), stats = propertyStats(p);
  assert.equal(stats.lotArea, 832);
  assert.equal(stats.footprint, 90);
  assert.equal(stats.coverage, 90 / 832 * 100);
  assert.equal(stats.height, 5.6);
  assert.equal(stats.outsideRooms.length, 0);
  const extension = makeRoom("closet", []);
  extension.x = 10;
  p.floors[1].rooms.push(extension);
  assert.equal(propertyStats(p).footprint, 94);
  p.property.houseX = -1;
  assert.ok(propertyStats(p).outsideRooms.length > 0);
  assert.equal(validateProject(p), p, "out-of-lot concepts are allowed, with a UI warning");
});

test("union area counts overlaps, duplicate floors and disconnected rooms exactly once", () => {
  const a = { x: 0, y: 0, width: 4, depth: 4 };
  assert.equal(unionArea([]), 0);
  assert.equal(unionArea([a, a]), 16);
  assert.equal(unionArea([a, { x: 2, y: 2, width: 4, depth: 4 }]), 28);
  assert.equal(unionArea([a, { x: -5, y: -5, width: 2, depth: 2 }]), 20);
});

test("exterior walls omit shared and partially shared interior boundaries", () => {
  const rooms = [{ x: 0, y: 0, width: 4, depth: 4 }, { x: 4, y: 0, width: 4, depth: 2 }];
  const walls = exteriorWalls(rooms);
  assert.equal(walls.reduce((sum, w) => sum + w.to - w.from, 0), 12);
  assert.deepEqual(walls.find(w => w.axis === "east" && w.at === 4), { axis: "east", at: 4, from: 2, to: 4, room: rooms[0] });
  assert.deepEqual(exteriorWalls([]), []);
});

test("saved design uploads restore all editable room, floor and property data", async () => {
  const project = createProject();
  project.name = "Saved contemporary home";
  project.property.width = 40;
  project.floors[1].rooms.push(makeRoom("closet", project.floors[1].rooms));
  const text = JSON.stringify(project);
  for (const name of ["home.forma.json", "home.json", "HOME.JSON"]) {
    assert.deepEqual(await readProjectFile({ name, size: text.length, text: async () => text }), project);
  }
  delete project.property;
  const legacy = JSON.stringify(project);
  assert.deepEqual((await readProjectFile({ name: "older.json", size: legacy.length, text: async () => legacy })).property, defaultProperty());
});

test("upload validation rejects unsupported, corrupt and oversized files without editing a project", async () => {
  for (const name of ["plan.svg", "house.png", "drawing.pdf", "home.dwg", "home.json.exe"]) {
    await assert.rejects(() => readProjectFile({ name, size: 10, text: async () => "{}" }), /saved Forma/);
  }
  await assert.rejects(() => readProjectFile({ name: "large.json", size: 1_000_001, text: async () => { throw new Error("Must not read oversized files"); } }), /1 MB/);
  await assert.rejects(() => readProjectFile({ name: "bad.json", size: 5, text: async () => "{bad" }), /valid JSON/);
  await assert.rejects(() => readProjectFile({ name: "unknown.json", size: 2, text: async () => "{}" }), /supported Forma/);
  await assert.rejects(() => readProjectFile({ name: "unreadable.json", size: 10, text: async () => { throw new Error("File could not be read"); } }), /File could not be read/);
});
