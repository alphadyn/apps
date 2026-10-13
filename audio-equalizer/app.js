const analysisMedia = document.querySelector('#media');
const backgroundMedia = document.querySelector('#background-media');
const backgroundPlayback = document.querySelector('#background-playback');
const playbackModeNote = document.querySelector('#playback-mode-note');
const playbackMessage = document.querySelector('#playback-message');
// iPadOS can identify as a Mac; both iOS media paths need the native playback default.
backgroundPlayback.checked = /iPhone|iPad|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
let media = backgroundPlayback.checked ? backgroundMedia : analysisMedia;
const fileInput = document.querySelector('#file-input');
const loadButton = document.querySelector('#load-button');
const dropZone = document.querySelector('#drop-zone');
const playButton = document.querySelector('#play-button');
const playIcon = document.querySelector('#play-icon');
const playLabel = document.querySelector('#play-label');
const stopButton = document.querySelector('#stop-button');
const rewindButton = document.querySelector('#rewind-button');
const skipBackButton = document.querySelector('#skip-back-button');
const skipForwardButton = document.querySelector('#skip-forward-button');
const timeline = document.querySelector('#timeline');
const volume = document.querySelector('#volume');
const bufferBar = document.querySelector('#buffer-bar');
const spectrumCanvas = document.querySelector('#spectrum-canvas');
const waveformCanvas = document.querySelector('#waveform-canvas');
const peakReadout = document.querySelector('#peak-readout');
const rmsReadout = document.querySelector('#rms-readout');
const rateReadout = document.querySelector('#rate-readout');
const currentTimeLabel = document.querySelector('#current-time');
const durationLabel = document.querySelector('#duration');
const trackName = document.querySelector('#track-name');
const trackDetails = document.querySelector('#track-details');
const fileTypeLabel = document.querySelector('#file-type-label');
const playState = document.querySelector('#play-state');
const channelLabel = document.querySelector('#channel-label');

let audioContext;
let analyser;
let source;
let frequencyData;
let waveformData;
let animationFrame;
let objectUrl;
let hasMedia = false;
let pendingSeek = null;

