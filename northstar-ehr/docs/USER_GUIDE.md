# User Guide

## Overview

Northstar EHR is a responsive, browser-only demonstration of an emergency and inpatient care workflow. The built-in records are fictional. The application stores changes in browser local storage.

## Patient chart

Choose a patient from the worklist or search by name, MRN, priority, or status. The chart summarizes demographics, vitals, allergies, medications, labs, appointments, care tasks, recent notes, and activity. Use the role selector to explore clinician, nurse, and admin demonstration permissions.

## Encounter workflow

Open **ED & Inpatient** to document an encounter:

1. Record arrival mode, encounter stage, chief complaint, acuity, triage observations, and intake vitals.
2. Update the care location and disposition as the patient moves through ED evaluation, consultation, admission, discharge, or transfer.
3. For ward/ICU admission or PCP/specialist referral, record the receiving location or destination and follow-up date.
4. Use **Orders** to track nursing, vitals, diagnosis, lab, imaging, procedure, medication, and referral requests. Pending orders can be acknowledged, completed, or cancelled in the demo.
5. Use **Documents** to create drafts for ED provider, history and physical, admission, SOAP progress, consult, nursing, procedure, discharge, and referral notes.

The document form provides fields for HPI, relevant history and medication/allergy reconciliation, review of systems, objective findings, assessment, and plan. Saved documents remain drafts; the demo does not implement authentication, co-signature, or legally valid electronic signatures.

## Other views

- **Overview** summarizes patient and chart activity.
- **Patients** displays the patient worklist and chart details.
- **Appointments** supports completing appointments; the admin role can cancel them.
- **Labs & Meds** displays chart data and supports the existing encounter form.
- **Billing** displays sample billing context.
- Admins can review the activity audit trail. The role selector is not an access-control mechanism.

## Persistence and reset

Changes are saved to local storage in the current browser profile and remain after refresh. Clearing this site's browser storage removes the demo changes. There is no server synchronization, backup, or multi-user workflow.

## Safety and privacy

Do not enter real patient information. This prototype is not a clinical system and must not be used to guide or document patient care. Its orders are tracking examples only: they are not transmitted, validated, or executed, and medication entries are not prescriptions. Production use requires secure infrastructure, real authentication and authorization, validated clinical and medication workflows, interoperability, and applicable privacy, security, safety, and regulatory review.
