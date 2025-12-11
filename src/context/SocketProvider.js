// src/context/SocketProvider.js
import React, { createContext, useMemo, useContext } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  // If no env var provided, fall back to same-origin websockets
  const url = process.env.REACT_APP_SOCKET_URL || window.location.origin;

  const socket = useMemo(() => {
    return io(url, {
      transports: ["websocket"],
      autoConnect: true,
    });
  }, [url]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
