import { io, Socket } from 'socket.io-client';
import type { SocketBusUpdate, Alert } from '../types';

let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) return socket;

  socket = io('', {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => console.log('[Socket] Connected:', socket?.id));
  socket.on('connect_error', (err) => console.error('[Socket] Error:', err.message));
  socket.on('disconnect', (reason) => console.log('[Socket] Disconnected:', reason));

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket(): Socket | null { return socket; }

export function subscribeToRoute(routeId: string) {
  socket?.emit('subscribe:route', routeId);
}

export function unsubscribeFromRoute(routeId: string) {
  socket?.emit('unsubscribe:route', routeId);
}

export function onBusLocationUpdate(cb: (data: SocketBusUpdate) => void): () => void {
  socket?.on('bus:location_updated', cb);
  return () => { socket?.off('bus:location_updated', cb); };
}

export function onNewAlert(cb: (alert: Alert) => void): () => void {
  socket?.on('alert:new', cb);
  return () => { socket?.off('alert:new', cb); };
}

export function sendDriverLocation(busId: string, lat: number, lng: number, occupiedSeats?: number) {
  socket?.emit('driver:update_location', {
    bus_id: busId,
    latitude: lat,
    longitude: lng,
    ...(occupiedSeats !== undefined && { occupied_seats: occupiedSeats }),
  });
}
