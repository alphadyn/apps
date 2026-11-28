import { STORAGE_KEY, today, validDate, toKg, fromKg, validateData, dailyAverages,
  deriveKey, encryptData, unlockData, chartSvg } from "./model.js";
import { JournalServer } from "./server.js?v=3";
import { supabaseConfig } from "./supabase-config.js?v=3";

const $ = selector => document.querySelector(selector);
const server = new JournalServer(supabaseConfig);
let data = null, key = null, salt = null, saved = null;
let revision = null, localJournal = null;
let start = "", end = "", visibleRows = 30, busy = false, statusTimer;

function notify(message, error = false) {
  clearTimeout(statusTimer);
  $("#status").textContent = message;
  $("#status").classList.toggle("error", error);
  $("#status").hidden = false;
  if (!error) statusTimer = setTimeout(() => { $("#status").hidden = true; }, 5000);
}

async function action(operation) {
  if (busy) return;
  busy = true;
  const controls = [...document.querySelectorAll("button, input, select")].filter(control => !control.disabled);
  controls.forEach(control => { control.disabled = true; });
  try {
    await operation();
  } catch (error) {
    console.error("Weight Tracker:", error);
    if ($("#restore-dialog").open) {
      $("#restore-error").textContent = error.message;
      $("#restore-error").hidden = false;
    } else notify(error.message, true);
  } finally {
    controls.forEach(control => { control.disabled = false; });
    if (data) $("#export-chart").disabled = dailyAverages(data.entries, data.unit, start, end).length === 0;
    busy = false;
  }
}

async function persist(next, nextKey = key, nextSalt = salt) {
  const clean = validateData(next);
  const envelope = await encryptData(clean, nextKey, nextSalt);
  const nextRevision = await server.save(envelope, revision);
  saved = envelope;
  revision = nextRevision;
  data = clean;
  key = nextKey;
  salt = nextSalt;
}

function showGate() {
  data = null;
  key = null;
  salt = null;
  $("#dashboard").hidden = true;
  $("#gate").hidden = false;
  $("#lock").hidden = true;
  $("#chart").replaceChildren();
  $("#history-body").replaceChildren();
  for (const selector of ["#greeting", "#latest", "#latest-date", "#change", "#day-count", "#entry-count"]) {
    $(selector).textContent = "";
  }
  $("#entry-form").reset();
  $("#profile-form").reset();
  $("#account-gate").hidden = true;
  $("#logout").hidden = false;
  localJournal = null;
  try {
    localJournal = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error("Weight Tracker: Cannot access browser journal:", error);
    notify(`Cannot access the old browser journal: ${error.message}`, true);
  }
  const existing = Boolean(saved);
  $("#import-local").hidden = existing || !localJournal;
  $("#new-profile").hidden = existing;
  $("#name").required = !existing;
  $("#password").minLength = existing ? 1 : 8;
  $("#password").autocomplete = existing ? "current-password" : "new-password";
  $("#password").placeholder = existing ? "Your journal password" : "At least 8 characters";
  $("#gate-title").innerHTML = existing ? "Welcome back.<br>Your story continues." : "Small steps.<br>A clearer picture.";
  $("#gate-description").textContent = existing
    ? "Enter your journal password to unlock the encrypted journal saved to your account."
    : "Create an encrypted journal for your account, or restore an existing one.";
  $("#open-journal").textContent = existing ? "Unlock my journal" : "Create my journal";
}

function showAccountGate() {
  data = null;
  key = null;
  salt = null;
  saved = null;
  revision = null;
  localJournal = null;
  $("#dashboard").hidden = true;
  $("#gate").hidden = true;
  $("#account-gate").hidden = false;
  $("#lock").hidden = true;
  $("#logout").hidden = true;
  $("#chart").replaceChildren();
  $("#history-body").replaceChildren();
  for (const selector of ["#greeting", "#latest", "#latest-date", "#change", "#day-count", "#entry-count"]) {
    $(selector).textContent = "";
  }
  $("#entry-form").reset();
  $("#profile-form").reset();
  $("#account-form").reset();
}

async function loadJournal() {
  const row = await server.load();
  saved = row?.envelope || null;
  revision = row?.revision ?? null;
}

function showDashboard() {
  $("#gate").hidden = true;
  $("#dashboard").hidden = false;
  $("#lock").hidden = false;
  $("#password").value = "";
  $("#display-unit").value = data.unit;
  $("#entry-form").reset();
  $("#entry-date").value = today();
  $("#entry-date").max = today();
  start = "";
  end = "";
  $("#start-date").value = "";
  $("#end-date").value = "";
  selectPreset("all");
  render();
}

