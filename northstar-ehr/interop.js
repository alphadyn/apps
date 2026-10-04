// Import/export adapters: Northstar JSON, HL7 FHIR R4/R5 (Epic on FHIR compatible) and CSV.
(function (root) {
  const FORMATS = {
    json: { label: "JSON (Northstar)", extension: "json", mime: "application/json" },
    fhir: { label: "FHIR R4 Bundle (Epic)", extension: "fhir.json", mime: "application/fhir+json" },
    fhir5: { label: "FHIR R5 Bundle", extension: "fhir-r5.json", mime: "application/fhir+json" },
    csv: { label: "CSV (roster)", extension: "csv", mime: "text/csv" }
  };

  const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
  const FHIR_FORMATS = { fhir: "R4", fhir5: "R5" };
  const MRN_SYSTEM = "urn:northstar-ehr:mrn";
  const LOINC = {
    bp: { code: "85354-9", display: "Blood pressure panel" },
    hr: { code: "8867-4", display: "Heart rate" },
    temp: { code: "8310-5", display: "Body temperature" },
    spO2: { code: "2708-6", display: "Oxygen saturation" }
  };

  const slug = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const toArray = (value) => (Array.isArray(value) ? value : []);

  function splitName(name) {
    const parts = String(name || "").trim().split(/\s+/);
    const family = parts.length > 1 ? parts.pop() : "";
    return { family, given: parts };
  }

  function birthDateFromAge(age) {
    const years = Number(age);
    if (!Number.isFinite(years)) return undefined;
    return `${new Date().getFullYear() - years}-01-01`;
  }

  function ageFromBirthDate(birthDate) {
    const year = Number(String(birthDate || "").slice(0, 4));
    return year ? Math.max(0, new Date().getFullYear() - year) : 0;
  }

  function parseNumber(value) {
    const match = String(value ?? "").match(/-?\d+(\.\d+)?/);
    return match ? Number(match[0]) : undefined;
  }

  // ---------- FHIR export ----------
  function patientToFhirEntries(patient, version = "R4") {
    const pid = `pt-${slug(patient.mrn || patient.id)}`;
    const ref = { reference: `Patient/${pid}` };
    const entries = [];
    const add = (resource) => entries.push({ fullUrl: `urn:uuid:${resource.resourceType}-${resource.id}`, resource });
    const { family, given } = splitName(patient.name);

    add({
      resourceType: "Patient",
      id: pid,
      identifier: [{
        use: "usual",
        type: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0203", code: "MR" }] },
        system: MRN_SYSTEM,
        value: patient.mrn
      }],
      name: [{ use: "official", family, given, text: patient.name }],
      gender: String(patient.sex || "").toLowerCase() === "female" ? "female" : String(patient.sex || "").toLowerCase() === "male" ? "male" : "unknown",
      birthDate: birthDateFromAge(patient.age)
    });

    if (patient.diagnosis) {
      add({
        resourceType: "Condition",
        id: `${pid}-dx`,
        clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
        code: { text: patient.diagnosis },
        subject: ref
      });
    }

    toArray(patient.allergies).forEach((allergy, index) => add({
      resourceType: "AllergyIntolerance",
      id: `${pid}-allergy-${index}`,
      code: { text: allergy },
      patient: ref
    }));

    toArray(patient.medications).forEach((medication, index) => add({
      resourceType: "MedicationRequest",
      id: `${pid}-med-${index}`,
      status: "active",
      intent: "order",
      ...(version === "R5"
        ? { medication: { concept: { text: medication } } }
        : { medicationCodeableConcept: { text: medication } }),
      subject: ref
    }));

    const vitals = patient.vitals || {};
    const observation = (key, extra) => add({
      resourceType: "Observation",
      id: `${pid}-vital-${key}`,
      status: "final",
      category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs" }] }],
      code: { coding: [{ system: "http://loinc.org", ...LOINC[key] }], text: LOINC[key].display },
      subject: ref,
      ...extra
    });
    if (vitals.bp) observation("bp", { valueString: String(vitals.bp) });
    if (vitals.hr !== undefined && vitals.hr !== "") observation("hr", { valueQuantity: { value: parseNumber(vitals.hr), unit: "beats/minute" } });
    if (vitals.temp) observation("temp", { valueQuantity: { value: parseNumber(vitals.temp), unit: /C/.test(vitals.temp) ? "degC" : "degF" } });
    if (vitals.spO2) observation("spO2", { valueQuantity: { value: parseNumber(vitals.spO2), unit: "%" } });

    toArray(patient.labs).forEach((lab, index) => add({
      resourceType: "Observation",
      id: `${pid}-lab-${index}`,
      status: "final",
      category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
      code: { text: lab },
      subject: ref
    }));

    toArray(patient.imaging).forEach((record, index) => add({
      resourceType: "DiagnosticReport",
      id: `${pid}-img-${index}`,
      status: /prelim/i.test(record.status) ? "preliminary" : "final",
      category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0074", code: "RAD" }] }],
      code: { text: record.study },
      subject: ref,
      conclusion: record.report,
      extension: [{ url: "urn:northstar-ehr:imaging", valueString: JSON.stringify(record) }]
    }));

    toArray(patient.appointments).forEach((appointment, index) => add({
      resourceType: "Appointment",
      id: `${pid}-appt-${index}`,
      status: { Scheduled: "booked", Completed: "fulfilled", Cancelled: "cancelled" }[appointment.status] || "booked",
      description: appointment.title,
      comment: [appointment.time, appointment.location].filter(Boolean).join(" · "),
      participant: [{ actor: ref, status: "accepted" }]
    }));

    toArray(patient.notes).forEach((note, index) => add({
      resourceType: "DocumentReference",
      id: `${pid}-doc-${index}`,
      status: "current",
      type: { text: note.type || "Clinical note" },
      description: note.title,
      subject: ref,
      content: [{ attachment: { contentType: "text/plain", data: toBase64(noteText(note)) } }]
    }));

    return entries;
  }

  function noteText(note) {
    if (note.summary) return note.summary;
    return Object.values(note.sections || {}).filter(Boolean).join("\n");
  }

  function toBase64(text) {
    if (typeof Buffer !== "undefined") return Buffer.from(text, "utf8").toString("base64");
    return btoa(unescape(encodeURIComponent(text)));
  }

  function fromBase64(data) {
    if (typeof Buffer !== "undefined") return Buffer.from(data, "base64").toString("utf8");
    return decodeURIComponent(escape(atob(data)));
  }

  const FHIR_VERSION_TAG = "urn:northstar-ehr:fhir-version";

  function buildFhirBundle(patients, version = "R4") {
    return {
      resourceType: "Bundle",
      ...(version === "R5" ? { meta: { tag: [{ system: FHIR_VERSION_TAG, code: "5.0.0" }] } } : {}),
      type: "collection",
      timestamp: new Date().toISOString(),
      entry: patients.flatMap((patient) => patientToFhirEntries(patient, version))
    };
  }

  // ---------- CSV ----------
  const CSV_COLUMNS = ["name", "mrn", "age", "sex", "diagnosis", "provider", "priority", "status", "allergies", "medications", "followUpDate"];

  function csvCell(value) {
    const text = String(value ?? "");
    const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
    return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  }

  function buildCsv(patients) {
    const rows = patients.map((patient) => [
      patient.name, patient.mrn, patient.age, patient.sex, patient.diagnosis, patient.provider,
      patient.priority, patient.status, toArray(patient.allergies).join("; "),
      toArray(patient.medications).join("; "), patient.carePlan?.followUpDate || ""
    ]);
    return [CSV_COLUMNS, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (quoted) {
        if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
        else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"') quoted = true;
      else if (char === ",") { row.push(cell); cell = ""; }
      else if (char === "\n" || char === "\r") {
        if (char === "\r" && text[i + 1] === "\n") i += 1;
        row.push(cell); cell = "";
        if (row.some((value) => value !== "")) rows.push(row);
        row = [];
      } else cell += char;
    }
    row.push(cell);
    if (row.some((value) => value !== "")) rows.push(row);
    return rows;
  }

  function parseCsvPatients(text) {
    const [header, ...rows] = parseCsv(text.replace(/^\uFEFF/, ""));
    if (!header) return [];
    const keys = header.map((key) => key.trim());
    return rows.map((row) => {
      const record = Object.fromEntries(keys.map((key, index) => [key, (row[index] || "").trim()]));
      const list = (value) => value.split(";").map((item) => item.trim()).filter(Boolean);
      return {
        name: record.name,
        mrn: record.mrn,
        age: Number(record.age) || 0,
        sex: record.sex || "Unknown",
        diagnosis: record.diagnosis || "",
        provider: record.provider || "",
        priority: record.priority || "Routine",
        status: record.status || "Stable",
        allergies: list(record.allergies || ""),
        medications: list(record.medications || ""),
        carePlan: { followUpDate: record.followUpDate || "", tasks: [] }
      };
    });
  }

  // ---------- FHIR import ----------
  function textOf(concept) {
    return concept?.text || concept?.coding?.[0]?.display || concept?.coding?.[0]?.code || "";
  }

  function refId(reference) {
    return String(reference?.reference || "").split("/").pop();
  }

  function patientsFromFhir(bundle) {
    const resources = bundle?.resourceType === "Bundle"
      ? toArray(bundle.entry).map((entry) => entry?.resource).filter((resource) => resource && typeof resource === "object")
      : [bundle];
    const byId = new Map();

    resources.filter((resource) => resource.resourceType === "Patient").forEach((resource) => {
      const name = resource.name?.[0] || {};
      const identifier = toArray(resource.identifier).find((item) => item.type?.coding?.some((c) => c.code === "MR")) || resource.identifier?.[0];
      byId.set(resource.id, {
        name: name.text || [...toArray(name.given), name.family].filter(Boolean).join(" ") || "Unnamed patient",
        mrn: identifier?.value || `MRN-${resource.id}`,
        age: ageFromBirthDate(resource.birthDate),
        sex: resource.gender ? resource.gender[0].toUpperCase() + resource.gender.slice(1) : "Unknown",
        diagnosis: "", allergies: [], medications: [], labs: [], imaging: [], appointments: [], notes: [], vitals: {},
        carePlan: { followUpDate: "", tasks: [] }
      });
    });

    const diagnoses = new Map();
    resources.forEach((resource) => {
      const type = resource.resourceType;
      const target = byId.get(refId(resource.subject || resource.patient || resource.participant?.[0]?.actor));
      if (!target) return;
      if (type === "Condition") {
        (diagnoses.get(target) || diagnoses.set(target, []).get(target)).push(textOf(resource.code));
      } else if (type === "AllergyIntolerance") {
        target.allergies.push(textOf(resource.code));
      } else if (type === "MedicationRequest" || type === "MedicationStatement") {
        const medication = resource.medication;
        target.medications.push(
          textOf(resource.medicationCodeableConcept) || textOf(medication?.concept) ||
          refId(resource.medicationReference || medication?.reference)
        );
      } else if (type === "Observation") {
        const code = resource.code?.coding?.find((c) => c.system === "http://loinc.org")?.code;
        const key = Object.keys(LOINC).find((k) => LOINC[k].code === code);
        const quantity = resource.valueQuantity;
        if (key === "bp") target.vitals.bp = resource.valueString || "";
        else if (key === "hr") target.vitals.hr = quantity?.value;
        else if (key === "temp" && quantity?.value !== undefined) target.vitals.temp = `${quantity.value}°${quantity?.unit === "degC" || quantity?.unit === "Cel" ? "C" : "F"}`;
        else if (key === "spO2" && quantity?.value !== undefined) target.vitals.spO2 = `${quantity.value}%`;
        else if (textOf(resource.code)) {
          const value = quantity ? ` ${quantity.value}${quantity.unit ? ` ${quantity.unit}` : ""}` : resource.valueString ? ` ${resource.valueString}` : "";
          target.labs.push(`${textOf(resource.code)}${value}`);
        }
      } else if (type === "DiagnosticReport") {
        const saved = toArray(resource.extension).find((ext) => ext.url === "urn:northstar-ehr:imaging");
        let record = null;
        try { record = saved ? JSON.parse(saved.valueString) : null; } catch (error) { record = null; }
        target.imaging.push(record || {
          study: textOf(resource.code) || "Imaging study",
          status: resource.status === "preliminary" ? "Preliminary" : "Final",
          report: resource.conclusion || ""
        });
      } else if (type === "Appointment") {
        const [time = "", location = ""] = String(resource.comment || "").split(" · ");
        target.appointments.push({
          title: resource.description || "Appointment",
          time,
          location,
          status: { fulfilled: "Completed", cancelled: "Cancelled" }[resource.status] || "Scheduled"
        });
      } else if (type === "DocumentReference") {
        const data = resource.content?.[0]?.attachment?.data;
        target.notes.push({
          title: resource.description || "Imported document",
          type: textOf(resource.type) || "Clinical note",
          summary: data ? fromBase64(data) : "",
          time: "Imported"
        });
      }
    });
    diagnoses.forEach((list, target) => { target.diagnosis = list.filter(Boolean).join(", "); });
    return [...byId.values()];
  }

  // ---------- Dispatch ----------
  function buildExport(format, patients, buildJsonPayload) {
    const list = toArray(patients);
    if (FHIR_FORMATS[format]) return JSON.stringify(buildFhirBundle(list, FHIR_FORMATS[format]), null, 2);
    if (format === "csv") return buildCsv(list);
    if (format === "json") {
      const payloads = list.map(buildJsonPayload);
      return JSON.stringify(payloads.length === 1 ? payloads[0] : { patients: payloads.map((p) => p.patient), exportedAt: payloads[0]?.exportedAt }, null, 2);
    }
    throw new Error(`Unsupported export format: ${format}`);
  }

  function isFhirR5(data) {
    const resources = data.resourceType === "Bundle" ? toArray(data.entry).map((entry) => entry?.resource) : [data];
    const tagged = toArray(data.meta?.tag).some((tag) => tag.system === FHIR_VERSION_TAG && /^5/.test(tag.code));
    const hasR5Medication = resources.some((resource) => typeof resource?.medication === "object");
    return tagged || /^5/.test(data.fhirVersion || "") || hasR5Medication;
  }

  function detectFormat(filename, text) {
    const trimmed = String(text || "").trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const data = JSON.parse(trimmed);
        return data?.resourceType ? (isFhirR5(data) ? "fhir5" : "fhir") : "json";
      } catch (error) {
        throw new Error("File is not valid JSON.");
      }
    }
    if (/\.csv$/i.test(filename || "") || trimmed.includes(",")) return "csv";
    throw new Error("Unrecognized file format. Use JSON, FHIR JSON, or CSV.");
  }

  // Returns patient-shaped objects (not yet normalized) from any supported file.
  function parseImport(filename, text) {
    if (!String(text || "").trim()) throw new Error("The file is empty.");
    if (String(text).length > MAX_IMPORT_BYTES) throw new Error("The file is too large (limit 5 MB).");
    const format = detectFormat(filename, text);
    let patients;
    if (format === "csv") patients = parseCsvPatients(text);
    else {
      const data = JSON.parse(text);
      if (FHIR_FORMATS[format]) patients = patientsFromFhir(data);
      else if (Array.isArray(data)) patients = data;
      else if (Array.isArray(data.patients)) patients = data.patients;
      else if (data.patient) patients = [data.patient];
      else throw new Error("JSON does not contain a patient or patients property.");
    }
    patients = patients.filter((patient) => patient && typeof patient === "object" && patient.name && patient.mrn);
    if (!patients.length) throw new Error("No patients with a name and MRN were found in the file.");
    return { format, patients };
  }

  const api = { FORMATS, MAX_IMPORT_BYTES, buildFhirBundle, buildCsv, buildExport, parseCsv, parseImport, patientsFromFhir };
  root.NorthstarInterop = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
