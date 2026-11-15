import { TYPES, bounds, isOutdoor, exteriorWalls, propertyStats } from "./model.js";
import { createCamera, DEFAULT_CAMERA, sortFaces } from "./camera.js";
import { featureHost, featureVertices, featureMarkup, railingMarkup, boundaryFence, fenceSettings, fenceMarkup } from "./architecture.js";

const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const number = value => Number(value.toFixed(2));

export function propertyFeatures(project) {
  const p = project.property;
  const rooms = project.floors.flatMap(f => f.rooms).map(r => ({ ...r, x: r.x + p.houseX, y: r.y + p.houseY }));
  const b = bounds(rooms);
  const garage = project.floors[0].rooms.find(r => r.type === "garage");
  const driveWidth = garage ? Math.min(garage.width, 5) : 3.2;
  const driveX = Math.max(.5, Math.min(p.width - driveWidth - .5, garage ? garage.x + p.houseX : b.x + b.width - driveWidth));
  const driveY = Math.max(0, Math.min(p.depth, garage ? garage.y + p.houseY + garage.depth : b.y + b.depth));
  const driveway = p.driveway && rooms.length && driveY < p.depth ? { x: driveX, y: driveY, width: driveWidth, depth: p.depth - driveY } : null;
  const trees = [];
  if (p.landscaping) {
    for (const [px, py, size] of [[.12, .13, 1.4], [.34, .1, 1.2], [.76, .12, 1.5], [.9, .3, 1.3], [.1, .52, 1.2], [.9, .66, 1.4], [.14, .82, 1.4], [.34, .9, 1.1]]) {
      const x = p.width * px, y = p.depth * py, radius = Math.min(size, p.width * .065, p.depth * .065);
      const occupied = rooms.some(r => x + radius > r.x - .5 && x - radius < r.x + r.width + .5 && y + radius > r.y - .5 && y - radius < r.y + r.depth + .5);
      const onDrive = driveway && x + radius > driveway.x && x - radius < driveway.x + driveway.width && y + radius > driveway.y;
      if (!occupied && !onDrive) trees.push({ x, y, radius });
    }
  }
  return { trees, driveway };
}

