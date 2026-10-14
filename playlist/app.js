import {
  buildLibrary,
  createId,
  createTrack,
  dataUrlToBytes,
  fileNameFromUrl,
  formatBytes,
  formatDuration,
  formatLabel,
  guessMediaKind,
  guessMimeType,
  isLikelyMedia,
  moveItem,
  nextTrackId,
  normalizeUrl,
  parseLibrary,
  playbackOrder,
  previousTrackId,
  reconcileShuffle,
  shuffleIds,
  streamingServiceMessage,
  streamingServiceName
} from './playlist.js';
import {
  clearMedia,
  deleteMedia,
  listMediaIds,
  loadMedia,
  loadLibraryJson,
  requestPersistentStorage,
  saveMedia,
  saveLibraryJson,
  storageEstimate
} from './storage.js';

const POSITION_KEY = 'alphadyn-playlist:position';
const RESTART_THRESHOLD = 3;
const LARGE_EXPORT_BYTES = 300 * 1024 * 1024;

const state = {
  tracks: [],
  currentId: null,
  mode: 'sequential',
  repeat: 'off',
  shuffleOrder: []
};

const available = new Set();
const downloads = new Map();
let objectUrl = null;
let loadedId = null;
let loadToken = 0;
let failedInRow = 0;
let pendingImport = null;
let sheetTrackId = null;
let lastPositionSave = 0;
let lastPositionState = 0;
let videoHidden = false;

const $ = (selector) => document.querySelector(selector);
const media = $('#media');
const els = {
  summary: $('#summary'),
  list: $('#track-list'),
  empty: $('#empty-state'),
  downloads: $('#downloads'),
  fileInput: $('#file-input'),
  jsonInput: $('#json-input'),
  player: $('.player'),
  videoStage: $('#video-stage'),
  art: $('#art'),
  pip: $('#pip-button'),
  fullscreen: $('#fullscreen-button'),
  collapse: $('#collapse-button'),
  nowTitle: $('#now-title'),
  nowSub: $('#now-sub'),
  seek: $('#seek'),
  timeCurrent: $('#time-current'),
  timeTotal: $('#time-total'),
  play: $('#play-button'),
  playIcon: $('#play-icon'),
  prev: $('#prev-button'),
  next: $('#next-button'),
  shuffle: $('#shuffle-button'),
  repeat: $('#repeat-button'),
  modeHint: $('#mode-hint'),
  toast: $('#toast'),
  urlDialog: $('#url-dialog'),
  urlForm: $('#url-form'),
  urlInput: $('#url-input'),
  urlTitle: $('#url-title'),
  urlError: $('#url-error'),
  trackDialog: $('#track-dialog'),
  trackDialogTitle: $('#track-dialog-title'),
  trackDetails: $('#track-details'),
  exportDialog: $('#export-dialog'),
  exportForm: $('#export-form'),
  exportIncludeMedia: $('#export-include-media'),
  exportSize: $('#export-size'),
  importDialog: $('#import-dialog'),
  importSummary: $('#import-summary'),
  menuDialog: $('#menu-dialog'),
  storageInfo: $('#storage-info')
};

/* ---------- Utilities ---------- */

let toastTimer = 0;
function toast(message, { error = false, duration = 3200 } = {}) {
  els.toast.textContent = message;
  els.toast.classList.toggle('error', error);
  els.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), duration);
}

function trackById(id) {
  return state.tracks.find((track) => track.id === id) || null;
}

function indexOfTrack(id) {
  return state.tracks.findIndex((track) => track.id === id);
}

function svgIcon(id) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS(ns, 'use');
  use.setAttribute('href', `#${id}`);
  svg.append(use);
  return svg;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Reads duration and whether the file has a picture (videoWidth), so audio-only .mp4/.webm files count as audio.
function probeMedia(blob, fallbackKind) {
  return new Promise((resolve) => {
    const probe = document.createElement('video');
    const url = URL.createObjectURL(blob);
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const duration = ok && Number.isFinite(probe.duration) && probe.duration > 0 ? probe.duration : null;
      const kind = ok ? (probe.videoWidth > 0 ? 'video' : 'audio') : fallbackKind;
      probe.removeAttribute('src');
      probe.load();
      URL.revokeObjectURL(url);
      resolve({ duration, kind, playable: ok });
    };
    const timer = setTimeout(() => finish(false), 10000);
    probe.preload = 'metadata';
    probe.muted = true;
    probe.playsInline = true;
    probe.addEventListener('loadedmetadata', () => finish(true), { once: true });
    probe.addEventListener('error', () => finish(false), { once: true });
    probe.src = url;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Could not read media data.'));
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  try {
    return await (await fetch(dataUrl)).blob();
  } catch {
    const { type, bytes } = dataUrlToBytes(dataUrl);
    return new Blob([bytes], { type });
  }
}

const isTouchDevice = () => matchMedia('(pointer: coarse)').matches;

// Mobile browsers handle "save file" best through the share sheet; desktops via a download link.
async function deliverFile(blob, fileName) {
  const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
  if (isTouchDevice() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return true;
    } catch (error) {
      if (error?.name === 'AbortError') return false;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return true;
}

/* ---------- Persistence ---------- */

let persistTimer = 0;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    try {
      await saveLibraryJson(JSON.stringify(buildLibrary(state)));
    } catch (error) {
      toast(`Couldn't save playlist: ${error.message}`, { error: true });
    }
  }, 150);
}

function savePosition(force = false) {
  const now = Date.now();
  if (!force && now - lastPositionSave < 2000) return;
  lastPositionSave = now;
  try {
    if (state.currentId && loadedId === state.currentId) {
      localStorage.setItem(POSITION_KEY, JSON.stringify({ id: state.currentId, time: media.currentTime || 0 }));
    }
  } catch {
    // Private mode or quota; position restore is optional.
  }
}

function readSavedPosition() {
  try {
    return JSON.parse(localStorage.getItem(POSITION_KEY) || 'null');
  } catch {
    return null;
  }
}

