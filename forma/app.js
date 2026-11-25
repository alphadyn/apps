import { TYPES, SITE_STRUCTURE_TYPES, createProject, floorArea, projectStats, propertyStats, bounds, isOutdoor, exteriorRoomWalls, roomOutline, roomArea, roomCentroid, validateRoom, validateProject, validateProperty, makeRoom, parseProject, readProjectFile, hasRectangularOutline } from "./model.js?v=20261125-1";
import { renderPropertyView } from "./property-view.js?v=20261125-1";
import { propertyFeatures, propertyItem, movePropertyItem, updatePropertyItem, addPropertyItem, removePropertyItem } from "./property-edit.js?v=20261125-1";
import { setupResponsiveUI } from "./responsive-ui.js?v=20261125-2";
import { renderFloor3D } from "./floor-view.js?v=20261122-5";
import { cameraFromDrag, createCamera, DEFAULT_CAMERA, normalizeCamera } from "./camera.js";
import { SAMPLE_DESIGNS, createSampleDesign } from "./samples.js?v=20261122-7";
import { featureHost, featureVertices, featureMarkup, fenceSettings, FEATURE_MATERIALS, railingMarkup } from "./architecture.js?v=20261122-5";
import { outdoorControlsMarkup, roofControlsMarkup, readOutdoorControls, readRoofControls } from "./envelope-ui.js?v=20261122-5";
import { railingSettings } from "./envelope.js?v=20261122-5";
import { architectureDialog } from "./architecture-ui.js?v=20261117-1";
import { documentationDialog } from "./documentation.js";
import { shiftSpaceBoundary } from "./space-edit.js?v=20261117-1";
import { shiftOpening, openingEditMarkup } from "./opening-edit.js";
import { openingInspectorMarkup, roomElementActionsMarkup, roomBoundaryControlsMarkup } from "./inspector-ui.js";
import { areaUnit, fromMeters, formatArea as formatAreaValue, inputLength, inputLengthLimit, lengthUnit, toMeters, UNIT_SYSTEMS } from "./units.js";

const $ = selector => document.querySelector(selector);
const paths = {
  house: '<path d="m3 10 9-7 9 7v10H3Z"/><path d="M9 20v-7h6v7M8 6V3H5v5"/>',
  chevrons: '<path d="m9 8 3-3 3 3m-6 8 3 3 3-3"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  plan: '<path d="M3 3h18v18H3zM3 12h8V3m0 9v9m0-7h10"/><path d="M16 14v-4h5"/>',
  rooms: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  materials: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/>',
  sliders: '<path d="M4 6h7m4 0h5M4 12h3m4 0h9M4 18h10m4 0h2"/><circle cx="13" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bed: '<path d="M3 19V7m18 12V7M3 16h18M3 12h18v4H3zM5 12V5h14v7M7 8h4v4H7zm6 0h4v4h-4z"/>',
  bath: '<path d="M3 11h18v3a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-3ZM5 11V5a2 2 0 0 1 4 0M6 19v2m12-2v2"/>',
  kitchen: '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M12 10v10M6 14h2m8 0h2"/><circle cx="7" cy="7" r="1"/><circle cx="17" cy="7" r="1"/>',
  sofa: '<path d="M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4M3 10h4v5h10v-5h4v9H3v-9Zm2 9v2m14-2v2M12 5v9"/>',
  stairs: '<path d="M3 20h5v-5h5v-5h5V5h4M3 15v-4h5V6h5V2"/><path d="m13 20 7-7m-5 0h5v5"/>',
  dining: '<ellipse cx="12" cy="11" rx="7" ry="4"/><path d="M5 11v9m14-9v9M2 5v9h3m17-9v9h-3M9 3v4m6-4v4"/>',
  desk: '<path d="M3 12h18M5 12v8m14-8v8M7 4h10v6H7zM10 10v2m4-2v2M7 17h10"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/>',
  utility: '<rect x="4" y="3" width="16" height="18" rx="1"/><circle cx="12" cy="13" r="5"/><path d="M5 7h14m-11-2h1m2 0h1m-4 8c2-3 6 3 8 0"/>',
  hallway: '<path d="M4 3h16v18H4zM8 3v18m8-18v18M10 7h4m-4 5h4m-4 5h4"/>',
  closet: '<path d="M4 3h16v18H4zM12 3v18M9 10v4m6-4v4M7 21v1m10-1v1"/>',
  pantry: '<path d="M4 3h16v18H4zM4 9h16M4 15h16M8 5v2m4-2v2m4-2v2M8 11v2m8-2v2M8 17v2m4-2v2"/>',
  garage: '<path d="m2 9 10-6 10 6M4 8v13h16V8M7 21V11h10v10M7 14h10M7 17h10"/>',
  door: '<path d="M5 21V3h14v18M9 21V6l10-3M13 13v2M3 21h18"/>',
  storage: '<path d="M3 7h18v14H3zM2 3h20v4H2zM9 11h6v4H9z"/>',
  property: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2V5Zm6-2v16m6-14v16M7 9l5-3 5 3v7H7V9Z"/>',
  sparkles: '<path d="m12 3 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Zm7 13 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z"/>',
  save: '<path d="M4 3h13l4 4v14H3V3h1ZM7 3v6h9V3M7 21v-8h10v8M13 5v2"/>',
  export: '<path d="M12 15V3m-4 4 4-4 4 4M4 13v7h16v-7"/>',
  area: '<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6"/>',
  floors: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  cube: '<path d="m12 2 9 5v10l-9 5-9-5V7l9-5ZM3 7l9 5 9-5m-9 5v10M8 4l9 5"/>',
  cursor: '<path d="m5 3 14 10-7 1-3 7L5 3Z"/>',
  hand: '<path d="M8 12V5a1.5 1.5 0 0 1 3 0v6-8a1.5 1.5 0 0 1 3 0v8-6a1.5 1.5 0 0 1 3 0v7-3a1.5 1.5 0 0 1 3 0v6c0 4-3 7-7 7-3 0-5-2-7-5l-3-4a1.5 1.5 0 0 1 2-2l3 3"/>',
  "room-add": '<path d="M10 3H3v18h18v-8M3 12h8v9M16 3v8m-4-4h8"/>',
  ruler: '<path d="m3 16 13-13 5 5L8 21l-5-5Zm11-11 3 3m-6 0 2 2m-5 1 3 3m-6 0 2 2"/>',
  undo: '<path d="m8 5-5 5 5 5M3 10h11a6 6 0 0 1 0 12"/>',
  redo: '<path d="m16 5 5 5-5 5m5-5H10a6 6 0 0 0 0 12"/>',
  expand: '<path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6"/>',
  bulb: '<path d="M9 18h6m-5 3h4M8 14a6 6 0 1 1 8 0l-1 2H9l-1-2Z"/>',
  keyboard: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M5 9h1m3 0h1m3 0h1m3 0h1M5 12h1m3 0h1m3 0h1m3 0h1M7 16h10"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="1"/><path d="M16 8V3H3v13h5"/>',
  back: '<path d="m10 5-7 7 7 7M3 12h18"/>',
  file: '<path d="M5 2h9l5 5v15H5V2Zm9 0v6h5M8 13h8m-8 4h8"/>',
  upload: '<path d="M12 17V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
};
function icon(name) { return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.rooms}</svg>`; }
function hydrateIcons(root = document) { root.querySelectorAll("[data-icon]").forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
function escape(value) { return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char])); }
const format = value => value.toLocaleString("en", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const STORAGE_KEY = "forma-project-v1";
const UNIT_STORAGE_KEY = "forma-units-v1";
let project = createProject();
let activeFloor = project.floors[0].id;
let selected = null;
let selectedOpening = null;
let selectedSite = null;
let selectedCorner = null;
let shiftSharedBoundaries = false;
let keepRightAngles = true;
let view = "2d";
let scope = "floor";
let activePanel = "plan";
let showRoof = true;
let camera = { ...DEFAULT_CAMERA };
let tool = "select";
let dimensions = true;
let zoom = 1;
let pan = { x: 0, y: 0 };
let drawing = { scale: 40, x: 200, y: 80 };
let undoStack = [];
let redoStack = [];
let drag = null;
let saved = true;
let appliedDesignSaved = true;
let toastTimer;
let restoreError;
let unitSystem = "metric";
let unitPreferenceError;
try {
  const storedUnits = localStorage.getItem(UNIT_STORAGE_KEY);
  if (UNIT_SYSTEMS.includes(storedUnits)) unitSystem = storedUnits;
} catch (error) {
  unitPreferenceError = `Could not restore your units preference: ${error.message}`;
}
try {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) { project = parseProject(stored); activeFloor = project.floors[0].id; }
} catch (error) { restoreError = `Could not restore your workspace: ${error.message} The sample is open; your stored project has not been overwritten.`; saved = false; appliedDesignSaved = false; }
const lengthText = value => `${format(fromMeters(value, unitSystem))} ${lengthUnit(unitSystem)}`;
const areaText = value => {
  const [formatted] = formatAreaValue(value, unitSystem, 1).split(" ");
  const amount = Number(formatted.replaceAll(",", "")).toLocaleString("en", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${amount} ${areaUnit(unitSystem)}`;
};
const inputLengthAttrs = (min, max, step) => `min="${inputLengthLimit(min, unitSystem)}" max="${inputLengthLimit(max, unitSystem)}" step="${unitSystem === "imperial" ? "any" : step}"`;

