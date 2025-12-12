// SocketProvider.js
import React, { createContext, useMemo, useContext } from "react";
import { io } from "socket.io-client";

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  // runtime override (useful for demos)
  const override = typeof window !== "undefined" && window.localStorage.getItem("REACT_APP_SOCKET_URL_OVERRIDE");
  const url = override || process.env.REACT_APP_SOCKET_URL || window.location.origin;

  const socket = useMemo(() => io(url, { transports: ["websocket"], autoConnect: true }), [url]);
  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};
