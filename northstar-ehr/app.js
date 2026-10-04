const storageKey = "northstar-ehr-state-v3";

const rolePermissions = {
  clinician: {
    label: "Clinician",
    actions: ["encounter:create", "workflow:update", "order:create", "document:create", "appointment:complete", "task:complete", "patient:select", "report:export"]
  },
  nurse: {
    label: "Nurse",
    actions: ["workflow:update", "order:create", "document:create", "appointment:complete", "task:complete", "patient:select"]
  },
  admin: {
    label: "Admin",
    actions: ["appointment:cancel", "appointment:complete", "patient:select", "report:export", "audit:view", "billing:view"]
  }
};

const initialPatients = [
  {
    id: 1,
    name: "Maya Thompson",
    mrn: "MRN-10482",
    age: 41,
    sex: "Female",
    status: "Stable",
    priority: "Routine",
    diagnosis: "Type 2 diabetes, hypertension",
    lastVisit: "2 days ago",
    provider: "Dr. Elena Ruiz",
    room: "Suite 3B",
    allergies: ["Penicillin", "Latex"],
    medications: ["Metformin 500 mg", "Lisinopril 10 mg", "Atorvastatin 20 mg"],
    vitals: { bp: "118/76", hr: 72, temp: "98.4°F", spO2: "98%" },
    labs: ["A1C 6.8", "LDL 96", "Creatinine 0.9"],
    notes: [
      {
        title: "Medication review",
        summary: "Patient reports strong adherence and no new symptoms.",
        type: "Primary care",
        time: "Today • 09:15"
      }
    ],
    appointments: [
      { id: "a-101", time: "08:30", title: "Annual wellness review", location: "Exam Room 2", status: "Scheduled" },
      { id: "a-102", time: "14:00", title: "Lab follow-up", location: "Lab Desk", status: "Scheduled" }
    ],
    billing: { balance: 1260, insurance: "Blue Cross", claimStatus: "Submitted", lastPayment: "2026-08-01" },
    chartCompleted: true,
    medicationReviewed: true,
    carePlan: {
      followUpDate: "2026-08-12",
      tasks: [
        { label: "Review A1C trend", status: "Open" },
        { label: "Confirm home blood pressure log", status: "Open" }
      ]
    }
  },
  {
    id: 2,
    name: "Jonathan Lee",
    mrn: "MRN-20811",
    age: 58,
    sex: "Male",
    status: "Monitoring",
    priority: "Urgent",
    diagnosis: "Post-op recovery, mild chest discomfort",
    lastVisit: "Today",
    provider: "Dr. Amir Hassan",
    room: "Recovery 1",
    allergies: ["Shellfish"],
    medications: ["Warfarin 2 mg", "Acetaminophen 500 mg"],
    vitals: { bp: "132/88", hr: 84, temp: "99.0°F", spO2: "97%" },
    labs: ["INR 2.1", "Hemoglobin 13.2", "WBC 8.4"],
    notes: [
      {
        title: "Post-op recovery",
        summary: "Patient remains stable after procedure. Encourage mobility and hydration.",
        type: "Post-op follow-up",
        time: "Today • 11:40"
      }
    ],
    appointments: [
      { id: "a-201", time: "10:00", title: "Cardiac recheck", location: "Telemetry Unit", status: "In Progress" },
      { id: "a-202", time: "16:30", title: "Discharge planning", location: "Nursing Station", status: "Scheduled" }
    ],
    billing: { balance: 2140, insurance: "Aetna", claimStatus: "Pending review", lastPayment: "2026-07-28" },
    chartCompleted: false,
    medicationReviewed: false,
    carePlan: {
      followUpDate: "2026-08-05",
      tasks: [
        { label: "Confirm discharge readiness", status: "Open" },
        { label: "Repeat pain assessment", status: "Open" }
      ]
    }
  },
  {
    id: 3,
    name: "Sofia Alvarez",
    mrn: "MRN-31544",
    age: 33,
    sex: "Female",
    status: "Stable",
    priority: "Routine",
    diagnosis: "Pregnancy follow-up",
    lastVisit: "Yesterday",
    provider: "Dr. Priya Singh",
    room: "Suite 4A",
    allergies: ["None listed"],
    medications: ["Prenatal vitamin", "Folic acid 400 mcg"],
    vitals: { bp: "112/70", hr: 68, temp: "98.7°F", spO2: "99%" },
    labs: ["Rh positive", "Hemoglobin 11.9", "Glucose 91"],
    notes: [
      {
        title: "Prenatal visit",
        summary: "No concerning symptoms. Continue routine monitoring.",
        type: "Primary care",
        time: "Yesterday • 15:20"
      }
    ],
    appointments: [
      { id: "a-301", time: "09:00", title: "Ultrasound review", location: "Imaging", status: "Scheduled" },
      { id: "a-302", time: "13:20", title: "Supportive counseling", location: "Room 4A", status: "Scheduled" }
    ],
    billing: { balance: 835, insurance: "United Healthcare", claimStatus: "Paid", lastPayment: "2026-08-02" },
    chartCompleted: true,
    medicationReviewed: true,
    carePlan: {
      followUpDate: "2026-08-19",
      tasks: [
        { label: "Upload ultrasound report", status: "Open" }
      ]
    }
  }
];