const floor = () => project.floors.find(item => item.id === activeFloor);
const selection = () => floor().rooms.find(item => item.id === selected);
const snapshot = () => JSON.stringify(project);
let appliedDesign = snapshot();
function hasPendingChanges() { return snapshot() !== appliedDesign; }
function toast(message, error = false) {
  if (!saved && !error) { message += " Not saved locally; export a project backup."; error = true; }
  const el = $("#toast"); clearTimeout(toastTimer);
  el.textContent = message; el.classList.toggle("error", error); el.hidden = false;
  toastTimer = setTimeout(() => { el.hidden = true; }, error ? 10000 : 4000);
}
function updateChangeActions() {
  const pending = hasPendingChanges();
  $("#apply-button").disabled = !pending && saved;
  $("#revert-button").disabled = !pending;
  $("#save-state").innerHTML = `<i></i>${!saved ? "Not saved locally" : pending ? "Changes not applied" : "All changes applied"}`;
}
function applyChanges() {
  if (!hasPendingChanges() && saved) return;
  try {
    const current = snapshot();
    localStorage.setItem(STORAGE_KEY, current);
    appliedDesign = current;
    saved = true;
    appliedDesignSaved = true;
    undoStack = [];
    redoStack = [];
    toast("Changes applied and saved to this browser.");
  } catch (error) {
    saved = false;
    toast(`Unable to apply changes: ${error.message} Export a project file to keep your work.`, true);
  }
  updateChangeActions();
  render();
}
function commit(before) {
  if (before === snapshot()) { render(); return; }
  undoStack.push(before);
  if (undoStack.length > 60) undoStack.shift();
  redoStack = [];
  render();
}
function change(action) {
  const before = snapshot();
  const previousFloor = activeFloor, previousSelection = selected, previousScope = scope, previousPanel = activePanel;
  try { action(); validateProject(project); commit(before); return true; }
  catch (error) { project = JSON.parse(before); activeFloor = previousFloor; selected = previousSelection; scope = previousScope; activePanel = previousPanel; toast(error.message, true); render(); return false; }
}
function history(redo = false) {
  const source = redo ? redoStack : undoStack;
  if (!source.length) return;
  (redo ? undoStack : redoStack).push(snapshot());
  project = JSON.parse(source.pop());
  if (!project.floors.some(item => item.id === activeFloor)) activeFloor = project.floors[0].id;
  if (!selection()) selected = null;
  render();
}
function selectFloor(id) {
  activeFloor = id; scope = "floor"; activePanel = "plan"; selected = null; zoom = 1; pan = { x: 0, y: 0 }; render();
  responsiveUI.closeNavigation();
}
function setScope(value) {
  scope = value; activePanel = value === "property" ? "property" : "plan"; selected = null; zoom = 1; pan = { x: 0, y: 0 }; render();
}
function render() {
  if (scope !== "property" || view !== "2d") selectedSite = null;
  else selectedSite ||= "house";
  if (selectedSite && selectedSite !== "house") {
    const features = propertyFeatures(project);
    const tree = /^tree-(\d+)$/.exec(selectedSite), building = /^building-(\d+)$/.exec(selectedSite);
    if (selectedSite === "driveway" ? !features.driveway : tree ? !features.trees[Number(tree[1])] : building ? !project.property.layout?.structures?.[Number(building[1])] : true) selectedSite = "house";
  }
  if (!(project.features || []).some(feature => feature.id === selectedOpening && feature.roomId === selected && feature.floorId === activeFloor) || scope !== "floor" || view !== "2d") selectedOpening = null;
  const stats = projectStats(project);
  $("#sidebar-name").textContent = project.name;
  $("#rename-project").textContent = project.name;
  $("#floor-count").textContent = stats.floors;
  $("#room-count").textContent = stats.rooms;
  $("#stat-area").innerHTML = areaText(stats.area).replace(/ ([^ ]+)$/, " <small>$1</small>");
  $("#stat-bedrooms").innerHTML = `${stats.bedrooms} <small>${stats.bedrooms === 1 ? "room" : "rooms"}</small>`;
  $("#stat-bathrooms").innerHTML = `${stats.bathrooms} <small>${stats.bathrooms === 1 ? "room" : "rooms"}</small>`;
  $("#stat-floors").innerHTML = `${stats.floors} <small>${stats.floors === 1 ? "level" : "levels"}</small>`;
  $(".floor-mini").innerHTML = `G${stats.floors > 1 ? ` <span>${String(stats.floors - 1).padStart(2, "0")}</span>` : ""}`;
  $("#floor-list").innerHTML = project.floors.map((item, index) => `<button class="floor-button ${item.id === activeFloor ? "active" : ""}" data-floor="${escape(item.id)}" ${item.id === activeFloor ? 'aria-current="true"' : ""}><span class="floor-indicator">${index ? String(index).padStart(2, "0") : "G"}</span>${escape(item.name)}<span class="floor-area">${areaText(floorArea(item))}</span></button>`).join("");
  $("#canvas-floor-name").textContent = scope === "property" ? "All floors & lot" : floor().name;
  $("#editor-title").textContent = scope === "property" ? "Property canvas" : "Design canvas";
  $("#plan-caption").textContent = scope === "property" ? "FULL PROPERTY" : floor().name.toUpperCase();
  $("#canvas-view-caption").textContent = scope === "property" ? view === "2d" ? "SITE PLAN" : "FULL HOUSE" : view === "2d" ? "FLOOR PLAN" : "AXONOMETRIC";
  $("#toggle-dimensions").disabled = view === "3d" && scope === "floor";
  $("#layer-furniture").disabled = scope === "property";
  $("#view-2d-label").textContent = scope === "property" ? "Site plan" : "2D plan";
  $("#tool-select").classList.toggle("active", tool === "select");
  $("#tool-select").setAttribute("aria-label", view === "3d" ? "Rotate and select model" : scope === "property" ? "Select and move site items" : "Select and move rooms");
  $("#tool-select").title = view === "3d" ? "Rotate & select (V)" : "Select & move (V)";
  $("#tool-pan").classList.toggle("active", tool === "pan");
  $("#drawing-surface").classList.toggle("pan-mode", tool === "pan");
  $("#drawing-surface").classList.toggle("orbit-mode", view === "3d" && tool !== "pan");
  $("#orbit-controls").hidden = view !== "3d";
  updateCameraControls();
  for (const value of ["floor", "property"]) {
    $(`#scope-${value}`).classList.toggle("active", scope === value);
    $(`#scope-${value}`).setAttribute("aria-pressed", scope === value);
  }
  document.querySelectorAll(".design-nav button").forEach(button => {
    const current = button.dataset.panel === (scope === "property" ? "property" : "plan");
    button.classList.toggle("active", current);
    if (current) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  $("#toolbar-add").setAttribute("aria-label", scope === "property" ? "Add site feature" : "Add room");
  $("#toolbar-add").title = scope === "property" ? "Add a site feature" : "Add a space (R)";
  $(".canvas-legend").innerHTML = scope === "property"
    ? '<span><i class="legend-living"></i>House</span><span><i class="legend-outdoor"></i>Grounds</span><span><i class="legend-boundary"></i>Property line</span>'
    : '<span><i class="legend-living"></i>Living</span><span><i class="legend-private"></i>Private</span><span><i class="legend-service"></i>Service</span><span><i class="legend-outdoor"></i>Outdoor</span>';
  $("#undo").disabled = !undoStack.length;
  $("#redo").disabled = !redoStack.length;
  $("#view-2d").classList.toggle("active", view === "2d");
  $("#view-3d").classList.toggle("active", view === "3d");
  $("#view-2d").setAttribute("aria-pressed", view === "2d");
  $("#view-3d").setAttribute("aria-pressed", view === "3d");
  $("#zoom-value").textContent = `${Math.round(zoom * 100)}%`;
  $("#empty-floor").hidden = scope === "property" || floor().rooms.length > 0;
  $("#canvas-help").textContent = tool === "pan" ? "Drag the canvas to pan · V to select" : view === "3d" ? "Drag to rotate · Click to edit · H to pan" : scope === "property" ? "Drag site items · Arrow keys to nudge · H to pan" : "Click a room to edit · Drag to rearrange";
  renderPlan(); renderInspector();
  updateScale();
  $(".meta-date").textContent = `${project.style.toUpperCase()} RESIDENTIAL`;
  updateChangeActions();
}
function updateScale() {
  const screenScale = $("#plan").getScreenCTM()?.a || 1;
  $("#scale-label").innerHTML = view === "2d" ? `${unitSystem.toUpperCase()} <span class="scale-bar" style="width:${drawing.scale * screenScale * zoom * 2}px"></span> ${lengthText(2)}` : "AXONOMETRIC · NOT TO SCALE";
}
function updateCameraControls() {
  $("#camera-yaw").value = String(Math.round(camera.yaw));
  $("#camera-pitch").value = String(Math.round(camera.pitch));
  $("#camera-yaw-value").textContent = `${Math.round(camera.yaw)}°`;
  $("#camera-pitch-value").textContent = `${Math.round(camera.pitch)}°`;
  const north = createCamera(camera).project(0, -1);
  $(".north-marker svg").style.transform = view === "3d" ? `rotate(${Math.atan2(north.x, -north.y) * 180 / Math.PI}deg)` : "";
}
function setCamera(angles) {
  camera = normalizeCamera(angles); updateCameraControls(); renderPlan();
}

function furniture(type, w, h) {
  const shapes = {
    living: '<rect x="17" y="12" width="120" height="46" rx="5" class="soft"/><rect x="22" y="17" width="110" height="32" rx="3"/><path d="M58 18v30m37-30v30M20 50h114" class="detail"/><rect x="17" y="52" width="39" height="58" rx="4" class="soft"/><rect x="22" y="58" width="28" height="43" rx="3"/><rect x="71" y="72" width="53" height="35" rx="12"/><ellipse cx="91" cy="84" rx="8" ry="5" class="detail"/><circle cx="107" cy="93" r="4" class="detail"/><rect x="171" y="13" width="12" height="94" rx="1" class="soft"/><rect x="175" y="23" width="4" height="72" class="detail"/><rect x="74" y="58" width="65" height="65" rx="2" class="detail"/><circle cx="163" cy="137" r="12" class="soft"/><path d="m156 137 7-7 6 9m-6-9v16" class="detail"/>',
    kitchen: '<path d="M8 10h184v136h-24V33H8Z" class="soft"/><path d="M58 10v22m55-22v22m55-22v22m0 33h24m-24 43h24" class="detail"/><rect x="19" y="13" width="30" height="15" rx="2"/><path d="M34 10v10" class="detail"/><rect x="169" y="69" width="22" height="32" rx="1"/><circle cx="175" cy="77" r="4" class="detail"/><circle cx="185" cy="77" r="4" class="detail"/><circle cx="175" cy="93" r="4" class="detail"/><circle cx="185" cy="93" r="4" class="detail"/><rect x="66" y="65" width="68" height="38" rx="2"/><rect x="73" y="66" width="54" height="35" rx="1" class="detail"/><circle cx="78" cy="113" r="7" class="soft"/><circle cx="101" cy="113" r="7" class="soft"/><circle cx="124" cy="113" r="7" class="soft"/><rect x="128" y="12" width="35" height="19" rx="1"/>',
    dining: '<rect x="56" y="29" width="87" height="77" rx="5" class="soft"/><rect x="60" y="32" width="79" height="71" rx="4"/><rect x="66" y="16" width="22" height="12" rx="3"/><rect x="110" y="16" width="22" height="12" rx="3"/><rect x="66" y="107" width="22" height="12" rx="3"/><rect x="110" y="107" width="22" height="12" rx="3"/><rect x="42" y="54" width="13" height="24" rx="3"/><rect x="144" y="54" width="13" height="24" rx="3"/><ellipse cx="99" cy="65" rx="12" ry="14" class="detail"/><path d="m92 65 12-6m-7 17 2-20" class="detail"/><rect x="15" y="21" width="12" height="83" rx="1" class="soft"/>',
    bathroom: '<rect x="12" y="10" width="69" height="47" rx="4"/><rect x="17" y="14" width="59" height="37" rx="12" class="detail"/><circle cx="22" cy="33" r="2" class="detail"/><path d="M12 33h10" class="detail"/><rect x="123" y="12" width="61" height="26" rx="2" class="soft"/><ellipse cx="154" cy="25" rx="17" ry="8"/><path d="M154 12v8" class="detail"/><rect x="145" y="74" width="25" height="14" rx="2"/><path d="M147 88v13a10 10 0 0 0 21 0V88Z"/><ellipse cx="157.5" cy="99" rx="6" ry="8" class="detail"/><path d="M13 77h64v63H13zM13 77l64 63m0-63-64 63" class="detail"/><circle cx="45" cy="109" r="4" class="detail"/>',
    bedroom: '<rect x="47" y="13" width="105" height="99" rx="3" class="soft"/><rect x="50" y="17" width="99" height="91" rx="2"/><rect x="54" y="20" width="42" height="22" rx="4"/><rect x="103" y="20" width="42" height="22" rx="4"/><path d="M50 49h99v59H50z" class="soft"/><path d="M50 55h99m-87 0v53" class="detail"/><rect x="22" y="17" width="21" height="26" rx="1"/><circle cx="32.5" cy="29" r="6" class="detail"/><rect x="157" y="17" width="21" height="26" rx="1"/><circle cx="167.5" cy="29" r="6" class="detail"/><rect x="178" y="62" width="14" height="74" class="soft"/><path d="M178 87h14m-14 25h14" class="detail"/>',
    office: '<rect x="16" y="12" width="168" height="32" rx="2"/><rect x="64" y="17" width="60" height="20" rx="1" class="soft"/><path d="M94 37v6" class="detail"/><rect x="64" y="62" width="62" height="38" rx="10" class="soft"/><path d="M70 95h51M94 101v14m-17 0h34" class="detail"/><circle cx="35" cy="29" r="9" class="detail"/><rect x="164" y="65" width="20" height="79" class="soft"/><path d="M165 84h18m-18 20h18m-18 20h18" class="detail"/>',
    utility: '<rect x="10" y="13" width="72" height="88" rx="2"/><circle cx="46" cy="60" r="27"/><circle cx="46" cy="60" r="20" class="detail"/><path d="M11 33h70M22 23h10m8 0h3m6 0h3" class="detail"/><rect x="108" y="13" width="74" height="88" rx="2" class="soft"/><rect x="116" y="27" width="58" height="60" rx="8"/><path d="M145 14v26" class="detail"/>',
    terrace: '<rect x="22" y="30" width="55" height="45" rx="2" class="soft"/><rect x="25" y="32" width="49" height="13" rx="2"/><rect x="25" y="48" width="49" height="23" rx="2"/><rect x="123" y="30" width="55" height="45" rx="2" class="soft"/><rect x="126" y="32" width="49" height="13" rx="2"/><rect x="126" y="48" width="49" height="23" rx="2"/><circle cx="100" cy="59" r="12"/><circle cx="100" cy="59" r="4" class="detail"/>',
    stairs: `<rect x="28" y="9" width="144" height="134" fill="#e7e8de"/>${Array.from({ length: 11 }, (_, i) => `<path d="M28 ${13 + i * 12}h144" class="detail"/>`).join("")}<path d="M100 133V24m-13 12 13-12 13 12" fill="none" stroke="#7d8f6c" stroke-width="1.5"/>`,
    hallway: '<rect x="48" y="12" width="104" height="125" rx="3" class="detail"/><path d="M100 123V28m-15 15 15-15 15 15" stroke-dasharray="4 5" class="detail"/>',
    closet: '<path d="M12 12h176v26H38v98H12z" class="soft"/><path d="M48 19h129M23 45v82" class="detail"/><path d="m60 23-8 9h16l-8-9Zm30 0-8 9h16l-8-9Zm30 0-8 9h16l-8-9Zm30 0-8 9h16l-8-9Z" class="detail"/><rect x="153" y="71" width="33" height="63" class="soft"/><path d="M153 92h33m-33 21h33" class="detail"/>',
    pantry: '<path d="M12 12h176v27H39v93H12z" class="soft"/><path d="M53 20h17v11H53zm29 0h17v11H82zm29 0h17v11h-17zm29 0h17v11h-17zM19 54h13v20H19zm0 32h13v20H19z" class="detail"/><rect x="145" y="62" width="43" height="73" class="soft"/><path d="M146 87h41m-41 24h41" class="detail"/>',
    garage: '<rect x="26" y="17" width="61" height="113" rx="13"/><rect x="114" y="17" width="61" height="113" rx="13"/><path d="M32 46h49v52H32zM120 46h49v52h-49z" class="soft"/><path d="m32 46 7-14h35l7 14m-49 52 7 15h35l7-15m39-52 7-14h35l7 14m-49 52 7 15h35l7-15" class="detail"/>',
    entry: '<rect x="53" y="30" width="94" height="78" rx="2" class="soft"/><rect x="60" y="37" width="80" height="64" rx="1" class="detail"/><rect x="14" y="18" width="24" height="106" rx="2"/><path d="M20 30h12m-12 16h12m-12 16h12" class="detail"/><circle cx="171" cy="33" r="13" class="soft"/><path d="m165 33 6-7 6 8m-6-8v15" class="detail"/>',
    storage: '<rect x="12" y="12" width="176" height="25" class="soft"/><rect x="12" y="57" width="32" height="76" class="soft"/><rect x="156" y="57" width="32" height="76" class="soft"/><path d="M26 16h27v16H26zm39 0h27v16H65zm39 0h27v16h-27zm39 0h27v16h-27zM18 65h20v24H18zm0 34h20v24H18zm144-34h20v24h-20zm0 34h20v24h-20z" class="detail"/>',
  };
  const furnitureType = type === "laundry" ? "utility" : type === "balcony" ? "terrace" : type;
  return `<svg x="0" y="0" width="${w}" height="${h * .78}" viewBox="0 0 200 160" preserveAspectRatio="none" class="room-furniture" aria-hidden="true">${shapes[furnitureType]}</svg>`;
}
function plant(x, y, radius = 12) {
  return `<g transform="translate(${x} ${y})"><circle r="${radius}" fill="#c6d1b6" stroke="#a8b99a" stroke-width=".8"/><path d="M0 ${-radius * .8}Q${radius} 0 0 ${radius * .8}Q${-radius} 0 0 ${-radius * .8}ZM${-radius * .8} 0Q0 ${-radius} ${radius * .8} 0Q0 ${radius} ${-radius * .8} 0Z" fill="#b0c39b" stroke="#91a77e" stroke-width=".7"/><path d="M0 -7V7M-7 0H7" stroke="#91a77e" stroke-width=".8"/></g>`;
}
function renderPlan() {
  const surface = $("#drawing-surface").getBoundingClientRect();
  const viewportWidth = Math.min(900, 690 * surface.width / Math.max(surface.height, 1));
  $("#plan").setAttribute("viewBox", `${450 - viewportWidth / 2} 0 ${viewportWidth} 690`);
  if (scope === "property") {
    const result = renderPropertyView(project, { view, zoom, pan, dimensions, labels: $("#layer-labels").checked, roof: showRoof, viewportWidth, camera, units: unitSystem, editable: true, selectedSite, framing: drag?.mode === "site" ? drag.framing : null });
    drawing.scale = result.scale;
    drawing.framing = result.framing;
    $("#plan").setAttribute("aria-label", `${project.name}, ${view === "3d" ? "full-house 3D view" : "property site plan"}, ${project.floors.length} floors on a ${lengthText(project.property.width)} by ${lengthText(project.property.depth)} lot`);
    $("#plan").innerHTML = result.markup;
    return;
  }
  const rooms = floor().rooms;
  const b = bounds(rooms);
  const scale = drag?.drawing?.scale ?? Math.min(Math.min(650, Math.max(180, viewportWidth - 170)) / Math.max(b.width, 8), 465 / Math.max(b.depth, 8));
  drawing = drag?.drawing ?? { scale, x: (900 - b.width * scale) / 2 - b.x * scale, y: (690 - b.depth * scale) / 2 - b.y * scale + 2 };
  const svg = $("#plan");
  svg.setAttribute("aria-label", `${floor().name}, ${view === "2d" ? "floor plan" : "axonometric view"} with ${rooms.length} spaces`);
  const defs = '<defs><pattern id="oak" width="32" height="8" patternUnits="userSpaceOnUse"><path d="M0 0h32M16 0v8" fill="none" stroke="#979c7e" stroke-opacity=".09" stroke-width=".6"/></pattern><pattern id="tile" width="14" height="14" patternUnits="userSpaceOnUse"><path d="M14 0H0V14" fill="none" stroke="#8eaaa0" stroke-opacity=".18" stroke-width=".6"/></pattern><pattern id="deck" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0v8" stroke="#92a27c" stroke-opacity=".25" stroke-width=".7"/></pattern><filter id="plan-shadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="3" dy="6" stdDeviation="7" flood-color="#3d5030" flood-opacity=".08"/></filter></defs>';
  if (view === "3d") { svg.innerHTML = defs + renderFloor3D(rooms, { camera, ceiling: project.ceiling, viewportWidth, zoom, pan, selected, furniture: $("#layer-furniture").checked, labels: $("#layer-labels").checked, features: (project.features || []).filter(f => f.floorId === activeFloor), units: unitSystem }); return; }
  const { x: ox, y: oy } = drawing;
  let markup = `<g transform="translate(${450 + pan.x} ${345 + pan.y}) scale(${zoom}) translate(-450 -345)">`;
  if (rooms.length) {
    markup += `<rect x="${ox + b.x * scale - 36}" y="${oy + b.y * scale - 28}" width="${b.width * scale + 72}" height="${b.depth * scale + 63}" rx="1" fill="#dfe6d150" stroke="#c7d1b9" stroke-width=".8" stroke-dasharray="4 4"/>`;
    markup += `<text x="${ox + b.x * scale - 34}" y="${oy + (b.y + b.depth) * scale + 48}" fill="#9aa48c" font-size="7" letter-spacing="2">SITE BOUNDARY</text>`;
    markup += plant(ox + b.x * scale - 22, oy + b.y * scale + 25, 16);
    markup += plant(ox + (b.x + b.width) * scale + 22, oy + b.y * scale + 80, 14);
    markup += plant(ox + (b.x + b.width) * scale + 21, oy + (b.y + b.depth) * scale - 15, 17);
    markup += plant(ox + b.x * scale - 20, oy + (b.y + b.depth) * scale - 10, 12);
  }
  markup += `<g filter="url(#plan-shadow)">`;
  let boundaryHandles = "";
  for (const [roomIndex, item] of rooms.entries()) {
    const spec = TYPES[item.type];
    const x = ox + item.x * scale, y = oy + item.y * scale;
    const w = item.width * scale, h = item.depth * scale;
    const outline = roomOutline(item), points = outline.map(([px, py]) => `${px * scale},${py * scale}`).join(" ");
    const labelSize = Math.min(10, Math.max(6, w / (item.name.length * .67)));
    const isStairs = item.type === "stairs";
    const [cx, cy] = roomCentroid(item);
    markup += `<g class="room-shape ${item.id === selected ? "selected" : ""}" data-room="${escape(item.id)}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="${escape(item.name)}, ${areaText(roomArea(item))}"><title>${escape(item.name)} · ${lengthText(item.width)} × ${lengthText(item.depth)}</title><defs><clipPath id="room-clip-${roomIndex}"><polygon points="${points}"/></clipPath></defs><polygon class="room-outline" points="${points}" fill="${spec.color}" stroke="#58644b" stroke-width="4"/><polygon points="${points}" fill="${item.material === "concrete" ? "#b9bdb42a" : `url(#${item.material})`}" pointer-events="none"/>`;
    if ($("#layer-furniture").checked) markup += `<g clip-path="url(#room-clip-${roomIndex})">${furniture(item.type, w, h)}</g>`;
    if ($("#layer-labels").checked) markup += `<g class="room-label"><text x="${cx * scale}" y="${cy * scale}" text-anchor="middle" class="room-name" style="font-size:${labelSize}px;letter-spacing:${w < 90 ? .6 : 1.3}px">${escape(item.name.toUpperCase())}</text><text x="${cx * scale}" y="${cy * scale + 15}" text-anchor="middle" class="room-area" style="font-size:${w < 75 ? 7 : 9}px">${areaText(roomArea(item))}${w > 110 ? ` <tspan fill="#abb39b">/</tspan> ${lengthText(item.width)} × ${lengthText(item.depth)}` : ""}</text></g>`;
    if (!item.outline && !isOutdoor(item) && !(project.features || []).some(f => f.roomId === item.id)) {
      const windowWidth = Math.min(w * .4, 90);
      markup += `<path d="M${w * .25} 0h${windowWidth}" stroke="#f1f3e8" stroke-width="5"/><path d="M${w * .25} -1.6h${windowWidth}m${-windowWidth} 3.2h${windowWidth}" stroke="#91a28a" stroke-width=".7"/>`;
      if (item.type !== "stairs") {
        const door = Math.min(26, w * .23, h * .25);
        markup += `<path d="M${w * .12} ${h}h${door}" stroke="${spec.color}" stroke-width="6"/><path d="M${w * .12} ${h}v${-door}a${door} ${door} 0 0 1 ${door} ${door}" fill="none" stroke="#8d997f" stroke-width=".8"/>`;
      }
    } else if (isOutdoor(item)) {
      markup += `<g clip-path="url(#room-clip-${roomIndex})">${plant(13, h - 13, 8)}${plant(w - 13, h - 13, 8)}</g>`;
    }
    if (item.id === selected && !selectedOpening) {
      boundaryHandles = `<g data-room="${escape(item.id)}" transform="translate(${x} ${y})">`;
      outline.forEach(([px, py], index) => {
        const [nx, ny] = outline[(index + 1) % outline.length];
        boundaryHandles += `<line data-wall="${index}" x1="${px * scale}" y1="${py * scale}" x2="${nx * scale}" y2="${ny * scale}" stroke="transparent" stroke-width="12" style="cursor:move;pointer-events:stroke"/>`;
        boundaryHandles += `<rect data-wall="${index}" x="${(px + nx) * scale / 2 - 4}" y="${(py + ny) * scale / 2 - 4}" width="8" height="8" fill="#f4f3e8" stroke="#38885c" stroke-width="2" tabindex="0" role="button" aria-label="Move wall ${index + 1}" style="cursor:move"><title>Drag to shift wall; arrow keys adjust by 0.1 m, Shift by 0.5 m</title></rect>`;
      });
      outline.forEach(([px, py], index) => {
        boundaryHandles += `<circle data-corner="${index}" cx="${px * scale}" cy="${py * scale}" r="5" fill="${selectedCorner === index ? "#e4a95c" : "#f4f3e8"}" stroke="#38885c" stroke-width="2" tabindex="0" role="button" aria-label="Move corner ${index + 1}" style="cursor:move"><title>Drag to reshape; arrow keys adjust by 0.1 m, Shift by 0.5 m</title></circle>`;
      });
      boundaryHandles += "</g>";
    }
    markup += "</g>";
  }
  markup += "</g>";
  markup += boundaryHandles;
  let openingHandles = "";
  for (const feature of (project.features || []).filter(f => f.floorId === activeFloor)) {
    const vertices = featureVertices(feature, featureHost(project, feature));
    const point = (x, y) => ({ x: ox + x * scale, y: oy + y * scale });
    markup += `<g class="editable-opening ${feature.id === selectedOpening ? "selected-opening" : ""}">${featureMarkup(feature, vertices, point, true, unitSystem, "Select")}</g>`;
    if (feature.id === selectedOpening && tool !== "pan") openingHandles += openingEditMarkup(feature, vertices, point, unitSystem);
  }
  markup += openingHandles;
  for (const wall of exteriorRoomWalls(rooms).filter(w => w.room.railing)) {
    const height = railingSettings(wall.room).height;
    markup += railingMarkup([[...wall.a, 0], [...wall.b, 0], [...wall.b, height], [...wall.a, height]], (x, y) => ({ x: ox + x * scale, y: oy + y * scale }), wall.room, true, unitSystem);
  }
  if (dimensions && rooms.length) {
    const left = ox + b.x * scale, top = oy + b.y * scale, right = left + b.width * scale, bottom = top + b.depth * scale;
    markup += `<g pointer-events="none"><path class="dim-line" d="M${left} ${top - 45}V${top - 30}m0-7H${right}m0-8v15M${left - 53} ${top}h15m-7 0V${bottom}m-8 0h15"/><text class="dimension" x="${(left + right) / 2}" y="${top - 43}" text-anchor="middle">${lengthText(b.width)}</text><text class="dimension" transform="translate(${left - 52} ${(top + bottom) / 2}) rotate(-90)" text-anchor="middle">${lengthText(b.depth)}</text></g>`;
  }
  markup += "</g>";
  svg.innerHTML = defs + markup;
}

function renderInspector() {
  if (scope === "property") { renderPropertyInspector(); return; }
  const item = selection();
  const opening = (project.features || []).find(feature => feature.id === selectedOpening);
  if (opening && item && view === "2d") {
    $("#inspector-heading").textContent = opening.type === "door" ? "Door properties" : "Window properties";
    $("#inspector-content").innerHTML = openingInspectorMarkup(opening, item, { icon, lengthText });
    $("#deselect-opening").onclick = () => { selectedOpening = null; render(); };
    $("#edit-selected-opening").onclick = () => architecturalFeatures(opening.id);
    return;
  }
  $("#inspector-heading").textContent = item ? "Space properties" : "Floor overview";
  const content = $("#inspector-content");
  if (!item) {
    content.innerHTML = `<span class="property-label">CURRENT FLOOR</span><div class="property-value">${escape(floor().name)}</div><p class="floor-description">A thoughtful balance of open spaces<br>and everyday essentials.</p><div class="inspector-divider"></div><div class="floor-totals"><div><strong>${areaText(floorArea(floor()))}</strong><p>Floor area</p></div><div><strong>${floor().rooms.length} <small>spaces</small></strong><p>On this floor</p></div></div><div class="inspector-divider"></div><div class="room-list-title"><span class="property-label">SPACES ON THIS FLOOR</span><span>${String(floor().rooms.length).padStart(2, "0")}</span></div><div>${floor().rooms.map(r => `<button class="overview-room" data-select-room="${escape(r.id)}">${icon(TYPES[r.type].icon)}<span>${escape(r.name)}</span><span class="room-list-area">${areaText(roomArea(r))}</span></button>`).join("")}</div><button class="add-space-button" id="inspector-add">${icon("plus")}Add a space</button>${project.floors.length > 1 ? `<button class="floor-delete" id="remove-floor">${icon("trash")}Remove this floor</button>` : ""}<div style="height:25px"></div>`;
    $("#inspector-add").onclick = addDialog;
    if ($("#remove-floor")) $("#remove-floor").onclick = deleteFloorDialog;
    return;
  }
  const spec = TYPES[item.type];
  const dimensionField = (name, label, value, min, max) => `<div class="property-field"><label for="room-${name}">${label}</label><div class="input-unit"><input id="room-${name}" name="${name}" type="number" value="${inputLength(value, unitSystem)}" ${inputLengthAttrs(min, max, ".1")} required><span>${lengthUnit(unitSystem)}</span></div></div>`;
  const roomHasFeatures = (project.features || []).some(feature => feature.roomId === item.id);
  const corners = roomOutline(item);
  const elementActions = isOutdoor(item) ? "" : roomElementActionsMarkup({
    customOutline: Boolean(item.outline), rectangularOutline: hasRectangularOutline(item),
  });
  content.innerHTML = `
    <button class="back-overview" id="deselect-room">${icon("back")}Back to floor overview</button>
    <div class="selection-heading"><span>${icon(spec.icon)}</span><div><strong>${escape(item.name)}</strong><small>${escape(spec.category)} space</small></div></div>
    ${elementActions}
    <form id="room-form">
      <div class="property-field"><label for="room-name">Space name</label><input id="room-name" name="name" value="${escape(item.name)}" maxlength="60" required></div>
      <div class="field-row">${dimensionField("width", "Width", item.width, 1, 30)}${dimensionField("depth", "Depth", item.depth, 1, 30)}</div>
      <div class="field-row">${dimensionField("x", "Position X", item.x, -200, 200)}${dimensionField("y", "Position Y", item.y, -200, 200)}</div>
      <div class="property-field"><label for="room-material">Floor finish</label><select id="room-material" name="material">${[["oak", "Natural oak"], ["tile", "Limestone tile"], ["concrete", "Polished concrete"], ["deck", "Timber decking"]].map(([value, name]) => `<option value="${value}" ${item.material === value ? "selected" : ""}>${name}</option>`).join("")}</select></div>
      <div class="area-readout"><span>Total space area</span><strong>${areaText(roomArea(item))}</strong></div>
      <button class="button primary room-update-button" type="submit">Update space</button>
    </form>
    ${roomBoundaryControlsMarkup({ roomHasFeatures, cornerCount: corners.length, selectedCorner, keepRightAngles, shiftSharedBoundaries, icon })}
    <div class="room-actions"><button id="duplicate-room">${icon("copy")}Duplicate</button><button class="danger" id="delete-room" aria-label="Delete space">${icon("trash")}</button></div>`;
  $("#deselect-room").onclick = () => { selected = null; selectedCorner = null; render(); };
  $("#keep-right-angles").onchange = event => { keepRightAngles = event.target.checked; };
  $("#shift-shared-boundaries").onchange = event => { shiftSharedBoundaries = event.target.checked; };
  if (roomHasFeatures) {
    content.insertAdjacentHTML("beforeend", '<div class="opening-edit-help"><span class="property-label">DOORS & WINDOWS</span><p>Click an opening to select it, then drag to move or use its end handles to resize. Choose Edit specifications for exact measurements.</p></div>');
  }
  if (isOutdoor(item)) {
    $("#room-form .area-readout").insertAdjacentHTML("beforebegin", outdoorControlsMarkup(item, unitSystem));
  } else {
    $("#room-add-door").onclick = () => architecturalFeatures(undefined, "door");
    $("#room-add-window").onclick = () => architecturalFeatures(undefined, "window");
    if ($("#simplify-room-outline")) $("#simplify-room-outline").onclick = () => {
      if (change(() => { delete item.outline; selectedCorner = null; })) toast("Extra corners removed. You can now add doors and windows.");
    };
    if (!item.outline) {
      content.insertAdjacentHTML("beforeend", '<button class="add-space-button" id="room-openings">Doors & windows</button>');
      if (!roomHasFeatures) $("#room-openings").insertAdjacentHTML("afterend", '<p class="dialog-note">Add door and window specifications to make openings editable on the plan.</p>');
      $("#room-openings").onclick = () => architecturalFeatures();
    }
  }
  $("#room-form").onsubmit = event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const updated = { ...item, name: String(data.get("name")).trim(), material: data.get("material") };
    if (isOutdoor(item)) Object.assign(updated, readOutdoorControls(data, unitSystem));
    for (const key of ["width", "depth", "x", "y"]) updated[key] = toMeters(Number(data.get(key)), unitSystem);
    if (item.outline && (updated.width !== item.width || updated.depth !== item.depth)) {
      updated.outline = item.outline.map(([x, y]) => [x * updated.width / item.width, y * updated.depth / item.depth]);
    }
    try { validateRoom(updated); } catch (error) { toast(error.message, true); return; }
    if (change(() => Object.assign(item, updated))) toast("Space updated. A little closer to home.");
  };
  if (!roomHasFeatures) {
    $("#add-corner").onclick = () => {
      if (corners.length >= 12) return;
      let longest = 0;
      for (let i = 1; i < corners.length; i++) {
        const next = (i + 1) % corners.length;
        if (Math.hypot(corners[i][0] - corners[next][0], corners[i][1] - corners[next][1]) > Math.hypot(corners[longest][0] - corners[(longest + 1) % corners.length][0], corners[longest][1] - corners[(longest + 1) % corners.length][1])) longest = i;
      }
      const next = (longest + 1) % corners.length;
      selectedCorner = longest + 1;
      change(() => { item.outline = [...corners.slice(0, longest + 1), [(corners[longest][0] + corners[next][0]) / 2, (corners[longest][1] + corners[next][1]) / 2], ...corners.slice(longest + 1)]; });
    };
    $("#remove-corner").onclick = () => {
      if (selectedCorner === null || corners.length <= 3) return;
      const removed = selectedCorner;
      selectedCorner = null;
      change(() => { item.outline = corners.filter((_, index) => index !== removed); });
    };
  }
  $("#delete-room").onclick = () => deleteRoom(item);
  $("#duplicate-room").onclick = () => {
    change(() => {
      const copy = makeRoom(item.type, floor().rooms);
      Object.assign(copy, { width: item.width, depth: item.depth, material: item.material, name: `${item.name.slice(0, 53)} copy`, x: Math.min(item.x + item.width + .5, 200), y: item.y });
      if (item.outline) copy.outline = item.outline.map(point => [...point]);
      for (const key of ["railing", "railingStyle", "railingHeight"]) if (item[key] !== undefined) copy[key] = item[key];
      floor().rooms.push(copy); selected = copy.id;
    });
  };
}
function renderPropertyInspector() {
  const p = project.property, stats = propertyStats(project);
  $("#inspector-heading").textContent = "House & property";
  $("#inspector-content").innerHTML = `<span class="property-label">THE WHOLE PICTURE</span><div class="property-value">${escape(project.name)}</div><p class="floor-description">Every floor. Every outdoor space.<br>One place to call home.</p><div class="inspector-divider"></div><div class="floor-totals"><div><strong>${areaText(stats.lotArea)}</strong><p>Lot area</p></div><div><strong>${areaText(stats.footprint)}</strong><p>Building footprint</p></div></div><div class="property-metrics"><span>Lot dimensions<strong>${lengthText(p.width)} × ${lengthText(p.depth)}</strong></span><span>Site coverage<strong>${format(stats.coverage)}%</strong></span><span>House height<strong>${lengthText(stats.height)}</strong></span><span>Street frontage<strong>${escape(p.roadName)}</strong></span></div>${stats.outsideRooms.length ? `<div class="property-warning" role="status"><strong>Outside the property line</strong>${stats.outsideRooms.length} ${stats.outsideRooms.length === 1 ? "space extends" : "spaces extend"} beyond the lot. Adjust house placement, lot dimensions, or the floor plan.</div>` : '<div class="property-within"><i class="live-dot"></i>All spaces are inside the lot.</div>'}<button class="add-space-button" id="edit-property">${icon("sliders")}Edit property</button>${view === "3d" ? `<label class="property-checkbox roof-control"><input id="show-roof" type="checkbox" ${showRoof ? "checked" : ""}>Show full-height walls & roofs</label><p class="dialog-note">Turn off for an open-top study. Select a floor below to edit its interior.</p>` : '<p class="dialog-note">Solid shapes show the ground floor. Dashed outlines include all upper-floor footprints.</p>'}<div class="inspector-divider"></div><div class="room-list-title"><span class="property-label">FLOORS IN THIS HOUSE</span><span>${String(project.floors.length).padStart(2, "0")}</span></div>${project.floors.map(f => `<button class="overview-room" data-floor="${escape(f.id)}">${icon("floors")}<span>${escape(f.name)}</span><span class="room-list-area">${areaText(floorArea(f))} ↗</span></button>`).join("")}<p class="dialog-note">Concept massing only. Property lines are user-defined, not a land survey.</p><div style="height:25px"></div>`;
  $("#edit-property").onclick = propertyDialog;
  $("#edit-property").insertAdjacentHTML("afterend", '<button class="add-space-button" id="property-openings">Gates & opening specifications</button>');
  $("#property-openings").onclick = () => architecturalFeatures();
  $("#property-openings").insertAdjacentHTML("afterend", '<button class="add-space-button" id="roof-details">Roof finish & parapets</button>');
  $("#roof-details").onclick = projectDialog;
  if (view === "2d") {
    $("#inspector-content").insertAdjacentHTML("afterbegin", siteControlsMarkup());
    $("#site-position-form").onsubmit = event => {
      event.preventDefault();
      const data = new FormData(event.currentTarget), values = {};
      for (const key of ["x", "y", "radius", "width", "depth", "height"]) {
        if (data.has(key)) values[key] = toMeters(Number(data.get(key)), unitSystem);
      }
      if (data.has("name")) values.name = String(data.get("name")).trim();
      if (data.has("type")) values.type = String(data.get("type"));
      if (change(() => { project = updatePropertyItem(project, selectedSite, values); })) toast("Site item updated.");
    };
    $("#site-item").onchange = event => { selectedSite = event.target.value; render(); };
    $("#site-add-form").onsubmit = event => {
      event.preventDefault();
      const type = new FormData(event.currentTarget).get("type");
      let id;
      if (change(() => { const result = addPropertyItem(project, type); project = result.project; id = result.id; })) {
        selectedSite = id; render(); toast("Site feature added. Drag it or set its dimensions below.");
      }
    };
    if ($("#site-remove")) $("#site-remove").onclick = () => {
      if (change(() => { project = removePropertyItem(project, selectedSite); })) {
        selectedSite = "house"; render(); toast("Site feature removed.");
      }
    };
  }
  if ($("#show-roof")) $("#show-roof").onchange = event => { showRoof = event.target.checked; renderPlan(); };
}
function siteControlsMarkup() {
  const features = propertyFeatures(project);
  const items = [["house", "Whole house"], ...(features.driveway ? [["driveway", "Driveway"]] : []), ...features.trees.map((tree, index) => [`tree-${index}`, `Tree ${index + 1}`]), ...(project.property.layout?.structures || []).map((building, index) => [`building-${index}`, building.name])];
  const id = selectedSite || "house", item = propertyItem(project, id);
  const field = (key, label) => `<div class="property-field"><label for="site-${key}">${label} (${lengthUnit(unitSystem)})</label><input id="site-${key}" name="${key}" type="number" step="any" value="${fromMeters(item[key], unitSystem)}" required></div>`;
  const building = id.startsWith("building-");
  const types = Object.entries(SITE_STRUCTURE_TYPES);
  return `<div class="site-controls"><span class="property-label">ARRANGE YOUR PROPERTY</span><p class="dialog-note">Add a feature, then drag it on the site plan or enter exact measurements. Arrow keys move 0.1 m; Shift moves 0.5 m.</p><form id="site-add-form"><div class="property-field"><label for="site-add-type">Add site feature</label><select id="site-add-type" name="type"><option value="tree">Tree</option>${!features.driveway ? '<option value="driveway">Driveway</option>' : ""}${types.map(([value, name]) => `<option value="${value}">${escape(name)}</option>`).join("")}</select></div><button class="add-space-button" type="submit">${icon("plus")}Add feature</button></form><form id="site-position-form"><div class="property-field"><label for="site-item">Site item</label><select id="site-item">${items.map(([value, name]) => `<option value="${value}" ${id === value ? "selected" : ""}>${escape(name)}</option>`).join("")}</select></div>${building ? `<div class="property-field"><label for="site-name">Name</label><input id="site-name" name="name" value="${escape(item.name)}" maxlength="60" required></div><div class="property-field"><label for="site-type">Building type</label><select id="site-type" name="type">${types.map(([value, name]) => `<option value="${value}" ${item.type === value ? "selected" : ""}>${escape(name)}</option>`).join("")}</select></div>` : ""}<div class="field-row">${field("x", "Position X")}${field("y", "Position Y")}</div>${id.startsWith("tree-") ? field("radius", "Canopy radius") : ""}${id === "driveway" ? field("width", "Width") : ""}${building ? `<div class="field-row">${field("width", "Width")}${field("depth", "Depth")}</div>${field("height", "Height")}` : ""}<button class="add-space-button" type="submit">Update site item</button>${id !== "house" ? `<button class="floor-delete" type="button" id="site-remove">${icon("trash")}Remove feature</button>` : ""}</form><p class="dialog-note">Tree positions use their centers; buildings and driveways use the rear-left corner. Features must fit inside the lot; overlaps and setbacks are not checked.</p><div class="inspector-divider"></div></div>`;
}
function propertyDialog() {
  const p = project.property;
  const fence = fenceSettings(project);
  const field = (name, label, value, min, max) => `<div class="property-field"><label for="property-${name}">${label}</label><div class="input-unit"><input id="property-${name}" name="${name}" type="number" value="${inputLength(value, unitSystem)}" ${inputLengthAttrs(min, max, ".1")} required><span>${lengthUnit(unitSystem)}</span></div></div>`;
  showDialog("A place in the world.", `<form id="property-form" class="dialog-form"><p class="dialog-description">Define a rectangular lot and place the whole house on it. All floors share the same house origin.</p><div class="field-row">${field("width", "Lot width", p.width, 8, 200)}${field("depth", "Lot depth", p.depth, 8, 200)}</div><div class="field-row">${field("houseX", "House origin X", p.houseX, -200, 200)}${field("houseY", "House origin Y", p.houseY, -200, 200)}</div><p class="dialog-note property-origin-note">X is measured from the left boundary; Y from the rear boundary. Room positions are relative to this origin. The street is along the front (bottom) boundary.</p><div class="property-field"><label for="property-roadName">Street name</label><input id="property-roadName" name="roadName" value="${escape(p.roadName)}" maxlength="60" required></div><div class="property-checks"><label class="property-checkbox"><input type="checkbox" name="landscaping" ${p.landscaping ? "checked" : ""}>Show conceptual landscaping</label><label class="property-checkbox"><input type="checkbox" name="driveway" ${p.driveway ? "checked" : ""}>Show driveway to street</label></div><p class="dialog-note">House placement outside the lot is allowed for exploration, but will display a warning. Setbacks, zoning, and legal boundaries are not checked.</p><div class="dialog-actions"><button class="button primary" type="submit">Apply property settings</button></div></form>`, "LOT & HOUSE PLACEMENT");
  $("#property-form .property-checks").insertAdjacentHTML("beforebegin", `<fieldset class="fence-settings"><legend>BOUNDARY FENCING</legend><label class="property-checkbox"><input type="checkbox" name="fence-enabled" id="fence-enabled" ${fence.enabled ? "checked" : ""}>Show perimeter fence (with gate openings)</label><div class="field-row"><div class="property-field"><label for="fence-height">Fence height (${lengthUnit(unitSystem)})</label><input id="fence-height" name="fence-height" type="number" ${inputLengthAttrs(.5, 4, ".1")} value="${inputLength(fence.height, unitSystem)}" required></div><div class="property-field"><label for="fence-style">Style</label><select id="fence-style" name="fence-style">${["slatted", "solid"].map(s => `<option ${fence.style === s ? "selected" : ""}>${s}</option>`).join("")}</select></div></div><div class="property-field"><label for="fence-material">Material</label><select id="fence-material" name="fence-material">${Object.keys(FEATURE_MATERIALS).map(s => `<option ${fence.material === s ? "selected" : ""}>${s}</option>`).join("")}</select></div><p class="dialog-note">Gates cut openings in the fence along their selected boundary. Fence dimensions are conceptual, not certified security or structural specifications.</p></fieldset>`);
  $("#property-form").onsubmit = event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const updated = { ...p, roadName: String(data.get("roadName")).trim(), landscaping: data.has("landscaping"), driveway: data.has("driveway") };
    updated.fence = { enabled: data.has("fence-enabled"), height: toMeters(Number(data.get("fence-height")), unitSystem), style: data.get("fence-style"), material: data.get("fence-material") };
    for (const key of ["width", "depth", "houseX", "houseY"]) updated[key] = toMeters(Number(data.get(key)), unitSystem);
    try { validateProperty(updated); } catch (error) { toast(error.message, true); return; }
    if (change(() => { project.property = updated; scope = "property"; activePanel = "property"; selected = null; zoom = 1; pan = { x: 0, y: 0 }; })) {
      closeDialog(); toast("Property updated. Your home, in context.");
    }
  };
}
function deleteRoom(item) { change(() => {
  floor().rooms = floor().rooms.filter(r => r.id !== item.id);
  if (project.features) project.features = project.features.filter(f => f.roomId !== item.id);
  selected = null;
}); }
function architecturalFeatures(featureId, newFeatureType) {
  activePanel = "architecture";
  architectureDialog({
    getProject: () => project, showDialog, change, selectedRoomId: selected, featureId, newFeatureType, units: unitSystem,
    onAdded: feature => {
      selectedOpening = feature.id; activePanel = "plan"; closeDialog(); render();
    },
    reveal: feature => {
      if (feature.type === "gate") { scope = "property"; selected = null; }
      else { activeFloor = feature.floorId; selected = feature.roomId; scope = "floor"; }
      activePanel = "architecture";
      view = "2d"; zoom = 1; pan = { x: 0, y: 0 }; render();
    },
  });
}
function showDialog(title, html, eyebrow = "MAKE IT YOURS") {
  $("#app-dialog").classList.remove("samples-dialog", "documentation-dialog");
  $("#dialog-title").textContent = title;
  $("#dialog-eyebrow").textContent = eyebrow;
  $("#dialog-content").innerHTML = html;
  hydrateIcons($("#app-dialog"));
  if (!$("#app-dialog").open) $("#app-dialog").showModal();
}
const closeDialog = () => $("#app-dialog").close();
function openDesign(next) {
  return change(() => {
    project = next; activeFloor = project.floors[0].id; scope = "floor"; activePanel = "plan"; view = "2d"; tool = "select";
    selected = null; zoom = 1; pan = { x: 0, y: 0 }; camera = { ...DEFAULT_CAMERA };
  });
}
function revertDialog() {
  if (!hasPendingChanges()) return;
  showDialog("Discard unapplied changes?", '<p class="dialog-description">Revert the design to its last applied version? All changes made since then will be discarded.</p><div class="dialog-actions"><button class="button" id="cancel-revert">Keep editing</button><button class="button primary" id="confirm-revert">Revert changes</button></div>', "REVERT YOUR DESIGN");
  $("#cancel-revert").onclick = closeDialog;
  $("#confirm-revert").onclick = () => {
    project = JSON.parse(appliedDesign);
    activeFloor = project.floors[0].id;
    selected = null; scope = "floor"; activePanel = "plan"; view = "2d"; tool = "select";
    zoom = 1; pan = { x: 0, y: 0 }; camera = { ...DEFAULT_CAMERA };
    saved = appliedDesignSaved;
    undoStack = []; redoStack = [];
    closeDialog(); render(); toast("Unapplied changes reverted.");
  };
}
function projectBackup() {
  download(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), ".forma.json");
  toast("Current design backup downloaded.");
}
function sampleArtwork(design, label, mode = "3d", floorId = null) {
  const idPrefix = `sample-${design.name}-${floorId || mode}`;
  const markup = floorId
    ? renderFloor3D(design.floors.find(f => f.id === floorId).rooms, { ceiling: design.ceiling, labels: true, features: (design.features || []).filter(f => f.floorId === floorId), units: unitSystem, idPrefix })
    : renderPropertyView(design, { view: mode, labels: false, dimensions: false, units: unitSystem, idPrefix }).markup;
  return `<div class="sample-artwork" inert><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 690" role="img" aria-label="${escape(label)}">${markup}</svg></div>`;
}
function sampleGallery() {
  showDialog("Find your starting point.", `<p class="dialog-description">${SAMPLE_DESIGNS.length} contemporary concepts, from compact retreats to duplexes, maisonettes, mansions, and single-family rooftop homes. Explore a design, then make an editable copy your own.</p><div class="sample-grid">${SAMPLE_DESIGNS.map(sample => {
    const design = sample.create(), stats = projectStats(design);
    return `<article class="sample-card">${sampleArtwork(design, `${design.name}, whole-house concept`)}<div class="sample-card-body"><span class="eyebrow">${escape(sample.tag)}</span><h3>${escape(design.name)}</h3><p>${escape(sample.description)}</p><div class="sample-facts"><span>${areaText(stats.area)}</span><span>${stats.bedrooms} ${stats.bedrooms === 1 ? "bed" : "beds"}</span><span>${stats.floors} ${stats.floors === 1 ? "level" : "levels"}</span></div><button class="button" data-preview-sample="${escape(sample.id)}">Explore design ${icon("back")}</button></div></article>`;
  }).join("")}</div><p class="dialog-note">Areas include terraces, balconies, and garages. These are editable concept layouts, not construction-ready plans. Your current design stays unchanged until you choose Use this design.</p>`, "THE FORMA COLLECTION");
  $("#app-dialog").classList.add("samples-dialog");
  $("#app-dialog").scrollTop = 0;
  $("#dialog-content").querySelectorAll("[data-preview-sample]").forEach(button => { button.onclick = () => sampleDetails(button.dataset.previewSample); });
}
function sampleDetails(id) {
  const sample = SAMPLE_DESIGNS.find(item => item.id === id);
  if (!sample) { toast("This sample design is not available.", true); return; }
  const design = createSampleDesign(id), stats = projectStats(design), site = propertyStats(design);
  showDialog(design.name, `<button class="back-overview" id="back-to-samples">${icon("back")}All sample designs</button><div class="sample-detail-grid"><div><div class="sample-preview-controls"><label for="sample-view">PREVIEW</label><select id="sample-view" aria-label="Sample preview view"><option value="3d">Full house in 3D</option><option value="2d">Property site plan</option>${design.floors.map(f => `<option value="${escape(f.id)}">${escape(f.name)} — cutaway</option>`).join("")}</select></div><div id="sample-detail-art">${sampleArtwork(design, `${design.name}, whole-house concept`)}</div></div><div class="sample-description"><span class="eyebrow">${escape(sample.tag)}</span><p>${escape(sample.story)}</p><ul>${sample.highlights.map(item => `<li>${escape(item)}</li>`).join("")}</ul><dl class="sample-measurements"><div><dt>Total floor area</dt><dd>${areaText(stats.area)}</dd></div><div><dt>Bedrooms / bathrooms</dt><dd>${stats.bedrooms} / ${stats.bathrooms}</dd></div><div><dt>Floors / spaces</dt><dd>${stats.floors} / ${stats.rooms}</dd></div><div><dt>Lot dimensions</dt><dd>${lengthText(design.property.width)} × ${lengthText(design.property.depth)}</dd></div><div><dt>Building footprint</dt><dd>${areaText(site.footprint)}</dd></div><div><dt>Design language</dt><dd>${escape(design.style)}</dd></div></dl></div></div><div class="sample-replacement"><p><strong>Make this design your own.</strong>Using a sample replaces <b>${escape(project.name)}</b> in this browser. Download a backup first to keep it. Apply the sample to save it or revert to discard it.</p><button class="button" id="sample-backup">${icon("save")}Back up current design</button></div><p class="dialog-note">Every room, finish, floor, and property setting is editable. Total floor area includes outdoor spaces and garages. Concept design only; consult a licensed professional before building.</p><div class="dialog-actions"><button class="button" id="cancel-sample">Keep current design</button><button class="button primary" id="use-sample">Use this design</button></div>`, "EXPLORE A SAMPLE HOME");
  $("#app-dialog").classList.add("samples-dialog");
  $("#app-dialog").scrollTop = 0;
  $("#back-to-samples").onclick = sampleGallery;
  $("#sample-backup").onclick = projectBackup;
  $("#cancel-sample").onclick = closeDialog;
  $("#sample-view").onchange = event => {
    const value = event.target.value, isFloor = value !== "2d" && value !== "3d";
    $("#sample-detail-art").innerHTML = sampleArtwork(design, `${design.name}, ${isFloor ? design.floors.find(f => f.id === value).name : value === "2d" ? "site plan" : "whole-house concept"}`, isFloor ? "3d" : value, isFloor ? value : null);
  };
  $("#use-sample").onclick = () => {
    if (openDesign(design)) { closeDialog(); $(".sidebar").classList.remove("open"); toast(`${design.name} is ready. Make it your own.`); }
  };
}
function addRoom(type) {
  change(() => {
    const item = makeRoom(type, floor().rooms);
    floor().rooms.push(item); scope = "floor"; activePanel = "plan"; selected = item.id; zoom = 1; pan = { x: 0, y: 0 };
  });
  closeDialog();
}
function addDialog() {
  showDialog("Make room for living.", `<p class="dialog-description">Choose a space to add to ${escape(floor().name.toLowerCase())}. You can refine its dimensions and position on the canvas.</p><div class="dialog-space-grid">${Object.entries(TYPES).map(([type, spec]) => `<button data-add-type="${type}">${icon(spec.icon)}${spec.name}</button>`).join("")}</div>`);
}
function addToCanvas() {
  if (scope === "floor") { addDialog(); return; }
  view = "2d";
  render();
  responsiveUI.openProperties();
  $("#site-add-type").focus();
}
function projectDialog() {
  showDialog("Your project, your way.", `<form id="settings-form" class="dialog-form"><div class="property-field"><label for="project-name">Project name</label><input id="project-name" name="name" maxlength="80" value="${escape(project.name)}" required></div><div class="field-row"><div class="property-field"><label for="project-style">Design language</label><select id="project-style" name="style">${["Contemporary", "Minimalist", "Modern organic", "Mid-century"].map(style => `<option ${project.style === style ? "selected" : ""}>${style}</option>`).join("")}</select></div><div class="property-field"><label for="ceiling">Ceiling height (${lengthUnit(unitSystem)})</label><input id="ceiling" name="ceiling" type="number" ${inputLengthAttrs(2, 6, ".1")} value="${inputLength(project.ceiling, unitSystem)}" required></div></div><div class="property-field"><label for="unit-system">Measurement units</label><select id="unit-system" name="units"><option value="metric" ${unitSystem === "metric" ? "selected" : ""}>Metric (meters, square meters)</option><option value="imperial" ${unitSystem === "imperial" ? "selected" : ""}>Imperial (feet, square feet)</option></select></div><p class="dialog-note">This is a conceptual planning tool, not architectural or structural documentation. Consult a licensed professional before building. Areas include terraces and stairs; overlapping rooms are counted individually.</p><div class="dialog-actions"><button class="button" type="button" id="import-project">${icon("upload")}Open project</button><button class="button primary" type="submit">Save settings</button></div></form>`, "PROJECT SETTINGS");
  $("#settings-form").onsubmit = event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (change(() => {
      project.name = String(data.get("name")).trim();
      project.style = data.get("style");
      project.ceiling = toMeters(Number(data.get("ceiling")), unitSystem);
      project.roof = readRoofControls(data, unitSystem);
    })) {
      const nextUnits = String(data.get("units"));
      if (UNIT_SYSTEMS.includes(nextUnits) && nextUnits !== unitSystem) {
        unitSystem = nextUnits;
        try { localStorage.setItem(UNIT_STORAGE_KEY, unitSystem); }
        catch (error) { toast(`Unable to save units preference: ${error.message}`, true); }
      }
      render();
      closeDialog();
    }
  };
  $("#settings-form .dialog-note").insertAdjacentHTML("beforebegin", roofControlsMarkup(project, unitSystem));
  $("#import-project").onclick = importProject;
  $("#settings-form").insertAdjacentHTML("beforeend", '<div class="settings-links"><button class="browse-spaces" id="edit-property-settings" type="button">Edit lot & house placement</button><button class="browse-spaces" id="browse-sample-settings" type="button">Browse sample home designs</button><button class="floor-delete" id="new-project" type="button">Start a new, blank project</button></div>');
  $("#browse-sample-settings").onclick = sampleGallery;
  $("#edit-property-settings").onclick = propertyDialog;
  $("#new-project").onclick = () => {
    showDialog("Room for a new beginning.", '<p class="dialog-description">Start a blank home with one ground floor. Your current design will be replaced in this browser. Download a project backup first if you want to keep it. You can also undo this action until you reload.</p><div class="dialog-actions"><button class="button" id="cancel-new">Keep designing</button><button class="button primary" id="confirm-new">Start new project</button></div>', "A CLEAN SLATE");
    $("#cancel-new").onclick = projectDialog;
    $("#confirm-new").onclick = () => {
      change(() => { project = { ...createProject(), name: "Untitled home", floors: [{ id: crypto.randomUUID(), name: "Ground floor", rooms: [] }] }; activeFloor = project.floors[0].id; scope = "floor"; activePanel = "plan"; selected = null; zoom = 1; pan = { x: 0, y: 0 }; camera = { ...DEFAULT_CAMERA }; });
      closeDialog();
    };
  };
}
function addFloorDialog() {
  if (project.floors.length >= 8) { toast("Your project supports up to 8 floors.", true); return; }
  showDialog("A new perspective.", `<form id="floor-form" class="dialog-form"><p class="dialog-description">Add another level to your home. Start with a clear canvas and make it your own.</p><div class="property-field"><label for="new-floor-name">Floor name</label><input id="new-floor-name" name="name" maxlength="40" value="Floor ${String(project.floors.length).padStart(2, "0")}" required></div><div class="dialog-actions"><button class="button primary" type="submit">Create floor</button></div></form>`, "BUILD UPON YOUR VISION");
  $("#floor-form").onsubmit = event => {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name")).trim();
    if (!name) { toast("Give your floor a name.", true); return; }
    change(() => { const newFloor = { id: crypto.randomUUID(), name, rooms: [] }; project.floors.push(newFloor); activeFloor = newFloor.id; scope = "floor"; activePanel = "plan"; selected = null; zoom = 1; pan = { x: 0, y: 0 }; });
    closeDialog();
  };
}
function deleteFloorDialog() {
  showDialog("Remove this floor?", `<p class="dialog-description">This will remove ${escape(floor().name)} and its ${floor().rooms.length} spaces. You can undo this action.</p><div class="dialog-actions"><button class="button" id="cancel-remove">Keep floor</button><button class="button primary" id="confirm-remove">Remove floor</button></div>`, "A CHANGE OF PLAN");
  $("#cancel-remove").onclick = closeDialog;
  $("#confirm-remove").onclick = () => {
    change(() => {
      if (project.features) project.features = project.features.filter(f => f.floorId !== activeFloor);
      project.floors = project.floors.filter(f => f.id !== activeFloor); activeFloor = project.floors[0].id; selected = null;
    });
    closeDialog();
  };
}
function download(blob, extension) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "forma-project"}${extension}`;
  a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportDialog() {
  const exportName = scope === "property" ? view === "2d" ? "Property site plan" : "Full house & property" : floor().name;
  showDialog("Take your vision with you.", `<p class="dialog-description">From first ideas to the next conversation.</p><button class="export-option" id="export-svg">${icon("plan")}<span><strong>Export current view</strong><small>Scalable SVG · ${escape(exportName)} · ${view === "2d" ? "2D plan" : "3D concept"}</small></span></button><button class="export-option" id="export-json">${icon("file")}<span><strong>Download project</strong><small>Editable JSON · All floors, spaces, and property settings</small></span></button><p class="dialog-note">SVG exports include the current room layers and view, without the editor grid. Project files can be reopened through Project settings.</p>`, "THOUGHTFULLY MADE. READY TO SHARE.");
  $("#export-json").onclick = () => { download(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), ".forma.json"); closeDialog(); toast("Project file downloaded."); };
  $("#export-svg").onclick = () => {
    const clone = $("#plan").cloneNode(true);
    const box = $("#plan").viewBox.baseVal;
    clone.setAttribute("width", "1400"); clone.setAttribute("height", String(1400 * box.height / box.width));
    clone.querySelectorAll(".selection-handle").forEach(el => el.remove());
    clone.querySelectorAll(".selected").forEach(el => el.classList.remove("selected"));
    clone.insertAdjacentHTML("afterbegin", `<style>.room-label{font-family:Arial,sans-serif;fill:#46513e}.room-name{font-size:10px;font-weight:600;letter-spacing:1.2px}.room-area{font-size:9px;fill:#859076}.room-furniture{stroke:#89917a;stroke-width:1;fill:#edece2}.room-furniture .soft{fill:#dfdfcf}.room-furniture .detail{fill:none;stroke:#aaa993;stroke-width:.7}.dimension{font-size:9px;fill:#929c86;font-family:Arial,sans-serif}.dim-line{stroke:#aab39c;stroke-width:.7;fill:none}</style><rect x="${box.x}" width="${box.width}" height="690" fill="#f5f4ed"/><text x="${box.x + 28}" y="31" font-family="Arial,sans-serif" fill="#53694c" font-size="11">${escape(project.name)} · ${escape(exportName)}</text><text x="${box.x + 28}" y="670" font-family="Arial,sans-serif" fill="#829076" font-size="8">FORMA · CONCEPT DESIGN · NOT FOR CONSTRUCTION</text>`);
    download(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }), `-${exportName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.svg`);
    closeDialog(); toast("Your design view has been exported.");
  };
}
function importProject() {
  showDialog("Pick up where you left off.", `<p class="dialog-description">Upload a Forma project to continue editing its rooms, floors, materials, and property. Your current design stays open until you confirm.</p><div class="design-dropzone" id="design-dropzone">${icon("upload")}<strong>Drop your saved design here</strong><span>Forma .forma.json or .json · Up to 1 MB</span><button class="button" id="choose-design">Choose file</button><input id="design-file" type="file" accept=".forma.json,.json,application/json" hidden></div><p class="upload-error" id="upload-error" role="alert" hidden></p><p class="dialog-note" id="upload-status" role="status">Use Export → Download project to save an editable design file. SVG, image, PDF, and CAD files cannot be reopened for editing.</p><div id="design-preview" hidden></div><div class="upload-backup"><span>Want to keep the current design?</span><button id="backup-before-upload">Download a backup</button></div><p class="dialog-note">Opening a design replaces the current draft. Apply changes to save it or Revert to return to the last applied design.</p><div class="dialog-actions"><button class="button" id="cancel-upload">Cancel</button><button class="button primary" id="continue-design" disabled>Open & continue</button></div>`, "OPEN A SAVED DESIGN");
  const input = $("#design-file"), zone = $("#design-dropzone"), confirm = $("#continue-design");
  let pending = null, request = 0;
  function showError(message) {
    pending = null; confirm.disabled = true;
    $("#design-preview").hidden = true;
    $("#upload-error").textContent = message;
    $("#upload-error").hidden = false;
    $("#upload-status").textContent = "Your current design has not changed.";
  }
  async function loadFile(files) {
    const ticket = ++request;
    pending = null; confirm.disabled = true;
    $("#design-preview").hidden = true;
    $("#upload-error").hidden = true;
    if (files.length !== 1) { showError("Choose one Forma project file at a time."); return; }
    const file = files[0];
    $("#upload-status").textContent = `Reading ${file.name}…`;
    try {
      const imported = await readProjectFile(file);
      if (!input.isConnected || ticket !== request || !$("#app-dialog").open) return;
      pending = imported;
      const stats = projectStats(imported);
      $("#design-preview").innerHTML = `<span class="property-label">READY TO CONTINUE</span><strong>${escape(imported.name)}</strong><small>${escape(file.name)}</small><div class="upload-summary"><span>${stats.floors} ${stats.floors === 1 ? "floor" : "floors"}</span><span>${stats.rooms} ${stats.rooms === 1 ? "space" : "spaces"}</span><span>${areaText(stats.area)}</span></div><p>Lot ${lengthText(imported.property.width)} × ${lengthText(imported.property.depth)} · ${escape(imported.style)}</p>`;
      $("#design-preview").hidden = false;
      $("#upload-status").textContent = "Design checked. Open it when you are ready.";
      confirm.disabled = false;
    } catch (error) {
      if (input.isConnected && ticket === request && $("#app-dialog").open) showError(`Could not open design: ${error.message}`);
    }
  }
  $("#choose-design").onclick = () => input.click();
  input.onchange = () => { if (input.files.length) loadFile(input.files); };
  zone.ondragover = event => { event.preventDefault(); zone.classList.add("drag-over"); };
  zone.ondragleave = () => zone.classList.remove("drag-over");
  zone.ondrop = event => { event.preventDefault(); zone.classList.remove("drag-over"); loadFile(event.dataTransfer.files); };
  $("#cancel-upload").onclick = closeDialog;
  $("#backup-before-upload").onclick = projectBackup;
  confirm.onclick = () => {
    if (!pending) return;
    if (openDesign(pending)) {
      closeDialog(); $(".sidebar").classList.remove("open"); toast("Design opened. You can continue editing.");
    }
  };
}
function roomDirectory() {
  showDialog("A place for everything.", `<p class="dialog-description">${projectStats(project).rooms} spaces, each with a purpose. Select one to refine it.</p>${project.floors.map(f => `<h3 class="room-directory-floor">${escape(f.name.toUpperCase())}</h3>${f.rooms.map(r => `<button class="directory-room" data-directory-floor="${escape(f.id)}" data-directory-room="${escape(r.id)}">${icon(TYPES[r.type].icon)}${escape(r.name)}<small>${areaText(roomArea(r))}</small></button>`).join("") || '<p class="dialog-note">A blank canvas, ready for your ideas.</p>'}`).join("")}`, "ROOMS & SPACES");
}
function materialsDialog() {
  const materials = [["#d6c6a9", "Natural oak", "Warm grain · Living & private spaces"], ["#d7ded4", "Limestone tile", "Quiet texture · Bathrooms & utility"], ["#b8bdb4", "Polished concrete", "A grounded, contemporary finish"], ["#aab694", "Timber decking", "Natural connection · Outdoor living"]];
  showDialog("A palette with purpose.", `<p class="dialog-description">Four considered finishes. Select a room on the canvas to change its floor finish.</p>${materials.map(([color, name, description]) => `<div class="material-swatch"><span style="background:${color}"></span><div><strong>${name}</strong><small>${description}</small></div></div>`).join("")}`, "MATERIAL LIBRARY");
}
function shortcutsDialog() {
  showDialog("A little more flow.", [["Select & move", "V"], ["Pan canvas", "H"], ["Add a space", "R"], ["Undo", "⌘ / Ctrl Z"], ["Redo", "⌘ / Ctrl ⇧ Z"], ["Delete selected space", "Delete"], ["Deselect / close", "Esc"]].map(([label, key]) => `<div class="shortcut-row"><span>${label}</span><kbd>${key}</kbd></div>`).join(""), "KEYBOARD SHORTCUTS");
}
function setTool(value) {
  tool = value; render();
}
function setZoom(value) { zoom = Math.min(2.5, Math.max(.4, Math.round(value * 10) / 10)); render(); }
function svgPoint(event) {
  const p = new DOMPoint(event.clientX, event.clientY);
  return p.matrixTransform($("#plan").getScreenCTM().inverse());
}

