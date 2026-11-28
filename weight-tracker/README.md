# Weight Tracker

A dependency-free, private daily weight journal.

**Live app:** [Open Weight Tracker](https://alphadyn.github.io/apps/weight-tracker/)  
Part of [Alphadyn Apps](../README.md) · [Browse the catalog](../index.html)

## Use it

Create an account with a name and account password. Enter the name exactly as typed when signing in: it is case-sensitive and may contain spaces and Unicode characters, up to 80 characters. Then create a journal with your profile name and preferred weight unit. Your account password encrypts and decrypts the journal and its backups; there is no separate journal password. Sign in with the same account name and password to unlock it. **Edit profile** changes the encrypted profile name and preferred unit. **Lock journal** clears decrypted data from the page while keeping the account signed in; **Log out** also ends the account session. Reloading the page clears the in-memory session. One journal is stored per account.

If you have a journal from the previous browser-only version, sign in to an account without a server journal, choose **Import journal from this browser**, and enter its old password once if prompted. The journal is re-encrypted with your account password; the original browser copy is left intact. Older server journals and backups also need their previous password once for migration. Keep a backup before replacing a journal.

Add measurements for today or earlier dates. Every measurement is preserved, and multiple measurements on the same local calendar date contribute equally to that day's arithmetic mean. Dates with no measurements are not filled in; the chart connects the recorded dates. Remove an incorrect measurement and add a corrected one.

Choose all time, the last 30/90 calendar days including today, or an inclusive custom date range. The chart, summary cards, check-in table, and chart exports all use the applied range. An empty boundary is unbounded. The latest average and change refer to that selected period, not necessarily today.

Changing display units also changes the unit for new entries. Existing measurements retain their original precision in kilograms and are converted for display, never reinterpreted. An unsaved weight input is cleared when changing units to prevent mislabeling it.

## JSON persistence, backups, and exports

- Every profile, unit, measurement addition, and removal is encrypted in the browser and saved as a versioned JSON document to the signed-in user's Supabase account. Sign in on another device with the same account password to access it. A server connection is required; failed saves do not change the journal in memory.
- **Download backup** saves the complete encrypted JSON journal, including name, unit, and all raw measurements, using the account password. **Restore backup** validates the entries and replaces the journal only after successful decryption and saving. Older backups require their previous password once and are then re-encrypted using the account password. Back up your existing journal before replacing it.
- **Export chart** downloads the applied date range as JSON (daily means and entry counts), CSV, SVG, or a 2000 × 760 PNG. These exports are **unencrypted** and can reveal your name and weight. Chart JSON is a report, not a restorable backup.
- Keep regular downloaded backups separately from your account. The old browser-only journal, if present, remains in browser storage until you clear it.
- Concurrent saves from another tab or device are rejected by the server rather than overwriting newer data; lock and unlock to reload the latest journal. If a restore conflicts, sign out and sign in before trying again.

## Privacy and encryption

The app sends account credentials to Supabase Auth and stores the encrypted journal in Supabase; it does not send the decrypted journal data to the server. The account password is used locally to derive non-extractable Web Crypto key material; the password itself is not retained by the app after derivation. Account sessions and encryption keys are kept in memory and cleared on reload or logout. The journal's name and unit are inside the encrypted document, not stored as plaintext preferences. The account name is encoded in the authentication identifier and is not encrypted. Your browser's password manager may offer to remember passwords.

The configured Supabase project is shared with other Alphadyn apps. Creating a Weight Tracker account also creates profiles in those apps, some of which are public. These profiles use a random identifier and a generic display name rather than the account name; accounts still share the same authentication system.

Encryption uses Web Crypto AES-256-GCM, a random 16-byte salt per journal, PBKDF2-HMAC-SHA256 with 600,000 iterations, and a fresh 12-byte nonce on every save. The signed-in account password derives key material that can decrypt the journal and its backups, including files with a different salt. The versioned JSON envelope contains `format`, `version`, `iterations`, `salt`, `iv`, and `ciphertext`, with binary fields encoded as Base64. Decrypted data contains `version`, `name`, `unit`, and `entries` (`id`, `date`, `kg`).

There is no self-service account password reset or recovery because no email is collected. A forgotten account password makes the encrypted journal and backups inaccessible. If the account password changes, the next sign-in can migrate the existing journal by asking for its previous password once. Lock or log out on a shared device. If a logout request fails, the app clears the local session but reports that server-side revocation failed. Encryption protects stored data, not an unlocked browser session or a compromised device. This is a tracking tool, not medical advice.

## Server setup

The app is configured to use the repository's shared Supabase project via its public URL and publishable key in `supabase-config.js`. Never put a service-role key in the browser. Email/password authentication and new-user signup must be enabled and email confirmation must be disabled for name-based signup. These settings affect every app in the project; assess their impact before changing them. Do not rely on email-based recovery or notification workflows for Weight Tracker accounts.

Supabase Auth requires an email-shaped identity, so the app maps the exact account name to a deterministic address under the reserved, non-deliverable `weight-tracker.invalid` domain. Names are encoded as UTF-8 hex, or hashed with SHA-256 if the encoded address would exceed the server's length limit. Encoded names are reversible, and hashed names can be guessed, so neither is a secrecy measure. The identifier is not an email address belonging to the user; no confirmation or recovery messages can be delivered to it. Name availability and password authentication are handled by Supabase. Disabling email confirmation allows unauthenticated account creation across the shared project, so configure appropriate signup and authentication rate limits and abuse protections. If email confirmation is enabled, signup reports an explicit setup error rather than asking users to check email.

Earlier email-account and case-insensitive username implementations use different account identities and cannot sign in through the current name interface. To move an existing server journal, download its encrypted JSON backup with the previous version, then create a name account and restore the backup with its journal password. Browser-only journals can instead be imported as described above.

Run `supabase-schema.sql` in that project's SQL editor before using the app. It creates a private per-user journal table, row-level security, and an authenticated conditional-save function; it does not delete existing journals. Only the authenticated owner can read a row, and saves use the authenticated user ID and a revision check. Configure database backups and review the project's authentication, retention, access, and rate-limit settings before storing real health information. Deploying the static files alone does not provision this schema.

## Local preview and tests

Serve the repository over localhost or HTTPS; Web Crypto requires a secure context and ES modules require HTTP serving.

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://localhost:8000/weight-tracker/>. No dependency installation or build step is needed, but the configured Supabase project must be set up as described above. GitHub Pages includes this directory in the repository artifact.

```bash
node --test weight-tracker/model.test.js
```

## Link preview

The page provides static Open Graph and Twitter metadata with a 1200 x 630 PNG preview, so sharing crawlers do not need JavaScript or access to a journal. The chart artwork is illustrative and contains no user data. Regenerate the committed image after changing its artwork or the logo:

```bash
python3 weight-tracker/generate_social_preview.py
```

The generator requires Pillow and resvg-py. Bump the image URL version in `index.html` after replacing the PNG to help sharing platforms refresh cached previews. The public image URL becomes available when the app is deployed; each sharing platform controls its own cache.
