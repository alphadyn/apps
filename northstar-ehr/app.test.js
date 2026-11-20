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
  return { api: context.window.__ehrApp, storage, context };
}

const sessionKey = "northstar-ehr-demo-account";
const acknowledgmentKey = "northstar-ehr-warning-acknowledged";
const automaticSignInKey = "northstar-ehr-automatic-sign-in";

function setupNavigation(mobile = false, storage = new Map()) {
  const { context } = setup("clinician", storage);
  const elements = new Map();
  for (const id of ["appShell", "workspaceSidebar", "main-content", "navigationToggle", "navigationBackdrop", "closeNavigationBtn", "navigationStatus"]) {
    elements.set(id, {
      dataset: {},
      attributes: {},
      inert: false,
      hidden: false,
      textContent: "",
      setAttribute(name, value) { this.attributes[name] = value; },
      removeAttribute(name) { delete this.attributes[name]; },
      contains(element) { return element === this; },
      focus() { context.document.activeElement = this; }
    });
  }
  context.document = {
    getElementById: (id) => elements.get(id),
    body: { classList: { toggle(name, enabled) { context.drawerLocked = enabled; } } },
    activeElement: null
  };
  context.mobileViewport = mobile;
  context.window.matchMedia = () => ({ matches: context.mobileViewport });
  return { context, elements, storage };
}

test("desktop navigation collapses, persists, and restores without changing the current view", () => {
  const { context, elements, storage } = setupNavigation();
  vm.runInContext("syncNavigationLayout()", context);
  assert.equal(elements.get("appShell").dataset.navigationOpen, "true");
  assert.equal(elements.get("main-content").inert, false);
  vm.runInContext("setNavigationOpen(false)", context);
  assert.equal(elements.get("workspaceSidebar").inert, true);
  assert.equal(elements.get("navigationToggle").attributes["aria-expanded"], "false");
  assert.equal(elements.get("navigationToggle").attributes["aria-label"], "Show navigation");
  assert.equal(JSON.parse(storage.get(storageKey)).sidebarCollapsed, true);
  const restored = setupNavigation(false, storage);
  vm.runInContext("syncNavigationLayout()", restored.context);
  assert.equal(restored.elements.get("appShell").dataset.navigationOpen, "false");
  vm.runInContext("setNavigationOpen(true)", restored.context);
  assert.equal(restored.elements.get("workspaceSidebar").inert, false);
  assert.equal(JSON.parse(storage.get(storageKey)).sidebarCollapsed, false);
  assert.equal(JSON.parse(storage.get(storageKey)).currentView, "overview");
});

test("mobile navigation contains the workspace, restores focus, and preserves desktop preference", () => {
  const storage = new Map([[storageKey, JSON.stringify({ sidebarCollapsed: true })]]);
  const { context, elements } = setupNavigation(true, storage);
  vm.runInContext("syncNavigationLayout()", context);
  assert.equal(elements.get("appShell").dataset.navigationOpen, "false");
  vm.runInContext("setNavigationOpen(true)", context);
  assert.equal(elements.get("navigationBackdrop").hidden, false);
  assert.equal(elements.get("main-content").inert, true);
  assert.equal(elements.get("workspaceSidebar").attributes.role, "dialog");
  assert.equal(elements.get("workspaceSidebar").attributes["aria-modal"], "true");
  assert.equal(context.drawerLocked, true);
  assert.equal(context.document.activeElement, elements.get("closeNavigationBtn"));
  vm.runInContext("closeMobileNavigation()", context);
  assert.equal(elements.get("navigationBackdrop").hidden, true);
  assert.equal(elements.get("main-content").inert, false);
  assert.equal(elements.get("workspaceSidebar").attributes["aria-modal"], undefined);
  assert.equal(context.drawerLocked, false);
  assert.equal(context.document.activeElement, elements.get("navigationToggle"));
  assert.equal(JSON.parse(storage.get(storageKey)).sidebarCollapsed, true);
  context.mobileViewport = false;
  vm.runInContext("syncNavigationLayout()", context);
  assert.equal(elements.get("appShell").dataset.navigationOpen, "false");
});