hydrateIcons();
const responsiveUI = setupResponsiveUI();
$("#sample-count").textContent = SAMPLE_DESIGNS.length;
$("#space-library").innerHTML = ["bedroom", "bathroom", "kitchen", "living", "dining", "stairs", "hallway", "closet"].map(type => `<button class="library-item" data-add-type="${type}" title="Add ${TYPES[type].name.toLowerCase()}">${icon(TYPES[type].icon)}${TYPES[type].name}</button>`).join("");
document.addEventListener("click", event => {
  const add = event.target.closest("[data-add-type]");
  if (add) {
    if (add.closest(".sidebar")) responsiveUI.closeNavigation();
    addRoom(add.dataset.addType);
  }
  const floorButton = event.target.closest("[data-floor]");
  if (floorButton) selectFloor(floorButton.dataset.floor);
  const roomButton = event.target.closest("[data-select-room]");
  if (roomButton) { selectedOpening = null; selected = roomButton.dataset.selectRoom; render(); }
  const directoryButton = event.target.closest("[data-directory-room]");
  if (directoryButton) { selectFloor(directoryButton.dataset.directoryFloor); selected = directoryButton.dataset.directoryRoom; render(); closeDialog(); }
  const panel = event.target.closest("[data-panel]");
  if (panel) {
    responsiveUI.closeNavigation();
    const panels = {
      plan: () => setScope("floor"), property: () => setScope("property"), samples: sampleGallery,
      architecture: () => architecturalFeatures(), documentation: () => {
        activePanel = "documentation";
        render();
        documentationDialog({ getProject: () => project, showDialog, download, units: unitSystem });
      },
      rooms: roomDirectory, materials: materialsDialog, settings: projectDialog,
    };
    activePanel = panel.dataset.panel;
    panels[panel.dataset.panel]();
  }
});
$("#plan").addEventListener("pointerdown", event => {
  if (event.button !== 0 || drag) return;
  const featureId = event.target.closest("[data-feature]")?.dataset.feature;
  const feature = (project.features || []).find(item => item.id === featureId);
  if (featureId && tool !== "pan" && view === "2d" && (scope !== "floor" || feature?.type === "gate")) { event.preventDefault(); architecturalFeatures(featureId); return; }
  const target = event.target.closest("[data-room]");
  const point = svgPoint(event);
  if (tool === "pan") {
    drag = { mode: "pan", start: point, pan: { ...pan } };
  } else if (view === "3d") {
    drag = {
      mode: "orbit", start: { x: event.clientX, y: event.clientY }, camera: { ...camera }, moved: false,
      roomId: target?.dataset.room, floorId: event.target.closest("[data-property-floor]")?.dataset.propertyFloor,
      featureId,
    };
    $("#drawing-surface").classList.add("orbiting");
  } else if (scope === "property") {
    const site = event.target.closest("[data-site-item]");
    selectedSite = site?.dataset.siteItem || null;
    if (site) {
      drag = { mode: "site", id: selectedSite, start: point, clientStart: { x: event.clientX, y: event.clientY }, before: snapshot(), scale: drawing.scale, framing: drawing.framing, moved: false };
    }
    render();
  } else if (feature) {
    selected = feature.roomId;
    selectedOpening = feature.id;
    selectedCorner = null;
    drag = {
      mode: "opening", id: feature.id, action: event.target.closest("[data-opening-action]")?.dataset.openingAction || "move",
      start: point, clientStart: { x: event.clientX, y: event.clientY }, before: snapshot(),
      drawing: { ...drawing }, scale: drawing.scale, moved: false,
    };
    render();
  } else if (target) {
    selectedOpening = null;
    const previousSelected = selected;
    selected = target.dataset.room;
    const item = selection();
    if (previousSelected !== selected) selectedCorner = null;
    const cornerHandle = event.target.closest("[data-corner]");
    const wallHandle = event.target.closest("[data-wall]");
    if (cornerHandle) {
      selectedCorner = Number(cornerHandle.dataset.corner);
      drag = { mode: "corner", id: selected, index: selectedCorner, start: point, before: snapshot(), drawing: { ...drawing }, scale: drawing.scale, moved: false };
    } else if (wallHandle) {
      selectedCorner = null;
      drag = { mode: "wall", id: selected, index: Number(wallHandle.dataset.wall), start: point, before: snapshot(), drawing: { ...drawing }, scale: drawing.scale, moved: false };
    } else {
      drag = view === "2d" ? { mode: "room", id: selected, start: point, x: item.x, y: item.y, scale: drawing.scale, before: snapshot(), moved: false } : null;
    }
    render();
  } else { selectedOpening = null; selected = null; render(); }
  if (drag) { drag.pointerId = event.pointerId; $("#plan").setPointerCapture(event.pointerId); event.preventDefault(); }
});
$("#plan").addEventListener("pointermove", event => {
  if (!drag || drag.pointerId !== event.pointerId) return;
  if (drag.mode === "orbit") {
    const dx = event.clientX - drag.start.x, dy = event.clientY - drag.start.y;
    if (Math.hypot(dx, dy) > 4) drag.moved = true;
    if (drag.moved) setCamera(cameraFromDrag(drag.camera, dx, dy));
    return;
  }
  const point = svgPoint(event);
  const dx = (point.x - drag.start.x) / zoom, dy = (point.y - drag.start.y) / zoom;
  if (drag.mode === "pan") { pan = { x: drag.pan.x + dx * zoom, y: drag.pan.y + dy * zoom }; renderPlan(); }
  else if (drag.mode === "site") {
    if (!drag.started && Math.hypot(event.clientX - drag.clientStart.x, event.clientY - drag.clientStart.y) <= 4) return;
    drag.started = true;
    try {
      project = movePropertyItem(JSON.parse(drag.before), drag.id, Math.round(dx / drag.scale * 10) / 10, Math.round(dy / drag.scale * 10) / 10);
      drag.error = null;
      drag.moved = snapshot() !== drag.before;
    } catch (error) { drag.error = error.message; }
    renderPlan();
  }
  else if (drag.mode === "opening") {
    if (!drag.started && Math.hypot(event.clientX - drag.clientStart.x, event.clientY - drag.clientStart.y) <= 4) return;
    drag.started = true;
    try {
      project = shiftOpening(JSON.parse(drag.before), drag.id, drag.action, Math.round(dx / drag.scale * 10) / 10, Math.round(dy / drag.scale * 10) / 10);
      drag.error = null;
      drag.moved = snapshot() !== drag.before;
    } catch (error) { drag.error = error.message; }
    renderPlan();
  }
  else if (drag.mode === "room") {
    const item = selection();
    if (!item) return;
    item.x = Math.min(200, Math.max(-200, Math.round((drag.x + dx / drag.scale) * 2) / 2));
    item.y = Math.min(200, Math.max(-200, Math.round((drag.y + dy / drag.scale) * 2) / 2));
    drag.moved = item.x !== drag.x || item.y !== drag.y;
    const g = [...$("#plan").querySelectorAll("[data-room]")].find(el => el.dataset.room === item.id);
    if (item.railing || (project.features || []).some(f => f.roomId === item.id)) renderPlan();
    else if (g) g.setAttribute("transform", `translate(${drawing.x + item.x * drag.scale} ${drawing.y + item.y * drag.scale})`);
  } else if (drag.mode === "corner" || drag.mode === "wall") {
    const before = JSON.parse(drag.before);
    const originalFloor = before.floors.find(item => item.id === activeFloor);
    const dx = Math.round((point.x - drag.start.x) / (zoom * drag.scale) * 10) / 10;
    const dy = Math.round((point.y - drag.start.y) / (zoom * drag.scale) * 10) / 10;
    try {
      originalFloor.rooms = shiftSpaceBoundary(originalFloor.rooms, drag.id, drag.mode, drag.index, dx, dy, shiftSharedBoundaries, keepRightAngles);
      validateProject(before);
      project = before;
      drag.error = null;
      drag.moved = snapshot() !== drag.before;
    } catch (error) { drag.error = error.message; }
    renderPlan();
  }
});
function endDrag(event, cancelled = false) {
  if (!drag || drag.pointerId !== event.pointerId) return;
  const previous = drag;
  drag = null;
  $("#drawing-surface").classList.remove("orbiting");
  if ($("#plan").hasPointerCapture(event.pointerId)) $("#plan").releasePointerCapture(event.pointerId);
  if (cancelled || previous.error) {
    if (["room", "wall", "corner", "opening", "site"].includes(previous.mode)) project = JSON.parse(previous.before);
    if (previous.mode === "orbit") camera = previous.camera;
    if (previous.mode === "pan") pan = previous.pan;
    if (previous.error && !cancelled) toast(previous.error, true);
  } else if (["room", "wall", "corner", "opening", "site"].includes(previous.mode) && previous.moved) {
    try { validateProject(project); commit(previous.before); }
    catch (error) { project = JSON.parse(previous.before); toast(error.message, true); }
  }
  else if (previous.mode === "opening" && !previous.started && previous.action === "move") {
    render();
    if (previous.mode === "site") $(`#plan [data-site-item="${previous.id}"]`)?.focus();
    const root = [...$("#plan").querySelectorAll(".opening-controls")].find(el => el.dataset.feature === previous.id);
    root?.querySelector('[data-opening-action="move"]')?.focus();
    return;
  }
  else if (previous.mode === "orbit" && !previous.moved) {
    if (previous.featureId) { render(); architecturalFeatures(previous.featureId); return; }
    if (scope === "property" && previous.floorId) {
      activeFloor = previous.floorId; scope = "floor"; activePanel = "plan"; zoom = 1; pan = { x: 0, y: 0 };
      selected = previous.roomId || null;
    } else if (scope === "floor") selected = previous.roomId || null;
  }
  render();
}
$("#plan").addEventListener("pointerup", endDrag);
$("#plan").addEventListener("pointercancel", event => endDrag(event, true));
$("#plan").addEventListener("lostpointercapture", event => endDrag(event, true));
$("#plan").addEventListener("keydown", event => {
  if (drag) return;
  const handle = event.target.closest("[data-wall], [data-corner]");
  const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const siteId = event.target.closest("[data-site-item]")?.dataset.siteItem;
  if (siteId && scope === "property" && view === "2d" && tool !== "pan" && !event.metaKey && !event.ctrlKey && !event.altKey && (arrows[event.key] || ["Enter", " "].includes(event.key))) {
    event.preventDefault();
    selectedSite = siteId;
    if (arrows[event.key]) {
      const [dx, dy] = arrows[event.key].map(value => value * (event.shiftKey ? .5 : .1));
      change(() => { project = movePropertyItem(project, siteId, dx, dy); });
    } else render();
    $(`#plan [data-site-item="${siteId}"]`)?.focus();
    return;
  }
  const featureId = event.target.closest("[data-feature]")?.dataset.feature;
  const feature = (project.features || []).find(item => item.id === featureId);
  if (feature && ["door", "window"].includes(feature.type) && arrows[event.key] && view === "2d" && scope === "floor" && tool !== "pan" && !drag && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    const action = event.target.closest("[data-opening-action]")?.dataset.openingAction || "move";
    const distance = event.shiftKey ? .5 : .1;
    const [dx, dy] = arrows[event.key].map(value => value * distance);
    selected = feature.roomId;
    selectedOpening = feature.id;
    change(() => { project = shiftOpening(project, feature.id, action, dx, dy); });
    const root = [...$("#plan").querySelectorAll(".opening-controls")].find(el => el.dataset.feature === feature.id);
    root?.querySelector(`[data-opening-action="${action}"]`)?.focus();
    return;
  }
  if (handle && arrows[event.key] && view === "2d" && scope === "floor" && !drag) {
    event.preventDefault();
    const mode = handle.dataset.corner !== undefined ? "corner" : "wall";
    const index = Number(handle.dataset[mode]);
    const distance = event.shiftKey ? .5 : .1;
    const [dx, dy] = arrows[event.key].map(value => value * distance);
    change(() => { floor().rooms = shiftSpaceBoundary(floor().rooms, selected, mode, index, dx, dy, shiftSharedBoundaries, keepRightAngles); });
    $(`#plan [data-${mode}="${index}"][tabindex]`)?.focus();
    return;
  }
  if ((event.key === "Enter" || event.key === " ") && featureId) {
    event.preventDefault();
    if (feature && feature.type !== "gate" && view === "2d" && scope === "floor") {
      selected = feature.roomId; selectedOpening = feature.id; render();
      const root = [...$("#plan").querySelectorAll(".opening-controls")].find(el => el.dataset.feature === feature.id);
      root?.querySelector('[data-opening-action="move"]')?.focus();
    } else architecturalFeatures(featureId);
    return;
  }
  if ((event.key === "Enter" || event.key === " ") && event.target.dataset.propertyFloor) {
    event.preventDefault(); selectFloor(event.target.dataset.propertyFloor); return;
  }
  if ((event.key === "Enter" || event.key === " ") && event.target.dataset.room) {
    event.preventDefault(); selectedOpening = null; selected = event.target.dataset.room; render();
    $("#room-name")?.focus();
  }
});
$("#apply-button").onclick = applyChanges;
$("#revert-button").onclick = revertDialog;
$("#open-design-button").onclick = importProject;
$("#export-button").onclick = exportDialog;
$("#rename-project").onclick = projectDialog;
$("#project-details").onclick = projectDialog;
$("#add-floor").onclick = () => { responsiveUI.closeNavigation(); addFloorDialog(); };
$("#toolbar-add").onclick = addToCanvas;
$("#browse-spaces").onclick = () => { responsiveUI.closeNavigation(); addDialog(); };
$("#scope-floor").onclick = () => setScope("floor");
$("#scope-property").onclick = () => setScope("property");
$("#empty-add").onclick = addDialog;
$("#undo").onclick = () => history();
$("#redo").onclick = () => history(true);
$("#view-2d").onclick = () => { view = "2d"; render(); };
$("#view-3d").onclick = () => { view = "3d"; render(); };
$("#camera-yaw").oninput = event => setCamera({ ...camera, yaw: Number(event.target.value) });
$("#camera-pitch").oninput = event => setCamera({ ...camera, pitch: Number(event.target.value) });
$("#reset-camera").onclick = () => { camera = { ...DEFAULT_CAMERA }; zoom = 1; pan = { x: 0, y: 0 }; render(); };
$("#tool-select").onclick = () => setTool("select");
$("#tool-pan").onclick = () => setTool("pan");
$("#toggle-dimensions").onclick = () => { dimensions = !dimensions; $("#toggle-dimensions").classList.toggle("active", dimensions); $("#toggle-dimensions").setAttribute("aria-pressed", dimensions); renderPlan(); };
$("#layers-button").onclick = () => { const el = $("#layers-popover"); el.hidden = !el.hidden; $("#layers-button").setAttribute("aria-expanded", !el.hidden); };
$("#layer-furniture").onchange = renderPlan;
$("#layer-labels").onchange = renderPlan;
$("#layer-grid").onchange = event => $("#drawing-surface").classList.toggle("no-grid", !event.target.checked);
$("#zoom-in").onclick = () => setZoom(zoom + .1);
$("#zoom-out").onclick = () => setZoom(zoom - .1);
$("#zoom-fit").onclick = () => { zoom = 1; pan = { x: 0, y: 0 }; render(); };
$("#close-dialog").onclick = closeDialog;
$("#app-dialog").addEventListener("click", event => { if (event.target === $("#app-dialog")) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDialog(); } });
$("#shortcuts-button").onclick = shortcutsDialog;
$("#about-button").onclick = () => showDialog("A space for possibility.", '<p class="dialog-description">Forma is your personal contemporary home-design studio. Compose spaces, explore proportions, and imagine everyday life in a home that feels like you.</p><p class="dialog-description">Your project stays in this browser. Download a project file to keep a backup or continue in another browser. No account, no cloud, just room to create.</p><p class="dialog-note">The Forma logo returns to this workspace. Concept planning only. Walls, doors, windows, and furniture are illustrative; plans are not code-checked or construction-ready.</p>', "WELCOME TO FORMA");
document.addEventListener("keydown", event => {
  const editing = ["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName);
  if (event.key === "Escape" && ["opening", "site"].includes(drag?.mode)) {
    event.preventDefault(); endDrag({ pointerId: drag.pointerId }, true); return;
  }
  if (["opening", "site"].includes(drag?.mode)) { event.preventDefault(); return; }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") { event.preventDefault(); applyChanges(); return; }
  if (editing || $("#app-dialog").open) return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") { event.preventDefault(); history(event.shiftKey); }
  else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); roomDirectory(); }
  else if (event.key === "Escape") {
    if (selectedOpening) selectedOpening = null;
    else selected = null;
    responsiveUI.closeNavigation(); render();
  }
  else if (event.key.toLowerCase() === "v") setTool("select");
  else if (event.key.toLowerCase() === "h") setTool("pan");
  else if (event.key.toLowerCase() === "r") addDialog();
  else if ((event.key === "Delete" || event.key === "Backspace") && selection()) {
    event.preventDefault();
    if (!event.target.closest("[data-feature]")) deleteRoom(selection());
  }
});
render();
let resizeFrame;
new ResizeObserver(() => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => { renderPlan(); updateScale(); });
}).observe($("#drawing-surface"));
$(".meta-date").textContent = `${project.style.toUpperCase()} RESIDENTIAL`;
if (restoreError) $("#save-state").textContent = "Local restore failed";
const startupErrors = [restoreError, unitPreferenceError].filter(Boolean);
if (startupErrors.length) toast(startupErrors.join(" "), true);
window.addEventListener("beforeunload", event => {
  if (!hasPendingChanges()) return;
  event.preventDefault();
  event.returnValue = "";
});
