// Pure playlist logic shared by the UI and the Node test suite.

export const LIBRARY_FORMAT = 'alphadyn-playlist';
export const LIBRARY_VERSION = 1;
export const PLAY_MODES = ['sequential', 'shuffle'];
export const REPEAT_MODES = ['off', 'all', 'one'];

const AUDIO_EXTENSIONS = {
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  m4b: 'audio/mp4',
  aac: 'audio/aac',
  wav: 'audio/wav',
  flac: 'audio/flac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg',
  weba: 'audio/webm',
  webm: 'audio/webm',
  aif: 'audio/aiff',
  aiff: 'audio/aiff'
};

const VIDEO_EXTENSIONS = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  ogv: 'video/ogg',
  mkv: 'video/x-matroska',
  '3gp': 'video/3gpp',
  '3g2': 'video/3gpp2'
};

// Video entries win for shared extensions (mp4, webm): a <video> element plays audio-only files too.
const MEDIA_EXTENSIONS = { ...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS };
export const MEDIA_KINDS = ['audio', 'video'];

const GENERIC_BINARY_TYPES = new Set([
  'application/octet-stream',
  'binary/octet-stream',
  'application/x-download',
  'application/force-download'
]);

export function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `t-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function fileExtension(name = '') {
  const clean = String(name).split(/[?#]/)[0];
  const match = /\.([a-z0-9]{1,5})$/i.exec(clean);
  return match ? match[1].toLowerCase() : '';
}

export function titleFromFileName(name = '') {
  const base = String(name).replace(/\.[a-z0-9]{1,5}$/i, '').replace(/_+/g, ' ').trim();
  return base || 'Untitled track';
}

export function guessMimeType(name, fallback = '') {
  const type = String(fallback || '').split(';')[0].trim().toLowerCase();
  if (type.startsWith('audio/') || type.startsWith('video/')) return type;
  return MEDIA_EXTENSIONS[fileExtension(name)] || type || 'application/octet-stream';
}

export function isLikelyMedia(name, type = '') {
  const lowerType = String(type).toLowerCase().split(';')[0].trim();
  if (lowerType.startsWith('audio/') || lowerType.startsWith('video/')) return true;
  if (lowerType === 'application/ogg') return true;
  if (lowerType && !GENERIC_BINARY_TYPES.has(lowerType)) return false;
  return Boolean(MEDIA_EXTENSIONS[fileExtension(name)]);
}

// Best guess from name/type; the app confirms it from the decoded file (videoWidth) when possible.
export function guessMediaKind(name, type = '') {
  const lowerType = String(type).toLowerCase().split(';')[0].trim();
  if (lowerType.startsWith('video/')) return 'video';
  if (lowerType.startsWith('audio/')) return 'audio';
  return VIDEO_EXTENSIONS[fileExtension(name)] ? 'video' : 'audio';
}

export function fileNameFromUrl(rawUrl, contentType = '', contentDisposition = '') {
  const dispositionMatch = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(contentDisposition || '');
  let name = '';
  if (dispositionMatch) {
    try {
      name = decodeURIComponent(dispositionMatch[1].trim());
    } catch {
      name = dispositionMatch[1].trim();
    }
  }
  if (!name) {
    try {
      const url = new URL(rawUrl);
      const last = url.pathname.split('/').filter(Boolean).pop() || '';
      try {
        name = decodeURIComponent(last);
      } catch {
        name = last;
      }
      if (!name) name = url.hostname;
    } catch {
      name = 'download';
    }
  }
  name = name.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 120) || 'download';
  if (!fileExtension(name) || !MEDIA_EXTENSIONS[fileExtension(name)]) {
    const type = String(contentType).split(';')[0].trim().toLowerCase();
    const ext = Object.entries(MEDIA_EXTENSIONS).find(([, mime]) => mime === type)?.[0];
    if (ext) name = `${name}.${ext}`;
  }
  return name;
}

export function normalizeUrl(input) {
  const value = String(input || '').trim();
  if (!value) throw new Error('Enter a URL.');
  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    throw new Error('That does not look like a valid URL.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http and https URLs are supported.');
  }
  return url.href;
}

const STREAMING_SERVICES = [
  ['YouTube', ['youtube.com', 'youtu.be', 'youtube-nocookie.com']],
  ['Spotify', ['spotify.com', 'spotify.link']],
  ['SoundCloud', ['soundcloud.com', 'on.soundcloud.com']],
  ['Apple Music', ['music.apple.com']],
  ['Amazon Music', ['music.amazon.com']],
  ['Deezer', ['deezer.com', 'deezer.page.link']],
  ['Tidal', ['tidal.com']],
  ['Pandora', ['pandora.com']],
  ['Bandcamp', ['bandcamp.com']],
  ['Vimeo', ['vimeo.com']],
  ['TikTok', ['tiktok.com']]
];

// Streaming sites serve web pages/players, not downloadable media files.
export function streamingServiceName(rawUrl) {
  let host;
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
  for (const [name, domains] of STREAMING_SERVICES) {
    if (domains.some((domain) => host === domain || host.endsWith(`.${domain}`))) return name;
  }
  return null;
}

export function streamingServiceMessage(name) {
  return `${name} links are web pages, not media files, and ${name} doesn't allow its audio or video to be downloaded. Use a direct link to a media file (for example one ending in .mp3, .m4a or .mp4), or add a file from your device.`;
}

