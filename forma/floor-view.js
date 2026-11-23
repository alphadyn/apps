import { bounds, isOutdoor, TYPES, exteriorRoomWalls, roomVertices, roomCentroid } from "./model.js?v=20261122-5";
import { createCamera, DEFAULT_CAMERA, sortFaces } from "./camera.js";
import { featureVertices, featureMarkup, railingMarkup } from "./architecture.js?v=20261122-5";
import { railingSettings, surfaceMarkup, namespaceScene } from "./envelope.js?v=20261122-5";

const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function renderFloor3D(rooms, { camera: angles = DEFAULT_CAMERA, ceiling = 2.8, viewportWidth = 900, zoom = 1, pan = { x: 0, y: 0 }, furniture = true, labels = true, selected = null, features = [], units = "metric", idPrefix = "" } = {}) {
  if (!rooms.length) return "";
  const camera = createCamera(angles), b = bounds(rooms);
  const wallHeight = Math.min(ceiling * .44, 1.6);
  const rect = (x, y, w, d, z = 0) => [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]];
  const sceneHeight = Math.max(wallHeight, ...rooms.filter(r => r.railing).map(r => railingSettings(r).height));
  const projected = rect(b.x - .6, b.y - .6, b.width + 1.2, b.depth + 1.2).flatMap(([x, y]) => [camera.project(x, y, -.2), camera.project(x, y, sceneHeight)]);
  const minX = Math.min(...projected.map(p => p.x)), maxX = Math.max(...projected.map(p => p.x));
  const minY = Math.min(...projected.map(p => p.y)), maxY = Math.max(...projected.map(p => p.y));
  const scale = Math.min(Math.min(660, Math.max(100, viewportWidth - 140)) / (maxX - minX), 460 / (maxY - minY));
  const point = v => { const p = camera.project(...v); return { x: (p.x - (minX + maxX) / 2) * scale + 450, y: (p.y - (minY + maxY) / 2) * scale + 350 }; };
  const points = vertices => vertices.map(v => { const p = point(v); return `${p.x},${p.y}`; }).join(" ");
  const polygon = (vertices, fill, extra = "") => `<polygon points="${points(vertices)}" fill="${fill}" stroke="#7b8d72" stroke-width="1" ${extra}/>`;
  const scene = [];
  const add = (vertices, fill, room, extra = "") => scene.push({ vertices, markup: polygon(vertices, fill, extra), room });
  const box = (room, x, y, w, d, z, height, top, side, kind) => {
    const tag = `data-furniture="${kind}"`;
    const face = (vertices, fill) => add(vertices, fill, room, tag);
    face(rect(x, y, w, d, z + height), top);
    if (camera.toward.x >= 0) face([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + height], [x + w, y, z + height]], side);
    else face([[x, y + d, z], [x, y, z], [x, y, z + height], [x, y + d, z + height]], side);
    if (camera.toward.y >= 0) face([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + height], [x, y + d, z + height]], side);
    else face([[x + w, y, z], [x, y, z], [x, y, z + height], [x + w, y, z + height]], side);
  };
  const addFurnishings = room => {
    const { x, y, width: w, depth: d } = room;
    if (room.type === "bedroom") {
      const bx = x + w * .17, by = y + d * .12, bw = w * .66, bd = d * .72;
      box(room, bx, by, bw, bd, .04, .18, "#987f65", "#806b57", "bed-frame");
      box(room, bx + .06, by + .04, bw - .12, bd - .1, .22, .08, "#f0ece1", "#d4cfc2", "mattress");
      box(room, bx + .08, by + bd * .38, bw - .16, bd * .52, .31, .035, "#d5d9c9", "#c4cbb9", "duvet");
      box(room, bx + .1, by + .08, bw * .34, bd * .17, .32, .025, "#fbf8ef", "#ddd8cc", "pillow");
      box(room, bx + bw * .56, by + .08, bw * .34, bd * .17, .32, .025, "#fbf8ef", "#ddd8cc", "pillow");
    } else if (room.type === "living") {
      const sx = x + w * .15, sy = y + d * .16, sw = w * .7, sd = d * .3;
      box(room, sx, sy, sw, sd, .04, .2, "#8b9b84", "#75836e", "sofa-base");
      box(room, sx + .04, sy + sd * .67, sw - .08, sd * .33, .2, .34, "#73856f", "#63745f", "sofa-back");
      box(room, sx, sy, sw * .13, sd, .2, .2, "#869781", "#71816d", "sofa-arm");
      box(room, sx + sw * .87, sy, sw * .13, sd, .2, .2, "#869781", "#71816d", "sofa-arm");
      box(room, x + w * .35, y + d * .57, w * .3, d * .18, .04, .24, "#a68d70", "#8d775f", "coffee-table");
    } else if (room.type === "dining") {
      const tx = x + w * .24, ty = y + d * .27, tw = w * .52, td = d * .35;
      box(room, tx, ty, tw, td, .28, .07, "#9c8060", "#80684f", "dining-table");
      for (const [cx, cy] of [[tx + tw * .08, ty - d * .13], [tx + tw * .62, ty - d * .13], [tx + tw * .08, ty + td + d * .05], [tx + tw * .62, ty + td + d * .05]]) {
        box(room, cx, cy, tw * .3, d * .12, .04, .12, "#87927c", "#707c68", "dining-chair");
        box(room, cx + tw * .04, cy + d * .08, tw * .22, d * .04, .16, .18, "#77846e", "#64715e", "chair-back");
      }
    } else if (room.type === "kitchen") {
      const counter = "#e5e1d4", cabinet = "#a9a28d";
      box(room, x + w * .08, y + d * .12, w * .84, d * .17, .04, .72, counter, cabinet, "kitchen-counter");
      box(room, x + w * .08, y + d * .29, w * .84, d * .015, .42, .025, "#f5f2e8", "#f5f2e8", "counter-edge");
      box(room, x + w * .08, y + d * .12, w * .17, d * .62, .04, .72, counter, cabinet, "kitchen-island");
    } else if (room.type === "office") {
      box(room, x + w * .16, y + d * .14, w * .68, d * .26, .34, .07, "#9b8060", "#80684f", "desk");
      box(room, x + w * .38, y + d * .55, w * .24, d * .16, .16, .22, "#77846e", "#64715e", "office-chair");
      box(room, x + w * .39, y + d * .68, w * .22, d * .06, .38, .19, "#6b7965", "#5a6855", "chair-back");
    } else if (room.type === "bathroom") {
      box(room, x + w * .09, y + d * .12, w * .42, d * .2, .04, .72, "#e5e2d7", "#c6c7bb", "vanity");
      box(room, x + w * .16, y + d * .18, w * .28, d * .08, .76, .025, "#fbfaf4", "#e7e5dc", "basin");
      box(room, x + w * .58, y + d * .16, w * .3, d * .56, .04, .18, "#f2f1e9", "#d8d9d0", "bath");
      box(room, x + w * .62, y + d * .2, w * .22, d * .45, .22, .018, "#d4e0dc", "#c2cfca", "bath-water");
    } else if (room.type === "terrace" || room.type === "balcony") {
      box(room, x + w * .35, y + d * .28, w * .3, d * .32, .14, .06, "#a18a69", "#887353", "outdoor-table");
      for (const [cx, cy] of [[x + w * .14, y + d * .34], [x + w * .72, y + d * .34], [x + w * .4, y + d * .68]]) {
        box(room, cx, cy, w * .16, d * .13, .04, .1, "#9ba28d", "#7d8773", "outdoor-chair");
      }
    }
  };
  const floorTexture = (room, index) => surfaceMarkup(roomVertices(room).map(([x, y]) => [x, y, 0]), room.material ?? (isOutdoor(room) ? "deck" : "oak"), (x, y, z) => point([x, y, z]), `floor-material-${index}`);
  let markup = `<g class="floor-scene" transform="translate(${450 + pan.x} ${345 + pan.y}) scale(${zoom}) translate(-450 -345)">`;
  markup += polygon(rect(b.x - .6, b.y - .6, b.width + 1.2, b.depth + 1.2, -.2), "#d8e1c9");
  for (const [roomIndex, room] of rooms.entries()) {
    const { x, y, width: w, depth: d } = room;
    const floor = roomVertices(room).map(([px, py]) => [px, py, 0]);
    scene.push({ vertices: floor, room, markup: polygon(floor, TYPES[room.type].color, room.id === selected ? 'style="stroke:#38885c;stroke-width:3"' : "") + floorTexture(room, roomIndex) });
    if (furniture && !room.outline) {
      if (room.type === "stairs") {
        for (let i = 1; i < 10; i++) add(rect(x + .1, y + d * i / 10, w - .2, d / 10, .03), i % 2 ? "#e5e7db" : "#cbd2bd", room);
      } else addFurnishings(room);
    }
    if (labels) {
      const [cx, cy] = roomCentroid(room), location = [x + cx, y + cy, .02], p = point(location);
      scene.push({ vertices: [location], room, markup: `<text x="${p.x}" y="${p.y}" text-anchor="middle" fill="#5a6c50" font-size="8" font-family="Arial,sans-serif" pointer-events="none">${escape(room.name.toUpperCase())}</text>` });
    }
  }
  for (const wall of exteriorRoomWalls(rooms).filter(edge => isOutdoor(edge.room) || edge.normal[0] * camera.toward.x + edge.normal[1] * camera.toward.y < 0)) {
    const h = isOutdoor(wall.room) ? 0 : wallHeight, base = isOutdoor(wall.room) ? -.18 : 0;
    const vertices = [[...wall.a, base], [...wall.b, base], [...wall.b, h], [...wall.a, h]];
    add(vertices, wall.normal[0] ? "#c1cbb7" : "#e1e4d7", wall.room);
  }
  for (const feature of features) {
    const host = rooms.find(r => r.id === feature.roomId);
    if (!host) continue;
    const farSide = feature.side === (camera.toward.x >= 0 ? "west" : "east") || feature.side === (camera.toward.y >= 0 ? "north" : "south");
    if (!farSide) continue;
    const vertices = featureVertices(feature, host, 0, { x: 0, y: 0 }, wallHeight / ceiling);
    scene.push({ vertices, markup: featureMarkup(feature, vertices, (x, y, z) => point([x, y, z]), false, units), feature });
  }
  for (const wall of exteriorRoomWalls(rooms).filter(w => w.room.railing)) {
    const { height } = railingSettings(wall.room);
    const vertices = [[...wall.a, 0], [...wall.b, 0], [...wall.b, height], [...wall.a, height]];
    scene.push({ vertices, markup: railingMarkup(vertices, (x, y, z) => point([x, y, z]), wall.room, false, units), feature: true });
  }
  const seen = new Set();
  for (const face of sortFaces(scene, camera)) {
    if (face.feature) { markup += face.markup; continue; }
    const room = face.room, first = !seen.has(room.id); seen.add(room.id);
    markup += `<g class="${first ? "iso-room" : "iso-surface"}" data-room="${escape(room.id)}" ${first ? `tabindex="0" role="button" aria-label="${escape(room.name)}"` : ""}>${face.markup}</g>`;
  }
  return namespaceScene(markup + '<text x="450" y="623" text-anchor="middle" font-family="Arial,sans-serif" fill="#7b8f70" font-size="9" letter-spacing="2">AXONOMETRIC STUDY · PARTIAL-HEIGHT WALLS</text></g>', idPrefix);
}
