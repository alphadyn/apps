import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const script = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const storageKey = "northstar-ehr-state-v3";

function setup(accountId = "clinician", storage = new Map()) {
  const context = vm.createContext({
    window: {},
    console,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value)
    },
    sessionStorage: { getItem: () => accountId }
  });
  vm.runInContext(script, context);
  return { api: context.window.__ehrApp, storage };
}

test("Overview excludes individual patient workspaces", () => {
  const { api } = setup();
  const sections = api.getVisibleSections("overview");
  for (const name of ["recordsSection", "operationsSection", "encounterSection", "clinicalSection"]) {
    assert.equal(sections[name], false, name);
  }
  assert.equal(sections.roleManagementSection, false);
  assert.equal(sections.operationsOverviewSection, true);
  assert.equal(api.getVisibleSections("patients").recordsSection, true);
});

test("only Admins can change authorized account roles", () => {
  for (const accountId of ["clinician", "nurse"]) {
    const { api } = setup(accountId);
    assert.equal(api.updateAccountRole("admin", "staff").allowed, false);
    assert.equal(api.updateAccountRoles(accountId, ["clinician", "admin"]).allowed, false);
    assert.equal(api.setCurrentRole("staff").role, accountId);
  }
});

test("Admin assignments persist across sign-in and reload", () => {
  const admin = setup("admin");
  assert.equal(admin.api.updateAccountRole("clinician", "midlevel").allowed, true);
  const provider = setup("clinician", admin.storage);
  assert.equal(provider.api.setCurrentRole("admin").role, "midlevel");
  assert.equal(provider.api.hasPermission("midlevel", "encounter:create"), true);
  assert.equal(provider.api.hasPermission("midlevel", "roles:manage"), false);
});

test("the last Admin cannot be removed and invalid assignments are rejected", () => {
  const { api } = setup("admin");
  assert.equal(api.updateAccountRole("clinician", "clinician").allowed, true);
  assert.equal(api.updateAccountRole("admin", "staff").allowed, false);
  assert.equal(api.updateAccountRole("missing", "staff").allowed, false);
  assert.equal(api.updateAccountRole("clinician", "invalid").allowed, false);
  assert.equal(api.updateAccountRole("clinician", "admin").allowed, true);
  assert.equal(api.updateAccountRole("admin", "staff").allowed, true);
  assert.equal(api.updateAccountRole("nurse", "admin").allowed, false);
});

test("legacy unrestricted role switches do not override account assignments", () => {
  const storage = new Map([[storageKey, JSON.stringify({
    currentUser: { accountId: "clinician", role: "admin" },
    accountRoles: { clinician: ["clinician"] }
  })]]);
  const { api } = setup("clinician", storage);
  assert.equal(api.setCurrentRole("admin").role, "clinician");
});

test("Staff remains nonclinical while Provider and Nurse retain workflow capabilities", () => {
  const { api } = setup();
  assert.equal(api.hasPermission("staff", "encounter:create"), false);
  assert.equal(api.hasPermission("staff", "appointment:complete"), true);
  assert.equal(api.hasPermission("clinician", "order:create"), true);
  assert.equal(api.hasPermission("nurse", "workflow:update"), true);
});

test("invalid saved roles are repaired and a saved workspace retains an Admin", () => {
  const storage = new Map([[storageKey, JSON.stringify({
    accountRoles: { clinician: "staff", nurse: "constructor", admin: "staff" }
  })]]);
  const { api } = setup("admin", storage);
  assert.equal(api.getVisibleSections("overview").roleManagementSection, true);
  assert.equal(api.updateAccountRole("nurse", "midlevel").allowed, true);
  assert.deepEqual(JSON.parse(storage.get(storageKey)).accountRoles.clinician, ["staff"]);
});

test("users can switch only among their authorized roles and preserve the active role on reload", () => {
  const admin = setup("admin");
  assert.equal(admin.api.updateAccountRoles("clinician", ["clinician", "nurse", "midlevel"]).allowed, true);
  const provider = setup("clinician", admin.storage);
  assert.equal(provider.api.setCurrentRole("nurse").role, "nurse");
  assert.equal(provider.api.hasPermission("nurse", "encounter:create"), false);
  assert.equal(provider.api.setCurrentRole("admin").role, "nurse");
  assert.equal(provider.api.setCurrentRole("invalid").role, "nurse");
  const reloaded = setup("clinician", provider.storage);
  assert.equal(reloaded.api.setCurrentRole("admin").role, "nurse");
  assert.equal(reloaded.api.setCurrentRole("midlevel").role, "midlevel");
});

test("Admin authorization changes preserve a valid active role and replace a revoked role", () => {
  const { api } = setup("admin");
  assert.equal(api.updateAccountRoles("admin", ["admin", "clinician"]).allowed, true);
  assert.equal(api.setCurrentRole("clinician").role, "clinician");
  assert.equal(api.updateAccountRoles("nurse", ["staff"]).allowed, false);
  assert.equal(api.setCurrentRole("admin").role, "admin");
  assert.equal(api.updateAccountRoles("nurse", ["admin"]).allowed, true);
  assert.equal(api.updateAccountRoles("admin", ["staff"]).allowed, true);
  assert.equal(api.setCurrentRole("admin").role, "staff");
});

test("empty authorization lists and removing the last authorized Admin are rejected", () => {
  const { api } = setup("admin");
  assert.equal(api.updateAccountRole("clinician", "clinician").allowed, true);
  assert.equal(api.updateAccountRoles("clinician", []).allowed, false);
  assert.equal(api.updateAccountRoles("clinician", ["constructor"]).allowed, false);
  assert.equal(api.updateAccountRoles("admin", ["staff"]).allowed, false);
  assert.equal(api.updateAccountRoles("admin", ["admin", "clinician"]).allowed, true);
});

test("legacy single-role assignments migrate without authorizing extra roles", () => {
  const storage = new Map([[storageKey, JSON.stringify({
    accountRoles: { clinician: "midlevel", nurse: "nurse", admin: "admin" }
  })]]);
  const { api } = setup("clinician", storage);
  assert.equal(api.setCurrentRole("clinician").role, "midlevel");
  assert.deepEqual(JSON.parse(storage.get(storageKey)).accountRoles.clinician, ["midlevel"]);
});

test("Elena defaults to Provider and Admin with only the active role's permissions", () => {
  const { api, storage } = setup("clinician");
  assert.equal(api.getVisibleSections("overview").roleManagementSection, false);
  assert.equal(api.setCurrentRole("admin").role, "admin");
  assert.equal(api.getVisibleSections("overview").roleManagementSection, true);
  assert.deepEqual(JSON.parse(storage.get(storageKey)).accountRoles.clinician, ["clinician", "admin"]);
  assert.equal(api.setCurrentRole("clinician").role, "clinician");
  assert.equal(api.getVisibleSections("overview").roleManagementSection, false);
});
