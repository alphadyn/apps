import { TYPES, bounds, isOutdoor, exteriorWalls, exteriorRoomWalls, roomVertices, roomCentroid, propertyStats } from "./model.js?v=20261125-1";
import { createCamera, DEFAULT_CAMERA, sortFaces } from "./camera.js";
import { featureHost, featureVertices, featureMarkup, railingMarkup, boundaryFence, fenceSettings, fenceMarkup } from "./architecture.js?v=20261122-5";
import { formatLength } from "./units.js";
import { railingSettings, roofSettings, surfaceMarkup, roofEdgeDetails, exposedRoofEdge, namespaceScene } from "./envelope.js?v=20261122-6";
import { propertyFeatures } from "./property-edit.js?v=20261125-1";
export { propertyFeatures } from "./property-edit.js?v=20261125-1";

const escape = value => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const number = value => Number(value.toFixed(2));

export function renderPropertyView(project, { view = "2d", zoom = 1, pan = { x: 0, y: 0 }, dimensions = true, labels = true, roof = true, viewportWidth = 900, camera: angles = DEFAULT_CAMERA, units = "metric", idPrefix = "", editable = false, selectedSite = null, framing = null } = {}) {
  const iso = view === "3d";
  const camera = createCamera(angles), projectPoint = camera.project;
  const p = project.property;
  const structures = p.layout?.structures || [];
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
    ...allRooms.flatMap(r => roomVertices(r).flatMap(([x, y]) => [projectPoint(x + p.houseX, y + p.houseY), projectPoint(x + p.houseX, y + p.houseY, height)])),
    ...(project.features || []).flatMap(feature => featureVertices(feature, featureHost(project, feature), feature.type === "gate" ? 0 : project.floors.findIndex(f => f.id === feature.floorId) * project.ceiling, feature.type === "gate" ? { x: 0, y: 0 } : { x: p.houseX, y: p.houseY }).map(v => projectPoint(...v))),
    ...fenceSegments.flatMap(segment => segment.vertices.map(v => projectPoint(...v))),
    ...structures.flatMap(s => [[s.x, s.y], [s.x + s.width, s.y], [s.x + s.width, s.y + s.depth], [s.x, s.y + s.depth]].map(([x, y]) => projectPoint(x, y, s.height))),
  ] : world.map(([x, y]) => ({ x, y }));
  const left = framing?.left ?? Math.min(...projected.map(v => v.x)), right = framing?.right ?? Math.max(...projected.map(v => v.x));
  const top = framing?.top ?? Math.min(...projected.map(v => v.y)), bottom = framing?.bottom ?? Math.max(...projected.map(v => v.y));
  const scale = Math.min(Math.max(100, viewportWidth - 160) / (right - left), 510 / (bottom - top));
  const point = (x, y, z = 0) => {
    const v = iso ? projectPoint(x, y, z) : { x, y };
    return { x: number((v.x - (left + right) / 2) * scale + 450), y: number((v.y - (top + bottom) / 2) * scale + 345) };
  };
  const points = list => list.map(([x, y, z = 0]) => { const v = point(x, y, z); return `${v.x},${v.y}`; }).join(" ");
  const polygon = (list, fill, extra = "") => `<polygon points="${points(list)}" fill="${fill}" stroke="#94a387" stroke-width=".7" ${extra}/>`;
  const rect = (x, y, width, depth, z = 0) => [[x, y, z], [x + width, y, z], [x + width, y + depth, z], [x, y + depth, z]];
  const text = (x, y, label, options = "") => `<text x="${x}" y="${y}" fill="#687f5c" font-family="Arial,sans-serif" font-size="8" text-anchor="middle" pointer-events="none" ${options}>${escape(label)}</text>`;
  const worldText = (x, y, label, z = 0, options = "") => { const v = point(x, y, z); return text(v.x, v.y, label, options); };
  const features = propertyFeatures(project);
  const itemAttrs = (id, name) => !iso && editable ? `data-site-item="${id}" class="site-item${id === selectedSite ? " site-selected" : ""}" tabindex="0" role="button" aria-label="Move ${name}" aria-pressed="${id === selectedSite}"` : "";
  const roofSpec = roofSettings(project);
  let markup = `<g class="property-scene" transform="translate(${450 + pan.x} ${345 + pan.y}) scale(${zoom}) translate(-450 -345)">`;
  markup += `<defs>
    <pattern id="property-grass" width="13" height="13" patternUnits="userSpaceOnUse"><path d="m3 5 1-2m4 7 1-2" stroke="#859e70" stroke-width=".6" opacity=".22"/></pattern>
    <pattern id="property-roof" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="#d9dece"/><path d="M0 9h18M9 0v9" fill="none" stroke="#89917e" stroke-width=".45" opacity=".35"/></pattern>
    <pattern id="property-facade" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 11.5h12" fill="none" stroke="#b3b5a8" stroke-width=".45" opacity=".45"/></pattern>
    <linearGradient id="property-glass" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#d0e0d9"/><stop offset=".48" stop-color="#75958d"/><stop offset="1" stop-color="#526d68"/></linearGradient>
    <linearGradient id="property-facade-light" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f0eee4"/><stop offset="1" stop-color="#d9ddd1"/></linearGradient>
    <linearGradient id="property-facade-shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d7ddd1"/><stop offset="1" stop-color="#bfc9bc"/></linearGradient>
  </defs>`;
  markup += polygon(rect(0, 0, p.width, p.depth, -.15), "#b5c5a1", 'data-property-lot="true"');
  markup += polygon(rect(0, 0, p.width, p.depth), "#d8e2c6");
  markup += polygon(rect(0, 0, p.width, p.depth), "url(#property-grass)", 'style="stroke:none"');
  markup += polygon(rect(-2, p.depth + .6, p.width + 4, 1.1), "#e8e7dc");
  markup += polygon(rect(-2, p.depth + 1.7, p.width + 4, 4.5), "#cbd0c7", 'data-property-road="true"');
  markup += `<polyline points="${points([[-2, p.depth + 3.95], [p.width + 2, p.depth + 3.95]])}" fill="none" stroke="#f4f4e9" stroke-width="1.7" stroke-dasharray="14 12"/>`;
  if (labels) markup += worldText(p.width * .24, p.depth + 5.3, p.roadName.toUpperCase(), 0, 'letter-spacing="2.5"');
  if (features.driveway) {
    const d = features.driveway;
    markup += `<g ${itemAttrs("driveway", "driveway")}>`;
    markup += polygon(rect(d.x, d.y, d.width, d.depth), "#dddcd0", 'data-property-driveway="true"');
    markup += polygon(rect(d.x, p.depth, d.width, 1.7), "#dddcd0");
    if (labels && d.depth > 3 && !iso) markup += worldText(d.x + d.width / 2, d.y + d.depth / 2, "DRIVE", 0, 'style="font-size:6px" letter-spacing="1"');
    markup += "</g>";
  }
  markup += polygon(rect(0, 0, p.width, p.depth), "none", 'style="stroke:#779067;stroke-width:1.2;stroke-dasharray:5 4" data-property-boundary="true"');
  for (const tree of features.trees) {
    const v = point(tree.x, tree.y);
    markup += `<ellipse cx="${v.x + 3}" cy="${v.y + 3}" rx="${tree.radius * scale * 1.1}" ry="${tree.radius * scale * (iso ? .5 : 1.1)}" fill="#849d6925"/>`;
  }

  if (iso) {
    if (allRooms.length) {
      const houseX = p.houseX + b.x, houseY = p.houseY + b.y;
      markup += polygon(rect(houseX + .55, houseY + .8, b.width, b.depth, -.08), "#56634b30", 'style="stroke:none" data-house-shadow="true"');
      if (features.driveway) {
        const d = features.driveway;
        for (let y = d.y + .7; y < p.depth; y += 1.4) {
          markup += `<polyline points="${points([[d.x, y, .01], [d.x + d.width, y, .01]])}" fill="none" stroke="#a9aaa0" stroke-width=".45" opacity=".5"/>`;
        }
      }
    }
    const scene = [];
    const addFace = (vertices, fill, extra, floor, index) => {
      scene.push({ vertices, markup: polygon(vertices, fill, extra), floor, index });
    };
    project.floors.forEach((f, index) => {
      const z = index * project.ceiling;
      const enclosed = f.rooms.filter(r => !isOutdoor(r));
      const walls = exteriorWalls(enclosed, Object.keys(camera.faces).filter(side => camera.faces[side]));
      for (const [roomIndex, r] of f.rooms.entries()) {
        const isDeck = isOutdoor(r);
        const vertices = roomVertices(r).map(([px, py]) => [px + p.houseX, py + p.houseY, z]);
        const surface = isDeck
          ? surfaceMarkup(vertices, r.material ?? "deck", point, `property-finish-${index}-${roomIndex}`)
          : polygon(vertices, "#cbd0bf");
        scene.push({ vertices, markup: surface, floor: f, index });
      }
      for (const wall of exteriorRoomWalls(f.rooms).filter(w => isOutdoor(w.room))) {
        const edge = (p, up) => [p[0] + project.property.houseX, p[1] + project.property.houseY, up];
        addFace([edge(wall.a, z - .18), edge(wall.b, z - .18), edge(wall.b, z), edge(wall.a, z)], "#abae9f", 'data-outdoor-slab="true"', f, index);
      }
      for (const wall of walls) {
        const vertical = wall.axis === "east" || wall.axis === "west";
        const at = wall.at + (vertical ? p.houseX : p.houseY);
        const from = wall.from + (vertical ? p.houseY : p.houseX);
        const to = wall.to + (vertical ? p.houseY : p.houseX);
        const wallPoint = (along, up) => vertical ? [at, along, up] : [along, at, up];
        const wallHeight = roof ? project.ceiling : Math.min(project.ceiling * .5, 1.5);
        const wallRect = (a, b, low, high) => [wallPoint(a, low), wallPoint(b, low), wallPoint(b, high), wallPoint(a, high)];
        const vertices = wallRect(from, to, z, z + wallHeight);
        const facade = vertical ? "url(#property-facade-shade)" : "url(#property-facade-light)";
        let surface = polygon(vertices, facade, `data-exterior-wall="${wall.axis}"`);
        surface += polygon(vertices, "url(#property-facade)", 'style="stroke:none" data-facade-finish="true"');
        surface += polygon(wallRect(from, to, z, z + .26), "#b8bbae", 'style="stroke:none" data-facade-plinth="true"');
        surface += `<polyline points="${points([wallPoint(from, z + wallHeight - .12), wallPoint(to, z + wallHeight - .12)])}" fill="none" stroke="#f5f2e8" stroke-width="1.2" opacity=".8"/>`;
        const span = to - from;
        const specified = (project.features || []).filter(item => item.floorId === f.id && item.roomId === wall.room.id);
        if (!specified.length && roof && span > 1.1 && wall.room.type !== "stairs") {
          const inset = Math.min(.55, span * .17);
          const low = wall.room.type === "garage" ? z + .15 : z + project.ceiling * .25;
          const high = z + project.ceiling * .79;
          const windowFrom = from + inset, windowTo = to - inset;
          surface += polygon(wallRect(windowFrom, windowTo, low, high), "#596b63", 'style="stroke:#596b63;stroke-width:1" data-exterior-window="true"');
          surface += polygon(wallRect(windowFrom + .08, windowTo - .08, low + .08, high - .08), wall.room.type === "garage" ? "#a4ad97" : "url(#property-glass)", 'style="stroke:#d9e1d7;stroke-width:.5" data-window-glass="true"');
          const mullionCount = Math.max(1, Math.floor((windowTo - windowFrom) / 1.6));
          for (let mullion = 1; mullion <= mullionCount; mullion++) {
            const at = windowFrom + (windowTo - windowFrom) * mullion / (mullionCount + 1);
            surface += polygon(wallRect(at - .025, at + .025, low + .04, high - .04), "#d8dfd5", 'style="stroke:none" data-window-mullion="true"');
          }
          surface += polygon(wallRect(windowFrom - .08, windowTo + .08, low - .1, low - .025), "#e8e5d9", 'style="stroke:none" data-window-sill="true"');
          const reflectionTop = wallPoint(windowFrom + (windowTo - windowFrom) * .16, high - .14);
          const reflectionBottom = wallPoint(windowFrom + (windowTo - windowFrom) * .4, low + .1);
          surface += `<polyline points="${points([reflectionTop, reflectionBottom])}" fill="none" stroke="#e4eee6" stroke-width=".8" opacity=".55"/>`;
          if (wall.room.type === "garage") {
            for (let h = low + .3; h < high; h += .3) surface += `<polyline points="${points([wallPoint(from + inset, h), wallPoint(to - inset, h)])}" fill="none" stroke="#7c8b73" stroke-width=".6"/>`;
          }
        }
        for (const opening of specified.filter(item => item.side === wall.axis)) {
          const openingStart = (vertical ? wall.room.y : wall.room.x) + opening.offset;
          if (openingStart < wall.from - 1e-8 || openingStart + opening.width > wall.to + 1e-8) continue;
          if (roof) surface += featureMarkup(opening, featureVertices(opening, wall.room, z, { x: p.houseX, y: p.houseY }), point, false, units);
          else {
            const vertices = featureVertices(opening, wall.room, z, { x: p.houseX, y: p.houseY }, wallHeight / project.ceiling);
            surface += featureMarkup(opening, vertices, point, false, units);
          }
        }
        scene.push({ vertices, markup: surface, floor: f, index });
      }
      for (const wall of exteriorRoomWalls(enclosed).filter(edge => Math.abs(edge.b[0] - edge.a[0]) > 1e-8 && Math.abs(edge.b[1] - edge.a[1]) > 1e-8 && edge.normal[0] * camera.toward.x + edge.normal[1] * camera.toward.y > 0)) {
        const edge = (point, up) => [point[0] + p.houseX, point[1] + p.houseY, up];
        const wallHeight = roof ? project.ceiling : Math.min(project.ceiling * .5, 1.5);
        const vertices = [edge(wall.a, z), edge(wall.b, z), edge(wall.b, z + wallHeight), edge(wall.a, z + wallHeight)];
        scene.push({ vertices, markup: polygon(vertices, "#d5dbce", 'data-exterior-wall="custom"'), floor: f, index });
      }
      for (const wall of exteriorRoomWalls(f.rooms).filter(w => w.room.railing)) {
        const settings = railingSettings(wall.room);
        const edge = (point, up) => [point[0] + p.houseX, point[1] + p.houseY, up];
        const vertices = [edge(wall.a, z), edge(wall.b, z), edge(wall.b, z + settings.height), edge(wall.a, z + settings.height)];
        scene.push({ vertices, markup: railingMarkup(vertices, point, wall.room, false, units), floor: f, index });
      }
      if (roof) {
        for (const [roomIndex, r] of enclosed.entries()) {
          const vertices = roomVertices(r).map(([x, y]) => [x + p.houseX, y + p.houseY, z + project.ceiling]);
          const finish = roofSpec.finish === "membrane" ? "url(#property-roof)" : roofSpec.finish;
          const surface = roofSpec.finish === "membrane"
            ? polygon(vertices, finish, `style="stroke:#d9dece;stroke-width:.5;stroke-linejoin:round"`)
            : surfaceMarkup(vertices, finish, point, `roof-finish-${index}-${roomIndex}`);
          scene.push({ vertices, markup: `<g data-roof-level="${index}" data-roof-finish="${roofSpec.finish}">${surface}</g>`, floor: f, index });
        }
        const coverings = project.floors.slice(index + 1).flatMap(floor => floor.rooms.map(roomVertices));
        for (const edge of exteriorRoomWalls(enclosed).flatMap(wall => exposedRoofEdge(wall, coverings))) {
          const origin = v => [v[0] + p.houseX, v[1] + p.houseY];
          for (const face of roofEdgeDetails(origin(edge.a), origin(edge.b), edge.normal, z + project.ceiling, roofSpec)) {
            const parapet = face.kind === "parapet" || face.kind === "coping";
            addFace(face.vertices, face.fill, `data-roof-edge="${face.kind}"${parapet ? ' data-roof-parapet="true"' : ""}`, f, index);
          }
        }
      }
    });
    for (const segment of fenceSegments) {
      scene.push({ vertices: segment.vertices, markup: fenceMarkup(segment.vertices, fence, point, false, units) });
    }
    for (const gate of (project.features || []).filter(f => f.type === "gate")) {
      const vertices = featureVertices(gate, featureHost(project, gate));
      scene.push({ vertices, markup: featureMarkup(gate, vertices, point, false, units) });
    }
    for (const tree of features.trees) {
      scene.push({ vertices: rect(tree.x - tree.radius, tree.y - tree.radius, tree.radius * 2, tree.radius * 2, tree.radius), markup: tree3d(tree) });
    }
    for (const building of structures) {
      const { x, y, width: w, depth: d } = building;
      const h = roof ? building.height : Math.min(building.height * .5, 1.5);
      const corners = [[x, y], [x + w, y], [x + w, y + d], [x, y + d]];
      const ground = rect(x, y, w, d);
      scene.push({ vertices: ground, markup: polygon(ground, "#cbd0bf", 'data-site-building-floor="true"') });
      for (let i = 0; i < corners.length; i++) {
        if (!camera.faces[["north", "east", "south", "west"][i]]) continue;
        const a = corners[i], b = corners[(i + 1) % corners.length];
        const vertices = [[...a, 0], [...b, 0], [...b, h], [...a, h]];
        scene.push({ vertices, markup: polygon(vertices, i % 2 ? "#c4cec0" : "#e2e4d8", 'data-site-building-wall="true"') });
      }
      if (roof) {
        const vertices = rect(x, y, w, d, h);
        scene.push({ vertices, markup: polygon(vertices, "#d5d9c9", 'data-site-building-roof="true"') });
      }
    }
    const seen = new Set();
    for (const face of sortFaces(scene, camera)) {
      if (!face.floor) { markup += face.markup; continue; }
      const f = face.floor, first = !seen.has(f.id); seen.add(f.id);
      markup += `<g class="property-floor" data-property-floor="${escape(f.id)}" ${first ? `data-floor-level="${face.index}" tabindex="0" role="button" aria-label="Edit ${escape(f.name)}"` : ""}>${first ? `<title>${escape(f.name)} · level ${face.index + 1}</title>` : ""}${face.markup}</g>`;
    }
    if (labels) markup += text(450, 621, `${project.floors.length} ${project.floors.length === 1 ? "LEVEL" : "LEVELS"} · ${formatLength(height, units)} HIGH · ${roof ? "EXTERIOR STUDY" : "OPEN-TOP STUDY"}`, 'letter-spacing="1.6"');
  } else {
    const ground = project.floors[0];
    markup += `<g ${itemAttrs("house", "whole house")}>`;
    for (const r of ground.rooms) {
      markup += `<g class="property-floor" data-property-floor="${escape(ground.id)}" data-room="${escape(r.id)}"${editable ? "" : ` role="button" tabindex="0" aria-label="Edit ${escape(r.name)}"`}>`;
      markup += polygon(roomVertices(r).map(([x, y]) => [x + p.houseX, y + p.houseY]), TYPES[r.type].color, `style="stroke:#67785b;stroke-width:1.4" data-room="${escape(r.id)}"`);
      const [cx, cy] = roomCentroid(r);
      if (labels) markup += worldText(r.x + cx + p.houseX, r.y + cy + p.houseY, r.name.toUpperCase(), 0, `style="font-size:${Math.min(8, r.width * scale / (r.name.length * .65))}px"`);
      markup += "</g>";
    }
    project.floors.forEach((f, index) => {
      if (!index) return;
      markup += `<g data-site-upper-floor="${escape(f.id)}" pointer-events="none">`;
      for (const r of f.rooms) markup += polygon(roomVertices(r).map(([x, y]) => [x + p.houseX, y + p.houseY]), "none", `style="stroke:#7d957d;stroke-dasharray:4 3;stroke-width:1${editable ? ";pointer-events:all" : ""}"`);
      markup += "</g>";
    });
    for (const wall of exteriorRoomWalls(ground.rooms).filter(w => w.room.railing)) {
      const { height } = railingSettings(wall.room);
      const edge = (v, up) => [v[0] + p.houseX, v[1] + p.houseY, up];
      markup += railingMarkup([edge(wall.a, 0), edge(wall.b, 0), edge(wall.b, height), edge(wall.a, height)], point, wall.room, true, units);
    }
    for (const feature of (project.features || []).filter(f => f.type !== "gate" && f.floorId === ground.id)) {
      markup += featureMarkup(feature, featureVertices(feature, featureHost(project, feature), 0, { x: p.houseX, y: p.houseY }), point, true, units);
    }
    markup += "</g>";
    for (const segment of fenceSegments) markup += fenceMarkup(segment.vertices, fence, point, true, units);
    for (const feature of (project.features || []).filter(f => f.type === "gate")) markup += featureMarkup(feature, featureVertices(feature, featureHost(project, feature)), point, true, units);
    for (const [index, building] of structures.entries()) {
      markup += `<g data-site-building="true" ${itemAttrs(`building-${index}`, escape(building.name))}>`;
      markup += polygon(rect(building.x, building.y, building.width, building.depth), "#d8d5c6", 'style="stroke:#7f8678;stroke-width:1.2"');
      if (labels) markup += worldText(building.x + building.width / 2, building.y + building.depth / 2, building.name.toUpperCase(), 0, `style="font-size:${Math.min(8, building.width * scale / (building.name.length * .65))}px"`);
      markup += "</g>";
    }
    for (const [index, tree] of features.trees.entries()) {
      const v = point(tree.x, tree.y), radius = tree.radius * scale;
      markup += `<g data-landscape-tree="true" ${itemAttrs(`tree-${index}`, `tree ${index + 1}`)}><circle cx="${v.x}" cy="${v.y}" r="${radius}" fill="#bdcfa6" stroke="#98b185" stroke-width=".8"/><path d="M${v.x - radius * .7} ${v.y}h${radius * 1.4}m${-radius * .7} ${-radius * .7}v${radius * 1.4}" stroke="#91a77e" stroke-width=".7"/><circle cx="${v.x}" cy="${v.y}" r="${radius * .65}" fill="#a8bf9170" stroke="#a0b88c" stroke-width=".5"/></g>`;
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
    markup += text((a.x + b.x) / 2, (a.y + b.y) / 2 - 7, formatLength(p.width, units));
    markup += text((c.x + d.x) / 2 - 16, (c.y + d.y) / 2, formatLength(p.depth, units));
  }
  markup += "</g>";
  return { markup: namespaceScene(markup, idPrefix), scale, framing: { left, right, top, bottom } };

  function tree3d(tree) {
    const base = point(tree.x, tree.y), top = point(tree.x, tree.y, tree.radius * 1.8);
    const radius = tree.radius * scale;
    return `<g data-landscape-tree="true" data-tree-canopy="true" pointer-events="none"><path d="M${base.x} ${base.y}L${top.x} ${top.y + radius * .38}" stroke="#887b61" stroke-width="${Math.max(1, radius * .1)}"/><ellipse cx="${top.x}" cy="${top.y + radius * .28}" rx="${radius}" ry="${radius * .55}" fill="#78906c" opacity=".4"/><ellipse cx="${top.x}" cy="${top.y}" rx="${radius * .78}" ry="${radius * .68}" fill="#a2bc88" stroke="#819b6f" stroke-width=".7"/><ellipse cx="${top.x - radius * .32}" cy="${top.y + radius * .12}" rx="${radius * .48}" ry="${radius * .48}" fill="#b5c99d" stroke="#91a980" stroke-width=".55"/><ellipse cx="${top.x + radius * .32}" cy="${top.y + radius * .08}" rx="${radius * .46}" ry="${radius * .45}" fill="#c1d2a7" stroke="#9bb387" stroke-width=".55"/><ellipse cx="${top.x}" cy="${top.y - radius * .22}" rx="${radius * .42}" ry="${radius * .38}" fill="#c8d8ae" opacity=".8"/></g>`;
  }
}