const demoPatientScenarios = [
  ["Avery Bennett", 27, "Female", "Migraine without aura", "Recurrent unilateral headaches; family history of migraine; no prior surgery.", "Ibuprofen", "None listed", "Brain MRI without contrast", "MRI", "Brain", "Recurrent headaches", "No acute intracranial abnormality in this fictional sample report."],
  ["Noah Patel", 63, "Male", "Knee osteoarthritis", "Chronic knee pain; prior meniscal repair; walks daily.", "Sulfa drugs", "Acetaminophen as needed", "Right knee radiographs, 3 views", "X-ray", "Right knee", "Chronic knee pain", "Mild medial compartment joint-space narrowing; no acute fracture."],
  ["Grace Kim", 52, "Female", "Asthma", "Intermittent wheeze; childhood asthma; seasonal allergies.", "None listed", "Albuterol inhaler", "Chest radiograph, 2 views", "X-ray", "Chest", "Cough and wheeze", "Lungs are clear; no focal air-space opacity or pleural effusion."],
  ["Ethan Brooks", 46, "Male", "Nephrolithiasis", "Prior kidney stone; episodic flank discomfort; no prior procedures.", "Codeine", "None listed", "Renal ultrasound", "Ultrasound", "Kidneys and bladder", "Flank discomfort", "No hydronephrosis identified; small simple-appearing renal cyst noted."],
  ["Isabella Chen", 35, "Female", "Cholelithiasis", "Intermittent post-meal abdominal discomfort; prior appendectomy.", "Latex", "None listed", "Right upper quadrant ultrasound", "Ultrasound", "Right upper quadrant", "Abdominal discomfort", "Gallstones are present; no gallbladder wall thickening in this sample report."],
  ["Lucas Rivera", 71, "Male", "Chronic obstructive pulmonary disease", "Former smoker; COPD; recent increase in exertional dyspnea.", "Penicillin", "Tiotropium, albuterol", "Chest CT without contrast", "CT", "Chest", "Dyspnea follow-up", "Emphysematous change is described; no focal pulmonary mass identified."],
  ["Mia Johnson", 24, "Female", "Ankle sprain", "Twisted left ankle during recreation; no prior fractures.", "None listed", "None listed", "Left ankle radiographs, 3 views", "X-ray", "Left ankle", "Left ankle pain after twisting injury", "No acute fracture or dislocation identified."],
  ["Benjamin Clark", 59, "Male", "Lumbar radiculopathy", "Recurrent low-back pain with leg symptoms; remote lifting injury.", "Morphine", "Naproxen as needed", "Lumbar spine MRI without contrast", "MRI", "Lumbar spine", "Persistent low-back symptoms", "Mild multilevel degenerative changes; no acute osseous finding."],
  ["Amara Okafor", 44, "Female", "Thyroid nodule", "Incidental thyroid nodule on prior imaging; no neck surgery.", "Iodinated contrast", "Levothyroxine", "Thyroid ultrasound", "Ultrasound", "Thyroid", "Nodule follow-up", "Stable-appearing right thyroid nodule; comparison with prior study recommended."],
  ["Oliver Davis", 68, "Male", "Heart failure with preserved ejection fraction", "Hypertension; prior admission for fluid overload; followed by cardiology.", "Aspirin", "Furosemide, losartan", "Chest radiograph, 2 views", "X-ray", "Chest", "Follow-up of exertional breathlessness", "Mild cardiomegaly; no focal air-space opacity in this sample report."],
  ["Chloe Martin", 31, "Female", "Endometriosis", "Pelvic pain; prior diagnostic laparoscopy; under gynecology care.", "None listed", "Combined oral contraceptive", "Pelvic MRI", "MRI", "Pelvis", "Pelvic pain evaluation", "Small endometrioma-like lesion described; correlate with specialist assessment."],
  ["Samuel Wilson", 56, "Male", "Diverticulosis", "Intermittent abdominal discomfort; prior colonoscopy; no abdominal surgery.", "Metronidazole", "None listed", "CT abdomen and pelvis with contrast", "CT", "Abdomen and pelvis", "Abdominal discomfort", "Colonic diverticulosis without acute inflammatory change."],
  ["Layla Hassan", 39, "Female", "Rotator cuff tendinopathy", "Shoulder pain after repetitive work; prior physical therapy.", "None listed", "Topical diclofenac", "Right shoulder MRI without contrast", "MRI", "Right shoulder", "Persistent shoulder pain", "Mild supraspinatus tendinopathy; no full-thickness tear described."],
  ["Henry Moore", 74, "Male", "Osteoporosis", "Prior wrist fracture; treated for low bone density; former smoker.", "None listed", "Calcium, vitamin D", "DEXA bone density study", "DEXA", "Lumbar spine and hips", "Bone density monitoring", "Bone mineral density remains below the expected range for age in this sample."],
  ["Zoe Thompson", 29, "Female", "Sinusitis", "Recurrent sinus symptoms; seasonal rhinitis; no facial surgery.", "Amoxicillin", "Cetirizine", "CT paranasal sinuses without contrast", "CT", "Paranasal sinuses", "Recurrent sinus symptoms", "Mild maxillary mucosal thickening; no fluid level identified."],
  ["Daniel Garcia", 61, "Male", "Carotid artery stenosis", "Hyperlipidemia; former smoker; prior vascular clinic follow-up.", "Shellfish", "Atorvastatin", "Carotid duplex ultrasound", "Ultrasound", "Carotid arteries", "Surveillance study", "Mild plaque bilaterally without hemodynamically significant stenosis described."],
  ["Priya Nair", 48, "Female", "Breast cyst", "Prior benign breast cyst; routine imaging follow-up; no breast surgery.", "None listed", "None listed", "Diagnostic mammogram and breast ultrasound", "Mammogram / Ultrasound", "Breasts", "Follow-up of known breast cyst", "Stable benign-appearing cystic finding; routine follow-up suggested in this mock report."],
  ["Caleb Turner", 19, "Male", "Concussion, subsequent visit", "Sports-related head impact; no loss of consciousness reported; no prior neurologic history.", "None listed", "None listed", "Head CT without contrast", "CT", "Head", "Follow-up after head injury", "No acute intracranial finding identified in this fictional sample."],
  ["Nora Williams", 66, "Female", "Peripheral neuropathy", "Type 2 diabetes; chronic foot numbness; prior podiatry visits.", "Gabapentin", "Metformin", "Left foot radiographs, 3 views", "X-ray", "Left foot", "Chronic foot symptoms", "No acute fracture; mild first metatarsophalangeal degenerative change."],
  ["Mateo Silva", 42, "Male", "Hepatic steatosis", "Elevated liver enzymes on prior screening; no abdominal surgery.", "None listed", "None listed", "Abdominal ultrasound", "Ultrasound", "Liver and biliary system", "Follow-up of liver enzyme elevation", "Increased hepatic echogenicity compatible with steatosis in this mock report."]
];

function createDemoPatient(scenario, index) {
  const [name, age, sex, diagnosis, history, allergy, medication, study, modality, bodySite, indication, report] = scenario;
  const id = index + 4;
  const imaging = {
    id: `rad-demo-${id}`,
    study,
    modality,
    bodySite,
    performedAt: `2026-09-${String(3 + (index % 27)).padStart(2, "0")} ${String(8 + (index % 9)).padStart(2, "0")}:30`,
    status: index % 4 === 0 ? "Preliminary" : "Final",
    indication,
    report,
    radiologist: `Dr. ${["Morgan Ellis", "Riley Bennett", "Jordan Park", "Taylor Reed"][index % 4]}`
  };

  return {
    id,
    name,
    mrn: `MRN-${String(42000 + id * 137)}`,
    age,
    sex,
    status: index % 4 === 0 ? "Imaging review" : "Stable",
    priority: index % 6 === 0 ? "Urgent" : "Routine",
    diagnosis,
    lastVisit: "Today",
    provider: `Dr. ${["Elena Ruiz", "Amir Hassan", "Priya Singh", "Morgan Ellis"][index % 4]}`,
    room: `Clinic ${String.fromCharCode(65 + (index % 6))}${(index % 4) + 1}`,
    allergies: [allergy],
    medications: [medication],
    vitals: {
      bp: `${112 + (index % 22)}/${68 + (index % 14)}`,
      hr: 64 + (index % 28),
      temp: `${(98.1 + (index % 7) * 0.1).toFixed(1)}°F`,
      spO2: `${95 + (index % 5)}%`
    },
    labs: [`Sample chart · ${diagnosis}`, "Fictional demonstration values"],
    notes: [{
      title: "Medical history",
      summary: history,
      type: "Fictional sample history",
      time: "Today"
    }],
    appointments: [{
      id: `a-demo-${id}`,
      time: "10:30",
      title: "Imaging review",
      location: "Radiology",
      status: "Scheduled"
    }],
    imaging: [imaging],
    billing: {
      balance: 250 + index * 75,
      insurance: ["Sample Health Plan", "DemoCare", "Fictional PPO"][index % 3],
      claimStatus: "Pending review",
      lastPayment: "Not recorded"
    },
    chartCompleted: index % 3 === 0,
    medicationReviewed: index % 2 === 0,
    carePlan: {
      followUpDate: "2026-10-17",
      tasks: [{ label: `Review ${modality} report`, status: "Open" }]
    }
  };
}

const demoPatients = demoPatientScenarios.map(createDemoPatient);
const allInitialPatients = [...initialPatients, ...demoPatients];

