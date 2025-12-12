// src/pages/Connect.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import peer from "../services/peer";
import { useSocket } from "../context/SocketProvider";

const Connect = () => {
  const socket = useSocket();
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const myVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // set video srcObject when streams change
  useEffect(() => {
    if (myVideoRef.current && myStream) {
      myVideoRef.current.srcObject = myStream;
    }
  }, [myStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // user joined handler
  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`Email ${email} joined room`, id);
    setRemoteSocketId(id);
  }, []);

  // create offer and send to remote
  const handleCallUser = useCallback(
    async ( ) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);

      // ensure peer and attach local tracks (use peer.addTrack wrapper)
      for (const track of stream.getTracks()) {
        await peer.addTrack(track, stream);
      }

      const offer = await peer.getOffer();
      socket.emit("user:call", { to: remoteSocketId, offer });
    },
    [remoteSocketId, socket]
  );

  // incoming offer -> create answer and send
  const handleIncommingCall = useCallback(
    async ({ from, offer }) => {
      setRemoteSocketId(from);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      setMyStream(stream);

      // attach tracks
      for (const track of stream.getTracks()) {
        await peer.addTrack(track, stream);
      }

      console.log("Incoming Call from", from);
      const ans = await peer.getAnswer(offer);
      socket.emit("call:accepted", { to: from, ans });
    },
    [socket]
  );

  // call accepted by callee -> set local description (answer) and we already added tracks
  const handleCallAccepted = useCallback(
  async ({ from, ans }) => {
    await peer.setRemoteDescription(ans);
    console.log("Call Accepted!");
    await sendStreams();
  },
  [sendStreams]
);


  // negotiationneeded handler — create and send offer for renegotiation
  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [remoteSocketId, socket]);

  // incoming renegotiation offer -> answer
  const handleNegoNeedIncomming = useCallback(
    async ({ from, offer }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  // final renegotiation answer
  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    // ans is a remote answer to the renegotiation offer — apply as remote description
    await peer.setRemoteDescription(ans);
  }, []);


  // attach peer event listeners once peer exists
  useEffect(() => {
    let isMounted = true;
    // ensure peer exists, then attach negotiationneeded and track handlers
    (async () => {
      const pc = await peer.ensurePeer?.() /* ensurePeer exists on our service */;
      if (!isMounted) return;

      if (pc) {
        const onNegotiation = () => handleNegoNeeded();
        pc.addEventListener("negotiationneeded", onNegotiation);

        const onTrack = (ev) => {
          const rs = ev.streams && ev.streams[0];
          if (rs) {
            console.log("GOT TRACKS!!");
            setRemoteStream(rs);
          }
        };
        pc.addEventListener("track", onTrack);

        // cleanup
        return () => {
          pc.removeEventListener("negotiationneeded", onNegotiation);
          pc.removeEventListener("track", onTrack);
        };
      }
    })();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only once

  // send local ICE candidates via socket
  useEffect(() => {
    // attach callback to peer that emits ICE candidates
    const handleLocalIce = (candidate) => {
      if (!remoteSocketId) return;
      socket.emit("ice-candidate", { to: remoteSocketId, candidate });
    };

    peer.onIceCandidate(handleLocalIce);

    return () => {
      // remove handler by re-attaching no-op (our peer service uses onIceCandidate which sets pc.onicecandidate)
      // safest approach: re-register onIceCandidate with noop if peer exists
      try {
        const pc = peer.peer;
        if (pc) pc.onicecandidate = null;
      } catch (e) {}
    };
  }, [remoteSocketId, socket]);

  // receive ICE candidates from remote
  useEffect(() => {
    const handleRemoteIce = async ({ from, candidate }) => {
      console.log("Received ICE candidate from", from);
      await peer.addIceCandidate(candidate);
    };

    socket.on("ice-candidate", handleRemoteIce);
    return () => {
      socket.off("ice-candidate", handleRemoteIce);
    };
  }, [socket]);

  // socket event wiring
  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncommingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncomming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncommingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncomming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncommingCall,
    handleCallAccepted,
    handleNegoNeedIncomming,
    handleNegoNeedFinal,
  ]);

  return (
    <div>
      <h1>Room Page</h1>
      <h4>{remoteSocketId ? "Connected" : "No one in room"}</h4>
      {myStream && <button onClick={() => {
        // allow manual re-send of tracks if needed
        for (const track of myStream.getTracks()) peer.addTrack(track, myStream);
      }}>Send Stream</button>}
      {remoteSocketId && <button onClick={handleCallUser}>CALL</button>}

      {myStream && (
        <>
          <h3>My Stream</h3>
          <video ref={myVideoRef} autoPlay muted playsInline style={{ width: 200 }} />
        </>
      )}

      {remoteStream && (
        <>
          <h3>Remote Stream</h3>
          <video ref={remoteVideoRef} autoPlay playsInline style={{ width: 200 }} />
        </>
      )}
    </div>
  );
};

export default Connect;
