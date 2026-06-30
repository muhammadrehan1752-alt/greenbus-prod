import 'dotenv/config';
import { query, withTransaction } from '../models/db';
import bcrypt from 'bcryptjs';
import logger from '../logger';
import { PoolClient } from 'pg';

async function seed() {
  logger.info('Starting database seed...');

  await withTransaction(async (client: PoolClient) => {
    // ─── Stops ────────────────────────────────────────────────────────────────
    const stops = [
      { id: 'qta_uni',      name: 'University of Balochistan', lat: 30.1746, lng: 66.9934 },
      { id: 'qta_cantt',    name: 'Quetta Cantonment',         lat: 30.2033, lng: 67.0100 },
      { id: 'qta_liaquat',  name: 'Liaquat Market',            lat: 30.1914, lng: 67.0125 },
      { id: 'qta_civil',    name: 'Civil Hospital',            lat: 30.1884, lng: 67.0016 },
      { id: 'qta_sariab',   name: 'Sariab Road',               lat: 30.1601, lng: 66.9854 },
      { id: 'qta_serena',   name: 'Serena Hotel Chowk',        lat: 30.1834, lng: 67.0189 },
      { id: 'gwd_port',     name: 'Gwadar Port',               lat: 25.1118, lng: 62.3332 },
      { id: 'gwd_airport',  name: 'Gwadar Airport',            lat: 25.2333, lng: 62.2667 },
      { id: 'gwd_marine',   name: 'Marine Drive',              lat: 25.1200, lng: 62.3200 },
    ];
    for (const s of stops) {
      await client.query(
        `INSERT INTO stops (id, name, latitude, longitude) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
        [s.id, s.name, s.lat, s.lng]
      );
    }

    // ─── Routes ───────────────────────────────────────────────────────────────
    const routes = [
      { id: 'R1', name: 'Quetta Express (UoB – Cantt)', type: 'green', fare: 40, tourist: false,
        stops: ['qta_uni', 'qta_civil', 'qta_liaquat', 'qta_cantt'] },
      { id: 'R2', name: 'Women Special (Sariab – Cantt)', type: 'pink', fare: 30, tourist: false,
        stops: ['qta_sariab', 'qta_uni', 'qta_cantt'] },
      { id: 'R3', name: 'Gwadar Port Shuttle', type: 'green', fare: 40, tourist: false,
        stops: ['gwd_port', 'gwd_marine', 'gwd_airport'] },
      { id: 'T1', name: 'Quetta Heritage Tour', type: 'green', fare: 100, tourist: true,
        stops: ['qta_serena', 'qta_cantt', 'qta_liaquat'] },
      { id: 'T2', name: 'Gwadar Beach Explorer', type: 'green', fare: 150, tourist: true,
        stops: ['gwd_marine', 'gwd_port'] },
    ];
    for (const r of routes) {
      await client.query(
        `INSERT INTO routes (id, name, type, fare, is_tourist) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [r.id, r.name, r.type, r.fare, r.tourist]
      );
      for (let i = 0; i < r.stops.length; i++) {
        await client.query(
          `INSERT INTO route_stops (route_id, stop_id, stop_order) VALUES ($1, $2, $3)
           ON CONFLICT DO NOTHING`,
          [r.id, r.stops[i], i + 1]
        );
      }
    }

    // ─── Buses ────────────────────────────────────────────────────────────────
    const buses = [
      { id: 'B101', route: 'R1', type: 'green', lat: 30.1800, lng: 67.0000, cap: 40, occ: 12 },
      { id: 'B102', route: 'R1', type: 'green', lat: 30.1950, lng: 67.0050, cap: 40, occ: 35 },
      { id: 'P201', route: 'R2', type: 'pink',  lat: 30.1700, lng: 66.9900, cap: 30, occ: 8  },
      { id: 'G301', route: 'R3', type: 'green', lat: 25.1200, lng: 62.3200, cap: 40, occ: 5  },
      { id: 'TOUR1',route: 'T1', type: 'green', lat: 30.2000, lng: 67.0100, cap: 25, occ: 10 },
      { id: 'TOUR2',route: 'T2', type: 'green', lat: 25.1300, lng: 62.3100, cap: 25, occ: 15 },
    ];
    for (const b of buses) {
      await client.query(
        `INSERT INTO buses (id, route_id, type, latitude, longitude, capacity, occupied_seats, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
         ON CONFLICT (id) DO NOTHING`,
        [b.id, b.route, b.type, b.lat, b.lng, b.cap, b.occ]
      );
    }

    // ─── Admin User ───────────────────────────────────────────────────────────
    const adminHash = await bcrypt.hash('admin123', 12);
    await client.query(
      `INSERT INTO users (email, password_hash, display_name, role, wallet_balance)
       VALUES ('admin@greenbus.pk', $1, 'System Admin', 'admin', 0)
       ON CONFLICT (email) DO NOTHING`,
      [adminHash]
    );

    // ─── Driver User ──────────────────────────────────────────────────────────
    const driverHash = await bcrypt.hash('driver123', 12);
    const driverResult = await client.query(
      `INSERT INTO users (email, password_hash, display_name, role, assigned_bus_id)
       VALUES ('driver@greenbus.pk', $1, 'Ahmed Khan', 'driver', 'B101')
       ON CONFLICT (email) DO NOTHING RETURNING id`,
      [driverHash]
    );
    if (driverResult.rows[0]) {
      await client.query(
        `UPDATE buses SET driver_id = $1 WHERE id = 'B101'`,
        [driverResult.rows[0].id]
      );
    }

    // ─── News ─────────────────────────────────────────────────────────────────
    const newsItems = [
      { title: '50 New Electric Buses Arriving', content: 'The Government of Balochistan is adding 50 new electric buses to the fleet starting next month.' },
      { title: 'Gwadar Port Route Enhanced', content: 'Enhanced routes now cover the entire Marine Drive for easier port access and tourist connectivity.' },
      { title: 'Student Fare Discount Launched', content: 'Special 50% discount for students with valid institution ID cards on all Green Bus routes.' },
    ];
    for (const n of newsItems) {
      await client.query(
        `INSERT INTO news (title, content) VALUES ($1, $2)`,
        [n.title, n.content]
      );
    }

    logger.info('✅ Seed complete');
    logger.info('   Admin: admin@greenbus.pk / admin123');
    logger.info('   Driver: driver@greenbus.pk / driver123');
  });

  process.exit(0);
}

seed().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