function safeLocalStorage() {
  return typeof localStorage !== "undefined" ? localStorage : null;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDisplayDate(isoDate) {
  if (!isoDate) return "Not scheduled";
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function createAppointmentId() {
  return `a-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
}

function createRecordId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalizeTask(task) {
  if (typeof task === "string") {
    return { label: task, status: "Open" };
  }

  return {
    label: task.label,
    status: task.status || "Open"
  };
}

function normalizeAppointment(appointment) {
  return {
    id: appointment.id || createAppointmentId(),
    time: appointment.time,
    title: appointment.title,
    location: appointment.location,
    status: appointment.status || "Scheduled"
  };
}

function normalizePatient(patient) {
  const clinical = patient.clinical || {};
  return {
    ...patient,
    chartCompleted: Boolean(patient.chartCompleted),
    medicationReviewed: patient.medicationReviewed !== false,
    appointments: (patient.appointments || []).map(normalizeAppointment),
    clinical: {
      arrivalMode: clinical.arrivalMode || "Walk-in",
      stage: clinical.stage || "Intake",
      chiefComplaint: clinical.chiefComplaint || "",
      acuity: clinical.acuity || "",
      triageNote: clinical.triageNote || "",
      vitals: { ...(patient.vitals || {}), ...(clinical.vitals || {}) },
      painScore: clinical.painScore || "",
      location: clinical.location || patient.room || "Waiting",
      disposition: clinical.disposition || "",
      destination: clinical.destination || "",
      followUpDate: clinical.followUpDate || patient.carePlan?.followUpDate || ""
    },
    orders: (patient.orders || []).map((order) => ({
      id: order.id || createRecordId("order"),
      category: order.category || "Nursing",
      priority: order.priority || "Routine",
      title: order.title || "",
      details: order.details || "",
      status: order.status || "Pending",
      time: order.time || "Previously recorded"
    })),
    imaging: (patient.imaging || []).map((record) => ({
      id: record.id || createRecordId("imaging"),
      study: record.study || "Imaging study",
      modality: record.modality || "Not specified",
      bodySite: record.bodySite || "Not specified",
      performedAt: record.performedAt || "Date not recorded",
      status: record.status || "Final",
      indication: record.indication || "",
      report: record.report || "",
      radiologist: record.radiologist || "Not recorded"
    })),
    documents: (patient.documents || patient.notes || []).map((document) => ({
      id: document.id || createRecordId("document"),
      type: document.type || "Clinical note",
      title: document.title || "Untitled note",
      status: document.status || "Finalized",
      time: document.time || "Previously recorded",
      sections: document.sections || { summary: document.summary || "" }
    })),
    carePlan: {
      followUpDate: patient.carePlan?.followUpDate || "",
      tasks: (patient.carePlan?.tasks || []).map(normalizeTask)
    },
    billing: {
      claimStatus: "Pending review",
      lastPayment: "Not recorded",
      ...patient.billing
    }
  };
}

function normalizeAuditEntry(entry) {
  return {
    id: entry.id || `audit-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    timestamp: entry.timestamp || new Date().toISOString(),
    actorRole: entry.actorRole || "clinician",
    actorLabel: entry.actorLabel || rolePermissions[entry.actorRole || "clinician"].label,
    action: entry.action || "system:event",
    patientName: entry.patientName || "System",
    details: entry.details || "No details provided"
  };
}

function normalizeCurrentUser(user) {
  const role = rolePermissions[user?.role] ? user.role : "clinician";
  return {
    role,
    label: rolePermissions[role].label
  };
}

function loadPatients() {
  const storage = safeLocalStorage();

  try {
    const saved = storage?.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.patients) {
        const savedPatients = parsed.patients.map(normalizePatient);
        const savedIds = new Set(savedPatients.map((patient) => patient.id));
        return [
          ...savedPatients,
          ...allInitialPatients.filter((patient) => !savedIds.has(patient.id)).map(normalizePatient)
        ];
      }
    }
  } catch (error) {
    console.warn("Unable to load saved patients", error);
  }

  return allInitialPatients.map(normalizePatient);
}

function loadAuditTrail() {
  const storage = safeLocalStorage();

  try {
    const saved = storage?.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.auditTrail) {
        return parsed.auditTrail.map(normalizeAuditEntry);
      }
    }
  } catch (error) {
    console.warn("Unable to load audit trail", error);
  }

  return [];
}

function loadCurrentUser() {
  const storage = safeLocalStorage();

  try {
    const saved = storage?.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.currentUser) return normalizeCurrentUser(parsed.currentUser);
    }
  } catch (error) {
    console.warn("Unable to load current user", error);
  }

  return normalizeCurrentUser({ role: "clinician" });
}

function loadSelectedPatient(patients) {
  const storage = safeLocalStorage();

  try {
    const saved = storage?.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.selectedPatientId) return parsed.selectedPatientId;
    }
  } catch (error) {
    console.warn("Unable to load selected patient", error);
  }

  return patients[0]?.id;
}

let patients = loadPatients();
let selectedPatientId = loadSelectedPatient(patients);
let currentUser = loadCurrentUser();
let auditTrail = loadAuditTrail();
let currentView = loadCurrentView();

function saveState() {
  const storage = safeLocalStorage();
  storage?.setItem(storageKey, JSON.stringify({ patients, selectedPatientId, currentUser, auditTrail, currentView }));
}

function loadCurrentView() {
  const storage = safeLocalStorage();

  try {
    const saved = storage?.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.currentView) return parsed.currentView;
    }
  } catch (error) {
    console.warn("Unable to load current view", error);
  }

  return "overview";
}

function getSelectedPatient() {
  return patients.find((patient) => patient.id === selectedPatientId) || patients[0];
}

function getRoleLabel(role) {
  return rolePermissions[role]?.label || role;
}

function hasPermission(role, action) {
  return Boolean(rolePermissions[role]?.actions.includes(action));
}

function appendAuditEntry(entry) {
  auditTrail.unshift(normalizeAuditEntry(entry));
  auditTrail = auditTrail.slice(0, 30);
}

function recordAudit(action, patientName, details) {
  appendAuditEntry({
    action,
    patientName,
    details,
    actorRole: currentUser.role,
    actorLabel: currentUser.label
  });
}

function evaluatePermission(role, action, patientName) {
  if (hasPermission(role, action)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    message: `${getRoleLabel(role)} role cannot ${action.replace(":", " ")}.`,
    audit: {
      action: `${action}:denied`,
      patientName,
      details: `${getRoleLabel(role)} attempted ${action}.`
    }
  };
}

function setCurrentRole(role) {
  const nextUser = normalizeCurrentUser({ role });
  currentUser = nextUser;
  appendAuditEntry({
    action: "role:switch",
    patientName: "System",
    details: `Switched active role to ${nextUser.label}.`,
    actorRole: nextUser.role,
    actorLabel: nextUser.label
  });
  saveState();
  return currentUser;
}

function setCurrentView(view) {
  currentView = view;
  saveState();
}

