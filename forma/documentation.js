import { TYPES, isOutdoor, exteriorRoomWalls, bounds, roomArea, roomVertices } from "./model.js";
import { escape } from "./architecture.js";
import { areaUnit, formatArea, formatLength, fromMeters, inputLengthLimit, toMeters } from "./units.js";

const SIDES = ["north", "east", "south", "west"];
const COLORS = { ink: "#344137", muted: "#778277", wall: "#d8ddd2", cut: "#899888", glass: "#b9d6d3", paper: "#f8f7f2", line: "#aab2a7" };
const fmt = value => Number(value.toFixed(2)).toString();
const roomsFor = floor => floor.rooms.filter(room => !isOutdoor(room));
const projectRooms = project => project.floors.flatMap(roomsFor);
const sideLabel = side => `${side[0].toUpperCase()}${side.slice(1)} elevation`;

function frame(project, title, width, height, content) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escape(title)}"><rect width="${width}" height="${height}" fill="${COLORS.paper}"/><text x="34" y="34" fill="${COLORS.muted}" font-family="Arial,sans-serif" font-size="10" letter-spacing="2">FORMA · ARCHITECTURAL STUDY</text><text x="34" y="64" fill="${COLORS.ink}" font-family="Arial,sans-serif" font-size="23" font-weight="600">${escape(project.name)}</text><text x="34" y="87" fill="${COLORS.muted}" font-family="Arial,sans-serif" font-size="13">${escape(title)}</text>${content}<path d="M34 ${height - 38}H${width - 34}" stroke="${COLORS.line}"/><text x="34" y="${height - 17}" fill="${COLORS.muted}" font-family="Arial,sans-serif" font-size="9" letter-spacing="1">CONCEPT DESIGN · NOT FOR CONSTRUCTION</text></svg>`;
}

function elevation(project, side, units) {
  if (!SIDES.includes(side)) throw new Error("Choose a valid elevation direction.");
  const rooms = projectRooms(project);
  if (!rooms.length) return frame(project, sideLabel(side), 900, 520, '<text x="450" y="275" text-anchor="middle" fill="#778277" font-family="Arial,sans-serif" font-size="14">Add indoor spaces to generate an elevation.</text>');
  const vertical = side === "east" || side === "west";
  const start = vertical ? room => room.y : room => room.x;
  const end = vertical ? room => room.y + room.depth : room => room.x + room.width;
  const min = Math.min(...rooms.map(start)), max = Math.max(...rooms.map(end));
  const totalHeight = project.floors.length * project.ceiling;
  const unit = Math.min(740 / Math.max(max - min, 1), 330 / Math.max(totalHeight, 1), 48);
  const left = 96, ground = 448;
  const content = [`<text x="${left}" y="119" fill="${COLORS.ink}" font-family="Arial,sans-serif" font-size="12" font-weight="600">${sideLabel(side).toUpperCase()}</text>`, `<path d="M${left - 15} ${ground}H${left + (max - min) * unit + 15}" stroke="${COLORS.ink}" stroke-width="1.5"/>`];
  for (let index = 0; index < project.floors.length; index++) {
    const floor = project.floors[index];
    for (const wall of exteriorRoomWalls(roomsFor(floor)).filter(edge => {
      const direction = { north: [0, -1], east: [1, 0], south: [0, 1], west: [-1, 0] }[side];
      return edge.normal[0] * direction[0] + edge.normal[1] * direction[1] > 1e-8;
    })) {
      const verticalWall = Math.abs(wall.b[0] - wall.a[0]) < 1e-8;
      const from = vertical ? Math.min(wall.a[1], wall.b[1]) : Math.min(wall.a[0], wall.b[0]);
      const to = vertical ? Math.max(wall.a[1], wall.b[1]) : Math.max(wall.a[0], wall.b[0]);
      const axisAligned = vertical ? verticalWall : Math.abs(wall.b[1] - wall.a[1]) < 1e-8;
      const x = left + (from - min) * unit;
      const width = (to - from) * unit;
      const base = ground - index * project.ceiling * unit;
      const top = base - project.ceiling * unit;
      content.push(`<rect x="${fmt(x)}" y="${fmt(top)}" width="${fmt(width)}" height="${fmt(base - top)}" fill="${COLORS.wall}" stroke="${COLORS.ink}" stroke-width="1"/>`);
      const specified = axisAligned ? (project.features || []).filter(item => item.roomId === wall.room.id && item.floorId === floor.id && item.side === side && item.type !== "gate") : [];
      const roomHasFeatures = (project.features || []).some(item => item.roomId === wall.room.id);
      const openings = specified.length ? specified.map(feature => ({
        name: feature.name, type: feature.type, along: start(wall.room) + feature.offset,
        width: feature.width, height: feature.height, sill: feature.sill,
      })) : !roomHasFeatures && !wall.room.outline && axisAligned && side === "north" ? [{
        name: "Illustrative window", type: "window", along: start(wall.room) + wall.room.width * .25,
        width: Math.min(wall.room.width * .4, 2.25), height: 1.2, sill: .8,
      }] : !roomHasFeatures && !wall.room.outline && axisAligned && side === "south" && wall.room.type !== "stairs" ? [{
        name: "Illustrative door", type: "door", along: start(wall.room) + wall.room.width * .12,
        width: Math.min(.65, wall.room.width * .23, wall.room.depth * .25), height: Math.min(2.1, project.ceiling), sill: 0,
      }] : [];
      for (const opening of openings) {
        if (opening.along < from || opening.along + opening.width > to) continue;
        const openingX = left + (opening.along - min) * unit;
        const openingY = base - (opening.sill + opening.height) * unit;
        const openingHeight = opening.height * unit;
        content.push(`<g aria-label="${escape(opening.name)}"><title>${escape(opening.name)}</title><rect x="${fmt(openingX)}" y="${fmt(openingY)}" width="${fmt(opening.width * unit)}" height="${fmt(openingHeight)}" fill="${opening.type === "window" ? COLORS.glass : COLORS.paper}" stroke="${COLORS.ink}" stroke-width="1"/></g>`);
        if (opening.type === "window") content.push(`<path d="M${fmt(openingX)} ${fmt(openingY + openingHeight / 2)}h${fmt(opening.width * unit)}M${fmt(openingX + opening.width * unit / 2)} ${fmt(openingY)}v${fmt(openingHeight)}" stroke="${COLORS.ink}" stroke-width=".8"/>`);
      }
    }
    const levelY = ground - index * project.ceiling * unit;
    content.push(`<path d="M${left - 23} ${fmt(levelY)}h12m-6-4v8" stroke="${COLORS.ink}"/><text x="${left - 29}" y="${fmt(levelY + 4)}" text-anchor="end" fill="${COLORS.muted}" font-family="Arial,sans-serif" font-size="9">${escape(floor.name)}</text>`);
  }
  content.push(`<text x="${left}" y="478" fill="${COLORS.muted}" font-family="Arial,sans-serif" font-size="10">${formatLength(max - min, units)}</text>`);
  return frame(project, sideLabel(side), 900, 520, content.join(""));
}