async function restore() {
  try {
    const json = await loadLibraryJson();
    const ids = new Set(await listMediaIds());
    ids.forEach((id) => available.add(id));
    if (json) {
      const stored = JSON.parse(json);
      state.tracks = (stored.tracks || []).filter((raw) => raw && raw.id).map((raw) => createTrack(raw));
      state.mode = stored.settings?.mode === 'shuffle' ? 'shuffle' : 'sequential';
      state.repeat = ['all', 'one'].includes(stored.settings?.repeat) ? stored.settings.repeat : 'off';
      state.currentId = trackById(stored.settings?.currentId) ? stored.settings.currentId : null;
    }
    // Drop tracks that lost their media and can't be re-downloaded, and orphaned media blobs.
    state.tracks = state.tracks.filter((track) => available.has(track.id) || track.sourceUrl);
    const known = new Set(state.tracks.map((track) => track.id));
    for (const id of ids) {
      if (!known.has(id)) {
        available.delete(id);
        deleteMedia(id).catch(() => {});
      }
    }
    if (state.mode === 'shuffle') state.shuffleOrder = shuffleIds(state.tracks.map((t) => t.id), state.currentId);
  } catch (error) {
    toast(`Couldn't load saved playlist: ${error.message}`, { error: true, duration: 6000 });
  }
  renderAll();
  if (state.currentId) {
    const saved = readSavedPosition();
    const position = saved?.id === state.currentId ? Number(saved.time) || 0 : 0;
    loadTrack(state.currentId, { autoplay: false, position, quiet: true });
  }
}

/* ---------- Rendering ---------- */

function renderSummary() {
  const count = state.tracks.length;
  if (!count) {
    els.summary.textContent = 'No tracks yet';
    return;
  }
  const seconds = state.tracks.reduce((sum, track) => sum + (track.duration || 0), 0);
  const bytes = state.tracks.reduce((sum, track) => sum + (available.has(track.id) ? track.size : 0), 0);
  const parts = [`${count} track${count === 1 ? '' : 's'}`];
  if (seconds) parts.push(formatDuration(seconds));
  if (bytes) parts.push(formatBytes(bytes));
  els.summary.textContent = parts.join(' · ');
}

function trackMeta(track) {
  const fragment = document.createDocumentFragment();
  const badge = el('span', 'badge', formatLabel(track));
  fragment.append(badge);
  if (track.kind === 'video') fragment.append(el('span', 'badge video', 'VIDEO'));
  if (!available.has(track.id)) {
    fragment.append(el('span', 'badge warn', downloads.has(track.id) ? 'DOWNLOADING' : 'NOT SAVED'));
  }
  const bits = [formatDuration(track.duration ?? NaN).replace('--:--', '')];
  if (track.size) bits.push(formatBytes(track.size));
  bits.push(track.source === 'url' ? 'From URL' : 'From device');
  fragment.append(document.createTextNode(bits.filter(Boolean).join(' · ')));
  return fragment;
}

function renderList() {
  const fragment = document.createDocumentFragment();
  state.tracks.forEach((track, index) => {
    const li = el('li', 'track');
    li.dataset.id = track.id;
    if (!available.has(track.id)) li.classList.add('missing');

    const indexCell = el('span', 'track-index');
    indexCell.append(el('span', 'num', String(index + 1)));
    const eq = el('span', 'eq');
    eq.setAttribute('aria-hidden', 'true');
    eq.append(el('span'), el('span'), el('span'));
    indexCell.append(eq);

    const main = el('button', 'track-main');
    main.type = 'button';
    main.dataset.role = 'play';
    main.append(el('p', 'track-title', track.title));
    const meta = el('p', 'track-meta');
    meta.append(trackMeta(track));
    main.append(meta);
    main.setAttribute('aria-label', `Play ${track.title}`);

    const grip = el('button', 'track-grip');
    grip.type = 'button';
    grip.dataset.role = 'grip';
    grip.setAttribute('aria-label', `Reorder ${track.title}. Use arrow keys to move.`);
    grip.append(svgIcon('i-grip'));

    const more = el('button', 'track-more');
    more.type = 'button';
    more.dataset.role = 'more';
    more.setAttribute('aria-label', `Options for ${track.title}`);
    more.append(svgIcon('i-more'));

    li.append(indexCell, main, grip, more);
    fragment.append(li);
  });
  els.list.replaceChildren(fragment);
  els.empty.hidden = state.tracks.length > 0;
  els.modeHint.hidden = state.tracks.length < 2;
  updateCurrentHighlight();
}

function updateCurrentHighlight() {
  const playing = !media.paused && loadedId === state.currentId;
  for (const li of els.list.children) {
    const isCurrent = li.dataset.id === state.currentId;
    li.classList.toggle('current', isCurrent);
    li.classList.toggle('playing', isCurrent && playing);
    if (isCurrent) li.setAttribute('aria-current', 'true');
    else li.removeAttribute('aria-current');
  }
}

function renderPlayer() {
  const track = trackById(state.currentId);
  const playing = !media.paused && Boolean(track);
  els.player.classList.toggle('playing', playing);
  els.playIcon.setAttribute('href', playing ? '#i-pause' : '#i-play');
  els.play.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  els.play.disabled = !state.tracks.length;
  els.prev.disabled = !state.tracks.length;
  els.next.disabled = !state.tracks.length;
  els.shuffle.setAttribute('aria-pressed', String(state.mode === 'shuffle'));
  els.shuffle.setAttribute('aria-label', state.mode === 'shuffle' ? 'Shuffle: on' : 'Shuffle: off');
  els.repeat.dataset.repeat = state.repeat;
  els.repeat.setAttribute('aria-label', `Repeat: ${state.repeat === 'one' ? 'current track' : state.repeat === 'all' ? 'playlist' : 'off'}`);

  renderVideoStage(track);

  if (!track) {
    els.nowTitle.textContent = state.tracks.length ? 'Ready to play' : 'Nothing playing';
    els.nowSub.textContent = state.tracks.length ? 'Tap a track or press play' : 'Add audio or video to get started';
    updateTime();
    return;
  }
  els.nowTitle.textContent = track.title;
  const order = playbackOrder(state);
  const position = order.indexOf(track.id) + 1;
  const modeText = state.mode === 'shuffle' ? 'Shuffle' : 'In order';
  els.nowSub.textContent = `${position} of ${order.length} · ${modeText}`;
  updateTime();
}

