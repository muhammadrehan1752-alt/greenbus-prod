import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ServerToClientEvents, ClientToServerEvents } from '../types';
import { verifyToken } from '../middleware/auth';
import { query } from '../models/db';
import logger from '../logger';

let io: Server<ClientToServerEvents, ServerToClientEvents>;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ─── Auth middleware ──────────────────────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    try {
      const payload = verifyToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    logger.info(`Socket connected: ${socket.id} (user: ${user?.userId})`);

    // ─── Route subscriptions ────────────────────────────────────────────────────
    socket.on('subscribe:route', (routeId: string) => {
      socket.join(`route:${routeId}`);
      logger.debug(`Socket ${socket.id} subscribed to route:${routeId}`);
    });

    socket.on('unsubscribe:route', (routeId: string) => {
      socket.leave(`route:${routeId}`);
    });

    // ─── Driver location updates ────────────────────────────────────────────────
    socket.on('driver:update_location', async (data) => {
      if (!['driver', 'admin'].includes(user?.role)) return;

      try {
        await query(
          `UPDATE buses
           SET latitude = $1, longitude = $2, last_updated = NOW()
           WHERE id = $3`,
          [data.latitude, data.longitude, data.bus_id]
        );

        // Get route_id for this bus
        const busResult = await query(
          'SELECT route_id FROM buses WHERE id = $1',
          [data.bus_id]
        );
        const routeId = busResult.rows[0]?.route_id;

        if (routeId) {
          io.to(`route:${routeId}`).emit('bus:location_updated', {
            ...data,
            last_updated: new Date().toISOString(),
          });
        }
      } catch (err) {
        logger.error('Socket location update error', err);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO(): Server<ClientToServerEvents, ServerToClientEvents> {
  if (!io) throw new Error('Socket.io not initialized');
  return io;
}