const formatTime = (seconds) => {
  if (!Number.isFinite(seconds)) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const setCanvasSize = (canvas) => {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const bounds = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
  canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
  return ratio;
};

const drawIdle = () => {
  drawSpectrum(new Uint8Array(128), 1);
  drawWaveform(new Uint8Array(128).fill(128), 1);
};

const drawSpectrum = (data, ratio = window.devicePixelRatio || 1) => {
  const context = spectrumCanvas.getContext('2d');
  const width = spectrumCanvas.width;
  const height = spectrumCanvas.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#151d18';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = 'rgba(143, 155, 144, 0.11)';
  context.lineWidth = 1 * ratio;
  for (let line = 1; line < 5; line += 1) {
    const y = Math.round((height / 5) * line) + 0.5;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  const barCount = Math.min(76, Math.floor(width / (4 * ratio)));
  const barWidth = width / barCount;
  const dataStep = data.length / barCount;
  for (let index = 0; index < barCount; index += 1) {
    const value = data[Math.floor(index * dataStep)] / 255;
    const easedValue = value * value;
    const barHeight = Math.max(2 * ratio, easedValue * height * 0.86);
    const x = index * barWidth + barWidth * 0.18;
    const gradient = context.createLinearGradient(0, height - barHeight, 0, height);
    gradient.addColorStop(0, '#c8f56a');
    gradient.addColorStop(0.65, '#91b34c');
    gradient.addColorStop(1, '#526651');
    context.fillStyle = gradient;
    context.fillRect(x, height - barHeight, Math.max(1, barWidth * 0.64), barHeight);
  }
};

const drawWaveform = (data, ratio = window.devicePixelRatio || 1) => {
  const context = waveformCanvas.getContext('2d');
  const width = waveformCanvas.width;
  const height = waveformCanvas.height;
  context.clearRect(0, 0, width, height);
  context.fillStyle = '#151d18';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = 'rgba(143, 155, 144, 0.12)';
  context.lineWidth = 1 * ratio;
  context.beginPath();
  context.moveTo(0, height / 2 + 0.5);
  context.lineTo(width, height / 2 + 0.5);
  context.stroke();
  context.beginPath();
  for (let index = 0; index < data.length; index += 1) {
    const x = (index / (data.length - 1)) * width;
    const y = (data[index] / 255) * height;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.strokeStyle = '#ff9962';
  context.lineWidth = 1.5 * ratio;
  context.stroke();
};

const updateTimeline = () => {
  if (!Number.isFinite(media.duration) || media.duration === 0) return;
  const progress = (media.currentTime / media.duration) * 100;
  timeline.value = progress;
  timeline.style.setProperty('--progress', `${progress}%`);
  currentTimeLabel.textContent = formatTime(media.currentTime);
  let buffered = 0;
  if (media.buffered.length) buffered = (media.buffered.end(media.buffered.length - 1) / media.duration) * 100;
  bufferBar.style.setProperty('--buffer', `${Math.min(100, buffered)}%`);
  if (navigator.mediaSession?.setPositionState) {
    navigator.mediaSession.setPositionState({
      duration: media.duration,
      playbackRate: media.playbackRate,
      position: Math.min(media.duration, Math.max(0, media.currentTime)),
    });
  }
};

const updateReadouts = () => {
  if (backgroundPlayback.checked || document.hidden || media.paused || media.ended
    || !analyser || !frequencyData || !waveformData) return;
  analyser.getByteFrequencyData(frequencyData);
  analyser.getByteTimeDomainData(waveformData);
  drawSpectrum(frequencyData);
  drawWaveform(waveformData);
  const peak = Math.max(...frequencyData) / 255;
  let sum = 0;
  waveformData.forEach((value) => { const centered = (value - 128) / 128; sum += centered * centered; });
  const rms = Math.sqrt(sum / waveformData.length);
  peakReadout.textContent = `${peak ? (20 * Math.log10(peak)).toFixed(1) : '-Infinity'} dB`;
  rmsReadout.textContent = `${rms ? (20 * Math.log10(rms)).toFixed(1) : '-Infinity'} dB`;
  animationFrame = requestAnimationFrame(updateReadouts);
};

const ensureAudioGraph = () => {
  if (audioContext) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.78;
  source = audioContext.createMediaElementSource(analysisMedia);
  source.connect(analyser);
  analyser.connect(audioContext.destination);
  frequencyData = new Uint8Array(analyser.frequencyBinCount);
  waveformData = new Uint8Array(analyser.fftSize);
  rateReadout.textContent = `${(audioContext.sampleRate / 1000).toFixed(1)} kHz`;
};

const reportPlaybackError = (error) => {
  console.error('Audio playback failed:', error);
  playbackMessage.textContent = 'Playback could not start. Tap Play to retry, or choose another media file.';
  playState.textContent = 'Playback error';
  playState.classList.remove('is-playing');
  if (media.paused) {
    playIcon.textContent = '▶';
    playLabel.textContent = 'Play';
    playButton.setAttribute('aria-label', 'Play');
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused';
  }
};

const startPlayback = async () => {
  if (!hasMedia) return;
  const playingMedia = media;
  const playingSource = media.src;
  playbackMessage.textContent = '';
  try {
    if (!backgroundPlayback.checked) {
      ensureAudioGraph();
      if (audioContext.state !== 'running') await audioContext.resume();
    }
    if (playingMedia !== media || playingSource !== media.src) return;
    await playingMedia.play();
  } catch (error) {
    // Pausing, changing tracks, or switching modes can cancel an outstanding play request.
    if (error.name === 'AbortError'
      && (playingMedia.paused || playingMedia !== media || playingSource !== media.src)) return;
    reportPlaybackError(error);
  }
};

const togglePlayback = () => {
  if (media.paused) return startPlayback();
  media.pause();
};

const stopPlayback = () => {
  media.pause();
  pendingSeek = null;
  if (hasMedia) media.currentTime = 0;
  updateTimeline();
};

const seekTo = (seconds) => {
  if (!Number.isFinite(seconds) || !Number.isFinite(media.duration)) return;
  media.currentTime = Math.min(media.duration, Math.max(0, seconds));
  updateTimeline();
};

const updatePlaybackMode = () => {
  playbackModeNote.textContent = backgroundPlayback.checked
    ? 'Native audio for lock-screen listening. Live spectrum and level analysis are off.'
    : 'Live analysis enabled. iPhone playback may stop when the screen locks.';
  peakReadout.textContent = '-- dB';
  rmsReadout.textContent = '-- dB';
  rateReadout.textContent = !backgroundPlayback.checked && audioContext
    ? `${(audioContext.sampleRate / 1000).toFixed(1)} kHz` : '-- kHz';
  cancelAnimationFrame(animationFrame);
  drawIdle();
};

const switchPlaybackMode = () => {
  const previousMedia = media;
  const wasPlaying = !previousMedia.paused && !previousMedia.ended;
  const position = pendingSeek ?? previousMedia.currentTime;
  previousMedia.pause();
  previousMedia.removeAttribute('src');
  previousMedia.load();
  media = backgroundPlayback.checked ? backgroundMedia : analysisMedia;
  media.volume = Number(volume.value);
  updatePlaybackMode();
  if (!hasMedia) return;
  pendingSeek = position;
  media.src = objectUrl;
  media.load();
  if (wasPlaying) startPlayback();
};

const setMediaFile = (file) => {
  if (!file || !(file.type.startsWith('audio/') || file.type.startsWith('video/'))) {
    trackDetails.textContent = 'Please choose an audio or video file';
    return;
  }
  stopPlayback();
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  media.src = objectUrl;
  media.load();
  hasMedia = true;
  playButton.disabled = false;
  trackName.textContent = file.name.replace(/\.[^/.]+$/, '');
  trackDetails.textContent = `${file.type.split('/')[1]?.toUpperCase() || 'MEDIA'} / ${(file.size / 1024 / 1024).toFixed(2)} MB`;
  fileTypeLabel.textContent = file.type.startsWith('video/') ? 'Video audio' : 'Audio file';
  playState.textContent = 'Loaded';
  playState.classList.remove('is-playing');
  media.currentTime = 0;
  playbackMessage.textContent = '';
  currentTimeLabel.textContent = '00:00';
  durationLabel.textContent = '00:00';
  timeline.value = 0;
  timeline.style.setProperty('--progress', '0%');
  bufferBar.style.setProperty('--buffer', '0%');
  if (navigator.mediaSession) {
    navigator.mediaSession.playbackState = 'none';
    if (navigator.mediaSession.setPositionState) navigator.mediaSession.setPositionState();
    if ('MediaMetadata' in window) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: trackName.textContent, artist: 'Signal Room' });
    }
  }
};