function formatWeight(value) {
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 2 })} ${data.unit}`;
}

function filteredEntries() {
  return data.entries.filter(entry => (!start || entry.date >= start) && (!end || entry.date <= end))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function render() {
  const days = dailyAverages(data.entries, data.unit, start, end);
  const entries = filteredEntries();
  $("#greeting").textContent = `Your journal, ${data.name}.`;
  $("#weight-unit").textContent = data.unit;
  $("#latest").textContent = days.length ? formatWeight(days.at(-1).weight) : "—";
  $("#latest-date").textContent = days.length ? days.at(-1).date : "No check-ins in this period";
  const change = days.length > 1 ? days.at(-1).weight - days[0].weight : null;
  $("#change").textContent = change === null ? "—" : `${change > 0 ? "+" : ""}${formatWeight(change)}`;
  $("#day-count").textContent = days.length.toLocaleString();
  $("#entry-count").textContent = `${entries.length.toLocaleString()} measurement${entries.length === 1 ? "" : "s"} in this period`;
  $("#history-count").textContent = `${entries.length.toLocaleString()} measurements`;
  $("#chart").innerHTML = chartSvg(days, data.unit, data.name);
  const means = new Map(days.map(day => [day.date, day]));
  const fragment = document.createDocumentFragment();
  for (const entry of entries.slice(0, visibleRows)) {
    const row = document.createElement("tr");
    const mean = means.get(entry.date);
    for (const text of [entry.date, formatWeight(fromKg(entry.kg, data.unit)), `${formatWeight(mean.weight)} · ${mean.count} check-in${mean.count === 1 ? "" : "s"}`]) {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.append(cell);
    }
    const cell = document.createElement("td");
    const button = document.createElement("button");
    button.textContent = "Remove";
    button.className = "remove";
    button.dataset.id = entry.id;
    button.setAttribute("aria-label", `Remove ${formatWeight(fromKg(entry.kg, data.unit))} entry on ${entry.date}`);
    cell.append(button);
    row.append(cell);
    fragment.append(row);
  }
  $("#history-body").replaceChildren(fragment);
  $("#history-empty").hidden = entries.length > 0;
  $("#show-more").hidden = entries.length <= visibleRows;
  $("#export-chart").disabled = days.length === 0;
}

function selectPreset(value) {
  document.querySelectorAll("[data-range]").forEach(button => {
    const selected = button.dataset.range === value;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function setRange(nextStart, nextEnd, preset = "") {
  dailyAverages(data.entries, data.unit, nextStart, nextEnd);
  start = nextStart;
  end = nextEnd;
  visibleRows = 30;
  $("#start-date").value = start;
  $("#end-date").value = end;
  selectPreset(preset);
  render();
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

async function pngBlob(svg) {
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 2000;
    canvas.height = 760;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser cannot create a PNG. Try SVG export instead.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("Unable to create the PNG. Try SVG export instead."));
    }, "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function enterAccount() {
  $("#logout").hidden = false;
  await loadJournal();
  $("#account-password").value = "";
  showGate();
}

$("#account-form").addEventListener("submit", event => {
  event.preventDefault();
  action(async () => {
    await server.signIn($("#account-username").value, $("#account-password").value);
    await enterAccount();
    notify("Signed in. Unlock your journal to continue.");
  });
});

$("#sign-up").addEventListener("click", () => {
  if (!$("#account-form").reportValidity()) return;
  action(async () => {
    await server.signUp($("#account-username").value, $("#account-password").value);
    $("#account-password").value = "";
    await enterAccount();
    notify("Account created. Create or restore your journal.");
  });
});

$("#profile-form").addEventListener("submit", event => {
  event.preventDefault();
  action(async () => {
    if (!crypto.subtle) throw new Error("Encryption requires HTTPS or localhost. Serve this app using a local web server.");
    await loadJournal();
    if (saved) {
      const unlocked = await unlockData(saved, $("#password").value);
      ({ data, key, salt } = unlocked);
    } else {
      const name = $("#name").value.trim();
      if (!name) throw new Error("Please enter your name.");
      const nextSalt = crypto.getRandomValues(new Uint8Array(16));
      const nextKey = await deriveKey($("#password").value, nextSalt);
      await persist({ version: 1, name, unit: $("#initial-unit").value, entries: [] }, nextKey, nextSalt);
    }
    showDashboard();
    notify("Journal unlocked. Changes are encrypted and saved to your account.");
  });
});

$("#import-local").addEventListener("click", () => action(async () => {
  if (!localJournal) throw new Error("No browser journal is available to import.");
  if (!$("#password").value) throw new Error("Enter your existing journal password first.");
  await loadJournal();
  if (saved) {
    showGate();
    throw new Error("This account already has a journal. Unlock it or restore a backup instead.");
  }
  const unlocked = await unlockData(JSON.parse(localJournal), $("#password").value);
  await persist(unlocked.data, unlocked.key, unlocked.salt);
  showDashboard();
  notify("Browser journal imported and saved to your account. The original remains in this browser.");
}));

$("#entry-form").addEventListener("submit", event => {
  event.preventDefault();
  action(async () => {
    const date = $("#entry-date").value;
    if (!validDate(date) || date > today()) throw new Error("Choose a valid date on or before today.");
    const entry = { id: crypto.randomUUID(), date, kg: toKg(Number($("#weight").value), data.unit) };
    await persist({ ...data, entries: [...data.entries, entry] });
    $("#weight").value = "";
    visibleRows = 30;
    render();
    notify((start && date < start) || (end && date > end)
      ? "Check-in saved. It is outside the selected chart dates." : "Check-in saved and daily average updated.");
  });
});

$("#display-unit").addEventListener("change", () => {
  const unit = $("#display-unit").value;
  action(async () => {
    try {
      await persist({ ...data, unit });
      $("#weight").value = "";
      render();
      notify("Unit preference saved. Existing measurements have been converted.");
    } finally {
      $("#display-unit").value = data.unit;
    }
  });
});

$("#filter-form").addEventListener("submit", event => {
  event.preventDefault();
  try { setRange($("#start-date").value, $("#end-date").value); }
  catch (error) { notify(error.message, true); }
});

document.querySelectorAll("[data-range]").forEach(button => button.addEventListener("click", () => {
  const range = button.dataset.range;
  if (range === "all") setRange("", "", range);
  else {
    const date = new Date(`${today()}T12:00:00`);
    date.setDate(date.getDate() - Number(range) + 1);
    const first = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    setRange(first, today(), range);
  }
}));

$("#history-body").addEventListener("click", event => {
  const button = event.target.closest("button[data-id]");
  if (!button || busy) return;
  if (!confirm("Remove this measurement? The daily average will be recalculated.")) return;
  action(async () => {
    await persist({ ...data, entries: data.entries.filter(entry => entry.id !== button.dataset.id) });
    render();
    notify("Measurement removed.");
  });
});

$("#show-more").addEventListener("click", () => { visibleRows += 30; render(); });
$("#lock").addEventListener("click", () => { showGate(); notify("Journal locked."); $("#password").focus(); });
$("#logout").addEventListener("click", () => action(async () => {
  try {
    await server.signOut();
  } finally {
    showAccountGate();
  }
  notify("Logged out.");
  $("#account-username").focus();
}));

$("#backup").addEventListener("click", () => action(async () => {
  const envelope = await encryptData(data, key, salt);
  download(new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" }), `weight-tracker-backup-${today()}.json`);
  notify("Encrypted backup downloaded. Keep it with your password.");
}));

$("#export-chart").addEventListener("click", () => action(async () => {
  const days = dailyAverages(data.entries, data.unit, start, end);
  if (!days.length) throw new Error("Add measurements in this date range before exporting.");
  const format = $("#export-format").value;
  let blob;
  if (format === "json") {
    blob = new Blob([JSON.stringify({ format: "weight-tracker-chart", version: 1, name: data.name,
      unit: data.unit, aggregation: "daily-mean", startDate: start || null, endDate: end || null, days }, null, 2)], { type: "application/json" });
  } else if (format === "csv") {
    blob = new Blob([`date,weight_${data.unit},entry_count\n${days.map(day => `${day.date},${day.weight},${day.count}`).join("\n")}\n`], { type: "text/csv" });
  } else {
    const svg = chartSvg(days, data.unit, data.name);
    blob = format === "png" ? await pngBlob(svg) : new Blob([svg], { type: "image/svg+xml" });
  }
  download(blob, `weight-tracker-chart-${today()}.${format}`);
  notify("Chart exported. Chart exports are unencrypted; share them carefully.");
}));

document.querySelectorAll(".restore-trigger").forEach(button => button.addEventListener("click", () => {
  $("#restore-form").reset();
  $("#restore-error").hidden = true;
  $("#restore-dialog").showModal();
}));
$("#cancel-restore").addEventListener("click", () => $("#restore-dialog").close());
$("#restore-dialog").addEventListener("cancel", event => { if (busy) event.preventDefault(); });
$("#restore-dialog").addEventListener("close", () => { $("#restore-password").value = ""; });
$("#restore-form").addEventListener("submit", event => {
  event.preventDefault();
  action(async () => {
    $("#restore-error").hidden = true;
    if (!crypto.subtle) throw new Error("Encryption requires HTTPS or localhost.");
    const file = $("#restore-file").files[0];
    if (!file || file.size > 20000000) throw new Error("Choose an encrypted JSON backup smaller than 20 MB.");
    const unlocked = await unlockData(JSON.parse(await file.text()), $("#restore-password").value);
    await persist(unlocked.data, unlocked.key, unlocked.salt);
    $("#restore-dialog").close();
    showDashboard();
    notify("Backup restored and saved to your account.");
  });
});

showAccountGate();
