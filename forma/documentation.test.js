import test from "node:test";
import assert from "node:assert/strict";
import { createProject } from "./model.js";
import { openingSchedule, renderDocumentationDrawing, roomSchedule, scheduleCsv } from "./documentation.js";

test("elevations generate valid, escaped drawings for each facade and specified openings", () => {
  const project = createProject();
  project.name = "Courtyard & Co";
  project.features = [{
    id: "window-1", type: "window", name: "Garden view", floorId: "ground", roomId: "living-1",
    side: "north", offset: 1, width: 2, height: 1.2, sill: .8, style: "fixed", material: "aluminum", glazing: "double",
  }];
  const north = renderDocumentationDrawing(project, { view: "elevation", side: "north" });
  assert.match(north, /Courtyard &amp; Co/);
  assert.match(north, /Garden view/);
  assert.match(north, /<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  for (const side of ["east", "south", "west"]) {
    assert.match(renderDocumentationDrawing(project, { side }), new RegExp(`${side[0].toUpperCase()}${side.slice(1)} elevation`));
  }
  assert.match(renderDocumentationDrawing(createProject(), { side: "south" }), /Illustrative door/);
  assert.match(renderDocumentationDrawing(createProject(), { side: "north" }), /Illustrative window/);
  assert.throws(() => renderDocumentationDrawing(project, { side: "up" }), /direction/);

  const section = renderDocumentationDrawing(project, { view: "section", axis: "x", offset: 2 });
  assert.match(section, /SECTION X–X/);
  assert.match(section, /Living room/);
  assert.match(section, /Primary bedroom/);
  assert.throws(() => renderDocumentationDrawing(project, { view: "section", axis: "z", offset: 2 }), /direction/);
  assert.throws(() => renderDocumentationDrawing(project, { view: "section", axis: "x", offset: -1 }), /between/);
});

test("room and opening schedules use current project data and CSV safely quotes values", () => {
  const project = createProject();
  project.floors[0].rooms[0].name = 'Living, "garden"';
  project.features = [{
    id: "door-1", type: "door", name: "Front entrance", floorId: "ground", roomId: "living-1",
    side: "south", offset: 1, width: 1, height: 2.1, sill: 0, style: "hinged", material: "timber", glazing: "none",
  }];
  const rooms = roomSchedule(project);
  assert.equal(rooms.length, project.floors.reduce((sum, floor) => sum + floor.rooms.length, 0));
  assert.equal(rooms[0].area, 30);
  assert.equal(rooms[0].room, 'Living, "garden"');
  assert.deepEqual(openingSchedule(project)[0], {
    name: "Front entrance", type: "door", host: "Ground floor / Living, \"garden\"",
    side: "south", dimensions: "1 × 2.1 m", sill: "0 m", offset: "1 m", specification: "hinged · timber · none glazing",
  });
  assert.match(scheduleCsv(project, "rooms"), /"Living, ""garden"""/);
  assert.match(scheduleCsv(project, "rooms"), /^"Level","Floor","Room"/);
  assert.match(scheduleCsv(project, "openings"), /"Front entrance"/);
  assert.match(openingSchedule(project, "imperial")[0].dimensions, /3\.28 ft × 6\.89 ft/);
  assert.match(scheduleCsv(project, "rooms", "imperial"), /"Area \(ft²\)"/);
  assert.match(renderDocumentationDrawing(project, { view: "section", axis: "x", offset: 2, units: "imperial" }), /CUT AT 6\.56 ft/);
  assert.throws(() => scheduleCsv(project, "other"), /schedule/);
});