function section(project, axis, offset, units) {
  if (!["x", "y"].includes(axis)) throw new Error("Choose a valid section direction.");
  if (typeof offset !== "number" || !Number.isFinite(offset)) throw new Error("Section position must be a finite number.");
  const rooms = projectRooms(project);
  if (!rooms.length) return frame(project, "Building section", 900, 520, '<text x="450" y="275" text-anchor="middle" fill="#778277" font-family="Arial,sans-serif" font-size="14">Add indoor spaces to generate a section.</text>');
  const projectBounds = bounds(rooms);
  const min = axis === "x" ? projectBounds.x : projectBounds.y;
  const max = axis === "x" ? projectBounds.x + projectBounds.width : projectBounds.y + projectBounds.depth;
  if (offset < min || offset > max) throw new Error(`Section position must be between ${formatLength(min, units)} and ${formatLength(max, units)}.`);
  const alongIndex = axis === "x" ? 1 : 0;
  const alongValues = rooms.flatMap(roomVertices).map(point => point[alongIndex]);
  const minAlong = Math.min(...alongValues), maxAlong = Math.max(...alongValues);
  const totalHeight = project.floors.length * project.ceiling;
  const unit = Math.min(740 / Math.max(maxAlong - minAlong, 1), 330 / Math.max(totalHeight, 1), 48);
  const left = 96, ground = 448;
  const content = [`<text x="${left}" y="119" fill="${COLORS.ink}" font-family="Arial,sans-serif" font-size="12" font-weight="600">SECTION ${axis.toUpperCase()}–${axis.toUpperCase()} · CUT AT ${formatLength(offset, units)}</text>`, `<path d="M${left - 10} ${ground}H${left + (maxAlong - minAlong) * unit + 15}" stroke="${COLORS.ink}" stroke-width="1.5"/>`];
  for (let index = 0; index < project.floors.length; index++) {
    const floor = project.floors[index], base = ground - index * project.ceiling * unit, top = base - project.ceiling * unit;
    content.push(`<path d="M${left - 18} ${fmt(base)}H${left + (maxAlong - minAlong) * unit + 15}" stroke="${COLORS.line}" stroke-width="1" stroke-dasharray="4 4"/>`);
    content.push(`<text x="${left - 24}" y="${fmt(base - 5)}" text-anchor="end" fill="${COLORS.muted}" font-family="Arial,sans-serif" font-size="9">${escape(floor.name)}</text>`);
    for (const room of roomsFor(floor)) {
      const spans = sectionSpans(room, axis, offset);
      const fill = TYPES[room.type].color;
      for (const [from, to] of spans) {
        const x = left + (from - minAlong) * unit, width = (to - from) * unit;
        content.push(`<rect x="${fmt(x)}" y="${fmt(top)}" width="${fmt(width)}" height="${fmt(base - top)}" fill="${fill}" fill-opacity=".72" stroke="${COLORS.ink}" stroke-width="1.2"/>`);
        content.push(`<text x="${fmt(x + width / 2)}" y="${fmt((top + base) / 2)}" text-anchor="middle" fill="${COLORS.ink}" font-family="Arial,sans-serif" font-size="10">${escape(room.name)}</text>`);
      }
    }
  }
  content.push(`<text x="${left}" y="478" fill="${COLORS.muted}" font-family="Arial,sans-serif" font-size="10">${formatLength(maxAlong - minAlong, units)} · Section ${axis.toUpperCase()}–${axis.toUpperCase()}</text>`);
  return frame(project, "Building section", 900, 520, content.join(""));
}

