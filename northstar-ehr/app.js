const storageKey = "northstar-ehr-state-v3";
const demoSessionKey = "northstar-ehr-demo-account";
const warningAcknowledgmentKey = "northstar-ehr-warning-acknowledged";
const automaticSignInKey = "northstar-ehr-automatic-sign-in";
const automaticAccountId = "joe-spartan";
const INBOX_FILTERS = [
  { key: "all", label: "All", kind: null },
  { key: "message", label: "Messages", kind: "Message" },
  { key: "result", label: "Results", kind: "Result" },
  { key: "task", label: "Tasks", kind: "Task" }
];

const demoAccounts = [
  { id: automaticAccountId, username: "joe.spartan", password: "northstar", displayName: "Joe Spartan, MD", role: "clinician", authorizedRoles: ["clinician"], staffProfileId: "staff-joe-spartan" },
  { id: "clinician", username: "elena.ruiz", password: "northstar", displayName: "Elena Ruiz", role: "clinician", authorizedRoles: ["clinician", "admin"], staffProfileId: "staff-elena-ruiz" },
  { id: "nurse", username: "jordan.lee", password: "northstar", displayName: "Jordan Lee", role: "nurse", authorizedRoles: ["nurse"], staffProfileId: "staff-jordan-lee" },
  { id: "admin", username: "alex.morgan", password: "northstar", displayName: "Alex Morgan", role: "admin", authorizedRoles: ["admin"], staffProfileId: "staff-alex-morgan" }
];

const rolePermissions = {
  clinician: {
    label: "Provider",
    actions: ["encounter:create", "workflow:update", "order:create", "document:create", "appointment:complete", "task:complete", "patient:select", "report:export", "data:import"]
  },
  midlevel: {
    label: "Midlevel (PA / NP)",
    actions: ["encounter:create", "workflow:update", "order:create", "document:create", "appointment:complete", "task:complete", "patient:select", "report:export", "data:import"]
  },
  staff: {
    label: "Staff",
    actions: ["appointment:complete", "patient:select"]
  },
  nurse: {
    label: "Nurse",
    actions: ["workflow:update", "order:create", "document:create", "appointment:complete", "task:complete", "patient:select"]
  },
  admin: {
    label: "Admin",
    actions: ["appointment:cancel", "appointment:complete", "patient:select", "report:export", "data:import", "audit:view", "billing:view", "roles:manage"]
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
    imaging: [{
      id: "rad-10482",
      study: "Renal function follow-up ultrasound",
      modality: "Ultrasound",
      bodySite: "Kidneys",
      performedAt: "2026-09-24 09:15",
      status: "Final",
      indication: "Diabetes and hypertension follow-up",
      report: "Kidneys are normal in size. No hydronephrosis identified in this fictional sample report.",
      radiologist: "Dr. Riley Bennett"
    }],
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
    imaging: [{
      id: "rad-20811",
      study: "Portable chest radiograph",
      modality: "X-ray",
      bodySite: "Chest",
      performedAt: "2026-10-02 11:40",
      status: "Preliminary",
      indication: "Post-operative chest discomfort",
      report: "No focal air-space opacity identified. Final review pending in this fictional sample.",
      radiologist: "Dr. Taylor Reed"
    }],
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
    imaging: [{
      id: "rad-31544",
      study: "Obstetric ultrasound",
      modality: "Ultrasound",
      bodySite: "Obstetric",
      performedAt: "2026-10-01 15:20",
      status: "Final",
      indication: "Routine prenatal follow-up",
      report: "Single intrauterine pregnancy noted in this fictional sample report. Refer to the complete imaging record.",
      radiologist: "Dr. Morgan Ellis"
    }],
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
  ["Noah Patel", 63, "Male", "Knee osteoarthritis", "Chronic knee pain; prior meniscal repair; walks daily.", "Sulfa drugs", "Acetaminophen as needed", "Right knee radiographs, 3 views", "X-ray", "Right knee", "Chronic knee pain", "Mild medial compartment joint-space narrowing; no acute fracture.", {
    study: "Right knee MRI without contrast",
    modality: "MRI",
    bodySite: "Right knee",
    indication: "Persistent pain despite conservative management",
    report: "Mild cartilage thinning and chronic postoperative meniscal changes; no acute ligament injury described in this fictional report."
  }],
  ["Grace Kim", 52, "Female", "Asthma", "Intermittent wheeze; childhood asthma; seasonal allergies.", "None listed", "Albuterol inhaler", "Chest radiograph, 2 views", "X-ray", "Chest", "Cough and wheeze", "Lungs are clear; no focal air-space opacity or pleural effusion."],
  ["Ethan Brooks", 46, "Male", "Nephrolithiasis", "Prior kidney stone; episodic flank discomfort; no prior procedures.", "Codeine", "None listed", "Renal ultrasound", "Ultrasound", "Kidneys and bladder", "Flank discomfort", "No hydronephrosis identified; small simple-appearing renal cyst noted."],
  ["Isabella Chen", 35, "Female", "Cholelithiasis", "Intermittent post-meal abdominal discomfort; prior appendectomy.", "Latex", "None listed", "Right upper quadrant ultrasound", "Ultrasound", "Right upper quadrant", "Abdominal discomfort", "Gallstones are present; no gallbladder wall thickening in this sample report."],
  ["Lucas Rivera", 71, "Male", "Chronic obstructive pulmonary disease", "Former smoker; COPD; recent increase in exertional dyspnea.", "Penicillin", "Tiotropium, albuterol", "Chest CT without contrast", "CT", "Chest", "Dyspnea follow-up", "Emphysematous change is described; no focal pulmonary mass identified.", {
    study: "Follow-up chest radiograph, 2 views",
    modality: "X-ray",
    bodySite: "Chest",
    indication: "Interval assessment of exertional dyspnea",
    report: "Hyperinflation is noted without focal air-space opacity or pleural effusion in this fictional report."
  }],
  ["Mia Johnson", 24, "Female", "Ankle sprain", "Twisted left ankle during recreation; no prior fractures.", "None listed", "None listed", "Left ankle radiographs, 3 views", "X-ray", "Left ankle", "Left ankle pain after twisting injury", "No acute fracture or dislocation identified."],
  ["Benjamin Clark", 59, "Male", "Lumbar radiculopathy", "Recurrent low-back pain with leg symptoms; remote lifting injury.", "Morphine", "Naproxen as needed", "Lumbar spine MRI without contrast", "MRI", "Lumbar spine", "Persistent low-back symptoms", "Mild multilevel degenerative changes; no acute osseous finding."],
  ["Amara Okafor", 44, "Female", "Thyroid nodule", "Incidental thyroid nodule on prior imaging; no neck surgery.", "Iodinated contrast", "Levothyroxine", "Thyroid ultrasound", "Ultrasound", "Thyroid", "Nodule follow-up", "Stable-appearing right thyroid nodule; comparison with prior study recommended.", {
    src: "assets/imaging/thyroid-ultrasound.jpg",
    creator: "Drahreg01",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:SD-Sono002.jpg",
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/"
  }, {
    study: "Repeat thyroid ultrasound",
    modality: "Ultrasound",
    bodySite: "Thyroid",
    indication: "Interval surveillance of known right thyroid nodule",
    report: "Right thyroid nodule is unchanged in size compared with the prior study in this fictional report."
  }],
  ["Oliver Davis", 68, "Male", "Heart failure with preserved ejection fraction", "Hypertension; prior admission for fluid overload; followed by cardiology.", "Aspirin", "Furosemide, losartan", "Chest radiograph, 2 views", "X-ray", "Chest", "Follow-up of exertional breathlessness", "Mild cardiomegaly; no focal air-space opacity in this sample report."],
  ["Chloe Martin", 31, "Female", "Endometriosis", "Pelvic pain; prior diagnostic laparoscopy; under gynecology care.", "None listed", "Combined oral contraceptive", "Pelvic MRI", "MRI", "Pelvis", "Pelvic pain evaluation", "Small endometrioma-like lesion described; correlate with specialist assessment."],
  ["Samuel Wilson", 56, "Male", "Diverticulosis", "Intermittent abdominal discomfort; prior colonoscopy; no abdominal surgery.", "Metronidazole", "None listed", "CT abdomen and pelvis with contrast", "CT", "Abdomen and pelvis", "Abdominal discomfort", "Colonic diverticulosis without acute inflammatory change."],
  ["Layla Hassan", 39, "Female", "Rotator cuff tendinopathy", "Shoulder pain after repetitive work; prior physical therapy.", "None listed", "Topical diclofenac", "Right shoulder MRI without contrast", "MRI", "Right shoulder", "Persistent shoulder pain", "Mild supraspinatus tendinopathy; no full-thickness tear described.", {
    src: "assets/imaging/shoulder-mri.png",
    creator: "Hellerhoff",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Post_Dislocated_shoulder_MRI_01.png",
    license: "CC BY-SA 3.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/"
  }],
  ["Henry Moore", 74, "Male", "Osteoporosis", "Prior wrist fracture; treated for low bone density; former smoker.", "None listed", "Calcium, vitamin D", "DEXA bone density study", "DEXA", "Lumbar spine and hips", "Bone density monitoring", "Bone mineral density remains below the expected range for age in this sample."],
  ["Zoe Thompson", 29, "Female", "Sinusitis", "Recurrent sinus symptoms; seasonal rhinitis; no facial surgery.", "Amoxicillin", "Cetirizine", "CT paranasal sinuses without contrast", "CT", "Paranasal sinuses", "Recurrent sinus symptoms", "Mild maxillary mucosal thickening; no fluid level identified."],
  ["Daniel Garcia", 61, "Male", "Carotid artery stenosis", "Hyperlipidemia; former smoker; prior vascular clinic follow-up.", "Shellfish", "Atorvastatin", "Carotid duplex ultrasound", "Ultrasound", "Carotid arteries", "Surveillance study", "Mild plaque bilaterally without hemodynamically significant stenosis described."],
  ["Priya Nair", 48, "Female", "Breast cyst", "Prior benign breast cyst; routine imaging follow-up; no breast surgery.", "None listed", "None listed", "Diagnostic mammogram and breast ultrasound", "Mammogram / Ultrasound", "Breasts", "Follow-up of known breast cyst", "Stable benign-appearing cystic finding; routine follow-up suggested in this mock report."],
  ["Caleb Turner", 19, "Male", "Concussion, subsequent visit", "Sports-related head impact; no loss of consciousness reported; no prior neurologic history.", "None listed", "None listed", "Head CT without contrast", "CT", "Head", "Follow-up after head injury", "No acute intracranial finding identified in this fictional sample.", {
    src: "assets/imaging/brain-ct.png",
    creator: "Department of Radiology, Uppsala University Hospital; uploaded by Mikael Häggström",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Computed_tomography_of_human_brain_-_large.png",
    license: "CC0 1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/"
  }],
  ["Nora Williams", 66, "Female", "Peripheral neuropathy", "Type 2 diabetes; chronic foot numbness; prior podiatry visits.", "Gabapentin", "Metformin", "Left foot radiographs, 3 views", "X-ray", "Left foot", "Chronic foot symptoms", "No acute fracture; mild first metatarsophalangeal degenerative change."],
  ["Mateo Silva", 42, "Male", "Hepatic steatosis", "Elevated liver enzymes on prior screening; no abdominal surgery.", "None listed", "None listed", "Abdominal ultrasound", "Ultrasound", "Liver and biliary system", "Follow-up of liver enzyme elevation", "Increased hepatic echogenicity compatible with steatosis in this mock report."]
];

function createDemoPatient(scenario, index) {
  const [name, age, sex, diagnosis, history, allergy, medication, study, modality, bodySite, indication, report, imageOrFollowUp, followUpStudy] = scenario;
  const image = imageOrFollowUp && typeof imageOrFollowUp === "object" && imageOrFollowUp.src ? imageOrFollowUp : null;
  const additionalStudy = imageOrFollowUp && typeof imageOrFollowUp === "object" && !image ? imageOrFollowUp : followUpStudy;
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
    ...(image ? { image } : {}),
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
    imaging: [
      imaging,
      ...(additionalStudy ? [{
        id: `rad-demo-${id}-followup`,
        ...additionalStudy,
        performedAt: `2026-09-${String(4 + (index % 27)).padStart(2, "0")} ${String(10 + (index % 7)).padStart(2, "0")}:00`,
        status: "Final",
        radiologist: `Dr. ${["Morgan Ellis", "Riley Bennett", "Jordan Park", "Taylor Reed"][index % 4]}`
      }] : [])
    ],
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

const departments = [
  { name: "Emergency Department", code: "ED", locations: ["ED Triage", "ED Bay 1", "ED Bay 2"], description: "Emergency assessment, triage, and stabilization." },
  { name: "Medical Intensive Care", code: "MICU", locations: ["MICU 1", "MICU 2"], description: "Medical critical-care service." },
  { name: "Surgical Intensive Care", code: "SICU", locations: ["SICU 1", "SICU 2"], description: "Post-operative and surgical critical care." },
  { name: "Neonatal Intensive Care", code: "NICU", locations: ["NICU 1", "NICU 2"], description: "Newborn intensive-care service." },
  { name: "Radiology", code: "RAD", locations: ["Radiology", "CT", "MRI", "Ultrasound"], description: "Diagnostic imaging and report coordination." },
  { name: "Surgery", code: "SURG", locations: ["Pre-op", "Operating Room 1", "Recovery 1"], description: "Perioperative assessment and surgical care." },
  { name: "Obstetrics & Gynecology", code: "OB/GYN", locations: ["Labor & Delivery", "Women’s Health"], description: "Obstetric and gynecologic services." },
  { name: "Pediatrics", code: "PEDS", locations: ["Pediatrics Ward", "Pediatric Clinic"], description: "Care for infants, children, and adolescents." },
  { name: "Neurology", code: "NEURO", locations: ["Neurology Ward", "Neuro Clinic"], description: "Neurologic assessment and inpatient care." },
  { name: "Telemetry", code: "TELE", locations: ["Telemetry 3A", "Telemetry 3B"], description: "Monitored inpatient care." },
  { name: "Medicine", code: "MED", locations: ["Ward 2 · 214", "Ward 2 · 216", "Ward 3 · 302"], description: "General medical inpatient care." }
];

const locations = departments.flatMap((department) => department.locations.map((name, index) => ({
  name,
  department: department.name,
  kind: /ward|telemetry|micu|sicu|nicu|recovery/i.test(name) ? "Inpatient" : "Care area",
  capacity: /ward|telemetry|micu|sicu|nicu/i.test(name) ? 12 + index * 2 : 8
})));

const defaultStaffDirectory = [
  { id: "staff-joe-spartan", name: "Joe Spartan, MD", title: "Physician", role: "Provider", department: "Medicine", location: "Main campus", email: "joe.spartan@example.test", status: "Active" },
  { id: "staff-elena-ruiz", name: "Dr. Elena Ruiz", title: "Physician · Internal Medicine", role: "Provider", department: "Medicine", location: "Ward 2 · 214", email: "elena.ruiz@example.test", status: "Active" },
  { id: "staff-amir-hassan", name: "Dr. Amir Hassan", title: "Physician · Surgery", role: "Provider", department: "Surgery", location: "Recovery 1", email: "amir.hassan@example.test", status: "Active" },
  { id: "staff-priya-singh", name: "Dr. Priya Singh", title: "Physician · Obstetrics & Gynecology", role: "Provider", department: "Obstetrics & Gynecology", location: "Labor & Delivery", email: "priya.singh@example.test", status: "Active" },
  { id: "staff-jordan-lee", name: "Jordan Lee", title: "Registered Nurse", role: "Nurse", department: "Telemetry", location: "Telemetry 3A", email: "jordan.lee@example.test", status: "Active" },
  { id: "staff-casey-nguyen", name: "Casey Nguyen", title: "Registered Nurse", role: "Nurse", department: "Emergency Department", location: "ED Triage", email: "casey.nguyen@example.test", status: "Active" },
  { id: "staff-sam-carter", name: "Sam Carter", title: "Registered Nurse", role: "Nurse", department: "Medical Intensive Care", location: "MICU 1", email: "sam.carter@example.test", status: "Active" },
  { id: "staff-riley-bennett", name: "Riley Bennett", title: "Physician Assistant", role: "PA", department: "Surgery", location: "Recovery 1", email: "riley.bennett@example.test", status: "Active" },
  { id: "staff-jamie-brooks", name: "Jamie Brooks", title: "Nurse Practitioner", role: "Midlevel", department: "Pediatrics", location: "Pediatrics Ward", email: "jamie.brooks@example.test", status: "Active" },
  { id: "staff-morgan-ellis", name: "Dr. Morgan Ellis", title: "Radiologist", role: "Provider", department: "Radiology", location: "Radiology", email: "morgan.ellis@example.test", status: "Active" },
  { id: "staff-taylor-reed", name: "Dr. Taylor Reed", title: "Radiologist", role: "Provider", department: "Radiology", location: "Radiology", email: "taylor.reed@example.test", status: "Active" },
  { id: "staff-alex-morgan", name: "Alex Morgan", title: "System Administrator", role: "Administrator", department: "Administration", location: "Administration", email: "alex.morgan@example.test", status: "Active" }
];

const staffPortraits = new Map([
  ["staff-joe-spartan", "assets/joe-spartan.jpg?v=3"],
  ["staff-elena-ruiz", "assets/elena-ruiz.jpg"],
  ["staff-amir-hassan", "assets/amir-hassan.jpg"],
  ["staff-priya-singh", "assets/priya-singh.jpg"],
  ["staff-jordan-lee", "assets/jordan-lee.jpg"],
  ["staff-casey-nguyen", "assets/casey-nguyen.jpg"],
  ["staff-sam-carter", "assets/sam-carter.jpg"],
  ["staff-riley-bennett", "assets/riley-bennett.jpg"],
  ["staff-jamie-brooks", "assets/jamie-brooks.jpg"],
  ["staff-morgan-ellis", "assets/morgan-ellis.jpg?v=3"],
  ["staff-taylor-reed", "assets/taylor-reed.jpg"]
]);

allInitialPatients.forEach((patient, index) => {
  const providerName = patient.provider || "Unassigned";
  if (!defaultStaffDirectory.some((staff) => staff.name === providerName)) {
    defaultStaffDirectory.push({
      id: `staff-provider-${patient.id}`,
      name: providerName,
      title: "Medical provider",
      role: "Provider",
      department: departments[index % departments.length].name,
      location: patient.room || "Main campus",
      email: `provider-${patient.id}@example.test`,
      status: "Active"
    });
  }
});

const sampleAdmissionAssignments = {
  2: { department: "Telemetry", location: "Telemetry 3A", nurse: "Jordan Lee", disposition: "Admit to ward" },
  5: { department: "Medicine", location: "Ward 2 · 214", nurse: "Casey Nguyen", disposition: "Admit to ward" },
  8: { department: "Surgery", location: "Recovery 1", nurse: "Sam Carter", disposition: "Admit to ward" },
  11: { department: "Medical Intensive Care", location: "MICU 1", nurse: "Sam Carter", disposition: "Admit to ICU" },
  14: { department: "Surgical Intensive Care", location: "SICU 1", nurse: "Jordan Lee", disposition: "Admit to ICU" },
  17: { department: "Neurology", location: "Neurology Ward", nurse: "Casey Nguyen", disposition: "Admit to ward" },
  20: { department: "Pediatrics", location: "Pediatrics Ward", nurse: "Casey Nguyen", disposition: "Admit to ward" },
  23: { department: "Obstetrics & Gynecology", location: "Labor & Delivery", nurse: "Jordan Lee", disposition: "Admit to ward" }
};

function textField(name, label, placeholder = "", required = false) {
  return { name, label, placeholder, required, type: "text" };
}

function numberField(name, label, placeholder = "", required = false) {
  return { name, label, placeholder, required, type: "number" };
}

function selectField(name, label, options, required = false) {
  return { name, label, options, required, type: "select" };
}

function noteField(name, label, placeholder = "", required = false) {
  return { name, label, placeholder, required, type: "textarea" };
}

const orderTypeFields = {
  Nursing: [
    selectField("discipline", "Nursing discipline", ["Registered nurse", "Licensed practical nurse", "Wound care", "Other"], true),
    selectField("nursingFrequency", "Frequency", ["Once", "Every shift", "Daily", "As needed", "Continuous"], true),
    textField("nursingDuration", "Duration", "e.g., 24 hours, until discharge"),
    noteField("nursingInterventions", "Care instructions", "Assessment focus, interventions, precautions, and escalation instructions", true)
  ],
  Vitals: [
    selectField("vitalSet", "Observation set", ["Routine vitals", "Orthostatic vitals", "Neurological observations", "Post-procedure observations", "Other"], true),
    selectField("vitalFrequency", "Frequency", ["Once", "Every 15 minutes", "Every 30 minutes", "Hourly", "Every 4 hours", "Every shift"], true),
    textField("vitalDuration", "Duration", "e.g., 4 hours, until stable"),
    noteField("notifyParameters", "Notify clinician if", "Document patient-specific thresholds or concerning changes")
  ],
  Diagnosis: [
    textField("diagnosisCode", "Code system / code", "e.g., ICD-10-CM code"),
    selectField("diagnosisRole", "Diagnosis role", ["Primary", "Secondary", "Differential", "Problem list"], true),
    selectField("diagnosisStatus", "Status", ["Active", "Historical", "Resolved", "Rule out"], true),
    textField("diagnosisOnset", "Onset / effective date", "Date or approximate onset"),
    noteField("diagnosisEvidence", "Clinical basis", "Relevant findings supporting this diagnosis")
  ],
  "History & physical": [
    selectField("hAndPType", "H&P type", ["Admission", "Pre-operative", "Consultative"], true),
    textField("hAndPRequestedBy", "Requesting service", "Service or clinician"),
    noteField("hAndPScope", "Requested history / exam scope", "Document the requested assessment and pertinent context", true)
  ],
  Laboratory: [
    textField("labTest", "Test / panel", "Test name or panel", true),
    selectField("labSpecimen", "Specimen", ["Blood", "Urine", "Swab", "Stool", "Other / see instructions"], true),
    selectField("labTiming", "Collection timing", ["Routine", "Timed", "Fasting", "Now"], true),
    textField("labCollectionDate", "Collection date / time", "If timed"),
    noteField("labClinicalInfo", "Clinical indication / collection notes", "Relevant context and special collection instructions")
  ],
  "Imaging / Radiology": [
    textField("imagingStudy", "Study requested", "e.g., chest radiograph, CT abdomen", true),
    selectField("imagingModality", "Modality", ["X-ray", "CT", "MRI", "Ultrasound", "Mammography", "DEXA", "Other"], true),
    textField("imagingBodySite", "Body site / laterality", "Specify anatomy and side"),
    selectField("imagingContrast", "Contrast", ["Not applicable", "Without contrast", "With contrast", "Without and with contrast", "Per radiology protocol"], true),
    selectField("pregnancyStatus", "Pregnancy status (when applicable)", ["Not applicable", "Not pregnant", "Pregnant", "Unknown / verify"], false),
    noteField("imagingIndication", "Clinical indication / protocol notes", "Symptoms, relevant history, comparison studies, and protocol requests", true)
  ],
  Consult: [
    selectField("consultSpecialty", "Consulting department", departments.map((department) => department.name), true),
    selectField("consultUrgency", "Requested timeframe", ["Routine", "Within 24 hours", "Urgent", "STAT"], true),
    noteField("consultQuestion", "Clinical question", "State the focused question or service requested", true),
    textField("consultContact", "Requesting clinician / callback", "Name or extension")
  ],
  Procedure: [
    textField("procedureName", "Procedure", "Procedure requested", true),
    textField("procedureSite", "Site / laterality", "Anatomy and side, if applicable"),
    noteField("procedureIndication", "Indication", "Reason the procedure is requested", true),
    selectField("procedureConsent", "Consent status", ["Not applicable", "Pending", "Obtained", "Documented separately"], true),
    selectField("procedureSedation", "Sedation / anesthesia", ["None planned", "Local", "Moderate sedation", "Anesthesia review required", "Per procedural team"], true),
    noteField("procedurePrecautions", "Precautions / preparation", "Anticoagulation, fasting, equipment, monitoring, and aftercare considerations")
  ],
  Medication: [
    textField("medicationName", "Medication", "Generic or brand name", true),
    textField("medicationDose", "Dose", "Amount and units", true),
    selectField("medicationRoute", "Route", ["Oral", "IV", "IM", "Subcutaneous", "Topical", "Inhaled", "Other"], true),
    textField("medicationFrequency", "Frequency / schedule", "e.g., once, twice daily, as needed", true),
    textField("medicationDuration", "Duration", "Duration or stop date"),
    numberField("medicationQuantity", "Quantity", "Units to dispense"),
    numberField("medicationRefills", "Refills", "0"),
    textField("medicationPharmacy", "Pharmacy", "Destination pharmacy"),
    noteField("medicationIndication", "Indication / monitoring", "Reason for use, precautions, and monitoring notes")
  ],
  Referral: [
    selectField("referralSpecialty", "Referral service", ["Primary care", "Cardiology", "Neurology", "Orthopedics", "Oncology", "Behavioral health", "Other specialist"], true),
    textField("referralDestination", "Receiving clinician / destination", "Clinic, clinician, or service"),
    selectField("referralUrgency", "Requested timeframe", ["Routine", "Within 2 weeks", "Within 48 hours", "Same day"], true),
    noteField("referralReason", "Reason for referral / clinical question", "Specific question or service requested", true),
    noteField("referralRecords", "Records to include / coordination notes", "Relevant results, imaging, medications, and contact details")
  ]
};

const documentTypeFields = {
  "ED provider note": [
    noteField("chiefConcern", "Chief concern", "Presenting problem in the patient's own words", true),
    noteField("hpi", "History of present illness", "Onset, location, duration, character, aggravating/relieving factors, associated symptoms, and pertinent context", true),
    noteField("relevantHistory", "Relevant medical / surgical history", "Pertinent conditions, procedures, medications, and allergies"),
    noteField("edReviewSystems", "Focused review of systems", "Pertinent positives and negatives"),
    noteField("edExam", "Focused examination", "Document relevant findings by system", true),
    noteField("edDiagnostics", "Diagnostics reviewed", "Labs, imaging, ECG, and other results reviewed"),
    noteField("edAssessment", "Medical decision making / assessment", "Differential, risk, interpretation, and working diagnoses", true),
    noteField("edPlan", "Treatment, reassessment, and disposition", "Interventions, response, consultant discussions, and disposition plan", true)
  ],
  "History & physical": [
    textField("historian", "Historian / source", "Patient, family, records, interpreter", true),
    selectField("historyReliability", "History reliability", ["Reliable", "Limited", "Unable to obtain", "Other"], true),
    noteField("hpi", "History of present illness", "Timeline, symptoms, context, and pertinent positives/negatives", true),
    noteField("pastMedicalHistory", "Past medical history", "Chronic and prior conditions"),
    noteField("pastSurgicalHistory", "Past surgical history", "Procedures and approximate dates"),
    noteField("medicationsAllergies", "Medications and allergies", "Reconciliation, doses when known, reactions, and status", true),
    noteField("familySocialHistory", "Family and social history", "Relevant family history, living situation, occupation, tobacco, alcohol, and substances"),
    noteField("hAndPRos", "Review of systems", "Pertinent positives and negatives by system", true),
    noteField("hAndPExam", "Physical examination", "General and system-based exam with pertinent findings", true),
    noteField("hAndPData", "Vitals and diagnostic data", "Vital signs and pertinent laboratory / imaging data reviewed"),
    noteField("hAndPAssessment", "Assessment / problem list", "Problem-by-problem assessment", true),
    noteField("hAndPPlan", "Plan", "Plan by problem, monitoring, consultations, and follow-up", true)
  ],
  "Admission note": [
    textField("admittingDiagnosis", "Admitting diagnosis", "Primary reason for admission", true),
    textField("admittingService", "Admitting service / attending", "Service and responsible clinician", true),
    selectField("levelOfCare", "Level of care", ["Medical ward", "Telemetry", "Step-down", "ICU", "Observation"], true),
    selectField("codeStatus", "Code status", ["Not reviewed", "Full code", "DNR", "DNI", "See documented goals of care"], true),
    textField("expectedStay", "Expected length of stay", "Estimate or reassessment point"),
    noteField("admissionHpi", "Presenting history and reason for admission", "Presentation, workup, and admission rationale", true),
    noteField("admissionExam", "Admission exam / current condition", "Current status, pertinent findings, and stability"),
    noteField("admissionProblems", "Active problems and risk factors", "Problem list, comorbidities, allergies, and precautions"),
    noteField("admissionPlan", "Initial inpatient plan", "Monitoring, initial management, consultations, and goals", true),
    noteField("admissionReconciliation", "Medication reconciliation / handoff", "Home medications, holds, outstanding tasks, and handoff needs")
  ],
  "Admission H&P": [
    noteField("admissionHpiFull", "History of present illness", "Presentation, timeline, and relevant context", true),
    noteField("admissionHistoryFull", "Medical, surgical, family, and social history", "Relevant history and source"),
    noteField("admissionMedsFull", "Medications and allergies", "Medication reconciliation and allergy reactions", true),
    noteField("admissionReviewFull", "Review of systems", "Pertinent positives and negatives", true),
    noteField("admissionExamFull", "Physical examination", "System-based examination and findings", true),
    noteField("admissionAssessmentFull", "Assessment and active problems", "Problem-based assessment", true),
    noteField("admissionPlanFull", "Initial plan", "Monitoring, investigations, care coordination, and goals", true)
  ],
  "SOAP progress note": [
    noteField("subjective", "S · Subjective", "Patient report, interval events, symptoms, and concerns", true),
    noteField("objective", "O · Objective", "Vitals, examination, intake/output, labs, imaging, and other observed data", true),
    noteField("assessment", "A · Assessment", "Problem-based assessment and clinical status", true),
    noteField("plan", "P · Plan", "Actions, orders, monitoring, consultations, and follow-up", true),
    noteField("soapSafety", "Safety / care coordination", "Precautions, lines, mobility, nutrition, communication, and barriers")
  ],
  "Consult note": [
    textField("consultService", "Consulting service / clinician", "Specialty and consultant"),
    textField("consultRequester", "Requesting clinician / service", "Referring team and contact"),
    noteField("consultQuestion", "Reason for consultation / specific question", "Question to be addressed", true),
    noteField("consultHistory", "Relevant history and record review", "History, medications, allergies, and data reviewed"),
    noteField("consultFindings", "Consult examination / findings", "Focused examination and review of results", true),
    noteField("consultImpression", "Impression / recommendations", "Consultant's assessment and recommendations", true),
    noteField("consultFollowup", "Follow-up / communication", "Actions, ownership, and communication back to the primary team")
  ],
  "Consultation note": [
    textField("consultServiceFull", "Consulting department / clinician", "Specialty and consultant", true),
    textField("consultRequestingService", "Requesting service", "Service or clinician"),
    noteField("consultQuestionFull", "Consult question", "Focused question to be addressed", true),
    noteField("consultRecordReview", "Relevant record review", "History, medications, allergies, and pertinent data"),
    noteField("consultExamFull", "Focused examination and findings", "Exam and results reviewed", true),
    noteField("consultAssessmentFull", "Impression and recommendations", "Consultant assessment and recommendations", true),
    noteField("consultCommunication", "Communication and follow-up", "Recommendations communicated to and accepted by the care team")
  ],
  "Nursing note": [
    selectField("nursingShift", "Shift / note type", ["Shift assessment", "Focused assessment", "Care update", "Handoff", "Other"], true),
    noteField("nursingAssessment", "Assessment and patient-reported concerns", "Neurologic, respiratory, cardiac, skin, pain, and other relevant findings", true),
    noteField("nursingVitals", "Vitals / pain reassessment", "Values, time, trends, and response"),
    noteField("nursingInterventions", "Interventions / care delivered", "Medication administration record reference, care, education, and safety checks"),
    noteField("nursingResponse", "Patient response / outcome", "Tolerance, response, and goal progress", true),
    noteField("nursingEscalation", "Notifications / escalation", "Who was notified, when, response, and pending actions"),
    noteField("nursingHandoff", "Handoff / next-shift priorities", "Outstanding tasks and continuity plan")
  ],
  "Procedure note": [
    textField("procedurePerformed", "Procedure performed", "Procedure and indication", true),
    textField("procedureDateTime", "Date / time", "When performed"),
    textField("procedureOperator", "Operator / assistants", "Names and roles"),
    textField("procedureAnesthesia", "Anesthesia / sedation", "Type and monitoring"),
    selectField("procedureConsentStatus", "Consent", ["Obtained and documented", "Emergency exception documented", "Not applicable"], true),
    noteField("procedureTimeOut", "Time-out / site verification", "Patient, procedure, site/laterality, and team confirmation"),
    noteField("procedureTechnique", "Technique / findings", "Preparation, approach, key steps, and findings", true),
    noteField("procedureSpecimens", "Specimens / implants / devices", "Items collected, implanted, or used"),
    noteField("procedureComplications", "Estimated blood loss / complications", "Include none if applicable"),
    noteField("procedurePostCare", "Post-procedure condition / plan", "Disposition, monitoring, instructions, and follow-up", true)
  ],
  "Discharge summary": [
    noteField("dischargeDiagnoses", "Discharge diagnoses", "Primary and secondary diagnoses", true),
    noteField("dischargeCourse", "Reason for admission and hospital course", "Key events, treatments, consultations, and response", true),
    noteField("dischargeCondition", "Condition at discharge", "Status, examination, and destination", true),
    noteField("dischargeMedicationChanges", "Medication reconciliation / changes", "Started, stopped, changed, and continued medicines; confirm separately"),
    noteField("dischargeInstructions", "Patient / caregiver instructions", "Self-care, equipment, activity, diet, and education", true),
    noteField("dischargeFollowup", "Follow-up appointments / referrals", "Clinician, service, timeframe, and pending results", true),
    noteField("dischargePrecautions", "Return precautions / contact plan", "Symptoms requiring urgent evaluation and how to obtain help", true),
    noteField("dischargeDisposition", "Discharge destination / transport", "Home, facility, transfer, and transport arrangements")
  ],
  "Disposition note": [
    selectField("dispositionDecision", "Disposition decision", ["Admit to ward", "Admit to ICU", "Discharge home", "Transfer", "Observation"], true),
    textField("dispositionDestination", "Destination / receiving service", "Unit, facility, or responsible service", true),
    noteField("dispositionCondition", "Condition at disposition", "Status and pertinent reassessment", true),
    noteField("dispositionRationale", "Disposition rationale", "Document decision context and coordination", true),
    noteField("dispositionHandoff", "Handoff / follow-up plan", "Receiving team, pending items, and follow-up")
  ],
  "Referral letter": [
    textField("referralTo", "To / receiving clinician", "Name, specialty, and clinic", true),
    textField("referralFrom", "From / referring clinician", "Name, service, and contact details", true),
    selectField("referralPriority", "Priority / requested timeframe", ["Routine", "Within 2 weeks", "Within 48 hours", "Urgent / same day"], true),
    noteField("referralQuestion", "Reason for referral / requested service", "Specific question or requested evaluation", true),
    noteField("referralSummary", "Clinical summary and relevant history", "Presentation, course, relevant history, medications, and allergies", true),
    noteField("referralInvestigations", "Investigations attached / pending", "Results, imaging, and outstanding tests"),
    noteField("referralRequest", "Requested action / follow-up", "Next steps, communication, and return of recommendations")
  ]
};

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

function addPatientEvent(patient, type, title, details = "", timestamp = new Date().toISOString(), target = {}) {
  const event = {
    id: createRecordId("event"),
    type,
    title,
    details,
    timestamp,
    ...target
  };
  patient.events.unshift(event);
  return event;
}

function toTimelineDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const now = new Date();
  if (/^today\b/i.test(raw)) {
    const timeMatch = raw.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      let hour = Number(timeMatch[1]);
      if (timeMatch[3]?.toUpperCase() === "PM" && hour < 12) hour += 12;
      if (timeMatch[3]?.toUpperCase() === "AM" && hour === 12) hour = 0;
      now.setHours(hour, Number(timeMatch[2]), 0, 0);
    }
    return now;
  }
  if (/^yesterday\b/i.test(raw)) {
    now.setDate(now.getDate() - 1);
    return now;
  }
  const daysAgoMatch = raw.match(/^(\d+)\s+days?\s+ago\b/i);
  if (daysAgoMatch) {
    now.setDate(now.getDate() - Number(daysAgoMatch[1]));
    return now;
  }
  const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const date = new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]));
    return date.getFullYear() === Number(dateOnlyMatch[1]) &&
      date.getMonth() === Number(dateOnlyMatch[2]) - 1 &&
      date.getDate() === Number(dateOnlyMatch[3])
      ? date
      : null;
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTimelineDate(value) {
  const date = toTimelineDate(value);
  if (!date) return value || "Date not recorded";
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value).trim())) {
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  }
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function recordVitals(patient, values, source) {
  if (!Object.keys(values).length) return;
  const snapshot = { ...patient.vitals, ...values };
  patient.vitals = snapshot;
  patient.clinical.vitals = { ...patient.clinical.vitals, ...values };
  const recordedAt = new Date().toISOString();
  const reading = { id: createRecordId("vital"), values: snapshot, recordedAt, source };
  patient.vitalReadings.unshift(reading);
  addPatientEvent(patient, "Vitals", "Vital signs recorded", source, recordedAt, {
    targetView: "patients",
    targetId: `patient-vital-${reading.id}`
  });
}

