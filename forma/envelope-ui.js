import { RAILING_STYLES, ROOF_FINISHES, railingSettings, roofSettings } from "./envelope.js?v=20261122-5";
import { fromMeters, lengthUnit, toMeters } from "./units.js";

const options = (values, selected) => Object.entries(values).map(([value, name]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${name}</option>`).join("");
const heightField = (id, name, label, value, min, max, units) => `<div class="property-field"><label for="${id}">${label} (${lengthUnit(units)})</label><input id="${id}" name="${name}" type="number" step="any" min="${fromMeters(min, units)}" max="${fromMeters(max, units)}" value="${fromMeters(value, units)}" required></div>`;

export function outdoorControlsMarkup(room, units = "metric") {
  const settings = railingSettings(room);
  return `<fieldset class="envelope-controls"><legend>Outdoor edge protection</legend>
    <label class="property-checkbox"><input type="checkbox" name="railing" id="room-railing" ${settings.enabled ? "checked" : ""}>Show concept railing</label>
    <div class="property-field"><label for="room-railing-style">Railing style</label><select id="room-railing-style" name="railingStyle">${options(RAILING_STYLES, settings.style)}</select></div>
    ${heightField("room-railing-height", "railingHeight", "Railing height", settings.height, .6, 1.8, units)}
    <p class="dialog-note">Shown on exposed edges only. Height and infill are visual concepts, not certified safety specifications.</p>
  </fieldset>`;
}

export function roofControlsMarkup(project, units = "metric") {
  const roof = roofSettings(project);
  return `<fieldset class="envelope-controls"><legend>Flat-roof details</legend>
    <div class="property-field"><label for="roof-finish">Roof finish</label><select id="roof-finish" name="roofFinish">${options(ROOF_FINISHES, roof.finish)}</select></div>
    <label class="property-checkbox"><input id="roof-parapet" name="roofParapet" type="checkbox" ${roof.parapet ? "checked" : ""}>Show exposed-edge parapets</label>
    ${heightField("roof-height", "roofHeight", "Parapet height", roof.height, .2, 1.2, units)}
    <p class="dialog-note">Applies to flat roofs in the full-house view. Roof drainage, waterproofing, structural support, and safe access require professional design.</p>
  </fieldset>`;
}

export const readOutdoorControls = (data, units = "metric") => ({
  railing: data.has("railing"),
  railingStyle: String(data.get("railingStyle")),
  railingHeight: toMeters(Number(data.get("railingHeight")), units),
});

export const readRoofControls = (data, units = "metric") => ({
  finish: String(data.get("roofFinish")),
  parapet: data.has("roofParapet"),
  height: toMeters(Number(data.get("roofHeight")), units),
});