function sectionSpans(room, axis, offset) {
  const vertices = roomVertices(room), crossings = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    const aCross = a[axis === "x" ? 0 : 1], bCross = b[axis === "x" ? 0 : 1];
    if ((aCross <= offset && bCross > offset) || (bCross <= offset && aCross > offset)) {
      const ratio = (offset - aCross) / (bCross - aCross);
      crossings.push(a[axis === "x" ? 1 : 0] + (b[axis === "x" ? 1 : 0] - a[axis === "x" ? 1 : 0]) * ratio);
    }
  }
  crossings.sort((a, b) => a - b);
  return Array.from({ length: Math.floor(crossings.length / 2) }, (_, index) => [crossings[index * 2], crossings[index * 2 + 1]]);
}

export function roomSchedule(project, units = "metric") {
  return project.floors.flatMap((floor, level) => floor.rooms.map(room => ({
    level: level ? String(level).padStart(2, "0") : "G",
    floor: floor.name,
    room: room.name,
    type: TYPES[room.type].name,
    area: roomArea(room),
    dimensions: `${formatLength(room.width, units)} × ${formatLength(room.depth, units)}`,
    finish: room.material,
  })));
}

export function openingSchedule(project, units = "metric") {
  return (project.features || []).map(feature => {
    const floor = project.floors.find(item => item.id === feature.floorId);
    const room = floor?.rooms.find(item => item.id === feature.roomId);
    return {
      name: feature.name,
      type: feature.type,
      host: room ? `${floor.name} / ${room.name}` : "Property boundary",
      side: feature.side,
      dimensions: units === "imperial"
        ? `${formatLength(feature.width, units)} × ${formatLength(feature.height, units)}`
        : `${Number(fromMeters(feature.width, units).toFixed(2)).toString()} × ${formatLength(feature.height, units)}`,
      sill: formatLength(feature.sill, units),
      offset: formatLength(feature.offset, units),
      specification: `${feature.style} · ${feature.material} · ${feature.glazing} glazing`,
    };
  });
}

const csv = value => `"${String(value).replaceAll('"', '""')}"`;
export function scheduleCsv(project, kind, units = "metric") {
  const rows = kind === "rooms" ? roomSchedule(project, units) : kind === "openings" ? openingSchedule(project, units) : null;
  if (!rows) throw new Error("Choose a supported schedule.");
  const columns = kind === "rooms"
    ? [["level", "Level"], ["floor", "Floor"], ["room", "Room"], ["type", "Type"], ["area", `Area (${areaUnit(units)})`], ["dimensions", "Dimensions"], ["finish", "Finish"]]
    : [["name", "Name"], ["type", "Type"], ["host", "Host"], ["side", "Side"], ["dimensions", "Dimensions"], ["sill", "Sill"], ["offset", "Offset"], ["specification", "Specification"]];
  return [columns.map(([, label]) => csv(label)).join(","), ...rows.map(row => columns.map(([key]) => csv(key === "area" ? formatArea(row[key], units) : row[key])).join(","))].join("\n");
}

export function renderDocumentationDrawing(project, options = {}) {
  const units = options.units || "metric";
  if (options.view === "section") return section(project, options.axis || "x", options.offset ?? 0, units);
  return elevation(project, options.side || "south", units);
}

