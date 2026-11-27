const ROUTE_URL = "https://valhalla1.openstreetmap.de/route";
const ROUTE_TIMEOUT_MS = 20000;
const MIN_REQUEST_INTERVAL_MS = 1100;
let lastRequest = 0;

async function waitForRequestSlot(signal) {
  while (true) {
    if (signal.aborted) throw new DOMException("Route request cancelled.", "AbortError");
    const delay = Math.max(0, MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequest));
    if (!delay) {
      lastRequest = Date.now();
      return;
    }
    await new Promise((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
        reject(new DOMException("Route request cancelled.", "AbortError"));
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, delay);
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
    });
  }
}

function decodeShape(shape) {
  if (typeof shape !== "string" || !shape) throw new Error("Missing route geometry.");
  const coordinates = [];
  let index = 0;
  let lat = 0;
  let lon = 0;

  function readDelta() {
    let result = 0;
    let shift = 0;
    let value;
    do {
      if (index >= shape.length || shift > 30) throw new Error("Invalid route geometry.");
      value = shape.charCodeAt(index++) - 63;
      if (value < 0 || value > 63) throw new Error("Invalid route geometry.");
      result += (value & 31) * 2 ** shift;
      shift += 5;
    } while (value >= 32);
    return result % 2 ? -(result + 1) / 2 : result / 2;
  }

  while (index < shape.length) {
    lat += readDelta();
    lon += readDelta();
    if (Math.abs(lat) > 90e6 || Math.abs(lon) > 180e6) {
      throw new Error("Invalid route coordinates.");
    }
    coordinates.push({ lat: lat / 1e6, lon: lon / 1e6 });
  }
  if (coordinates.length < 2) throw new Error("Route geometry has too few points.");
  return coordinates;
}

export async function findRoute(points, profile, signal) {
  await waitForRequestSlot(signal);
  const url = new URL(ROUTE_URL);
  url.searchParams.set("json", JSON.stringify({
    locations: points.map(({ lat, lon }) => ({ lat, lon })),
    costing: profile,
    directions_options: { units: "kilometers" },
  }));
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, ROUTE_TIMEOUT_MS);
  if (signal.aborted) abort();
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    const data = await response.json();
    if (!response.ok || data.trip?.status !== 0) {
      throw new Error(data.error || `Routing service returned HTTP ${response.status}.`);
    }
    const { summary, legs } = data.trip;
    if (!summary || !Number.isFinite(summary.length) || summary.length < 0 ||
        !Number.isFinite(summary.time) || summary.time < 0 || !Array.isArray(legs) || !legs.length) {
      throw new Error("Routing service returned an invalid route.");
    }
    const coordinates = [];
    const instructions = [];
    for (const leg of legs) {
      for (const point of decodeShape(leg.shape)) coordinates.push(point);
      if (!Array.isArray(leg.maneuvers)) throw new Error("Routing service returned invalid directions.");
      for (const maneuver of leg.maneuvers) {
        if (typeof maneuver.instruction !== "string") {
          throw new Error("Routing service returned invalid directions.");
        }
        instructions.push(maneuver.instruction);
      }
    }
    return { coordinates, instructions, distance: summary.length, duration: summary.time };
  } finally {
    signal.removeEventListener("abort", abort);
    clearTimeout(timeout);
  }
}