function renderVideoStage(track) {
  const isVideo = track?.kind === 'video';
  const showStage = isVideo && loadedId === track.id && !videoHidden;
  els.videoStage.hidden = !showStage;
  els.player.classList.toggle('has-video', isVideo);
  els.art.disabled = !isVideo;
  els.art.setAttribute('aria-label', showStage ? 'Hide video' : 'Show video');
  els.art.setAttribute('aria-pressed', String(showStage));
  els.pip.hidden = !(document.pictureInPictureEnabled && typeof media.requestPictureInPicture === 'function');
  document.documentElement.style.setProperty('--player-height', `${Math.ceil(els.player.offsetHeight)}px`);
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.();
  } else if (els.videoStage.requestFullscreen) {
    els.videoStage.requestFullscreen().catch(() => media.webkitEnterFullscreen?.());
  } else if (media.webkitEnterFullscreen) {
    // iPhone Safari only supports native fullscreen on the video element itself.
    media.webkitEnterFullscreen();
  }
}

async function togglePictureInPicture() {
  try {
    if (document.pictureInPictureElement) await document.exitPictureInPicture();
    else await media.requestPictureInPicture();
  } catch (error) {
    toast(`Picture-in-picture isn't available: ${error.message}`, { error: true });
  }
}

function updateTime() {
  const hasMedia = Boolean(loadedId) && loadedId === state.currentId;
  const track = trackById(state.currentId);
  const duration = hasMedia && Number.isFinite(media.duration) ? media.duration : track?.duration ?? NaN;
  const current = hasMedia ? media.currentTime : 0;
  els.timeCurrent.textContent = formatDuration(current);
  els.timeTotal.textContent = formatDuration(duration);
  if (!els.seek.matches(':active')) {
    els.seek.max = Number.isFinite(duration) ? String(duration) : '0';
    els.seek.value = String(current);
  }
  els.seek.disabled = !hasMedia || !Number.isFinite(duration);
  const pct = Number.isFinite(duration) && duration > 0 ? (Number(els.seek.value) / duration) * 100 : 0;
  els.seek.style.setProperty('--progress', `${pct}%`);
}

function renderAll() {
  renderSummary();
  renderList();
  renderPlayer();
}

/* ---------- Playback ---------- */

function setMediaSession(track) {
  if (!('mediaSession' in navigator)) return;
  if (!track) {
    navigator.mediaSession.metadata = null;
    return;
  }
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.source === 'url' ? new URL(track.sourceUrl || location.href).hostname : 'Playlist',
      album: 'Playlist',
      artwork: [{ src: new URL('icon.svg', location.href).href, sizes: '512x512', type: 'image/svg+xml' }]
    });
  } catch {
    // MediaMetadata unsupported on this browser.
  }
}

function updatePositionState() {
  if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
  const now = Date.now();
  if (now - lastPositionState < 1000) return;
  lastPositionState = now;
  try {
    if (Number.isFinite(media.duration) && media.duration > 0) {
      navigator.mediaSession.setPositionState({
        duration: media.duration,
        playbackRate: media.playbackRate || 1,
        position: Math.min(media.currentTime, media.duration)
      });
    }
  } catch {
    // Ignore invalid position states during track transitions.
  }
}

function unloadMedia() {
  loadToken += 1;
  media.pause();
  media.removeAttribute('src');
  media.load();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = null;
  loadedId = null;
}

async function loadTrack(id, { autoplay = true, position = 0, quiet = false } = {}) {
  const track = trackById(id);
  if (!track) return false;
  const token = ++loadToken;
  if (id !== loadedId) videoHidden = false;
  state.currentId = id;
  persist();
  renderPlayer();
  updateCurrentHighlight();
  setMediaSession(track);

  let blob = null;
  try {
    blob = available.has(id) ? await loadMedia(id) : null;
  } catch (error) {
    if (!quiet) toast(`Couldn't read media: ${error.message}`, { error: true });
  }
  if (token !== loadToken) return false;

  if (!blob) {
    available.delete(id);
    media.pause();
    loadedId = null;
    renderAll();
    if (!quiet) {
      if (track.sourceUrl && !downloads.has(id)) {
        toast('Not saved on this device yet — downloading it now.');
        downloadFromUrl(track.sourceUrl, { existingId: id, playWhenDone: autoplay });
      } else if (downloads.has(id)) {
        toast('Still downloading this track…');
      } else {
        toast('This track has no saved media.', { error: true });
      }
    }
    return false;
  }

  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(blob);
  loadedId = id;
  media.src = objectUrl;
  media.load();
  renderVideoStage(track);

  if (position > 0) {
    media.addEventListener('loadedmetadata', () => {
      if (token === loadToken && position < (media.duration || Infinity) - 1) media.currentTime = position;
    }, { once: true });
  }
  if (autoplay) await playMedia();
  else renderPlayer();
  return true;
}

async function playMedia() {
  try {
    await media.play();
    failedInRow = 0;
  } catch (error) {
    if (error?.name === 'NotAllowedError') toast('Tap play to start playback.');
    else if (error?.name !== 'AbortError') toast(`Playback failed: ${error.message}`, { error: true });
  }
  renderPlayer();
  updateCurrentHighlight();
}

async function togglePlay() {
  if (!state.tracks.length) return;
  if (!state.currentId || !trackById(state.currentId)) {
    const first = playbackOrder(state)[0];
    if (first) await loadTrack(first);
    return;
  }
  if (loadedId !== state.currentId) {
    await loadTrack(state.currentId, { autoplay: true });
    return;
  }
  if (media.paused) await playMedia();
  else media.pause();
}

