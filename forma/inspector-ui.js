import { escape } from "./architecture.js";

function keyboardHelp(text) {
  return `<details class="boundary-keyboard-help"><summary>Keyboard controls</summary><p>${text}</p></details>`;
}

export function openingInspectorMarkup(opening, room, { icon, lengthText }) {
  return `
    <button class="back-overview" id="deselect-opening">${icon("back")}Back to room</button>
    <div class="selection-heading"><span>${icon("door")}</span><div><strong>${escape(opening.name)}</strong><small>${escape(room.name)} · ${escape(opening.side)} wall</small></div></div>
    <section class="opening-edit-help" aria-label="Move and resize opening">
      <span class="property-label">MOVE & RESIZE</span>
      <p>Drag the center to move along the wall. Drag an end to resize.</p>
      <dl class="opening-measurements">
        <div><dt>Width</dt><dd>${lengthText(opening.width)}</dd></div>
        <div><dt>Height</dt><dd>${lengthText(opening.height)}</dd></div>
        <div><dt>Wall offset</dt><dd>${lengthText(opening.offset)}</dd></div>
      </dl>
      ${keyboardHelp("Use arrow keys along the wall for 0.1 m steps, or Shift + arrow keys for 0.5 m. Focus an end handle to resize. Escape deselects.")}
      <button class="add-space-button" id="edit-selected-opening">${icon("sliders")}Edit specifications</button>
    </section>`;
}

export function roomElementActionsMarkup({ customOutline, rectangularOutline }) {
  let note = "";
  if (customOutline) {
    note = rectangularOutline
      ? '<p class="inspector-help" id="room-elements-help">Remove extra corners to add openings without changing the room shape.</p><button class="add-space-button" id="simplify-room-outline">Remove extra corners</button>'
      : '<p class="inspector-help" id="room-elements-help">Doors and windows require a rectangular room without custom corners. Edit the outline under Walls & corners.</p>';
  }
  const disabled = customOutline ? 'disabled aria-describedby="room-elements-help"' : "";
  return `
    <section class="room-element-actions" aria-label="Add elements to space">
      <span class="property-label">ADD TO THIS SPACE</span>
      <div class="feature-add-actions"><button class="button" id="room-add-door" ${disabled}>Add door</button><button class="button" id="room-add-window" ${disabled}>Add window</button></div>
      ${note}
    </section>`;
}

export function roomBoundaryControlsMarkup({ roomHasFeatures, cornerCount, selectedCorner, keepRightAngles, shiftSharedBoundaries, icon }) {
  return `
    <section class="outline-controls" aria-label="Walls and corners">
      <span class="property-label">WALLS & CORNERS</span>
      <p>Drag a wall or corner to resize.</p>
      <div class="boundary-options">
        <label class="property-checkbox"><input type="checkbox" id="keep-right-angles" ${keepRightAngles ? "checked" : ""}>Keep right angles</label>
        <label class="property-checkbox"><input type="checkbox" id="shift-shared-boundaries" aria-describedby="shared-boundary-help" ${shiftSharedBoundaries ? "checked" : ""}>Adjust adjoining rooms</label>
      </div>
      <p id="shared-boundary-help">Move connected walls and corners together.</p>
      ${keyboardHelp("Focus a handle with Tab. Arrow keys move by 0.1 m; Shift + arrow keys move by 0.5 m.")}
      ${roomHasFeatures
        ? '<p class="dialog-note">Openings must fit after resizing. Remove them before changing the room shape.</p>'
        : `<div class="corner-actions"><button class="add-space-button" id="add-corner" ${cornerCount >= 12 ? "disabled" : ""}>${icon("plus")}Add corner</button><button class="add-space-button" id="remove-corner" ${selectedCorner === null || cornerCount <= 3 ? "disabled" : ""}>${icon("trash")}Remove selected corner</button></div>`}
    </section>`;
}