function getDetailCardsForView(patient, openTasks) {
  const cardsByView = {
    overview: [
      {
        title: "Demographics",
        items: [
          `Primary diagnosis: ${patient.diagnosis}`,
          `Provider: ${patient.provider}`,
          `Care location: ${patient.room}`,
          `Last visit: ${patient.lastVisit}`
        ]
      },
      {
        title: "Latest vitals",
        items: [
          `Blood pressure: ${patient.vitals.bp}`,
          `Heart rate: ${patient.vitals.hr} bpm`,
          `Temperature: ${patient.vitals.temp}`,
          `SpO₂: ${patient.vitals.spO2}`
        ]
      },
      {
        title: "Allergies & meds",
        items: [
          `Allergies: ${patient.allergies.join(", ")}`,
          `Medications: ${patient.medications.join(", ")}`,
          `Medication review: ${patient.medicationReviewed ? "Completed" : "Pending"}`
        ]
      },
      {
        title: "Care plan",
        items: [
          `Follow-up date: ${formatDisplayDate(patient.carePlan.followUpDate)}`,
          `Chart status: ${patient.chartCompleted ? "Completed" : "In progress"}`,
          `Open tasks: ${openTasks.length}`
        ],
        action: "task"
      },
      {
        title: "Lab markers",
        items: patient.labs
      },
      {
        title: "Revenue cycle",
        items: [
          `Outstanding balance: ${formatCurrency(patient.billing.balance)}`,
          `Insurance: ${patient.billing.insurance}`,
          `Claim status: ${patient.billing.claimStatus}`,
          `Last payment: ${patient.billing.lastPayment}`
        ]
      }
    ],
    patients: [
      {
        title: "Demographics",
        items: [
          `Primary diagnosis: ${patient.diagnosis}`,
          `Provider: ${patient.provider}`,
          `Care location: ${patient.room}`,
          `Last visit: ${patient.lastVisit}`
        ]
      },
      {
        title: "Care plan",
        items: [
          `Follow-up date: ${formatDisplayDate(patient.carePlan.followUpDate)}`,
          `Priority: ${patient.priority}`,
          `Open tasks: ${openTasks.length}`
        ],
        action: "task"
      }
    ],
    appointments: [
      {
        title: "Schedule summary",
        items: patient.appointments.map(
          (appointment) => `${appointment.time} • ${appointment.title} • ${appointment.status}`
        )
      },
      {
        title: "Care plan",
        items: [
          `Next follow-up: ${formatDisplayDate(patient.carePlan.followUpDate)}`,
          `Open tasks: ${openTasks.length}`,
          `Chart status: ${patient.chartCompleted ? "Completed" : "In progress"}`
        ]
      }
    ],
    labs: [
      {
        title: "Latest vitals",
        items: [
          `Blood pressure: ${patient.vitals.bp}`,
          `Heart rate: ${patient.vitals.hr} bpm`,
          `Temperature: ${patient.vitals.temp}`,
          `SpO₂: ${patient.vitals.spO2}`
        ]
      },
      {
        title: "Lab markers",
        items: patient.labs
      },
      {
        title: "Medication profile",
        items: [
          `Allergies: ${patient.allergies.join(", ")}`,
          `Medications: ${patient.medications.join(", ")}`,
          `Medication review: ${patient.medicationReviewed ? "Completed" : "Pending"}`
        ]
      }
    ],
    billing: [
      {
        title: "Revenue cycle",
        items: [
          `Outstanding balance: ${formatCurrency(patient.billing.balance)}`,
          `Insurance: ${patient.billing.insurance}`,
          `Claim status: ${patient.billing.claimStatus}`,
          `Last payment: ${patient.billing.lastPayment}`
        ]
      },
      {
        title: "Patient status",
        items: [
          `Patient: ${patient.name}`,
          `Priority: ${patient.priority}`,
          `Provider: ${patient.provider}`
        ]
      }
    ]
  };

  return cardsByView[currentView] || cardsByView.overview;
}

function getVisibleSections(view) {
  return {
    overviewSection: view === "overview",
    recordsSection: view === "overview" || view === "patients" || view === "labs" || view === "billing",
    operationsSection: view === "overview" || view === "appointments" || view === "billing",
    encounterSection: view === "overview" || view === "patients" || view === "labs",
    auditSection: view === "overview" || view === "billing" || view === "appointments",
    clinicalSection: ["clinical", "orders", "documents"].includes(view)
  };
}