function buildPatientTimeline(patient) {
  const items = [];
  const now = Date.now();
  const admissionAt = patient.clinical?.admissionAt || "";
  const admissionTime = toTimelineDate(admissionAt)?.getTime() ?? null;
  const admitted = patient.clinical?.stage === "Admission" ||
    ["Admit to ward", "Admit to ICU"].includes(patient.clinical?.disposition);

  const addItem = (item) => {
    const time = toTimelineDate(item.timestamp)?.getTime() ?? null;
    let phase = item.phase;
    if (!phase) {
      if (item.planned && (!item.scheduleBased || time === null || time > now)) {
        phase = "planned";
      } else if (item.current || (item.planned && item.scheduleBased && time !== null && time <= now)) {
        phase = "current";
      } else if (time !== null && time > now) {
        phase = "planned";
      } else if (time !== null) {
        phase = "previous";
      } else {
        phase = "undated";
      }
    }

    if (admissionTime !== null && time !== null && time < admissionTime) return;
    items.push({ ...item, phase, sortTime: time, fallbackTime: item.fallbackTime || "Date not recorded" });
  };

  if (admissionAt) {
    addItem({
      id: `timeline-admission-${patient.id}`,
      type: "Admission",
      title: "Admission started",
      details: "Patient admission recorded in the encounter workflow.",
      detailRows: [["Admission date", formatTimelineDate(admissionAt)]],
      timestamp: admissionAt,
      phase: "previous",
      targetView: "clinical",
      targetId: "workflowForm"
    });
  } else if (admitted) {
    addItem({
      id: `timeline-admission-${patient.id}`,
      type: "Admission",
      title: "Admission date not recorded",
      details: "The chart is marked as admitted, but no admission timestamp is available.",
      detailRows: [["Admission date", "Not recorded"]],
      timestamp: "",
      fallbackTime: "Date not recorded",
      targetView: "clinical",
      targetId: "workflowForm"
    });
  }

  if (patient.diagnosis) {
    addItem({
      id: `timeline-diagnosis-${patient.id}`,
      type: "Diagnosis",
      title: patient.diagnosis,
      details: "Primary problem on the patient chart",
      detailRows: [
        ["Status", patient.status],
        ["Priority", patient.priority],
        ["Provider", patient.provider]
      ],
      timestamp: "",
      fallbackTime: "Current chart problem",
      phase: "current",
      targetView: "patients",
      targetId: "patient-status-dashboard"
    });
  }

  (patient.labs || [])
    .filter((lab) => !/fictional demonstration values/i.test(lab))
    .forEach((lab, index) => {
      addItem({
        id: `timeline-lab-${patient.id}-${index}`,
        type: "Laboratory",
        title: lab,
        details: "Lab marker on the patient chart",
        detailRows: [
          ["Result", lab],
          ["Recorded", patient.labRecords?.[index]?.recordedAt || "Date not recorded"]
        ],
        timestamp: patient.labRecords?.[index]?.recordedAt || "",
        fallbackTime: patient.labRecords?.[index]?.recordedAt || "Date not recorded",
        targetView: "labs",
        targetId: `patient-lab-${patient.id}-${index}`
      });
    });

  (patient.carePlan?.tasks || []).forEach((task, index) => {
    const taskId = task.id || `${patient.id}-${index}`;
    const dueDate = task.dueDate || patient.carePlan?.followUpDate || "";
    const dueTime = toTimelineDate(dueDate)?.getTime() ?? null;
    addItem({
      id: `timeline-task-${taskId}`,
      type: "Care plan",
      title: task.label,
      details: task.status === "Done" ? "Completed care task" : "Care plan task",
      detailRows: [
        ["Status", task.status],
        ["Due date", dueDate || "Not recorded"],
        ...(task.createdAt ? [["Created", formatTimelineDate(task.createdAt)]] : []),
        ...(task.completedAt ? [["Completed", formatTimelineDate(task.completedAt)]] : [])
      ],
      timestamp: task.status === "Done" ? task.completedAt : task.createdAt || dueDate,
      fallbackTime: task.status === "Done" && !task.completedAt
        ? "Completion date not recorded"
        : dueDate ? `Due ${formatTimelineDate(dueDate)}` : "Date not recorded",
      phase: task.status === "Done" && task.completedAt ? "previous" : undefined,
      planned: task.status !== "Done" && dueTime !== null && dueTime > now,
      current: task.status !== "Done" && (dueTime === null || dueTime <= now),
      targetView: "patients",
      targetId: `patient-care-task-${taskId}`
    });
  });

  const followUpDate = patient.carePlan?.followUpDate || "";
  if (followUpDate) {
    const hasDatedFollowUp =
      (patient.appointments || []).some((appointment) =>
        appointment.scheduledAt && appointment.scheduledAt.slice(0, 10) === followUpDate.slice(0, 10)
      ) ||
      (patient.carePlan?.tasks || []).some((task) =>
        task.dueDate && task.dueDate.slice(0, 10) === followUpDate.slice(0, 10)
      );
    if (!hasDatedFollowUp) {
      const followUpTime = toTimelineDate(followUpDate);
      addItem({
        id: `timeline-follow-up-${patient.id}`,
        type: "Care plan",
        title: "Care plan follow-up",
        details: "Follow-up date recorded on the care plan.",
        detailRows: [["Follow-up date", followUpDate]],
        timestamp: followUpDate,
        fallbackTime: `Follow-up ${formatTimelineDate(followUpDate)}`,
        current: followUpTime?.toDateString() === new Date(now).toDateString(),
        targetView: "clinical",
        targetId: "workflowForm"
      });
    }
  }

  (patient.events || []).forEach((event) => {
    if (admissionAt && event.timestamp === admissionAt &&
        (event.type === "Admission" || /^patient admitted\b|^admission started\b/i.test(event.title || ""))) return;
    const reading = event.type === "Vitals"
      ? patient.vitalReadings?.find((item) => item.recordedAt && item.recordedAt === event.timestamp)
      : null;
    addItem({
      ...event,
      detailRows: [["Event details", event.details || "No additional details recorded"]],
      timestamp: event.timestamp,
      fallbackTime: "Date not recorded",
      targetView: event.targetView || "patients",
      targetId: event.targetId || (reading ? `patient-vital-${reading.id}` : `patient-timeline-row-${event.id}`)
    });
  });

  (patient.vitalReadings || []).forEach((reading) => {
    if (!reading.recordedAt || (patient.events || []).some((event) =>
      event.type === "Vitals" && event.timestamp === reading.recordedAt
    )) return;
    addItem({
      id: `timeline-${reading.id}`,
      type: "Vitals",
      title: "Vital signs recorded",
      details: reading.source || "Recorded vitals",
      detailRows: Object.entries(reading.values || {}).map(([label, value]) => [label, value]),
      timestamp: reading.recordedAt,
      targetView: "patients",
      targetId: `patient-vital-${reading.id}`
    });
  });

  (patient.documents || []).forEach((document) => {
    addItem({
      id: `timeline-${document.id}`,
      type: "Document",
      title: document.title,
      details: `${document.type} · ${document.status}`,
      detailRows: [
        ["Type", document.type],
        ["Status", document.status],
        ["Summary", document.sections?.summary || document.summary || "No summary recorded"]
      ],
      timestamp: document.createdAt || document.time,
      fallbackTime: document.time,
      targetView: "documents",
      targetId: `patient-document-${document.id}`
    });
  });

  (patient.orders || []).forEach((order) => {
    addItem({
      id: `timeline-${order.id}`,
      type: order.category,
      title: order.title,
      details: `Order · ${order.priority} priority · ${order.status}`,
      detailRows: [
        ["Category", order.category],
        ["Priority", order.priority],
        ["Status", order.status],
        ...(order.details ? [["Instructions", order.details]] : []),
        ...(order.fields || []).map((field) => [field.label, field.value])
      ],
      timestamp: order.createdAt || order.time,
      fallbackTime: order.time,
      planned: ["Pending", "Acknowledged"].includes(order.status),
      targetView: "orders",
      targetId: `patient-order-${order.id}`
    });
  });

  (patient.imaging || []).forEach((record) => {
    addItem({
      id: `timeline-${record.id}`,
      type: "Imaging",
      title: record.study,
      details: `${record.modality} · ${record.bodySite} · ${record.status}${record.indication ? ` · ${record.indication}` : ""}`,
      detailRows: [
        ["Modality", record.modality],
        ["Body site", record.bodySite],
        ["Status", record.status],
        ["Indication", record.indication],
        ["Report", record.report],
        ["Radiologist", record.radiologist]
      ],
      timestamp: record.performedAt === "Date not recorded" ? record.createdAt : record.performedAt,
      fallbackTime: record.performedAt,
      planned: ["Ordered", "Requested", "Scheduled"].includes(record.status),
      current: ["In progress", "Preliminary"].includes(record.status),
      targetView: "patients",
      targetId: `patient-imaging-${record.id}`
    });
  });

  (patient.appointments || []).forEach((appointment) => {
    const scheduledTime = toTimelineDate(appointment.scheduledAt)?.getTime() ?? null;
    const completed = ["Completed", "Cancelled"].includes(appointment.status);
    addItem({
      id: `timeline-${appointment.id}`,
      type: "Appointment",
      title: appointment.title,
      details: `${appointment.status} · ${appointment.location}`,
      detailRows: [
        ["Status", appointment.status],
        ["Location", appointment.location],
        ["Scheduled time", appointment.time]
      ],
      timestamp: completed ? appointment.updatedAt : appointment.scheduledAt,
      fallbackTime: completed && !appointment.updatedAt
        ? `${appointment.status} · date not recorded`
        : appointment.scheduledAt
          ? appointment.time
          : `Scheduled time ${appointment.time} · date not recorded`,
      planned: appointment.status === "Scheduled" && (scheduledTime === null || scheduledTime > now),
      scheduleBased: true,
      current: appointment.status === "In Progress" ||
        (appointment.status === "Scheduled" && scheduledTime !== null && scheduledTime <= now),
      targetView: "appointments",
      targetId: `patient-appointment-${appointment.id}`
    });
  });

  addItem({
    id: `timeline-current-status-${patient.id}`,
    type: "Current status",
    title: patient.status,
    details: `${patient.clinical?.stage || "Current encounter"} · ${patient.clinical?.department || "Department not recorded"} · ${patient.room || "Location not recorded"}`,
    detailRows: [
      ["Encounter stage", patient.clinical?.stage || "Not recorded"],
      ["Department", patient.clinical?.department || "Not recorded"],
      ["Location", patient.room || "Not recorded"],
      ["Attending", patient.clinical?.attending || patient.provider || "Not recorded"]
    ],
    timestamp: "",
    fallbackTime: "Current chart status",
    phase: "current",
    targetView: "patients",
    targetId: "patient-status-dashboard"
  });

  const phaseOrder = { previous: 0, current: 1, planned: 2, undated: 3 };
  return items.sort((left, right) => {
    const phaseDifference = phaseOrder[left.phase] - phaseOrder[right.phase];
    if (phaseDifference) return phaseDifference;
    if (left.sortTime === null || right.sortTime === null) return 0;
    return left.sortTime - right.sortTime;
  });
}

