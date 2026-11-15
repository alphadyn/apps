importScripts('crypto.js');
self.postMessage({ type: 'ready' });

self.onrtctransform = (event) => {
  const { readable, writable, options } = event.transformer;
  const { operation, mediaKey, context } = options;
  const contextString = JSON.stringify(context);
  const keyPromise = MeetingsCrypto.deriveFrameKey(mediaKey, context);
  let counter = 0;
  let highestCounter = -1;
  const seen = new Set();
  let reportedFailure = false;

  const reportFailure = (error) => {
    if (reportedFailure) return;
    reportedFailure = true;
    self.postMessage({ type: 'encryption-error', message: error.message || 'Media encryption failed.' });
  };

  const transform = new TransformStream({
    async transform(frame, controller) {
      try {
        const key = await keyPromise;
        if (operation === 'encrypt') {
          if (!Number.isSafeInteger(counter)) throw new Error('Media encryption counter exhausted.');
          const sequence = counter++;
          const { iv, ciphertext } = await MeetingsCrypto.seal(key, frame.data, `${contextString}:${sequence}`);
          const packet = new Uint8Array(21 + ciphertext.byteLength);
          packet[0] = MeetingsCrypto.VERSION;
          new DataView(packet.buffer).setBigUint64(1, BigInt(sequence));
          packet.set(iv, 9);
          packet.set(new Uint8Array(ciphertext), 21);
          frame.data = packet.buffer;
        } else {
          const packet = new Uint8Array(frame.data);
          if (packet.byteLength < 37 || packet[0] !== MeetingsCrypto.VERSION) throw new Error('Unencrypted or incompatible media was rejected.');
          const sequence = Number(new DataView(packet.buffer).getBigUint64(1));
          if (!Number.isSafeInteger(sequence)) throw new Error('Invalid encrypted media counter.');
          // RTP redundancy may repeat frames. Drop replays without interrupting the call.
          if (seen.has(sequence) || sequence <= highestCounter - 1024) return;
          frame.data = await MeetingsCrypto.open(key, packet.slice(9, 21), packet.slice(21).buffer, `${contextString}:${sequence}`);
          highestCounter = Math.max(highestCounter, sequence);
          seen.add(sequence);
          for (const previous of seen) {
            if (previous <= highestCounter - 1024) seen.delete(previous);
          }
        }
        controller.enqueue(frame);
      } catch (error) {
        reportFailure(error);
      }
    }
  });
  readable.pipeThrough(transform).pipeTo(writable).catch(reportFailure);
};