export function createTrack({
  id = createId(),
  title,
  fileName,
  type,
  kind,
  size = 0,
  duration = null,
  source = 'file',
  sourceUrl = null,
  addedAt = new Date().toISOString()
} = {}) {
  const safeName = (fileName && String(fileName)) || 'media';
  const numericSize = Number(size);
  const numericDuration = Number(duration);
  return {
    id,
    title: (title && String(title).trim()) || titleFromFileName(safeName),
    fileName: safeName,
    type: guessMimeType(safeName, type || ''),
    kind: MEDIA_KINDS.includes(kind) ? kind : guessMediaKind(safeName, type || ''),
    size: Number.isFinite(numericSize) && numericSize > 0 ? numericSize : 0,
    duration: Number.isFinite(numericDuration) && numericDuration > 0 ? numericDuration : null,
    source: source === 'url' ? 'url' : 'file',
    sourceUrl: sourceUrl || null,
    addedAt
  };
}

export function moveItem(list, from, to) {
  const result = list.slice();
  if (from < 0 || from >= result.length) return result;
  const target = Math.max(0, Math.min(result.length - 1, to));
  const [item] = result.splice(from, 1);
  result.splice(target, 0, item);
  return result;
}

export function shuffleIds(ids, firstId = null, random = Math.random) {
  const pool = ids.filter((id) => id !== firstId);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return firstId !== null && ids.includes(firstId) ? [firstId, ...pool] : pool;
}

// Keeps an existing shuffle order stable while reflecting added/removed tracks.
// New tracks land at random positions after the current track so they still get played.
export function reconcileShuffle(order, ids, currentId = null, random = Math.random) {
  const idSet = new Set(ids);
  const result = order.filter((id) => idSet.has(id));
  const keptSet = new Set(result);
  for (const id of ids) {
    if (keptSet.has(id)) continue;
    const after = currentId !== null ? result.indexOf(currentId) + 1 : 0;
    const position = after + Math.floor(random() * (result.length - after + 1));
    result.splice(position, 0, id);
  }
  return result;
}

export function playbackOrder(state) {
  const ids = state.tracks.map((track) => track.id);
  return state.mode === 'shuffle' && state.shuffleOrder?.length === ids.length ? state.shuffleOrder : ids;
}

// Returns the id to play after the current one, or null when playback should stop.
export function nextTrackId(state, { auto = false } = {}) {
  const order = playbackOrder(state);
  if (!order.length) return null;
  if (auto && state.repeat === 'one' && state.currentId) return state.currentId;
  const index = order.indexOf(state.currentId);
  if (index === -1) return order[0];
  if (index + 1 < order.length) return order[index + 1];
  return state.repeat === 'all' || state.repeat === 'one' && !auto ? order[0] : null;
}

