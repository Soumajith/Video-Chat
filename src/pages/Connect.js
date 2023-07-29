import { useCallback, useEffect, useState } from "react";
import ReactPlayer from "react-player";
import { useSocket } from "../context/SocketProvider";

const Connect = () => {
  const [remoteSocketId, setRemoteSocketId] = useState(null);
  const [userStream, setUserStream] = useState(null);
  const socket = useSocket();

  const handleUserJoined = useCallback(({ email, id }) => {
    console.log(`user with ${email} joined`);
    setRemoteSocketId(id);
  });

  const handleCall = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    setUserStream(stream);
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);

    return () => {
      socket.off("user:joined", handleUserJoined);
    };
  }, [socket, handleUserJoined]);

  return (
    <div>
      <h1>Room</h1>
      {!remoteSocketId ? <h3>No one present</h3> : <h3>Connected</h3>}
      {remoteSocketId && <button onClick={handleCall}>Call</button>}
      {userStream && (
        <div>
          <h2>My Stream</h2>
          <ReactPlayer playing height={"200px"} muted url={userStream} />
        </div>
      )}
    </div>
  );
};

export default Connect;
