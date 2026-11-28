# Weight Tracker

A dependency-free, private daily weight journal.

**Live app:** [Open Weight Tracker](https://alphadyn.github.io/apps/weight-tracker/)  
Part of [Alphadyn Apps](../README.md) · [Browse the catalog](../index.html)

## Use it

Create an account with a username and account password. Usernames are case-insensitive, 3–32 characters long, start with a letter or number, and contain only letters, numbers, underscores, and hyphens. Then create a journal with your name, pounds or kilograms, and a separate journal encryption password of at least eight characters. On subsequent visits, sign in with your username and account password, then enter the journal password to unlock it. **Lock journal** removes decrypted data from the page while keeping the account signed in; **Log out** also ends the account session. Reloading the page clears the in-memory session. One journal is stored per account.

If you have a journal from the previous browser-only version, sign in to an account without a server journal, enter the old journal password, and choose **Import journal from this browser**. The original browser copy is left intact. Alternatively, restore an existing encrypted backup. Keep a backup before replacing a journal.

Add measurements for today or earlier dates. Every measurement is preserved, and multiple measurements on the same local calendar date contribute equally to that day's arithmetic mean. Dates with no measurements are not filled in; the chart connects the recorded dates. Remove an incorrect measurement and add a corrected one.

Choose all time, the last 30/90 calendar days including today, or an inclusive custom date range. The chart, summary cards, check-in table, and chart exports all use the applied range. An empty boundary is unbounded. The latest average and change refer to that selected period, not necessarily today.

Changing display units also changes the unit for new entries. Existing measurements retain their original precision in kilograms and are converted for display, never reinterpreted. An unsaved weight input is cleared when changing units to prevent mislabeling it.

## JSON persistence, backups, and exports

- Every profile, unit, measurement addition, and removal is encrypted in the browser and saved as a versioned JSON document to the signed-in user's Supabase account. Sign in on another device to access it. A server connection is required; failed saves do not change the journal in memory.
- **Download backup** saves the complete encrypted JSON journal, including name, unit, and all raw measurements. **Restore backup** accepts this format and its original password, validates the entries, and replaces the journal only after successful decryption and saving. Back up your existing journal before replacing it.
- **Export chart** downloads the applied date range as JSON (daily means and entry counts), CSV, SVG, or a 2000 × 760 PNG. These exports are **unencrypted** and can reveal your name and weight. Chart JSON is a report, not a restorable backup.
- Keep regular downloaded backups separately from your account. The old browser-only journal, if present, remains in browser storage until you clear it.
- Concurrent saves from another tab or device are rejected by the server rather than overwriting newer data; lock and unlock to reload the latest journal. If a restore conflicts, sign out and sign in before trying again.

## Privacy and encryption

The app sends account credentials to Supabase Auth and stores the encrypted journal in Supabase; it does not send the journal password or decrypted journal data to the server. Account sessions are kept in memory and cleared on reload or logout. The name and unit are inside the encrypted document, not stored as plaintext preferences. Your browser's password manager may offer to remember passwords.

Encryption uses Web Crypto AES-256-GCM, a random 16-byte salt, PBKDF2-HMAC-SHA256 with 600,000 iterations, and a fresh 12-byte nonce on every save. The versioned JSON envelope contains `format`, `version`, `iterations`, `salt`, `iv`, and `ciphertext`, with binary fields encoded as Base64. Decrypted data contains `version`, `name`, `unit`, and `entries` (`id`, `date`, `kg`).

There is no self-service account or journal password reset or recovery because no email is collected. A forgotten journal password makes the encrypted journal and backups inaccessible, even if the account password is changed. Lock or log out on a shared device. If a logout request fails, the app clears the local session but reports that server-side revocation failed. Encryption protects stored data, not an unlocked browser session or a compromised device. This is a tracking tool, not medical advice.

## Server setup

Create a **dedicated** Supabase project for Weight Tracker and set its public project URL and publishable key in `supabase-config.js`. The configuration is empty until this is done. Never put a service-role key in the browser. Enable email/password authentication, disable email confirmation for the dedicated project, and disable email-based recovery and notification workflows; do not make these changes to the repository's shared project.

Supabase Auth requires an email-shaped identity, so the app maps each normalized username to a deterministic address under the reserved, non-deliverable `weight-tracker.invalid` domain. This is an internal identifier, not an email address belonging to the user; no confirmation or recovery messages can be delivered to it. Username availability and password authentication are handled by Supabase. Disabling email confirmation allows unauthenticated account creation, so configure appropriate signup and authentication rate limits and abuse protections. If email confirmation is accidentally enabled, signup reports an explicit setup error rather than asking users to check email.

The earlier email-account implementation used the shared project and cannot sign in through the new username interface. To move an existing server journal, download its encrypted JSON backup with the previous version before switching projects, then create a username account and restore the backup with its journal password. Browser-only journals can instead be imported as described above.

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