test("navigation preference storage errors are visible without changing the layout", () => {
  const { context, elements } = setupNavigation();
  const warnings = [];
  context.console = { warn: (...args) => warnings.push(args) };
  context.localStorage.setItem = () => { throw new Error("Storage blocked"); };
  vm.runInContext("syncNavigationLayout(); setNavigationOpen(false)", context);
  assert.equal(elements.get("appShell").dataset.navigationOpen, "true");
  assert.match(elements.get("navigationStatus").textContent, /Unable to save navigation settings/);
  assert.equal(warnings.length, 1);
});

test("each demo account resolves to its own staff profile", () => {
  const { context } = setup();
  const accountProfiles = [
    ["joe-spartan", "staff-joe-spartan"],
    ["clinician", "staff-elena-ruiz"],
    ["nurse", "staff-jordan-lee"],
    ["admin", "staff-alex-morgan"]
  ];

  for (const [accountId, expectedProfileId] of accountProfiles) {
    vm.runInContext(`currentUser = normalizeCurrentUser({ accountId: "${accountId}" })`, context);
    assert.equal(vm.runInContext("getCurrentUserStaffProfile()?.id", context), expectedProfileId);
    assert.match(
      vm.runInContext("renderStaffAvatar(getCurrentUserStaffProfile())", context),
      /class="staff-avatar staff-photo"/
    );
  }
});

test("staff directory cards show concise details and keep profile actions accessible", () => {
  const { context } = setup();
  context.directoryContainer = { innerHTML: "" };
  vm.runInContext("renderStaffView(directoryContainer)", context);

  assert.match(context.directoryContainer.innerHTML, /12 profiles/);
  assert.match(context.directoryContainer.innerHTML, /class="staff-card-role"/);
  assert.match(context.directoryContainer.innerHTML, /class="staff-card-title"/);
  assert.match(context.directoryContainer.innerHTML, /class="staff-card-meta"/);
  assert.match(context.directoryContainer.innerHTML, /class="staff-card-heading"/);
  assert.match(context.directoryContainer.innerHTML, /href="mailto:joe\.spartan@example\.test"/);
  assert.match(context.directoryContainer.innerHTML, /aria-label="View profile for Joe Spartan, MD"/);
  assert.doesNotMatch(context.directoryContainer.innerHTML, /<h3>Staff directory<\/h3>/);
  assert.doesNotMatch(context.directoryContainer.innerHTML, /Sign in with an Admin account/);

  vm.runInContext('currentUser = normalizeCurrentUser({ accountId: "admin" }); renderStaffView(directoryContainer)', context);
  assert.match(context.directoryContainer.innerHTML, /id="staffForm"/);
});

test("staff directory search filters staff details and reports empty results", () => {
  const { context } = setup();
  context.directoryContainer = { innerHTML: "" };
  const searchInput = {
    value: "radiology",
    attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; }
  };
  const resultsPanel = { hidden: false, innerHTML: "old global results" };
  context.document = {
    getElementById: (id) => id === "patientSearch" ? searchInput : resultsPanel
  };

  vm.runInContext('currentView = "staff"; renderGlobalSearch()', context);
  assert.equal(resultsPanel.hidden, true);
  assert.equal(resultsPanel.innerHTML, "");
  assert.equal(searchInput.attributes.role, "searchbox");
  assert.equal(searchInput.attributes["aria-label"], "Search staff directory");
  assert.equal(searchInput.attributes["aria-controls"], undefined);

  vm.runInContext("renderStaffView(directoryContainer)", context);

  assert.match(context.directoryContainer.innerHTML, /2 matches/);
  assert.match(context.directoryContainer.innerHTML, /Morgan Ellis, MD/);
  assert.match(context.directoryContainer.innerHTML, /Taylor Reed, MD/);
  assert.doesNotMatch(context.directoryContainer.innerHTML, /Joe Spartan, MD/);

  searchInput.value = "no matching staff";
  vm.runInContext("renderStaffView(directoryContainer)", context);
  assert.match(context.directoryContainer.innerHTML, /0 matches/);
  assert.match(context.directoryContainer.innerHTML, /No staff matched your search/);

  searchInput.value = "Joe";
  vm.runInContext('currentView = "overview"; renderGlobalSearch()', context);
  assert.equal(searchInput.attributes.role, "combobox");
  assert.equal(resultsPanel.hidden, false);
  assert.match(resultsPanel.innerHTML, /Joe Spartan/);
});

