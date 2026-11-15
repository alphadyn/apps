(async () => {
  const results = document.getElementById('results');
  const lines = [];
  let failures = 0;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  const waitFor = async (predicate, message) => {
    for (let i = 0; i < 200; i++) {
      if (await predicate()) return;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    throw new Error(message);
  };
  const rejects = async (action, message) => {
    let rejected = false;
    try { await action(); } catch { rejected = true; }
    assert(rejected, message);
  };
  const test = async (name, action) => {
    try {
      await action();
      lines.push(`PASS ${name}`);
    } catch (error) {
      failures++;
      lines.push(`FAIL ${name}: ${error.stack || error.message}`);
    }
    results.textContent = lines.join('\n');
  };

  const secret = MeetingsCrypto.generateSecret();
  const keys = await MeetingsCrypto.deriveKeys('test-room', secret);
  await test('256-bit canonical secrets and non-extractable, isolated keys', async () => {
    assert(secret.length === 43 && MeetingsCrypto.decodeSecret(secret).length === 32, 'Wrong secret shape');
    assert(MeetingsCrypto.generateSecret() !== secret, 'Repeated random secret');
    assert(!keys.dataKey.extractable && !keys.mediaKey.extractable, 'Extractable keys');
    await rejects(() => MeetingsCrypto.deriveKeys('test-room', 'short'), 'Short secret accepted');
    await rejects(() => MeetingsCrypto.deriveKeys('test-room', 'A'.repeat(42) + 'B'), 'Noncanonical secret accepted');
    const sealed = await MeetingsCrypto.seal(keys.dataKey, encoder.encode('private payload'), 'bound context');
    assert(decoder.decode(await MeetingsCrypto.open(keys.dataKey, sealed.iv, sealed.ciphertext, 'bound context')) === 'private payload', 'Round trip failed');
    for (const alternate of [
      await MeetingsCrypto.deriveKeys('other-room', secret),
      await MeetingsCrypto.deriveKeys('test-room', MeetingsCrypto.generateSecret())
    ]) {
      await rejects(() => MeetingsCrypto.open(alternate.dataKey, sealed.iv, sealed.ciphertext, 'bound context'), 'Wrong room or key accepted');
    }
    await rejects(() => MeetingsCrypto.open(keys.dataKey, sealed.iv, sealed.ciphertext, 'changed context'), 'Tampered context accepted');
    const changed = new Uint8Array(sealed.ciphertext.slice(0));
    changed[0] ^= 1;
    await rejects(() => MeetingsCrypto.open(keys.dataKey, sealed.iv, changed.buffer, 'bound context'), 'Tampered ciphertext accepted');
    const nonce = sealed.iv.slice();
    nonce[0] ^= 1;
    await rejects(() => MeetingsCrypto.open(keys.dataKey, nonce, sealed.ciphertext, 'bound context'), 'Tampered nonce accepted');
  });

  await test('Media keys are separated by call, direction, and track', async () => {
    const context = ['call', 'alice', 'bob', 'video'];
    const key = await MeetingsCrypto.deriveFrameKey(keys.mediaKey, context);
    const sealed = await MeetingsCrypto.seal(key, new Uint8Array([0, 1, 2, 255]), 'frame');
    for (const alternate of [
      ['different-call', 'alice', 'bob', 'video'],
      ['call', 'bob', 'alice', 'video'],
      ['call', 'alice', 'bob', 'audio']
    ]) {
      const wrongKey = await MeetingsCrypto.deriveFrameKey(keys.mediaKey, alternate);
      await rejects(() => MeetingsCrypto.open(wrongKey, sealed.iv, sealed.ciphertext, 'frame'), 'Media context reused a key');
    }
  });

  async function mediaRoundTrip(wrongKey = false) {
    const worker = new Worker('../media-worker.js');
    const errors = [];
    await new Promise((resolve, reject) => {
      worker.onmessage = ({ data }) => {
        if (data.type === 'ready') resolve();
        else errors.push(data);
      };
      worker.onerror = reject;
    });
    const sender = new RTCPeerConnection({ encodedInsertableStreams: true, iceServers: [] });
    const receiver = new RTCPeerConnection({ encodedInsertableStreams: true, iceServers: [] });
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const drawing = canvas.getContext('2d');
    const stream = canvas.captureStream(10);
    const timer = setInterval(() => {
      drawing.fillStyle = `rgb(${Math.floor(Math.random() * 255)}, 100, 200)`;
      drawing.fillRect(0, 0, 64, 64);
    }, 60);
    const audio = new AudioContext();
    const oscillator = audio.createOscillator();
    const destination = audio.createMediaStreamDestination();
    oscillator.connect(destination);
    oscillator.start();
    await audio.resume();
    destination.stream.getAudioTracks().forEach(track => stream.addTrack(track));
    const remoteVideo = document.createElement('video');
    const remoteStream = new MediaStream();
    remoteVideo.srcObject = remoteStream;
    remoteVideo.muted = true;
    remoteVideo.autoplay = true;
    document.body.appendChild(remoteVideo);
    const receiverKey = wrongKey
      ? (await MeetingsCrypto.deriveKeys('test-room', MeetingsCrypto.generateSecret())).mediaKey
      : keys.mediaKey;
    const transformed = new Set();
    const attach = (endpoint, operation) => {
      if (transformed.has(endpoint)) return;
      transformed.add(endpoint);
      endpoint.transform = new RTCRtpScriptTransform(worker, {
        operation, mediaKey: operation === 'encrypt' ? keys.mediaKey : receiverKey,
        context: ['test-call', 'sender', 'receiver', endpoint.track.kind]
      });
    };
    const ice = (from, to) => from.onicecandidate = ({ candidate }) => {
      if (candidate) to.addIceCandidate(candidate).catch(error => errors.push({ message: error.message }));
    };
    ice(sender, receiver);
    ice(receiver, sender);
    receiver.ontrack = ({ receiver: endpoint, track }) => {
      attach(endpoint, 'decrypt');
      remoteStream.addTrack(track);
    };
    try {
      stream.getTracks().forEach(track => attach(sender.addTrack(track, stream), 'encrypt'));
      await sender.setLocalDescription(await sender.createOffer());
      await receiver.setRemoteDescription(sender.localDescription);
      await receiver.setLocalDescription(await receiver.createAnswer());
      await sender.setRemoteDescription(receiver.localDescription);
      if (wrongKey) {
        await waitFor(() => errors.some(error => error.type === 'encryption-error'), 'Wrong media key was not rejected');
        assert(remoteVideo.videoWidth === 0, 'Wrong-key video was decoded');
      } else {
        await waitFor(() => remoteVideo.videoWidth === 64, 'Encrypted video did not decode');
        await waitFor(async () => {
          const stats = [...(await receiver.getStats()).values()];
          return stats.some(stat => stat.type === 'inbound-rtp' && stat.kind === 'audio' && stat.totalSamplesReceived > 0);
        }, 'Encrypted audio did not decode').catch(async (error) => {
          throw new Error(`${error.message}: ${JSON.stringify([...(await receiver.getStats()).values()].filter(stat => stat.type === 'inbound-rtp' && stat.kind === 'audio'))}; worker errors: ${JSON.stringify(errors)}`);
        });
        assert(errors.length === 0, `Media transform error: ${JSON.stringify(errors)}`);
      }
    } finally {
      clearInterval(timer);
      stream.getTracks().forEach(track => track.stop());
      oscillator.stop();
      await audio.close();
      sender.close();
      receiver.close();
      worker.terminate();
      remoteVideo.remove();
    }
  }

  await test('Real WebRTC audio and video decode through encrypted frame workers', () => mediaRoundTrip());
  await test('Real WebRTC media with a wrong invite key is rejected', () => mediaRoundTrip(true));

  async function appFrame(name, room, inviteSecret, join = true, withVideo = true) {
    const frame = document.createElement('iframe');
    frame.title = `Test participant ${name}`;
    frame.style.display = 'none';
    const html = await (await fetch('../index.html')).text();
    frame.srcdoc = html.replace('<head>', `<head><base href="${new URL('../', location.href)}">`)
      .replace(/<script defer src="\/apps\/analytics.js"><\/script>/, '')
      .replace(/<script src="https:\/\/unpkg.com\/peerjs[^"]+"><\/script>/, `<script>
        window.Peer = class extends parent.TestPeer { constructor(id, options) { super(id, options, window); } };
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 64;
        const drawing = canvas.getContext('2d');
        const stream = ${withVideo ? 'canvas.captureStream(10)' : 'new MediaStream()'};
        setInterval(() => {
          drawing.fillStyle = 'rgb(' + Math.floor(Math.random() * 255) + ',100,200)';
          drawing.fillRect(0, 0, 64, 64);
        }, 80);
        navigator.mediaDevices.getUserMedia = async () => stream;
      </script>`)
      .replace('</body>', '<script>document.body.dataset.testReady = "true";</script></body>');
    document.body.appendChild(frame);
    await waitFor(() => frame.contentDocument?.body?.dataset.testReady, 'Test frame did not initialize');
    const doc = frame.contentDocument;
    doc.getElementById('nameInput').value = name;
    doc.getElementById('roomInput').value = room;
    doc.getElementById('secretInput').value = inviteSecret;
    if (!join) return frame;
    doc.getElementById('joinForm').requestSubmit();
    await waitFor(() => !doc.getElementById('meetingScreen').classList.contains('hidden'), `App failed to join: ${doc.getElementById('joinStatus').textContent}`);
    return frame;
  }

  await test('App encrypts identities, chat and files; ordered envelopes reject replay', async () => {
    TestNetwork.packets.length = 0;
    const frames = [];
    try {
      frames.push(await appFrame('Alice', 'integration-room', secret));
      frames.push(await appFrame('Bob', 'integration-room', secret, true, false));
      const [alice, bob] = frames.map(frame => frame.contentDocument);
      await waitFor(() => alice.getElementById('peopleCount').textContent === '2', 'Peer authentication failed');
      await waitFor(() => bob.querySelector('.video-tile:not(#tile-local) video')?.videoWidth === 64, 'App media did not decode through its encryption transforms');
      Object.defineProperty(frames[0].contentWindow.navigator, 'clipboard', {
        configurable: true,
        value: { writeText: async url => { frames[0].testInvite = url; } }
      });
      alice.getElementById('copyLinkBtn').click();
      await waitFor(() => frames[0].testInvite, 'Invite was not copied');
      const invite = new URL(frames[0].testInvite);
      assert(new URLSearchParams(invite.hash.slice(1)).get('key') === secret, 'Invite secret is missing from fragment');
      assert(!invite.search.includes(secret), 'Invite secret leaked into query string');
      alice.getElementById('chatInput').value = 'PRIVATE TEST MESSAGE';
      alice.getElementById('chatForm').requestSubmit();
      await waitFor(() => bob.getElementById('chatLog').textContent.includes('PRIVATE TEST MESSAGE'), 'Encrypted chat did not arrive');
      const transfer = new DataTransfer();
      transfer.items.add(new File(['PRIVATE FILE BYTES'], 'private-test.txt', { type: 'text/plain' }));
      alice.getElementById('fileInput').files = transfer.files;
      alice.getElementById('fileInput').dispatchEvent(new Event('change'));
      await waitFor(() => bob.getElementById('fileLog').textContent.includes('private-test.txt'), 'Encrypted file did not arrive');
      const download = bob.querySelector('#fileLog a');
      assert(await (await fetch(download.href)).text() === 'PRIVATE FILE BYTES', 'File bytes corrupted');
      assert(TestNetwork.packets.every(({ data }) => data.v === 2 && Array.isArray(data.iv) && data.ct instanceof ArrayBuffer), 'Plaintext packet sent');
      assert(!JSON.stringify(TestNetwork.packets.map(({ data }) => data)).includes('PRIVATE'), 'Content leaked in packet headers');
      const packet = TestNetwork.packets.find(({ data }) => data.type === 'enc-bin');
      packet.connection.partner.emit('data', packet.connection.partner.realm.structuredClone(packet.data));
      await waitFor(() => bob.getElementById('connectionStatus').textContent.includes('Encryption failed'), 'Replayed data was not rejected');
    } finally {
      for (const frame of frames) {
        frame.contentDocument.getElementById('leaveBtn').click();
        frame.remove();
      }
    }
  });

  for (const [label, alter] of [
    ['plaintext', () => ({ type: 'chat', text: 'not encrypted' })],
    ['tampered ciphertext', packet => {
      const bytes = new Uint8Array(packet.ct);
      bytes[0] ^= 1;
      return packet;
    }],
    ['tampered routing context', packet => ({ ...packet, type: 'enc-bin', id: 'changed-id' })]
  ]) {
    await test(`App rejects ${label} without a plaintext fallback`, async () => {
      const frames = [];
      try {
        frames.push(await appFrame('Alice', 'negative-room', secret));
        frames.push(await appFrame('Bob', 'negative-room', secret));
        const [alice, bob] = frames.map(frame => frame.contentDocument);
        await waitFor(() => alice.getElementById('peopleCount').textContent === '2', 'Peer authentication failed');
        const connection = [...TestNetwork.packets].reverse().find(({ from }) => from === [...TestNetwork.peers.keys()][0]).connection;
        const originalSend = connection.send.bind(connection);
        connection.send = packet => originalSend(alter(packet));
        alice.getElementById('chatInput').value = 'REJECT THIS MESSAGE';
        alice.getElementById('chatForm').requestSubmit();
        await waitFor(() => bob.getElementById('connectionStatus').textContent.includes('Encryption failed'), 'Invalid packet did not close the connection');
        assert(!bob.getElementById('chatLog').textContent.includes('REJECT THIS MESSAGE'), 'Invalid content rendered');
      } finally {
        for (const frame of frames) {
          frame.contentDocument.getElementById('leaveBtn').click();
          frame.remove();
        }
      }
    });
  }

  await test('Wrong invite secrets cannot authenticate peers or start media', async () => {
    const frames = [];
    try {
      frames.push(await appFrame('Alice', 'wrong-secret-room', secret));
      frames.push(await appFrame('Bob', 'wrong-secret-room', MeetingsCrypto.generateSecret()));
      const [alice, bob] = frames.map(frame => frame.contentDocument);
      await waitFor(() => [alice, bob].some(doc => doc.getElementById('connectionStatus').textContent.includes('Encryption failed')), 'Wrong invite was not rejected');
      assert([alice, bob].every(doc => doc.getElementById('peopleCount').textContent === '1'), 'Wrong-key peer authenticated');
      assert([alice, bob].every(doc => doc.querySelectorAll('.video-tile').length === 1), 'Wrong-key media accepted');
    } finally {
      for (const frame of frames) {
        frame.contentDocument.getElementById('leaveBtn').click();
        frame.remove();
      }
    }
  });

  await test('Unsupported media encryption and invalid secrets fail before signaling', async () => {
    const frame = await appFrame('Alice', 'unsupported-room', secret, false);
    try {
      const doc = frame.contentDocument;
      frame.contentWindow.RTCRtpScriptTransform = undefined;
      doc.getElementById('joinForm').requestSubmit();
      await waitFor(() => doc.getElementById('joinStatus').textContent.includes('does not support'), 'Unsupported media encryption was not reported');
      assert(TestNetwork.peers.size === 0, 'Unsupported client started signaling');
      frame.contentWindow.RTCRtpScriptTransform = RTCRtpScriptTransform;
      doc.getElementById('secretInput').value = 'A'.repeat(42) + 'B';
      doc.getElementById('joinForm').requestSubmit();
      await waitFor(() => doc.getElementById('joinStatus').textContent.includes('secret is invalid'), 'Invalid secret was not reported');
      assert(TestNetwork.peers.size === 0, 'Invalid secret started signaling');
    } finally {
      frame.remove();
    }
  });

  await test('Responsive meeting layouts, touch targets, panel controls, and keyboard navigation', async () => {
    const frame = await appFrame('Alice', 'responsive-room', secret);
    const doc = frame.contentDocument;
    const sizes = [[320, 568], [390, 844], [768, 1024], [844, 390], [1024, 768], [1440, 900], [1920, 1080]];
    const resize = async (width, height) => {
      frame.style.cssText = `display:block;position:fixed;inset:0 auto auto 0;border:0;width:${width}px;height:${height}px;`;
      await new Promise(resolve => setTimeout(resolve, 40));
    };
    const assertNoOverflow = (label) => {
      assert(doc.documentElement.scrollWidth <= doc.documentElement.clientWidth, `${label}: horizontal page overflow`);
    };
    try {
      for (const [width, height] of sizes) {
        await resize(width, height);
        assertNoOverflow(`${width}x${height} meeting`);
        const toolbar = doc.querySelector('.control-bar').getBoundingClientRect();
        assert(toolbar.bottom <= height + 1 && toolbar.top >= 0, `${width}x${height}: toolbar outside viewport`);
        for (const button of doc.querySelectorAll('.control-btn')) {
          const box = button.getBoundingClientRect();
          assert(box.width >= 44 && box.height >= 44, `${width}x${height}: small touch target ${button.id}`);
        }
        doc.getElementById('chatToggleBtn').click();
        assert(doc.getElementById('chatToggleBtn').getAttribute('aria-expanded') === 'true', 'Chat trigger not expanded');
        const panel = doc.getElementById('sidePanel').getBoundingClientRect();
        const body = doc.querySelector('.meeting-body').getBoundingClientRect();
        assert(panel.left >= 0 && panel.right <= width + 1 && panel.bottom <= toolbar.top + 1 && panel.top >= body.top - 1, `${width}x${height}: panel outside stage`);
        doc.getElementById('chatTab').focus();
        doc.getElementById('chatTab').dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
        assert(doc.getElementById('peopleTab').getAttribute('aria-selected') === 'true', 'Arrow navigation failed');
        assert(doc.getElementById('peopleToggleBtn').getAttribute('aria-expanded') === 'true', 'Panel controls are out of sync');
        doc.getElementById('peopleTab').dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
        assert(doc.getElementById('filesTab').getAttribute('aria-selected') === 'true', 'End navigation failed');
        doc.getElementById('fileInput').focus();
        assert(doc.activeElement === doc.getElementById('fileInput'), 'File sharing is not keyboard accessible');
        doc.getElementById('filesTab').focus();
        doc.getElementById('filesTab').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        assert(doc.getElementById('sidePanel').classList.contains('hidden'), 'Escape did not close the panel');
        assert(doc.activeElement === doc.getElementById('filesToggleBtn'), 'Closing did not restore focus');
        doc.getElementById('chatToggleBtn').click();
        doc.getElementById('closePanelBtn').focus();
        doc.getElementById('closePanelBtn').click();
        assert(doc.getElementById('chatToggleBtn').getAttribute('aria-expanded') === 'false', 'Close button did not reset trigger');
      }
      doc.getElementById('camBtn').click();
      assert(doc.getElementById('camBtn').textContent.includes('Start video'), 'Camera off label is incorrect');
      doc.getElementById('camBtn').click();
      assert(doc.getElementById('camBtn').textContent.includes('Stop video'), 'Camera on label is incorrect');
      doc.getElementById('leaveBtn').click();
      for (const [width, height] of sizes) {
        await resize(width, height);
        assertNoOverflow(`${width}x${height} join`);
        const card = doc.querySelector('.join-card').getBoundingClientRect();
        assert(card.left >= 0 && card.right <= width + 1, `${width}x${height}: join card outside viewport`);
        for (const button of doc.querySelectorAll('.join-actions > button')) {
          const box = button.getBoundingClientRect();
          assert(box.height >= 44 && box.height <= 64, `${width}x${height}: join action has an incorrect height`);
        }
      }
    } finally {
      if (doc.getElementById('joinScreen').classList.contains('hidden')) doc.getElementById('leaveBtn').click();
      frame.remove();
    }
  });

  results.textContent = `${lines.join('\n')}\n\n${lines.length - failures} passed; ${failures} failed`;
  document.body.dataset.testStatus = failures ? 'failed' : 'passed';
})().catch(error => {
  document.getElementById('results').textContent += `\nFATAL: ${error.stack || error.message}`;
  document.body.dataset.testStatus = 'failed';
});