function normalizeTask(task) {
  if (typeof task === "string") {
    return { id: createRecordId("task"), label: task, status: "Open", createdAt: "", dueDate: "", completedAt: "" };
  }

  return {
    id: task.id || createRecordId("task"),
    label: task.label || "Care plan task",
    status: task.status || "Open",
    createdAt: task.createdAt || "",
    dueDate: task.dueDate || "",
    completedAt: task.completedAt || ""
  };
}

function normalizeAppointmentStatus(status) {
  const normalized = String(status || "Scheduled").trim().toLowerCase();
  switch (normalized) {
    case "in progress": return "In Progress";
    case "completed": return "Completed";
    case "cancelled":
    case "canceled": return "Cancelled";
    case "scheduled": return "Scheduled";
    default: return "Scheduled";
  }
}

function normalizeAppointment(appointment) {
  return {
    id: appointment.id || createAppointmentId(),
    createdAt: appointment.createdAt || "",
    scheduledAt: appointment.scheduledAt || appointment.scheduledDate || appointment.date || "",
    time: appointment.time,
    title: appointment.title,
    location: appointment.location,
    status: normalizeAppointmentStatus(appointment.status),
    updatedAt: appointment.updatedAt || ""
  };
}

function getDefaultDepartment(patient, index) {
  if (patient.age < 18) return "Pediatrics";
  if (/pregnan|obstetric/i.test(patient.diagnosis || "")) return "Obstetrics & Gynecology";
  if (/post.?op|surgical|recovery/i.test(`${patient.diagnosis || ""} ${patient.room || ""}`)) return "Surgery";
  if (/migraine|headache|neurolog|seizure/i.test(patient.diagnosis || "")) return "Neurology";
  return departments[index % departments.length].name;
}

function cleanSeedReport(report) {
  return report.replace(/ in this (?:fictional sample report|fictional report|sample report|mock report|fictional sample|sample)(?=[.,])/g, "");
}

function refreshSeedLabels(patient) {
  const seed = allInitialPatients.find((item) => item.id === patient.id && item.mrn === patient.mrn);
  if (!seed) return patient;
  const seedReports = new Map((seed.imaging || []).map((record) => [record.id, record.report]));
  const updateNote = (note) => note.type === "Fictional sample history" &&
    seed.notes?.some((original) => original.type === note.type && original.title === note.title &&
      original.summary === (note.summary ?? note.sections?.summary))
    ? { ...note, type: "Medical history" } : note;
  return {
    ...patient,
    labs: (patient.labs || []).flatMap((lab) => {
      if (!(seed.labs || []).includes(lab)) return [lab];
      if (lab === "Fictional demonstration values") return [];
      return [lab.replace(/^Sample chart · /, "Chart · ")];
    }),
    notes: (patient.notes || []).map(updateNote),
    documents: patient.documents?.map(updateNote),
    imaging: (patient.imaging || []).map((record) =>
      seedReports.has(record.id) && typeof record.report === "string" && seedReports.get(record.id) === record.report
        ? { ...record, report: cleanSeedReport(record.report) } : record),
    billing: patient.billing?.insurance === "Fictional PPO" && seed.billing?.insurance === "Fictional PPO"
      ? { ...patient.billing, insurance: "PPO" } : patient.billing
  };
}

function normalizePatient(patient) {
  patient = refreshSeedLabels(patient);
  const clinical = patient.clinical || {};
  const vitals = { ...(patient.vitals || {}), ...(clinical.vitals || {}) };
  const sampleAdmission = sampleAdmissionAssignments[Number(patient.id)];
  const seededAdmission = !clinical.department &&
    sampleAdmission &&
    (!clinical.stage || (clinical.stage === "Intake" && !clinical.disposition));
  const department = clinical.department ||
    (seededAdmission ? sampleAdmission.department : getDefaultDepartment(patient, Number(patient.id) || 0));
  const defaultLocation = seededAdmission ? sampleAdmission.location : patient.room || "ED Triage";
  const assignedNurse = clinical.assignedNurse ||
    (seededAdmission ? sampleAdmission.nurse : "");
  const recordedAdmissionAt = clinical.admissionAt || patient.admissionAt ||
    (patient.events || []).find((event) =>
      event.type === "Admission" || /^patient admitted\b|^admission started\b/i.test(event.title || "")
    )?.timestamp || "";
  return {
    ...patient,
    room: clinical.location || defaultLocation,
    chartCompleted: Boolean(patient.chartCompleted),
    medicationReviewed: patient.medicationReviewed !== false,
    appointments: (patient.appointments || []).map(normalizeAppointment),
    vitalReadings: (patient.vitalReadings || [{
      values: vitals,
      recordedAt: patient.vitalsRecordedAt || "",
      source: "Current chart"
    }]).map((reading) => ({
      id: reading.id || createRecordId("vital"),
      values: { ...(reading.values || {}) },
      recordedAt: reading.recordedAt || "",
      source: reading.source || "Recorded vitals"
    })),
    events: (patient.events || []).map((event) => ({
      id: event.id || createRecordId("event"),
      type: event.type || "Encounter",
      title: event.title || "Patient event",
      details: event.details || "",
      timestamp: event.timestamp || "",
      targetView: event.targetView || "",
      targetId: event.targetId || ""
    })),
    clinical: {
      arrivalMode: clinical.arrivalMode || "Walk-in",
      stage: seededAdmission ? "Admission" : clinical.stage || "Intake",
      chiefComplaint: clinical.chiefComplaint || "",
      acuity: clinical.acuity || "",
      triageNote: clinical.triageNote || "",
      vitals,
      painScore: clinical.painScore || "",
      location: clinical.location || defaultLocation,
      department,
      assignedNurse,
      attending: clinical.attending || patient.provider || "",
      disposition: clinical.disposition || (seededAdmission ? sampleAdmission.disposition : ""),
      destination: clinical.destination || "",
      followUpDate: clinical.followUpDate || patient.carePlan?.followUpDate || "",
      admissionAt: recordedAdmissionAt
    },
    orders: (patient.orders || []).map((order) => ({
      id: order.id || createRecordId("order"),
      createdAt: order.createdAt || "",
      updatedAt: order.updatedAt || "",
      category: order.category || "Nursing",
      priority: order.priority || "Routine",
      title: order.title || "",
      details: order.details || "",
      fields: Array.isArray(order.fields) ? order.fields : [],
      status: order.status || "Pending",
      time: order.time || "Previously recorded"
    })),
    imaging: (patient.imaging || []).map((record) => ({
      id: record.id || createRecordId("imaging"),
      createdAt: record.createdAt || "",
      study: record.study || "Imaging study",
      modality: record.modality || "Not specified",
      bodySite: record.bodySite || "Not specified",
      performedAt: record.performedAt || "Date not recorded",
      status: record.status || "Final",
      indication: record.indication || "",
      report: record.report || "",
      image: record.image && typeof record.image === "object" ? record.image : allInitialPatients.flatMap((seedPatient) => seedPatient.imaging)
        .find((seedRecord) => seedRecord.id === record.id)?.image || null,
      radiologist: record.radiologist || "Not recorded"
    })),
    documents: (patient.documents || patient.notes || []).map((document) => ({
      id: document.id || createRecordId("document"),
      createdAt: document.createdAt || "",
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

function displayAuditDetails(entry) {
  const details = entry.details;
  if (entry.action === "patient:register") return details.replace(/^Registered fictional patient (.+) for intake\.$/, "Registered patient $1 for intake.");
  if (entry.action === "staff:create") return details.replace(/^Added fictional staff directory profile for (.+)\.$/, "Added staff directory profile for $1.");
  if (entry.action === "inbox:mark-all-read") return details.replace(/^Marked (\d+) fictional inbox items as read\.$/, "Marked $1 inbox items as read.");
  return details;
}

function normalizeCurrentUser(user) {
  const account = demoAccounts.find((demoAccount) => demoAccount.id === user?.accountId);
  const authorizedRoles = account ? accountRoles[account.id] : ["clinician"];
  const role = authorizedRoles.includes(user?.role) ? user.role : authorizedRoles[0];
  return {
    accountId: account?.id || null,
    label: account?.displayName || rolePermissions[role].label,
    role,
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

function normalizeStaff(staff) {
  return {
    id: String(staff.id || createRecordId("staff")),
    name: String(staff.name || "").trim(),
    title: String(staff.title || "Team member").trim(),
    role: String(staff.role || "Staff").trim(),
    department: String(staff.department || "Administration").trim(),
    location: String(staff.location || "Main campus").trim(),
    email: String(staff.email || "").trim(),
    status: staff.status === "Inactive" ? "Inactive" : "Active"
  };
}

function loadStaffDirectory() {
  const storage = safeLocalStorage();
  try {
    const saved = storage?.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed.staffDirectory)) {
        const byId = new Map(defaultStaffDirectory.map((staff) => [staff.id, staff]));
        parsed.staffDirectory.forEach((staff) => byId.set(staff.id, staff));
        return [...byId.values()].map(normalizeStaff);
      }
    }
  } catch (error) {
    console.warn("Unable to load staff directory", error);
  }
  return defaultStaffDirectory.map(normalizeStaff);
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

function loadCurrentUser(account) {
  const storage = safeLocalStorage();

  try {
    const saved = storage?.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.currentUser && parsed.currentUser.accountId === account?.id) {
        return normalizeCurrentUser(parsed.currentUser);
      }
    }
  } catch (error) {
    console.warn("Unable to load current user", error);
  }

  return normalizeCurrentUser(account ? { accountId: account.id, role: account.role } : { role: "clinician" });
}

function loadDemoSession() {
  try {
    const accountId = typeof sessionStorage !== "undefined" ? sessionStorage.getItem(demoSessionKey) : null;
    if (accountId === automaticAccountId && localStorage.getItem(automaticSignInKey) === "signed-out") return null;
    return demoAccounts.find((account) => account.id === accountId) || null;
  } catch (error) {
    console.warn("Unable to load demo session", error);
    return null;
  }
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

function loadWorkspacePreference(key, fallback) {
  const storage = safeLocalStorage();
  try {
    const saved = storage?.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed[key] !== undefined) return parsed[key];
    }
  } catch (error) {
    console.warn(`Unable to load ${key}`, error);
  }
  return fallback;
}

let patients = loadPatients();
let staffDirectory = loadStaffDirectory();
let selectedPatientId = loadSelectedPatient(patients);
let selectedProfile = loadWorkspacePreference("selectedProfile", { type: "staff", id: staffDirectory[0]?.id || "" });
let activeDemoAccount = loadDemoSession();
let accountRoles = loadAccountRoles();
let currentUser = loadCurrentUser(activeDemoAccount);
let auditTrail = loadAuditTrail();
let inboxItems = loadInboxItems(patients);
let inboxFilter = normalizeInboxFilter(loadWorkspacePreference("inboxFilter", "all"));
let inboxSearch = "";
let currentView = loadCurrentView();
if (currentView === "profiles" && selectedProfile.type === "patient") currentView = "patient-profiles";
let nursingFilter = loadWorkspacePreference("nursingFilter", currentUser.role === "nurse" ? currentUser.label : "all");
let workspaceEventsAttached = false;
let sidebarCollapsed = loadWorkspacePreference("sidebarCollapsed", false) === true;
let mobileNavigationOpen = false;

function saveState() {
  const storage = safeLocalStorage();
  storage?.setItem(storageKey, JSON.stringify({
    patients,
    staffDirectory,
    selectedPatientId,
    selectedProfile,
    nursingFilter,
    currentUser,
    accountRoles,
    auditTrail,
    inboxItems,
    inboxFilter,
    currentView,
    sidebarCollapsed
  }));
}

function createDemoInboxItems(patientRecords) {
  return patientRecords.slice(0, 5).flatMap((patient, index) => {
    const time = ["Today · 09:15", "Today · 10:42", "Yesterday · 16:20", "Yesterday · 14:05", "Monday · 11:30"][index];
    const items = [
      {
        id: `inbox-message-${patient.id}`,
        patientId: patient.id,
        patientName: patient.name,
        mrn: patient.mrn,
        kind: "Message",
        source: "Care team",
        title: "Care team handoff",
        summary: "A care team handoff is waiting for review.",
        receivedAt: time,
        priority: "Routine",
        status: "Unread"
      }
    ];
    if (patient.labs?.length) {
      items.push({
        id: `inbox-result-${patient.id}`,
        patientId: patient.id,
        patientName: patient.name,
        mrn: patient.mrn,
        kind: "Result",
        source: "Laboratory",
        title: "Result available",
        summary: `${patient.labs[0]} · Result available for chart review. No clinical interpretation is provided.`,
        receivedAt: time,
        priority: patient.priority === "Urgent" ? "High" : "Routine",
        status: "Unread"
      });
    }
    const task = patient.carePlan?.tasks?.find((item) => item.status !== "Done");
    if (task) {
      items.push({
        id: `inbox-task-${patient.id}`,
        patientId: patient.id,
        patientName: patient.name,
        mrn: patient.mrn,
        kind: "Task",
        source: "Care plan",
        title: task.label,
        summary: "Follow-up task from the care plan.",
        receivedAt: time,
        priority: patient.priority === "Urgent" ? "High" : "Routine",
        status: task.status === "Done" ? "Done" : "Open",
        taskLabel: task.label
      });
    }
    return items;
  });
}

function loadInboxItems(patientRecords) {
  const saved = loadWorkspacePreference("inboxItems", null);
  if (!Array.isArray(saved)) return createDemoInboxItems(patientRecords);
  const validKinds = new Set(["Message", "Result", "Task"]);
  const validStatuses = new Set(["Unread", "Read", "Reviewed", "Open", "Done"]);
  const normalized = saved.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const patient = patientRecords.find((record) => String(record.id) === String(item.patientId));
    if (!patient || !validKinds.has(item.kind) || !validStatuses.has(item.status)) return [];
    return [{
      ...item,
      id: String(item.id || `inbox-${patient.id}-${item.kind.toLowerCase()}`),
      patientId: patient.id,
      patientName: patient.name,
      mrn: patient.mrn,
      source: String(item.source || "Care team"),
      title: String(item.title || "Inbox item"),
      summary: cleanSeedInboxSummary(item, patient),
      receivedAt: String(item.receivedAt || "Date not recorded"),
      priority: item.priority === "High" ? "High" : "Routine"
    }];
  });
  return normalized.length ? normalized : createDemoInboxItems(patientRecords);
}

function cleanSeedInboxSummary(item, patient) {
  const summary = String(item.summary || "");
  const seed = allInitialPatients.find((record) => record.id === patient.id && record.mrn === patient.mrn);
  if (!seed) return summary;
  if (item.id === `inbox-message-${patient.id}` &&
      summary === "A fictional workflow handoff is waiting for review in this demonstration inbox.") {
    return "A care team handoff is waiting for review.";
  }
  if (item.id === `inbox-task-${patient.id}` && summary === "Fictional follow-up task from this sample chart.") {
    return "Follow-up task from the care plan.";
  }
  if (item.id === `inbox-result-${patient.id}` &&
      summary === `${seed.labs?.[0]} · Fictional sample result surfaced for chart review. No clinical interpretation is provided.`) {
    const lab = seed.labs[0].replace(/^Sample chart · /, "Chart · ");
    return `${lab} · Result available for chart review. No clinical interpretation is provided.`;
  }
  return summary;
}

