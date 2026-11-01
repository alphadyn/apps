# Vault — Secure File Tool

**Deployed application:** [Open the app](https://alphadyn.github.io/apps/vault/)

> Standalone browser tool for encrypting files and TAR+gzip-archived folders; all processing stays on-device. See the [repository catalog](../README.md) for shared setup and deployment context.

Vault is a static web app for encrypting and decrypting files and folders in your browser. It is designed to be hosted on GitHub Pages: there is no server, account, upload, or build step. Folder contents are archived as TAR, compressed with gzip, and then encrypted; the archive preserves relative paths. The web app files are `index.html`, `styles.css`, `app.js`, and `archive.js`.

## Use it

Open the app over HTTPS (for example, from GitHub Pages), choose **Encrypt** or **Decrypt**, select a file or folder, enter a password, and run the operation. Individual files are encrypted as-is. Folders are TAR archived with gzip compression before encryption. When decrypting a folder, use **Choose folder** to restore its directory tree (supported browsers), or download the `.tar.gz` archive and extract it. The app processes data locally in the browser.

Web Crypto requires a secure context, so use HTTPS or `localhost` rather than opening the page directly as a `file://` URL. To preview locally from the repository root:

```bash
python3 -m http.server 8765 --directory vault
```

Then visit `http://localhost:8765`.

## GitHub Pages

In the repository's GitHub Pages settings, publish from the `main` branch and select `/ (root)` to host the whole repository, or use a GitHub Actions workflow / separate publishing branch to publish only this folder. If the repository already uses Pages for another app, publish this folder at its own path rather than changing the existing site source.

## Encryption format

Vault uses AES-256-GCM with a fresh 16-byte random salt, a fresh 12-byte nonce, and PBKDF2-HMAC-SHA256 with 600,000 iterations. File payloads are laid out as `salt + nonce + authenticated ciphertext`. Folder payloads encrypt a versioned marker followed by the gzip-compressed TAR bytes. Folder processing is limited to 1 GB of uncompressed data.

Keep your password safe. There is no password reset, and losing the password means the encrypted data cannot be recovered. Encryption happens on-device, but downloaded output and passwords are only as safe as the device and storage you use.
