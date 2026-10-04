# Northstar EHR

> Standalone browser-based EHR interface demo. See the [repository catalog](../README.md) for shared setup and deployment context.

A responsive electronic health record demonstration covering patient charts, emergency and inpatient encounter flow, clinical notes, orders, referrals, follow-up, appointments, and billing context.

## Features

- Patient worklist with 23 fictional patient charts, searchable diagnoses, demographics, histories, allergies, medications, labs, and vitals
- Patient status dashboard with current encounter status, allergy visibility, vital-sign history, imaging/report counts, and latest radiology summary
- Chronological patient timeline combining clinical notes, workflow updates, vitals, orders, imaging, and appointment activity
- Encounter progression for intake, triage, ED evaluation, consultation, admission, discharge, and closure
- Intake and triage capture for arrival mode, chief complaint, acuity, nursing note, vital signs, pain score, and location
- Disposition tracking for ward/ICU admission, home discharge, PCP or specialist referral, and transfer
- Type-specific structured details for nursing, vitals, diagnosis, laboratory, imaging, procedure, medication, and referral orders
- Per-patient imaging and radiology records with modality, body site, indication, report, status, and radiologist
- Workflow-specific structured drafts for ED, history and physical, admission, SOAP/progress, consult, nursing, procedure, discharge, and referral documents
- Clinician and nurse workflow roles, plus an admin review role and an activity audit trail
- Appointment management, care tasks, follow-up planning, patient summary export, and billing context
- Local browser persistence for the demonstration dataset

## Project structure

- index.html — app shell and dashboard layout
- styles.css — modern responsive UI styling
- app.js — patient data, UI rendering, interactions, and local storage
- docs/USER_GUIDE.md — usage guide and customization notes

## How to run

Open the app directly in a browser from the project folder:

```bash
cd northstar-ehr
open index.html
```

For a local server:

```bash
cd northstar-ehr
python3 -m http.server 8000
```

Then browse to http://localhost:8000.

## Test the project

Run the repository-wide test suite from the project root:

```bash
./run_tests.sh
```

## Important limitations

This is a front-end prototype with fictional sample patients and illustrative imaging text. Data is stored in browser local storage and is not protected, backed up, or shared with a care team. Orders and notes are not sent to clinical systems, medications are not prescribed, and role selection is a demonstration control rather than authentication or access control. Do not enter real patient information or use this application to make or document clinical decisions. A production EHR requires a secure backend, identity and access management, audit controls, validated clinical terminology and workflows, interoperability, and applicable privacy, safety, and regulatory review.
