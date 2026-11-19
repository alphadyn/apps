# Northstar EHR

**Deployed application:** [Open the app](https://alphadyn.github.io/apps/northstar-ehr/)

> Standalone browser-based EHR interface demo. See the [repository catalog](../README.md) for shared setup and deployment context.

A responsive electronic health record demonstration covering patient charts, emergency and inpatient encounter flow, clinical notes, orders, referrals, follow-up, appointments, and billing context.

Select the Northstar brand in the login panel or sidebar to reload the app's entry page. Demo data remains in browser storage.

## Features

- Modern clinical workspace with icon-based navigation, a collapsible desktop sidebar, a keyboard-accessible mobile drawer, compact account settings, and an on-demand Data tools menu
- Data exchange: export the selected patient or all patients as Northstar JSON, an Epic-compatible HL7 FHIR R4 or R5 Bundle (Patient, Condition, AllergyIntolerance, MedicationRequest, Observation, DiagnosticReport, Appointment, DocumentReference), or a CSV roster; import any of these (auto-detected) and upsert by MRN. Import requires the `data:import` permission (Provider, Midlevel, Admin). File-based only: no live Epic connection or OAuth.
- Aggregate Overview with chart activity, admission, department, team, and open-order counts; Admin-only authorized-role management with a last-Admin safeguard, plus user switching among their authorized roles
- In Basket for fictional care-team messages, sample results, and follow-up tasks, with category filters, patient chart links, read/review status, task completion, persistence, and audit entries
- Expandable Patients menu groups charts, admissions, nursing, appointments, encounters, orders, notes, and labs for provider and midlevel workflows
- Patient worklist with 23 fictional patient charts, searchable diagnoses, demographics, histories, allergies, medications, labs, and vitals
- Admissions census dashboard with patient, diagnosis, department, location, attending, nurse, priority, and encounter stage for every active sample admission
- Nursing station dashboard with nurse assignment filtering, patient location, demographics, diagnosis, observations, allergies, and direct chart navigation
- Organization directories for ED, MICU, SICU, NICU, radiology, surgery, OB/GYN, pediatrics, neurology, telemetry, and medicine, with locations and illustrative occupancy
- Staff directory and profiles for administrators, physicians, PAs, nurses, and midlevels; admin demo role can add fictional directory entries
- Unified search across patients, staff, departments, and care locations; patient and staff results open their profiles
- Patient profile pages and staff directory profiles with care-team and encounter context
- Patient status dashboard with current encounter status, allergy visibility, vital-sign history, imaging/report counts, and latest radiology summary
- Chronological patient timeline combining clinical notes, workflow updates, vitals, orders, imaging, and appointment activity; click or keyboard-expand an event to view its recorded details
- Encounter progression for intake, triage, ED evaluation, consultation, admission, discharge, and closure
- Intake and triage capture for arrival mode, chief complaint, acuity, nursing note, vital signs, pain score, and location
- Disposition tracking for ward/ICU admission, home discharge, PCP or specialist referral, and transfer
- Type-specific structured details for nursing, vitals, diagnosis, H&P, laboratory, imaging/radiology, procedure, medication, consult, and referral orders
- Per-patient imaging and radiology records with modality, body site, indication, report, status, and radiologist; selected charts display attributed, openly licensed radiology examples clearly marked as reference images, not patient scans
- Workflow-specific structured drafts for ED, history and physical, admission, SOAP/progress, consult, nursing, procedure, discharge, and referral documents
- Patient workflow assignment to a department, care location, attending provider, and nurse; clinician and nurse workflow roles, an admin review role, and an activity audit trail
- Client-side demo sign-in with a consolidated warning screen requiring acknowledgment on each sign-in; not real authentication or server-enforced authorization
- Joe Spartan, MD is automatically signed in as a Provider on first load, with sign-in remembered across browser restarts until explicit sign-out. After signing out, use `joe.spartan` / `northstar` to sign in again.
- Appointment management, care tasks, follow-up planning, patient summary export, and billing context
- Local browser persistence for the demonstration dataset

## Project structure

- index.html — app shell and dashboard layout
- styles.css — modern responsive UI styling
- app.js — fictional patient data, UI rendering, interactions, and local storage
- docs/USER_GUIDE.md — usage guide and customization notes
- docs/SECURITY_ARCHITECTURE.md — non-production secure multi-user architecture proposal

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

Run the focused workflow and role tests with Node.js 18 or newer:

```bash
node --test northstar-ehr/app.test.js
```

Run the repository-wide test suite from the project root:

```bash
./run_tests.sh
```

## Security status and important limitations

This is a public, browser-only prototype with fictional sample patients and illustrative imaging text. **Its client-side demo sign-in is not real authentication, and there is no server-enforced authorization or HIPAA safeguard.** Data is stored in browser local storage and is not protected, backed up, or shared with a care team. Admin-managed roles are browser-local demonstration settings, not trusted access control. Do not enter, import, or export real patient information or use this application to make or document clinical decisions. Orders and notes are not sent to clinical systems, and medications are not prescribed.

Joe Spartan's automatic sign-in is remembered in this browser until explicit sign-out; other sample accounts use tab-local sessions. Signing out disables automatic sign-in and ends the tab's demo session; it does not protect or clear locally stored data.

The proposed secure backend, profiles, permission model, encryption, and release requirements are documented in [SECURITY_ARCHITECTURE.md](./docs/SECURITY_ARCHITECTURE.md); it is a design only, not implemented or certified. Production use requires an approved and operated secure system, organizational risk analysis, contractual/vendor review including applicable BAAs, security controls, validated workflows, and privacy, clinical, legal, and compliance approval. Encryption alone does not establish HIPAA compliance.

### Radiology example image attribution

The following images are downloaded from Wikimedia Commons and shown only as external educational examples. They are not images of the fictional patients or evidence for the accompanying fictional reports. Original creator and license links are also shown beside each image.

- Thyroid ultrasound: [Drahreg01, *SD-Sono002.jpg*](https://commons.wikimedia.org/wiki/File:SD-Sono002.jpg), [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- Shoulder MRI: [Hellerhoff, *Post Dislocated shoulder MRI 01.png*](https://commons.wikimedia.org/wiki/File:Post_Dislocated_shoulder_MRI_01.png), [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
- Brain CT: Department of Radiology, Uppsala University Hospital, uploaded by Mikael Häggström, [*Computed tomography of human brain - large.png*](https://commons.wikimedia.org/wiki/File:Computed_tomography_of_human_brain_-_large.png), [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/)

### Staff portrait attribution

All 11 built-in clinical staff members (physicians, nurses, PA, and nurse practitioner) have locally stored stock portraits in their directory cards and staff profiles. Portraits are matched by stable staff ID, so they also appear in previously saved directories. Administrators and newly added directory entries retain initial avatars.

These portraits are used under the [Pexels License](https://www.pexels.com/license/). The models represent fictional profiles, not real clinicians with the displayed names.

| Profile | Photo source |
| --- | --- |
| Joe Spartan, MD | [Ivan S, *A Smiling Doctor with His Arms Crossed*](https://www.pexels.com/photo/a-smiling-doctor-with-his-arms-crossed-4989148/) |
| Dr. Elena Ruiz | [Antoni Shkraba, *A Doctor Looking at the Camera*](https://www.pexels.com/photo/a-doctor-looking-at-the-camera-6749781/) |
| Dr. Amir Hassan | [cottonbro studio, *A Portrait of a Doctor*](https://www.pexels.com/photo/a-portrait-of-a-doctor-5722163/) |
| Dr. Priya Singh | [*Confident Female Doctor in White Coat Portrait*](https://www.pexels.com/photo/confident-female-doctor-in-white-coat-portrait-38618416/) |
| Jordan Lee | [RDNE Stock project, *Nurse Wearing a Scrub Suit Smiling*](https://www.pexels.com/photo/nurse-wearing-a-scrub-suit-smiling-6129506/) |
| Casey Nguyen | [Klaus Nielsen, *Female doctor in medical mask and blue uniform*](https://www.pexels.com/photo/female-doctor-in-medical-mask-and-blue-uniform-6303586/) |
| Sam Carter | [RDNE Stock project, *Male Doctor in White Lab Coat*](https://www.pexels.com/photo/male-doctor-in-white-lab-coat-6129652/) |
| Riley Bennett | [Oys Photography, *Doctor*](https://www.pexels.com/photo/doctor-19438561/) |
| Jamie Brooks | [Antoni Shkraba, *A Doctor in a White Coat*](https://www.pexels.com/photo/a-doctor-in-a-white-coat-5214964/) |
| Dr. Morgan Ellis | [Tima Miroshnichenko, *Close-up Photo of a Male Doctor*](https://www.pexels.com/photo/close-up-photo-of-a-male-doctor-5452268/) |
| Dr. Taylor Reed | [RDNE Stock project, *Male Doctor in White Coat*](https://www.pexels.com/photo/male-doctor-in-white-coat-6129573/) |
