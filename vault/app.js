import { ARCHIVE_MAGIC, archiveMagicMatches, createTarGzip, extractTarGzip } from './archive.js';

(() => {
  'use strict';

  const ITERATIONS = 600_000;
  const SALT_LENGTH = 16;
  const NONCE_LENGTH = 12;
  const encoder = new TextEncoder();
  const state = { mode: 'encrypt', selectedFiles: [], isFolder: false, resultBlob: null, resultName: '', folderFiles: null };
  const $ = (selector) => document.querySelector(selector);
  const fileInput = $('#file-input');
  const folderInput = $('#folder-input');
  const passwordInput = $('#password-input');
  const resultCard = $('#result');
  const toast = $('#toast');
  let toastTimer;

  function setMode(mode) {
    if (state.mode !== mode) {
      state.selectedFiles = [];
      state.isFolder = false;
      fileInput.value = '';
      folderInput.value = '';
    }
    state.mode = mode;
    document.querySelectorAll('.mode-tab').forEach((button) => {
      const active = button.dataset.mode === mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    const encrypting = mode === 'encrypt';
    $('#input-heading').textContent = encrypting ? 'What would you like to protect?' : 'What would you like to unlock?';
    $('#choose-folder-button').hidden = !encrypting;
    $('#password-label').textContent = encrypting ? 'Create a password' : 'Enter your password';
    passwordInput.autocomplete = encrypting ? 'new-password' : 'current-password';
    passwordInput.placeholder = encrypting ? 'Enter a password' : 'Enter the password used to encrypt';
    $('#run-label').textContent = encrypting ? 'Encrypt securely' : 'Decrypt securely';
    $('#drop-subtitle').textContent = encrypting
      ? 'Files are encrypted as-is; folders are TAR + gzip compressed first'
      : 'Choose a Vault-encrypted .enc file';
    updateFileDetails();
    hideResult();
  }

  function selectFiles(files, isFolder) {
    state.selectedFiles = Array.from(files);
    state.isFolder = isFolder;
    updateFileDetails();
    hideResult();
  }

  function updateFileDetails() {
    const meta = $('#file-meta');
    const files = state.selectedFiles;
    if (files.length) {
      $('#drop-title').textContent = state.isFolder
        ? `${files.length.toLocaleString()} file${files.length === 1 ? '' : 's'} selected`
        : files[0].name;
      $('#drop-subtitle').textContent = state.isFolder ? 'Folder contents ready to archive' : 'Selected and ready to process';
      const totalSize = files.reduce((total, file) => total + file.size, 0);
      meta.textContent = `${totalSize.toLocaleString()} bytes${state.isFolder ? ' · relative paths preserved' : ''}`;
      meta.hidden = false;
      return;
    }
    $('#drop-title').innerHTML = state.mode === 'encrypt' ? 'Choose a file or folder' : 'Choose a Vault-encrypted file';
    meta.hidden = true;
  }

  function hideResult() {
    resultCard.hidden = true;
    state.resultBlob = null;
    state.resultName = '';
    state.folderFiles = null;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 4200);
  }

  async function deriveKey(password, salt) {
    const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  async function encryptBytes(plainBytes, password) {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const nonce = crypto.getRandomValues(new Uint8Array(NONCE_LENGTH));
    const key = await deriveKey(password, salt);
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, plainBytes));
    const payload = new Uint8Array(SALT_LENGTH + NONCE_LENGTH + encrypted.length);
    payload.set(salt, 0);
    payload.set(nonce, SALT_LENGTH);
    payload.set(encrypted, SALT_LENGTH + NONCE_LENGTH);
    return payload;
  }

  async function decryptBytes(payload, password) {
    if (payload.length < SALT_LENGTH + NONCE_LENGTH + 16) {
      throw new Error('This file is too short to be a valid encrypted payload.');
    }
    const salt = payload.subarray(0, SALT_LENGTH);
    const nonce = payload.subarray(SALT_LENGTH, SALT_LENGTH + NONCE_LENGTH);
    const ciphertext = payload.subarray(SALT_LENGTH + NONCE_LENGTH);
    const key = await deriveKey(password, salt);
    try {
      return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, ciphertext));
    } catch {
      throw new Error('Could not decrypt this data. Check your password and make sure the encrypted input is complete.');
    }
  }

  function suggestedName(name, mode) {
    if (mode === 'encrypt') return `${name}.enc`;
    return name.toLowerCase().endsWith('.enc') ? name.slice(0, -4) : `${name}.decrypted`;
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function finishResult({ title, description, blob, filename, folderFiles = null }) {
    $('#result-title').textContent = title;
    $('#result-description').textContent = description;
    $('#download-button').hidden = !blob;
    $('#download-label').textContent = folderFiles ? 'Download .tar.gz' : 'Download';
    $('#save-folder-button').hidden = !folderFiles || typeof window.showDirectoryPicker !== 'function';
    state.resultBlob = blob;
    state.resultName = filename;
    state.folderFiles = folderFiles;
    resultCard.hidden = false;
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  async function saveFolder() {
    const files = state.folderFiles;
    if (!files) return;
    try {
      const root = await window.showDirectoryPicker({ mode: 'readwrite' });
      for (const file of files) {
        const segments = file.path.split('/');
        let directory = root;
        for (const segment of segments.slice(0, -1)) {
          directory = await directory.getDirectoryHandle(segment, { create: true });
        }
        const handle = await directory.getFileHandle(segments.at(-1), { create: true });
        const writable = await handle.createWritable();
        await writable.write(file.bytes);
        await writable.close();
      }
      showToast(`Restored ${files.length} file${files.length === 1 ? '' : 's'} with their folder structure.`);
    } catch (error) {
      if (error?.name !== 'AbortError') showToast(`Could not restore the folder: ${error.message}`);
    }
  }

  async function runOperation() {
    if (!window.crypto?.subtle) {
      showToast('Secure encryption requires HTTPS or localhost.');
      return;
    }
    const password = passwordInput.value;
    if (!password) {
      passwordInput.focus();
      showToast('Enter a password to continue.');
      return;
    }
    if (!state.selectedFiles.length) {
      showToast(state.mode === 'encrypt' ? 'Choose a file or folder to encrypt.' : 'Choose a Vault-encrypted file to decrypt.');
      return;
    }

    const button = $('#run-button');
    const label = $('#run-label');
    button.disabled = true;
    label.textContent = state.mode === 'encrypt' ? 'Encrypting…' : 'Decrypting…';
    hideResult();
    try {
      if (state.mode === 'encrypt') {
        if (state.isFolder) {
          const archive = await createTarGzip(state.selectedFiles);
          const plaintext = new Uint8Array(ARCHIVE_MAGIC.length + archive.length);
          plaintext.set(ARCHIVE_MAGIC);
          plaintext.set(archive, ARCHIVE_MAGIC.length);
          const payload = await encryptBytes(plaintext, password);
          const firstPath = state.selectedFiles[0].webkitRelativePath || state.selectedFiles[0].name;
          const folderName = firstPath.split('/')[0] || 'folder';
          const filename = `${folderName}.tar.gz.enc`;
          finishResult({
            title: 'Folder encrypted successfully',
            description: `${state.selectedFiles.length.toLocaleString()} files were TAR archived with gzip compression. Their relative paths are preserved inside the encrypted archive.`,
            blob: new Blob([payload], { type: 'application/octet-stream' }),
            filename,
          });
        } else {
          const file = state.selectedFiles[0];
          const input = new Uint8Array(await file.arrayBuffer());
          const payload = await encryptBytes(input, password);
          const filename = suggestedName(file.name, 'encrypt');
          finishResult({
            title: 'File encrypted successfully',
            description: `${file.name} is protected. Download the encrypted file and keep your password safe.`,
            blob: new Blob([payload], { type: 'application/octet-stream' }),
            filename,
          });
        }
      } else {
        const file = state.selectedFiles[0];
        const input = new Uint8Array(await file.arrayBuffer());
        const plaintext = await decryptBytes(input, password);
        if (archiveMagicMatches(plaintext)) {
          const archive = plaintext.subarray(ARCHIVE_MAGIC.length);
          const files = await extractTarGzip(archive);
          finishResult({
            title: 'Folder decrypted successfully',
            description: `${files.length.toLocaleString()} files are ready with their original relative directory structure. Choose a destination folder to restore them, or download the .tar.gz archive.`,
            blob: new Blob([archive], { type: 'application/gzip' }),
            filename: suggestedName(file.name, 'decrypt'),
            folderFiles: files,
          });
        } else {
          const filename = suggestedName(file.name, 'decrypt');
          finishResult({
            title: 'File decrypted successfully',
            description: `Your original file is ready to download as ${filename}.`,
            blob: new Blob([plaintext], { type: 'application/octet-stream' }),
            filename,
          });
        }
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      button.disabled = false;
      label.textContent = state.mode === 'encrypt' ? 'Encrypt securely' : 'Decrypt securely';
    }
  }

  function browseFiles() {
    fileInput.click();
  }

  document.querySelectorAll('.mode-tab').forEach((button) => button.addEventListener('click', () => setMode(button.dataset.mode)));
  $('#run-button').addEventListener('click', runOperation);
  $('#choose-file-button').addEventListener('click', browseFiles);
  $('#choose-folder-button').addEventListener('click', () => folderInput.click());
  fileInput.addEventListener('change', () => selectFiles(fileInput.files || [], false));
  folderInput.addEventListener('change', () => selectFiles(folderInput.files || [], true));
  passwordInput.addEventListener('input', hideResult);
  $('#dropzone').addEventListener('click', (event) => {
    if (event.target !== fileInput) browseFiles();
  });
  $('#dropzone').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      browseFiles();
    }
  });
  $('#dropzone').addEventListener('dragover', (event) => {
    event.preventDefault();
    $('#dropzone').classList.add('is-dragging');
  });
  $('#dropzone').addEventListener('dragleave', () => $('#dropzone').classList.remove('is-dragging'));
  $('#dropzone').addEventListener('drop', (event) => {
    event.preventDefault();
    $('#dropzone').classList.remove('is-dragging');
    if (event.dataTransfer.files.length) selectFiles(event.dataTransfer.files, false);
  });
  $('#toggle-password').addEventListener('click', () => {
    const visible = passwordInput.type === 'text';
    passwordInput.type = visible ? 'password' : 'text';
    $('#toggle-password').setAttribute('aria-label', visible ? 'Show password' : 'Hide password');
  });
  $('#save-folder-button').addEventListener('click', saveFolder);
  $('#download-button').addEventListener('click', () => {
    if (state.resultBlob) download(state.resultBlob, state.resultName);
  });

  $('#year').textContent = new Date().getFullYear();
  setMode('encrypt');
})();
