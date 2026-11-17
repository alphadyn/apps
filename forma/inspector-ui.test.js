import test from "node:test";
import assert from "node:assert/strict";
import { openingInspectorMarkup, roomElementActionsMarkup, roomBoundaryControlsMarkup } from "./inspector-ui.js";

const icon = () => '<svg aria-hidden="true"></svg>';

test("room element controls stay enabled for standard rooms and explained for custom outlines", () => {
  const regular = roomElementActionsMarkup({ customOutline: false, rectangularOutline: true });
  assert.match(regular, /id="room-add-door"/);
  assert.match(regular, /id="room-add-window"/);
  assert.doesNotMatch(regular, /disabled|simplify-room-outline|room-elements-help/);
  for (const rectangularOutline of [true, false]) {
    const markup = roomElementActionsMarkup({ customOutline: true, rectangularOutline });
    assert.equal((markup.match(/disabled aria-describedby="room-elements-help"/g) || []).length, 2);
    assert.match(markup, /id="room-elements-help"/);
    assert.equal(markup.includes('id="simplify-room-outline"'), rectangularOutline);
  }
});

test("boundary controls render checkbox state, ordered options, and collapsed keyboard help", () => {
  const markup = roomBoundaryControlsMarkup({
    roomHasFeatures: false, cornerCount: 4, selectedCorner: null,
    keepRightAngles: true, shiftSharedBoundaries: false, icon,
  });
  assert.match(markup, /id="keep-right-angles" checked/);
  assert.doesNotMatch(markup, /id="shift-shared-boundaries"[^>]*checked/);
  assert.ok(markup.indexOf('id="keep-right-angles"') < markup.indexOf('id="shift-shared-boundaries"'));
  assert.match(markup, /id="remove-corner" disabled/);
  assert.doesNotMatch(markup, /id="add-corner" disabled/);
  assert.match(markup, /<details class="boundary-keyboard-help">/);
  assert.doesNotMatch(markup, /<details[^>]* open/);
});

test("corner restrictions and opening warnings preserve editing availability", () => {
  const options = { roomHasFeatures: false, cornerCount: 12, selectedCorner: 1, keepRightAngles: false, shiftSharedBoundaries: true, icon };
  const maximum = roomBoundaryControlsMarkup(options);
  assert.match(maximum, /id="add-corner" disabled/);
  assert.doesNotMatch(maximum, /id="remove-corner" disabled/);
  assert.match(maximum, /id="shift-shared-boundaries"[^>]*checked/);
  assert.doesNotMatch(maximum, /id="keep-right-angles" checked/);
  const minimum = roomBoundaryControlsMarkup({ ...options, cornerCount: 3 });
  assert.match(minimum, /id="remove-corner" disabled/);
  const openings = roomBoundaryControlsMarkup({ ...options, roomHasFeatures: true });
  assert.doesNotMatch(openings, /id="add-corner"|id="remove-corner"/);
  assert.match(openings, /Openings must fit after resizing/);
});

test("opening inspector escapes user text and renders all measurements with existing formatting", () => {
  const opening = { name: '<img src="x">', side: "north", width: 1.5, height: 1.2, offset: .5 };
  const markup = openingInspectorMarkup(opening, { name: "Kitchen & dining" }, { icon, lengthText: n => `${n} ft` });
  assert.doesNotMatch(markup, /<img/);
  assert.match(markup, /&lt;img src=&quot;x&quot;&gt;/);
  assert.match(markup, /Kitchen &amp; dining/);
  for (const [label, value] of [["Width", 1.5], ["Height", 1.2], ["Wall offset", .5]]) {
    assert.ok(markup.includes(`<dt>${label}</dt><dd>${value} ft</dd>`));
  }
  assert.match(markup, /id="deselect-opening"/);
  assert.match(markup, /id="edit-selected-opening"/);
});
