import { formatLength } from "./units.js";
import { railingSettings } from "./envelope.js?v=20261122-5";

export const FEATURE_STYLES = {
  door: ["hinged", "sliding", "double", "pivot"],
  window: ["fixed", "casement", "sliding"],
  gate: ["swing", "sliding", "double"],
};
export const FEATURE_MATERIALS = { timber: "#aa8966", aluminum: "#9ba9ad", steel: "#687777", glass: "#9fc4c1" };
export const GLAZING = ["none", "single", "double", "triple"];
export const SIDES = ["north", "east", "south", "west"];
export const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function fenceSettings(project) {
  return project.property.fence ?? { enabled: (project.features || []).some(f => f.type === "gate"), height: 1.8, style: "slatted", material: "steel" };
}
export function validateFence(fence) {
  if (fence === undefined) return;
  if (!fence || typeof fence.enabled !== "boolean" || !["solid", "slatted"].includes(fence.style) || !Object.hasOwn(FEATURE_MATERIALS, fence.material)) throw new Error("Choose valid boundary fence settings.");
  if (!Number.isFinite(fence.height) || fence.height < .5 || fence.height > 4) throw new Error("Fence height must be between 0.5 and 4 meters.");
}
export function boundaryFence(project) {
  const settings = fenceSettings(project);
  if (!settings.enabled) return [];
  const host = { x: 0, y: 0, width: project.property.width, depth: project.property.depth };
  return SIDES.flatMap(side => {
    let spans = [[0, wallLength(host, side)]];
    for (const gate of (project.features || []).filter(f => f.type === "gate" && f.side === side)) {
      spans = spans.flatMap(([a, b]) => gate.offset >= b || gate.offset + gate.width <= a ? [[a, b]] :
        [[a, Math.max(a, gate.offset)], [Math.min(b, gate.offset + gate.width), b]].filter(([start, end]) => end - start > 1e-8));
    }
    return spans.map(([from, to]) => ({
      side, from, to, vertices: featureVertices({ side, offset: from, width: to - from, height: settings.height, sill: 0 }, host),
    }));
  });
}
export function fenceMarkup(vertices, settings, point, plan = false, units = "metric") {
  const coords = vertices.map(v => point(...v)), frame = FEATURE_MATERIALS[settings.material];
  const line = (a, b, width = 1) => `<path d="M${a.x} ${a.y}L${b.x} ${b.y}" fill="none" stroke="${frame}" stroke-width="${width}"/>`;
  let markup = plan ? line(coords[0], coords[1], 3) : `<polygon points="${coords.map(p => `${p.x},${p.y}`).join(" ")}" fill="${settings.material === "glass" ? "#a5c5bf55" : settings.style === "slatted" ? "#b6c4b955" : frame}" stroke="${frame}" stroke-width="1"/>`;
  if (!plan) {
    markup += line(coords[3], coords[2], 2);
    const length = Math.hypot(vertices[1][0] - vertices[0][0], vertices[1][1] - vertices[0][1]);
    const sections = Math.ceil(length / (settings.style === "slatted" ? .35 : 2.5));
    for (let i = 0; i <= sections; i++) {
      const t = i / sections;
      markup += line({ x: coords[0].x + (coords[1].x - coords[0].x) * t, y: coords[0].y + (coords[1].y - coords[0].y) * t },
        { x: coords[3].x + (coords[2].x - coords[3].x) * t, y: coords[3].y + (coords[2].y - coords[3].y) * t }, settings.style === "slatted" ? 1.2 : 1);
    }
  }
  return `<g data-boundary-fence="true" pointer-events="none"><title>${escape(`${formatLength(settings.height, units)} ${settings.material} ${settings.style} boundary fence`)}</title>${markup}</g>`;
}

export function featureHost(project, feature) {
  if (feature.type === "gate") return { x: 0, y: 0, width: project.property.width, depth: project.property.depth };
  return project.floors.find(f => f.id === feature.floorId)?.rooms.find(r => r.id === feature.roomId);
}
export const wallLength = (host, side) => ["north", "south"].includes(side) ? host.width : host.depth;

export function featureVertices(feature, host, base = 0, origin = { x: 0, y: 0 }, heightScale = 1) {
  const vertical = ["east", "west"].includes(feature.side);
  const x = host.x + origin.x + (feature.side === "east" ? host.width : 0);
  const y = host.y + origin.y + (feature.side === "south" ? host.depth : 0);
  const at = along => vertical ? [x, y + along] : [x + along, y];
  const a = at(feature.offset), b = at(feature.offset + feature.width);
  const low = base + feature.sill * heightScale, high = low + feature.height * heightScale;
  return [[...a, low], [...b, low], [...b, high], [...a, high]];
}

