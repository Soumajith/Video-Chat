import React, { useCallback, useEffect, useState } from "react";
import { useSocket } from "../context/SocketProvider";
import { useNavigate } from "react-router-dom";

const Home = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");
  const navigate = useNavigate();
  const socket = useSocket();
  // console.log(socket);

  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  const handleJoin = useCallback((data) => {
    const { email, room } = data;
    // console.log(email, room);
    navigate(`/connect/${room}`);
  }, []);

  useEffect(() => {
    socket.on("room:join", handleJoin);
    return () => {
      socket.off("room-join", handleJoin);
    };
  }, [socket, handleJoin]);

  return (
    <div>
      <h1>Lobby</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email">Email ID: </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="room">Room No.</label>
          <input
            id="room"
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
        </div>
        <button>Join</button>
      </form>
    </div>
  );
};

export default Home;