loadButton.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (event) => setMediaFile(event.target.files[0]));
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') fileInput.click(); });
['dragenter', 'dragover'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add('is-dragging'); }));
['dragleave', 'drop'].forEach((eventName) => dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.remove('is-dragging'); }));
dropZone.addEventListener('drop', (event) => setMediaFile(event.dataTransfer.files[0]));
playButton.addEventListener('click', togglePlayback);
backgroundPlayback.addEventListener('change', switchPlaybackMode);
stopButton.addEventListener('click', stopPlayback);
rewindButton.addEventListener('click', () => seekTo(0));
skipBackButton.addEventListener('click', () => seekTo(media.currentTime - 10));
skipForwardButton.addEventListener('click', () => seekTo(media.currentTime + 10));
volume.addEventListener('input', () => { media.volume = volume.value; });
timeline.addEventListener('input', () => { if (Number.isFinite(media.duration)) media.currentTime = (timeline.value / 100) * media.duration; });
[analysisMedia, backgroundMedia].forEach((element) => {
  const onActiveMedia = (eventName, handler) => element.addEventListener(eventName, () => {
    if (element === media) handler();
  });
  onActiveMedia('loadedmetadata', () => {
    if (pendingSeek !== null) {
      seekTo(pendingSeek);
      pendingSeek = null;
    }
    durationLabel.textContent = formatTime(media.duration);
    channelLabel.textContent = media.videoWidth ? 'Video audio' : 'Stereo';
    updateTimeline();
  });
  onActiveMedia('timeupdate', updateTimeline);
  onActiveMedia('progress', updateTimeline);
  onActiveMedia('ratechange', updateTimeline);
  onActiveMedia('play', () => {
    playIcon.textContent = 'Ⅱ';
    playLabel.textContent = 'Pause';
    playButton.setAttribute('aria-label', 'Pause');
    playState.textContent = 'Playing';
    playState.classList.add('is-playing');
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'playing';
    cancelAnimationFrame(animationFrame);
    updateReadouts();
  });
  onActiveMedia('pause', () => {
    playIcon.textContent = '▶';
    playLabel.textContent = 'Play';
    playButton.setAttribute('aria-label', 'Play');
    cancelAnimationFrame(animationFrame);
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused';
    if (!media.ended) playState.textContent = 'Paused';
    playState.classList.remove('is-playing');
  });
  onActiveMedia('ended', () => {
    playState.textContent = 'Complete';
    playState.classList.remove('is-playing');
    cancelAnimationFrame(animationFrame);
    if (navigator.mediaSession) navigator.mediaSession.playbackState = 'paused';
  });
  onActiveMedia('error', () => reportPlaybackError(media.error));
});

if (navigator.mediaSession) {
  const actions = {
    play: startPlayback,
    pause: () => media.pause(),
    stop: stopPlayback,
    seekbackward: ({ seekOffset = 10 }) => seekTo(media.currentTime - seekOffset),
    seekforward: ({ seekOffset = 10 }) => seekTo(media.currentTime + seekOffset),
    seekto: ({ seekTime }) => seekTo(seekTime),
  };
  Object.entries(actions).forEach(([action, handler]) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler);
    } catch (error) {
      if (error.name !== 'NotSupportedError') throw error;
      console.warn(`Lock-screen action "${action}" is not supported by this browser.`);
    }
  });
}

document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(animationFrame);
  if (!document.hidden) {
    updateTimeline();
    updateReadouts();
  }
});
window.addEventListener('resize', () => { setCanvasSize(spectrumCanvas); setCanvasSize(waveformCanvas); drawIdle(); });

media.volume = volume.value;
setCanvasSize(spectrumCanvas);
setCanvasSize(waveformCanvas);
updatePlaybackMode();