function normalizeInboxFilter(filter) {
  const legacyKeys = { messages: "message", results: "result", tasks: "task" };
  const key = legacyKeys[filter] || filter;
  return INBOX_FILTERS.some((item) => item.key === key) ? key : "all";
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

function loadAccountRoles() {
  const saved = loadWorkspacePreference("accountRoles", {});
  const roles = Object.fromEntries(demoAccounts.map((account) => {
    const value = saved?.[account.id];
    const candidates = Array.isArray(value) ? value : [value];
    const authorized = [...new Set(candidates.filter(isValidRole))];
    return [account.id, authorized.length ? authorized : [...account.authorizedRoles]];
  }));
  if (!Object.values(roles).some((authorized) => authorized.includes("admin"))) {
    roles.admin.push("admin");
  }
  return roles;
}

function getRoleLabel(role) {
  return rolePermissions[role]?.label || role;
}

function isValidRole(role) {
  return typeof role === "string" && Object.hasOwn(rolePermissions, role);
}

function formatRoleList(roles) {
  return roles.map(getRoleLabel).join(", ");
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
  if (!accountRoles[currentUser.accountId]?.includes(role)) {
    recordAudit("role:switch:denied", "System", `Attempted to activate an unauthorized role: ${String(role)}.`);
    saveState();
    return currentUser;
  }
  if (currentUser.role === role) return currentUser;
  recordAudit("role:switch", "System", `Switched active role from ${getRoleLabel(currentUser.role)} to ${getRoleLabel(role)}.`);
  currentUser = normalizeCurrentUser({ ...currentUser, role });
  if (role === "nurse") nursingFilter = currentUser.label;
  saveState();
  return currentUser;
}

function updateAccountRole(accountId, role) {
  return updateAccountRoles(accountId, [role]);
}

function updateAccountRoles(accountId, roles) {
  const permission = evaluatePermission(currentUser.role, "roles:manage", "System");
  if (!permission.allowed) {
    appendAuditEntry(permission.audit);
    saveState();
    return permission;
  }
  const account = demoAccounts.find((item) => item.id === accountId);
  if (!account || !Array.isArray(roles) || !roles.length
      || !roles.every(isValidRole)) {
    recordAudit("roles:manage:denied", "System", "Invalid account or role assignment.");
    saveState();
    return { allowed: false, message: "Select a valid sign-in account and at least one authorized role." };
  }
  const authorizedRoles = [...new Set(roles)];
  const previousRoles = accountRoles[accountId];
  if (previousRoles.includes("admin") && !authorizedRoles.includes("admin")
      && Object.values(accountRoles).filter((item) => item.includes("admin")).length === 1) {
    recordAudit("roles:manage:denied", "System", "Attempted to remove the last Admin role.");
    saveState();
    return { allowed: false, message: "Keep at least one Admin account. Assign another Admin before changing this role." };
  }
  recordAudit("roles:manage", "System", `Changed ${account.displayName}'s authorized roles from ${formatRoleList(previousRoles)} to ${formatRoleList(authorizedRoles)}.`);
  accountRoles[accountId] = authorizedRoles;
  currentUser = normalizeCurrentUser(currentUser);
  if (currentUser.role === "nurse") nursingFilter = currentUser.label;
  saveState();
  return { allowed: true, message: `${account.displayName}'s authorized roles are now ${formatRoleList(authorizedRoles)}.` };
}

function setCurrentView(view) {
  currentView = view;
  saveState();
}

function openStaffProfile(staffId) {
  selectedProfile = { type: "staff", id: staffId };
  setCurrentView("profiles");
  render();
  scrollToWorkspaceTop();
}

function getDetailCardsForView(patient, openTasks) {
  const cardsByView = {
    overview: [
      {
        title: "Demographics",
        items: [
          `Primary diagnosis: ${patient.diagnosis}`,
          `Attending: ${patient.clinical.attending || patient.provider}`,
          `Nurse: ${patient.clinical.assignedNurse || "Unassigned"}`,
          `Department: ${patient.clinical.department}`,
          `Care location: ${patient.room}`,
          `Last visit: ${patient.lastVisit}`
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
          `Attending: ${patient.clinical.attending || patient.provider}`,
          `Nurse: ${patient.clinical.assignedNurse || "Unassigned"}`,
          `Department: ${patient.clinical.department}`,
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
    ]
  };

  return cardsByView[currentView] || cardsByView.overview;
}

function getVisibleSections(view) {
  const extendedViews = ["my-patients", "inbox", "admissions", "nursing", "departments", "locations", "staff", "profiles", "patient-profiles"];
  return {
    overviewSection: view === "overview",
    operationsOverviewSection: view === "overview",
    roleManagementSection: view === "overview" && hasPermission(currentUser.role, "roles:manage"),
    extendedSection: extendedViews.includes(view),
    recordsSection: view === "patients" || view === "labs" || view === "billing",
    operationsSection: view === "appointments",
    encounterSection: view === "patients" || view === "labs",
    auditSection: (view === "overview" || view === "appointments") && hasPermission(currentUser.role, "audit:view"),
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
  const patientsMenu = document.getElementById("patientsMenu");
  const patientView = Boolean(patientsMenu.querySelector(`[data-view="${currentView}"]`));
  patientsMenu.dataset.active = String(patientView);
  if (patientView) patientsMenu.open = true;
  document.getElementById("staffSearchContainer").hidden = currentView !== "staff";
  if (currentView !== "staff" && activeHeaderSearch === "staff") activeHeaderSearch = null;
  const heading = document.querySelector(".topbar h2");
  const activeLink = [...document.querySelectorAll(".nav-link")].find((item) => item.dataset.view === currentView);
  heading.textContent = activeLink?.dataset.view === "inbox" ? "In Basket" : activeLink?.textContent || "Overview";
  const unreadCount = inboxItems.filter((item) => item.status === "Unread").length;
  const inboxBadge = document.getElementById("inboxUnreadCount");
  inboxBadge.textContent = String(unreadCount);
  inboxBadge.hidden = unreadCount === 0;
  inboxBadge.setAttribute("aria-label", `${unreadCount} unread inbox ${unreadCount === 1 ? "item" : "items"}`);
}

function isMobileNavigation() {
  return window.matchMedia?.("(max-width: 760px)").matches || false;
}

function syncNavigationLayout() {
  const mobile = isMobileNavigation();
  const open = mobile ? mobileNavigationOpen : !sidebarCollapsed;
  document.getElementById("appShell").dataset.navigationOpen = String(open);
  const sidebar = document.getElementById("workspaceSidebar");
  sidebar.inert = !open;
  if (mobile && open) {
    sidebar.setAttribute("role", "dialog");
    sidebar.setAttribute("aria-modal", "true");
  } else {
    sidebar.removeAttribute("role");
    sidebar.removeAttribute("aria-modal");
  }
  document.getElementById("main-content").inert = mobile && open;
  document.getElementById("navigationToggle").setAttribute("aria-expanded", String(open));
  document.getElementById("navigationToggle").setAttribute("aria-label", open ? "Hide navigation" : "Show navigation");
  document.getElementById("navigationBackdrop").hidden = !mobile || !open;
  document.body.classList.toggle("nav-drawer-open", mobile && open);
  if (!open && sidebar.contains(document.activeElement)) {
    document.getElementById("navigationToggle").focus();
  }
}

function setNavigationOpen(open) {
  if (isMobileNavigation()) {
    mobileNavigationOpen = open;
  } else {
    const previous = sidebarCollapsed;
    sidebarCollapsed = !open;
    try {
      saveState();
    } catch (error) {
      sidebarCollapsed = previous;
      console.warn("Unable to save navigation preference", error);
      document.getElementById("navigationStatus").textContent = "Unable to save navigation settings. Check your browser storage settings and try again.";
      return;
    }
  }
  document.getElementById("navigationStatus").textContent = "";
  syncNavigationLayout();
  if (isMobileNavigation() && open) {
    document.getElementById("closeNavigationBtn").focus();
  } else if (!open) {
    document.getElementById("navigationToggle").focus();
  }
}

function closeMobileNavigation() {
  if (isMobileNavigation() && mobileNavigationOpen) setNavigationOpen(false);
}

function initializeWorkspaceNavigation() {
  const iconPaths = {
    overview: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
    "my-patients": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m16-9v6m-3-3h6M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
    inbox: "M4 4h16v16H4zM4 13h5l2 3h2l2-3h5",
    patients: "M9 3H4v18h16V3h-5M9 3v4h6V3zM8 12h8m-8 4h5",
    "patient-profiles": "M20 21v-2a7 7 0 0 0-14 0v2M13 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
    admissions: "M3 21V5h18v16M7 5V2m10 3V2M3 10h18M8 14h2m4 0h2m-8 4h2m4 0h2",
    nursing: "M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7zM12 8v8m-4-4h8",
    appointments: "M4 5h16v16H4zM8 2v6m8-6v6M4 11h16m-12 4h3m2 3h3",
    clinical: "M3 12h4l3-8 4 16 3-8h4",
    orders: "M9 3H4v18h16V3h-5M9 3v4h6V3zM8 13h8m-4-4v8",
    documents: "M14 2H5v20h14V7zM14 2v6h5M8 12h8m-8 4h8",
    labs: "M9 3h6m-5 0v7l-6 9v2h16v-2l-6-9V3M7 16h10",
    departments: "M9 21V3h12v18H3V9h6m4-2h4m-4 4h4m-4 4h4M6 13v4",
    locations: "M12 22S3 14 3 9a9 9 0 0 1 18 0c0 5-9 13-9 13M12 6a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    staff: "M3 21v-2a5 5 0 0 1 10 0v2m3-15a4 4 0 0 1 0 8m5 7v-2a5 5 0 0 0-4-5M8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8",
    profiles: "M3 4h18v16H3zM7 9h3v3H7zm7 0h4m-4 4h4M6 16h6",
    billing: "M5 3h14v19l-4-2-3 2-3-2-4 2zM9 7h6m-6 4h6m-6 4h3"
  };
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.insertAdjacentHTML("afterbegin", `<svg class="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${iconPaths[link.dataset.view]}" /></svg>`);
  });
  document.getElementById("navigationToggle").addEventListener("click", () => {
    setNavigationOpen(isMobileNavigation() ? !mobileNavigationOpen : sidebarCollapsed);
  });
  document.getElementById("closeNavigationBtn").addEventListener("click", () => setNavigationOpen(false));
  document.getElementById("navigationBackdrop").addEventListener("click", () => setNavigationOpen(false));
  window.matchMedia("(max-width: 760px)").addEventListener("change", () => {
    mobileNavigationOpen = false;
    syncNavigationLayout();
  });
  const sidebar = document.getElementById("workspaceSidebar");
  document.addEventListener("keydown", (event) => {
    if (isMobileNavigation() && mobileNavigationOpen) {
      if (event.key === "Escape") {
        event.preventDefault();
        setNavigationOpen(false);
      } else if (event.key === "Tab") {
        const controls = [...sidebar.querySelectorAll("a[href], button:not([disabled]), select:not([disabled]), summary")]
          .filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    const exchangeMenu = document.querySelector(".exchange-menu");
    if (event.key === "Escape" && exchangeMenu.open) {
      exchangeMenu.open = false;
      exchangeMenu.querySelector("summary").focus();
    }
  });
  document.addEventListener("click", (event) => {
    const exchangeMenu = document.querySelector(".exchange-menu");
    if (!exchangeMenu.contains(event.target)) exchangeMenu.open = false;
  });
  syncNavigationLayout();
}

function scrollToWorkspaceTop() {
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  document.getElementById("main-content")?.scrollIntoView({
    behavior: reduceMotion ? "auto" : "smooth",
    block: "start"
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

const STAT_FILTERS = {
  completed: { label: "Completed charts", test: (patient) => patient.chartCompleted },
  critical: { label: "Critical follow-ups", test: isCriticalFollowup },
  medrec: { label: "Medication reconciliation reviewed", test: (patient) => patient.medicationReviewed }
};
let activeStatFilter = null;

function isCriticalFollowup(patient) {
  const dueDate = patient.carePlan.followUpDate ? new Date(`${patient.carePlan.followUpDate}T00:00:00`) : null;
  const isOverdue = dueDate ? dueDate.getTime() < Date.now() : false;
  return patient.priority === "Urgent" || isOverdue;
}

function setStatFilter(filter) {
  activeStatFilter = STAT_FILTERS[filter] && filter !== activeStatFilter ? filter : null;
  if (STAT_FILTERS[filter]) currentView = "patients";
  render();
}

function calculateDashboardStats(patientList) {
  const totalPatients = patientList.length || 1;
  const completedCharts = patientList.filter((patient) => patient.chartCompleted).length;
  const medicationReviewed = patientList.filter((patient) => patient.medicationReviewed).length;
  const overdueTasks = patientList.reduce(
    (count, patient) => count + patient.carePlan.tasks.filter((task) => task.status !== "Done").length,
    0
  );
  const criticalFollowups = patientList.filter(isCriticalFollowup).length;

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
  const createdAt = new Date().toISOString();
  const document = {
    id: createRecordId("document"),
    title: note.title,
    type: encounter.type || "Clinical encounter",
    status: "Draft",
    time: note.time,
    createdAt,
    sections: { summary: note.summary, vitals: encounter.vitals || "", plan: encounter.followup ? `Follow-up: ${encounter.followup}` : "" }
  };
  patient.documents.unshift(document);
  patient.chartCompleted = true;
  patient.medicationReviewed = true;
  patient.lastVisit = "Today";
  patient.status = encounter.followup ? "Follow-up scheduled" : "Stable";
  recordVitals(patient, updatedVitals, "Encounter documentation");
  if (encounter.followup) patient.clinical.followUpDate = encounter.followup;

  if (encounter.followup) {
    patient.carePlan.followUpDate = encounter.followup;
    patient.carePlan.tasks.unshift({
      id: createRecordId("task"),
      label: `Complete ${note.title.toLowerCase()} follow-up`,
      status: "Open",
      createdAt,
      dueDate: encounter.followup
    });
    patient.appointments.unshift(
      normalizeAppointment({
        scheduledAt: encounter.followup,
        time: formatDisplayDate(encounter.followup),
        title: `Follow-up: ${note.title}`,
        location: patient.room,
        status: "Scheduled"
      })
    );
  }

  addPatientEvent(patient, "Encounter", "Clinical encounter documented", `${note.title} · ${note.type}`, createdAt, {
    targetView: "documents",
    targetId: `patient-document-${document.id}`
  });
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

function registerPatientForTriage(input, role = currentUser.role) {
  const permission = evaluatePermission(role, "workflow:update", "System");
  if (!permission.allowed) return permission;
  const name = String(input.name || "").trim();
  const mrn = String(input.mrn || "").trim();
  const ageText = String(input.age ?? "").trim();
  const age = Number(ageText);
  const sex = String(input.sex || "");
  if (!name || name.length > 120 || !mrn || mrn.length > 50 ||
      !/^\d+$/.test(ageText) || !Number.isInteger(age) || age < 0 || age > 130 ||
      !["Female", "Male", "Other", "Not recorded"].includes(sex)) {
    return { allowed: false, message: "Enter a name, MRN, age from 0 to 130, and sex." };
  }
  if (patients.some((patient) => String(patient.mrn).trim().toLowerCase() === mrn.toLowerCase())) {
    return { allowed: false, message: "That MRN already exists. Open the existing patient record instead." };
  }
  const id = Math.max(0, ...patients.map((patient) => Number(patient.id)).filter(Number.isSafeInteger)) + 1;
  if (!Number.isSafeInteger(id)) return { allowed: false, message: "Unable to assign a patient identifier." };
  const patient = normalizePatient({
    id, name, mrn, age, sex,
    status: "Intake",
    priority: "Not assessed",
    diagnosis: "Not recorded",
    lastVisit: "Today",
    provider: "",
    room: "ED Triage",
    allergies: [],
    medications: [],
    vitals: {},
    vitalReadings: [],
    labs: [],
    notes: [],
    appointments: [],
    billing: { balance: 0, insurance: "Not recorded" },
    chartCompleted: false,
    medicationReviewed: false,
    clinical: { stage: "Intake", department: "Emergency Department", location: "ED Triage" }
  });
  addPatientEvent(patient, "Encounter", "Patient registered", "Ready for intake and triage", new Date().toISOString(), {
    targetView: "clinical", targetId: "workflowForm"
  });
  const previous = { selectedPatientId, selectedProfile, currentView, auditTrail: auditTrail.slice() };
  patients.push(patient);
  selectedPatientId = patient.id;
  selectedProfile = { type: "patient", id: patient.id };
  currentView = "clinical";
  recordAudit("patient:register", patient.name, `Registered patient ${patient.mrn} for intake.`);
  try {
    if (!safeLocalStorage()) throw new Error("Browser storage unavailable");
    saveState();
  } catch (error) {
    patients.pop();
    ({ selectedPatientId, selectedProfile, currentView, auditTrail } = previous);
    console.warn("Unable to save patient registration", error);
    return { allowed: false, message: "Unable to save the profile. Check browser storage and try again." };
  }
  return { allowed: true, patient };
}

function updateWorkflowForPatient(patient, updates, role = currentUser.role) {
  const permission = evaluatePermission(role, "workflow:update", patient.name);
  if (!permission.allowed) return permission;

  const allowedStages = ["Intake", "Triage", "ED evaluation", "Consultation", "Admission", "Discharge", "Closed"];
  const allowedDispositions = ["", "Admit to ward", "Admit to ICU", "Discharge home", "Refer to PCP", "Refer to specialist", "Transfer"];
  const allowedDepartments = departments.map((department) => department.name);
  const allowedNurses = staffDirectory.filter((staff) => staff.role === "Nurse").map((staff) => staff.name);
  const allowedAttending = staffDirectory.filter((staff) => ["Provider", "PA", "Midlevel"].includes(staff.role)).map((staff) => staff.name);
  const wasAdmitted = patient.clinical.stage === "Admission" ||
    ["Admit to ward", "Admit to ICU"].includes(patient.clinical.disposition);
  const willBeAdmitted = updates.stage === "Admission" ||
    ["Admit to ward", "Admit to ICU"].includes(updates.disposition || "");
  const admissionAt = patient.clinical.admissionAt || (
    !wasAdmitted && willBeAdmitted ? new Date().toISOString() : ""
  );
  if (!allowedStages.includes(updates.stage) ||
      !allowedDispositions.includes(updates.disposition || "") ||
      (!allowedDepartments.includes(updates.department) && updates.department !== patient.clinical.department) ||
      (updates.assignedNurse && !allowedNurses.includes(updates.assignedNurse) && updates.assignedNurse !== patient.clinical.assignedNurse) ||
      (updates.attending && !allowedAttending.includes(updates.attending) && updates.attending !== patient.clinical.attending)) {
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
    department: updates.department || patient.clinical.department,
    assignedNurse: updates.assignedNurse || "",
    attending: updates.attending || patient.clinical.attending,
    disposition: updates.disposition || "",
    destination: (updates.destination || "").trim(),
    followUpDate: updates.followUpDate || "",
    admissionAt,
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
  if (patient.clinical.attending) patient.provider = patient.clinical.attending;
  patient.status = ({
    "Admit to ward": "Admitted · Ward",
    "Admit to ICU": "Admitted · ICU",
    "Discharge home": "Discharge planning",
    "Refer to PCP": "PCP referral",
    "Refer to specialist": "Specialist referral",
    Transfer: "Transfer planned"
  })[patient.clinical.disposition] || patient.clinical.stage;

  const submittedVitals = Object.fromEntries(
    ["bp", "hr", "rr", "temp", "spO2"].filter((key) => updates[key] !== undefined && updates[key] !== "").map((key) => [key, updates[key]])
  );
  recordVitals(patient, submittedVitals, "Intake / triage");
  addPatientEvent(
    patient,
    "Encounter",
    `Encounter updated · ${patient.clinical.stage}`,
    [patient.clinical.disposition, patient.clinical.location, patient.clinical.destination].filter(Boolean).join(" · "),
    new Date().toISOString(),
    { targetView: "clinical", targetId: "workflowForm" }
  );
  appendAuditEntry({
    action: "workflow:update",
    patientName: patient.name,
    details: `Updated encounter to ${patient.clinical.stage} · ${patient.clinical.department} · ${patient.clinical.location}${patient.clinical.disposition ? ` · ${patient.clinical.disposition}` : ""}.`,
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
  const fields = orderTypeFields[order.category];
  if (!fields) return { allowed: false, message: "Select a valid order category." };

  const savedOrder = {
    id: createRecordId("order"),
    createdAt: new Date().toISOString(),
    category: order.category || "Nursing",
    priority: order.priority || "Routine",
    title,
    details: (order.details || "").trim(),
    fields: fields
      .map((field) => ({ label: field.label, value: (order[field.name] || "").trim() }))
      .filter((field) => field.value),
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
  order.updatedAt = new Date().toISOString();
  addPatientEvent(patient, order.category, `${order.category} order ${status.toLowerCase()}`, order.title, order.updatedAt, {
    targetView: "orders",
    targetId: `patient-order-${order.id}`
  });
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

  const fields = documentTypeFields[document.type];
  if (!fields) return { allowed: false, message: "Select a valid document type." };
  const sections = Object.fromEntries(
    fields.map((field) => [field.name, (document[field.name] || "").trim()]).filter(([, value]) => value)
  );
  const savedDocument = {
    id: createRecordId("document"),
    createdAt: new Date().toISOString(),
    type: document.type || "Clinical note",
    title,
    status: "Draft",
    time: new Date().toLocaleString([], { dateStyle: "medium", timeStyle: "short" }),
    sections
  };
  patient.documents.unshift(savedDocument);
  patient.notes.unshift({
    title: savedDocument.title,
    summary: Object.values(sections)[0] || "Draft saved.",
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
  if (!["Completed", "Cancelled"].includes(nextStatus)) {
    return { allowed: false, message: "Invalid appointment status." };
  }

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
  appointment.updatedAt = new Date().toISOString();
  addPatientEvent(patient, "Appointment", `Appointment ${nextStatus.toLowerCase()}`, appointment.title, appointment.updatedAt, {
    targetView: "appointments",
    targetId: `patient-appointment-${appointment.id}`
  });
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
  nextOpenTask.completedAt = new Date().toISOString();
  addPatientEvent(patient, "Care plan", "Care task completed", nextOpenTask.label, nextOpenTask.completedAt, {
    targetView: "patients",
    targetId: `patient-care-task-${nextOpenTask.id}`
  });
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
      vitalReadings: patient.vitalReadings,
      clinical: patient.clinical,
      billing: patient.billing,
      followUpDate: patient.carePlan.followUpDate,
      appointments: patient.appointments,
      tasks: patient.carePlan.tasks,
      notes: patient.notes,
      orders: patient.orders,
      documents: patient.documents,
      events: patient.events,
      imaging: patient.imaging
    }
  };
}

function downloadPatientExport(patient, format = "json", scope = "selected") {
  const interop = window.NorthstarInterop;
  const list = scope === "all" ? patients : [patient];
  const meta = interop.FORMATS[format];
  if (!meta) throw new Error(`Unsupported export format: ${format}`);
  const content = interop.buildExport(format, list, buildExportPayload);
  const blob = new Blob([content], { type: meta.mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const base = scope === "all" ? "northstar-patients" : `${patient.mrn.toLowerCase()}-summary`;
  link.href = url;
  link.download = `${base}.${meta.extension}`;
  link.click();
  URL.revokeObjectURL(url);
  return list.length;
}

// Upserts imported patients by MRN; returns counts.
function importPatientRecords(records, role = currentUser.role) {
  const permission = evaluatePermission(role, "data:import", "Multiple patients");
  if (!permission.allowed) return { allowed: false, permission };

  let created = 0;
  let updated = 0;
  records.forEach((record) => {
    const incoming = { ...record };
    if (!incoming.carePlan && (incoming.tasks || incoming.followUpDate)) {
      incoming.carePlan = { followUpDate: incoming.followUpDate || "", tasks: incoming.tasks || [] };
    }
    const index = patients.findIndex((patient) => patient.mrn === incoming.mrn);
    if (index >= 0) {
      incoming.id = patients[index].id;
      patients[index] = normalizePatient({ ...patients[index], ...incoming });
      updated += 1;
    } else {
      incoming.id = patients.reduce((max, patient) => Math.max(max, Number(patient.id) || 0), 0) + 1;
      patients.push(normalizePatient(incoming));
      created += 1;
    }
  });
  return { allowed: true, created, updated };
}

function isPatientAdmitted(patient) {
  const clinical = patient.clinical || {};
  return clinical.stage !== "Closed" &&
    clinical.disposition !== "Discharge home" &&
    clinical.disposition !== "Transfer" &&
    (clinical.stage === "Admission" || clinical.disposition === "Admit to ward" || clinical.disposition === "Admit to ICU");
}

function getAdmittedPatients() {
  return patients
    .filter(isPatientAdmitted)
    .sort((left, right) => {
      const priority = (patient) => patient.priority === "Urgent" ? 0 : patient.priority === "High" ? 1 : 2;
      return priority(left) - priority(right) || left.name.localeCompare(right.name);
    });
}

function renderAdmissionTable(container, admittedPatients) {
  container.innerHTML = admittedPatients.length ? `
    <table class="data-table">
      <thead><tr><th>Patient</th><th>Reason for admission</th><th>Department / location</th><th>Attending</th><th>Nurse</th><th>Alerts / latest vitals</th><th>Status</th><th></th></tr></thead>
      <tbody>${admittedPatients.map((patient) => `
        <tr>
          <td><strong>${escapeHtml(patient.name)}</strong><span>${escapeHtml(patient.mrn)} · ${escapeHtml(patient.age)} yrs</span></td>
          <td>${escapeHtml(patient.diagnosis)}</td>
          <td>${escapeHtml(patient.clinical.department)}<span>${escapeHtml(patient.clinical.location)}</span></td>
          <td>${escapeHtml(patient.clinical.attending || patient.provider)}</td>
          <td>${escapeHtml(patient.clinical.assignedNurse || "Unassigned")}</td>
          <td><strong>Allergies: ${escapeHtml(patient.allergies.join(", ") || "None listed")}</strong><span>BP ${escapeHtml(patient.vitals.bp || "—")} · HR ${escapeHtml(patient.vitals.hr || "—")} · SpO₂ ${escapeHtml(patient.vitals.spO2 || "—")}</span></td>
          <td><span class="status-pill">${escapeHtml(patient.clinical.stage)}</span><span>${escapeHtml(patient.priority)} priority</span></td>
          <td><button class="ghost-btn action-btn" type="button" data-open-patient="${escapeHtml(patient.id)}">Open chart</button></td>
        </tr>`).join("")}</tbody>
    </table>` : '<p class="empty-state">No active admissions. Save an Admission stage or admit disposition to add a patient.</p>';
}

function renderOperationsOverview() {
  const openOrders = patients.reduce((total, patient) =>
    total + patient.orders.filter((order) => !["Completed", "Cancelled"].includes(order.status)).length, 0);
  const summaries = [
    ["Active admissions", getAdmittedPatients().length],
    ["Care departments", departments.length],
    ["Active team members", staffDirectory.filter((staff) => staff.status === "Active").length],
    ["Open orders", openOrders]
  ];
  document.getElementById("operationsOverview").innerHTML = `
    <p class="overview-welcome">Welcome, ${escapeHtml(currentUser.label)} <span class="pill">${escapeHtml(getRoleLabel(currentUser.role))}</span></p>
    <p class="muted-copy">Use Patients &amp; care for charts and workflows, or Organization for team and location information.</p>
    <div class="overview-summary">${summaries.map(([label, value]) => `
      <div><strong>${value}</strong><p>${escapeHtml(label)}</p></div>`).join("")}</div>`;
}

function renderAccountRoles() {
  const container = document.getElementById("accountRoles");
  if (!hasPermission(currentUser.role, "roles:manage")) {
    container.replaceChildren();
    return;
  }
  container.innerHTML = demoAccounts.map((account) => `
    <form class="account-role-form" data-account-id="${account.id}">
      <div class="account-role-heading">
        <h4>${escapeHtml(account.displayName)}</h4>
        <p>${escapeHtml(account.username)}</p>
      </div>
        <fieldset class="authorized-role-options">
          <legend>Authorized roles for ${escapeHtml(account.displayName)}</legend>
          ${Object.entries(rolePermissions).map(([role, settings]) =>
            `<label><input type="checkbox" name="roles" value="${role}" ${accountRoles[account.id].includes(role) ? "checked" : ""}>${escapeHtml(settings.label)}</label>`).join("")}
        </fieldset>
        <button class="ghost-btn" type="submit">Save roles</button>
    </form>`).join("");
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
  document.querySelectorAll("[data-stat-filter]").forEach((card) => {
    const active = card.dataset.statFilter === activeStatFilter;
    card.classList.toggle("selected", active);
    card.setAttribute("aria-pressed", String(active));
  });
}

function renderRoleSummary() {
  const roleValue = document.getElementById("roleValue");
  const roleHelp = document.getElementById("roleHelp");
  if (!roleValue || !roleHelp) return;

  roleValue.textContent = currentUser.label;
  const accountAvatar = document.getElementById("accountAvatar");
  const staffProfile = getCurrentUserStaffProfile();
  accountAvatar.innerHTML = staffProfile
    ? renderStaffAvatar(staffProfile)
    : `<div class="staff-avatar" aria-hidden="true">${escapeHtml(currentUser.label.split(/\s+/).map((part) => part[0]).slice(0, 2).join(""))}</div>`;
  roleHelp.textContent = hasPermission(currentUser.role, "roles:manage")
    ? "Switch among your authorized roles, or manage account roles in Overview."
    : "Switch only among roles authorized by an Admin.";
  const roleSelector = document.getElementById("roleSelector");
  const authorizedRoles = accountRoles[currentUser.accountId] || [currentUser.role];
  document.getElementById("authorizedRolesValue").textContent = `Authorized roles: ${formatRoleList(authorizedRoles)}`;
  roleSelector.innerHTML = authorizedRoles.map((role) =>
    `<option value="${role}">${escapeHtml(getRoleLabel(role))}</option>`).join("");
  roleSelector.value = currentUser.role;
  roleSelector.disabled = authorizedRoles.length < 2;
}

function getCurrentUserStaffProfile() {
  const account = demoAccounts.find((demoAccount) => demoAccount.id === currentUser.accountId);
  return account ? staffDirectory.find((staff) => staff.id === account.staffProfileId) : undefined;
}

function getFilterDetail(patient) {
  const openTasks = patient.carePlan.tasks.filter((task) => task.status !== "Done").length;
  const followUp = patient.carePlan.followUpDate ? formatDisplayDate(patient.carePlan.followUpDate) : "none scheduled";
  return `Chart ${patient.chartCompleted ? "complete" : "incomplete"} · Meds ${patient.medicationReviewed ? "reconciled" : "pending"} · ${openTasks} open ${openTasks === 1 ? "task" : "tasks"} · Follow-up: ${followUp}`;
}

function renderPatientList() {
  const searchField = document.getElementById("patientListSearch");
  const searchTerm = searchField ? searchField.value.trim().toLowerCase() : "";
  const statFilter = activeStatFilter ? STAT_FILTERS[activeStatFilter] : null;
  const filtered = patients.filter((patient) =>
    (!statFilter || statFilter.test(patient)) &&
    `${patient.name} ${patient.mrn} ${patient.priority} ${patient.status} ${patient.diagnosis} ${patient.clinical.stage} ${patient.clinical.chiefComplaint} ${patient.clinical.department} ${patient.clinical.location} ${patient.clinical.attending} ${patient.clinical.assignedNurse} ${patient.provider}`
      .toLowerCase().includes(searchTerm)
  );
  document.getElementById("activeFilterBar").classList.toggle("hidden-section", !statFilter);
  if (statFilter) document.getElementById("activeFilterLabel").textContent = `Filter: ${statFilter.label}`;

  const list = document.getElementById("patientList");
  document.getElementById("patientListCount").textContent =
    `${filtered.length} ${filtered.length === 1 ? "record" : "records"}`;
  if (!filtered.length) {
    list.innerHTML = '<p class="patient-list-empty">No patients found. Try a name, MRN, diagnosis, care team, or location.</p>';
    return;
  }

  list.innerHTML = filtered
    .map((patient) => {
      const active = patient.id === selectedPatientId ? "active" : "";
      return `
        <button class="patient-card ${active}" type="button" data-id="${escapeHtml(patient.id)}" aria-pressed="${patient.id === selectedPatientId}">
          <strong>${escapeHtml(patient.name)}</strong>
          <span class="patient-card-meta"><span>${escapeHtml(patient.mrn)}</span><span class="patient-card-priority ${patient.priority === "Urgent" ? "urgent" : ""}">${escapeHtml(patient.priority)}</span></span>
          <span class="patient-card-diagnosis">${escapeHtml(patient.diagnosis)}</span>
          <span class="patient-card-status">${escapeHtml(patient.status)}</span>
          ${statFilter ? `<span class="filter-detail">${escapeHtml(getFilterDetail(patient))}</span>` : ""}
        </button>
      `;
    })
    .join("");
}

function getVitalDisplay(value, unit = "") {
  if (value === undefined || value === null || value === "") return "—";
  return `${value}${unit}`;
}

function renderPatientStatusDashboard(patient) {
  const currentVitals = patient.vitals || {};
  const latestReading = patient.vitalReadings[0];
  const vitalDefinitions = [
    ["Blood pressure", currentVitals.bp, ""],
    ["Heart rate", currentVitals.hr, " bpm"],
    ["Respiratory rate", currentVitals.rr, " /min"],
    ["Temperature", currentVitals.temp, ""],
    ["Oxygen saturation", currentVitals.spO2, ""],
    ["Pain score", patient.clinical.painScore, " / 10"]
  ];
  const imagingOrders = patient.orders.filter((order) =>
    ["Imaging", "Imaging / Radiology"].includes(order.category) && ["Pending", "Acknowledged"].includes(order.status)
  );
  const finalReports = patient.imaging.filter((record) => record.status.toLowerCase() === "final").length;
  const preliminaryReports = patient.imaging.filter((record) => record.status.toLowerCase() !== "final").length;
  const latestImaging = [...patient.imaging].sort((left, right) =>
    (toTimelineDate(right.performedAt)?.getTime() || 0) - (toTimelineDate(left.performedAt)?.getTime() || 0)
  )[0];
  const allergyText = patient.allergies.length ? patient.allergies.join(", ") : "None listed";

  return `
    <section id="patient-status-dashboard" class="patient-status-dashboard" aria-label="Patient medical status dashboard">
      <div class="status-overview">
        <div>
          <p class="eyebrow">Current medical status</p>
          <h4>${escapeHtml(patient.diagnosis)}</h4>
          <p>${escapeHtml(patient.status)} · ${escapeHtml(patient.clinical.stage)} · ${escapeHtml(patient.clinical.department)} · ${escapeHtml(patient.room)}</p>
        </div>
        <div class="status-overview-tags">
          <span class="status-pill ${patient.priority === "Urgent" ? "status-urgent" : ""}">${escapeHtml(patient.priority)} priority</span>
          ${patient.clinical.acuity ? `<span class="status-pill status-acknowledged">${escapeHtml(patient.clinical.acuity)}</span>` : ""}
          <span class="status-pill">Attending: ${escapeHtml(patient.clinical.attending || patient.provider)}</span>
          <span class="status-pill">Nurse: ${escapeHtml(patient.clinical.assignedNurse || "Unassigned")}</span>
        </div>
        <p class="allergy-alert"><strong>Allergies:</strong> ${escapeHtml(allergyText)}</p>
      </div>

      <div class="clinical-dashboard-grid">
        <section class="clinical-dashboard-card vitals-dashboard" aria-labelledby="vitalsDashboardHeading">
          <div class="clinical-dashboard-heading">
            <div>
              <p class="eyebrow">Patient dashboard</p>
              <h4 id="vitalsDashboardHeading">Latest vitals</h4>
            </div>
            <span class="dashboard-meta">${patient.vitalReadings.length} ${patient.vitalReadings.length === 1 ? "reading" : "readings"}</span>
          </div>
          <div class="vital-metric-grid">
            ${vitalDefinitions.map(([label, value, unit]) => `
              <article class="vital-metric">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(getVitalDisplay(value, unit))}</strong>
              </article>`).join("")}
          </div>
          <p class="dashboard-footnote">Latest charted values · unrecorded values shown as —${latestReading?.recordedAt ? ` · ${escapeHtml(formatTimelineDate(latestReading.recordedAt))}` : " · time not recorded"}${latestReading?.source ? ` · ${escapeHtml(latestReading.source)}` : ""}</p>
          ${patient.vitalReadings.length ? `
            <details class="vital-history">
              <summary>View recorded readings</summary>
              <div class="vital-history-list">
                ${patient.vitalReadings.map((reading) => `
                  <div class="vital-history-row" id="patient-vital-${escapeHtml(reading.id)}">
                    <time>${escapeHtml(formatTimelineDate(reading.recordedAt))}</time>
                    <span>${escapeHtml(reading.values.bp ? `BP ${reading.values.bp}` : "")}
                    ${escapeHtml(reading.values.hr !== undefined ? ` · HR ${reading.values.hr}` : "")}
                    ${escapeHtml(reading.values.rr !== undefined ? ` · RR ${reading.values.rr}` : "")}
                    ${escapeHtml(reading.values.temp ? ` · Temp ${reading.values.temp}` : "")}
                    ${escapeHtml(reading.values.spO2 ? ` · SpO₂ ${reading.values.spO2}` : "")}</span>
                  </div>`).join("")}
              </div>
            </details>` : ""}
        </section>

        <section class="clinical-dashboard-card imaging-dashboard" aria-labelledby="imagingDashboardHeading">
          <div class="clinical-dashboard-heading">
            <div>
              <p class="eyebrow">Diagnostic studies</p>
              <h4 id="imagingDashboardHeading">Imaging & radiology</h4>
            </div>
            <span class="dashboard-meta">${patient.imaging.length} ${patient.imaging.length === 1 ? "study" : "studies"}</span>
          </div>
          <div class="imaging-metric-grid">
            <div><strong>${patient.imaging.length}</strong><span>Studies</span></div>
            <div><strong>${finalReports}</strong><span>Final reports</span></div>
            <div><strong>${preliminaryReports}</strong><span>Preliminary</span></div>
            <div><strong>${imagingOrders.length}</strong><span>Open orders</span></div>
          </div>
          ${latestImaging ? `
            <div class="latest-imaging">
              <div class="latest-imaging-heading">
                <strong>${escapeHtml(latestImaging.study)}</strong>
                <span class="status-pill ${latestImaging.status.toLowerCase() === "final" ? "status-completed" : "status-acknowledged"}">${escapeHtml(latestImaging.status)}</span>
              </div>
              <p>${escapeHtml(latestImaging.modality)} · ${escapeHtml(latestImaging.bodySite)} · ${escapeHtml(latestImaging.performedAt)}</p>
              ${latestImaging.report ? `<p class="latest-imaging-report">${escapeHtml(latestImaging.report)}</p>` : ""}
            </div>` : '<p class="empty-state compact-empty">No imaging reports on file.</p>'}
          ${imagingOrders.length ? `<p class="dashboard-footnote">${imagingOrders.length} imaging ${imagingOrders.length === 1 ? "order is" : "orders are"} awaiting completion.</p>` : ""}
        </section>
      </div>
    </section>
  `;
}

function renderPatientTimeline(patient) {
  const items = buildPatientTimeline(patient);
  const phases = [
    ["previous", "Previous events"],
    ["current", "Current"],
    ["planned", "Planned"],
    ["undated", "Date not recorded"]
  ];
  const groupedItems = Object.fromEntries(phases.map(([phase]) => [
    phase,
    items.filter((item) => item.phase === phase)
  ]));
  const admissionAt = patient.clinical.admissionAt;
  const hasUndated = items.some((item) => item.phase === "undated");
  return `
    <section class="patient-timeline" aria-labelledby="patientTimelineHeading">
      <div class="timeline-heading">
        <div>
          <p class="eyebrow">Longitudinal record</p>
          <h4 id="patientTimelineHeading">Patient timeline</h4>
        </div>
        <span class="dashboard-meta">${items.length} events</span>
      </div>
      <p class="timeline-context">
        ${admissionAt
          ? `Admission recorded ${escapeHtml(formatTimelineDate(admissionAt))}.`
          : "Admission date not recorded. Showing all available charted events."}
        ${hasUndated ? "Events without a recorded date cannot be placed relative to admission." : ""}
      </p>
      ${items.length ? phases.map(([phase, label]) => {
        const phaseItems = groupedItems[phase];
        if (!phaseItems.length) return "";
        return `
          <section class="timeline-group" aria-label="${label}">
            <h5>${label}<span>${phaseItems.length}</span></h5>
            <ol class="timeline-list">
              ${phaseItems.map((item) => `
                <li class="timeline-item" id="patient-timeline-row-${escapeHtml(item.id)}">
                  <details class="timeline-entry">
                    <summary class="timeline-summary">
                      <span class="timeline-marker timeline-${escapeHtml(item.type.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}" aria-hidden="true"></span>
                      <span class="timeline-content">
                        <span class="timeline-event-heading">
                          <strong>${escapeHtml(item.title)}</strong>
                          <span class="timeline-type">${escapeHtml(item.type)}</span>
                        </span>
                        <time>${escapeHtml(formatTimelineDate(item.timestamp || item.fallbackTime))}</time>
                        ${item.details ? `<span class="timeline-preview">${escapeHtml(item.details)}</span>` : ""}
                      </span>
                    </summary>
                    <div class="timeline-expanded">
                      ${item.detailRows?.length ? `<dl class="timeline-detail-list">
                        ${item.detailRows.filter(([, value]) => value !== undefined && value !== null && value !== "").map(([label, value]) => `
                          <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>
                        `).join("")}
                      </dl>` : ""}
                    </div>
                  </details>
                  <button class="text-btn timeline-record-link" type="button"
                    data-timeline-view="${escapeHtml(item.targetView)}"
                    data-timeline-target="${escapeHtml(item.targetId)}"
                    aria-label="Open record for ${escapeHtml(item.title)}">Open record</button>
                </li>`).join("")}
            </ol>
          </section>`;
      }).join("") : '<p class="empty-state">Patient-related events will appear here as the chart is updated.</p>'}
    </section>
  `;
}

function openTimelineRecord(button) {
  const view = button.dataset.timelineView;
  const targetId = button.dataset.timelineTarget;
  if (!view || !targetId) {
    document.getElementById("encounterStatus").textContent = "This timeline item has no linked chart record.";
    return;
  }

  setCurrentView(view);
  render();
  const target = document.getElementById(targetId);
  if (!target) {
    document.getElementById("encounterStatus").textContent = "The linked chart record could not be found.";
    return;
  }

  const recordDetails = target.closest("details") || target.querySelector("details");
  recordDetails?.setAttribute("open", "");
  let ancestor = target.parentElement;
  while (ancestor) {
    if (ancestor.classList?.contains("collapsible") && ancestor.classList.contains("collapsed")) {
      ancestor.querySelector(":scope > .collapse-head > .collapse-toggle")?.click();
    }
    ancestor = ancestor.parentElement;
  }
  target.setAttribute("tabindex", "-1");
  target.classList.add("timeline-target-highlight");
  target.focus({ preventScroll: true });
  target.scrollIntoView({
    behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "center"
  });
  window.setTimeout(() => target.classList.remove("timeline-target-highlight"), 2200);
}

function renderPatientDetail() {
  const detail = document.getElementById("patientDetail");
  const patient = getSelectedPatient();

  if (currentView === "billing") {
    const billing = patient.billing;
    const balance = typeof billing.balance === "number" && Number.isFinite(billing.balance)
      ? formatCurrency(billing.balance) : "Not recorded";
    detail.innerHTML = `
      <div class="detail-header billing-header">
        <div>
          <p class="eyebrow">Selected patient</p>
          <h3 id="patientDetailHeading" tabindex="-1">${escapeHtml(patient.name)}</h3>
          <p>${escapeHtml(patient.mrn)}</p>
        </div>
      </div>
      <section class="billing-summary" aria-labelledby="billingSummaryHeading">
        <div class="billing-summary-heading">
          <div>
            <p class="eyebrow">Revenue cycle</p>
            <h4 id="billingSummaryHeading">Billing summary</h4>
          </div>
          <span>Sample information</span>
        </div>
        <dl class="billing-details">
          <div class="billing-balance">
            <dt>Outstanding balance</dt>
            <dd>${escapeHtml(balance)}</dd>
          </div>
          <div><dt>Insurance</dt><dd>${escapeHtml(billing.insurance || "Not recorded")}</dd></div>
          <div><dt>Claim status</dt><dd>${escapeHtml(billing.claimStatus || "Not recorded")}</dd></div>
          <div><dt>Last payment</dt><dd>${escapeHtml(billing.lastPayment || "Not recorded")}</dd></div>
        </dl>
      </section>
    `;
    return;
  }

  const openTasks = patient.carePlan.tasks.filter((task) => task.status !== "Done");
  const canCompleteTask = hasPermission(currentUser.role, "task:complete");
  const detailCards = getDetailCardsForView(patient, openTasks);

  detail.innerHTML = `
    <div class="detail-header">
      <div>
        <p class="eyebrow">Current patient</p>
        <h3 id="patientDetailHeading" tabindex="-1">${escapeHtml(patient.name)}</h3>
        <p>${escapeHtml(patient.mrn)} • ${escapeHtml(patient.age)} years • ${escapeHtml(patient.sex)}</p>
      </div>
      <span class="pill">${escapeHtml(patient.priority)}</span>
    </div>

    ${renderPatientStatusDashboard(patient)}
    ${renderPatientTimeline(patient)}

    <div class="detail-grid">
      ${detailCards
        .map(
          (card) => `
            <article class="mini-card">
              <h4>${card.title}</h4>
              <ul>
                ${card.items.map((item, index) => `
                  <li ${card.title === "Lab markers" ? `id="patient-lab-${escapeHtml(patient.id)}-${index}"` : ""}>${escapeHtml(item)}</li>
                `).join("")}
              </ul>
              ${card.action === "task" && patient.carePlan.tasks.length ? `
                <div class="care-plan-task-list">
                  <strong>Task records</strong>
                  <ul>
                    ${patient.carePlan.tasks.map((task) => `
                      <li id="patient-care-task-${escapeHtml(task.id)}">
                        <span>${escapeHtml(task.label)}</span>
                        <small>${escapeHtml(task.status)}${task.dueDate ? ` · Due ${escapeHtml(formatDisplayDate(task.dueDate))}` : ""}</small>
                      </li>`).join("")}
                  </ul>
                </div>` : ""}
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
          <article class="imaging-record" id="patient-imaging-${escapeHtml(record.id)}">
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
            ${record.image ? `
              <figure class="imaging-preview">
                <img src="${escapeHtml(record.image.src)}" alt="Reference ${escapeHtml(record.modality)} example for ${escapeHtml(record.bodySite)}; not this patient's scan" loading="lazy" />
                <figcaption>Reference example only—not this patient's scan or a diagnostic report. Source: <a href="${escapeHtml(record.image.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(record.image.creator)}, Wikimedia Commons</a> · <a href="${escapeHtml(record.image.licenseUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(record.image.license)}</a></figcaption>
              </figure>` : ""}
          </article>`).join("")
        : '<p class="empty-state">No imaging or radiology records for this patient.</p>'}
    </div>

    <div class="mini-card detail-notes">
      <h4>Recent audit trail</h4>
      <ul>
        ${auditTrail
          .filter((entry) => entry.patientName === patient.name)
          .slice(0, 4)
          .map((entry) => `<li><strong>${escapeHtml(entry.actorLabel)}</strong> — ${escapeHtml(displayAuditDetails(entry))} <em>(${escapeHtml(entry.action)})</em></li>`)
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
        <div class="list-item appointment-item ${escapeHtml(normalizeAppointmentStatus(appointment.status).toLowerCase().replace(/\s+/g, "-"))}" id="patient-appointment-${escapeHtml(appointment.id)}">
          <div>
            <strong>${escapeHtml(appointment.time)} • ${escapeHtml(appointment.title)}</strong>
            <span>${escapeHtml(appointment.location)} • ${escapeHtml(normalizeAppointmentStatus(appointment.status))}</span>
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
              <p>${escapeHtml(displayAuditDetails(entry))}</p>
            </div>
          `
        )
        .join("")
    : '<p class="mini-card">No audit activity recorded yet.</p>';
}

let clinicalStatusPatientId = null;

function filterCareTeamOptions(searchId, selectId, statusId, roles, emptyLabel, selected) {
  const search = document.getElementById(searchId);
  const select = document.getElementById(selectId);
  const term = search.value.trim().toLowerCase();
  const matches = staffDirectory.filter((staff) =>
    roles.includes(staff.role) &&
    `${staff.name} ${staff.title || ""} ${staff.department || ""}`.toLowerCase().includes(term)
  );
  const names = matches.map((staff) => staff.name);
  if (selected && !names.includes(selected)) names.push(selected);
  select.innerHTML = `<option value="">${escapeHtml(emptyLabel)}</option>${names.map((name) =>
    `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`
  ).join("")}`;
  select.value = selected || "";
  document.getElementById(statusId).textContent = term
    ? `${matches.length} matching ${matches.length === 1 ? "staff member" : "staff members"}${selected && !matches.some((staff) => staff.name === selected) ? "; current selection retained" : ""}.`
    : "";
}

const careTeamSearches = [
  { searchId: "workflowAttendingSearch", selectId: "workflowAttending", statusId: "workflowAttendingSearchStatus", roles: ["Provider", "PA", "Midlevel"], emptyLabel: "Select provider" },
  { searchId: "workflowNurseSearch", selectId: "workflowNurse", statusId: "workflowNurseSearchStatus", roles: ["Nurse"], emptyLabel: "Unassigned" }
];

function renderClinicalWorkspace() {
  const patient = getSelectedPatient();
  if (!patient) return;
  if (clinicalStatusPatientId !== patient.id) {
    document.getElementById("clinicalStatus").textContent = "";
    careTeamSearches.forEach(({ searchId }) => {
      document.getElementById(searchId).value = "";
    });
    clinicalStatusPatientId = patient.id;
  }
  const clinical = patient.clinical;
  document.getElementById("clinicalPatientHeading").textContent = patient.name;
  document.getElementById("clinicalPatientMeta").textContent =
    `${patient.mrn} · ${patient.age} years · ${patient.sex} · ${patient.provider || "Provider unassigned"}`;
  document.getElementById("workflowSummary").innerHTML = `
    <span class="workflow-chip">${escapeHtml(clinical.stage)}</span>
    <span class="workflow-chip">${escapeHtml(clinical.location)}</span>
    <span class="workflow-chip">${escapeHtml(clinical.disposition || "Disposition pending")}</span>
  `;

  const workflowForm = document.getElementById("workflowForm");
  const selectOptions = (select, options, selected, emptyLabel) => {
    const optionNames = options.map((option) => typeof option === "string" ? option : option.name);
    if (selected && !optionNames.includes(selected)) optionNames.push(selected);
    select.innerHTML = `${emptyLabel ? `<option value="">${escapeHtml(emptyLabel)}</option>` : ""}${optionNames.map((value) => {
      return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
    }).join("")}`;
    select.value = selected || "";
  };
  selectOptions(document.getElementById("workflowDepartment"), departments.map((department) => department.name), clinical.department);
  careTeamSearches.forEach(({ searchId, selectId, statusId, roles, emptyLabel }) => {
    const selected = selectId === "workflowNurse" ? clinical.assignedNurse : clinical.attending;
    filterCareTeamOptions(searchId, selectId, statusId, roles, emptyLabel, selected);
  });
  const values = { ...clinical, ...clinical.vitals };
  Object.entries(values).forEach(([name, value]) => {
    if (workflowForm.elements[name]) workflowForm.elements[name].value = value ?? "";
  });
}

function openPatientChart(patientId) {
  const patient = patients.find((item) => Number(item.id) === Number(patientId));
  if (!patient) return;
  selectedPatientId = patient.id;
  currentView = "patients";
  recordAudit("patient:select", patient.name, `Opened chart for ${patient.mrn}.`);
  document.getElementById("patientSearch").value = "";
  render();
  scrollToWorkspaceTop();
}

let activeHeaderSearch = null;
const headerSearches = [
  { kind: "patient", inputId: "patientSearch", resultsId: "patientSearchResults" },
  { kind: "staff", inputId: "staffSearch", resultsId: "staffSearchResults" }
];

function renderHeaderSearch({ kind, inputId, resultsId }) {
  const input = document.getElementById(inputId);
  const resultsPanel = document.getElementById(resultsId);
  const term = input.value.trim().toLowerCase();
  if (!term || activeHeaderSearch !== kind) {
    resultsPanel.hidden = true;
    input.setAttribute("aria-expanded", "false");
    resultsPanel.innerHTML = "";
    return;
  }

  const results = kind === "patient"
    ? patients.filter((patient) =>
      `${patient.name} ${patient.mrn} ${patient.diagnosis} ${patient.status} ${patient.priority} ${patient.clinical.stage} ${patient.clinical.chiefComplaint} ${patient.clinical.department} ${patient.clinical.location} ${patient.provider} ${patient.clinical.assignedNurse} ${patient.allergies.join(" ")} ${patient.medications.join(" ")}`
        .toLowerCase().includes(term)
    ).slice(0, 5).map((patient) => ({
      type: "patient",
      id: patient.id,
      title: patient.name,
      subtitle: `${patient.mrn} · ${patient.diagnosis}`,
      kind: "Patient"
    }))
    : [
    ...staffDirectory.filter((staff) =>
      `${staff.name} ${staff.title} ${staff.role} ${staff.department} ${staff.location} ${staff.email}`
        .toLowerCase().includes(term)
    ).slice(0, 5).map((staff) => ({
      type: "staff",
      id: staff.id,
      title: staff.name,
      subtitle: `${staff.title} · ${staff.department}`,
      kind: staff.role
    })),
    ...departments.filter((department) =>
      `${department.name} ${department.code} ${department.description}`.toLowerCase().includes(term)
    ).slice(0, 5).map((department) => ({
      type: "department",
      id: department.name,
      title: department.name,
      subtitle: `${department.code} · ${department.description}`,
      kind: "Department"
    })),
    ...locations.filter((location) =>
      `${location.name} ${location.department} ${location.kind}`.toLowerCase().includes(term)
    ).slice(0, 5).map((location) => ({
      type: "location",
      id: location.name,
      title: location.name,
      subtitle: `${location.department} · ${location.kind}`,
      kind: "Location"
    }))
  ];

  resultsPanel.innerHTML = results.length
    ? results.map((result) => `
      <button class="global-search-result" type="button" role="option" data-search-type="${escapeHtml(result.type)}" data-search-id="${escapeHtml(result.id)}">
        <span><strong>${escapeHtml(result.title)}</strong><small>${escapeHtml(result.subtitle)}</small></span>
        <span class="search-result-kind">${escapeHtml(result.kind)}</span>
      </button>`).join("")
    : `<p class="search-empty">${kind === "patient" ? "No patients matched." : "No staff, departments, or locations matched."}</p>`;
  resultsPanel.hidden = false;
  input.setAttribute("aria-expanded", "true");
}

function renderGlobalSearch() {
  headerSearches.forEach(renderHeaderSearch);
}

function renderAdmissionsView(container) {
  const admittedPatients = getAdmittedPatients();
  container.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div><p class="eyebrow">Inpatient management</p><h3>Admissions dashboard</h3></div>
        <span class="pill">${admittedPatients.length} active ${admittedPatients.length === 1 ? "admission" : "admissions"}</span>
      </div>
      <p class="muted-copy">View active admissions across all departments. Update the encounter stage or disposition to change admission status.</p>
      ${hasPermission(currentUser.role, "workflow:update") ? '<button class="ghost-btn" type="button" data-register-patient>Register a patient</button>' : ""}
      <div class="table-wrap" id="admissionsTable"></div>
    </div>`;
  renderAdmissionTable(container.querySelector("#admissionsTable"), admittedPatients);
}

function getMyPatients() {
  const profile = getCurrentUserStaffProfile();
  if (!profile || !["clinician", "midlevel", "nurse"].includes(currentUser.role)) return [];
  const field = currentUser.role === "nurse" ? "assignedNurse" : "attending";
  return patients.filter((patient) => patient.clinical[field] === profile.name);
}

function renderMyPatientsView(container) {
  const profile = getCurrentUserStaffProfile();
  const supported = ["clinician", "midlevel", "nurse"].includes(currentUser.role);
  const assigned = getMyPatients();
  const openOrders = (patient) => patient.orders.filter((order) => ["Pending", "Acknowledged"].includes(order.status));
  const orderCount = assigned.reduce((count, patient) => count + openOrders(patient).length, 0);
  const assignment = currentUser.role === "nurse" ? "assigned nurse" : "attending";
  container.innerHTML = `
    <div class="panel my-patients-panel">
      <div class="panel-header">
        <div><p class="eyebrow">Care team workspace</p><h3>My patients</h3></div>
        <span class="pill">${assigned.length} ${assigned.length === 1 ? "patient" : "patients"} · ${orderCount} open ${orderCount === 1 ? "order" : "orders"}</span>
      </div>
      <p id="myPatientsStatus" class="status-message" role="status" aria-live="polite"></p>
      ${!supported
        ? '<p class="empty-state">Switch to a Provider, Midlevel, or Nurse role to see patients assigned to your linked staff profile.</p>'
        : !profile
          ? '<p class="empty-state">No staff profile is linked to this account. Patient assignments cannot be matched.</p>'
          : `<p class="muted-copy">Showing patients whose ${assignment} is ${escapeHtml(profile.name)}. Orders shown belong to these patients, not necessarily to you. Update assignments in ED &amp; inpatient.</p>
            ${assigned.length ? `<div class="my-patients-list">${assigned.map((patient) => {
              const orders = openOrders(patient);
              const tasks = patient.carePlan.tasks.filter((task) => task.status !== "Done").length;
              return `<article class="my-patient-card">
                <div class="my-patient-heading">
                  <div><h4>${escapeHtml(patient.name)}</h4><p>${escapeHtml(patient.mrn)} · ${escapeHtml(patient.clinical.location || "Location not recorded")} · ${escapeHtml(patient.clinical.stage)}</p></div>
                  <button class="ghost-btn action-btn" type="button" data-open-patient="${escapeHtml(patient.id)}">Open chart</button>
                </div>
                <p class="my-patient-assignment">Attending: ${escapeHtml(patient.clinical.attending || "Unassigned")} · Nurse: ${escapeHtml(patient.clinical.assignedNurse || "Unassigned")} · ${tasks} open ${tasks === 1 ? "task" : "tasks"}</p>
                <h5>Open orders (${orders.length})</h5>
                ${orders.length ? `<ul class="my-patient-orders">${orders.map((order) => `
                  <li><div><strong>${escapeHtml(order.title)}</strong><span>${escapeHtml(order.category)} · ${escapeHtml(order.priority)} · ${escapeHtml(order.status)}</span></div>
                    <button class="text-btn" type="button" data-open-patient-order="${escapeHtml(patient.id)}" data-order-id="${escapeHtml(order.id)}" aria-label="Open order ${escapeHtml(order.title)} for ${escapeHtml(patient.name)}">View order</button>
                  </li>`).join("")}</ul>` : '<p class="empty-state">No pending or acknowledged orders.</p>'}
              </article>`;
            }).join("")}</div>` : `<p class="empty-state">No patients are currently assigned to ${escapeHtml(profile.name)} as ${assignment}.</p>`}`
      }
    </div>`;
}

function renderInboxView(container) {
  const unreadCount = inboxItems.filter((item) => item.status === "Unread").length;
  const categoryCounts = inboxItems.reduce((counts, item) => {
    counts.all += 1;
    const category = INBOX_FILTERS.find((filter) => filter.kind === item.kind);
    if (category) counts[category.key] += 1;
    return counts;
  }, Object.fromEntries(INBOX_FILTERS.map((filter) => [filter.key, 0])));
  inboxFilter = normalizeInboxFilter(inboxFilter);
  const activeFilter = INBOX_FILTERS.find((filter) => filter.key === inboxFilter);
  const term = inboxSearch.trim().toLowerCase();
  const visibleItems = inboxItems.filter((item) => {
    const matchesCategory = !activeFilter.kind || item.kind === activeFilter.kind;
    const matchesSearch = !term || `${item.patientName} ${item.mrn} ${item.title} ${item.summary} ${item.source}`.toLowerCase().includes(term);
    return matchesCategory && matchesSearch;
  });
  const canCompleteTasks = hasPermission(currentUser.role, "task:complete");
  container.innerHTML = `
    <div class="panel inbox-panel">
      <div class="panel-header inbox-header">
        <div>
          <p class="eyebrow">Messages · results · follow-up</p>
          <h3>In Basket</h3>
          <p class="muted-copy">Review messages, results, and care-plan tasks.</p>
        </div>
        <div class="inbox-header-actions">
          <span class="pill">${unreadCount} unread</span>
          <button class="ghost-btn" type="button" data-inbox-action="mark-all-read" ${unreadCount ? "" : "disabled"}>Mark all as read</button>
        </div>
      </div>
      <div class="inbox-filters" role="group" aria-label="Filter inbox by type">
        ${INBOX_FILTERS.map((filter) => `
          <button class="inbox-filter ${inboxFilter === filter.key ? "active" : ""}" type="button" data-inbox-filter="${filter.key}" aria-pressed="${inboxFilter === filter.key}">
            ${filter.label}<span>${categoryCounts[filter.key]}</span>
          </button>`).join("")}
      </div>
      <label class="inbox-search" for="inboxSearch">Search inbox
        <input id="inboxSearch" type="search" value="${escapeHtml(inboxSearch)}" placeholder="Patient, MRN, subject, or detail..." />
      </label>
      <p id="inboxStatus" class="status-message inbox-status" role="status" aria-live="polite"></p>
      <div class="inbox-list">
        ${visibleItems.length ? visibleItems.map((item) => {
          const unread = item.status === "Unread";
          const taskDone = item.kind === "Task" && item.status === "Done";
          return `
            <article class="inbox-item ${unread ? "is-unread" : ""} ${taskDone ? "is-done" : ""}">
              <div class="inbox-item-main">
                <div class="inbox-item-meta">
                  <span class="inbox-kind inbox-kind-${item.kind.toLowerCase()}">${escapeHtml(item.kind)}</span>
                  <span class="inbox-source">${escapeHtml(item.source)}</span>
                  ${item.priority === "High" ? '<span class="inbox-priority">Priority</span>' : ""}
                  <span class="inbox-item-time">${escapeHtml(item.receivedAt)}</span>
                </div>
                <h4>${escapeHtml(item.title)}</h4>
                <p class="inbox-patient"><button class="inline-link" type="button" data-open-patient="${escapeHtml(item.patientId)}">${escapeHtml(item.patientName)}</button><span>${escapeHtml(item.mrn)}</span></p>
                <p class="inbox-summary">${escapeHtml(item.summary)}</p>
              </div>
              <div class="inbox-item-actions">
                <span class="inbox-status-chip ${unread ? "unread" : taskDone ? "done" : ""}">${escapeHtml(item.status)}</span>
                ${item.kind === "Task"
                  ? `<button class="primary-btn action-btn" type="button" data-inbox-action="complete-task" data-inbox-id="${escapeHtml(item.id)}" ${taskDone || !canCompleteTasks ? "disabled" : ""}>${taskDone ? "Completed" : "Complete task"}</button>`
                  : `<button class="ghost-btn action-btn" type="button" data-inbox-action="toggle-read" data-inbox-id="${escapeHtml(item.id)}">${unread ? "Mark read" : "Mark unread"}</button>`}
              </div>
            </article>`;
        }).join("") : '<p class="empty-state">No inbox items match this filter.</p>'}
      </div>
    </div>`;
}

function announceInboxStatus(message) {
  const status = document.getElementById("inboxStatus");
  if (status) status.textContent = message;
}

function handleInboxAction(action, itemId) {
  if (action === "mark-all-read") {
    const updatedCount = inboxItems.filter((item) => item.status === "Unread").length;
    inboxItems.forEach((item) => {
      if (item.status === "Unread") item.status = item.kind === "Result" ? "Reviewed" : "Read";
    });
    if (updatedCount) recordAudit("inbox:mark-all-read", "Multiple patients", `Marked ${updatedCount} inbox items as read.`);
    saveState();
    render();
    announceInboxStatus(updatedCount ? `Marked ${updatedCount} items as read.` : "There are no unread items.");
    return;
  }

  const item = inboxItems.find((entry) => entry.id === itemId);
  if (!item) return;
  if (action === "toggle-read") {
    const wasUnread = item.status === "Unread";
    item.status = wasUnread ? (item.kind === "Result" ? "Reviewed" : "Read") : "Unread";
    recordAudit(wasUnread ? "inbox:item:read" : "inbox:item:unread", item.patientName, `${wasUnread ? "Marked read" : "Marked unread"}: ${item.title}.`);
    saveState();
    render();
    announceInboxStatus(wasUnread ? "Inbox item marked read." : "Inbox item marked unread.");
    return;
  }

  if (action === "complete-task") {
    const permission = evaluatePermission(currentUser.role, "task:complete", item.patientName);
    if (!permission.allowed) {
      appendAuditEntry(permission.audit);
      saveState();
      render();
      announceInboxStatus(permission.message);
      return;
    }
    if (item.status === "Done") return;
    item.status = "Done";
    const patient = patients.find((entry) => entry.id === item.patientId);
    const task = patient?.carePlan?.tasks?.find((entry) => entry.label === item.taskLabel);
    if (task) task.status = "Done";
    recordAudit("inbox:task:complete", item.patientName, `Completed the demo inbox task: ${item.title}.`);
    saveState();
    render();
    announceInboxStatus("Task completed.");
  }
}

function renderNursingView(container) {
  const nurses = staffDirectory.filter((staff) => staff.role === "Nurse" && staff.status === "Active");
  if (nursingFilter !== "all" && !nurses.some((nurse) => nurse.name === nursingFilter)) nursingFilter = "all";
  const caredFor = patients.filter((patient) =>
    nursingFilter === "all" || patient.clinical.assignedNurse === nursingFilter
  );
  const census = caredFor.filter(isPatientAdmitted);
  container.innerHTML = `
    <div class="panel">
      <div class="panel-header">
        <div><p class="eyebrow">Nursing operations</p><h3>Nursing station</h3></div>
        <span class="pill">${census.length} admitted · ${caredFor.length} assigned</span>
      </div>
      <div class="nursing-toolbar">
        <label for="nursingNurseFilter">Nurse assignment
          <select id="nursingNurseFilter">
            <option value="all">All nursing assignments</option>
            ${nurses.map((nurse) => `<option value="${escapeHtml(nurse.name)}">${escapeHtml(nurse.name)} · ${escapeHtml(nurse.department)}</option>`).join("")}
          </select>
        </label>
        <p class="form-caution">Review assignment, location, allergies, and charted observations.</p>
      </div>
      <div class="table-wrap">
        ${caredFor.length ? `<table class="data-table">
          <thead><tr><th>Patient / MRN</th><th>Location</th><th>Department</th><th>Diagnosis / reason</th><th>Priority / stage</th><th>Vitals</th><th>Allergies</th><th></th></tr></thead>
          <tbody>${caredFor.map((patient) => `
            <tr>
              <td><strong>${escapeHtml(patient.name)}</strong><span>${escapeHtml(patient.mrn)} · ${escapeHtml(patient.age)} yrs · ${escapeHtml(patient.sex)}</span><span>Nurse: ${escapeHtml(patient.clinical.assignedNurse || "Unassigned")}</span></td>
              <td>${escapeHtml(patient.clinical.location)}</td>
              <td>${escapeHtml(patient.clinical.department)}</td>
              <td>${escapeHtml(patient.diagnosis)}</td>
              <td><strong>${escapeHtml(patient.priority)}</strong><span>${escapeHtml(patient.clinical.stage)}</span></td>
              <td>BP ${escapeHtml(patient.vitals.bp || "—")} · HR ${escapeHtml(patient.vitals.hr || "—")}<span>Temp ${escapeHtml(patient.vitals.temp || "—")} · SpO₂ ${escapeHtml(patient.vitals.spO2 || "—")}</span></td>
              <td>${escapeHtml(patient.allergies.join(", "))}</td>
              <td><button class="ghost-btn action-btn" type="button" data-open-patient="${escapeHtml(patient.id)}">Open chart</button></td>
            </tr>`).join("")}</tbody>
        </table>` : '<p class="empty-state">No patients match this nursing assignment.</p>'}
      </div>
    </div>`;
  container.querySelector("#nursingNurseFilter").value = nursingFilter;
}

function renderDepartmentsView(container) {
  container.innerHTML = `
    <div class="panel">
      <div class="panel-header"><div><p class="eyebrow">Organization</p><h3>Departments & services</h3></div><span class="pill">${departments.length} departments</span></div>
      <div class="directory-grid department-grid">${departments.map((department) => {
        const census = patients.filter((patient) => patient.clinical.department === department.name && isPatientAdmitted(patient)).length;
        const team = staffDirectory.filter((staff) => staff.department === department.name && staff.status === "Active").length;
        return `<article class="directory-card department-card">
          <div class="department-card-meta"><span class="record-category">${escapeHtml(department.code)}</span><span class="status-pill">${census} admitted</span></div>
          <h4>${escapeHtml(department.name)}</h4>
          <p class="department-description">${escapeHtml(department.description)}</p>
          <dl class="directory-facts"><div><dt>Active personnel</dt><dd>${team}</dd></div><div><dt>Care areas</dt><dd>${department.locations.length}</dd></div></dl>
          <div class="directory-locations"><span>Locations</span><p>${department.locations.map(escapeHtml).join(" · ")}</p></div>
        </article>`;
      }).join("")}</div>
    </div>`;
}

function renderLocationsView(container) {
  const locationRows = locations.map((location) => {
    const assigned = patients.filter((patient) => patient.clinical.location === location.name);
    const admittedCount = assigned.filter(isPatientAdmitted).length;
    return { ...location, assigned, admittedCount };
  });
  const unlisted = [...new Set(patients.map((patient) => patient.clinical.location))]
    .filter((name) => name && !locations.some((location) => location.name === name))
    .map((name) => ({
      name,
      department: "Other recorded location",
      kind: "Care area",
      capacity: null,
      assigned: patients.filter((patient) => patient.clinical.location === name),
      admittedCount: patients.filter((patient) => patient.clinical.location === name && isPatientAdmitted(patient)).length
    }));
  container.innerHTML = `
    <div class="panel">
      <div class="panel-header"><div><p class="eyebrow">Facility operations</p><h3>Locations & beds</h3></div><span class="pill">${locations.length + unlisted.length} locations</span></div>
      <p class="muted-copy">Occupancy is based on assigned patients.</p>
      <div class="table-wrap"><table class="data-table">
        <thead><tr><th>Location</th><th>Department</th><th>Type</th><th>Admitted patients</th><th>Occupancy</th><th>Assigned patients</th></tr></thead>
        <tbody>${[...locationRows, ...unlisted].map((location) => `
          <tr><td><strong>${escapeHtml(location.name)}</strong></td><td>${escapeHtml(location.department)}</td><td>${escapeHtml(location.kind)}</td>
            <td>${location.admittedCount}</td><td>${location.capacity ? `${location.admittedCount} / ${location.capacity}` : "Capacity not set"}</td>
            <td>${location.assigned.length ? location.assigned.map((patient) => `<button class="inline-link" type="button" data-open-patient="${escapeHtml(patient.id)}">${escapeHtml(patient.name)}</button>`).join(", ") : "—"}</td>
          </tr>`).join("")}</tbody>
      </table></div>
    </div>`;
}

function formatStaffProfileName(staff) {
  if (staff.role !== "Provider") return staff.name;
  const name = staff.name.replace(/^Dr\.\s+/i, "");
  return /,\s*MD$/i.test(name) ? name : `${name}, MD`;
}

function renderStaffAvatar(staff) {
  const portrait = staffPortraits.get(staff.id);
  if (portrait) {
    return `<img class="staff-avatar staff-photo" src="${escapeHtml(portrait)}" alt="${escapeHtml(formatStaffProfileName(staff))} profile portrait (stock photo)" width="88" height="88" />`;
  }
  return `<div class="staff-avatar" aria-hidden="true">${escapeHtml(staff.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join(""))}</div>`;
}

function renderStaffView(container) {
  const searchInput = typeof document === "undefined" ? null : document.getElementById("staffSearch");
  const searchTerm = searchInput?.value.trim().toLowerCase() || "";
  const filteredStaff = staffDirectory
    .filter((staff) =>
      `${formatStaffProfileName(staff)} ${staff.name} ${staff.title} ${staff.role} ${staff.status} ${staff.department} ${staff.location} ${staff.email || ""}`
        .toLowerCase().includes(searchTerm)
    )
    .sort((left, right) => formatStaffProfileName(left).localeCompare(formatStaffProfileName(right)));
  const staffCards = filteredStaff.map((staff) => `
      <article class="directory-card staff-directory-card">
        ${renderStaffAvatar(staff)}
        <div class="directory-card-content">
          <div class="staff-card-heading">
            <h4>${escapeHtml(formatStaffProfileName(staff))}</h4>
            <div class="staff-card-labels">
              <span class="staff-card-role">${escapeHtml(staff.role)}</span>
              <span class="staff-card-status">${escapeHtml(staff.status)}</span>
            </div>
          </div>
          <p class="staff-card-title">${escapeHtml(staff.title)}</p>
          <p class="staff-card-meta">${escapeHtml(staff.department)} · ${escapeHtml(staff.location)}</p>
          ${staff.email
            ? `<a class="staff-card-email" href="mailto:${escapeHtml(staff.email)}">${escapeHtml(staff.email)}</a>`
            : '<span class="staff-card-email">No contact email recorded</span>'}
        </div>
        <button class="ghost-btn action-btn" type="button" data-open-staff-profile="${escapeHtml(staff.id)}" aria-label="View profile for ${escapeHtml(formatStaffProfileName(staff))}">View profile</button>
      </article>`).join("");
  container.innerHTML = `
    <div class="panel">
      <div class="panel-header staff-directory-header">
        <p class="eyebrow">People &amp; workforce</p>
        <span class="pill" aria-live="polite">${searchTerm
          ? `${filteredStaff.length} ${filteredStaff.length === 1 ? "match" : "matches"}`
          : `${staffDirectory.length} profiles`}</span>
        ${currentUser.role === "admin" ? `
          <details class="staff-add-panel">
            <summary>Add staff profile</summary>
            <form id="staffForm" class="clinical-form">
              <div class="row"><label>Name<input name="name" required /></label><label>Title / credentials<input name="title" placeholder="e.g., Registered Nurse" required /></label></div>
              <div class="row"><label>Personnel type<select name="role"><option>Provider</option><option>PA</option><option>Nurse</option><option>Midlevel</option><option>Administrator</option></select></label>
                <label>Department<select name="department">${departments.map((department) => `<option>${escapeHtml(department.name)}</option>`).join("")}<option>Administration</option></select></label></div>
              <div class="row"><label>Location<input name="location" placeholder="Unit or work area" required /></label><label>Contact email<input name="email" type="email" placeholder="name@example.test" /></label></div>
              <button class="primary-btn" type="submit">Add to directory</button>
              <p class="form-caution">Adding a profile does not create an account or grant access.</p>
            </form>
          </details>` : ""}
      </div>
      ${filteredStaff.length
        ? `<div class="directory-grid">${staffCards}</div>`
        : '<p class="empty-state">No staff found. Try a name, role, department, or location.</p>'}
    </div>`;
}

function renderProfilesView(container) {
  const profileType = currentView === "patient-profiles" ? "patient" : "staff";
  if (selectedProfile.type !== profileType) {
    selectedProfile = profileType === "patient"
      ? { type: "patient", id: selectedPatientId }
      : { type: "staff", id: staffDirectory[0]?.id || "" };
  }
  const currentStaff = staffDirectory.find((staff) => staff.id === selectedProfile.id);
  const currentPatient = patients.find((patient) => Number(patient.id) === Number(selectedProfile.id));
  if (selectedProfile.type === "staff" && !currentStaff) selectedProfile = { type: "staff", id: staffDirectory[0]?.id || "" };
  if (selectedProfile.type === "patient" && !currentPatient) selectedProfile = { type: "patient", id: patients[0]?.id };
  const profile = selectedProfile.type === "patient"
    ? patients.find((patient) => Number(patient.id) === Number(selectedProfile.id))
    : staffDirectory.find((staff) => staff.id === selectedProfile.id);
  const selector = `
    <label class="profile-selector" for="profileSelector">${profileType === "staff" ? "Select staff member" : "Select patient"}
      <select id="profileSelector">
        ${profileType === "staff"
          ? staffDirectory.map((staff) => `<option value="staff:${escapeHtml(staff.id)}">${escapeHtml(formatStaffProfileName(staff))} · ${escapeHtml(staff.role)}</option>`).join("")
          : patients.map((patient) => `<option value="patient:${escapeHtml(patient.id)}">${escapeHtml(patient.name)} · ${escapeHtml(patient.mrn)}</option>`).join("")}
      </select>
    </label>`;
  if (!profile) {
    container.innerHTML = `<div class="panel"><div class="panel-header"><div><p class="eyebrow">Profiles</p><h3>People in Northstar</h3></div></div>${selector}<p class="empty-state">No profile is available.</p></div>`;
    return;
  }
  const isPatient = selectedProfile.type === "patient";
  const profileBody = isPatient ? `
    <div class="profile-header">
      <div class="staff-avatar patient-avatar" aria-hidden="true">${escapeHtml(profile.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join(""))}</div>
      <div><p class="eyebrow">Patient profile</p><h3>${escapeHtml(profile.name)}</h3><p>${escapeHtml(profile.mrn)} · ${escapeHtml(profile.age)} years · ${escapeHtml(profile.sex)}</p></div>
      <button class="primary-btn" type="button" data-open-patient="${escapeHtml(profile.id)}">Open full chart</button>
    </div>
    <div class="profile-facts">
      <article><span>Encounter</span><strong>${escapeHtml(profile.clinical.stage)} · ${escapeHtml(profile.priority)}</strong></article>
      <article><span>Department / location</span><strong>${escapeHtml(profile.clinical.department)} · ${escapeHtml(profile.clinical.location)}</strong></article>
      <article><span>Care team</span><strong>${escapeHtml(profile.clinical.attending || profile.provider)} · ${escapeHtml(profile.clinical.assignedNurse || "Nurse unassigned")}</strong></article>
      <article><span>Primary diagnosis</span><strong>${escapeHtml(profile.diagnosis)}</strong></article>
      <article><span>Allergies</span><strong>${escapeHtml(profile.allergies.join(", "))}</strong></article>
      <article><span>Current medication list</span><strong>${escapeHtml(profile.medications.join(", "))}</strong></article>
      <article><span>Latest observations</span><strong>BP ${escapeHtml(profile.vitals.bp || "—")} · HR ${escapeHtml(profile.vitals.hr || "—")} · Temp ${escapeHtml(profile.vitals.temp || "—")} · SpO₂ ${escapeHtml(profile.vitals.spO2 || "—")}</strong></article>
      <article><span>Open orders / notes</span><strong>${profile.orders.filter((order) => !["Completed", "Cancelled"].includes(order.status)).length} open orders · ${profile.documents.length} notes</strong></article>
    </div>` : `
    <div class="profile-header staff-profile-header">
      ${renderStaffAvatar(profile)}
      <div><p class="eyebrow">Staff profile</p><h3>${escapeHtml(formatStaffProfileName(profile))}</h3><p>${escapeHtml(profile.title)} · ${escapeHtml(profile.status)}</p></div>
    </div>
    <div class="profile-facts">
      <article><span>Personnel type</span><strong>${escapeHtml(profile.role)}</strong></article>
      <article><span>Department</span><strong>${escapeHtml(profile.department)}</strong></article>
      <article><span>Work location</span><strong>${escapeHtml(profile.location)}</strong></article>
      <article><span>Contact</span><strong>${escapeHtml(profile.email || "Not recorded")}</strong></article>
      <article><span>Patients on care team</span><strong>${patients.filter((patient) => patient.clinical.attending === profile.name || patient.clinical.assignedNurse === profile.name).length}</strong></article>
      <article><span>System access</span><strong>Directory profile only · no account linked</strong></article>
    </div>`;
  container.innerHTML = `<div class="panel profile-panel">
    <div class="panel-header"><div><p class="eyebrow">${isPatient ? "Identity & care team" : "People & workforce"}</p><h3>${isPatient ? "Patient profile" : "Staff profile"}</h3></div>${selector}</div>
    ${profileBody}
  </div>`;
  container.querySelector("#profileSelector").value = `${selectedProfile.type}:${selectedProfile.id}`;
}

function renderExtendedWorkspace() {
  const container = document.getElementById("extendedContent");
  if (!container) return;
  switch (currentView) {
    case "my-patients": renderMyPatientsView(container); break;
    case "inbox": renderInboxView(container); break;
    case "admissions": renderAdmissionsView(container); break;
    case "nursing": renderNursingView(container); break;
    case "departments": renderDepartmentsView(container); break;
    case "locations": renderLocationsView(container); break;
    case "staff": renderStaffView(container); break;
    case "profiles": renderProfilesView(container); break;
    case "patient-profiles": renderProfilesView(container); break;
    default: container.innerHTML = "";
  }
}

function renderStructuredFields(containerId, fields, heading = "Type-specific details", help = "Complete the relevant fields before saving.") {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="structured-fields-heading">
      <strong>${escapeHtml(heading)}</strong>
      <span>${escapeHtml(help)}</span>
    </div>
    <div class="structured-fields-grid">
      ${fields.map((field) => {
        const required = field.required ? "required" : "";
        const label = `${escapeHtml(field.label)}${field.required ? ' <span class="required-marker" aria-hidden="true">*</span>' : ""}`;
        if (field.type === "select") {
          return `<label><span>${label}</span>
            <select name="${escapeHtml(field.name)}" ${required}>
              <option value="">Select...</option>
              ${field.options.map((option) => `<option>${escapeHtml(option)}</option>`).join("")}
            </select>
          </label>`;
        }
        if (field.type === "textarea") {
          return `<label class="structured-field-wide"><span>${label}</span>
            <textarea name="${escapeHtml(field.name)}" rows="2" placeholder="${escapeHtml(field.placeholder)}" ${required}></textarea>
          </label>`;
        }
        return `<label><span>${label}</span>
          <input name="${escapeHtml(field.name)}" type="${escapeHtml(field.type)}" placeholder="${escapeHtml(field.placeholder)}" ${required} />
        </label>`;
      }).join("")}
    </div>
  `;
}

const orderFieldDrafts = {};
const documentFieldDrafts = {};
let activeOrderTemplate = "";
let activeDocumentTemplate = "";

function renderOrderFields() {
  const category = document.querySelector('#orderForm [name="category"]').value;
  const form = document.getElementById("orderForm");
  if (activeOrderTemplate) {
    orderFieldDrafts[activeOrderTemplate] = Object.fromEntries(
      orderTypeFields[activeOrderTemplate].map((field) => [field.name, form.elements[field.name]?.value || ""])
    );
  }
  activeOrderTemplate = category;
  renderStructuredFields("orderSpecificFields", orderTypeFields[category] || []);
  Object.entries(orderFieldDrafts[category] || {}).forEach(([name, value]) => {
    if (form.elements[name]) form.elements[name].value = value;
  });
}

function renderDocumentFields() {
  const type = document.querySelector('#documentForm [name="type"]').value;
  const form = document.getElementById("documentForm");
  if (activeDocumentTemplate) {
    documentFieldDrafts[activeDocumentTemplate] = Object.fromEntries(
      documentTypeFields[activeDocumentTemplate].map((field) => [field.name, form.elements[field.name]?.value || ""])
    );
  }
  activeDocumentTemplate = type;
  renderStructuredFields("documentSpecificFields", documentTypeFields[type] || [], "Document details", "Required fields are marked with *.");
  Object.entries(documentFieldDrafts[type] || {}).forEach(([name, value]) => {
    if (form.elements[name]) form.elements[name].value = value;
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
        <article class="record-card" id="patient-order-${escapeHtml(order.id)}">
          <div class="record-card-header">
            <div>
              <span class="record-category">${escapeHtml(order.category)} · ${escapeHtml(order.priority)}</span>
              <h4>${escapeHtml(order.title)}</h4>
            </div>
            <span class="status-pill status-${escapeHtml(order.status.toLowerCase())}">${escapeHtml(order.status)}</span>
          </div>
          ${order.details ? `<p>${escapeHtml(order.details)}</p>` : ""}
          ${order.fields?.length ? `<dl class="structured-record-fields">
            ${order.fields.map((field) => `<div><dt>${escapeHtml(field.label)}</dt><dd>${escapeHtml(field.value)}</dd></div>`).join("")}
          </dl>` : ""}
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
      <article class="record-card document-card" id="patient-document-${escapeHtml(document.id)}">
        <div class="record-card-header">
          <div>
            <span class="record-category">${escapeHtml(document.type)}</span>
            <h4>${escapeHtml(document.title)}</h4>
          </div>
          <span class="status-pill ${document.status === "Draft" ? "status-draft" : ""}">${escapeHtml(document.status)}</span>
        </div>
        <p class="document-meta">${escapeHtml(document.time)}</p>
        <div class="document-sections">
          ${Object.entries(document.sections || {}).filter(([, value]) => value).map(([key, value]) => `
            <div><strong>${escapeHtml(documentTypeFields[document.type]?.find((field) => field.name === key)?.label || key.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase()))}</strong>
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
  const importButton = document.getElementById("importBtn");
  if (importButton) importButton.disabled = !hasPermission(currentUser.role, "data:import");

  if (quickEncounterButton) quickEncounterButton.disabled = !canCreateEncounter;
  if (saveEncounterButton) saveEncounterButton.disabled = !canCreateEncounter;
  if (exportButton) exportButton.disabled = !canExport;
  if (!canUpdateWorkflow || currentView === "billing") closePatientRegistration();
  document.getElementById("registerPatientBtn").hidden = !canUpdateWorkflow || currentView === "billing";

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

function summarizeList(items, limit = 2) {
  const shown = items.filter(Boolean).slice(0, limit).join(" · ");
  return items.length > limit ? `${shown} · +${items.length - limit} more` : shown;
}

const SECTION_SUMMARIES = {
  queue: () => {
    const urgent = patients.filter((patient) => patient.priority === "Urgent").length;
    return `${patients.length} patients · ${urgent} urgent · ${patients.filter((patient) => patient.chartCompleted).length} charts completed`;
  },
  appointments: () => {
    const { appointments } = getSelectedPatient();
    const next = appointments.find((appointment) => appointment.status === "Scheduled");
    const done = appointments.filter((appointment) => appointment.status === "Completed").length;
    return `${done}/${appointments.length} completed${next ? ` · Next: ${next.time} ${next.title}` : ""}`;
  },
  snapshot: () => {
    const patient = getSelectedPatient();
    const openTasks = patient.carePlan.tasks.filter((task) => task.status !== "Done").length;
    return `${patient.provider} · ${openTasks} open ${openTasks === 1 ? "task" : "tasks"} · ${formatCurrency(patient.billing.balance)} balance`;
  },
  encounter: () => `Document a care note for ${getSelectedPatient().name}`,
  audit: () => hasPermission(currentUser.role, "audit:view")
    ? `${auditTrail.length} recorded ${auditTrail.length === 1 ? "action" : "actions"}`
    : "Admin role required to review",
  vitals: () => {
    const vitals = getSelectedPatient().vitals || {};
    return summarizeList([
      vitals.bp && `BP ${vitals.bp}`,
      vitals.hr !== undefined && vitals.hr !== "" && `HR ${vitals.hr}`,
      vitals.spO2 && `SpO₂ ${vitals.spO2}`
    ], 3) || "No vitals recorded";
  },
  imaging: () => {
    const { imaging } = getSelectedPatient();
    return imaging.length ? `${imaging.length} ${imaging.length === 1 ? "study" : "studies"} · Latest: ${imaging[0].study}` : "No imaging on file";
  },
  timeline: () => {
    const items = buildPatientTimeline(getSelectedPatient());
    const planned = items.filter((item) => item.phase === "planned").length;
    return items.length ? `${items.length} events · ${planned} planned` : "No events yet";
  },
  card: (target) => summarizeList([...target.querySelectorAll(":scope > ul > li")].map((item) => item.textContent.trim()))
};

// [target selector, header selector, collapsed by default, summary key]
const COLLAPSIBLES = [
  ["#patientQueuePanel", ".panel-header", true, "queue"],
  ["#appointmentsPanel", ".panel-header", true, "appointments"],
  ["#snapshotSection", ".panel-header", true, "snapshot"],
  ["#encounterSection", ".panel-header", true, "encounter"],
  ["#auditSection", ".panel-header", true, "audit"],
  [".vitals-dashboard", ".clinical-dashboard-heading", true, "vitals"],
  [".imaging-dashboard", ".clinical-dashboard-heading", true, "imaging"],
  [".patient-timeline", ".timeline-heading", false, "timeline"],
  [".detail-grid > .mini-card", "h4", true, "card"]
];
const collapsedKeys = new Set();
const seenKeys = new Set();

function getHeadingText(head) {
  const heading = head.matches("h3, h4") ? head : head.querySelector("h3, h4");
  return heading ? heading.firstChild.textContent.trim() : "";
}

function setCollapsed(target, head, button, collapsed) {
  const title = getHeadingText(head) || "section";
  target.classList.toggle("collapsed", collapsed);
  button.setAttribute("aria-expanded", String(!collapsed));
  button.setAttribute("aria-label", `${collapsed ? "Expand" : "Collapse"} ${title}`);
}

function renderSectionSummary(target, head, text) {
  let summary = target.querySelector(":scope > .section-summary");
  if (!summary) {
    summary = document.createElement("p");
    summary.className = "section-summary";
    head.after(summary);
  }
  summary.textContent = text;
}

function initCollapsibles() {
  COLLAPSIBLES.forEach(([targetSelector, headSelector, collapsedByDefault, summaryKey]) => {
    document.querySelectorAll(targetSelector).forEach((target) => {
      const head = target.querySelector(`:scope > ${headSelector}`);
      if (!head) return;
      const key = `${targetSelector}:${getHeadingText(head)}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        if (collapsedByDefault) collapsedKeys.add(key);
      }
      let button = head.querySelector(":scope > .collapse-toggle");
      if (!button) {
        button = document.createElement("button");
        button.type = "button";
        button.className = "collapse-toggle";
        button.textContent = "▾";
        head.classList.add("collapse-head");
        target.classList.add("collapsible");
        head.appendChild(button);
        button.addEventListener("click", () => {
          const collapsed = !target.classList.contains("collapsed");
          if (collapsed) collapsedKeys.add(key);
          else collapsedKeys.delete(key);
          setCollapsed(target, head, button, collapsed);
        });
      }
      setCollapsed(target, head, button, collapsedKeys.has(key));
      renderSectionSummary(target, head, SECTION_SUMMARIES[summaryKey](target));
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
  renderGlobalSearch();
  renderOperationsOverview();
  renderAccountRoles();
  renderExtendedWorkspace();
  renderPatientList();
  renderPatientDetail();
  renderAppointments();
  renderSnapshot();
  renderAuditTrail();
  renderClinicalWorkspace();
  renderOrders();
  renderDocuments();
  initCollapsibles();
  saveState();
}

function handlePatientSelection(id) {
  selectedPatientId = Number(id);
  const patient = getSelectedPatient();
  recordAudit("patient:select", patient.name, `Opened chart for ${patient.mrn}.`);
  render();
  focusSelectedPatientChart();
}

function focusSelectedPatientChart() {
  const heading = document.getElementById("patientDetailHeading");
  const panel = document.getElementById("patientDetailPanel");
  const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  heading.focus({ preventScroll: true });
  window.requestAnimationFrame(() => {
    panel.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });
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

function handlePatientRegistration(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const result = registerPatientForTriage(Object.fromEntries(new FormData(form).entries()));
  if (!result.allowed) {
    document.getElementById("patientRegistrationStatus").textContent = result.message;
    return;
  }
  form.reset();
  closePatientRegistration();
  document.getElementById("patientRegistrationStatus").textContent = "";
  render();
  document.getElementById("clinicalStatus").textContent =
    `Profile created for ${result.patient.name}. Step 2 of 2: complete intake and triage, then save.`;
  document.querySelector('#workflowForm [name="chiefComplaint"]').focus();
}

function openPatientRegistration() {
  if (!hasPermission(currentUser.role, "workflow:update")) return;
  if (currentView !== "patients") {
    setCurrentView("patients");
    render();
  }
  const queue = document.getElementById("patientQueuePanel");
  if (queue.classList.contains("collapsed")) queue.querySelector(".collapse-toggle").click();
  const registration = document.getElementById("patientRegistration");
  registration.hidden = false;
  document.getElementById("registerPatientBtn").setAttribute("aria-expanded", "true");
  registration.querySelector('input[name="name"]').focus();
}

function closePatientRegistration() {
  document.getElementById("patientRegistration").hidden = true;
  document.getElementById("registerPatientBtn").setAttribute("aria-expanded", "false");
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
  if (result.allowed) {
    delete orderFieldDrafts[order.category];
    activeOrderTemplate = "";
    form.reset();
    renderOrderFields();
  }
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
  if (result.allowed) {
    delete documentFieldDrafts[documentData.type];
    activeDocumentTemplate = "";
    form.reset();
    renderDocumentFields();
  }
  render();
}

function attachEvents() {
  initializeWorkspaceNavigation();
  careTeamSearches.forEach(({ searchId, selectId, statusId, roles, emptyLabel }) => {
    document.getElementById(searchId).addEventListener("input", () => {
      filterCareTeamOptions(searchId, selectId, statusId, roles, emptyLabel, document.getElementById(selectId).value);
    });
  });
  headerSearches.forEach((search) => {
    const input = document.getElementById(search.inputId);
    const resultsPanel = document.getElementById(search.resultsId);
    const updateSearch = () => {
      activeHeaderSearch = search.kind;
      renderGlobalSearch();
      if (search.kind === "staff" && currentView === "staff") {
        renderStaffView(document.getElementById("extendedContent"));
      }
    };
    input.addEventListener("focus", () => {
      activeHeaderSearch = search.kind;
      renderGlobalSearch();
    });
    input.addEventListener("input", updateSearch);
    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        input.value = "";
        updateSearch();
      } else if (event.key === "ArrowDown") {
        const firstResult = resultsPanel.querySelector(".global-search-result");
        if (firstResult) {
          event.preventDefault();
          firstResult.focus();
        }
      }
    });
    resultsPanel.addEventListener("keydown", (event) => {
      const results = [...resultsPanel.querySelectorAll(".global-search-result")];
      const index = results.indexOf(event.target);
      if (event.key === "ArrowDown" && index < results.length - 1) {
        event.preventDefault();
        results[index + 1].focus();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (index > 0) results[index - 1].focus();
        else input.focus();
      } else if (event.key === "Escape") {
        input.value = "";
        updateSearch();
        input.focus();
      }
    });
    resultsPanel.addEventListener("click", (event) => {
      const result = event.target.closest("[data-search-type]");
      if (!result) return;
      const { searchType, searchId } = result.dataset;
      input.value = "";
      activeHeaderSearch = null;
      if (searchType === "patient") {
        selectedPatientId = Number(searchId);
        selectedProfile = { type: "patient", id: selectedPatientId };
        setCurrentView("patient-profiles");
      } else if (searchType === "staff") {
        openStaffProfile(searchId);
        return;
      } else {
        setCurrentView(searchType === "department" ? "departments" : "locations");
      }
      render();
      scrollToWorkspaceTop();
    });
  });
  document.getElementById("patientListSearch").addEventListener("input", renderPatientList);
  document.querySelectorAll("[data-stat-filter]").forEach((card) => {
    card.addEventListener("click", () => setStatFilter(card.dataset.statFilter));
  });
  document.getElementById("clearFilterBtn").addEventListener("click", () => setStatFilter(null));

  document.getElementById("patientList").addEventListener("click", (event) => {
    const card = event.target.closest(".patient-card");
    if (card) handlePatientSelection(card.dataset.id);
  });
  document.getElementById("operationsOverviewSection").addEventListener("click", (event) => {
    if (event.target.closest("[data-open-view]")) {
      setCurrentView("admissions");
      render();
      scrollToWorkspaceTop();
    }
  });
  document.getElementById("extendedContent").addEventListener("click", (event) => {
    if (event.target.closest("[data-register-patient]")) {
      openPatientRegistration();
      return;
    }
    const inboxAction = event.target.closest("[data-inbox-action]");
    if (inboxAction) {
      handleInboxAction(inboxAction.dataset.inboxAction, inboxAction.dataset.inboxId);
      return;
    }
    const inboxFilterButton = event.target.closest("[data-inbox-filter]");
    if (inboxFilterButton) {
      inboxFilter = normalizeInboxFilter(inboxFilterButton.dataset.inboxFilter);
      saveState();
      render();
      return;
    }
    const orderButton = event.target.closest("[data-open-patient-order]");
    if (orderButton) {
      const patient = patients.find((item) => String(item.id) === orderButton.dataset.openPatientOrder);
      const order = patient?.orders.find((item) => item.id === orderButton.dataset.orderId);
      if (!patient || !order) {
        document.getElementById("myPatientsStatus").textContent = "This order is no longer available. Refresh the workspace and try again.";
        return;
      }
      selectedPatientId = patient.id;
      recordAudit("patient:select", patient.name, `Opened chart for ${patient.mrn}.`);
      openTimelineRecord({ dataset: { timelineView: "orders", timelineTarget: `patient-order-${order.id}` } });
      return;
    }
    const patientButton = event.target.closest("[data-open-patient]");
    if (patientButton) {
      openPatientChart(patientButton.dataset.openPatient);
      return;
    }
    const staffButton = event.target.closest("[data-open-staff-profile]");
    if (staffButton) {
      openStaffProfile(staffButton.dataset.openStaffProfile);
    }
  });
  document.getElementById("extendedContent").addEventListener("input", (event) => {
    if (event.target.id !== "inboxSearch") return;
    const cursor = event.target.selectionStart;
    inboxSearch = event.target.value;
    renderInboxView(document.getElementById("extendedContent"));
    const search = document.getElementById("inboxSearch");
    search.focus();
    search.setSelectionRange(cursor, cursor);
  });
  document.getElementById("extendedContent").addEventListener("change", (event) => {
    if (event.target.id === "nursingNurseFilter") {
      nursingFilter = event.target.value;
      render();
    } else if (event.target.id === "profileSelector") {
      const [type, ...idParts] = event.target.value.split(":");
      selectedProfile = { type, id: type === "patient" ? Number(idParts.join(":")) : idParts.join(":") };
      render();
    }
  });
  document.getElementById("extendedContent").addEventListener("submit", (event) => {
    if (event.target.id !== "staffForm") return;
    event.preventDefault();
    if (currentUser.role !== "admin") {
      document.getElementById("encounterStatus").textContent = "Sign in with an Admin account to add a staff directory entry.";
      return;
    }
    const formData = new FormData(event.target);
    const name = String(formData.get("name") || "").trim();
    if (staffDirectory.some((staff) => staff.name.toLowerCase() === name.toLowerCase())) {
      document.getElementById("encounterStatus").textContent = "A staff profile with that name already exists.";
      return;
    }
    const staff = normalizeStaff({
      id: createRecordId("staff"),
      name,
      title: formData.get("title"),
      role: formData.get("role"),
      department: formData.get("department"),
      location: formData.get("location"),
      email: formData.get("email"),
      status: "Active"
    });
    staffDirectory.push(staff);
    selectedProfile = { type: "staff", id: staff.id };
    recordAudit("staff:create", "System", `Added staff directory profile for ${staff.name}.`);
    setCurrentView("profiles");
    render();
    document.getElementById("encounterStatus").textContent = `Added ${staff.name} to the demo staff directory.`;
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      closeMobileNavigation();
      setCurrentView(link.dataset.view);
      render();
      scrollToWorkspaceTop();
    });
  });

  document.getElementById("quickEncounterBtn").addEventListener("click", () => {
    closeMobileNavigation();
    setCurrentView("clinical");
    render();
    scrollToWorkspaceTop();
  });

  document.getElementById("accountRoles").addEventListener("submit", (event) => {
    const form = event.target.closest("[data-account-id]");
    if (!form) return;
    event.preventDefault();
    const result = updateAccountRoles(form.dataset.accountId, new FormData(form).getAll("roles"));
    render();
    document.getElementById("accountRoleStatus").textContent = result.message;
  });

  document.getElementById("roleSelector").addEventListener("change", (event) => {
    const role = event.target.value;
    const nextUser = setCurrentRole(role);
    render();
    document.getElementById("roleSwitchStatus").textContent = nextUser.role === role
      ? `Active role: ${getRoleLabel(role)}.`
      : "That role is not authorized for your account.";
  });

  document.getElementById("viewProfileBtn").addEventListener("click", () => {
    const profile = getCurrentUserStaffProfile();
    if (!profile) {
      document.getElementById("roleSwitchStatus").textContent = "No staff profile is linked to this account.";
      return;
    }
    closeMobileNavigation();
    openStaffProfile(profile.id);
  });

  document.getElementById("encounterForm").addEventListener("submit", handleEncounterSubmit);
  document.getElementById("registerPatientBtn").addEventListener("click", openPatientRegistration);
  document.getElementById("cancelPatientRegistration").addEventListener("click", () => {
    closePatientRegistration();
    document.getElementById("registerPatientBtn").focus();
  });
  document.getElementById("patientRegistrationForm").addEventListener("submit", handlePatientRegistration);
  document.getElementById("workflowForm").addEventListener("submit", handleWorkflowSubmit);
  document.getElementById("orderForm").addEventListener("submit", handleOrderSubmit);
  document.getElementById("documentForm").addEventListener("submit", handleDocumentSubmit);
  document.querySelector('#orderForm [name="category"]').addEventListener("change", renderOrderFields);
  document.querySelector('#documentForm [name="type"]').addEventListener("change", renderDocumentFields);

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
    const recordButton = event.target.closest("[data-timeline-target]");
    if (recordButton) {
      openTimelineRecord(recordButton);
      return;
    }
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

    const format = document.getElementById("exchangeFormat").value;
    const scope = document.getElementById("exchangeScope").value;
    let count;
    try {
      count = downloadPatientExport(patient, format, scope);
    } catch (error) {
      document.getElementById("encounterStatus").textContent = `Export failed: ${error.message}`;
      return;
    }
    const label = window.NorthstarInterop.FORMATS[format].label;
    recordAudit("report:export", scope === "all" ? "Multiple patients" : patient.name, `Exported ${count} record(s) as ${label}.`);
    document.getElementById("encounterStatus").textContent = `Exported ${count} record(s) as ${label}.`;
    render();
  });

  const importButton = document.getElementById("importBtn");
  const importFile = document.getElementById("importFile");
  importButton.addEventListener("click", () => {
    const permission = evaluatePermission(currentUser.role, "data:import", "Multiple patients");
    if (!permission.allowed) {
      appendAuditEntry(permission.audit);
      saveState();
      document.getElementById("encounterStatus").textContent = permission.message;
      render();
      return;
    }
    importFile.click();
  });
  importFile.addEventListener("change", async () => {
    const file = importFile.files[0];
    importFile.value = "";
    if (!file) return;
    if (file.size > window.NorthstarInterop.MAX_IMPORT_BYTES) {
      document.getElementById("encounterStatus").textContent = "Import failed: the file is too large (limit 5 MB).";
      return;
    }
    const status = document.getElementById("encounterStatus");
    try {
      const { format, patients: records } = window.NorthstarInterop.parseImport(file.name, await file.text());
      const result = importPatientRecords(records);
      if (!result.allowed) {
        appendAuditEntry(result.permission.audit);
        status.textContent = result.permission.message;
      } else {
        const label = window.NorthstarInterop.FORMATS[format].label;
        recordAudit("data:import", "Multiple patients", `Imported ${result.created} new and ${result.updated} updated record(s) from ${label}.`);
        status.textContent = `Imported ${result.created} new and ${result.updated} updated patient(s) from ${label}.`;
      }
    } catch (error) {
      status.textContent = `Import failed: ${error.message}`;
    }
    saveState();
    render();
  });
}

function bootstrap() {
  document.getElementById("loginForm").addEventListener("submit", handleLoginSubmit);
  document.getElementById("signOutBtn").addEventListener("click", signOut);
  document.getElementById("warningSignOutBtn").addEventListener("click", signOut);
  document.getElementById("acknowledgeWarningsBtn").addEventListener("click", acknowledgeWarnings);
  if (!activeDemoAccount) {
    try {
      if (localStorage.getItem(automaticSignInKey) !== "signed-out") {
        const account = demoAccounts.find((item) => item.id === automaticAccountId);
        localStorage.setItem(automaticSignInKey, account.id);
        sessionStorage.removeItem(warningAcknowledgmentKey);
        sessionStorage.setItem(demoSessionKey, account.id);
        activeDemoAccount = account;
        currentUser = loadCurrentUser(account);
        currentView = "overview";
      }
    } catch (error) {
      console.warn("Unable to start automatic sign-in", error);
      document.getElementById("loginError").textContent = "Unable to sign in automatically. Check your browser storage settings and try again.";
    }
  }
  if (activeDemoAccount) {
    let acknowledged = false;
    try {
      acknowledged = sessionStorage.getItem(warningAcknowledgmentKey) === activeDemoAccount.id;
    } catch (error) {
      console.warn("Unable to load warning acknowledgment", error);
    }
    if (acknowledged) showWorkspace();
    else showWarnings();
  }
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const usernameField = form.elements.namedItem("username");
  const passwordField = form.elements.namedItem("password");
  const username = usernameField.value.trim().toLowerCase();
  const password = passwordField.value;
  const account = demoAccounts.find((demoAccount) =>
    demoAccount.username === username && demoAccount.password === password
  );
  const error = document.getElementById("loginError");
  if (!account) {
    error.textContent = "That username or password doesn't match a sample account.";
    passwordField.value = "";
    passwordField.focus();
    return;
  }

  try {
    localStorage.setItem(automaticSignInKey, account.id === automaticAccountId ? account.id : "signed-out");
    sessionStorage.removeItem(warningAcknowledgmentKey);
    sessionStorage.setItem(demoSessionKey, account.id);
  } catch (storageError) {
    console.warn("Unable to save demo session", storageError);
    error.textContent = "Unable to start a demo session in this browser. Check your browser storage settings and try again.";
    return;
  }
  activeDemoAccount = account;
  currentUser = loadCurrentUser(account);
  currentView = "overview";
  activeStatFilter = null;
  document.getElementById("roleSwitchStatus").textContent = "";
  document.getElementById("accountRoleStatus").textContent = "";
  if (currentUser.role === "nurse") nursingFilter = currentUser.label;
  error.textContent = "";
  form.reset();
  showWarnings();
}

function showWarnings() {
  document.getElementById("loginScreen").hidden = true;
  document.getElementById("appShell").hidden = true;
  document.getElementById("warningScreen").hidden = false;
  document.getElementById("warningError").textContent = "";
  document.getElementById("warningTitle").focus();
}

function acknowledgeWarnings() {
  if (!activeDemoAccount) return;
  try {
    sessionStorage.setItem(warningAcknowledgmentKey, activeDemoAccount.id);
  } catch (error) {
    console.warn("Unable to save warning acknowledgment", error);
    document.getElementById("warningError").textContent = "Unable to save your acknowledgment. Check your browser storage settings and try again.";
    return;
  }
  showWorkspace();
}

function showWorkspace() {
  document.getElementById("loginScreen").hidden = true;
  document.getElementById("warningScreen").hidden = true;
  document.getElementById("appShell").hidden = false;
  renderOrderFields();
  renderDocumentFields();
  if (!workspaceEventsAttached) {
    attachEvents();
    workspaceEventsAttached = true;
  }
  render();
  document.getElementById("main-content").focus();
}

function signOut() {
  try {
    localStorage.setItem(automaticSignInKey, "signed-out");
    sessionStorage.removeItem(demoSessionKey);
    sessionStorage.removeItem(warningAcknowledgmentKey);
  } catch (error) {
    console.warn("Unable to clear demo session", error);
    const statusId = document.getElementById("warningScreen").hidden ? "roleSwitchStatus" : "warningError";
    document.getElementById(statusId).textContent = "Unable to sign out. Check your browser storage settings and try again.";
    return;
  }
  closeMobileNavigation();
  activeDemoAccount = null;
  document.getElementById("appShell").hidden = true;
  document.getElementById("warningScreen").hidden = true;
  document.getElementById("loginScreen").hidden = false;
  document.getElementById("loginError").textContent = "";
  document.getElementById("loginUsername").focus();
}

const appApi = {
  applyEncounterToPatient,
  buildPatientTimeline,
  buildExportPayload,
  calculateDashboardStats,
  createEncounterForPatient,
  createDocumentForPatient,
  createOrderForPatient,
  hasPermission,
  importPatientRecords,
  normalizeAuditEntry,
  normalizePatient,
  parseVitalsInput,
  registerPatientForTriage,
  setCurrentRole,
  updateAccountRole,
  updateAccountRoles,
  getVisibleSections,
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