function reshuffleForWrap() {
  if (state.mode !== 'shuffle' || state.tracks.length < 2) return;
  const ids = state.tracks.map((track) => track.id);
  let order = shuffleIds(ids);
  if (order[0] === state.currentId) order = [...order.slice(1), order[0]];
  state.shuffleOrder = order;
}

async function playNext({ auto = false } = {}) {
  if (!state.tracks.length) return;
  if (auto && state.repeat === 'one') {
    media.currentTime = 0;
    await playMedia();
    return;
  }
  const order = playbackOrder(state);
  const wrapping = order.indexOf(state.currentId) === order.length - 1;
  let id = nextTrackId(state, { auto });
  if (wrapping && id && state.mode === 'shuffle') {
    reshuffleForWrap();
    id = state.shuffleOrder[0];
  }
  if (!id) {
    // End of playlist with repeat off: stop and rewind to the start of the queue.
    media.pause();
    if (auto) {
      await loadTrack(order[0], { autoplay: false });
      toast('Reached the end of the playlist.');
    } else {
      toast('This is the last track. Turn on repeat to loop.');
    }
    return;
  }
  await loadTrack(id, { autoplay: true });
}

async function playPrevious() {
  if (!state.tracks.length) return;
  if (loadedId === state.currentId && media.currentTime > RESTART_THRESHOLD) {
    media.currentTime = 0;
    return;
  }
  const id = previousTrackId(state);
  if (id) await loadTrack(id, { autoplay: true });
}

function toggleShuffle() {
  const ids = state.tracks.map((track) => track.id);
  if (state.mode === 'shuffle') {
    state.mode = 'sequential';
    state.shuffleOrder = [];
    toast('Playing in playlist order');
  } else {
    state.mode = 'shuffle';
    state.shuffleOrder = shuffleIds(ids, state.currentId);
    toast('Shuffle on');
  }
  persist();
  renderPlayer();
}

function cycleRepeat() {
  state.repeat = state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off';
  toast(state.repeat === 'off' ? 'Repeat off' : state.repeat === 'all' ? 'Repeating playlist' : 'Repeating current track');
  persist();
  renderPlayer();
}

function syncShuffle() {
  if (state.mode !== 'shuffle') return;
  state.shuffleOrder = reconcileShuffle(state.shuffleOrder, state.tracks.map((t) => t.id), state.currentId);
}

/* ---------- Playlist editing ---------- */

async function addFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;
  requestPersistentStorage();
  let added = 0;
  const rejected = [];
  for (const file of files) {
    if (!isLikelyMedia(file.name, file.type)) {
      rejected.push(file.name);
      continue;
    }
    const { duration, kind } = await probeMedia(file, guessMediaKind(file.name, file.type));
    const track = createTrack({
      fileName: file.name,
      type: file.type,
      kind,
      size: file.size,
      duration,
      source: 'file'
    });
    try {
      await saveMedia(track.id, file);
    } catch (error) {
      toast(`Couldn't save "${file.name}": ${error.message}`, { error: true, duration: 6000 });
      break;
    }
    available.add(track.id);
    state.tracks.push(track);
    added += 1;
    syncShuffle();
    renderAll();
  }
  persist();
  if (added && !state.currentId) {
    state.currentId = state.tracks[0].id;
    renderAll();
  }
  if (rejected.length) {
    toast(`Skipped ${rejected.length} non-media file${rejected.length === 1 ? '' : 's'}: ${rejected.slice(0, 2).join(', ')}`, { error: true, duration: 5000 });
  } else if (added) {
    toast(`Added ${added} track${added === 1 ? '' : 's'}`);
  }
}

function moveTrack(id, toIndex) {
  const from = indexOfTrack(id);
  if (from === -1) return;
  const to = Math.max(0, Math.min(state.tracks.length - 1, toIndex));
  if (from === to) return;
  state.tracks = moveItem(state.tracks, from, to);
  persist();
  renderList();
  renderPlayer();
}

async function removeTrack(id) {
  const index = indexOfTrack(id);
  if (index === -1) return;
  const wasCurrent = state.currentId === id;
  const wasPlaying = wasCurrent && !media.paused;
  const successor = wasCurrent ? nextTrackId(state) || previousTrackId(state) : null;

  state.tracks.splice(index, 1);
  state.shuffleOrder = state.shuffleOrder.filter((value) => value !== id);
  downloads.get(id)?.controller.abort();
  available.delete(id);
  deleteMedia(id).catch(() => {});

  if (wasCurrent) {
    unloadMedia();
    state.currentId = successor && successor !== id && trackById(successor) ? successor : state.tracks[0]?.id ?? null;
    setMediaSession(null);
    if (state.currentId) loadTrack(state.currentId, { autoplay: wasPlaying, quiet: true });
  }
  persist();
  renderAll();
}

async function clearPlaylist({ silent = false } = {}) {
  unloadMedia();
  downloads.forEach((entry) => entry.controller.abort());
  state.tracks = [];
  state.shuffleOrder = [];
  state.currentId = null;
  available.clear();
  setMediaSession(null);
  try {
    await clearMedia();
  } catch (error) {
    toast(`Couldn't clear saved media: ${error.message}`, { error: true });
  }
  try {
    localStorage.removeItem(POSITION_KEY);
  } catch {
    // ignore
  }
  persist();
  renderAll();
  if (!silent) toast('Playlist cleared');
}

/* ---------- URL downloads ---------- */

function describeFetchError(error) {
  if (error?.name === 'AbortError') return 'Cancelled';
  if (error instanceof TypeError) {
    return "Couldn't download. The link must point directly to an audio or video file on a site that allows downloads from other apps (CORS), and the site must be reachable.";
  }
  return error?.message || 'Download failed.';
}