export function validateFeatures(project, ids = new Set()) {
  if (project.features === undefined) return;
  if (!Array.isArray(project.features) || project.features.length > 400) throw new Error("A project supports up to 400 architectural features.");
  for (const f of project.features) {
    if (!f || !Object.hasOwn(FEATURE_STYLES, f.type)) throw new Error("Choose a door, window, or gate.");
    if (typeof f.id !== "string" || !f.id || f.id.length > 100 || ids.has(f.id)) throw new Error("Each architectural feature must have a unique ID.");
    ids.add(f.id);
    if (typeof f.name !== "string" || !f.name.trim() || f.name.length > 60) throw new Error("Feature names must be between 1 and 60 characters.");
    if (!SIDES.includes(f.side) || !FEATURE_STYLES[f.type].includes(f.style) || !Object.hasOwn(FEATURE_MATERIALS, f.material) || !GLAZING.includes(f.glazing)) throw new Error("Choose supported feature specifications.");
    const host = featureHost(project, f);
    if (!host || (f.type !== "gate" && ["terrace", "balcony"].includes(host.type))) throw new Error("Doors and windows must be attached to an enclosed room.");
    if (f.type !== "gate" && host.outline !== undefined) throw new Error("Remove custom room corners before adding doors or windows.");
    if (f.type === "gate" && (f.roomId !== undefined || f.floorId !== undefined)) throw new Error("Gates belong to the lot boundary, not a room or floor.");
    if (!Number.isFinite(f.offset) || f.offset < 0 || !Number.isFinite(f.width) || f.width < .3 || f.width > 12 || f.offset + f.width > wallLength(host, f.side) + 1e-8) throw new Error(`${f.name}: width and offset must fit along the selected wall or boundary.`);
    const maxHeight = f.type === "gate" ? 4 : project.ceiling;
    if (!Number.isFinite(f.sill) || f.sill < 0 || !Number.isFinite(f.height) || f.height < .3 || f.sill + f.height > maxHeight + 1e-8) throw new Error(`${f.name}: height plus sill must fit below ${maxHeight} m.`);
    if (f.type !== "window" && f.sill !== 0) throw new Error("Doors and gates must start at ground or floor level (sill 0).");
    if (f.type === "window" && f.glazing === "none") throw new Error("Choose glazing for the window.");
    if (f.material === "glass" && f.glazing === "none") throw new Error("Glass features require a glazing specification.");
  }
  for (let i = 0; i < project.features.length; i++) {
    const a = project.features[i], av = featureVertices(a, featureHost(project, a));
    for (const b of project.features.slice(i + 1)) {
      if ((a.type === "gate") !== (b.type === "gate") || a.floorId !== b.floorId) continue;
      const bv = featureVertices(b, featureHost(project, b));
      const vertical = ["east", "west"].includes(a.side), otherVertical = ["east", "west"].includes(b.side);
      if (vertical !== otherVertical) continue;
      const fixed = vertical ? 0 : 1, along = vertical ? 1 : 0;
      if (Math.abs(av[0][fixed] - bv[0][fixed]) > 1e-8) continue;
      if (av[0][along] < bv[1][along] - 1e-8 && av[1][along] > bv[0][along] + 1e-8 && av[0][2] < bv[2][2] - 1e-8 && av[2][2] > bv[0][2] + 1e-8) {
        throw new Error(`${a.name} overlaps ${b.name}. Adjust the wall, offset, width, or sill.`);
      }
    }
  }
}

