import test from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { validDate, toKg, fromKg, validateData, dailyAverages, deriveKey, encryptData,
  unlockData, validateEnvelope, chartSvg } from "./model.js";
import { JournalServer, usernameIdentity } from "./server.js";
import { runChecks } from "../scripts/test-checks.js";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const journal = { version: 1, name: "Alex <&>", unit: "kg", entries: [
  { id: "a", date: "2026-11-01", kg: 80 },
  { id: "b", date: "2026-11-01", kg: 82 },
  { id: "c", date: "2026-11-03", kg: 79 },
] };
const checks = [];
const check = (name, action) => checks.push([name, action]);

check("daily means preserve measurements, convert units, and filter inclusive calendar dates", () => {
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

check("encrypted JSON round-trips and server storage handles authentication and conflicts", async () => {
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

  const calls = [];
  let row = null;
  assert.equal(usernameIdentity("  Alex_1  "), "wt-alex_1@weight-tracker.invalid");
  assert.equal(usernameIdentity("ALEx-1"), usernameIdentity("alex-1"));
  for (const invalid of ["ab", "alex@example.com", "-alex", "with spaces", "Ken", "x".repeat(33)]) {
    assert.throws(() => usernameIdentity(invalid), /Username/);
  }
  await assert.rejects(new JournalServer({ url: "", key: "" }, async () => {
    throw new Error("Unconfigured server should not be called");
  }).signIn("alex", "password"), /not configured/);
  await assert.rejects(new JournalServer({ url: "https://example.test", key: "public" },
    async () => Response.json({ id: "inactive" })).signUp("alex", "password"), /confirmation disabled/);
  const mockFetch = async (url, options) => {
    calls.push({ url, options });
    const body = options.body && JSON.parse(options.body);
    if (url.includes("/auth/v1/signup") || url.includes("grant_type=password") || url.includes("grant_type=refresh_token")) {
      return Response.json({ access_token: "access", refresh_token: "refresh", expires_in: 3600, user: { id: "user-1" } });
    }
    if (url.includes("/auth/v1/logout")) return new Response(null, { status: 204 });
    if (url.includes("/rpc/")) {
      if ((row?.revision ?? null) !== body.expected_revision) {
        return Response.json({ message: "The journal changed elsewhere." }, { status: 400 });
      }
      row = { envelope: body.journal, revision: (row?.revision || 0) + 1 };
      return Response.json(row.revision);
    }
    return Response.json(row ? [row] : []);
  };
  const server = new JournalServer({ url: "https://example.test", key: "public" }, mockFetch);
  await assert.rejects(server.load(), /sign in/);
  await server.signUp("Alex_1", "account-password");
  assert.equal(JSON.parse(calls.at(-1).options.body).email, "wt-alex_1@weight-tracker.invalid");
  await server.signOut();
  await server.signIn("ALEX_1", "account-password");
  assert.equal(JSON.parse(calls.at(-1).options.body).email, "wt-alex_1@weight-tracker.invalid");
  assert.equal(await server.load(), null);
  assert.equal(await server.save(envelope, null), 1);
  assert.deepEqual(await server.load(), { envelope, revision: 1 });
  assert.equal(await server.save(envelope, 1), 2);
  await assert.rejects(server.save(envelope, 1), /changed elsewhere/);
  server.session.expiresAt = 0;
  assert.equal((await server.load()).revision, 2);
  assert.ok(calls.some(call => call.url.includes("grant_type=refresh_token")));
  assert.equal(calls.find(call => call.url.includes("/rpc/")).options.headers.Authorization, "Bearer access");
  await server.signOut();
  await assert.rejects(server.load(), /sign in/);
});

check("SVG exports escape names, plot elapsed dates and daily means, and handle empty or single days", () => {
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

test("journal aggregation and chart exports", () => runChecks([checks[0], checks[2]]));
test("encrypted backup and server authentication", () => runChecks([checks[1]]));
