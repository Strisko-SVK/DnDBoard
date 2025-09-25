"use client";
import { io, Socket } from 'socket.io-client';
import { SocketEvents } from '@dndboard/shared';

let socket: Socket | null = null;

export function getSocket(token?: string) {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
      autoConnect: true,
      transports: ['websocket'],
      auth: token ? { token } : undefined
    });
  }
  return socket;
}

export { SocketEvents };

