import { FEATURE_STYLES, FEATURE_MATERIALS, GLAZING, SIDES, escape, featureHost, wallLength, featureVertices, featureMarkup, validateFeatures } from "./architecture.js";
import { formatLength, inputLength, inputLengthLimit, lengthUnit, toMeters } from "./units.js";

export function architectureDialog({ getProject, showDialog, change, reveal, selectedRoomId, featureId, newFeatureType, onAdded, units = "metric" }) {
  const $ = selector => document.querySelector(selector);
  const option = (value, label, selected) => `<option value="${escape(value)}" ${value === selected ? "selected" : ""}>${escape(label)}</option>`;
  const rooms = () => getProject().floors.flatMap(f => f.rooms.filter(r => !["terrace", "balcony"].includes(r.type) && !r.outline).map(r => ({ floor: f, room: r })));
  const wide = () => $("#app-dialog").classList.add("samples-dialog");
  function schedule() {
    const project = getProject(), features = project.features || [];
    showDialog("Openings & boundaries.", `<p class="dialog-description">Place doors and windows on room walls, and gates on the lot boundary. Click a wall in the placement preview or enter an exact offset. Specifications save with your design.</p><div class="feature-add-actions">${Object.keys(FEATURE_STYLES).map(type => `<button class="button" data-new-feature="${type}" ${type !== "gate" && !rooms().length ? "disabled" : ""}>Add ${type}</button>`).join("")}</div><p class="dialog-note">North is the top edge of the plan; the street is along the south boundary. Offsets run left to right on north/south walls and top to bottom on east/west walls. Existing illustrative openings are replaced on rooms with specified features.</p><div class="feature-schedule">${features.map(f => {
      const host = featureHost(project, f), floor = project.floors.find(item => item.id === f.floorId);
      return `<button class="feature-schedule-row" data-edit-feature="${escape(f.id)}"><strong>${escape(f.name)}</strong><span>${escape(f.type)} · ${escape(floor ? `${floor.name} / ${host.name}` : "Lot boundary")} · ${escape(f.side)}</span><span>${formatLength(f.width, units)} × ${formatLength(f.height, units)} · sill ${formatLength(f.sill, units)} · offset ${formatLength(f.offset, units)}</span><small>${escape(f.style)} · ${escape(f.material)} · ${escape(f.glazing)} glazing</small></button>`;
    }).join("") || '<p class="dialog-description">No specified openings yet. Add your first door, window, or gate above.</p>'}</div><p class="dialog-note">These are conceptual specifications, not certified products, structural openings, security ratings, or code-compliant construction details. Interior openings appear in floor cutaways; exterior openings appear only on exposed facades.</p>`, "ARCHITECTURAL FEATURES");
    wide();
    document.querySelectorAll("[data-new-feature]").forEach(button => { button.onclick = () => edit(null, button.dataset.newFeature); });
    document.querySelectorAll("[data-edit-feature]").forEach(button => { button.onclick = () => edit(button.dataset.editFeature); });
  }
  function edit(id, type = "door") {
    const project = getProject(), original = (project.features || []).find(f => f.id === id);
    if (original) type = original.type;
    const entry = rooms().find(item => item.room.id === (original?.roomId || selectedRoomId)) || rooms()[0];
    if (type !== "gate" && !entry) { schedule(); return; }
    const host = type === "gate" ? project.property : entry.room;
    const feature = original || {
      id: crypto.randomUUID(), type, name: type === "gate" ? "Entrance gate" : type === "window" ? "Room window" : "Room door",
      ...(type === "gate" ? {} : { floorId: entry.floor.id, roomId: entry.room.id }),
      side: type === "gate" ? "south" : "north", offset: 0,
      width: Math.min(host.width, type === "gate" ? 3.5 : type === "window" ? 1.5 : .9),
      height: type === "window" ? Math.min(1.2, project.ceiling - .9) : Math.min(2.1, project.ceiling),
      sill: type === "window" ? .9 : 0, style: FEATURE_STYLES[type][0], material: type === "door" ? "timber" : type === "gate" ? "steel" : "aluminum",
      glazing: type === "window" ? "double" : "none",
    };
    const field = (key, label, min, max) => `<div class="property-field"><label for="feature-${key}">${label} (${lengthUnit(units)})</label><input id="feature-${key}" name="${key}" type="number" step="${units === "imperial" ? "any" : ".05"}" min="${inputLengthLimit(min, units)}" max="${inputLengthLimit(max, units)}" value="${inputLength(feature[key], units)}" required></div>`;
    showDialog(original ? `Edit ${type}.` : `Place a ${type}.`, `<button class="back-overview" id="feature-back">Back to specifications</button><div class="feature-editor"><div><p class="dialog-description">Click an edge to place the ${type}. The highlight shows its exact span. Save to apply it to the model.</p><svg id="feature-placement" viewBox="0 0 600 440" role="img" aria-label="Interactive ${type} placement preview"></svg><p id="feature-error" class="feature-error" role="alert"></p></div><form id="feature-form" class="dialog-form"><div class="property-field"><label for="feature-name">Name</label><input id="feature-name" name="name" value="${escape(feature.name)}" maxlength="60" required></div>${type !== "gate" ? `<div class="property-field"><label for="feature-room">Room / floor</label><select id="feature-room" name="roomId">${rooms().map(item => option(item.room.id, `${item.floor.name} / ${item.room.name}`, feature.roomId)).join("")}</select></div>` : '<p class="dialog-note">Attached to the property boundary.</p>'}<div class="field-row"><div class="property-field"><label for="feature-side">${type === "gate" ? "Boundary" : "Wall"}</label><select id="feature-side" name="side">${SIDES.map(side => option(side, side, feature.side)).join("")}</select></div>${field("offset", "Offset", 0, 200)}</div><div class="field-row">${field("width", "Width", .3, 12)}${field("height", "Height", .3, type === "gate" ? 4 : project.ceiling)}</div>${field("sill", "Sill height", 0, type === "window" ? project.ceiling : 0)}<div class="field-row"><div class="property-field"><label for="feature-style">Style / operation</label><select id="feature-style" name="style">${FEATURE_STYLES[type].map(s => option(s, s, feature.style)).join("")}</select></div><div class="property-field"><label for="feature-material">Frame / leaf material</label><select id="feature-material" name="material">${Object.keys(FEATURE_MATERIALS).map(s => option(s, s, feature.material)).join("")}</select></div></div><div class="property-field"><label for="feature-glazing">Glazing</label><select id="feature-glazing" name="glazing">${GLAZING.map(s => option(s, s, feature.glazing)).join("")}</select></div><div class="dialog-actions">${original ? '<button type="button" class="button danger" id="feature-delete">Delete feature</button>' : ""}<button class="button primary" type="submit">Save ${type}</button></div></form></div>`, "VISUAL PLACEMENT & SPECIFICATIONS");
    wide();
    const form = $("#feature-form"), svg = $("#feature-placement");
    let transform;
    function candidate() {
      const data = new FormData(form), next = { ...feature };
      for (const key of ["name", "side", "style", "material", "glazing"]) next[key] = String(data.get(key)).trim();
      for (const key of ["offset", "width", "height", "sill"]) next[key] = toMeters(Number(data.get(key)), units);
      if (type !== "gate") {
        const owner = rooms().find(item => item.room.id === data.get("roomId"));
        next.roomId = owner.room.id; next.floorId = owner.floor.id;
      }
      return next;
    }
    const listWith = next => [...(getProject().features || []).filter(f => f.id !== next.id), next];
    function preview() {
      const next = candidate(), host = featureHost(getProject(), next);
      const scale = Math.min(460 / host.width, 300 / host.depth), ox = (600 - host.width * scale) / 2, oy = (440 - host.depth * scale) / 2;
      transform = { scale, ox, oy, host };
      const point = (x, y) => ({ x: ox + (x - host.x) * scale, y: oy + (y - host.y) * scale });
      svg.innerHTML = `<rect x="${ox}" y="${oy}" width="${host.width * scale}" height="${host.depth * scale}" fill="#dfe6d1" stroke="#718269" stroke-width="4"/><text x="300" y="24" text-anchor="middle" fill="#a9c5b1" font-size="12">NORTH · ${formatLength(host.width, units)}</text><text x="300" y="428" text-anchor="middle" fill="#a9c5b1" font-size="12">SOUTH · ${formatLength(host.width, units)}${type === "gate" ? " · STREET" : ""}</text><text x="15" y="220" fill="#a9c5b1" font-size="11">W · ${formatLength(host.depth, units)}</text><text x="575" y="220" fill="#a9c5b1" font-size="11">E · ${formatLength(host.depth, units)}</text>`;
      try {
        validateFeatures({ ...getProject(), features: listWith(next) });
        svg.innerHTML += featureMarkup(next, featureVertices(next, host), point, true, units);
        $("#feature-error").textContent = "";
      } catch (error) { $("#feature-error").textContent = error.message; }
    }
    svg.onclick = event => {
      const { scale, ox, oy, host } = transform;
      const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.getScreenCTM().inverse());
      const x = Math.max(0, Math.min(host.width, (p.x - ox) / scale)), y = Math.max(0, Math.min(host.depth, (p.y - oy) / scale));
      const side = [["north", y], ["east", host.width - x], ["south", host.depth - y], ["west", x]].sort((a, b) => a[1] - b[1])[0][0];
      $("#feature-side").value = side;
      const along = ["north", "south"].includes(side) ? x : y, width = toMeters(Number($("#feature-width").value), units);
      $("#feature-offset").value = inputLength(Math.max(0, Math.round(Math.min(wallLength(host, side) - width, along - width / 2) * 20) / 20), units);
      preview();
    };
    form.oninput = preview;
    form.onchange = preview;
    form.onsubmit = event => {
      event.preventDefault();
      const next = candidate();
      if (change(() => { getProject().features = listWith(next); })) {
        reveal(next);
        if (!original && newFeatureType && onAdded) onAdded(next);
        else schedule();
      }
      else preview();
    };
    $("#feature-back").onclick = schedule;
    if (original) $("#feature-delete").onclick = () => {
      if (change(() => { getProject().features = (getProject().features || []).filter(f => f.id !== id); })) schedule();
    };
    preview();
  }
  if (featureId && (getProject().features || []).some(f => f.id === featureId)) edit(featureId);
  else if (newFeatureType) edit(null, newFeatureType);
  else schedule();
}
