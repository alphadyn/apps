# Secure multi-user architecture proposal

**Status: design only.** This document proposes a future production architecture. No authentication service, protected backend, encryption key management, or HIPAA safeguards are implemented by this GitHub Pages application. This proposal is not a compliance certification or a substitute for a security risk analysis, legal advice, or qualified healthcare security review.

## Current deployment boundary

GitHub Pages serves a static browser demo. It has no trusted server-side identity, authorization, or protected clinical-data store. The sign-in and role selector are client-side UI only; neither is authentication or access control. Browser `localStorage`, `sessionStorage`, downloaded exports, and static assets are not a secure clinical record system. Do not enter or import PHI.

For production, GitHub Pages may host only a public, non-PHI application shell if organizational review approves that arrangement. All authenticated routes and PHI must be served by separately operated, BAA-covered infrastructure. The app must not render patient data or treat a role, patient ID, or permission supplied by the browser as authoritative.

## Proposed architecture

1. **Workforce identity provider:** Use an organization-managed OIDC identity provider with MFA (prefer passkeys/WebAuthn where supported), managed lifecycle, account recovery controls, and short-lived sessions. Do not build password storage or authentication in this static app.
2. **Application API:** The browser calls an authenticated API over TLS. The API validates the identity-provider session/token, applies server-side role and patient-scope authorization on every request, validates input, and returns only the minimum necessary fields. Use secure, HttpOnly, SameSite cookies with CSRF defenses if using cookie sessions; do not store bearer tokens in `localStorage`.
3. **Private clinical data services:** Store clinical records in a managed relational/document database in a private network. Keep object storage private for imaging, documents, and profile photos. Use short-lived, narrowly scoped downloads only after API authorization; never expose permanent public object URLs.
4. **Key management:** Use the cloud/provider's managed KMS or HSM-backed envelope encryption, with separate keys and duties for production data and backups. Restrict key use to service identities, log key operations, and define rotation, revocation, and recovery procedures.
5. **Audit and monitoring:** Write security-relevant access and change events to a centralized, access-controlled, tamper-resistant audit destination. Alert on anomalous access, privilege changes, repeated authentication failures, exports, and break-glass use. Keep PHI and credentials out of logs, traces, analytics, and error reports.
6. **Operations:** Use separate development, test, and production accounts/environments; deploy reviewed infrastructure as code; patch and scan dependencies; maintain encrypted, tested backups and a recovery plan; monitor availability and security with documented incident response.

GitHub Pages is not the API, identity provider, database, object store, or key-management service in this proposal. Select and review concrete vendors, services, regions, contracts, and data flows before implementation. Do not send PHI to the current analytics integration; remove or independently assess telemetry before any authenticated production release.

## Identity, profiles, and permissions

Maintain a server-side user directory keyed by an immutable identity-provider subject. A profile may include display name, organization email, role, credential/medical level where applicable, facility/unit assignment, active status, and a profile photo. Treat photos as personal data: store them in private object storage, authorize every read, use random object identifiers, enforce upload type/size limits, strip metadata, and provide a neutral fallback avatar. A photo never establishes identity or authorization.

Use deny-by-default role permissions plus contextual scope (organization, facility, unit, care-team assignment, and patient relationship). Suggested starting matrix for stakeholder review:

| Role | Suggested access (always restricted to assigned scope) | Explicit limits |
|---|---|---|
| Medical level | View and document the clinical information permitted by verified credential, privileges, care relationship, and facility policy; enter or sign orders only within granted privileges. | No access based solely on a client-selected role; no privileges inferred from a profile label. |
| Technician | View minimum necessary identifiers, relevant worklists/orders, and the imaging/lab/procedure data needed for assigned tasks; record technical completion or upload results as authorized. | No diagnosis/sign-off, prescribing, unrestricted chart access, or unrelated financial data by default. |
| Manager | Manage workforce/workflow configuration and operational metrics for assigned areas; approve access requests where policy permits. | No clinical-note or image access solely because of managerial status. |
| System administrator | Manage infrastructure, configuration, and accounts using separate privileged identities and just-in-time elevation. | No routine clinical-record access. Break-glass support access must be time-limited, justified, logged, and reviewed. |

Final permissions require clinical, privacy, security, and operational approval. Enforce them in API/data-service policy, not by hiding buttons. Re-check authorization for every read, write, search, export, image, and document request. Provision, modify, disable, and periodically recertify accounts through an audited workflow. Define emergency access, termination response, session revocation, and separation of duties.

## Encryption and data handling

- Require HTTPS with TLS 1.2 or later (prefer TLS 1.3) for all browser/API and service connections; use HSTS and secure cookie settings.
- Use provider-managed strong encryption at rest for databases, object storage, replicas, logs, and backups. For application-level envelope encryption, use an approved authenticated cipher such as AES-256-GCM with data-encryption keys protected by KMS/HSM-managed keys.
- Separate keys from data, limit decrypt permissions to necessary services, rotate/revoke keys under documented policy, and test recovery without weakening production access.
- Do not cache PHI in `localStorage`, `sessionStorage`, service-worker caches, browser logs, URL query strings, or analytics. Use no-store response headers for sensitive API responses and clear in-memory records on sign-out/session expiry.
- Keep exports disabled by default or tightly permissioned, audited, minimized, and governed by organization policy. Do not send real data to this static demo or copy demo local storage into production.

HIPAA does not provide a product certification or a single cipher that by itself makes an application “HIPAA-compliant.” Encryption is one safeguard among administrative, physical, and technical safeguards. Applicability, addressable implementation decisions, risk analysis, BAAs, policies, workforce practices, and evidence must be evaluated by the covered entity/business associate and qualified advisors.

## Required implementation and release gates

1. Approve data classification, intended use, user population, jurisdictions, threat model, retention, and hosting/vendor choices; execute required BAAs before any PHI is processed.
2. Complete a documented security risk analysis and privacy/security review. Define incident response, workforce training, access reviews, contingency and breach-notification procedures, audit retention, and vendor oversight.
3. Implement the identity provider, API, server-enforced authorization, private database/object storage, KMS/HSM integration, audit pipeline, monitoring, backups, and key/session lifecycle in isolated environments.
4. Replace all demo local-storage reads/writes and import/export paths with authorized API workflows. Remove or disable unaudited analytics and prevent PHI from reaching third parties.
5. Perform independent threat modeling, code review, dependency/infrastructure scanning, authorization and penetration testing, backup restoration testing, and operational readiness review.
6. Obtain written approval from the organization's privacy, security, clinical, legal, and compliance owners before a production release or PHI migration.

Until all gates are met and verified, keep the application on fictional data only. This document and the UI warning do not make the demo suitable for clinical use.