function renderNavigation() {
  document.querySelectorAll(".nav-link").forEach((item) => {
    const active = item.dataset.view === currentView;
    item.classList.toggle("active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
}

function applyViewState() {
  const visibility = getVisibleSections(currentView);
  Object.entries(visibility).forEach(([sectionId, visible]) => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.classList.toggle("hidden-section", !visible);
  });
  document.querySelectorAll(".clinical-subview").forEach((panel) => {
    panel.classList.toggle("hidden-section", panel.dataset.clinicalPanel !== currentView);
  });
}

function parseVitalsInput(rawVitals) {
  const nextVitals = {};
  const input = rawVitals.trim();

  if (!input) return nextVitals;

  const segments = input.split(",").map((segment) => segment.trim()).filter(Boolean);

  segments.forEach((segment) => {
    const lower = segment.toLowerCase();

    if (lower.startsWith("bp")) {
      nextVitals.bp = segment.replace(/^bp\s*/i, "").trim();
    } else if (lower.startsWith("hr")) {
      const match = segment.match(/(\d+)/);
      if (match) nextVitals.hr = Number(match[1]);
    } else if (lower.startsWith("temp")) {
      nextVitals.temp = segment.replace(/^temp\s*/i, "").trim();
    } else if (lower.startsWith("spo2") || lower.includes("spo")) {
      nextVitals.spO2 = segment.replace(/^spo2?\s*/i, "").trim();
    }
  });

  return nextVitals;
}

function calculateDashboardStats(patientList) {
  const totalPatients = patientList.length || 1;
  const completedCharts = patientList.filter((patient) => patient.chartCompleted).length;
  const medicationReviewed = patientList.filter((patient) => patient.medicationReviewed).length;
  const overdueTasks = patientList.reduce(
    (count, patient) => count + patient.carePlan.tasks.filter((task) => task.status !== "Done").length,
    0
  );
  const criticalFollowups = patientList.filter((patient) => {
    const dueDate = patient.carePlan.followUpDate ? new Date(`${patient.carePlan.followUpDate}T00:00:00`) : null;
    const isOverdue = dueDate ? dueDate.getTime() < Date.now() : false;
    return patient.priority === "Urgent" || isOverdue;
  }).length;

  return {
    patientsToday: patientList.length,
    patientsTodayMeta: "in the workspace",
    completedCharts,
    completedChartsMeta: `${Math.round((completedCharts / totalPatients) * 100)}% completion rate`,
    criticalFollowups,
    criticalFollowupsMeta: `${overdueTasks} open care tasks`,
    medicationReconciliation: `${Math.round((medicationReviewed / totalPatients) * 100)}%`,
    medicationReconciliationMeta: `${medicationReviewed} patient charts reviewed`
  };
}

function applyEncounterToPatient(patient, encounter) {
  const updatedVitals = parseVitalsInput(encounter.vitals || "");
  const note = {
    title: encounter.title.trim() || "Untitled encounter",
    summary: encounter.summary.trim() || "No summary captured.",
    type: encounter.type,
    time: `Today • ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
  };

  patient.notes.unshift(note);
  patient.documents.unshift({
    id: createRecordId("document"),
    title: note.title,
    type: encounter.type || "Clinical encounter",
    status: "Draft",
    time: note.time,
    sections: { summary: note.summary, vitals: encounter.vitals || "", plan: encounter.followup ? `Follow-up: ${encounter.followup}` : "" }
  });
  patient.chartCompleted = true;
  patient.medicationReviewed = true;
  patient.lastVisit = "Today";
  patient.status = encounter.followup ? "Follow-up scheduled" : "Stable";
  patient.vitals = { ...patient.vitals, ...updatedVitals };
  patient.clinical.vitals = { ...patient.clinical.vitals, ...updatedVitals };
  if (encounter.followup) patient.clinical.followUpDate = encounter.followup;

  if (encounter.followup) {
    patient.carePlan.followUpDate = encounter.followup;
    patient.carePlan.tasks.unshift({ label: `Complete ${note.title.toLowerCase()} follow-up`, status: "Open" });
    patient.appointments.unshift(
      normalizeAppointment({
        time: formatDisplayDate(encounter.followup),
        title: `Follow-up: ${note.title}`,
        location: patient.room,
        status: "Scheduled"
      })
    );
  }

  return note;
}

function createEncounterForPatient(patient, encounter, role = currentUser.role) {
  const permission = evaluatePermission(role, "encounter:create", patient.name);
  if (!permission.allowed) {
    return permission;
  }

  const note = applyEncounterToPatient(patient, encounter);
  appendAuditEntry({
    action: "encounter:create",
    patientName: patient.name,
    details: `Saved encounter \"${note.title}\" and updated the care plan.`,
    actorRole: role,
    actorLabel: getRoleLabel(role)
  });
  return { allowed: true, note };
}

function updateWorkflowForPatient(patient, updates, role = currentUser.role) {
  const permission = evaluatePermission(role, "workflow:update", patient.name);
  if (!permission.allowed) return permission;

  const allowedStages = ["Intake", "Triage", "ED evaluation", "Consultation", "Admission", "Discharge", "Closed"];
  const allowedDispositions = ["", "Admit to ward", "Admit to ICU", "Discharge home", "Refer to PCP", "Refer to specialist", "Transfer"];
  if (!allowedStages.includes(updates.stage) || !allowedDispositions.includes(updates.disposition || "")) {
    return { allowed: false, message: "Select a valid encounter stage and disposition." };
  }

  patient.clinical = {
    ...patient.clinical,
    arrivalMode: updates.arrivalMode || patient.clinical.arrivalMode,
    stage: updates.stage,
    chiefComplaint: (updates.chiefComplaint || "").trim(),
    acuity: updates.acuity || "",
    triageNote: (updates.triageNote || "").trim(),
    painScore: updates.painScore || "",
    location: (updates.location || "").trim() || patient.clinical.location,
    disposition: updates.disposition || "",
    destination: (updates.destination || "").trim(),
    followUpDate: updates.followUpDate || "",
    vitals: { ...patient.clinical.vitals }
  };
  ["bp", "hr", "rr", "temp", "spO2"].forEach((key) => {
    if (updates[key] !== undefined && updates[key] !== "") {
      patient.clinical.vitals[key] = updates[key];
      if (key !== "rr") patient.vitals[key] = updates[key];
    }
  });
  if (patient.clinical.followUpDate) patient.carePlan.followUpDate = patient.clinical.followUpDate;
  patient.room = patient.clinical.location;
  patient.status = ({
    "Admit to ward": "Admitted · Ward",
    "Admit to ICU": "Admitted · ICU",
    "Discharge home": "Discharge planning",
    "Refer to PCP": "PCP referral",
    "Refer to specialist": "Specialist referral",
    Transfer: "Transfer planned"
  })[patient.clinical.disposition] || patient.clinical.stage;

  appendAuditEntry({
    action: "workflow:update",
    patientName: patient.name,
    details: `Updated encounter to ${patient.clinical.stage}${patient.clinical.disposition ? ` · ${patient.clinical.disposition}` : ""}.`,
    actorRole: role,
    actorLabel: getRoleLabel(role)
  });
  saveState();
  return { allowed: true, clinical: patient.clinical };
}

function createOrderForPatient(patient, order, role = currentUser.role) {
  const permission = evaluatePermission(role, "order:create", patient.name);
  if (!permission.allowed) return permission;
  const title = (order.title || "").trim();
  if (!title) return { allowed: false, message: "Enter an order or request before saving." };

  const savedOrder = {
    id: createRecordId("order"),
    category: order.category || "Nursing",
    priority: order.priority || "Routine",
    title,
    details: (order.details || "").trim(),
    status: "Pending",
    time: new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
  };
  patient.orders.unshift(savedOrder);
  appendAuditEntry({
    action: "order:create",
    patientName: patient.name,
    details: `Added ${savedOrder.category.toLowerCase()} order: ${savedOrder.title}.`,
    actorRole: role,
    actorLabel: getRoleLabel(role)
  });
  saveState();
  return { allowed: true, order: savedOrder };
}

function updateOrderStatus(patient, orderId, status, role = currentUser.role) {
  const permission = evaluatePermission(role, "order:create", patient.name);
  if (!permission.allowed) return permission;
  if (!["Pending", "Acknowledged", "Completed", "Cancelled"].includes(status)) {
    return { allowed: false, message: "Select a valid order status." };
  }
  const order = patient.orders.find((item) => item.id === orderId);
  if (!order) return { allowed: false, message: "Order not found." };
  order.status = status;
  appendAuditEntry({
    action: "order:update",
    patientName: patient.name,
    details: `Marked order "${order.title}" ${status.toLowerCase()}.`,
    actorRole: role,
    actorLabel: getRoleLabel(role)
  });
  saveState();
  return { allowed: true, order };
}

function createDocumentForPatient(patient, document, role = currentUser.role) {
  const permission = evaluatePermission(role, "document:create", patient.name);
  if (!permission.allowed) return permission;
  const title = (document.title || "").trim();
  if (!title) return { allowed: false, message: "Enter a document title before saving." };

  const sections = {
    hpi: (document.hpi || "").trim(),
    history: (document.history || "").trim(),
    ros: (document.ros || "").trim(),
    exam: (document.exam || "").trim(),
    assessment: (document.assessment || "").trim(),
    plan: (document.plan || "").trim()
  };
  const savedDocument = {
    id: createRecordId("document"),
    type: document.type || "Clinical note",
    title,
    status: "Draft",
    time: new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }),
    sections
  };
  patient.documents.unshift(savedDocument);
  patient.notes.unshift({
    title: savedDocument.title,
    summary: sections.assessment || sections.hpi || "Draft saved.",
    type: savedDocument.type,
    time: savedDocument.time
  });
  appendAuditEntry({
    action: "document:create",
    patientName: patient.name,
    details: `Saved ${savedDocument.type.toLowerCase()} "${savedDocument.title}" as a draft.`,
    actorRole: role,
    actorLabel: getRoleLabel(role)
  });
  saveState();
  return { allowed: true, document: savedDocument };
}

function updateAppointmentStatus(patientId, appointmentId, nextStatus, role = currentUser.role) {
  const patient = patients.find((item) => item.id === patientId);
  if (!patient) return { allowed: false, message: "Patient not found." };

  const appointment = patient.appointments.find((item) => item.id === appointmentId);
  if (!appointment) return { allowed: false, message: "Appointment not found." };

  const action = nextStatus === "Cancelled" ? "appointment:cancel" : "appointment:complete";
  const permission = evaluatePermission(role, action, patient.name);
  if (!permission.allowed) {
    return permission;
  }

  appointment.status = nextStatus;
  if (nextStatus === "Completed") {
    patient.chartCompleted = true;
    patient.status = "Stable";
  }

  appendAuditEntry({
    action,
    patientName: patient.name,
    details: `${appointment.title} marked ${nextStatus.toLowerCase()}.`,
    actorRole: role,
    actorLabel: getRoleLabel(role)
  });

  saveState();
  return { allowed: true, appointment };
}