test("patient worklist search includes care team and location details", () => {
  const { context } = setup();
  const searchField = { value: "Dr. Elena Ruiz" };
  const list = { innerHTML: "" };
  const count = { textContent: "" };
  const activeFilterBar = { classList: { toggle() {} } };
  const activeFilterLabel = { textContent: "" };
  const elements = new Map([
    ["patientListSearch", searchField],
    ["activeFilterBar", activeFilterBar],
    ["activeFilterLabel", activeFilterLabel],
    ["patientList", list],
    ["patientListCount", count]
  ]);
  context.document = { getElementById: (id) => elements.get(id) };

  vm.runInContext("renderPatientList()", context);

  assert.equal(count.textContent, "6 records");
  assert.match(list.innerHTML, /Maya Thompson/);
  assert.match(list.innerHTML, /patient-card-priority/);
  assert.match(list.innerHTML, /aria-pressed=/);

  searchField.value = "not a patient";
  vm.runInContext("renderPatientList()", context);
  assert.equal(count.textContent, "0 records");
  assert.match(list.innerHTML, /No patients matched/);
});

function setupLogin(session = new Map(), storage = new Map([[automaticSignInKey, "signed-out"]])) {
  const { context } = setup(session.get(sessionKey) ?? null, storage);
  const elements = new Map();
  for (const id of [
    "loginScreen", "warningScreen", "appShell", "loginForm", "signOutBtn",
    "warningSignOutBtn", "acknowledgeWarningsBtn", "warningTitle", "warningError",
    "loginError", "loginUsername", "roleSwitchStatus", "accountRoleStatus", "main-content", "encounterStatus"
  ]) {
    elements.set(id, {
      hidden: id === "warningScreen" || id === "appShell",
      textContent: "",
      listeners: {},
      addEventListener(type, handler) { this.listeners[type] = handler; },
      focus() { context.focusedElement = id; }
    });
  }
  context.document = { getElementById: (id) => elements.get(id) };
  context.sessionStorage = {
    getItem: (key) => session.get(key) ?? null,
    setItem: (key, value) => session.set(key, value),
    removeItem: (key) => session.delete(key)
  };
  context.renderCount = 0;
  context.attachCount = 0;
  vm.runInContext(`
    renderOrderFields = () => {};
    renderDocumentFields = () => {};
    attachEvents = () => { attachCount++; };
    render = () => { renderCount++; };
    bootstrap();
  `, context);
  return {
    context, elements, session, storage,
    login(username = "elena.ruiz", password = "northstar") {
      const fields = {
        username: { value: username },
        password: { value: password, focus() { context.focusedElement = "password"; } }
      };
      elements.get("loginForm").listeners.submit({
        preventDefault() {},
        currentTarget: { elements: { namedItem: (name) => fields[name] }, reset() {} }
      });
    },
    click(id) { elements.get(id).listeners.click(); }
  };
}

test("valid sign-in requires acknowledgment before rendering the workspace", () => {
  const app = setupLogin();
  assert.equal(app.elements.get("loginScreen").hidden, false);
  app.login();
  assert.equal(app.elements.get("loginScreen").hidden, true);
  assert.equal(app.elements.get("warningScreen").hidden, false);
  assert.equal(app.elements.get("appShell").hidden, true);
  assert.equal(app.context.focusedElement, "warningTitle");
  assert.equal(app.context.renderCount, 0);
  app.click("acknowledgeWarningsBtn");
  assert.equal(app.elements.get("warningScreen").hidden, true);
  assert.equal(app.elements.get("appShell").hidden, false);
  assert.equal(app.session.get(acknowledgmentKey), "clinician");
  assert.equal(app.context.focusedElement, "main-content");
  assert.equal(app.context.renderCount, 1);
  assert.equal(app.context.attachCount, 1);
});

