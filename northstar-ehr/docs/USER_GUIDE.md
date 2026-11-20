# User Guide

## Overview

Northstar EHR is a responsive, browser-only demonstration of an emergency and inpatient care workflow. The built-in records are fictional. The application stores changes in browser local storage. Its sign-in and Admin-managed roles are for demonstration only; neither provides real authentication, secure clinical storage, nor server-enforced permissions.

## Sign-in and roles

On first load, **Joe Spartan, MD** is automatically signed in with the **Provider** role only. His sign-in persists in this browser across refreshes and browser restarts until explicit sign-out. Signing out disables automatic sign-in, including after reload; use `joe.spartan` with password `northstar` to sign in again and re-enable persistence. Existing sessions for other sample accounts are not replaced; those accounts retain tab-local sessions.

After sign-in, a warning screen consolidates the fictional-data, clinical-use, live-service, security, and browser-storage limitations. Select **I understand - continue** to open Overview, or **Sign out** to return to sign-in. Acknowledgment lasts only for that tab's signed-in session, so refreshing does not repeat the warning; reopening in a new tab or after a browser restart requires acknowledgment again. Signing out clears acknowledgment but does not clear browser-stored patient data. Context-specific reference-image labels and directory/account guidance remain beside the relevant content.

Only an account with an active **Admin** role can manage sign-in account authorizations from **Overview > Account roles**. Check one or more roles (Provider, Midlevel (PA / NP), Nurse, Staff, or Admin) and select **Save roles**. Each account must have at least one authorized role, and the app prevents removing the last authorized Admin. Authorizations persist across sign-out and reload in the same browser. Directory-only staff profiles do not have sign-in accounts.

Each sign-in account has its own role card. Save confirmation and validation messages appear in the Operations overview, including when an authorization change removes your active Admin role.

Use **Active role** in the sidebar to switch among your account's authorized roles. Only the active role's capabilities apply; permissions are not combined. The selector is disabled if you have only one role. The active role persists on reload. If an Admin revokes your active role, the app selects the first remaining authorized role when the account is next loaded or updated. An account authorized for Admin can switch back to Admin to manage authorizations.

Provider and Midlevel roles support encounter, order, note, task, and data-exchange workflows. Nurse retains nursing workflow, order, note, appointment, and task capabilities. Staff supports appointment completion and chart selection; Admin supports account management, administrative review, billing, and data exchange. These controls are demo UI permissions, not trusted access control. Sample sign-ins use `elena.ruiz` (Provider and Admin, initially active as Provider), `jordan.lee` (Nurse), or `alex.morgan` (Admin), with the password `northstar`. Saved Admin-managed authorizations take precedence over sample defaults; existing accounts can be updated from Account roles. The sidebar distinguishes authorized roles from the active role. Do not enter or import real patient information.

## Patient chart

The worklist contains 23 fictional charts spanning a variety of conditions and histories. Choose a patient or filter the worklist by name, MRN, diagnosis, priority, or status. The header's unified search also searches staff, departments, and locations; selecting a patient or staff result opens that person's profile. At the top of the chart, the medical-status dashboard summarizes the primary diagnosis, encounter stage, department/location, attending, assigned nurse, priority, and allergies. The vital dashboard displays the latest charted blood pressure, heart rate, respiratory rate, temperature, oxygen saturation, and pain score; when repeat readings are recorded, expand **View recent readings** to review their timestamps and values. The imaging dashboard shows study and report counts, preliminary reports, open imaging orders, and the latest report summary.

The **Patient timeline** brings together diagnoses, lab markers, clinical documents, orders, imaging studies, appointments, vital recordings, completed and open care tasks, and encounter updates. Events are grouped as **Previous**, **Current**, **Planned**, or **Date not recorded**. When an admission timestamp is available, the timeline starts at admission and excludes earlier dated events; when it is unavailable, the timeline shows all available chart history and says so rather than inventing a date. Undated events are retained but cannot be placed relative to admission. Select an event to expand its details, then choose **Open record** to jump to the matching chart record or workflow. New admissions record their start time when the encounter first transitions to Admission or an admit disposition.

## Encounter workflow

Open **ED & Inpatient** to document an encounter:

1. Record arrival mode, encounter stage, chief complaint, acuity, triage observations, and intake vitals.
2. Update the department, care location, attending provider, assigned nurse, and disposition as the patient moves through ED evaluation, consultation, admission, discharge, or transfer.
3. For ward/ICU admission or PCP/specialist referral, record the receiving location or destination and follow-up date.
4. Use **Orders** to track nursing, vitals, diagnosis, H&P, laboratory, imaging/radiology, procedure, medication, consult, and referral requests. The selected category opens its own structured fields (for example, specimen and collection timing for labs, or dose, route, frequency, and pharmacy for medications). Pending orders can be acknowledged, completed, or cancelled in the demo.
5. Use **Documents** to create drafts for ED provider, history and physical, admission, SOAP progress, consultation, nursing, procedure, discharge summary, disposition, and referral notes. Each template provides documentation fields for its workflow, such as a problem-based admission plan, SOAP sections, procedure consent and findings, discharge instructions and return precautions, or referral question and destination.

Saved orders retain and display their type-specific details. Saved documents retain and display each completed template field. Saved documents remain drafts; the demo does not implement authentication, co-signature, or legally valid electronic signatures.

## Other views

- **In Basket** groups fictional care-team messages, sample results, and care-plan follow-up tasks. Filter by type or search by patient, MRN, subject, or detail. Mark messages read, mark results reviewed, or complete eligible tasks; task completion also updates the matching sample care-plan task. The unread count appears in the workspace navigation. These are local demonstration entries only—not a real messaging, result-routing, or clinical-review system.
- **Overview** summarizes patient/chart activity and aggregate admissions, departments, active team members, and open orders without displaying individual charts. Metric cards open a filtered patient worklist. Admins also see account-role management and the activity audit trail. **Patients > Admissions** provides the full census, with department, location, attending, nurse, stage, diagnosis, and chart links.
- **Nursing station** filters patients by assigned nurse and shows their location, diagnosis, priority/stage, latest charted vitals, and allergy list. Update nurse assignments in **ED & Inpatient**.
- **Departments** lists ED, MICU, SICU, NICU, radiology, surgery, OB/GYN, pediatrics, neurology, telemetry, and medicine, along with sample team and patient counts. **Locations** lists care areas and illustrative occupancy.
- **Staff directory** contains fictional administrator, provider, PA, nurse, and midlevel profiles. Search the directory by name, role, department, location, or email, then select **View profile** on a matching card. Physician names use the **Name, MD** format in directory cards and staff profiles, including the profile selector and portrait labels. Existing care-team assignments are unchanged. The Admin demo role can add directory-only staff profiles; this does not create an account. **Patients > Patient profiles** displays patient context and links to the full chart.
- Use the global header search to find patients by name, MRN, diagnosis, care team, location, or department, and to find staff by name, role, department, location, or demo email. It also finds departments and locations. The patient worklist has its own filter; the patient list is independently scrollable.
- The sidebar groups **Overview** and **In Basket** under Your workspace, clinical views under **Patients & care**, directories under Organization, and Billing under Administration. Icons and a highlighted current page help orient navigation; patient workflows expand their menu automatically. Use the header's **Hide navigation / Show navigation** button to collapse or restore the sidebar; the desktop preference is remembered in this browser. On smaller screens, navigation opens as a drawer, closes after selecting a view, and supports Escape, backdrop dismissal, and keyboard focus containment.
- **Open encounter** stays at the top of navigation. The account card keeps your name and sign-out visible; expand **Role & permissions** to review authorizations or change the active role. Header **Data tools** contains the existing import/export format, scope, and actions without cluttering the workspace. It can be dismissed by clicking outside or pressing Escape.
- **Patients & care** groups patient management views separately from clinical tools. The **Worklist & charts** filter searches patient name, MRN, diagnosis, status, care team, and location; select a result to view its chart and current status summary.
- **Appointments** supports completing appointments; the demo admin role can cancel them.
- **Labs & Meds** displays chart data and supports the existing encounter form.
- **Billing** displays sample billing context.
- The active Admin demo role can review the activity audit trail and manage authorized roles. Other users can switch among their authorized roles, but cannot grant themselves additional roles.

## Persistence and reset

Changes are saved to local storage in the current browser profile and remain after refresh. Clearing this site's browser storage removes the demo changes. There is no server synchronization, backup, or multi-user workflow.

## Safety and privacy

Do not enter, import, or export real patient information. All patient histories and imaging reports are fictional illustrative examples. This prototype is not a clinical system and must not be used to guide or document patient care. Its orders are tracking examples only: they are not transmitted, validated, or executed, and medication entries are not prescriptions. The proposed—but unimplemented—production security design is in [SECURITY_ARCHITECTURE.md](./SECURITY_ARCHITECTURE.md). Production requires organizational risk analysis, approved secure infrastructure and identity/access controls, validated clinical and medication workflows, interoperability, applicable BAAs, and privacy, security, safety, legal, and regulatory review.
