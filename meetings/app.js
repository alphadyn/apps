// Meetings — a browser-based video conferencing app.
// Uses PeerJS (WebRTC) for media + data channels. The first participant to
// claim a room's well-known "host" peer id becomes the room's directory:
// it introduces new joiners to everyone already in the room, after which
// every participant holds a direct WebRTC connection to every other
// participant (mesh topology) for audio/video, chat, and file sharing.

(() => {
  const HOST_PREFIX = 'meetup-v2-';
  const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB

  // ---- DOM references -------------------------------------------------
  const joinScreen = document.getElementById('joinScreen');
  const meetingScreen = document.getElementById('meetingScreen');
  const joinForm = document.getElementById('joinForm');
  const nameInput = document.getElementById('nameInput');
  const roomInput = document.getElementById('roomInput');
  const secretInput = document.getElementById('secretInput');
  const newMeetingBtn = document.getElementById('newMeetingBtn');
  const joinStatus = document.getElementById('joinStatus');
  const previewVideo = document.getElementById('previewVideo');
  const previewStatus = document.getElementById('previewStatus');
  const previewMicBtn = document.getElementById('previewMicBtn');
  const previewCamBtn = document.getElementById('previewCamBtn');
  const retryMediaBtn = document.getElementById('retryMediaBtn');

  const roomLabel = document.getElementById('roomLabel');
  const copyLinkBtn = document.getElementById('copyLinkBtn');
  const connectionStatus = document.getElementById('connectionStatus');
  const meetingMediaStatus = document.getElementById('meetingMediaStatus');
  const videoGrid = document.getElementById('videoGrid');
  const sidePanel = document.getElementById('sidePanel');
  const closePanelBtn = document.getElementById('closePanelBtn');
  const sideTabs = document.querySelectorAll('.side-tab');
  const sidePanels = document.querySelectorAll('.side-tab-panel');

  const chatLog = document.getElementById('chatLog');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const peopleList = document.getElementById('peopleList');
  const fileInput = document.getElementById('fileInput');
  const fileLog = document.getElementById('fileLog');

  const micBtn = document.getElementById('micBtn');
  const camBtn = document.getElementById('camBtn');
  const chatToggleBtn = document.getElementById('chatToggleBtn');
  const peopleToggleBtn = document.getElementById('peopleToggleBtn');
  const filesToggleBtn = document.getElementById('filesToggleBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const peopleCount = document.getElementById('peopleCount');
  const leaveBtn = document.getElementById('leaveBtn');

  // ---- State ------------------------------------------------------------
  let localStream = null;
  let mediaPromise = null;
  let peer = null;
  let myId = null;
  let myName = '';
  let isHost = false;
  let hostPeerId = '';
  let roomKey = null;
  let mediaKey = null;
  let meetingSecret = '';
  let mediaWorker = null;
  let leaving = false;
  const transformedEndpoints = new WeakSet();
  const connectionStates = new WeakMap();
  const pendingCalls = new Map();
  /** peerId -> { name, conn, call, videoEl } */
  const participants = new Map();
  /** host-only: peerId -> name, tracks everyone known in the room */
  const roster = new Map();

  // ---- Utility helpers ----------------------------------------------------
  function slugifyRoom(raw) {
    return raw.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'lobby';
  }

  function randomRoomCode() {
    const words = ['orbit', 'cedar', 'maple', 'ember', 'quartz', 'harbor', 'summit', 'lumen'];
    const w = words[Math.floor(Math.random() * words.length)];
    return `${w}-${Math.floor(1000 + Math.random() * 9000)}`;
  }

  function setStatus(el, text) {
    el.textContent = text;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // ---- End-to-end encryption ---------------------------------------------
  // Content keys are derived from a random invite secret, never the public room code.
  // PeerJS still sees connection metadata, but all content is encrypted before sending.
  if (!window.crypto?.subtle) {
    setStatus(joinStatus, 'Encrypted meetings require Web Crypto over HTTPS or localhost. Use a supported browser.');
    joinForm.querySelector('button[type="submit"]').disabled = true;
    newMeetingBtn.disabled = true;
    return;
  }

  async function deriveHostPeerId(room) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('meetings-app-host-id-v2:' + room));
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    return HOST_PREFIX + hex.slice(0, 24);
  }

  function encryptionFailure(conn, error) {
    const state = connectionStates.get(conn);
    if (state?.failed) return;
    if (state) {
      state.failed = true;
      clearTimeout(state.timer);
    }
    console.error('Encrypted connection failed:', error);
    setStatus(connectionStatus, 'Encryption failed. Check the invite secret and reconnect; no plaintext fallback is allowed.');
    conn.close();
    if (participants.get(conn.peer)?.conn === conn) removeParticipant(conn.peer);
  }

  function envelopeContext(conn, envelope, from, to) {
    return JSON.stringify([2, conn.connectionId, from, to, envelope.type, envelope.id || '', envelope.seq]);
  }

  function sendEncrypted(conn, type, plaintext, id = '') {
    const state = connectionStates.get(conn);
    if (!state) throw new Error('Encrypted connection has not been initialized.');
    const key = roomKey;
    const sender = myId;
    state.sending = state.sending.then(async () => {
      if (state.failed) throw new Error('Encrypted connection is closed.');
      const envelope = { v: 2, type, id, seq: state.sendSequence++ };
      if (!Number.isSafeInteger(envelope.seq)) throw new Error('Message counter exhausted.');
      const sealed = await MeetingsCrypto.seal(key, plaintext, envelopeContext(conn, envelope, sender, conn.peer));
      conn.send({ ...envelope, iv: Array.from(sealed.iv), ct: sealed.ciphertext });
      return true;
    }).catch((error) => {
      if (!state.failed) encryptionFailure(conn, error);
      state.failed = true;
      return false;
    });
    return state.sending;
  }

  function sendSecure(conn, message) {
    return sendEncrypted(conn, 'enc', new TextEncoder().encode(JSON.stringify(message)));
  }

  function sendSecureBinary(conn, fileId, buffer) {
    return sendEncrypted(conn, 'enc-bin', buffer, fileId);
  }

  async function decryptEnvelope(conn, envelope) {
    const state = connectionStates.get(conn);
    if (!envelope || envelope.v !== 2 || !['enc', 'enc-bin'].includes(envelope.type) ||
        !Array.isArray(envelope.iv) || envelope.iv.length !== 12 ||
        !envelope.iv.every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255) ||
        typeof envelope.id !== 'string' || envelope.seq !== state.receiveSequence ||
        !Number.isSafeInteger(envelope.seq)) {
      throw new Error('Invalid, replayed, or incompatible encrypted message.');
    }
    const pt = await MeetingsCrypto.open(roomKey, new Uint8Array(envelope.iv), envelope.ct,
      envelopeContext(conn, envelope, conn.peer, myId));
    state.receiveSequence++;
    return envelope.type === 'enc'
      ? JSON.parse(new TextDecoder().decode(pt))
      : { type: 'file-chunk', id: envelope.id, buffer: pt };
  }

  // ---- Local media preflight ---------------------------------------------
  function mediaErrorMessage(kind, error) {
    const device = kind === 'audio' ? 'Microphone' : kind === 'video' ? 'Camera' : 'Camera and microphone';
    switch (error.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return `${device} access is blocked. Allow access in your browser's site permissions and your system's privacy settings, then retry.`;
      case 'NotFoundError':
        return `${kind === 'both' ? 'No camera or microphone was found' : `${device} was not found`}. Connect a device, then retry.`;
      case 'NotReadableError':
      case 'AbortError':
        return `${device} could not start. Close other apps using it, check your device, then retry.`;
      default:
        return `${device} could not start: ${error.message || error.name || 'Unknown error'}.`;
    }
  }

  async function acquireLocalStream() {
    if (!localStream) localStream = new MediaStream();
    const errors = new Map();
    const missingAudio = !localStream.getAudioTracks().some((track) => track.readyState === 'live');
    const missingVideo = !localStream.getVideoTracks().some((track) => track.readyState === 'live');
    if (navigator.mediaDevices?.getUserMedia && (missingAudio || missingVideo)) {
      let captured = null;
      try {
        captured = await navigator.mediaDevices.getUserMedia({ video: missingVideo, audio: missingAudio });
      } catch {
        // A missing or blocked device must not prevent the other from working.
        for (const kind of ['audio', 'video']) {
          if ((kind === 'audio' && !missingAudio) || (kind === 'video' && !missingVideo)) continue;
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: kind === 'video', audio: kind === 'audio' });
            stream.getTracks().forEach((track) => localStream.addTrack(track));
          } catch (error) {
            console.warn(`Unable to acquire ${kind}:`, error);
            errors.set(kind, error);
          }
        }
      }
      if (captured) captured.getTracks().forEach((track) => localStream.addTrack(track));
    }
    localStream.getTracks().filter((track) => track.readyState === 'ended').forEach((track) => localStream.removeTrack(track));
    previewVideo.srcObject = localStream;
    const hasAudio = localStream.getAudioTracks().length > 0;
    const hasVideo = localStream.getVideoTracks().length > 0;
    let message = !navigator.mediaDevices?.getUserMedia
      ? 'Camera and microphone require HTTPS or localhost in a supported browser. You can still use chat/files.'
      : hasAudio && hasVideo ? ''
        : hasAudio ? 'Camera unavailable — joining with audio only.'
          : hasVideo ? 'Microphone unavailable — joining with video only.'
            : 'Microphone and camera are unavailable. Check browser permissions or devices; you can still use chat/files.';
    if (errors.size) {
      const audioError = errors.get('audio');
      const videoError = errors.get('video');
      message = audioError && videoError && audioError.name === videoError.name && audioError.message === videoError.message
        ? mediaErrorMessage('both', audioError)
        : [...errors].map(([kind, error]) => mediaErrorMessage(kind, error)).join(' ');
      if (window.location.protocol === 'file:') {
        message += ' If access stays blocked in this preview, open the app over HTTPS or localhost in a browser with camera and microphone access.';
      }
      message += ' You can still join with available devices or use chat and files.';
    }
    setStatus(previewStatus, message);
    setStatus(meetingMediaStatus, message);
    meetingMediaStatus.classList.toggle('hidden', !message);
    retryMediaBtn.classList.toggle('hidden', hasAudio && hasVideo);
    for (const [kind, buttons] of [['audio', [previewMicBtn, micBtn]], ['video', [previewCamBtn, camBtn]]]) {
      const track = (kind === 'audio' ? localStream.getAudioTracks() : localStream.getVideoTracks())[0];
      buttons.forEach((button) => updateMediaButton(button, kind, track));
    }
    return localStream;
  }

  function requestLocalMedia() {
    if (!mediaPromise) {
      retryMediaBtn.disabled = true;
      retryMediaBtn.textContent = 'Checking devices…';
      setStatus(previewStatus, 'Requesting camera and microphone access. Respond to your browser’s permission prompt if shown.');
      previewVideo.setAttribute('aria-busy', 'true');
      mediaPromise = acquireLocalStream().catch((error) => {
        console.error('Unable to initialize local media:', error);
        const message = `Unable to initialize camera and microphone: ${error.message || error.name}. Retry or join with chat and files.`;
        setStatus(previewStatus, message);
        setStatus(meetingMediaStatus, message);
        meetingMediaStatus.classList.remove('hidden');
        retryMediaBtn.classList.remove('hidden');
        throw error;
      }).finally(() => {
        mediaPromise = null;
        retryMediaBtn.disabled = false;
        retryMediaBtn.textContent = 'Retry camera / microphone';
        previewVideo.setAttribute('aria-busy', 'false');
      });
    }
    return mediaPromise;
  }

  function toggleTrack(kind, btn) {
    if (!localStream) return;
    const tracks = kind === 'audio' ? localStream.getAudioTracks() : localStream.getVideoTracks();
    if (!tracks.length) return;
    const enabled = !tracks[0].enabled;
    tracks.forEach((t) => { t.enabled = enabled; });
    const otherBtn = kind === 'audio' ? (btn === micBtn ? previewMicBtn : micBtn) : (btn === camBtn ? previewCamBtn : camBtn);
    [btn, otherBtn].forEach((button) => updateMediaButton(button, kind, tracks[0]));
    if (kind === 'video') updateTileVideoState(document.getElementById('tile-local'), localStream);
  }

  function updateMediaButton(button, kind, track) {
    const enabled = !!track?.enabled;
    button.disabled = !track;
    button.classList.toggle('is-on', enabled);
    button.setAttribute('aria-pressed', String(enabled));
    const device = kind === 'audio' ? 'Microphone' : 'Camera';
    button.title = `${device} ${!track ? 'unavailable' : enabled ? 'on' : 'off'}`;
    if (button === micBtn || button === camBtn) {
      button.querySelector('.control-label').textContent = !track
        ? kind === 'audio' ? 'No mic' : 'No camera'
        : kind === 'audio' ? enabled ? 'Mute' : 'Unmute' : enabled ? 'Stop video' : 'Start video';
    }
  }

  previewMicBtn.addEventListener('click', () => toggleTrack('audio', previewMicBtn));
  previewCamBtn.addEventListener('click', () => toggleTrack('video', previewCamBtn));

  function requestMediaWithFeedback() {
    // requestLocalMedia displays initialization failures before rejecting.
    requestLocalMedia().catch((error) => setStatus(joinStatus, error.message || 'Device initialization failed.'));
  }

  retryMediaBtn.addEventListener('click', requestMediaWithFeedback);
  requestMediaWithFeedback();

  // Pre-fill room code from URL (?room=xyz) for invite links.
  const params = new URLSearchParams(window.location.search);
  if (params.get('room')) roomInput.value = params.get('room');
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  if (fragment.has('key')) {
    secretInput.value = fragment.get('key');
    // Remove the secret from history before any later navigation or link copying.
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  newMeetingBtn.addEventListener('click', () => {
    roomInput.value = randomRoomCode();
    secretInput.value = MeetingsCrypto.generateSecret();
    setStatus(joinStatus, 'Private meeting created. Join, then copy the complete invite link to share access.');
  });

  // ---- Joining a meeting ---------------------------------------------------
  joinForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = nameInput.value.trim();
    const room = slugifyRoom(roomInput.value);
    if (!name || !room) return;
    myName = name;
    setStatus(joinStatus, 'Connecting…');
    joinForm.querySelector('button[type="submit"]').disabled = true;
    startMeeting(room).catch((err) => {
      console.error(err);
      if (peer) peer.destroy();
      if (mediaWorker) mediaWorker.terminate();
      mediaWorker = null;
      roomKey = null;
      mediaKey = null;
      setStatus(joinStatus, err.message || 'Could not connect. Please try again.');
      joinForm.querySelector('button[type="submit"]').disabled = false;
    });
  });

  async function startMeeting(room) {
    if (typeof RTCRtpScriptTransform !== 'function' || typeof Worker !== 'function') {
      throw new Error('This browser does not support end-to-end media encryption. Use a current browser with RTCRtpScriptTransform support.');
    }
    if (window.location.protocol === 'file:') {
      throw new Error('Encrypted media requires a worker served over HTTPS or localhost. Open the deployed app or serve it locally.');
    }
    meetingSecret = secretInput.value.trim();
    const keys = await MeetingsCrypto.deriveKeys(room, meetingSecret);
    roomKey = keys.dataKey;
    mediaKey = keys.mediaKey;
    await startMediaWorker();
    // Permission prompts can still be pending when the user clicks Join.
    // PeerJS must never call/answer with a null stream.
    await (mediaPromise || Promise.resolve(localStream));
    hostPeerId = await deriveHostPeerId(room);
    await tryBecomeHost(room);
  }

  function tryBecomeHost(room) {
    return new Promise((resolve, reject) => {
      const candidate = new Peer(hostPeerId, peerOptions());
      let settled = false;

      candidate.on('open', (id) => {
        settled = true;
        isHost = true;
        peer = candidate;
        myId = id;
        roster.set(myId, myName);
        wireCommonPeerEvents();
        enterMeetingUi(room);
        resolve();
      });

      candidate.on('error', (err) => {
        if (settled) return;
        if (err.type === 'unavailable-id') {
          candidate.destroy();
          joinAsGuest(room).then(resolve).catch(reject);
        } else {
          candidate.destroy();
          reject(err);
        }
      });
    });
  }

  function joinAsGuest(room) {
    return new Promise((resolve, reject) => {
      const candidate = new Peer(peerOptions());
      candidate.on('open', (id) => {
        isHost = false;
        peer = candidate;
        myId = id;
        wireCommonPeerEvents();
        enterMeetingUi(room);
        connectToPeer(hostPeerId);
        resolve();
      });
      candidate.on('error', (err) => {
        candidate.destroy();
        reject(err);
      });
    });
  }

  function wireCommonPeerEvents() {
    peer.on('connection', (conn) => setupDataConnection(conn));
    peer.on('call', (call) => {
      if (participants.get(call.peer)?.authenticated) {
        answerEncryptedCall(call);
      } else {
        if (pendingCalls.has(call.peer)) {
          call.close();
          return;
        }
        const timer = setTimeout(() => {
          pendingCalls.delete(call.peer);
          call.close();
          setStatus(connectionStatus, 'An unauthenticated media call was rejected.');
        }, 10000);
        pendingCalls.set(call.peer, { call, timer });
      }
    });
    peer.on('disconnected', () => setStatus(connectionStatus, 'Reconnecting…'));
    peer.on('error', (err) => console.warn('Peer error:', err));
  }

  function enterMeetingUi(room) {
    joinScreen.classList.add('hidden');
    meetingScreen.classList.remove('hidden');
    roomLabel.textContent = room;
    setStatus(connectionStatus, isHost ? 'You started this meeting' : 'Connected');
    addLocalVideoTile();
    renderPeopleList();
  }

  // ---- Connecting to another peer (data channel + media call) --------------
  function connectToPeer(id) {
    if (id === myId) return;
    const existing = participants.get(id);
    if (existing && existing.conn) return;
    const conn = peer.connect(id, { reliable: true });
    setupDataConnection(conn);
  }

  function setupDataConnection(conn) {
    const existing = participants.get(conn.peer) || {};
    if (existing.conn && existing.conn !== conn) {
      conn.close();
      return;
    }
    participants.set(conn.peer, { ...existing, conn });
    const state = {
      sending: Promise.resolve(), receiving: Promise.resolve(),
      sendSequence: 0, receiveSequence: 0, failed: false,
      challenge: MeetingsCrypto.generateSecret(), receivedHello: false
    };
    connectionStates.set(conn, state);
    const timer = setTimeout(() => {
      if (!participants.get(conn.peer)?.authenticated) encryptionFailure(conn, new Error('Peer authentication timed out.'));
    }, 10000);
    state.timer = timer;

    conn.on('open', () => {
      sendSecure(conn, { type: 'hello', challenge: state.challenge });
    });

    conn.on('data', (envelope) => {
      state.receiving = state.receiving.then(async () => {
        if (state.failed) return;
        const msg = await decryptEnvelope(conn, envelope);
        if (!participants.get(conn.peer)?.authenticated && !['hello', 'proof'].includes(msg.type)) throw new Error('Peer must authenticate first.');
        handleMessage(conn.peer, msg);
      }).catch((error) => {
        if (!state.failed) encryptionFailure(conn, error);
        state.failed = true;
      });
    });

    conn.on('error', (error) => encryptionFailure(conn, error));
    conn.on('close', () => {
      clearTimeout(timer);
      state.failed = true;
      removeParticipant(conn.peer);
    });
  }

  function peerOptions() {
    return {
      debug: 1,
      config: {
        encodedInsertableStreams: true,
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      }
    };
  }

  function startMediaWorker() {
    if (mediaWorker) mediaWorker.terminate();
    return new Promise((resolve, reject) => {
      const worker = new Worker('media-worker.js');
      mediaWorker = worker;
      const timer = setTimeout(() => {
        worker.terminate();
        reject(new Error('Media encryption worker failed to start. No unencrypted connection was made.'));
      }, 10000);
      worker.onmessage = ({ data }) => {
        if (data.type === 'ready') {
          clearTimeout(timer);
          resolve();
        } else if (data.type === 'encryption-error') {
          console.error('Media encryption failed:', data.message);
          leaveMeeting();
          setStatus(joinStatus, 'Media encryption failed. The meeting was closed; check your invite and reconnect.');
        }
      };
      worker.onerror = (error) => {
        clearTimeout(timer);
        console.error('Media encryption worker failed:', error);
        worker.terminate();
        reject(new Error('Media encryption is unavailable. No unencrypted fallback is allowed.'));
        if (!meetingScreen.classList.contains('hidden')) {
          leaveMeeting();
          setStatus(joinStatus, 'Media encryption stopped. The meeting was closed for your protection.');
        }
      };
    });
  }

  function installMediaTransforms(call) {
    const pc = call.peerConnection;
    for (const [operation, endpoints] of [['encrypt', pc.getSenders()], ['decrypt', pc.getReceivers()]]) {
      for (const endpoint of endpoints) {
        if (!endpoint.track || transformedEndpoints.has(endpoint)) continue;
        const sender = operation === 'encrypt' ? myId : call.peer;
        const receiver = operation === 'encrypt' ? call.peer : myId;
        const context = [call.connectionId, sender, receiver, endpoint.track.kind];
        endpoint.transform = new RTCRtpScriptTransform(mediaWorker, { operation, mediaKey, context });
        transformedEndpoints.add(endpoint);
      }
    }
  }

  function mediaTransformOptions(getCall) {
    return {
      // Include receive slots even when the caller has no local devices.
      constraints: { offerToReceiveAudio: true, offerToReceiveVideo: true },
      sdpTransform(sdp) {
        try {
          installMediaTransforms(getCall());
          return sdp;
        } catch (error) {
          console.error('Unable to install media encryption:', error);
          getCall().close();
          setStatus(connectionStatus, 'Unable to encrypt this media connection. Call rejected.');
          throw error;
        }
      }
    };
  }

  function answerEncryptedCall(call) {
    if (participants.get(call.peer)?.call) {
      call.close();
      return;
    }
    call.answer(localStream, mediaTransformOptions(() => call));
    wireCallEvents(call);
  }

  function startEncryptedCall(id) {
    const entry = participants.get(id);
    if (entry.call || !entry.authenticated) return;
    let call;
    call = peer.call(id, localStream, mediaTransformOptions(() => call));
    wireCallEvents(call);
  }

  function wireCallEvents(call) {
    const existing = participants.get(call.peer) || {};
    participants.set(call.peer, { ...existing, call });
    call.peerConnection.addEventListener('track', () => {
      try {
        installMediaTransforms(call);
      } catch (error) {
        console.error('Unable to decrypt incoming media:', error);
        call.close();
        setStatus(connectionStatus, 'Incoming media could not be decrypted. Call rejected.');
      }
    });
    call.on('error', (error) => {
      console.error('Encrypted media call failed:', error);
      call.close();
      setStatus(connectionStatus, 'Encrypted media connection failed. Rejoin to retry.');
    });
    call.on('stream', (remoteStream) => {
      addRemoteVideoTile(call.peer, remoteStream);
    });
    call.on('close', () => removeParticipant(call.peer));
  }

  // ---- Message handling ------------------------------------------------
  function handleMessage(fromId, msg) {
    switch (msg.type) {
      case 'hello': {
        const entry = participants.get(fromId);
        const state = connectionStates.get(entry.conn);
        if (state.receivedHello) throw new Error('Repeated authentication greeting.');
        MeetingsCrypto.decodeSecret(msg.challenge);
        state.receivedHello = true;
        sendSecure(entry.conn, { type: 'proof', challenge: msg.challenge, name: myName, id: myId });
        break;
      }
      case 'proof': {
        if (msg.id !== fromId || typeof msg.name !== 'string' || msg.name.length > 40) throw new Error('Invalid authenticated peer identity.');
        const entry = participants.get(fromId) || {};
        const state = connectionStates.get(entry.conn);
        if (!state?.receivedHello || msg.challenge !== state.challenge || entry.authenticated) {
          throw new Error('Peer authentication challenge failed.');
        }
        entry.name = msg.name;
        entry.authenticated = true;
        participants.set(fromId, entry);
        clearTimeout(connectionStates.get(entry.conn)?.timer);
        const pending = pendingCalls.get(fromId);
        if (pending) {
          clearTimeout(pending.timer);
          pendingCalls.delete(fromId);
          answerEncryptedCall(pending.call);
        } else if (myId < fromId) {
          startEncryptedCall(fromId);
        }
        renderPeopleList();
        updateTileName(fromId, msg.name);

        if (isHost && !leaving) {
          roster.set(fromId, msg.name);
          const conn = entry.conn;
          if (conn) {
            const peers = [...roster.entries()]
              .filter(([id]) => id !== fromId)
              .map(([id, name]) => ({ id, name }));
            sendSecure(conn, { type: 'roster', peers });
          }
          broadcast({ type: 'peer-joined', id: fromId, name: msg.name }, [fromId]);
        }
        break;
      }
      case 'roster': {
        msg.peers.forEach(({ id, name }) => {
          if (id === myId) return;
          const entry = participants.get(id) || {};
          entry.name = entry.name || name;
          participants.set(id, entry);
          if (id !== hostPeerId) connectToPeer(id);
        });
        renderPeopleList();
        break;
      }
      case 'peer-joined': {
        if (msg.id === myId) break;
        const entry = participants.get(msg.id) || {};
        entry.name = entry.name || msg.name;
        participants.set(msg.id, entry);
        renderPeopleList();
        break;
      }
      case 'peer-left': {
        removeParticipant(msg.id);
        break;
      }
      case 'chat': {
        appendChatMessage(msg.name, msg.text, msg.time, false);
        break;
      }
      case 'file-meta': {
        incomingFiles.set(msg.id, msg);
        break;
      }
      case 'file-chunk': {
        handleFileChunk(msg);
        break;
      }
      default:
        break;
    }
  }

  function broadcast(message, excludeIds = []) {
    participants.forEach(({ conn }, id) => {
      if (conn && conn.open && !excludeIds.includes(id)) sendSecure(conn, message);
    });
  }

  function removeParticipant(id) {
    const entry = participants.get(id);
    if (!entry) return;
    participants.delete(id);
    const pending = pendingCalls.get(id);
    if (pending) {
      clearTimeout(pending.timer);
      pendingCalls.delete(id);
      pending.call.close();
    }
    if (entry.call) entry.call.close();
    if (entry.conn) entry.conn.close();
    if (isHost && !leaving) {
      roster.delete(id);
      broadcast({ type: 'peer-left', id });
    }
    const tile = document.getElementById(`tile-${id}`);
    if (tile) tile.remove();
    renderPeopleList();
  }

  // ---- Video grid rendering -----------------------------------------------
  function addLocalVideoTile() {
    const tile = buildTile('local', myName + ' (You)', true);
    const video = tile.querySelector('video');
    video.srcObject = localStream;
    video.muted = true;
    updateTileVideoState(tile, localStream);
    videoGrid.appendChild(tile);
  }

  function addRemoteVideoTile(id, stream) {
    let tile = document.getElementById(`tile-${id}`);
    if (!tile) {
      const name = participants.get(id)?.name || 'Participant';
      tile = buildTile(id, name, false);
      videoGrid.appendChild(tile);
    }
    tile.querySelector('video').srcObject = stream;
    updateTileVideoState(tile, stream);
  }

  function updateTileVideoState(tile, stream) {
    if (!tile) return;
    tile.classList.toggle('has-video', stream.getVideoTracks().some((track) => track.readyState === 'live' && track.enabled));
  }

  function updateTileName(id, name) {
    const tile = document.getElementById(`tile-${id}`);
    if (tile) tile.querySelector('.tile-name').textContent = name;
  }

  function buildTile(id, name, isLocal) {
    const tile = document.createElement('div');
    tile.className = 'video-tile';
    tile.id = `tile-${id}`;
    tile.innerHTML = `
      <video autoplay playsinline ${isLocal ? 'muted' : ''}></video>
      <div class="tile-avatar">${escapeHtml(initials(name))}</div>
      <span class="tile-name">${escapeHtml(name)}</span>
    `;
    return tile;
  }

  // ---- People panel ---------------------------------------------------
  function renderPeopleList() {
    const all = [{ id: myId, name: myName + ' (You)' }, ...[...participants.entries()].map(([id, p]) => ({ id, name: p.name || 'Joining…' }))];
    peopleList.innerHTML = all.map((p) => `<li><span class="avatar">${escapeHtml(initials(p.name))}</span>${escapeHtml(p.name)}</li>`).join('');
    peopleCount.textContent = String(all.length);
  }

  // ---- Chat -------------------------------------------------------------
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    const time = new Date().toISOString();
    broadcast({ type: 'chat', name: myName, text, time });
    appendChatMessage(myName, text, time, true);
    chatInput.value = '';
  });

  function appendChatMessage(name, text, time, isMine) {
    const li = document.createElement('li');
    li.className = 'chat-message' + (isMine ? ' is-mine' : '');
    const stamp = new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    li.innerHTML = `<span class="chat-meta">${escapeHtml(name)} · ${stamp}</span><span class="chat-text">${escapeHtml(text)}</span>`;
    chatLog.appendChild(li);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  // ---- File sharing --------------------------------------------------------
  const incomingFiles = new Map(); // fileId -> { name, mime, size, chunks: [] }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    fileInput.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      logFileEvent(`"${file.name}" is larger than 25 MB and wasn't sent.`);
      return;
    }
    sendFile(file);
  });

  function sendFile(file) {
    const reader = new FileReader();
    reader.onload = async () => {
      const fileId = `${myId}-${Date.now()}`;
      const buffer = reader.result;
      const meta = { type: 'file-meta', id: fileId, from: myName, name: file.name, mime: file.type, size: file.size };
      const recipients = [...participants.values()].filter(({ conn, authenticated }) => authenticated && conn?.open);
      if (!recipients.length) {
        logFileEvent('No authenticated participants are connected. The file was not sent.');
        return;
      }
      const results = await Promise.all(recipients.map(async ({ conn }) =>
        await sendSecure(conn, meta) && await sendSecureBinary(conn, fileId, buffer)));
      if (!results.every(Boolean)) {
        logFileEvent(`"${file.name}" could not be encrypted and sent to every participant.`);
        return;
      }
      logFileEvent(`You shared "${file.name}" (${formatBytes(file.size)}).`);
    };
    reader.onerror = () => logFileEvent(`"${file.name}" could not be read and was not sent.`);
    reader.readAsArrayBuffer(file);
  }

  function handleFileChunk(msg) {
    const meta = incomingFiles.get(msg.id);
    if (!meta) return;
    incomingFiles.delete(msg.id);
    const blob = new Blob([msg.buffer], { type: meta.mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    logFileEvent(`${meta.from} shared "${meta.name}" (${formatBytes(meta.size)}).`, url, meta.name);
  }

  function logFileEvent(text, downloadUrl, downloadName) {
    const li = document.createElement('li');
    li.className = 'file-entry';
    const label = document.createElement('span');
    label.textContent = text;
    li.appendChild(label);
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = downloadName;
      link.className = 'link-btn';
      link.textContent = 'Download';
      li.appendChild(link);
    }
    fileLog.appendChild(li);
    fileLog.scrollTop = fileLog.scrollHeight;
  }

  // ---- Controls -----------------------------------------------------------
  micBtn.addEventListener('click', () => toggleTrack('audio', micBtn));
  camBtn.addEventListener('click', () => toggleTrack('video', camBtn));

  const panelButtons = new Map([['chat', chatToggleBtn], ['people', peopleToggleBtn], ['files', filesToggleBtn]]);
  let activePanel = null;
  function setSidePanel(tabName) {
    activePanel = tabName;
    sidePanel.classList.toggle('hidden', !tabName);
    sideTabs.forEach((tab) => {
      const selected = tab.dataset.tab === (tabName || 'chat');
      tab.classList.toggle('is-active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    sidePanels.forEach((panel) => panel.classList.toggle('hidden', panel.dataset.panel !== (tabName || 'chat')));
    panelButtons.forEach((button, name) => {
      button.classList.toggle('is-active', name === tabName);
      button.setAttribute('aria-expanded', String(name === tabName));
    });
  }

  function closeSidePanel() {
    const trigger = panelButtons.get(activePanel);
    const focusWasInside = sidePanel.contains(document.activeElement);
    setSidePanel(null);
    if (focusWasInside) trigger?.focus();
  }

  sideTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setSidePanel(tab.dataset.tab));
    tab.addEventListener('keydown', (event) => {
      const last = sideTabs.length - 1;
      const next = event.key === 'ArrowRight' ? (index + 1) % sideTabs.length
        : event.key === 'ArrowLeft' ? (index + last) % sideTabs.length
          : event.key === 'Home' ? 0 : event.key === 'End' ? last : null;
      if (next === null) return;
      event.preventDefault();
      setSidePanel(sideTabs[next].dataset.tab);
      sideTabs[next].focus();
    });
  });
  panelButtons.forEach((button, name) => {
    button.addEventListener('click', () => setSidePanel(activePanel === name ? null : name));
  });
  closePanelBtn.addEventListener('click', closeSidePanel);
  sidePanel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSidePanel();
    }
  });

  function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function updateFullscreenButton() {
    const isFullscreen = getFullscreenElement() === meetingScreen;
    const label = isFullscreen ? 'Exit fullscreen' : 'Fullscreen';
    fullscreenBtn.setAttribute('aria-label', isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen');
    fullscreenBtn.setAttribute('aria-pressed', String(isFullscreen));
    fullscreenBtn.title = isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen';
    fullscreenBtn.querySelector('.control-label').textContent = label;
  }

  async function toggleFullscreen() {
    try {
      if (getFullscreenElement()) {
        const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
        if (exitFullscreen) await exitFullscreen.call(document);
        return;
      }
      const requestFullscreen = meetingScreen.requestFullscreen || meetingScreen.webkitRequestFullscreen;
      if (!requestFullscreen) throw new Error('Fullscreen is not supported by this browser.');
      await requestFullscreen.call(meetingScreen);
    } catch (err) {
      console.warn('Unable to toggle fullscreen:', err);
      setStatus(connectionStatus, 'Fullscreen is unavailable in this browser.');
      setTimeout(() => setStatus(connectionStatus, isHost ? 'You started this meeting' : 'Connected'), 2500);
    }
  }

  const canFullscreen = Boolean(meetingScreen.requestFullscreen || meetingScreen.webkitRequestFullscreen);
  fullscreenBtn.disabled = !canFullscreen;
  if (!canFullscreen) fullscreenBtn.title = 'Fullscreen is not supported by this browser';
  fullscreenBtn.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreenButton);
  document.addEventListener('webkitfullscreenchange', updateFullscreenButton);

  copyLinkBtn.addEventListener('click', async () => {
    const invite = new URL(window.location.href);
    invite.search = new URLSearchParams({ room: roomLabel.textContent }).toString();
    invite.hash = new URLSearchParams({ key: meetingSecret }).toString();
    const url = invite.href;
    try {
      await navigator.clipboard.writeText(url);
      setStatus(connectionStatus, 'Invite link copied!');
      setTimeout(() => setStatus(connectionStatus, isHost ? 'You started this meeting' : 'Connected'), 2000);
    } catch {
      window.prompt('Copy this invite link:', url);
    }
  });

  leaveBtn.addEventListener('click', leaveMeeting);
  window.addEventListener('beforeunload', () => {
    if (peer) peer.destroy();
  });

  function leaveMeeting() {
    leaving = true;
    const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen;
    if (getFullscreenElement() === meetingScreen && exitFullscreen) exitFullscreen.call(document);
    participants.forEach(({ conn, call }) => {
      const state = conn && connectionStates.get(conn);
      if (state) {
        state.failed = true;
        clearTimeout(state.timer);
      }
      if (conn) conn.close();
      if (call) call.close();
    });
    participants.clear();
    pendingCalls.forEach(({ call, timer }) => {
      clearTimeout(timer);
      call.close();
    });
    pendingCalls.clear();
    roster.clear();
    if (peer) peer.destroy();
    if (mediaWorker) mediaWorker.terminate();
    mediaWorker = null;
    roomKey = null;
    mediaKey = null;
    meetingSecret = '';
    secretInput.value = '';
    incomingFiles.clear();
    if (localStream) localStream.getTracks().forEach((t) => t.stop());
    localStream = null;
    previewVideo.srcObject = null;
    videoGrid.innerHTML = '';
    chatLog.innerHTML = '';
    fileLog.innerHTML = '';
    setSidePanel(null);
    meetingScreen.classList.add('hidden');
    joinScreen.classList.remove('hidden');
    joinForm.querySelector('button[type="submit"]').disabled = false;
    setStatus(joinStatus, '');
    requestMediaWithFeedback();
    leaving = false;
  }
})();