test("first load automatically signs in Joe Spartan with Provider permissions only", () => {
  const app = setupLogin(new Map(), new Map());
  assert.equal(app.session.get(sessionKey), "joe-spartan");
  assert.equal(app.storage.get(automaticSignInKey), "joe-spartan");
  assert.equal(app.elements.get("warningScreen").hidden, false);
  assert.equal(app.elements.get("loginScreen").hidden, true);
  assert.equal(app.elements.get("appShell").hidden, true);
  assert.equal(vm.runInContext("currentUser.label", app.context), "Joe Spartan, MD");
  assert.equal(vm.runInContext("currentUser.role", app.context), "clinician");
  assert.equal(vm.runInContext("accountRoles[automaticAccountId].join(',')", app.context), "clinician");
  assert.equal(app.context.window.__ehrApp.setCurrentRole("admin").role, "clinician");
  app.click("acknowledgeWarningsBtn");
  assert.equal(app.elements.get("appShell").hidden, false);
  assert.equal(app.context.window.__ehrApp.getVisibleSections("overview").roleManagementSection, false);
});

test("Joe is included in the directory and merged into previously saved directories", () => {
  const storage = new Map([[storageKey, JSON.stringify({
    staffDirectory: [{ id: "staff-custom", name: "Custom Provider", role: "Provider" }]
  })]]);
  const { context } = setup("joe-spartan", storage);
  assert.equal(vm.runInContext("staffDirectory.find(staff => staff.id === 'staff-joe-spartan').name", context), "Joe Spartan, MD");
  assert.equal(vm.runInContext("staffDirectory.some(staff => staff.id === 'staff-custom')", context), true);
  const portrait = vm.runInContext("renderStaffAvatar(staffDirectory.find(staff => staff.id === 'staff-joe-spartan'))", context);
  assert.match(portrait, /src="assets\/joe-spartan.jpg\?v=3"/);
  assert.match(portrait, /alt="Joe Spartan, MD profile portrait \(stock photo\)"/);
  assert.ok(readFileSync(new URL("./assets/joe-spartan.jpg", import.meta.url)).length > 0);
  const initials = vm.runInContext("renderStaffAvatar({ id: 'staff-custom', name: 'Custom Provider' })", context);
  assert.match(initials, /aria-hidden="true">CP<\/div>/);
  assert.doesNotMatch(initials, /<img/);
});

test("every built-in clinical staff member has a local portrait in saved and fresh directories", () => {
  const fresh = setup();
  const savedDirectory = vm.runInContext("JSON.stringify(staffDirectory)", fresh.context);
  const storage = new Map([[storageKey, JSON.stringify({
    staffDirectory: JSON.parse(savedDirectory)
  })]]);
  for (const { context } of [fresh, setup("clinician", storage)]) {
    const portraits = vm.runInContext(`
      staffDirectory
        .filter(staff => ["Provider", "Nurse", "PA", "Midlevel"].includes(staff.role))
        .map(staff => ({ id: staff.id, src: staffPortraits.get(staff.id), html: renderStaffAvatar(staff) }))
    `, context);
    assert.equal(portraits.length, 11);
    assert.equal(new Set(portraits.map(portrait => portrait.src)).size, portraits.length);
    for (const { id, src, html } of portraits) {
      assert.match(src, /^assets\/[a-z-]+\.jpg(?:\?v=\d+)?$/, id);
      assert.ok(html.includes(`src="${src}"`), id);
      assert.match(html, /profile portrait \(stock photo\)/, id);
      const image = readFileSync(new URL(`./${src.split("?")[0]}`, import.meta.url));
      assert.equal(image.readUInt16BE(0), 0xffd8, `${id}: JPEG header`);
      assert.equal(image.readUInt16BE(image.length - 2), 0xffd9, `${id}: JPEG footer`);
    }
    assert.match(
      vm.runInContext("staffPortraits.get('staff-morgan-ellis')", context),
      /^assets\/morgan-ellis\.jpg\?v=3$/
    );
    assert.notDeepEqual(
      readFileSync(new URL("./assets/morgan-ellis.jpg", import.meta.url)),
      readFileSync(new URL("./assets/joe-spartan.jpg", import.meta.url))
    );
    const adminAvatar = vm.runInContext("renderStaffAvatar(staffDirectory.find(staff => staff.id === 'staff-alex-morgan'))", context);
    assert.match(adminAvatar, /aria-hidden="true">AM<\/div>/);
    assert.doesNotMatch(adminAvatar, /<img/);
  }
});

