import { bounds, isOutdoor, TYPES, exteriorWalls } from "./model.js";
import { createCamera, DEFAULT_CAMERA, sortFaces } from "./camera.js";
import { featureVertices, featureMarkup, railingMarkup } from "./architecture.js";

const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function renderFloor3D(rooms, { camera: angles = DEFAULT_CAMERA, ceiling = 2.8, viewportWidth = 900, zoom = 1, pan = { x: 0, y: 0 }, furniture = true, labels = true, selected = null, features = [], units = "metric" } = {}) {
  if (!rooms.length) return "";
  const camera = createCamera(angles), b = bounds(rooms);
  const wallHeight = Math.min(ceiling * .44, 1.6);
  const rect = (x, y, w, d, z = 0) => [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]];
  const projected = rect(b.x - .6, b.y - .6, b.width + 1.2, b.depth + 1.2).flatMap(([x, y]) => [camera.project(x, y, -.2), camera.project(x, y, wallHeight)]);
  const minX = Math.min(...projected.map(p => p.x)), maxX = Math.max(...projected.map(p => p.x));
  const minY = Math.min(...projected.map(p => p.y)), maxY = Math.max(...projected.map(p => p.y));
  const scale = Math.min(Math.min(660, Math.max(100, viewportWidth - 140)) / (maxX - minX), 460 / (maxY - minY));
  const point = v => { const p = camera.project(...v); return { x: (p.x - (minX + maxX) / 2) * scale + 450, y: (p.y - (minY + maxY) / 2) * scale + 350 }; };
  const polygon = (vertices, fill, extra = "") => `<polygon points="${vertices.map(v => { const p = point(v); return `${p.x},${p.y}`; }).join(" ")}" fill="${fill}" stroke="#7b8d72" stroke-width="1" ${extra}/>`;
  const scene = [];
  const add = (vertices, fill, room, extra = "") => scene.push({ vertices, markup: polygon(vertices, fill, extra), room });
  let markup = `<g class="floor-scene" transform="translate(${450 + pan.x} ${345 + pan.y}) scale(${zoom}) translate(-450 -345)">`;
  markup += polygon(rect(b.x - .6, b.y - .6, b.width + 1.2, b.depth + 1.2, -.2), "#d8e1c9");
  for (const room of rooms) {
    const { x, y, width: w, depth: d } = room;
    const h = isOutdoor(room) ? .13 : wallHeight;
    add(rect(x, y, w, d), TYPES[room.type].color, room, room.id === selected ? 'style="stroke:#38885c;stroke-width:3"' : "");
    const farX = camera.toward.x >= 0 ? x : x + w;
    const farY = camera.toward.y >= 0 ? y : y + d;
    add([[farX, y, 0], [farX, y + d, 0], [farX, y + d, h], [farX, y, h]], "#c1cbb7", room);
    add([[x, farY, 0], [x + w, farY, 0], [x + w, farY, h], [x, farY, h]], "#e1e4d7", room);
    if (furniture) {
      if (room.type === "stairs") {
        for (let i = 1; i < 10; i++) add(rect(x + .1, y + d * i / 10, w - .2, d / 10, .03), i % 2 ? "#e5e7db" : "#cbd2bd", room);
      } else {
        const fx = x + w * .24, fy = y + d * .25, fw = w * .48, fd = d * .3;
        const nearX = camera.toward.x >= 0 ? fx + fw : fx;
        const nearY = camera.toward.y >= 0 ? fy + fd : fy;
        add([[nearX, fy, 0], [nearX, fy + fd, 0], [nearX, fy + fd, .15], [nearX, fy, .15]], "#b9c3aa", room);
        add([[fx, nearY, 0], [fx + fw, nearY, 0], [fx + fw, nearY, .15], [fx, nearY, .15]], "#b9c3aa", room);
        add(rect(fx, fy, fw, fd, .15), room.type === "bedroom" ? "#f1eee3" : "#d1d6c3", room);
      }
    }
    if (labels) {
      const location = [x + w * .55, y + d * .76, .02], p = point(location);
      scene.push({ vertices: [location], room, markup: `<text x="${p.x}" y="${p.y}" text-anchor="middle" fill="#5a6c50" font-size="8" font-family="Arial,sans-serif" pointer-events="none">${escape(room.name.toUpperCase())}</text>` });
    }
  }
  for (const feature of features) {
    const host = rooms.find(r => r.id === feature.roomId);
    if (!host) continue;
    const farSide = feature.side === (camera.toward.x >= 0 ? "west" : "east") || feature.side === (camera.toward.y >= 0 ? "north" : "south");
    if (!farSide) continue;
    const vertices = featureVertices(feature, host, 0, { x: 0, y: 0 }, wallHeight / ceiling);
    scene.push({ vertices, markup: featureMarkup(feature, vertices, (x, y, z) => point([x, y, z]), false, units), feature });
  }
  for (const wall of exteriorWalls(rooms, ["north", "east", "south", "west"]).filter(w => w.room.railing)) {
    const vertical = ["east", "west"].includes(wall.axis);
    const edge = (along, z) => vertical ? [wall.at, along, z] : [along, wall.at, z];
    const vertices = [edge(wall.from, .08), edge(wall.to, .08), edge(wall.to, 1.1), edge(wall.from, 1.1)];
    scene.push({ vertices, markup: railingMarkup(vertices, (x, y, z) => point([x, y, z])), feature: true });
  }
  const seen = new Set();
  for (const face of sortFaces(scene, camera)) {
    if (face.feature) { markup += face.markup; continue; }
    const room = face.room, first = !seen.has(room.id); seen.add(room.id);
    markup += `<g class="${first ? "iso-room" : "iso-surface"}" data-room="${escape(room.id)}" ${first ? `tabindex="0" role="button" aria-label="${escape(room.name)}"` : ""}>${face.markup}</g>`;
  }
  return markup + '<text x="450" y="623" text-anchor="middle" font-family="Arial,sans-serif" fill="#7b8f70" font-size="9" letter-spacing="2">AXONOMETRIC STUDY · PARTIAL-HEIGHT WALLS</text></g>';
}
