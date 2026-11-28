import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { validDate, toKg, fromKg, validateData, dailyAverages, deriveKey, encryptData,
  unlockData, validateEnvelope, chartSvg } from "./model.js";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const journal = { version: 1, name: "Alex <&>", unit: "kg", entries: [
  { id: "a", date: "2026-11-01", kg: 80 },
  { id: "b", date: "2026-11-01", kg: 82 },
  { id: "c", date: "2026-11-03", kg: 79 },
] };

test("daily means preserve measurements, convert units, and filter inclusive calendar dates", () => {
  assert.deepEqual(dailyAverages(journal.entries, "kg"), [
    { date: "2026-11-01", weight: 81, count: 2 }, { date: "2026-11-03", weight: 79, count: 1 },
  ]);
  assert.deepEqual(dailyAverages(journal.entries, "kg", "2026-11-01", "2026-11-01"),
    [{ date: "2026-11-01", weight: 81, count: 2 }]);
  assert.equal(dailyAverages(journal.entries, "kg", "2026-11-02", "").length, 1);
  assert.equal(dailyAverages(journal.entries, "kg", "", "2026-10-31").length, 0);
  assert.deepEqual(dailyAverages([], "kg"), []);
  assert.equal(fromKg(toKg(180, "lb"), "lb"), 180);
  assert.equal(dailyAverages(journal.entries, "lb")[0].weight, fromKg(81, "lb"));
  assert.throws(() => dailyAverages([], "kg", "2026-11-03", "2026-11-01"), /date range/);
  for (const date of ["2026-02-30", "2026-13-01", "2026-00-01", "2026-2-01", "2025-02-29", "", null]) {
    assert.equal(validDate(date), false);
  }
  assert.equal(validDate("2024-02-29"), true);
  for (const value of [0, -1, Infinity, NaN, 2001]) assert.throws(() => toKg(value, "kg"), /weight/);
  assert.throws(() => toKg(100, "oz"), /weight/);
  assert.deepEqual(validateData(journal), journal);
  for (const invalid of [
    { ...journal, name: " " }, { ...journal, unit: "oz" }, { ...journal, version: 2 },
    { ...journal, entries: [journal.entries[0], journal.entries[0]] },
    { ...journal, entries: [{ id: "bad", date: "2026-02-30", kg: 80 }] },
    { ...journal, entries: [{ id: "bad", date: "2026-11-01", kg: -1 }] },
  ]) assert.throws(() => validateData(invalid));
});

test("encrypted JSON round-trips, randomizes nonces, rejects wrong passwords and tampering", async () => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey("correct-password", salt);
  const envelope = await encryptData(journal, key, salt);
  assert.equal(envelope.iterations, 600000);
  assert.equal(envelope.format, "weight-tracker-encrypted");
  assert.equal(JSON.stringify(envelope).includes(journal.name), false);
  const restored = await unlockData(JSON.parse(JSON.stringify(envelope)), "correct-password");
  assert.deepEqual(restored.data, journal);
  assert.notEqual((await encryptData(journal, key, salt)).iv, envelope.iv);
  await assert.rejects(unlockData(envelope, "wrong-password"), /Unable to unlock/);
  const tampered = { ...envelope, ciphertext: (envelope.ciphertext[0] === "A" ? "B" : "A") + envelope.ciphertext.slice(1) };
  await assert.rejects(unlockData(tampered, "correct-password"), /Unable to unlock/);
  assert.throws(() => validateEnvelope({ ...envelope, iterations: 1 }), /valid encrypted/);
  assert.throws(() => validateEnvelope({ ...envelope, iv: "" }), /incomplete/);
  assert.throws(() => validateEnvelope({ ...envelope, version: 2 }), /valid encrypted/);
});

test("SVG exports escape names, plot elapsed dates and daily means, and handle empty or single days", () => {
  const days = dailyAverages(journal.entries, "kg");
  const svg = chartSvg(days, "kg", journal.name);
  assert.match(svg, /Alex &lt;&amp;&gt;/);
  assert.match(svg, /2026-11-01: 81.00 kg \(2 entries\)/);
  assert.equal((svg.match(/<circle /g) || []).length, 2);
  assert.doesNotMatch(svg, /NaN|Infinity/);
  const spaced = chartSvg([{ date: "2026-11-01", weight: 80, count: 1 },
    { date: "2026-11-02", weight: 79, count: 1 }, { date: "2026-11-11", weight: 78, count: 1 }], "kg", "Alex");
  assert.match(spaced, /<circle cx="163\.5"/);
  assert.doesNotMatch(chartSvg(days.slice(0, 1), "kg", "Alex"), /NaN|Infinity/);
  assert.match(chartSvg([], "kg", "Alex"), /No entries in this date range/);
});