function renderDownload(entry) {
  const { node, name, status, received, total, failed } = entry;
  node.classList.toggle('error', Boolean(failed));
  node.querySelector('.download-name').textContent = name;
  node.querySelector('.download-status').textContent = status
    || (total ? `${formatBytes(received)} of ${formatBytes(total)} · ${Math.round((received / total) * 100)}%` : `${formatBytes(received)} downloaded`);
  const progress = node.querySelector('progress');
  if (total) {
    progress.max = total;
    progress.value = received;
  } else if (!failed) {
    progress.removeAttribute('value');
  }
  progress.hidden = Boolean(failed);
  node.querySelector('button').textContent = failed ? 'Dismiss' : 'Cancel';
}

async function downloadFromUrl(rawUrl, { title = '', existingId = null, playWhenDone = false } = {}) {
  let url;
  try {
    url = normalizeUrl(rawUrl);
  } catch (error) {
    toast(error.message, { error: true });
    return;
  }
  requestPersistentStorage();
  const service = streamingServiceName(url);
  if (service) {
    toast(streamingServiceMessage(service), { error: true, duration: 8000 });
    return;
  }
  const key = existingId || createId();
  if (downloads.has(key)) return;

  const controller = new AbortController();
  const node = el('li', 'download');
  node.append(el('span', 'download-name'), el('span', 'download-status'), el('button'), el('progress'));
  node.querySelector('button').type = 'button';
  const entry = { controller, node, name: title || fileNameFromUrl(url), status: 'Connecting…', received: 0, total: 0, failed: false };
  downloads.set(key, entry);
  node.querySelector('button').addEventListener('click', () => {
    if (entry.failed) {
      node.remove();
      downloads.delete(key);
    } else {
      controller.abort();
    }
  });
  els.downloads.append(node);
  renderDownload(entry);
  if (existingId) renderList();

  try {
    const response = await fetch(url, { signal: controller.signal, mode: 'cors', credentials: 'omit' });
    if (!response.ok) throw new Error(`Server responded with ${response.status} ${response.statusText}`.trim());
    const contentType = response.headers.get('content-type') || '';
    const fileName = fileNameFromUrl(response.url || url, contentType, response.headers.get('content-disposition') || '');
    if (!isLikelyMedia(fileName, contentType)) {
      throw new Error(`That link isn't an audio or video file (${contentType.split(';')[0] || 'unknown type'}).`);
    }
    entry.name = title || fileName;
    entry.total = Number(response.headers.get('content-length')) || 0;
    entry.status = '';
    renderDownload(entry);

    let blob;
    const type = guessMimeType(fileName, contentType);
    if (response.body?.getReader) {
      const reader = response.body.getReader();
      const chunks = [];
      let lastPaint = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        entry.received += value.byteLength;
        if (Date.now() - lastPaint > 120) {
          lastPaint = Date.now();
          renderDownload(entry);
        }
      }
      blob = new Blob(chunks, { type });
    } else {
      const raw = await response.blob();
      blob = raw.type === type ? raw : new Blob([raw], { type });
      entry.received = blob.size;
    }
    if (!blob.size) throw new Error('The downloaded file is empty.');

    entry.status = 'Saving…';
    renderDownload(entry);
    const { duration, kind, playable } = await probeMedia(blob, guessMediaKind(fileName, type));
    await saveMedia(key, blob);
    available.add(key);

    const existing = trackById(key);
    if (existing) {
      Object.assign(existing, { type, kind, size: blob.size, duration: duration ?? existing.duration, fileName: existing.fileName || fileName });
    } else {
      state.tracks.push(createTrack({
        id: key,
        title,
        fileName,
        type,
        kind,
        size: blob.size,
        duration,
        source: 'url',
        sourceUrl: url
      }));
      syncShuffle();
      if (!state.currentId) state.currentId = key;
    }
    downloads.delete(key);
    node.remove();
    persist();
    renderAll();
    toast(`Saved "${title || fileName}"`);
    if (playWhenDone && state.currentId === key) loadTrack(key, { autoplay: true });
    if (!playable) toast('Saved, but this device may not be able to play that format.', { error: true });
  } catch (error) {
    if (error?.name === 'AbortError') {
      downloads.delete(key);
      node.remove();
      if (existingId) renderList();
      return;
    }
    entry.failed = true;
    entry.status = describeFetchError(error);
    renderDownload(entry);
    if (existingId) renderList();
  }
}

/* ---------- Drag to reorder ---------- */

const drag = {
  active: false,
  pointerId: null,
  li: null,
  grip: null,
  items: [],
  fromIndex: -1,
  toIndex: -1,
  startY: 0,
  startScroll: 0,
  lastY: 0,
  gap: 6,
  raf: 0
};

function startDrag(event, grip) {
  const li = grip.closest('.track');
  if (!li || state.tracks.length < 2) return;
  event.preventDefault();
  grip.setPointerCapture?.(event.pointerId);
  const items = Array.from(els.list.children);
  drag.active = true;
  drag.pointerId = event.pointerId;
  drag.li = li;
  drag.grip = grip;
  drag.items = items.map((node) => {
    const rect = node.getBoundingClientRect();
    return { node, top: rect.top + scrollY, height: rect.height };
  });
  drag.fromIndex = items.indexOf(li);
  drag.toIndex = drag.fromIndex;
  drag.startY = event.clientY;
  drag.lastY = event.clientY;
  drag.startScroll = scrollY;
  drag.gap = parseFloat(getComputedStyle(els.list).rowGap) || 6;
  li.classList.add('dragging');
  document.body.classList.add('is-dragging');
  for (const { node } of drag.items) {
    if (node !== li) node.style.transition = 'transform .16s ease';
  }
  navigator.vibrate?.(10);
  drag.raf = requestAnimationFrame(autoScroll);
}

