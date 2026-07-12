/**
 * SocketContext — manages the Socket.IO connection to the MetroEast API server.
 * Socket instance is stored in state so children re-render when it becomes available.
 */
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const API_HOST = `https://${process.env.EXPO_PUBLIC_DOMAIN ?? 'localhost'}`;
const SOCKET_PATH = '/api/socket.io';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, connected: false });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  // Keep a ref so we can clean up on unmount even if state updates are batched
  const sockRef = useRef<Socket | null>(null);

  useEffect(() => {
    const sock = io(API_HOST, {
      path: SOCKET_PATH,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionAttempts: Infinity,
      timeout: 10_000,
    });

    sockRef.current = sock;
    setSocket(sock);

    sock.on('connect', () => setConnected(true));
    sock.on('disconnect', () => setConnected(false));
    sock.on('connect_error', () => setConnected(false));

    return () => {
      sock.disconnect();
      sockRef.current = null;
      setSocket(null);
      setConnected(false);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocket = () => useContext(SocketContext);
