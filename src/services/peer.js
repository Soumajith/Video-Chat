
class PeerService {
  constructor(config = null) {
    this.pendingConfig = config || null;
    this.peer = null;
    this.iceReady = false;

    // keep references to attached handlers so we can remove them
    this._iceCandidateHandlers = new Set();
    this._negotiationHandlers = new Set();
  }

  // Lazily create RTCPeerConnection (fetch /turn if no config provided)
  async ensurePeer() {
    if (this.peer) return this.peer;

    let pcConfig = { iceServers: [] };

    if (this.pendingConfig) {
      pcConfig = this.pendingConfig;
    } else {
      try {
        const resp = await fetch("/turn");
        if (resp.ok) {
          const data = await resp.json();
          pcConfig = { iceServers: data.iceServers || [] };
          console.log("Loaded TURN/STUN config:", pcConfig);
        } else {
          console.warn("/turn responded with non-OK status; using empty ICE servers");
        }
      } catch (err) {
        console.warn("Failed to fetch /turn; using empty ICE servers", err);
      }
    }

    this.peer = new RTCPeerConnection(pcConfig);
    this.iceReady = true;

    // wire up internal dispatcher for onicecandidate -> call registered handlers
    this.peer.onicecandidate = (ev) => {
      const candidate = ev.candidate;
      if (!candidate) return;
      for (const h of this._iceCandidateHandlers) {
        try {
          h(candidate);
        } catch (e) {
          console.error("ice candidate handler error", e);
        }
      }
    };

    // wire up negotiationneeded dispatcher
    this.peer.onnegotiationneeded = () => {
      for (const h of this._negotiationHandlers) {
        try {
          h();
        } catch (e) {
          console.error("negotiation handler error", e);
        }
      }
    };

    return this.peer;
  }

  // Get the underlying RTCPeerConnection if already created (may be null)
  getPeer() {
    return this.peer;
  }

  // Register/Unregister ICE candidate handlers
  onIceCandidate(callback) {
    if (typeof callback !== "function") return;
    this._iceCandidateHandlers.add(callback);
    // ensure peer exists so onicecandidate is attached
    this.ensurePeer().catch(() => {});
  }

  offIceCandidate(callback) {
    this._iceCandidateHandlers.delete(callback);
  }

  // Register/Unregister negotiationneeded handlers
  onNegotiationNeeded(callback) {
    if (typeof callback !== "function") return;
    this._negotiationHandlers.add(callback);
    this.ensurePeer().catch(() => {});
  }

  offNegotiationNeeded(callback) {
    this._negotiationHandlers.delete(callback);
  }

  // convenience wrapper to add a single track
  async addTrack(track, stream) {
    const pc = await this.ensurePeer();
    return pc.addTrack(track, stream);
  }

  // convenience: add all tracks from a MediaStream
  async addTracksFromStream(stream) {
    if (!stream) return;
    const pc = await this.ensurePeer();
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }
  }

  // Add remote ICE candidate (wrap if necessary)
  async addIceCandidate(candidate) {
    if (!candidate) return;
    const pc = await this.ensurePeer();

    // Some callers pass a plain object; wrap to RTCIceCandidate for compatibility
    let rtcCandidate = candidate;
    try {
      // If the candidate already has candidate string or is RTCIceCandidate, let it pass
      if (!(candidate instanceof RTCIceCandidate)) {
        rtcCandidate = new RTCIceCandidate(candidate);
      }
    } catch (err) {
      // If wrapping fails, still try to pass the raw candidate (some browsers accept it)
      rtcCandidate = candidate;
    }

    try {
      return pc.addIceCandidate(rtcCandidate);
    } catch (err) {
      console.warn("addIceCandidate failed:", err);
      // ignore non-fatal errors (e.g. invalid state) but rethrow unexpected ones
      throw err;
    }
  }

  async setLocalDescription(desc) {
    const pc = await this.ensurePeer();
    return pc.setLocalDescription(desc);
  }

  async setRemoteDescription(desc) {
    const pc = await this.ensurePeer();
    return pc.setRemoteDescription(desc);
  }

  async getOffer() {
    const pc = await this.ensurePeer();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return pc.localDescription;
  }

  async getAnswer(offer) {
    const pc = await this.ensurePeer();
    await pc.setRemoteDescription(offer);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return pc.localDescription;
  }

  // clean up peer and handlers (useful on component unmount or app shutdown)
  async close() {
    if (this.peer) {
      try {
        this.peer.close();
      } catch (e) {
        console.warn("error closing peer", e);
      }
      this.peer = null;
      this.iceReady = false;
    }
    this._iceCandidateHandlers.clear();
    this._negotiationHandlers.clear();
  }
}

export default new PeerService();