test("portrait alt text escapes saved profile names", () => {
  const { context } = setup();
  const html = vm.runInContext(`renderStaffAvatar({ id: "staff-joe-spartan", name: 'Joe "Spartan" <MD>' })`, context);
  assert.match(html, /alt="Joe &quot;Spartan&quot; &lt;MD&gt; profile portrait \(stock photo\)"/);
});

test("physician profile names use MD without changing stored names or care-team links", () => {
  const { context } = setup();
  for (const [name, role, expected] of [
    ["Dr. Elena Ruiz", "Provider", "Elena Ruiz, MD"],
    ["Joe Spartan, MD", "Provider", "Joe Spartan, MD"],
    ["Dr. Joe Spartan, MD", "Provider", "Joe Spartan, MD"],
    ["New Physician", "Provider", "New Physician, MD"],
    ["Jordan Lee", "Nurse", "Jordan Lee"],
    ["Riley Bennett", "PA", "Riley Bennett"],
    ["Jamie Brooks", "Midlevel", "Jamie Brooks"],
    ["Alex Morgan", "Administrator", "Alex Morgan"]
  ]) {
    context.profileNameCase = { name, role };
    assert.equal(vm.runInContext("formatStaffProfileName(profileNameCase)", context), expected);
    assert.equal(context.profileNameCase.name, name);
  }
  const originalAssignments = vm.runInContext("JSON.stringify(patients.map(patient => patient.clinical.attending))", context);
  const html = vm.runInContext("renderStaffAvatar(staffDirectory.find(staff => staff.id === 'staff-elena-ruiz'))", context);
  assert.match(html, /alt="Elena Ruiz, MD profile portrait/);
  assert.doesNotMatch(html, /Dr\./);
  assert.equal(vm.runInContext("staffDirectory.find(staff => staff.id === 'staff-elena-ruiz').name", context), "Dr. Elena Ruiz");
  assert.equal(vm.runInContext("JSON.stringify(patients.map(patient => patient.clinical.attending))", context), originalAssignments);
});

test("Joe stays signed in across refresh and browser restart until explicit sign-out", () => {
  const first = setupLogin(new Map(), new Map());
  first.click("acknowledgeWarningsBtn");
  const refreshed = setupLogin(first.session, first.storage);
  assert.equal(refreshed.elements.get("appShell").hidden, false);
  const restarted = setupLogin(new Map(), first.storage);
  assert.equal(restarted.session.get(sessionKey), "joe-spartan");
  assert.equal(restarted.elements.get("warningScreen").hidden, false);
  restarted.click("warningSignOutBtn");
  assert.equal(restarted.storage.get(automaticSignInKey), "signed-out");
  const afterLogout = setupLogin(new Map(), restarted.storage);
  assert.equal(afterLogout.elements.get("loginScreen").hidden, false);
  assert.equal(afterLogout.session.has(sessionKey), false);
});

test("Joe can explicitly sign in after logout and re-enable persistent sign-in", () => {
  const app = setupLogin();
  app.login("joe.spartan");
  assert.equal(app.session.get(sessionKey), "joe-spartan");
  assert.equal(app.storage.get(automaticSignInKey), "joe-spartan");
  assert.equal(app.elements.get("warningScreen").hidden, false);
  app.click("acknowledgeWarningsBtn");
  app.click("signOutBtn");
  assert.equal(app.storage.get(automaticSignInKey), "signed-out");
  assert.equal(app.session.has(sessionKey), false);
  assert.equal(app.session.has(acknowledgmentKey), false);
});

test("a stale Joe tab session cannot bypass an explicit sign-out on reload", () => {
  const app = setupLogin(new Map([[sessionKey, "joe-spartan"]]));
  assert.equal(app.elements.get("loginScreen").hidden, false);
  assert.equal(app.elements.get("warningScreen").hidden, true);
  assert.equal(app.elements.get("appShell").hidden, true);
});

test("automatic sign-in preserves existing sessions and switching accounts disables Joe persistence", () => {
  const storage = new Map();
  const existing = setupLogin(new Map([[sessionKey, "nurse"]]), storage);
  assert.equal(existing.session.get(sessionKey), "nurse");
  assert.equal(vm.runInContext("currentUser.accountId", existing.context), "nurse");
  const app = setupLogin(new Map(), new Map());
  app.click("warningSignOutBtn");
  app.login("elena.ruiz");
  assert.equal(app.storage.get(automaticSignInKey), "signed-out");
  const restarted = setupLogin(new Map(), app.storage);
  assert.equal(restarted.elements.get("loginScreen").hidden, false);
});

test("failed sign-out is surfaced without pretending the session ended", () => {
  const app = setupLogin(new Map(), new Map());
  const warnings = [];
  app.context.console = { warn: (...args) => warnings.push(args) };
  app.context.localStorage.setItem = () => { throw new Error("Storage blocked"); };
  app.click("warningSignOutBtn");
  assert.equal(app.elements.get("warningScreen").hidden, false);
  assert.match(app.elements.get("warningError").textContent, /Unable to sign out/);
  assert.equal(app.session.get(sessionKey), "joe-spartan");
  assert.equal(warnings.length, 1);
});

test("invalid credentials do not open the warning screen or workspace", () => {
  const app = setupLogin();
  app.login("elena.ruiz", "invalid");
  assert.match(app.elements.get("loginError").textContent, /doesn't match/);
  assert.equal(app.elements.get("loginScreen").hidden, false);
  assert.equal(app.elements.get("warningScreen").hidden, true);
  assert.equal(app.elements.get("appShell").hidden, true);
  assert.equal(app.session.has(sessionKey), false);
});

test("refresh resumes only an acknowledged session for the same account", () => {
  for (const acknowledgment of [null, "nurse", "clinician"]) {
    const session = new Map([[sessionKey, "clinician"]]);
    if (acknowledgment) session.set(acknowledgmentKey, acknowledgment);
    const app = setupLogin(session);
    const acknowledged = acknowledgment === "clinician";
    assert.equal(app.elements.get("warningScreen").hidden, acknowledged);
    assert.equal(app.elements.get("appShell").hidden, !acknowledged);
    assert.equal(app.context.renderCount, acknowledged ? 1 : 0);
  }
});

test("sign-out from either screen clears acknowledgment and the next login shows warnings", () => {
  for (const acknowledge of [false, true]) {
    const app = setupLogin();
    app.login();
    if (acknowledge) app.click("acknowledgeWarningsBtn");
    app.click(acknowledge ? "signOutBtn" : "warningSignOutBtn");
    assert.equal(app.session.has(sessionKey), false);
    assert.equal(app.session.has(acknowledgmentKey), false);
    assert.equal(app.elements.get("warningScreen").hidden, true);
    assert.equal(app.elements.get("appShell").hidden, true);
    assert.equal(app.elements.get("loginScreen").hidden, false);
    assert.equal(app.context.focusedElement, "loginUsername");
    app.login("jordan.lee");
    assert.equal(app.elements.get("warningScreen").hidden, false);
    assert.equal(app.elements.get("appShell").hidden, true);
    app.click("acknowledgeWarningsBtn");
    assert.equal(app.context.attachCount, 1);
  }
});

test("a stale acknowledgment cannot bypass warnings on a fresh sign-in", () => {
  const app = setupLogin(new Map([[acknowledgmentKey, "clinician"]]));
  app.login();
  assert.equal(app.session.has(acknowledgmentKey), false);
  assert.equal(app.elements.get("warningScreen").hidden, false);
});

test("storage failure leaves warnings visible with an actionable error", () => {
  const app = setupLogin();
  app.login();
  const warnings = [];
  app.context.console = { warn: (...args) => warnings.push(args) };
  app.context.sessionStorage.setItem = () => { throw new Error("Storage blocked"); };
  app.click("acknowledgeWarningsBtn");
  assert.equal(app.elements.get("warningScreen").hidden, false);
  assert.equal(app.elements.get("appShell").hidden, true);
  assert.match(app.elements.get("warningError").textContent, /storage settings/);
  assert.equal(warnings.length, 1);
  assert.equal(app.context.renderCount, 0);
});

test("Overview excludes individual patient workspaces", () => {
  const { api } = setup();
  const sections = api.getVisibleSections("overview");
  for (const name of ["recordsSection", "operationsSection", "encounterSection", "clinicalSection"]) {
    assert.equal(sections[name], false, name);
  }
  assert.equal(sections.roleManagementSection, false);
  assert.equal(sections.operationsOverviewSection, true);
  assert.equal(api.getVisibleSections("patients").recordsSection, true);
  assert.equal(api.getVisibleSections("inbox").extendedSection, true);
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

test("patient timeline keeps all events and groups records from admission through planned care", () => {
  const { api } = setup();
  const admissionAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const beforeAdmission = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const afterAdmission = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const future = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const futureFollowUp = new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const sourcePatient = api.normalizePatient({
    id: 900,
    name: "Timeline Test",
    mrn: "T-900",
    age: 45,
    sex: "Female",
    diagnosis: "Test diagnosis",
    status: "Admitted",
    priority: "Routine",
    provider: "Test Provider",
    allergies: [],
    medications: [],
    labs: ["Undated marker"],
    labRecords: [],
    appointments: [{
      id: "appointment-future",
      scheduledAt: future,
      time: "Future visit",
      title: "Future appointment",
      location: "Clinic",
      status: "Scheduled"
    }],
    vitalReadings: [{ id: "vital-recent", recordedAt: afterAdmission, source: "Triage", values: { hr: 82 } }],
    events: [
      { id: "event-before-admission", type: "Encounter", title: "Before admission", timestamp: beforeAdmission },
      ...Array.from({ length: 20 }, (_, index) => ({
        id: `event-${index}`,
        type: "Encounter",
        title: `Recorded event ${index}`,
        timestamp: afterAdmission
      }))
    ],
    documents: [{
      id: "document-recent",
      type: "Admission note",
      title: "Admission note",
      status: "Draft",
      createdAt: afterAdmission,
      time: "Today"
    }],
    orders: [{
      id: "order-pending",
      category: "Laboratory",
      title: "Pending lab",
      status: "Pending",
      priority: "Routine",
      createdAt: afterAdmission,
      time: "Today"
    }],
    imaging: [{
      id: "imaging-recent",
      study: "Chest study",
      modality: "X-ray",
      bodySite: "Chest",
      status: "Final",
      performedAt: afterAdmission,
      report: "No acute finding"
    }],
    carePlan: {
      followUpDate: futureFollowUp,
      tasks: [
        { id: "task-complete", label: "Completed task", status: "Done", completedAt: afterAdmission },
        { id: "task-planned", label: "Planned task", status: "Open", dueDate: future.slice(0, 10) }
      ]
    },
    clinical: {
      stage: "Admission",
      admissionAt,
      department: "Medicine",
      location: "Ward 1",
      attending: "Test Provider"
    }
  });

  const timeline = api.buildPatientTimeline(sourcePatient);
  assert.ok(timeline.length > 14);
  assert.equal(timeline.filter((item) => item.title.startsWith("Recorded event ")).length, 20);
  assert.equal(timeline.some((item) => item.id === "event-before-admission"), false);
  assert.equal(timeline.find((item) => item.id === "timeline-admission-900").phase, "previous");
  assert.equal(timeline.find((item) => item.id === "timeline-current-status-900").phase, "current");
  assert.equal(timeline.find((item) => item.id === "timeline-order-pending").phase, "planned");
  assert.equal(timeline.find((item) => item.id === "timeline-appointment-future").targetId, "patient-appointment-appointment-future");
  assert.equal(timeline.find((item) => item.id === "timeline-document-recent").targetView, "documents");
  assert.equal(timeline.find((item) => item.id === "timeline-imaging-recent").targetId, "patient-imaging-imaging-recent");
  assert.equal(timeline.find((item) => item.id === "timeline-task-task-complete").phase, "previous");
  assert.equal(timeline.find((item) => item.id === "timeline-task-task-planned").phase, "planned");
  assert.equal(timeline.find((item) => item.title === "Undated marker").phase, "undated");
  assert.equal(timeline.find((item) => item.id === "timeline-follow-up-900").phase, "planned");
});

test("timeline does not invent an admission date and new admissions record their start", () => {
  const { api, context } = setup();
  const patient = api.normalizePatient({
    id: 901,
    name: "Admission Test",
    mrn: "T-901",
    age: 50,
    sex: "Male",
    diagnosis: "Test diagnosis",
    status: "Stable",
    priority: "Routine",
    provider: "Test Provider",
    allergies: [],
    medications: [],
    clinical: {
      stage: "Admission",
      department: "Medicine",
      location: "Ward 2",
      attending: "Test Provider"
    }
  });
  const admissionMarker = api.buildPatientTimeline(patient).find((item) => item.type === "Admission");
  assert.equal(admissionMarker.title, "Admission date not recorded");
  assert.equal(admissionMarker.timestamp, "");

  const enteringPatient = api.normalizePatient({
    ...patient,
    clinical: { ...patient.clinical, stage: "Intake", disposition: "", admissionAt: "" }
  });
  const department = vm.runInContext("departments[0].name", context);
  const result = api.updateWorkflowForPatient(enteringPatient, {
    stage: "Admission",
    disposition: "Admit to ward",
    department,
    location: "Ward 3",
    arrivalMode: "Direct admission"
  }, "clinician");
  assert.equal(result.allowed, true);
  assert.ok(enteringPatient.clinical.admissionAt);
  assert.equal(
    api.buildPatientTimeline(enteringPatient).find((item) => item.type === "Admission").title,
    "Admission started"
  );
});

test("appointment status changes are retained as patient timeline events", () => {
  const { api, context } = setup();
  const patient = api.normalizePatient({
    id: 902,
    name: "Appointment Test",
    mrn: "T-902",
    age: 38,
    sex: "Female",
    diagnosis: "Test diagnosis",
    status: "Stable",
    priority: "Routine",
    provider: "Test Provider",
    allergies: [],
    medications: [],
    appointments: [{
      id: "appointment-test",
      scheduledAt: new Date(Date.now() - 86400000).toISOString(),
      time: "Yesterday",
      title: "Test follow-up",
      location: "Clinic",
      status: "Scheduled"
    }]
  });
  context.appointmentPatient = patient;
  vm.runInContext("patients.push(appointmentPatient)", context);
  const result = api.updateAppointmentStatus(patient.id, "appointment-test", "Completed", "clinician");
  assert.equal(result.allowed, true);
  const event = patient.events[0];
  assert.equal(event.type, "Appointment");
  assert.equal(event.title, "Appointment completed");
  assert.ok(event.timestamp);
});
