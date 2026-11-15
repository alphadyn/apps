/* Shared by the meeting page and the encoded-media worker. */
(() => {
  const encoder = new TextEncoder();
  const VERSION = 2;

  function generateSecret() {
    return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeSecret(secret) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(secret)) {
      throw new Error('A valid 256-bit meeting secret is required. Use the complete invite link or create a new meeting.');
    }
    const bytes = Uint8Array.from(atob(secret.replace(/-/g, '+').replace(/_/g, '/') + '='), c => c.charCodeAt(0));
    if (btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== secret) {
      throw new Error('The meeting secret is invalid. Ask for the complete invite link.');
    }
    return bytes;
  }

  async function deriveKeys(room, secret) {
    const material = await crypto.subtle.importKey('raw', decodeSecret(secret), 'HKDF', false, ['deriveKey']);
    const salt = encoder.encode(`meetings-v${VERSION}:${room}`);
    const derive = (info, algorithm, usages) => crypto.subtle.deriveKey(
      { name: 'HKDF', hash: 'SHA-256', salt, info: encoder.encode(info) },
      material, algorithm, false, usages
    );
    return {
      dataKey: await derive('data', { name: 'AES-GCM', length: 256 }, ['encrypt', 'decrypt']),
      mediaKey: await derive('media', { name: 'HMAC', hash: 'SHA-256', length: 256 }, ['sign'])
    };
  }

  async function deriveFrameKey(mediaKey, context) {
    const bytes = await crypto.subtle.sign('HMAC', mediaKey, encoder.encode(JSON.stringify(['media-v2', ...context])));
    return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }

  async function seal(key, plaintext, context) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: encoder.encode(context), tagLength: 128 }, key, plaintext
    );
    return { iv, ciphertext };
  }

  async function open(key, iv, ciphertext, context) {
    if (!(iv instanceof Uint8Array) || iv.byteLength !== 12 || !(ciphertext instanceof ArrayBuffer) || ciphertext.byteLength < 16) {
      throw new Error('Invalid encrypted payload.');
    }
    return crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: encoder.encode(context), tagLength: 128 }, key, ciphertext
    );
  }

  globalThis.MeetingsCrypto = Object.freeze({ VERSION, generateSecret, decodeSecret, deriveKeys, deriveFrameKey, seal, open });
})();