function markTaskDone(patient, role = currentUser.role) {
  const permission = evaluatePermission(role, "task:complete", patient.name);
  if (!permission.allowed) {
    return permission;
  }

  const nextOpenTask = patient.carePlan.tasks.find((task) => task.status !== "Done");
  if (!nextOpenTask) return { allowed: true, changed: false };
  nextOpenTask.status = "Done";
  appendAuditEntry({
    action: "task:complete",
    patientName: patient.name,
    details: `Completed task \"${nextOpenTask.label}\".`,
    actorRole: role,
    actorLabel: getRoleLabel(role)
  });
  return { allowed: true, changed: true, task: nextOpenTask };
}

function buildExportPayload(patient) {
  return {
    exportedAt: new Date().toISOString(),
    exportedBy: currentUser.label,
    patient: {
      name: patient.name,
      mrn: patient.mrn,
      provider: patient.provider,
      diagnosis: patient.diagnosis,
      priority: patient.priority,
      status: patient.status,
      chartCompleted: patient.chartCompleted,
      medicationReviewed: patient.medicationReviewed,
      vitals: patient.vitals,
      billing: patient.billing,
      followUpDate: patient.carePlan.followUpDate,
      appointments: patient.appointments,
      tasks: patient.carePlan.tasks,
      notes: patient.notes,
      imaging: patient.imaging
    }
  };
}