export function documentationDialog({ getProject, showDialog, download, units = "metric" }) {
  let drawing = "elevation", side = "south", axis = "x", offset;
  const $ = selector => document.querySelector(selector);
  const numericBounds = () => {
    const box = bounds(projectRooms(getProject()));
    return axis === "x" ? [box.x, box.x + box.width] : [box.y, box.y + box.depth];
  };
  function render() {
    const project = getProject();
    const [min, max] = numericBounds();
    if (offset === undefined || offset < min || offset > max) offset = Math.round(((min + max) / 2) * 10) / 10;
    const isRooms = drawing === "rooms", isOpenings = drawing === "openings";
    const schedule = isRooms ? roomSchedule(project, units) : openingSchedule(project, units);
    const columns = isRooms
      ? [["level", "Level"], ["floor", "Floor"], ["room", "Space"], ["type", "Type"], ["area", `Area (${areaUnit(units)})`], ["dimensions", "Dimensions"], ["finish", "Finish"]]
      : [["name", "Name"], ["type", "Type"], ["host", "Host"], ["side", "Side"], ["dimensions", "Size"], ["sill", "Sill"], ["offset", "Offset"], ["specification", "Specification"]];
    const content = isRooms || isOpenings
      ? `<div class="documentation-table-wrap"><table class="documentation-table"><thead><tr>${columns.map(([, label]) => `<th>${label}</th>`).join("")}</tr></thead><tbody>${schedule.map(row => `<tr>${columns.map(([key]) => `<td>${escape(key === "area" ? formatArea(row[key], units) : row[key])}</td>`).join("")}</tr>`).join("")}</tbody></table>${schedule.length ? "" : `<p class="dialog-description">${isRooms ? "Add spaces to your floors to populate the room schedule." : "No specified doors, windows, or gates yet. Add them in Doors, windows & gates."}</p>`}</div>`
      : `<div class="documentation-drawing">${renderDocumentationDrawing(project, { view: drawing, side, axis, offset, units })}</div>`;
    const controls = drawing === "elevation"
      ? `<label>Facade<select id="documentation-side">${SIDES.map(value => `<option value="${value}" ${side === value ? "selected" : ""}>${sideLabel(value)}</option>`).join("")}</select></label>`
      : drawing === "section"
        ? `<label>Section<select id="documentation-axis"><option value="x" ${axis === "x" ? "selected" : ""}>A–A · looking along X</option><option value="y" ${axis === "y" ? "selected" : ""}>B–B · looking along Y</option></select></label><label>Cut position <output>${formatLength(offset, units)}</output><input id="documentation-offset" type="range" min="${inputLengthLimit(min, units)}" max="${inputLengthLimit(max, units)}" step="${units === "imperial" ? "any" : ".1"}" value="${fromMeters(offset, units)}"></label>`
        : "";
    showDialog("Project documentation", `<p class="dialog-description">Generate coordinated concept elevations and sections, plus live room and opening schedules from this project.</p><div class="documentation-controls"><label>View<select id="documentation-view"><option value="elevation" ${drawing === "elevation" ? "selected" : ""}>Elevations</option><option value="section" ${drawing === "section" ? "selected" : ""}>Sections</option><option value="rooms" ${isRooms ? "selected" : ""}>Room schedule</option><option value="openings" ${isOpenings ? "selected" : ""}>Door, window & gate schedule</option></select></label>${controls}</div>${content}<div class="dialog-actions documentation-actions"><button class="button primary" id="documentation-download">${isRooms || isOpenings ? "Download CSV" : "Download SVG"}</button></div><p class="dialog-note">Drawings are schematic studies based on room footprints, uniform floor heights, and specified openings. They are not construction documents, code-compliant elevations, or a substitute for professional review.</p>`, "ARCHITECTURAL SET");
    $("#app-dialog").classList.add("documentation-dialog");
    $("#documentation-view").onchange = event => { drawing = event.target.value; render(); };
    if ($("#documentation-side")) $("#documentation-side").onchange = event => { side = event.target.value; render(); };
    if ($("#documentation-axis")) $("#documentation-axis").onchange = event => { axis = event.target.value; offset = undefined; render(); };
    if ($("#documentation-offset")) $("#documentation-offset").oninput = event => {
      offset = toMeters(Number(event.target.value), units);
      event.target.previousElementSibling.textContent = formatLength(offset, units);
      $(".documentation-drawing").innerHTML = renderDocumentationDrawing(project, { view: drawing, side, axis, offset, units });
    };
    $("#documentation-download").onclick = () => {
      const csvView = isRooms || isOpenings;
      const label = isRooms ? "room-schedule" : isOpenings ? "opening-schedule" : drawing === "section" ? `section-${axis}` : `elevation-${side}`;
      const data = csvView ? scheduleCsv(project, isRooms ? "rooms" : "openings", units) : renderDocumentationDrawing(project, { view: drawing, side, axis, offset, units });
      download(new Blob([data], { type: csvView ? "text/csv;charset=utf-8" : "image/svg+xml;charset=utf-8" }), `-${label}.${csvView ? "csv" : "svg"}`);
    };
  }
  render();
}
