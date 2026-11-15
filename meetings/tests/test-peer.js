// In-memory PeerJS test double: no test content is sent to external services.
(() => {
  const peers = new Map();
  const packets = [];
  class Events {
    handlers = new Map();
    on(name, callback) {
      if (!this.handlers.has(name)) this.handlers.set(name, []);
      this.handlers.get(name).push(callback);
    }
    emit(name, ...args) {
      for (const callback of this.handlers.get(name) || []) callback(...args);
    }
  }

  class Connection extends Events {
    constructor(peer, connectionId, owner, realm) {
      super();
      this.peer = peer;
      this.connectionId = connectionId;
      this.owner = owner;
      this.realm = realm;
      this.open = false;
    }
    send(data) {
      if (!this.open) throw new Error('Connection closed.');
      packets.push({ from: this.owner, to: this.peer, data: structuredClone(data), connection: this });
      setTimeout(() => {
        if (this.partner.open) this.partner.emit('data', this.partner.realm.structuredClone(data));
      }, 0);
    }
    close() {
      if (!this.open) return;
      this.open = false;
      this.emit('close');
      this.partner.close();
    }
  }

  class Call extends Events {
    constructor(peer, connectionId) {
      super();
      this.peer = peer;
      this.connectionId = connectionId;
      this.peerConnection = new RTCPeerConnection({ encodedInsertableStreams: true, iceServers: [] });
      this.peerConnection.ontrack = ({ streams }) => this.emit('stream', streams[0]);
    }
    answer(stream, options) {
      this.addTracks(stream);
      this.negotiateAnswer(options).catch(error => {
        if (!this.closed) this.emit('error', error);
      });
    }
    addTracks(stream) {
      stream.getTracks().forEach(track => this.peerConnection.addTrack(track, stream));
    }
    async gatherIce() {
      if (this.peerConnection.iceGatheringState === 'complete') return;
      await new Promise(resolve => {
        const listener = () => {
          if (this.peerConnection.iceGatheringState === 'complete' || this.closed) {
            this.peerConnection.removeEventListener('icegatheringstatechange', listener);
            resolve();
          }
        };
        this.peerConnection.addEventListener('icegatheringstatechange', listener);
      });
    }
    async negotiateOffer(options) {
      const offer = await this.peerConnection.createOffer(options.constraints);
      offer.sdp = options.sdpTransform(offer.sdp);
      await this.peerConnection.setLocalDescription(offer);
      await this.gatherIce();
    }
    async negotiateAnswer(options) {
      await this.peerConnection.setRemoteDescription(this.partner.peerConnection.localDescription);
      const answer = await this.peerConnection.createAnswer();
      answer.sdp = options.sdpTransform(answer.sdp);
      await this.peerConnection.setLocalDescription(answer);
      await this.gatherIce();
      await this.partner.peerConnection.setRemoteDescription(this.peerConnection.localDescription);
    }
    close() {
      if (this.closed) return;
      this.closed = true;
      this.peerConnection.close();
      this.emit('close');
      this.partner?.close();
    }
  }

  class TestPeer extends Events {
    constructor(id, options, realm = window) {
      super();
      this.id = typeof id === 'string' ? id : crypto.randomUUID();
      this.realm = realm;
      setTimeout(() => {
        if (peers.has(this.id)) this.emit('error', { type: 'unavailable-id' });
        else {
          peers.set(this.id, this);
          this.emit('open', this.id);
        }
      }, 0);
    }
    connect(id) {
      const target = peers.get(id);
      if (!target) throw new Error('Test peer not found.');
      const connectionId = crypto.randomUUID();
      const outgoing = new Connection(id, connectionId, this.id, this.realm);
      const incoming = new Connection(this.id, connectionId, id, target.realm);
      outgoing.partner = incoming;
      incoming.partner = outgoing;
      setTimeout(() => {
        target.emit('connection', incoming);
        outgoing.open = incoming.open = true;
        outgoing.emit('open');
        incoming.emit('open');
      }, 0);
      return outgoing;
    }
    call(id, stream, options) {
      const outgoing = new Call(id, crypto.randomUUID());
      const incoming = new Call(this.id, outgoing.connectionId);
      outgoing.partner = incoming;
      incoming.partner = outgoing;
      outgoing.addTracks(stream);
      setTimeout(() => {
        outgoing.negotiateOffer(options).then(() => peers.get(id).emit('call', incoming)).catch(error => {
          if (!outgoing.closed) outgoing.emit('error', error);
        });
      }, 0);
      return outgoing;
    }
    destroy() {
      if (peers.get(this.id) === this) peers.delete(this.id);
    }
  }
  globalThis.TestPeer = TestPeer;
  globalThis.TestNetwork = { packets, peers };
})();
