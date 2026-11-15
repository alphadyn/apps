export const UNIT_SYSTEMS = ["metric", "imperial"];
export const METERS_PER_FOOT = 0.3048;

export function lengthUnit(system = "metric") {
  return system === "imperial" ? "ft" : "m";
}

export function areaUnit(system = "metric") {
  return system === "imperial" ? "ft²" : "m²";
}

export function fromMeters(value, system = "metric") {
  return system === "imperial" ? value / METERS_PER_FOOT : value;
}

export function toMeters(value, system = "metric") {
  return system === "imperial" ? value * METERS_PER_FOOT : value;
}

export function formatLength(value, system = "metric", digits = 2) {
  return `${fromMeters(value, system).toLocaleString("en", { maximumFractionDigits: digits })} ${lengthUnit(system)}`;
}

export function formatArea(value, system = "metric", digits = 2) {
  const converted = system === "imperial" ? value / (METERS_PER_FOOT ** 2) : value;
  return `${converted.toLocaleString("en", { maximumFractionDigits: digits })} ${areaUnit(system)}`;
}

export function inputLength(value, system = "metric") {
  return String(Number(fromMeters(value, system).toFixed(3)));
}

export function inputLengthLimit(value, system = "metric") {
  return String(Number(fromMeters(value, system).toFixed(3)));
}
