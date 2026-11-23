export const RAILING_STYLES = { glass: "Glass panels", metal: "Metal balusters", solid: "Solid masonry" };
export const ROOF_FINISHES = { membrane: "Light membrane", gravel: "Gravel ballast", tile: "Roof pavers" };
export const railingSettings = room => ({ enabled: room.railing === true, style: room.railingStyle ?? "glass", height: room.railingHeight ?? 1.1 });
export const roofSettings = project => project.roof ?? { finish: "membrane", parapet: false, height: .45 };

export function validateRailing(room, outdoor) {
  if (room.railing !== undefined && (typeof room.railing !== "boolean" || !outdoor)) throw new Error("Railings are an on/off setting for terraces and balconies only.");
  if (room.railingStyle !== undefined && (!outdoor || !Object.hasOwn(RAILING_STYLES, room.railingStyle))) throw new Error("Choose a supported outdoor railing style.");
  if (room.railingHeight !== undefined && (!outdoor || !Number.isFinite(room.railingHeight) || room.railingHeight < .6 || room.railingHeight > 1.8)) throw new Error("Railing height must be between 0.6 and 1.8 meters.");
}

export function validateRoof(project) {
  if (project.roof === undefined) return;
  const roof = project.roof;
  if (!roof || !Object.hasOwn(ROOF_FINISHES, roof.finish) || typeof roof.parapet !== "boolean") throw new Error("Choose valid flat-roof finish and parapet settings.");
  if (!Number.isFinite(roof.height) || roof.height < .2 || roof.height > 1.2) throw new Error("Roof parapet height must be between 0.2 and 1.2 meters.");
}

export const FINISH_COLORS = { oak: "#d8cfb9", deck: "#baa381", tile: "#dddace", concrete: "#c9cdc6", membrane: "#d9dece", gravel: "#bdbbb0" };

export function namespaceScene(markup, prefix) {
  if (!prefix) return markup;
  const name = prefix.replace(/[^a-zA-Z0-9_-]/g, "-");
  return markup.replace(/(\s)id="([^"]+)"/g, `$1id="${name}-$2"`).replaceAll("url(#", `url(#${name}-`);
}

export function surfaceMarkup(vertices, material, point, id) {
  const coords = list => list.map(v => { const p = point(...v); return `${p.x},${p.y}`; }).join(" ");
  const xs = vertices.map(v => v[0]), ys = vertices.map(v => v[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys), z = vertices[0][2];
  if (!Object.hasOwn(FINISH_COLORS, material)) throw new Error("Choose a supported surface finish.");
  const color = FINISH_COLORS[material];
  let detail = "";
  const line = list => `<polyline points="${coords(list)}" fill="none" stroke="#727665" stroke-width=".45" opacity=".3"/>`;
  if (["oak", "deck", "tile"].includes(material)) {
    const step = material === "tile" ? .6 : .24;
    for (let y = minY + step, row = 1; y < maxY; y += step, row++) {
      detail += line([[minX, y, z], [maxX, y, z]]);
      if (material !== "tile") {
        const x = minX + (maxX - minX) * (row % 2 ? .35 : .68);
        detail += line([[x, y - step, z], [x, y, z]]);
      }
    }
    if (material === "tile") {
      for (let x = minX + step; x < maxX; x += step) detail += line([[x, minY, z], [x, maxY, z]]);
    }
  } else if (material === "gravel") {
    for (let y = minY + .2, row = 0; y < maxY; y += .35, row++) {
      for (let x = minX + .16 + (row % 2) * .17; x < maxX; x += .35) {
        detail += line([[x, y, z], [x + .06, y + .04, z]]);
      }
    }
  }
  return `<defs><clipPath id="${id}"><polygon points="${coords(vertices)}"/></clipPath></defs><g data-surface-finish="${material}" clip-path="url(#${id})"><polygon points="${coords(vertices)}" fill="${color}" stroke="${color}" stroke-width=".5"/>${detail}</g>`;
}

export function edgePrism(a, b, normal, base, height, thickness = .12) {
  const at = (p, inside, z) => [p[0] - normal[0] * inside, p[1] - normal[1] * inside, z];
  const outerA = at(a, 0, base), outerB = at(b, 0, base), innerA = at(a, thickness, base), innerB = at(b, thickness, base);
  const up = p => [p[0], p[1], base + height];
  return [
    { vertices: [outerA, outerB, up(outerB), up(outerA)], fill: "#bbc0b2" },
    { vertices: [innerB, innerA, up(innerA), up(innerB)], fill: "#d4d8cb" },
    { vertices: [outerA, innerA, up(innerA), up(outerA)], fill: "#c5cabb" },
    { vertices: [innerB, outerB, up(outerB), up(innerB)], fill: "#c5cabb" },
    { vertices: [up(outerA), up(outerB), up(innerB), up(innerA)], fill: "#eeeade" },
  ];
}

// Split roof edges wherever an upper-floor footprint covers them, including partial spans.
export function exposedRoofEdge(edge, coverings) {
  const [ax, ay] = edge.a, dx = edge.b[0] - ax, dy = edge.b[1] - ay;
  const breaks = [0, 1], cross = (x, y, u, v) => x * v - y * u;
  for (const polygon of coverings) for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i], b = polygon[(i + 1) % polygon.length], ex = b[0] - a[0], ey = b[1] - a[1];
    const denominator = cross(dx, dy, ex, ey);
    if (Math.abs(denominator) < 1e-8) {
      if (Math.abs(cross(a[0] - ax, a[1] - ay, dx, dy)) < 1e-8) {
        for (const p of [a, b]) breaks.push(Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / (dx * dx + dy * dy))));
      }
      continue;
    }
    const t = cross(a[0] - ax, a[1] - ay, ex, ey) / denominator;
    const u = cross(a[0] - ax, a[1] - ay, dx, dy) / denominator;
    if (t > 0 && t < 1 && u >= 0 && u <= 1) breaks.push(t);
  }
  const inside = (x, y, polygon) => {
    let contained = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[j], b = polygon[i];
      if (Math.abs(cross(x - a[0], y - a[1], b[0] - a[0], b[1] - a[1])) < 1e-7 &&
        x >= Math.min(a[0], b[0]) - 1e-8 && x <= Math.max(a[0], b[0]) + 1e-8 &&
        y >= Math.min(a[1], b[1]) - 1e-8 && y <= Math.max(a[1], b[1]) + 1e-8) return true;
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) contained = !contained;
    }
    return contained;
  };
  const sorted = [...new Set(breaks)].sort((a, b) => a - b);
  return sorted.slice(1).flatMap((to, i) => {
    const from = sorted[i], t = (from + to) / 2;
    if (to - from < 1e-8 || coverings.some(polygon => inside(ax + dx * t, ay + dy * t, polygon))) return [];
    return [{ ...edge, a: [ax + dx * from, ay + dy * from], b: [ax + dx * to, ay + dy * to] }];
  });
}
