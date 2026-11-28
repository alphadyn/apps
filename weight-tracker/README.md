# Weight Tracker

A dependency-free, private daily weight journal.

**Live app:** [Open Weight Tracker](https://alphadyn.github.io/apps/weight-tracker/)  
Part of [Alphadyn Apps](../README.md) · [Browse the catalog](../index.html)

## Use it

Create a journal with your name, pounds or kilograms, and a password of at least eight characters. On subsequent visits, enter your password to unlock it. The header brand reloads the entry page and locks the journal; **Lock journal** locks without reloading. One journal is stored per browser origin.

Add measurements for today or earlier dates. Every measurement is preserved, and multiple measurements on the same local calendar date contribute equally to that day's arithmetic mean. Dates with no measurements are not filled in; the chart connects the recorded dates. Remove an incorrect measurement and add a corrected one.

Choose all time, the last 30/90 calendar days including today, or an inclusive custom date range. The chart, summary cards, check-in table, and chart exports all use the applied range. An empty boundary is unbounded. The latest average and change refer to that selected period, not necessarily today.

Changing display units also changes the unit for new entries. Existing measurements retain their original precision in kilograms and are converted for display, never reinterpreted. An unsaved weight input is cleared when changing units to prevent mislabeling it.

## JSON persistence, backups, and exports

- Every profile, unit, measurement addition, and removal is saved as an encrypted versioned JSON document in browser `localStorage`. There is no server or automatic cross-device synchronization.
- **Download backup** saves the complete encrypted JSON journal, including name, unit, and all raw measurements. **Restore backup** accepts this format and its original password, validates the entries, and replaces the journal only after successful decryption and saving. Back up your existing journal before replacing it.
- **Export chart** downloads the applied date range as JSON (daily means and entry counts), CSV, SVG, or a 2000 × 760 PNG. These exports are **unencrypted** and can reveal your name and weight. Chart JSON is a report, not a restorable backup.
- Clearing browser storage, using a different browser/origin, or private browsing can make saved data unavailable. Keep regular downloaded backups. Storage failures are shown explicitly and failed saves do not update the journal in memory.
- Concurrent saves from another tab are detected before writes; lock and unlock to reload the latest journal. Avoid editing the same journal in multiple tabs at once.

## Privacy and encryption

All journal processing stays on-device, with no third-party scripts, fonts, or APIs. The password is never persisted by the app; your browser's password manager may offer to remember it. The name and unit are inside the encrypted document, not stored as plaintext preferences.

Encryption uses Web Crypto AES-256-GCM, a random 16-byte salt, PBKDF2-HMAC-SHA256 with 600,000 iterations, and a fresh 12-byte nonce on every save. The versioned JSON envelope contains `format`, `version`, `iterations`, `salt`, `iv`, and `ciphertext`, with binary fields encoded as Base64. Decrypted data contains `version`, `name`, `unit`, and `entries` (`id`, `date`, `kg`).

There is no password reset or recovery. A forgotten password makes the encrypted journal inaccessible. Lock the app on a shared device. Encryption protects stored data, not an unlocked browser session or a compromised device. This is a tracking tool, not medical advice.

## Local preview and tests

Serve the repository over localhost or HTTPS; Web Crypto requires a secure context and ES modules require HTTP serving.

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://localhost:8000/weight-tracker/>. No dependency installation or build step is needed. GitHub Pages includes this directory in the repository artifact.

```bash
node --test weight-tracker/model.test.js
```

## Link preview

The page provides static Open Graph and Twitter metadata with a 1200 x 630 PNG preview, so sharing crawlers do not need JavaScript or access to a journal. The chart artwork is illustrative and contains no user data. Regenerate the committed image after changing its artwork or the logo:

```bash
python3 weight-tracker/generate_social_preview.py
```

The generator requires Pillow and resvg-py. Bump the image URL version in `index.html` after replacing the PNG to help sharing platforms refresh cached previews. The public image URL becomes available when the app is deployed; each sharing platform controls its own cache.
