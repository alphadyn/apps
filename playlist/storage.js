// IndexedDB persistence: media blobs keyed by track id, plus the playlist manifest as JSON.

const DB_NAME = 'alphadyn-playlist';
const DB_VERSION = 1;
// Store name predates video support; kept so existing playlists keep loading.
const MEDIA_STORE = 'audio';
const META_STORE = 'meta';
const LIBRARY_KEY = 'library';

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in globalThis)) {
        reject(new Error('This browser does not support local storage for media (IndexedDB).'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(MEDIA_STORE)) db.createObjectStore(MEDIA_STORE);
        if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open local storage.'));
      request.onblocked = () => reject(new Error('Local storage is blocked by another open tab.'));
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

async function run(storeName, mode, action) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result;
    const request = action(store);
    if (request) request.onsuccess = () => {
      result = request.result;
    };
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error || new Error('Local storage request failed.'));
    tx.onabort = () => {
      const error = tx.error;
      reject(error?.name === 'QuotaExceededError'
        ? new Error('Device storage is full. Remove some tracks and try again.')
        : error || new Error('Local storage request was aborted.'));
    };
  });
}

export function saveMedia(id, blob) {
  return run(MEDIA_STORE, 'readwrite', (store) => store.put(blob, id));
}

export function loadMedia(id) {
  return run(MEDIA_STORE, 'readonly', (store) => store.get(id));
}

export function deleteMedia(id) {
  return run(MEDIA_STORE, 'readwrite', (store) => store.delete(id));
}

export function listMediaIds() {
  return run(MEDIA_STORE, 'readonly', (store) => store.getAllKeys());
}

export function clearMedia() {
  return run(MEDIA_STORE, 'readwrite', (store) => store.clear());
}

export function saveLibraryJson(json) {
  return run(META_STORE, 'readwrite', (store) => store.put(json, LIBRARY_KEY));
}

export function loadLibraryJson() {
  return run(META_STORE, 'readonly', (store) => store.get(LIBRARY_KEY));
}

export async function requestPersistentStorage() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    // Best effort; browsers may decline without a user gesture.
  }
}

export async function storageEstimate() {
  try {
    return (await navigator.storage?.estimate?.()) || null;
  } catch {
    return null;
  }
}