export function featureMarkup(feature, vertices, point, plan = false, units = "metric", action = "Edit") {
  const coords = vertices.map(v => point(...v));
  const line = (a, b, color, width = 1) => `<path d="M${a.x} ${a.y}L${b.x} ${b.y}" fill="none" stroke="${color}" stroke-width="${width}"/>`;
  const fill = feature.glazing === "none" ? FEATURE_MATERIALS[feature.material] : "#9fc4c1";
  const frame = FEATURE_MATERIALS[feature.material];
  let markup;
  if (plan) {
    const [a, b] = coords;
    markup = line(a, b, "#f1f3e8", 7) + line(a, b, frame, feature.type === "window" ? 3 : 2);
    const dx = b.x - a.x, dy = b.y - a.y;
    const sign = ["north", "east"].includes(feature.side) ? 1 : -1;
    const tip = { x: a.x - dy * sign, y: a.y + dx * sign };
    if (["hinged", "swing", "pivot", "casement"].includes(feature.style)) {
      markup += line(a, tip, frame) + `<path d="M${b.x} ${b.y}Q${tip.x + dx} ${tip.y + dy} ${tip.x} ${tip.y}" stroke="${frame}" stroke-width=".8" fill="none" stroke-dasharray="3 2"/>`;
    } else {
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      markup += `<circle cx="${mid.x}" cy="${mid.y}" r="2" fill="${frame}"/>`;
    }
    markup += line(a, b, "transparent", 16);
  } else {
    const points = coords.map(p => `${p.x},${p.y}`).join(" ");
    markup = `<polygon points="${points}" fill="${fill}" stroke="${frame}" stroke-width="2"/>`;
    const sections = feature.style === "double" || feature.style === "sliding" ? 2 : feature.type === "gate" ? Math.max(2, Math.ceil(feature.width / .35)) : 1;
    for (let i = 1; i < sections; i++) {
      const t = i / sections;
      markup += line({ x: coords[0].x + (coords[1].x - coords[0].x) * t, y: coords[0].y + (coords[1].y - coords[0].y) * t },
        { x: coords[3].x + (coords[2].x - coords[3].x) * t, y: coords[3].y + (coords[2].y - coords[3].y) * t }, frame);
    }
    if (feature.style === "casement") {
      const mid = { x: (coords[0].x + coords[3].x) / 2, y: (coords[0].y + coords[3].y) / 2 };
      markup += line(mid, coords[1], frame, .7) + line(mid, coords[2], frame, .7);
    }
    if (feature.type === "door") {
      const bottom = { x: coords[0].x * .2 + coords[1].x * .8, y: coords[0].y * .2 + coords[1].y * .8 };
      const top = { x: coords[3].x * .2 + coords[2].x * .8, y: coords[3].y * .2 + coords[2].y * .8 };
      markup += line({ x: bottom.x * .55 + top.x * .45, y: bottom.y * .55 + top.y * .45 }, { x: bottom.x * .4 + top.x * .6, y: bottom.y * .4 + top.y * .6 }, "#384f47", 1.5);
    }
  }
  return `<g class="architectural-feature" data-feature="${escape(feature.id)}" tabindex="0" role="button" aria-label="${escape(action)} ${escape(feature.name)}"><title>${escape(`${feature.name} · ${formatLength(feature.width, units)} × ${formatLength(feature.height, units)} · ${feature.style} · ${feature.material} · ${feature.glazing} glazing`)}</title>${markup}</g>`;
}

export function railingMarkup(vertices, point, room = {}, plan = false, units = "metric") {
  const coords = vertices.map(v => point(...v));
  const settings = railingSettings(room);
  const line = (a, b, width = 1) => `<path d="M${a.x} ${a.y}L${b.x} ${b.y}" fill="none" stroke="#59786e" stroke-width="${width}"/>`;
  const length = Math.hypot(vertices[1][0] - vertices[0][0], vertices[1][1] - vertices[0][1]);
  let markup = plan ? line(coords[0], coords[1], settings.style === "solid" ? 4 : 2) :
    `<polygon points="${coords.map(p => `${p.x},${p.y}`).join(" ")}" fill="${settings.style === "solid" ? "#d4d8cb" : settings.style === "glass" ? "#a5c5bf55" : "none"}" stroke="#718a80" stroke-width="1"/>${line(coords[3], coords[2], 2)}`;
  if (!plan && settings.style !== "solid") {
    const sections = Math.max(1, Math.ceil(length / (settings.style === "metal" ? .14 : 1.2)));
    for (let i = 0; i <= sections; i++) {
      const t = i / sections;
      markup += line({ x: coords[0].x + (coords[1].x - coords[0].x) * t, y: coords[0].y + (coords[1].y - coords[0].y) * t },
        { x: coords[3].x + (coords[2].x - coords[3].x) * t, y: coords[3].y + (coords[2].y - coords[3].y) * t }, settings.style === "metal" ? 1 : .65);
    }
  }
  return `<g data-terrace-railing="true" data-railing-style="${settings.style}" pointer-events="none"><title>${escape(`${settings.style} railing · ${formatLength(settings.height, units)}`)}</title>${markup}</g>`;
}
