import { validateProject } from "./model.js";
import { escape } from "./architecture.js";
import { formatLength } from "./units.js";

const clean = value => Math.round(value * 1e9) / 1e9;

export function shiftOpening(project, id, action, dx, dy) {
  const feature = (project.features || []).find(item => item.id === id);
  if (!feature || !["door", "window"].includes(feature.type)) throw new Error("Select a door or window to move or resize.");
  if (!["move", "start", "end"].includes(action)) throw new Error("Choose a valid opening adjustment.");
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new Error("Opening movement must be a finite distance.");
  const distance = ["north", "south"].includes(feature.side) ? dx : dy;
  const updated = { ...feature };
  if (action === "move" || action === "start") updated.offset = clean(feature.offset + distance);
  if (action === "start") updated.width = clean(feature.width - distance);
  if (action === "end") updated.width = clean(feature.width + distance);
  const result = { ...project, features: project.features.map(item => item.id === id ? updated : item) };
  validateProject(result);
  return result;
}

export function openingEditMarkup(feature, vertices, point, units = "metric") {
  const [a, b] = vertices.map(vertex => point(...vertex));
  const vertical = ["east", "west"].includes(feature.side);
  const cursor = vertical ? "ns-resize" : "ew-resize";
  const endpoints = [a, b].map((p, index) => {
    const action = index ? "end" : "start";
    return `<circle data-opening-action="${action}" cx="${p.x}" cy="${p.y}" r="5" fill="#f4f3e8" stroke="#38885c" stroke-width="2" tabindex="0" role="button" aria-label="Resize ${action} of ${escape(feature.name)}" style="cursor:${cursor}"><title>Drag to resize ${escape(feature.type)}</title></circle>`;
  }).join("");
  const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
  return `<g class="opening-controls" data-feature="${escape(feature.id)}"><rect data-opening-action="move" x="${x - 4}" y="${y - 4}" width="8" height="8" fill="#b9e4cb" stroke="#38885c" stroke-width="2" tabindex="0" role="button" aria-label="Move ${escape(feature.name)}" style="cursor:move"><title>Drag along the wall to move</title></rect>${endpoints}<text x="${x + (vertical ? 12 : 0)}" y="${y + (vertical ? 0 : -14)}" text-anchor="${vertical ? "start" : "middle"}" fill="#38885c" font-size="10" pointer-events="none">${escape(formatLength(feature.width, units))}</text></g>`;
}
