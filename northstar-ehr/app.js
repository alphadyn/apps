const storageKey = "northstar-ehr-state-v3";

const rolePermissions = {
  clinician: {
    label: "Clinician",
    actions: ["encounter:create", "workflow:update", "order:create", "document:create", "appointment:complete", "task:complete", "patient:select", "report:export", "data:import"]
  },
  nurse: {
    label: "Nurse",
    actions: ["workflow:update", "order:create", "document:create", "appointment:complete", "task:complete", "patient:select"]
  },
  admin: {
    label: "Admin",
    actions: ["appointment:cancel", "appointment:complete", "patient:select", "report:export", "data:import", "audit:view", "billing:view"]
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
  Laboratory: [
    textField("labTest", "Test / panel", "Test name or panel", true),
    selectField("labSpecimen", "Specimen", ["Blood", "Urine", "Swab", "Stool", "Other / see instructions"], true),
    selectField("labTiming", "Collection timing", ["Routine", "Timed", "Fasting", "Now"], true),
    textField("labCollectionDate", "Collection date / time", "If timed"),
    noteField("labClinicalInfo", "Clinical indication / collection notes", "Relevant context and special collection instructions")
  ],
  Imaging: [
    textField("imagingStudy", "Study requested", "e.g., chest radiograph, CT abdomen", true),
    selectField("imagingModality", "Modality", ["X-ray", "CT", "MRI", "Ultrasound", "Mammography", "DEXA", "Other"], true),
    textField("imagingBodySite", "Body site / laterality", "Specify anatomy and side"),
    selectField("imagingContrast", "Contrast", ["Not applicable", "Without contrast", "With contrast", "Without and with contrast", "Per radiology protocol"], true),
    selectField("pregnancyStatus", "Pregnancy status (when applicable)", ["Not applicable", "Not pregnant", "Pregnant", "Unknown / verify"], false),
    noteField("imagingIndication", "Clinical indication / protocol notes", "Symptoms, relevant history, comparison studies, and protocol requests", true)
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

function addPatientEvent(patient, type, title, details = "", timestamp = new Date().toISOString()) {
  const event = {
    id: createRecordId("event"),
    type,
    title,
    details,
    timestamp
  };
  patient.events.unshift(event);
  patient.events = patient.events.slice(0, 120);
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
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatTimelineDate(value) {
  const date = toTimelineDate(value);
  if (!date) return value || "Date not recorded";
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
  patient.vitalReadings.unshift({ values: snapshot, recordedAt, source });
  patient.vitalReadings = patient.vitalReadings.slice(0, 12);
  addPatientEvent(patient, "Vitals", "Vital signs recorded", source, recordedAt);
}

function buildPatientTimeline(patient) {
  const items = [];
  if (patient.diagnosis) {
    items.push({
      id: `timeline-diagnosis-${patient.id}`,
      type: "Diagnosis",
      title: patient.diagnosis,
      details: "Primary problem on the patient chart",
      timestamp: "",
      fallbackTime: "Date not recorded"
    });
  }
  (patient.labs || [])
    .filter((lab) => !/fictional demonstration values/i.test(lab))
    .forEach((lab, index) => {
      items.push({
        id: `timeline-lab-${patient.id}-${index}`,
        type: "Laboratory",
        title: lab,
        details: "Lab marker on the patient chart",
        timestamp: patient.labRecords?.[index]?.recordedAt || "",
        fallbackTime: patient.labRecords?.[index]?.recordedAt || "Date not recorded"
      });
    });
  (patient.carePlan?.tasks || [])
    .filter((task) => task.status !== "Done")
    .forEach((task, index) => {
      items.push({
        id: `timeline-task-${patient.id}-${index}`,
        type: "Care plan",
        title: task.label,
        details: "Open care task",
        timestamp: task.createdAt || "",
        fallbackTime: "Date not recorded"
      });
    });
  patient.events.forEach((event) => {
    items.push({ ...event, timestamp: event.timestamp, fallbackTime: "Date not recorded" });
  });
  patient.documents.forEach((document) => {
    items.push({
      id: `timeline-${document.id}`,
      type: "Document",
      title: document.title,
      details: `${document.type} · ${document.status}`,
      timestamp: document.createdAt || document.time,
      fallbackTime: document.time
    });
  });
  patient.orders.forEach((order) => {
    items.push({
      id: `timeline-${order.id}`,
      type: order.category,
      title: order.title,
      details: `Order · ${order.priority} priority · ${order.status}`,
      timestamp: order.createdAt || order.time,
      fallbackTime: order.time
    });
  });
  patient.imaging.forEach((record) => {
    items.push({
      id: `timeline-${record.id}`,
      type: "Imaging",
      title: record.study,
      details: `${record.modality} · ${record.bodySite} · ${record.status}${record.indication ? ` · ${record.indication}` : ""}`,
      timestamp: record.performedAt,
      fallbackTime: record.performedAt
    });
  });
  patient.appointments.forEach((appointment) => {
    items.push({
      id: `timeline-${appointment.id}`,
      type: "Appointment",
      title: appointment.title,
      details: `${appointment.status} · ${appointment.location}`,
      timestamp: appointment.updatedAt,
      fallbackTime: `Scheduled time ${appointment.time}`
    });
  });

  return items
    .map((item, index) => ({ ...item, sortTime: toTimelineDate(item.timestamp)?.getTime() ?? -index }))
    .sort((left, right) => right.sortTime - left.sortTime)
    .slice(0, 14);
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
    createdAt: appointment.createdAt || "",
    time: appointment.time,
    title: appointment.title,
    location: appointment.location,
    status: appointment.status || "Scheduled",
    updatedAt: appointment.updatedAt || ""
  };
}

function normalizePatient(patient) {
  const clinical = patient.clinical || {};
  const vitals = { ...(patient.vitals || {}), ...(clinical.vitals || {}) };
  return {
    ...patient,
    chartCompleted: Boolean(patient.chartCompleted),
    medicationReviewed: patient.medicationReviewed !== false,
    appointments: (patient.appointments || []).map(normalizeAppointment),
    vitalReadings: (patient.vitalReadings || [{
      values: vitals,
      recordedAt: patient.vitalsRecordedAt || "",
      source: "Current chart"
    }]).map((reading) => ({
      values: { ...(reading.values || {}) },
      recordedAt: reading.recordedAt || "",
      source: reading.source || "Recorded vitals"
    })),
    events: (patient.events || []).map((event) => ({
      id: event.id || createRecordId("event"),
      type: event.type || "Encounter",
      title: event.title || "Patient event",
      details: event.details || "",
      timestamp: event.timestamp || ""
    })),
    clinical: {
      arrivalMode: clinical.arrivalMode || "Walk-in",
      stage: clinical.stage || "Intake",
      chiefComplaint: clinical.chiefComplaint || "",
      acuity: clinical.acuity || "",
      triageNote: clinical.triageNote || "",
      vitals,
      painScore: clinical.painScore || "",
      location: clinical.location || patient.room || "Waiting",
      disposition: clinical.disposition || "",
      destination: clinical.destination || "",
      followUpDate: clinical.followUpDate || patient.carePlan?.followUpDate || ""
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
  patient.documents.unshift({
    id: createRecordId("document"),
    title: note.title,
    type: encounter.type || "Clinical encounter",
    status: "Draft",
    time: note.time,
    createdAt,
    sections: { summary: note.summary, vitals: encounter.vitals || "", plan: encounter.followup ? `Follow-up: ${encounter.followup}` : "" }
  });
  patient.chartCompleted = true;
  patient.medicationReviewed = true;
  patient.lastVisit = "Today";
  patient.status = encounter.followup ? "Follow-up scheduled" : "Stable";
  recordVitals(patient, updatedVitals, "Encounter documentation");
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

  addPatientEvent(patient, "Encounter", "Clinical encounter documented", `${note.title} · ${note.type}`);
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

  const submittedVitals = Object.fromEntries(
    ["bp", "hr", "rr", "temp", "spO2"].filter((key) => updates[key] !== undefined && updates[key] !== "").map((key) => [key, updates[key]])
  );
  recordVitals(patient, submittedVitals, "Intake / triage");
  addPatientEvent(
    patient,
    "Encounter",
    `Encounter updated · ${patient.clinical.stage}`,
    [patient.clinical.disposition, patient.clinical.location, patient.clinical.destination].filter(Boolean).join(" · ")
  );
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
  addPatientEvent(patient, order.category, `${order.category} order ${status.toLowerCase()}`, order.title, order.updatedAt);
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
  addPatientEvent(patient, "Care plan", "Care task completed", nextOpenTask.label);
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

function getFilterDetail(patient) {
  const openTasks = patient.carePlan.tasks.filter((task) => task.status !== "Done").length;
  const followUp = patient.carePlan.followUpDate ? formatDisplayDate(patient.carePlan.followUpDate) : "none scheduled";
  return `Chart ${patient.chartCompleted ? "complete" : "incomplete"} · Meds ${patient.medicationReviewed ? "reconciled" : "pending"} · ${openTasks} open ${openTasks === 1 ? "task" : "tasks"} · Follow-up: ${followUp}`;
}

function renderPatientList() {
  const searchField = document.getElementById("patientSearch");
  const searchTerm = searchField ? searchField.value.toLowerCase() : "";
  const statFilter = activeStatFilter ? STAT_FILTERS[activeStatFilter] : null;
  const filtered = patients.filter((patient) =>
    (!statFilter || statFilter.test(patient)) &&
    `${patient.name} ${patient.mrn} ${patient.priority} ${patient.status} ${patient.diagnosis}`.toLowerCase().includes(searchTerm)
  );
  document.getElementById("activeFilterBar").classList.toggle("hidden-section", !statFilter);
  if (statFilter) document.getElementById("activeFilterLabel").textContent = `Filter: ${statFilter.label}`;

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
    order.category === "Imaging" && ["Pending", "Acknowledged"].includes(order.status)
  );
  const finalReports = patient.imaging.filter((record) => record.status.toLowerCase() === "final").length;
  const preliminaryReports = patient.imaging.filter((record) => record.status.toLowerCase() !== "final").length;
  const latestImaging = [...patient.imaging].sort((left, right) =>
    (toTimelineDate(right.performedAt)?.getTime() || 0) - (toTimelineDate(left.performedAt)?.getTime() || 0)
  )[0];
  const allergyText = patient.allergies.length ? patient.allergies.join(", ") : "None listed";

  return `
    <section class="patient-status-dashboard" aria-label="Patient medical status dashboard">
      <div class="status-overview">
        <div>
          <p class="eyebrow">Current medical status</p>
          <h4>${escapeHtml(patient.diagnosis)}</h4>
          <p>${escapeHtml(patient.status)} · ${escapeHtml(patient.clinical.stage)} · ${escapeHtml(patient.room)}</p>
        </div>
        <div class="status-overview-tags">
          <span class="status-pill ${patient.priority === "Urgent" ? "status-urgent" : ""}">${escapeHtml(patient.priority)} priority</span>
          ${patient.clinical.acuity ? `<span class="status-pill status-acknowledged">${escapeHtml(patient.clinical.acuity)}</span>` : ""}
          <span class="status-pill">Care team: ${escapeHtml(patient.provider)}</span>
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
          ${patient.vitalReadings.length > 1 ? `
            <details class="vital-history">
              <summary>View recent readings</summary>
              <div class="vital-history-list">
                ${patient.vitalReadings.slice(0, 6).map((reading) => `
                  <div class="vital-history-row">
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
  return `
    <section class="patient-timeline" aria-labelledby="patientTimelineHeading">
      <div class="timeline-heading">
        <div>
          <p class="eyebrow">Longitudinal record</p>
          <h4 id="patientTimelineHeading">Patient timeline</h4>
        </div>
        <span class="dashboard-meta">${items.length} recent events</span>
      </div>
      ${items.length ? `<ol class="timeline-list">
        ${items.map((item) => `
          <li class="timeline-item">
            <span class="timeline-marker timeline-${escapeHtml(item.type.toLowerCase().replace(/[^a-z0-9]+/g, "-"))}" aria-hidden="true"></span>
            <div class="timeline-content">
              <div class="timeline-event-heading">
                <strong>${escapeHtml(item.title)}</strong>
                <span class="timeline-type">${escapeHtml(item.type)}</span>
              </div>
              ${item.details ? `<p>${escapeHtml(item.details)}</p>` : ""}
              <time>${escapeHtml(formatTimelineDate(item.timestamp || item.fallbackTime))}</time>
            </div>
          </li>`).join("")}
      </ol>` : '<p class="empty-state">Patient-related events will appear here as the chart is updated.</p>'}
    </section>
  `;
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

    ${renderPatientStatusDashboard(patient)}
    ${renderPatientTimeline(patient)}

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

function renderStructuredFields(containerId, fields) {
  const container = document.getElementById(containerId);
  container.innerHTML = `
    <div class="structured-fields-heading">
      <strong>Type-specific details</strong>
      <span>Complete the relevant fields before saving.</span>
    </div>
    <div class="structured-fields-grid">
      ${fields.map((field) => {
        const required = field.required ? "required" : "";
        const requiredMark = field.required ? ' <span aria-hidden="true">*</span>' : "";
        if (field.type === "select") {
          return `<label>${escapeHtml(field.label)}${requiredMark}
            <select name="${escapeHtml(field.name)}" ${required}>
              <option value="">Select...</option>
              ${field.options.map((option) => `<option>${escapeHtml(option)}</option>`).join("")}
            </select>
          </label>`;
        }
        if (field.type === "textarea") {
          return `<label class="structured-field-wide">${escapeHtml(field.label)}${requiredMark}
            <textarea name="${escapeHtml(field.name)}" rows="2" placeholder="${escapeHtml(field.placeholder)}" ${required}></textarea>
          </label>`;
        }
        return `<label>${escapeHtml(field.label)}${requiredMark}
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
  renderStructuredFields("documentSpecificFields", documentTypeFields[type] || []);
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
        <article class="record-card">
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
    return items.length ? `${items.length} events · Latest: ${items[0].title}` : "No events yet";
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
  [".patient-timeline", ".timeline-heading", true, "timeline"],
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
  document.getElementById("patientSearch").addEventListener("input", renderPatientList);
  document.querySelectorAll("[data-stat-filter]").forEach((card) => {
    card.addEventListener("click", () => setStatFilter(card.dataset.statFilter));
  });
  document.getElementById("clearFilterBtn").addEventListener("click", () => setStatFilter(null));

  document.getElementById("patientList").addEventListener("click", (event) => {
    const card = event.target.closest(".patient-card");
    if (card) handlePatientSelection(card.dataset.id);
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      setCurrentView(link.dataset.view);
      render();
      scrollToWorkspaceTop();
    });
  });

  document.getElementById("quickEncounterBtn").addEventListener("click", () => {
    setCurrentView("clinical");
    render();
    scrollToWorkspaceTop();
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
  renderOrderFields();
  renderDocumentFields();
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
  importPatientRecords,
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