function layoutDrag() {
  const dy = drag.lastY - drag.startY + (scrollY - drag.startScroll);
  const dragged = drag.items[drag.fromIndex];
  const center = dragged.top + dragged.height / 2 + dy;
  let target = drag.fromIndex;
  for (let i = 0; i < drag.items.length; i += 1) {
    const item = drag.items[i];
    const mid = item.top + item.height / 2;
    if (i < drag.fromIndex && center < mid) {
      target = i;
      break;
    }
    if (i > drag.fromIndex && center > mid) target = i;
  }
  drag.toIndex = target;
  const shift = dragged.height + drag.gap;
  drag.items.forEach((item, i) => {
    if (i === drag.fromIndex) {
      item.node.style.transform = `translateY(${dy}px)`;
    } else if (i > drag.fromIndex && i <= target) {
      item.node.style.transform = `translateY(${-shift}px)`;
    } else if (i < drag.fromIndex && i >= target) {
      item.node.style.transform = `translateY(${shift}px)`;
    } else {
      item.node.style.transform = '';
    }
  });
}

function autoScroll() {
  if (!drag.active) return;
  const edge = 90;
  const bottomLimit = els.player.getBoundingClientRect().top;
  let delta = 0;
  if (drag.lastY < edge) delta = -Math.ceil((edge - drag.lastY) / 6);
  else if (drag.lastY > bottomLimit - edge) delta = Math.ceil((drag.lastY - (bottomLimit - edge)) / 6);
  if (delta) {
    scrollBy(0, delta);
    layoutDrag();
  }
  drag.raf = requestAnimationFrame(autoScroll);
}

function moveDrag(event) {
  if (!drag.active || event.pointerId !== drag.pointerId) return;
  event.preventDefault();
  drag.lastY = event.clientY;
  layoutDrag();
}

function endDrag(event) {
  if (!drag.active || (event && event.pointerId !== drag.pointerId)) return;
  drag.active = false;
  cancelAnimationFrame(drag.raf);
  document.body.classList.remove('is-dragging');
  for (const { node } of drag.items) {
    node.style.transition = '';
    node.style.transform = '';
  }
  drag.li.classList.remove('dragging');
  const id = drag.li.dataset.id;
  const changed = drag.toIndex !== drag.fromIndex;
  if (changed) {
    moveTrack(id, drag.toIndex);
    els.list.querySelector(`[data-id="${CSS.escape(id)}"] .track-grip`)?.focus({ preventScroll: true });
  }
  drag.items = [];
  drag.li = null;
}

/* ---------- Dialogs ---------- */

function openDialog(dialog) {
  if (dialog.open) return;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}