export function renderPropertyView(project, { view = "2d", zoom = 1, pan = { x: 0, y: 0 }, dimensions = true, labels = true, roof = true, viewportWidth = 900, camera: angles = DEFAULT_CAMERA } = {}) {
  const iso = view === "3d";
  const camera = createCamera(angles), projectPoint = camera.project;
  const p = project.property;
  const allRooms = project.floors.flatMap(f => f.rooms);
  const b = bounds(allRooms);
  const minX = Math.min(-3, allRooms.length ? p.houseX + b.x - 2 : 0);
  const minY = Math.min(-3, allRooms.length ? p.houseY + b.y - 2 : 0);
  const maxX = Math.max(p.width + 3, allRooms.length ? p.houseX + b.x + b.width + 2 : 0);
  const maxY = Math.max(p.depth + 8, allRooms.length ? p.houseY + b.y + b.depth + 2 : 0);
  const world = [[minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]];
  const height = propertyStats(project).height;
  const fence = fenceSettings(project), fenceSegments = boundaryFence(project);
  const projected = iso ? [
    ...world.map(([x, y]) => projectPoint(x, y)),
    ...allRooms.flatMap(r => [[r.x + p.houseX, r.y + p.houseY], [r.x + r.width + p.houseX, r.y + p.houseY], [r.x + r.width + p.houseX, r.y + r.depth + p.houseY], [r.x + p.houseX, r.y + r.depth + p.houseY]].flatMap(([x, y]) => [projectPoint(x, y), projectPoint(x, y, height)])),
    ...(project.features || []).flatMap(feature => featureVertices(feature, featureHost(project, feature), feature.type === "gate" ? 0 : project.floors.findIndex(f => f.id === feature.floorId) * project.ceiling, feature.type === "gate" ? { x: 0, y: 0 } : { x: p.houseX, y: p.houseY }).map(v => projectPoint(...v))),
    ...fenceSegments.flatMap(segment => segment.vertices.map(v => projectPoint(...v))),
  ] : world.map(([x, y]) => ({ x, y }));
  const left = Math.min(...projected.map(v => v.x)), right = Math.max(...projected.map(v => v.x));
  const top = Math.min(...projected.map(v => v.y)), bottom = Math.max(...projected.map(v => v.y));
  const scale = Math.min(Math.max(100, viewportWidth - 160) / (right - left), 510 / (bottom - top));
  const point = (x, y, z = 0) => {
    const v = iso ? projectPoint(x, y, z) : { x, y };
    return { x: number((v.x - (left + right) / 2) * scale + 450), y: number((v.y - (top + bottom) / 2) * scale + 345) };
  };
  const points = list => list.map(([x, y, z = 0]) => { const v = point(x, y, z); return `${v.x},${v.y}`; }).join(" ");
  const polygon = (list, fill, extra = "") => `<polygon points="${points(list)}" fill="${fill}" stroke="#94a387" stroke-width=".7" ${extra}/>`;
  const rect = (x, y, width, depth, z = 0) => [[x, y, z], [x + width, y, z], [x + width, y + depth, z], [x, y + depth, z]];
  const text = (x, y, label, options = "") => `<text x="${x}" y="${y}" fill="#687f5c" font-family="Arial,sans-serif" font-size="8" text-anchor="middle" ${options}>${escape(label)}</text>`;
  const worldText = (x, y, label, z = 0, options = "") => { const v = point(x, y, z); return text(v.x, v.y, label, options); };
  const features = propertyFeatures(project);
  let markup = `<g class="property-scene" transform="translate(${450 + pan.x} ${345 + pan.y}) scale(${zoom}) translate(-450 -345)">`;
  markup += `<defs><pattern id="property-grass" width="13" height="13" patternUnits="userSpaceOnUse"><path d="m3 5 1-2m4 7 1-2" stroke="#859e70" stroke-width=".6" opacity=".22"/></pattern></defs>`;
  markup += polygon(rect(0, 0, p.width, p.depth, -.15), "#b5c5a1", 'data-property-lot="true"');
  markup += polygon(rect(0, 0, p.width, p.depth), "#d8e2c6");
  markup += polygon(rect(0, 0, p.width, p.depth), "url(#property-grass)", 'style="stroke:none"');
  markup += polygon(rect(-2, p.depth + .6, p.width + 4, 1.1), "#e8e7dc");
  markup += polygon(rect(-2, p.depth + 1.7, p.width + 4, 4.5), "#cbd0c7", 'data-property-road="true"');
  markup += `<polyline points="${points([[-2, p.depth + 3.95], [p.width + 2, p.depth + 3.95]])}" fill="none" stroke="#f4f4e9" stroke-width="1.7" stroke-dasharray="14 12"/>`;
  if (labels) markup += worldText(p.width * .24, p.depth + 5.3, p.roadName.toUpperCase(), 0, 'letter-spacing="2.5"');
  if (features.driveway) {
    const d = features.driveway;
    markup += polygon(rect(d.x, d.y, d.width, d.depth), "#dddcd0", 'data-property-driveway="true"');
    markup += polygon(rect(d.x, p.depth, d.width, 1.7), "#dddcd0");
    if (labels && d.depth > 3 && !iso) markup += worldText(d.x + d.width / 2, d.y + d.depth / 2, "DRIVE", 0, 'style="font-size:6px" letter-spacing="1"');
  }
  markup += polygon(rect(0, 0, p.width, p.depth), "none", 'style="stroke:#779067;stroke-width:1.2;stroke-dasharray:5 4" data-property-boundary="true"');
  for (const tree of features.trees) {
    const v = point(tree.x, tree.y);
    markup += `<ellipse cx="${v.x + 3}" cy="${v.y + 3}" rx="${tree.radius * scale * 1.1}" ry="${tree.radius * scale * (iso ? .5 : 1.1)}" fill="#849d6925"/>`;
  }

  if (iso) {
    const scene = [];
    const addFace = (vertices, fill, extra, floor, index) => {
      scene.push({ vertices, markup: polygon(vertices, fill, extra), floor, index });
    };
    project.floors.forEach((f, index) => {
      const z = index * project.ceiling;
      const enclosed = f.rooms.filter(r => !isOutdoor(r));
      const walls = exteriorWalls(enclosed, Object.keys(camera.faces).filter(side => camera.faces[side]));
      for (const r of f.rooms) {
        const x = r.x + p.houseX, y = r.y + p.houseY;
        const isDeck = isOutdoor(r);
        const vertices = rect(x, y, r.width, r.depth, z + .08);
        let surface = polygon(vertices, isDeck ? "#b9b696" : "#cbd0bf");
        if (isDeck) {
          for (let step = .35; step < r.width; step += .35) surface += `<polyline points="${points([[x + step, y, z + .08], [x + step, y + r.depth, z + .08]])}" stroke="#9c9e7d" stroke-width=".5" fill="none"/>`;
        }
        scene.push({ vertices, markup: surface, floor: f, index });
      }
      for (const wall of walls) {
        const vertical = wall.axis === "east" || wall.axis === "west";
        const at = wall.at + (vertical ? p.houseX : p.houseY);
        const from = wall.from + (vertical ? p.houseY : p.houseX);
        const to = wall.to + (vertical ? p.houseY : p.houseX);
        const wallPoint = (along, up) => vertical ? [at, along, up] : [along, at, up];
        const wallHeight = roof ? project.ceiling : Math.min(project.ceiling * .5, 1.5);
        const wallRect = (a, b, low, high) => [wallPoint(a, low), wallPoint(b, low), wallPoint(b, high), wallPoint(a, high)];
        const vertices = wallRect(from, to, z + .08, z + wallHeight);
        let surface = polygon(vertices, vertical ? "#bfc9b7" : "#e7e8dc", `data-exterior-wall="${wall.axis}"`);
        surface += polygon(wallRect(from, to, z + wallHeight - .14, z + wallHeight), "#f2f1e7");
        const span = to - from;
        const specified = (project.features || []).filter(item => item.floorId === f.id && item.roomId === wall.room.id);
        if (!specified.length && roof && span > 1.1 && wall.room.type !== "stairs") {
          const inset = Math.min(.55, span * .17);
          const low = wall.room.type === "garage" ? z + .15 : z + project.ceiling * .25;
          const high = z + project.ceiling * .79;
          const glass = wall.room.type === "garage" ? "#a4ad97" : "#8fa89e";
          surface += polygon(wallRect(from + inset, to - inset, low, high), glass, 'style="stroke:#738a7b;stroke-width:.7" data-exterior-window="true"');
          const middle = (from + to) / 2;
          surface += `<polyline points="${points([wallPoint(middle, low), wallPoint(middle, high)])}" fill="none" stroke="#dce4d8" stroke-width="1"/>`;
          if (wall.room.type === "garage") {
            for (let h = low + .3; h < high; h += .3) surface += `<polyline points="${points([wallPoint(from + inset, h), wallPoint(to - inset, h)])}" fill="none" stroke="#7c8b73" stroke-width=".6"/>`;
          }
        }
        for (const opening of specified.filter(item => item.side === wall.axis)) {
          const openingStart = (vertical ? wall.room.y : wall.room.x) + opening.offset;
          if (openingStart < wall.from - 1e-8 || openingStart + opening.width > wall.to + 1e-8) continue;
          if (roof) surface += featureMarkup(opening, featureVertices(opening, wall.room, z, { x: p.houseX, y: p.houseY }), point);
          else {
            const vertices = featureVertices(opening, wall.room, z, { x: p.houseX, y: p.houseY }, wallHeight / project.ceiling);
            surface += featureMarkup(opening, vertices, point);
          }
        }
        scene.push({ vertices, markup: surface, floor: f, index });
      }
      for (const wall of exteriorWalls(f.rooms, ["north", "east", "south", "west"]).filter(w => w.room.railing)) {
        const vertical = ["east", "west"].includes(wall.axis);
        const edge = (along, up) => vertical ? [wall.at + p.houseX, along + p.houseY, up] : [along + p.houseX, wall.at + p.houseY, up];
        const vertices = [edge(wall.from, z + .08), edge(wall.to, z + .08), edge(wall.to, z + 1.1), edge(wall.from, z + 1.1)];
        scene.push({ vertices, markup: railingMarkup(vertices, point), floor: f, index });
      }
      if (roof) {
        for (const r of enclosed) addFace(rect(r.x + p.houseX, r.y + p.houseY, r.width, r.depth, z + project.ceiling), index === project.floors.length - 1 ? "#d9dece" : "#ecece0", `style="stroke:#a8b39c;stroke-width:.5" data-roof-level="${index}"`, f, index);
      }
    });
    for (const segment of fenceSegments) {
      scene.push({ vertices: segment.vertices, markup: fenceMarkup(segment.vertices, fence, point) });
    }
    for (const gate of (project.features || []).filter(f => f.type === "gate")) {
      const vertices = featureVertices(gate, featureHost(project, gate));
      scene.push({ vertices, markup: featureMarkup(gate, vertices, point) });
    }
    for (const tree of features.trees) {
      scene.push({ vertices: rect(tree.x - tree.radius, tree.y - tree.radius, tree.radius * 2, tree.radius * 2, tree.radius), markup: tree3d(tree) });
    }
    const seen = new Set();
    for (const face of sortFaces(scene, camera)) {
      if (!face.floor) { markup += face.markup; continue; }
      const f = face.floor, first = !seen.has(f.id); seen.add(f.id);
      markup += `<g class="property-floor" data-property-floor="${escape(f.id)}" ${first ? `data-floor-level="${face.index}" tabindex="0" role="button" aria-label="Edit ${escape(f.name)}"` : ""}>${first ? `<title>${escape(f.name)} · level ${face.index + 1}</title>` : ""}${face.markup}</g>`;
    }
    if (labels) markup += text(450, 621, `${project.floors.length} ${project.floors.length === 1 ? "LEVEL" : "LEVELS"} · ${number(height)} m HIGH · ${roof ? "EXTERIOR STUDY" : "OPEN-TOP STUDY"}`, 'letter-spacing="1.6"');
  } else {
    const ground = project.floors[0];
    for (const r of ground.rooms) {
      markup += `<g class="property-floor" data-property-floor="${escape(ground.id)}" data-room="${escape(r.id)}" role="button" tabindex="0" aria-label="Edit ${escape(r.name)}">`;
      markup += polygon(rect(r.x + p.houseX, r.y + p.houseY, r.width, r.depth), TYPES[r.type].color, 'style="stroke:#67785b;stroke-width:1.4"');
      if (labels) markup += worldText(r.x + p.houseX + r.width / 2, r.y + p.houseY + r.depth / 2, r.name.toUpperCase(), 0, `style="font-size:${Math.min(8, r.width * scale / (r.name.length * .65))}px"`);
      markup += "</g>";
    }
    project.floors.forEach((f, index) => {
      if (!index) return;
      markup += `<g data-site-upper-floor="${escape(f.id)}" pointer-events="none">`;
      for (const r of f.rooms) markup += polygon(rect(r.x + p.houseX, r.y + p.houseY, r.width, r.depth), "none", 'style="stroke:#7d957d;stroke-dasharray:4 3;stroke-width:1"');
      markup += "</g>";
    });
    for (const segment of fenceSegments) markup += fenceMarkup(segment.vertices, fence, point, true);
    for (const feature of (project.features || []).filter(f => f.type === "gate" || f.floorId === ground.id)) {
      markup += featureMarkup(feature, featureVertices(feature, featureHost(project, feature), 0, feature.type === "gate" ? { x: 0, y: 0 } : { x: p.houseX, y: p.houseY }), point, true);
    }
    for (const tree of features.trees) {
      const v = point(tree.x, tree.y), radius = tree.radius * scale;
      markup += `<g data-landscape-tree="true"><circle cx="${v.x}" cy="${v.y}" r="${radius}" fill="#bdcfa6" stroke="#98b185" stroke-width=".8"/><path d="M${v.x - radius * .7} ${v.y}h${radius * 1.4}m${-radius * .7} ${-radius * .7}v${radius * 1.4}" stroke="#91a77e" stroke-width=".7"/><circle cx="${v.x}" cy="${v.y}" r="${radius * .65}" fill="#a8bf9170" stroke="#a0b88c" stroke-width=".5"/></g>`;
    }
    if (labels) {
      markup += worldText(p.width * .5, p.depth * .08, "REAR GARDEN", 0, 'letter-spacing="2"');
      markup += worldText(p.width * .3, p.depth * .74, "LANDSCAPED GROUNDS", 0, 'letter-spacing="1.5" style="font-size:7px"');
      markup += text(450, 621, "GROUND PLAN · DASHED UPPER-FLOOR FOOTPRINTS", 'letter-spacing="1.4"');
    }
  }
  if (dimensions) {
    const a = point(0, -1.5), b = point(p.width, -1.5), c = point(-1.5, 0), d = point(-1.5, p.depth);
    markup += `<polyline points="${a.x},${a.y} ${b.x},${b.y}" fill="none" stroke="#8da17c" stroke-width=".7"/><polyline points="${c.x},${c.y} ${d.x},${d.y}" fill="none" stroke="#8da17c" stroke-width=".7"/>`;
    markup += text((a.x + b.x) / 2, (a.y + b.y) / 2 - 7, `${number(p.width)} m`);
    markup += text((c.x + d.x) / 2 - 16, (c.y + d.y) / 2, `${number(p.depth)} m`);
  }
  markup += "</g>";
  return { markup, scale };

  function tree3d(tree) {
    const base = point(tree.x, tree.y), top = point(tree.x, tree.y, tree.radius * 1.8);
    const radius = tree.radius * scale;
    return `<g data-landscape-tree="true" pointer-events="none"><path d="M${base.x} ${base.y}V${top.y}" stroke="#8b9b77" stroke-width="2"/><ellipse cx="${top.x}" cy="${top.y}" rx="${radius}" ry="${radius * .8}" fill="#b5c99d" stroke="#96ae7f" stroke-width=".8"/><ellipse cx="${top.x - radius * .15}" cy="${top.y - radius * .2}" rx="${radius * .7}" ry="${radius * .6}" fill="#c6d6b3" stroke="#a8be93" stroke-width=".6"/></g>`;
  }
}