function downloadPatientExport(patient) {
  const payload = buildExportPayload(patient);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${patient.mrn.toLowerCase()}-summary.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function renderDashboardStats() {
  const stats = calculateDashboardStats(patients);
  document.getElementById("patientsTodayValue").textContent = stats.patientsToday;
  document.getElementById("patientsTodayMeta").textContent = stats.patientsTodayMeta;
  document.getElementById("completedChartsValue").textContent = stats.completedCharts;
  document.getElementById("completedChartsMeta").textContent = stats.completedChartsMeta;
  document.getElementById("criticalFollowupsValue").textContent = stats.criticalFollowups;
  document.getElementById("criticalFollowupsMeta").textContent = stats.criticalFollowupsMeta;
  document.getElementById("medRecValue").textContent = stats.medicationReconciliation;
  document.getElementById("medRecMeta").textContent = stats.medicationReconciliationMeta;
}

function renderRoleSummary() {
  const roleValue = document.getElementById("roleValue");
  const roleHelp = document.getElementById("roleHelp");
  const roleSelector = document.getElementById("roleSelector");
  if (!roleValue || !roleHelp || !roleSelector) return;

  roleValue.textContent = currentUser.label;
  roleHelp.textContent = currentUser.role === "clinician"
    ? "Can document, manage orders, and update encounter workflow."
    : currentUser.role === "nurse"
      ? "Can record nursing intake, vitals, orders, and care notes."
      : "Can review audit history and manage cancellations.";
  roleSelector.value = currentUser.role;
}

function renderPatientList() {
  const searchField = document.getElementById("patientSearch");
  const searchTerm = searchField ? searchField.value.toLowerCase() : "";
  const filtered = patients.filter((patient) =>
    `${patient.name} ${patient.mrn} ${patient.priority} ${patient.status} ${patient.diagnosis}`.toLowerCase().includes(searchTerm)
  );

  const list = document.getElementById("patientList");
  document.getElementById("patientListCount").textContent =
    `${filtered.length} ${filtered.length === 1 ? "record" : "records"}`;
  if (!filtered.length) {
    list.innerHTML = '<p class="mini-card">No patients matched your search.</p>';
    return;
  }

  list.innerHTML = filtered
    .map((patient) => {
      const active = patient.id === selectedPatientId ? "active" : "";
      return `
        <button class="patient-card ${active}" data-id="${escapeHtml(patient.id)}">
          <strong>${escapeHtml(patient.name)}</strong>
          <span>${escapeHtml(patient.mrn)} • ${escapeHtml(patient.priority)}</span>
          <span>${escapeHtml(patient.diagnosis)}</span>
          <span>${escapeHtml(patient.status)}</span>
        </button>
      `;
    })
    .join("");
}

function renderPatientDetail() {
  const detail = document.getElementById("patientDetail");
  const patient = getSelectedPatient();
  const openTasks = patient.carePlan.tasks.filter((task) => task.status !== "Done");
  const canCompleteTask = hasPermission(currentUser.role, "task:complete");
  const detailCards = getDetailCardsForView(patient, openTasks);

  detail.innerHTML = `
    <div class="detail-header">
      <div>
        <p class="eyebrow">Current patient</p>
        <h3>${escapeHtml(patient.name)}</h3>
        <p>${escapeHtml(patient.mrn)} • ${escapeHtml(patient.age)} years • ${escapeHtml(patient.sex)}</p>
      </div>
      <span class="pill">${escapeHtml(patient.priority)}</span>
    </div>

    <div class="detail-grid">
      ${detailCards
        .map(
          (card) => `
            <article class="mini-card">
              <h4>${card.title}</h4>
              <ul>
                ${card.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
              </ul>
              ${card.action === "task" ? `<button class="ghost-btn action-btn" id="completeTaskBtn" type="button" ${canCompleteTask ? "" : "disabled"}>Complete next task</button>` : ""}
            </article>
          `
        )
        .join("")}
    </div>

    <div class="mini-card detail-notes">
      <h4>Recent notes</h4>
      <ul>
        ${patient.notes
          .map(
            (note) => `<li><strong>${escapeHtml(note.title)}</strong> — ${escapeHtml(note.summary)} <em>(${escapeHtml(note.type)}, ${escapeHtml(note.time)})</em></li>`
          )
          .join("")}
      </ul>
    </div>

    <div class="mini-card detail-notes imaging-records">
      <div class="panel-header">
        <div>
          <p class="eyebrow">Imaging & radiology</p>
          <h4>Imaging records (${patient.imaging.length})</h4>
        </div>
      </div>
      ${patient.imaging.length
        ? patient.imaging.map((record) => `
          <article class="imaging-record">
            <div class="record-card-header">
              <div>
                <span class="record-category">${escapeHtml(record.modality)} · ${escapeHtml(record.bodySite)}</span>
                <h4>${escapeHtml(record.study)}</h4>
              </div>
              <span class="status-pill ${record.status === "Final" ? "status-completed" : "status-acknowledged"}">${escapeHtml(record.status)}</span>
            </div>
            <p><strong>Performed:</strong> ${escapeHtml(record.performedAt)} · <strong>Radiologist:</strong> ${escapeHtml(record.radiologist)}</p>
            ${record.indication ? `<p><strong>Indication:</strong> ${escapeHtml(record.indication)}</p>` : ""}
            ${record.report ? `<p><strong>Report:</strong> ${escapeHtml(record.report)}</p>` : ""}
          </article>`).join("")
        : '<p class="empty-state">No imaging or radiology records for this patient.</p>'}
      <p class="form-caution">Fictional demonstration records only; reports are not diagnostic and are not for clinical use.</p>
    </div>

    <div class="mini-card detail-notes">
      <h4>Recent audit trail</h4>
      <ul>
        ${auditTrail
          .filter((entry) => entry.patientName === patient.name)
          .slice(0, 4)
          .map((entry) => `<li><strong>${escapeHtml(entry.actorLabel)}</strong> — ${escapeHtml(entry.details)} <em>(${escapeHtml(entry.action)})</em></li>`)
          .join("") || "<li>No audit events for this patient yet.</li>"}
      </ul>
    </div>
  `;
}

function renderAppointments() {
  const patient = getSelectedPatient();
  const container = document.getElementById("appointmentsList");
  const canComplete = hasPermission(currentUser.role, "appointment:complete");
  const canCancel = hasPermission(currentUser.role, "appointment:cancel");
  container.innerHTML = patient.appointments
    .map(
      (appointment) => `
        <div class="list-item appointment-item ${appointment.status.toLowerCase().replace(/\s+/g, "-")}">
          <div>
            <strong>${escapeHtml(appointment.time)} • ${escapeHtml(appointment.title)}</strong>
            <span>${escapeHtml(appointment.location)} • ${escapeHtml(appointment.status)}</span>
          </div>
          <div class="appointment-actions">
            <button class="ghost-btn action-btn" type="button" data-action="complete" data-id="${escapeHtml(appointment.id)}" ${canComplete ? "" : "disabled"}>Complete</button>
            <button class="ghost-btn action-btn" type="button" data-action="cancel" data-id="${escapeHtml(appointment.id)}" ${canCancel ? "" : "disabled"}>Cancel</button>
          </div>
        </div>
      `
    )
    .join("");
}

function renderSnapshot() {
  const patient = getSelectedPatient();
  const openTasks = patient.carePlan.tasks.filter((task) => task.status !== "Done").length;
  const completedAppointments = patient.appointments.filter((appointment) => appointment.status === "Completed").length;
  const container = document.getElementById("snapshotPanel");
  container.innerHTML = `
    <div class="snapshot-item">
      <span>Care team</span>
      <strong>${escapeHtml(patient.provider)}</strong>
    </div>
    <div class="snapshot-item">
      <span>Outstanding balance</span>
      <strong>${escapeHtml(formatCurrency(patient.billing.balance))}</strong>
    </div>
    <div class="snapshot-item">
      <span>Open care tasks</span>
      <strong>${openTasks}</strong>
    </div>
    <div class="snapshot-item">
      <span>Appointments completed</span>
      <strong>${completedAppointments}/${patient.appointments.length}</strong>
    </div>
    <div class="snapshot-item">
      <span>Active role</span>
      <strong>${escapeHtml(currentUser.label)}</strong>
    </div>
  `;
}

function renderAuditTrail() {
  const panel = document.getElementById("auditTrailList");
  if (!panel) return;

  if (!hasPermission(currentUser.role, "audit:view")) {
    panel.innerHTML = '<p class="mini-card">Switch to the Admin role to review the audit trail.</p>';
    return;
  }

  panel.innerHTML = auditTrail.length
    ? auditTrail
        .slice(0, 8)
        .map(
          (entry) => `
            <div class="audit-entry">
              <strong>${escapeHtml(entry.actorLabel)} • ${escapeHtml(entry.action)}</strong>
              <span>${escapeHtml(entry.patientName)}</span>
              <p>${escapeHtml(entry.details)}</p>
            </div>
          `
        )
        .join("")
    : '<p class="mini-card">No audit activity recorded yet.</p>';
}

function renderClinicalWorkspace() {
  const patient = getSelectedPatient();
  if (!patient) return;
  const clinical = patient.clinical;
  document.getElementById("clinicalPatientHeading").textContent = patient.name;
  document.getElementById("clinicalPatientMeta").textContent =
    `${patient.mrn} · ${patient.age} years · ${patient.sex} · ${patient.provider}`;
  document.getElementById("workflowSummary").innerHTML = `
    <span class="workflow-chip">${escapeHtml(clinical.stage)}</span>
    <span class="workflow-chip">${escapeHtml(clinical.location)}</span>
    <span class="workflow-chip">${escapeHtml(clinical.disposition || "Disposition pending")}</span>
  `;

  const workflowForm = document.getElementById("workflowForm");
  const values = { ...clinical, ...clinical.vitals };
  Object.entries(values).forEach(([name, value]) => {
    if (workflowForm.elements[name]) workflowForm.elements[name].value = value ?? "";
  });
}

function renderOrders() {
  const patient = getSelectedPatient();
  const container = document.getElementById("ordersList");
  const canUpdate = hasPermission(currentUser.role, "order:create");
  document.getElementById("orderCount").textContent = `${patient.orders.length} ${patient.orders.length === 1 ? "order" : "orders"}`;
  container.innerHTML = patient.orders.length
    ? patient.orders.map((order) => {
      const nextStatus = order.status === "Pending" ? "Acknowledged" : order.status === "Acknowledged" ? "Completed" : "";
      return `
        <article class="record-card">
          <div class="record-card-header">
            <div>
              <span class="record-category">${escapeHtml(order.category)} · ${escapeHtml(order.priority)}</span>
              <h4>${escapeHtml(order.title)}</h4>
            </div>
            <span class="status-pill status-${escapeHtml(order.status.toLowerCase())}">${escapeHtml(order.status)}</span>
          </div>
          ${order.details ? `<p>${escapeHtml(order.details)}</p>` : ""}
          <div class="record-card-footer"><span>${escapeHtml(order.time)}</span>
            ${nextStatus ? `<button class="ghost-btn action-btn" type="button" data-order-id="${escapeHtml(order.id)}" data-next-status="${escapeHtml(nextStatus)}" ${canUpdate ? "" : "disabled"}>${nextStatus === "Acknowledged" ? "Acknowledge" : "Mark complete"}</button>` : ""}
            ${order.status === "Pending" ? `<button class="text-btn" type="button" data-order-id="${escapeHtml(order.id)}" data-next-status="Cancelled" ${canUpdate ? "" : "disabled"}>Cancel</button>` : ""}
          </div>
        </article>`;
    }).join("")
    : '<p class="empty-state">No orders recorded for this encounter.</p>';
}

function renderDocuments() {
  const patient = getSelectedPatient();
  const container = document.getElementById("documentsList");
  document.getElementById("documentCount").textContent =
    `${patient.documents.length} ${patient.documents.length === 1 ? "document" : "documents"}`;
  container.innerHTML = patient.documents.length
    ? patient.documents.map((document) => `
      <article class="record-card document-card">
        <div class="record-card-header">
          <div>
            <span class="record-category">${escapeHtml(document.type)}</span>
            <h4>${escapeHtml(document.title)}</h4>
          </div>
          <span class="status-pill status-draft">${escapeHtml(document.status)}</span>
        </div>
        <p class="document-meta">${escapeHtml(document.time)}</p>
        <div class="document-sections">
          ${Object.entries(document.sections || {}).filter(([, value]) => value).map(([key, value]) => `
            <div><strong>${escapeHtml(key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()))}</strong>
              <p>${escapeHtml(value)}</p>
            </div>`).join("")}
        </div>
      </article>`).join("")
    : '<p class="empty-state">No clinical documents recorded for this patient.</p>';
}

function renderPermissions() {
  const exportButton = document.getElementById("exportBtn");
  const quickEncounterButton = document.getElementById("quickEncounterBtn");
  const saveEncounterButton = document.getElementById("saveEncounterBtn");
  const encounterInputs = document.querySelectorAll("#encounterForm input, #encounterForm select, #encounterForm textarea");
  const canCreateEncounter = hasPermission(currentUser.role, "encounter:create");
  const canUpdateWorkflow = hasPermission(currentUser.role, "workflow:update");
  const canCreateOrders = hasPermission(currentUser.role, "order:create");
  const canCreateDocuments = hasPermission(currentUser.role, "document:create");
  const canExport = hasPermission(currentUser.role, "report:export");

  if (quickEncounterButton) quickEncounterButton.disabled = !canCreateEncounter;
  if (saveEncounterButton) saveEncounterButton.disabled = !canCreateEncounter;
  if (exportButton) exportButton.disabled = !canExport;

  encounterInputs.forEach((field) => {
    field.disabled = !canCreateEncounter;
  });
  [
    ["workflowForm", canUpdateWorkflow],
    ["orderForm", canCreateOrders],
    ["documentForm", canCreateDocuments]
  ].forEach(([formId, allowed]) => {
    const form = document.getElementById(formId);
    form.querySelectorAll("input, select, textarea, button").forEach((field) => {
      field.disabled = !allowed;
    });
  });
}

function render() {
  if (typeof document === "undefined") return;
  renderNavigation();
  applyViewState();
  renderRoleSummary();
  renderDashboardStats();
  renderPermissions();
  renderPatientList();
  renderPatientDetail();
  renderAppointments();
  renderSnapshot();
  renderAuditTrail();
  renderClinicalWorkspace();
  renderOrders();
  renderDocuments();
  saveState();
}

function handlePatientSelection(id) {
  selectedPatientId = Number(id);
  const patient = getSelectedPatient();
  recordAudit("patient:select", patient.name, `Opened chart for ${patient.mrn}.`);
  render();
}

function handleEncounterSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const patient = getSelectedPatient();
  const result = createEncounterForPatient(patient, {
    title: form.title.value,
    summary: form.summary.value,
    type: form.type.value,
    vitals: form.vitals.value,
    followup: form.followup.value
  });

  if (!result.allowed) {
    appendAuditEntry(result.audit);
    saveState();
    document.getElementById("encounterStatus").textContent = result.message;
    render();
    return;
  }

  render();
  document.getElementById("encounterStatus").textContent = `Encounter saved for ${patient.name}: ${result.note.title}.`;
  form.reset();
}

function handleWorkflowSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const updates = Object.fromEntries(new FormData(form).entries());
  const patient = getSelectedPatient();
  const result = updateWorkflowForPatient(patient, updates);
  const message = result.allowed
    ? `Workflow updated for ${patient.name}.`
    : result.message;
  document.getElementById("clinicalStatus").textContent = message;
  document.getElementById("encounterStatus").textContent = message;
  render();
}

function handleOrderSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const order = Object.fromEntries(new FormData(form).entries());
  const patient = getSelectedPatient();
  const result = createOrderForPatient(patient, order);
  const message = result.allowed
    ? `${result.order.category} order saved for ${patient.name}.`
    : result.message;
  document.getElementById("clinicalStatus").textContent = message;
  document.getElementById("encounterStatus").textContent = message;
  if (result.allowed) form.reset();
  render();
}

function handleDocumentSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const documentData = Object.fromEntries(new FormData(form).entries());
  const patient = getSelectedPatient();
  const result = createDocumentForPatient(patient, documentData);
  const message = result.allowed
    ? `${result.document.type} saved as a draft for ${patient.name}.`
    : result.message;
  document.getElementById("clinicalStatus").textContent = message;
  document.getElementById("encounterStatus").textContent = message;
  if (result.allowed) form.reset();
  render();
}

function attachEvents() {
  document.getElementById("patientSearch").addEventListener("input", renderPatientList);

  document.getElementById("patientList").addEventListener("click", (event) => {
    const card = event.target.closest(".patient-card");
    if (card) handlePatientSelection(card.dataset.id);
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      setCurrentView(link.dataset.view);
      render();
    });
  });

  document.getElementById("quickEncounterBtn").addEventListener("click", () => {
    setCurrentView("clinical");
    render();
    document.getElementById("clinicalSection").scrollIntoView({ behavior: "smooth" });
  });

  document.getElementById("roleSelector").addEventListener("change", (event) => {
    const nextUser = setCurrentRole(event.target.value);
    document.getElementById("encounterStatus").textContent = `Active role switched to ${nextUser.label}.`;
    render();
  });

  document.getElementById("encounterForm").addEventListener("submit", handleEncounterSubmit);
  document.getElementById("workflowForm").addEventListener("submit", handleWorkflowSubmit);
  document.getElementById("orderForm").addEventListener("submit", handleOrderSubmit);
  document.getElementById("documentForm").addEventListener("submit", handleDocumentSubmit);

  document.getElementById("ordersList").addEventListener("click", (event) => {
    const button = event.target.closest("[data-order-id]");
    if (!button) return;
    const patient = getSelectedPatient();
    const result = updateOrderStatus(patient, button.dataset.orderId, button.dataset.nextStatus);
    const message = result.allowed
      ? `Order marked ${result.order.status.toLowerCase()}.`
      : result.message;
    document.getElementById("clinicalStatus").textContent = message;
    document.getElementById("encounterStatus").textContent = message;
    render();
  });

  document.getElementById("appointmentsList").addEventListener("click", (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;

    const nextStatus = actionButton.dataset.action === "complete" ? "Completed" : "Cancelled";
    const result = updateAppointmentStatus(selectedPatientId, actionButton.dataset.id, nextStatus);
    if (!result.allowed) {
      if (result.audit) appendAuditEntry(result.audit);
      document.getElementById("encounterStatus").textContent = result.message;
      saveState();
      render();
      return;
    }

    document.getElementById("encounterStatus").textContent = `Appointment marked ${nextStatus.toLowerCase()}.`;
    render();
  });

  document.getElementById("patientDetail").addEventListener("click", (event) => {
    if (event.target.id !== "completeTaskBtn") return;

    const result = markTaskDone(getSelectedPatient());
    if (!result.allowed) {
      if (result.audit) appendAuditEntry(result.audit);
      document.getElementById("encounterStatus").textContent = result.message;
      saveState();
      render();
      return;
    }

    document.getElementById("encounterStatus").textContent = result.changed
      ? "Marked the next open care task as done."
      : "No open care tasks remain for this patient.";
    render();
  });

  document.getElementById("exportBtn").addEventListener("click", () => {
    const patient = getSelectedPatient();
    const permission = evaluatePermission(currentUser.role, "report:export", patient.name);
    if (!permission.allowed) {
      appendAuditEntry(permission.audit);
      saveState();
      document.getElementById("encounterStatus").textContent = permission.message;
      render();
      return;
    }

    downloadPatientExport(patient);
    recordAudit("report:export", patient.name, `Exported patient summary for ${patient.mrn}.`);
    document.getElementById("encounterStatus").textContent = `Exported a patient summary for ${patient.name}.`;
    render();
  });
}

function bootstrap() {
  attachEvents();
  render();
}

const appApi = {
  applyEncounterToPatient,
  buildExportPayload,
  calculateDashboardStats,
  createEncounterForPatient,
  createDocumentForPatient,
  createOrderForPatient,
  hasPermission,
  normalizeAuditEntry,
  normalizePatient,
  parseVitalsInput,
  setCurrentRole,
  updateOrderStatus,
  updateAppointmentStatus,
  updateWorkflowForPatient
};

if (typeof window !== "undefined") {
  window.__ehrApp = appApi;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = appApi;
}

if (typeof document !== "undefined") {
  bootstrap();
}