function closeDialog(dialog) {
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

function openTrackSheet(id) {
  const track = trackById(id);
  if (!track) return;
  sheetTrackId = id;
  const index = indexOfTrack(id);
  els.trackDialogTitle.textContent = track.title;
  const rows = [
    ['Position', `${index + 1} of ${state.tracks.length}`],
    ['File', track.fileName],
    ['Kind', track.kind === 'video' ? 'Video' : 'Audio'],
    ['Format', `${formatLabel(track)} (${track.type})`],
    ['Size', track.size ? formatBytes(track.size) : '—'],
    ['Length', formatDuration(track.duration ?? NaN)],
    ['Source', track.source === 'url' ? track.sourceUrl : 'Added from device'],
    ['Added', new Date(track.addedAt).toLocaleString()],
    ['Status', available.has(id) ? 'Saved on this device' : downloads.has(id) ? 'Downloading…' : 'Not saved on this device yet']
  ];
  els.trackDetails.replaceChildren(...rows.flatMap(([term, value]) => [el('dt', '', term), el('dd', '', value)]));
  const menu = els.trackDialog.querySelector('.sheet-menu');
  menu.querySelector('[data-action="top"]').disabled = index === 0;
  menu.querySelector('[data-action="up"]').disabled = index === 0;
  menu.querySelector('[data-action="down"]').disabled = index === state.tracks.length - 1;
  menu.querySelector('[data-action="bottom"]').disabled = index === state.tracks.length - 1;
  menu.querySelector('[data-action="save"]').disabled = !available.has(id);
  menu.querySelector('[data-action="redownload"]').hidden = !track.sourceUrl;
  menu.querySelector('[data-action="redownload"]').disabled = downloads.has(id);
  openDialog(els.trackDialog);
}

async function handleTrackAction(action) {
  const id = sheetTrackId;
  const track = trackById(id);
  if (!track) return;
  const index = indexOfTrack(id);
  closeDialog(els.trackDialog);
  switch (action) {
    case 'play':
      await loadTrack(id, { autoplay: true });
      break;
    case 'rename': {
      const name = prompt('Track title', track.title);
      if (name && name.trim()) {
        track.title = name.trim().slice(0, 200);
        persist();
        renderList();
        renderPlayer();
        if (state.currentId === id) setMediaSession(track);
      }
      break;
    }
    case 'top':
      moveTrack(id, 0);
      break;
    case 'up':
      moveTrack(id, index - 1);
      break;
    case 'down':
      moveTrack(id, index + 1);
      break;
    case 'bottom':
      moveTrack(id, state.tracks.length - 1);
      break;
    case 'save': {
      try {
        const blob = await loadMedia(id);
        if (!blob) throw new Error('Nothing saved for this track.');
        await deliverFile(blob, track.fileName);
      } catch (error) {
        toast(error.message, { error: true });
      }
      break;
    }
    case 'redownload':
      downloadFromUrl(track.sourceUrl, { existingId: id });
      break;
    case 'remove':
      if (confirm(`Remove "${track.title}" from the playlist? Its saved file will be deleted from this device.`)) {
        await removeTrack(id);
        toast('Track removed');
      }
      break;
    default:
      break;
  }
}

/* ---------- JSON export / import ---------- */

function exportFileName() {
  const date = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `playlist-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

function updateExportEstimate() {
  const bytes = state.tracks.reduce((sum, track) => sum + (available.has(track.id) ? track.size : 0), 0);
  els.exportSize.textContent = bytes ? `(≈ ${formatBytes(Math.ceil(bytes * 1.34))})` : '';
}

async function exportLibrary(includeMedia) {
  if (!state.tracks.length) {
    toast('Add some tracks before saving.', { error: true });
    return;
  }
  if (includeMedia) {
    const total = state.tracks.reduce((sum, track) => sum + (available.has(track.id) ? track.size || 0 : 0), 0);
    if (total > LARGE_EXPORT_BYTES && !confirm(`This file will be about ${formatBytes(total * 1.34)}. Large files can fail to save on phones. Continue?`)) return;
  }
  toast(includeMedia ? 'Preparing playlist file…' : 'Saving playlist…', { duration: 60000 });
  try {
    const library = buildLibrary(state);
    const tracks = library.tracks;
    delete library.tracks;
    // Assemble the JSON as Blob parts so large embedded media never becomes one giant string.
    const head = JSON.stringify(library, null, 2);
    const parts = [new Blob([`${head.slice(0, -2)},\n  "tracks": [\n`])];
    for (let i = 0; i < tracks.length; i += 1) {
      const entry = { ...tracks[i] };
      if (includeMedia && available.has(entry.id)) {
        const blob = await loadMedia(entry.id);
        if (blob) entry.data = await blobToDataUrl(blob);
      }
      parts.push(new Blob([`${i ? ',\n' : ''}    ${JSON.stringify(entry)}`]));
    }
    parts.push(new Blob(['\n  ]\n}\n']));
    const file = new Blob(parts, { type: 'application/json' });
    const delivered = await deliverFile(file, exportFileName());
    toast(delivered ? `Saved ${tracks.length} track${tracks.length === 1 ? '' : 's'} (${formatBytes(file.size)})` : 'Save cancelled');
  } catch (error) {
    toast(`Couldn't save playlist: ${error.message}`, { error: true, duration: 6000 });
  }
}

async function readImportFile(file) {
  if (!file) return;
  try {
    const parsed = parseLibrary(await file.text());
    if (!parsed.tracks.length) throw new Error('No playable tracks found in that file.');
    pendingImport = parsed;
    const embedded = parsed.tracks.filter((item) => item.data).length;
    const remote = parsed.tracks.length - embedded;
    const bits = [`"${file.name}" has ${parsed.tracks.length} track${parsed.tracks.length === 1 ? '' : 's'}.`];
    if (embedded) bits.push(`${embedded} include${embedded === 1 ? 's' : ''} the media file.`);
    if (remote) bits.push(`${remote} will be downloaded from ${remote === 1 ? 'its' : 'their'} URL${remote === 1 ? '' : 's'}.`);
    if (parsed.skipped) bits.push(`${parsed.skipped} entr${parsed.skipped === 1 ? 'y has' : 'ies have'} no media or URL and will be skipped.`);
    els.importSummary.textContent = bits.join(' ');
    openDialog(els.importDialog);
  } catch (error) {
    toast(error.message, { error: true, duration: 5000 });
  }
}

async function applyImport(mode) {
  const parsed = pendingImport;
  pendingImport = null;
  if (!parsed) return;
  closeDialog(els.importDialog);
  requestPersistentStorage();
  if (mode === 'replace') await clearPlaylist({ silent: true });

  const existingIds = new Set(state.tracks.map((track) => track.id));
  const toDownload = [];
  let restored = 0;
  let failed = 0;
  toast('Loading playlist…', { duration: 60000 });
  for (const { track, data } of parsed.tracks) {
    const original = track.id;
    if (existingIds.has(track.id)) track.id = createId();
    existingIds.add(track.id);
    if (data) {
      try {
        const blob = await dataUrlToBlob(data);
        await saveMedia(track.id, blob);
        available.add(track.id);
        if (!track.size) track.size = blob.size;
        restored += 1;
      } catch (error) {
        if (!track.sourceUrl) {
          failed += 1;
          continue;
        }
        toDownload.push(track);
      }
    } else {
      toDownload.push(track);
    }
    if (mode === 'replace' && parsed.settings.currentId === original) state.currentId = track.id;
    state.tracks.push(track);
  }

  if (mode === 'replace') {
    state.mode = parsed.settings.mode;
    state.repeat = parsed.settings.repeat;
    state.shuffleOrder = state.mode === 'shuffle' ? shuffleIds(state.tracks.map((t) => t.id), state.currentId) : [];
  } else {
    syncShuffle();
  }
  if (!state.currentId && state.tracks.length) state.currentId = state.tracks[0].id;
  persist();
  renderAll();
  for (const track of toDownload) downloadFromUrl(track.sourceUrl, { existingId: track.id });

  const bits = [`Loaded ${restored + toDownload.length} track${restored + toDownload.length === 1 ? '' : 's'}`];
  if (toDownload.length) bits.push(`downloading ${toDownload.length}`);
  if (failed) bits.push(`${failed} failed`);
  toast(bits.join(', '), { error: Boolean(failed) });
}

async function openMenu() {
  els.storageInfo.textContent = '';
  openDialog(els.menuDialog);
  const estimate = await storageEstimate();
  if (estimate?.quota) {
    els.storageInfo.textContent = `Using ${formatBytes(estimate.usage || 0)} of about ${formatBytes(estimate.quota)} available on this device.`;
  }
}

/* ---------- Events ---------- */

function bindEvents() {
  $('#add-files-button').addEventListener('click', () => els.fileInput.click());
  els.fileInput.addEventListener('change', async () => {
    const files = Array.from(els.fileInput.files || []);
    els.fileInput.value = '';
    await addFiles(files);
  });

  $('#add-url-button').addEventListener('click', () => {
    els.urlForm.reset();
    els.urlError.textContent = '';
    openDialog(els.urlDialog);
    setTimeout(() => els.urlInput.focus(), 50);
  });
  els.urlForm.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      const url = normalizeUrl(els.urlInput.value);
      const service = streamingServiceName(url);
      if (service) throw new Error(streamingServiceMessage(service));
      const title = els.urlTitle.value.trim();
      closeDialog(els.urlDialog);
      downloadFromUrl(url, { title });
    } catch (error) {
      els.urlError.textContent = error.message;
    }
  });

  $('#export-button').addEventListener('click', () => {
    updateExportEstimate();
    openDialog(els.exportDialog);
  });
  els.exportForm.addEventListener('submit', (event) => {
    event.preventDefault();
    closeDialog(els.exportDialog);
    exportLibrary(els.exportIncludeMedia.checked);
  });

  $('#import-button').addEventListener('click', () => els.jsonInput.click());
  els.jsonInput.addEventListener('change', () => {
    const [file] = els.jsonInput.files || [];
    els.jsonInput.value = '';
    readImportFile(file);
  });
  els.importDialog.addEventListener('click', (event) => {
    const mode = event.target.closest('[data-import]')?.dataset.import;
    if (mode) applyImport(mode);
  });
  els.importDialog.addEventListener('close', () => {
    pendingImport = null;
  });

  $('#menu-button').addEventListener('click', openMenu);
  els.menuDialog.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-menu]')?.dataset.menu;
    if (!action) return;
    closeDialog(els.menuDialog);
    if (action === 'export') {
      updateExportEstimate();
      openDialog(els.exportDialog);
    } else if (action === 'import') {
      els.jsonInput.click();
    } else if (action === 'clear' && state.tracks.length) {
      if (confirm('Remove every track and delete all saved media from this device?')) await clearPlaylist();
    }
  });

  document.querySelectorAll('dialog').forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target.closest('[data-close]')) closeDialog(dialog);
      else if (event.target === dialog) closeDialog(dialog); // backdrop tap
    });
  });

  els.trackDialog.querySelector('.sheet-menu').addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action) handleTrackAction(action);
  });

  els.list.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    const li = event.target.closest('.track');
    if (!button || !li) return;
    const id = li.dataset.id;
    if (button.dataset.role === 'more') openTrackSheet(id);
    else if (button.dataset.role === 'play') {
      if (id === state.currentId && loadedId === id) togglePlay();
      else loadTrack(id, { autoplay: true });
    }
  });
  els.list.addEventListener('pointerdown', (event) => {
    const grip = event.target.closest('.track-grip');
    if (grip && (event.button === 0 || event.pointerType !== 'mouse')) startDrag(event, grip);
  });
  els.list.addEventListener('pointermove', moveDrag);
  els.list.addEventListener('pointerup', endDrag);
  els.list.addEventListener('pointercancel', endDrag);
  els.list.addEventListener('lostpointercapture', endDrag);
  els.list.addEventListener('keydown', (event) => {
    const grip = event.target.closest('.track-grip');
    if (!grip || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const id = grip.closest('.track').dataset.id;
    moveTrack(id, indexOfTrack(id) + (event.key === 'ArrowUp' ? -1 : 1));
    els.list.querySelector(`[data-id="${CSS.escape(id)}"] .track-grip`)?.focus();
  });

  els.play.addEventListener('click', togglePlay);
  els.next.addEventListener('click', () => playNext());
  els.prev.addEventListener('click', playPrevious);
  els.shuffle.addEventListener('click', toggleShuffle);
  els.repeat.addEventListener('click', cycleRepeat);
  els.seek.addEventListener('input', () => {
    if (loadedId !== state.currentId) return;
    media.currentTime = Number(els.seek.value);
    updateTime();
  });

  media.addEventListener('play', () => {
    renderPlayer();
    updateCurrentHighlight();
  });
  media.addEventListener('pause', () => {
    renderPlayer();
    updateCurrentHighlight();
    savePosition(true);
  });
  media.addEventListener('timeupdate', () => {
    updateTime();
    savePosition();
    updatePositionState();
  });
  media.addEventListener('loadedmetadata', () => {
    const track = trackById(loadedId);
    if (track && Number.isFinite(media.duration) && media.duration > 0 && track.duration !== media.duration) {
      track.duration = media.duration;
      persist();
      renderSummary();
    }
    updateTime();
  });
  media.addEventListener('ended', () => playNext({ auto: true }));
  media.addEventListener('click', () => togglePlay());
  els.art.addEventListener('click', () => {
    videoHidden = !videoHidden;
    renderVideoStage(trackById(state.currentId));
  });
  els.collapse.addEventListener('click', () => {
    videoHidden = true;
    renderVideoStage(trackById(state.currentId));
  });
  els.fullscreen.addEventListener('click', toggleFullscreen);
  els.pip.addEventListener('click', togglePictureInPicture);
  if ('ResizeObserver' in window) {
    new ResizeObserver(([entry]) => {
      document.documentElement.style.setProperty('--player-height', `${Math.ceil(entry.target.offsetHeight)}px`);
    }).observe(els.player);
  }
  media.addEventListener('error', () => {
    if (!media.getAttribute('src') || !loadedId) return;
    const track = trackById(loadedId);
    toast(`Can't play "${track?.title || 'this track'}" on this device.`, { error: true, duration: 5000 });
    failedInRow += 1;
    if (failedInRow < state.tracks.length && state.tracks.length > 1) setTimeout(() => playNext({ auto: true }), 800);
    else failedInRow = 0;
  });

  if ('mediaSession' in navigator) {
    const handlers = {
      play: () => togglePlay(),
      pause: () => media.pause(),
      previoustrack: () => playPrevious(),
      nexttrack: () => playNext(),
      seekbackward: (details) => {
        media.currentTime = Math.max(0, media.currentTime - (details.seekOffset || 10));
      },
      seekforward: (details) => {
        media.currentTime = Math.min(media.duration || Infinity, media.currentTime + (details.seekOffset || 10));
      },
      seekto: (details) => {
        if (Number.isFinite(details.seekTime)) media.currentTime = details.seekTime;
      }
    };
    for (const [action, handler] of Object.entries(handlers)) {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch {
        // Action not supported by this browser.
      }
    }
  }

  addEventListener('pagehide', () => savePosition(true));
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') savePosition(true);
  });
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

bindEvents();
renderAll();
restore();
registerServiceWorker();
