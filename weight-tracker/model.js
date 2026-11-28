export const STORAGE_KEY = "alphadyn.weight-tracker.v1";
const ITERATIONS = 600000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function validDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && value >= "1900-01-01" && value <= "9999-12-31"
    && Number.isFinite(Date.parse(`${value}T12:00:00Z`))
    && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

export function toKg(value, unit) {
  if (!["kg", "lb"].includes(unit) || !Number.isFinite(value) || value <= 0 || value > 2000) {
    throw new Error("Enter a weight greater than zero and no more than 2,000.");
  }
  return unit === "lb" ? value * 0.45359237 : value;
}

export function fromKg(value, unit) {
  return unit === "lb" ? value / 0.45359237 : value;
}

export function validateData(data) {
  if (!data || data.version !== 1 || typeof data.name !== "string" || !data.name.trim()
    || data.name.length > 80 || !["kg", "lb"].includes(data.unit) || !Array.isArray(data.entries)
    || data.entries.length > 100000) {
    throw new Error("Invalid Weight Tracker data or unsupported version.");
  }
  const ids = new Set();
  for (const entry of data.entries) {
    if (!entry || typeof entry.id !== "string" || !entry.id || ids.has(entry.id)
      || !validDate(entry.date) || !Number.isFinite(entry.kg) || entry.kg <= 0 || entry.kg > 2000) {
      throw new Error("The backup contains an invalid or duplicate weight entry.");
    }
    ids.add(entry.id);
  }
  return { version: 1, name: data.name.trim(), unit: data.unit,
    entries: data.entries.map(({ id, date, kg }) => ({ id, date, kg })) };
}

export function dailyAverages(entries, unit, start = "", end = "") {
  if ((start && !validDate(start)) || (end && !validDate(end)) || (start && end && start > end)) {
    throw new Error("Choose a valid date range with the start on or before the end.");
  }
  const days = new Map();
  for (const entry of entries) {
    if ((start && entry.date < start) || (end && entry.date > end)) continue;
    const day = days.get(entry.date) || { sum: 0, count: 0 };
    day.sum += entry.kg;
    day.count++;
    days.set(entry.date, day);
  }
  return [...days].sort(([a], [b]) => a.localeCompare(b))
    .map(([date, day]) => ({ date, weight: fromKg(day.sum / day.count, unit), count: day.count }));
}

function base64(bytes) {
  let text = "";
  for (const byte of bytes) text += String.fromCharCode(byte);
  return btoa(text);
}

function bytes(value) {
  return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

export class DecryptionError extends Error {
  constructor(cause) {
    super("Unable to unlock. The password is incorrect or the backup is damaged.", { cause });
    this.name = "DecryptionError";
  }
}

export function validateEnvelope(value) {
  if (!value || value.format !== "weight-tracker-encrypted" || value.version !== 1
    || value.iterations !== ITERATIONS || typeof value.salt !== "string"
    || typeof value.iv !== "string" || typeof value.ciphertext !== "string"
    || value.ciphertext.length > 20000000) {
    throw new Error("Choose a valid encrypted Weight Tracker JSON backup.");
  }
  if (bytes(value.salt).length !== 16 || bytes(value.iv).length !== 12 || bytes(value.ciphertext).length < 16) {
    throw new Error("The encrypted backup is incomplete.");
  }
  return value;
}

export async function derivePasswordMaterial(password) {
  return crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveKey"]);
}

export async function deriveKeyFromMaterial(material, salt) {
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function deriveKey(password, salt) {
  return deriveKeyFromMaterial(await derivePasswordMaterial(password), salt);
}

export async function encryptData(data, key, salt) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key,
    encoder.encode(JSON.stringify(validateData(data))));
  return { format: "weight-tracker-encrypted", version: 1, iterations: ITERATIONS,
    salt: base64(salt), iv: base64(iv), ciphertext: base64(new Uint8Array(ciphertext)) };
}

export async function unlockData(envelope, password) {
  validateEnvelope(envelope);
  const salt = bytes(envelope.salt);
  const key = await deriveKey(password, salt);
  return decryptData(envelope, key, salt);
}

export async function unlockDataWithKey(envelope, key) {
  validateEnvelope(envelope);
  return decryptData(envelope, key, bytes(envelope.salt));
}

export async function unlockDataWithMaterial(envelope, material) {
  validateEnvelope(envelope);
  const salt = bytes(envelope.salt);
  const key = await deriveKeyFromMaterial(material, salt);
  return decryptData(envelope, key, salt);
}

async function decryptData(envelope, key, salt) {
  let plaintext;
  try {
    plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(envelope.iv) }, key, bytes(envelope.ciphertext));
  } catch (error) {
    throw new DecryptionError(error);
  }
  return { data: validateData(JSON.parse(decoder.decode(plaintext))), key, salt };
}

export function escapeXml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]);
}

export function chartSvg(days, unit, name) {
  const width = 1000, height = 380, left = 75, right = 40, top = 65, bottom = 65;
  const weights = days.map(day => day.weight);
  const min = weights.length ? weights.reduce((a, b) => Math.min(a, b)) : 0;
  const max = weights.length ? weights.reduce((a, b) => Math.max(a, b)) : 1;
  const pad = Math.max((max - min) * 0.2, 1);
  const low = Math.max(0, min - pad), high = max + pad;
  const time = date => Date.parse(`${date}T12:00:00Z`);
  const first = days.length ? time(days[0].date) : 0;
  const span = days.length > 1 ? time(days.at(-1).date) - first : 0;
  const x = day => span ? left + (time(day.date) - first) / span * (width - left - right) : (left + width - right) / 2;
  const y = weight => top + (high - weight) / (high - low) * (height - top - bottom);
  let body = "";
  for (let i = 0; i <= 4; i++) {
    const value = low + (high - low) * i / 4;
    body += `<path d="M${left} ${y(value)}H${width - right}" stroke="#e8ede8"/><text x="${left - 14}" y="${y(value) + 4}" text-anchor="end" fill="#718078" font-size="12">${value.toFixed(1)}</text>`;
  }
  if (days.length) {
    const points = days.map(day => `${x(day)},${y(day.weight)}`).join(" ");
    body += `<polygon points="${x(days[0])},${height - bottom} ${points} ${x(days.at(-1))},${height - bottom}" fill="url(#shade)"/><polyline points="${points}" fill="none" stroke="#31765a" stroke-width="3" stroke-linejoin="round"/>`;
    for (const day of days) {
      body += `<circle cx="${x(day)}" cy="${y(day.weight)}" r="4" fill="#31765a" stroke="white" stroke-width="2"><title>${day.date}: ${day.weight.toFixed(2)} ${unit} (${day.count} entries)</title></circle>`;
    }
    const labels = days.length === 1 ? [days[0]] : [days[0], days.at(-1)];
    for (const day of labels) body += `<text x="${x(day)}" y="${height - 30}" text-anchor="middle" fill="#718078" font-size="12">${day.date}</text>`;
  } else {
    body += '<text x="500" y="200" text-anchor="middle" fill="#718078" font-size="16">No entries in this date range</text>';
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Daily mean weight in ${unit}" style="font-family:system-ui,sans-serif"><defs><linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#31765a" stop-opacity=".18"/><stop offset="1" stop-color="#31765a" stop-opacity=".01"/></linearGradient></defs><rect width="1000" height="380" rx="12" fill="#ffffff"/><text x="${left}" y="32" fill="#314b3e" font-size="16">${escapeXml(name)} · Daily average (${unit})</text>${body}</svg>`;
}
