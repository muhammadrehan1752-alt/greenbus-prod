import { Request, Response, NextFunction } from 'express';
import { query } from '../models/db';
import { AppError } from '../middleware/errors';

export async function getAllRoutes(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, tourist } = req.query;

    let sql = `
      SELECT r.*,
        json_agg(
          json_build_object(
            'stop_id', rs.stop_id,
            'stop_order', rs.stop_order,
            'name', s.name,
            'latitude', s.latitude,
            'longitude', s.longitude
          ) ORDER BY rs.stop_order
        ) FILTER (WHERE rs.stop_id IS NOT NULL) as stops
      FROM routes r
      LEFT JOIN route_stops rs ON r.id = rs.route_id
      LEFT JOIN stops s ON rs.stop_id = s.id
    `;

    const params: any[] = [];
    const conditions: string[] = [];

    if (type) {
      params.push(type);
      conditions.push(`r.type = $${params.length}`);
    }
    if (tourist !== undefined) {
      params.push(tourist === 'true');
      conditions.push(`r.is_tourist = $${params.length}`);
    }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' GROUP BY r.id ORDER BY r.id';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getRouteById(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(
      `SELECT r.*,
        json_agg(
          json_build_object(
            'stop_id', rs.stop_id,
            'stop_order', rs.stop_order,
            'name', s.name,
            'latitude', s.latitude,
            'longitude', s.longitude
          ) ORDER BY rs.stop_order
        ) FILTER (WHERE rs.stop_id IS NOT NULL) as stops
       FROM routes r
       LEFT JOIN route_stops rs ON r.id = rs.route_id
       LEFT JOIN stops s ON rs.stop_id = s.id
       WHERE r.id = $1
       GROUP BY r.id`,
      [req.params.id]
    );
    if (!result.rows[0]) throw new AppError('Route not found', 404);
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function getAllStops(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query('SELECT * FROM stops ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getStopETA(req: Request, res: Response, next: NextFunction) {
  try {
    const { stopId } = req.params;

    // Get all active buses whose routes include this stop
    const result = await query(
      `SELECT b.id as bus_id, b.latitude, b.longitude,
              b.occupied_seats, b.capacity, b.route_id,
              rs.stop_order,
              s.latitude as stop_lat, s.longitude as stop_lng,
              s.name as stop_name
       FROM buses b
       JOIN route_stops rs ON b.route_id = rs.route_id AND rs.stop_id = $1
       JOIN stops s ON s.id = $1
       WHERE b.status = 'active'`,
      [stopId]
    );

    const etas = result.rows.map((row) => {
      const R = 6371;
      const dLat = ((row.stop_lat - row.latitude) * Math.PI) / 180;
      const dLon = ((row.stop_lng - row.longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((row.latitude * Math.PI) / 180) *
          Math.cos((row.stop_lat * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;
      const distanceKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const avgSpeedKmh = 20;
      const etaMins = Math.round((distanceKm / avgSpeedKmh) * 60);

      return {
        bus_id: row.bus_id,
        route_id: row.route_id,
        eta_minutes: etaMins,
        eta_text: etaMins < 1 ? 'Arriving' : `${etaMins} min`,
        distance_km: Math.round(distanceKm * 10) / 10,
        occupancy_pct: Math.round((row.occupied_seats / row.capacity) * 100),
      };
    });

    res.json({ stop_id: stopId, etas: etas.sort((a, b) => a.eta_minutes - b.eta_minutes) });
  } catch (err) {
    next(err);
  }
}