export function previousTrackId(state) {
  const order = playbackOrder(state);
  if (!order.length) return null;
  const index = order.indexOf(state.currentId);
  if (index === -1) return order[0];
  if (index > 0) return order[index - 1];
  return state.repeat === 'off' ? order[0] : order[order.length - 1];
}

export function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / 1024 ** exponent;
  return `${value >= 10 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${units[exponent]}`;
}

export function formatLabel(track) {
  const ext = fileExtension(track.fileName);
  if (ext) return ext.toUpperCase();
  const sub = String(track.type || '').split('/')[1] || '';
  return sub.replace(/^x-/, '').toUpperCase() || (track.kind === 'video' ? 'VIDEO' : 'AUDIO');
}

export function buildLibrary(state, dataById = {}) {
  return {
    format: LIBRARY_FORMAT,
    version: LIBRARY_VERSION,
    exportedAt: new Date().toISOString(),
    settings: {
      mode: state.mode,
      repeat: state.repeat,
      currentId: state.currentId ?? null
    },
    tracks: state.tracks.map((track) => {
      const entry = { ...track };
      if (dataById[track.id]) entry.data = dataById[track.id];
      return entry;
    })
  };
}

export function parseLibrary(input) {
  let library = input;
  if (typeof input === 'string') {
    try {
      library = JSON.parse(input);
    } catch {
      throw new Error('The file is not valid JSON.');
    }
  }
  if (!library || typeof library !== 'object') throw new Error('The JSON file is empty.');
  const rawTracks = Array.isArray(library) ? library : library.tracks;
  if (!Array.isArray(rawTracks)) throw new Error('No "tracks" list found in the JSON file.');
  if (!Array.isArray(library) && library.format && library.format !== LIBRARY_FORMAT) {
    throw new Error(`Unsupported playlist format "${library.format}".`);
  }

  const seen = new Set();
  const tracks = [];
  let skipped = 0;
  for (const raw of rawTracks) {
    if (!raw || typeof raw !== 'object') {
      skipped += 1;
      continue;
    }
    const data = typeof raw.data === 'string' && raw.data.startsWith('data:') ? raw.data : null;
    const rawUrl = typeof raw.sourceUrl === 'string' ? raw.sourceUrl : typeof raw.url === 'string' ? raw.url : null;
    let sourceUrl = null;
    if (rawUrl) {
      try {
        sourceUrl = normalizeUrl(rawUrl);
      } catch {
        sourceUrl = null;
      }
    }
    if (!data && (!sourceUrl || streamingServiceName(sourceUrl))) {
      skipped += 1;
      continue;
    }
    let id = typeof raw.id === 'string' && raw.id ? raw.id : createId();
    if (seen.has(id)) id = createId();
    seen.add(id);
    const track = createTrack({
      id,
      title: raw.title,
      fileName: raw.fileName || (sourceUrl ? fileNameFromUrl(sourceUrl) : 'media'),
      type: raw.type,
      kind: raw.kind,
      size: raw.size,
      duration: raw.duration,
      source: raw.source || (data ? 'file' : 'url'),
      sourceUrl,
      addedAt: typeof raw.addedAt === 'string' ? raw.addedAt : undefined
    });
    tracks.push({ track, data });
  }

  const settings = (!Array.isArray(library) && library.settings) || {};
  return {
    tracks,
    skipped,
    settings: {
      mode: PLAY_MODES.includes(settings.mode) ? settings.mode : 'sequential',
      repeat: REPEAT_MODES.includes(settings.repeat) ? settings.repeat : 'off',
      currentId: typeof settings.currentId === 'string' ? settings.currentId : null
    }
  };
}

export function dataUrlToBytes(dataUrl) {
  const match = /^data:([^;,]*)((?:;[^;,]*)*?)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error('Invalid embedded media data.');
  const type = match[1] || 'application/octet-stream';
  if (!match[3]) return { type, bytes: new TextEncoder().encode(decodeURIComponent(match[4])) };
  const binary = atob(match[4]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return { type, bytes };
}
