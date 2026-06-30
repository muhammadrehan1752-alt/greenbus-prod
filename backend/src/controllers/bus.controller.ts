import { Request, Response, NextFunction } from 'express';
import { query } from '../models/db';
import { AppError } from '../middleware/errors';
import { BusStatus, BusLocationUpdate } from '../types';
import { getIO } from '../services/socket.service';

export async function getAllBuses(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(
      `SELECT b.*, r.name as route_name, r.type as route_type, r.fare as route_fare
       FROM buses b
       LEFT JOIN routes r ON b.route_id = r.id
       ORDER BY b.id`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getBusByRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const { routeId } = req.params;
    const result = await query(
      `SELECT b.*, u.display_name as driver_name
       FROM buses b
       LEFT JOIN users u ON b.driver_id = u.id
       WHERE b.route_id = $1 AND b.status = 'active'`,
      [routeId]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getBusById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(
      `SELECT b.*, r.name as route_name, r.type as route_type,
              u.display_name as driver_name
       FROM buses b
       LEFT JOIN routes r ON b.route_id = r.id
       LEFT JOIN users u ON b.driver_id = u.id
       WHERE b.id = $1`,
      [req.params.id]
    );
    if (!result.rows[0]) throw new AppError('Bus not found', 404);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function updateBusLocation(req: Request, res: Response, next: NextFunction) {
  try {
    const { bus_id, latitude, longitude, occupied_seats }: BusLocationUpdate = req.body;

    // Drivers can only update their assigned bus
    if (req.user!.role === 'driver') {
      const userResult = await query(
        'SELECT assigned_bus_id FROM users WHERE id = $1',
        [req.user!.userId]
      );
      if (userResult.rows[0]?.assigned_bus_id !== bus_id) {
        throw new AppError('Not authorized to update this bus', 403);
      }
    }

    const updates: string[] = [
      'latitude = $1',
      'longitude = $2',
      'last_updated = NOW()',
    ];
    const params: any[] = [latitude, longitude];
    let paramCount = 3;

    if (occupied_seats !== undefined) {
      updates.push(`occupied_seats = $${paramCount++}`);
      params.push(occupied_seats);
    }

    params.push(bus_id);
    const result = await query(
      `UPDATE buses SET ${updates.join(', ')} WHERE id = $${paramCount}
       RETURNING *`,
      params
    );

    if (!result.rows[0]) throw new AppError('Bus not found', 404);

    // Broadcast to all clients subscribed to this route
    const io = getIO();
    io.to(`route:${result.rows[0].route_id}`).emit('bus:location_updated', {
      bus_id,
      latitude,
      longitude,
      occupied_seats: result.rows[0].occupied_seats,
      last_updated: new Date().toISOString(),
    });

    res.json({ success: true, bus: result.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function updateBusStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status }: { status: BusStatus } = req.body;
    const result = await query(
      `UPDATE buses SET status = $1, last_updated = NOW() WHERE id = $2 RETURNING *`,
      [status, req.params.id]
    );
    if (!result.rows[0]) throw new AppError('Bus not found', 404);

    const io = getIO();
    io.to(`route:${result.rows[0].route_id}`).emit('bus:status_changed', {
      bus_id: req.params.id,
      status,
    });

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function createBus(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, route_id, type, latitude, longitude, capacity } = req.body;
    const result = await query(
      `INSERT INTO buses (id, route_id, type, latitude, longitude, capacity)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, route_id, type, latitude, longitude, capacity || 40]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function assignDriver(req: Request, res: Response, next: NextFunction) {
  try {
    const { driver_id } = req.body;
    const { busId } = req.params;

    // Update bus driver
    const busResult = await query(
      `UPDATE buses SET driver_id = $1 WHERE id = $2 RETURNING *`,
      [driver_id, busId]
    );
    if (!busResult.rows[0]) throw new AppError('Bus not found', 404);

    // Update driver's assigned bus
    await query(
      `UPDATE users SET assigned_bus_id = $1 WHERE id = $2`,
      [busId, driver_id]
    );

    res.json({ success: true, bus: busResult.rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function getFleetStats(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_buses,
        COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_buses,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive_buses,
        COUNT(*) FILTER (WHERE type = 'green') as green_buses,
        COUNT(*) FILTER (WHERE type = 'pink') as pink_buses,
        SUM(occupied_seats) as total_passengers,
        SUM(capacity) as total_capacity,
        AVG(occupied_seats::float / NULLIF(capacity, 0) * 100) as avg_occupancy_pct
      FROM buses
    `);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}
