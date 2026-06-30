import { Request, Response, NextFunction } from 'express';
import { query } from '../models/db';
import { AppError } from '../middleware/errors';
import { CreateAlertDto, CreateFeedbackDto } from '../types';
import { getIO } from '../services/socket.service';

// ─── Alerts ───────────────────────────────────────────────────────────────────

export async function getActiveAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(
      `SELECT a.*, r.name as route_name
       FROM alerts a
       LEFT JOIN routes r ON a.route_id = r.id
       WHERE a.is_active = TRUE
       ORDER BY a.created_at DESC LIMIT 20`
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function createAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const { type, message, route_id }: CreateAlertDto = req.body;

    const result = await query(
      `INSERT INTO alerts (type, message, route_id, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *, (SELECT name FROM routes WHERE id = $3) as route_name`,
      [type, message, route_id || null, req.user!.userId]
    );
    const alert = result.rows[0];

    // Broadcast to all connected clients
    getIO().emit('alert:new', alert);

    res.status(201).json(alert);
  } catch (err) {
    next(err);
  }
}

export async function deactivateAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(
      `UPDATE alerts SET is_active = FALSE WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) throw new AppError('Alert not found', 404);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// ─── Feedback ─────────────────────────────────────────────────────────────────

export async function submitFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    const { bus_id, rating, comment }: CreateFeedbackDto = req.body;

    const result = await query(
      `INSERT INTO feedback (user_id, bus_id, rating, comment)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user!.userId, bus_id || null, rating, comment || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function getFeedback(req: Request, res: Response, next: NextFunction) {
  try {
    const { bus_id } = req.query;
    let sql = `
      SELECT f.*, u.display_name, u.photo_url
      FROM feedback f
      JOIN users u ON f.user_id = u.id
    `;
    const params: any[] = [];
    if (bus_id) {
      params.push(bus_id);
      sql += ` WHERE f.bus_id = $1`;
    }
    sql += ' ORDER BY f.created_at DESC LIMIT 50';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function getFeedbackStats(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(`
      SELECT
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating,
        COUNT(*) FILTER (WHERE rating = 5) as five_star,
        COUNT(*) FILTER (WHERE rating = 4) as four_star,
        COUNT(*) FILTER (WHERE rating <= 3) as three_or_below
      FROM feedback
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);
    const r = result.rows[0];
    res.json({
      total_reviews: parseInt(r.total_reviews),
      avg_rating: parseFloat(r.avg_rating || 0).toFixed(1),
      five_star: parseInt(r.five_star),
      four_star: parseInt(r.four_star),
      three_or_below: parseInt(r.three_or_below),
    });
  } catch (err) {
    next(err);
  }
}

// ─── News ─────────────────────────────────────────────────────────────────────

export async function getNews(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(
      'SELECT * FROM news ORDER BY created_at DESC LIMIT 20'
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
}

export async function createNews(req: Request, res: Response, next: NextFunction) {
  try {
    const { title, content } = req.body;
    const result = await query(
      'INSERT INTO news (title, content) VALUES ($1, $2) RETURNING *',
      [title, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
}

// ─── Admin Analytics ──────────────────────────────────────────────────────────

export async function getAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const [ticketStats, feedbackStats, userStats] = await Promise.all([
      query(`
        SELECT
          COUNT(*) as total_tickets,
          COUNT(*) FILTER (WHERE status = 'used') as used_tickets,
          SUM(fare) FILTER (WHERE status = 'used') as total_revenue,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24h') as today_tickets
        FROM tickets
      `),
      query(`
        SELECT AVG(rating) as avg_rating, COUNT(*) as total_feedback
        FROM feedback WHERE created_at > NOW() - INTERVAL '7 days'
      `),
      query(`
        SELECT COUNT(*) as total_users,
               COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as new_users
        FROM users WHERE role = 'user'
      `),
    ]);

    const t = ticketStats.rows[0];
    const f = feedbackStats.rows[0];
    const u = userStats.rows[0];

    res.json({
      tickets: {
        total: parseInt(t.total_tickets),
        used: parseInt(t.used_tickets),
        total_revenue: parseFloat(t.total_revenue || 0),
        today: parseInt(t.today_tickets),
      },
      feedback: {
        avg_rating: parseFloat(f.avg_rating || 0).toFixed(1),
        total: parseInt(f.total_feedback),
      },
      users: {
        total: parseInt(u.total_users),
        new_this_week: parseInt(u.new_users),
      },
    });
  } catch (err) {
    next(err);
  }
}
