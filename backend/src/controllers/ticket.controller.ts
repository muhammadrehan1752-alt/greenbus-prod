import { Request, Response, NextFunction } from 'express';
import QRCode from 'qrcode';
import { withTransaction } from '../models/db';
import { AppError } from '../middleware/errors';
import { TicketStatus, BuyTicketDto } from '../types';
import { PoolClient } from 'pg';

export async function buyTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const { route_id }: BuyTicketDto = req.body;
    const userId = req.user!.userId;

    const ticket = await withTransaction(async (client: PoolClient) => {
      // 1. Get route fare
      const routeResult = await client.query(
        'SELECT fare FROM routes WHERE id = $1',
        [route_id]
      );
      if (!routeResult.rows[0]) throw new AppError('Route not found', 404);
      const fare = parseFloat(routeResult.rows[0].fare);

      // 2. Check wallet balance (lock row)
      const userResult = await client.query(
        'SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE',
        [userId]
      );
      const balance = parseFloat(userResult.rows[0]?.wallet_balance ?? 0);
      if (balance < fare) {
        throw new AppError(`Insufficient balance. Need PKR ${fare}, have PKR ${balance.toFixed(2)}`, 402);
      }

      // 3. Deduct from wallet
      await client.query(
        'UPDATE users SET wallet_balance = wallet_balance - $1 WHERE id = $2',
        [fare, userId]
      );

      // 4. Create ticket
      const ticketResult = await client.query<{ id: string }>(
        `INSERT INTO tickets (user_id, route_id, fare, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')
         RETURNING id`,
        [userId, route_id, fare]
      );
      const ticketId = ticketResult.rows[0].id;

      // 5. Generate QR
      const qrPayload = JSON.stringify({
        id: ticketId,
        route: route_id,
        fare,
        issued: new Date().toISOString(),
      });
      const qrCode = await QRCode.toDataURL(qrPayload, { errorCorrectionLevel: 'M' });

      await client.query('UPDATE tickets SET qr_code = $1 WHERE id = $2', [qrCode, ticketId]);

      // 6. Log wallet transaction
      const newBalance = balance - fare;
      await client.query(
        `INSERT INTO wallet_transactions (user_id, amount, type, reference, balance_after)
         VALUES ($1, $2, 'purchase', $3, $4)`,
        [userId, -fare, ticketId, newBalance]
      );

      return {
        id: ticketId,
        user_id: userId,
        route_id,
        fare,
        status: 'valid',
        qr_code: qrCode,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
        new_wallet_balance: newBalance,
      };
    });

    res.status(201).json(ticket);
  } catch (err) {
    next(err);
  }
}

export async function getMyTickets(req: Request, res: Response, next: NextFunction) {
  try {
    const { status } = req.query;
    let sql = `
      SELECT t.*, r.name as route_name, r.type as route_type
      FROM tickets t
      JOIN routes r ON t.route_id = r.id
      WHERE t.user_id = $1
    `;
    const params: any[] = [req.user!.userId];

    if (status) {
      params.push(status);
      sql += ` AND t.status = $${params.length}`;
    }

    sql += ' ORDER BY t.created_at DESC LIMIT 50';
    const result = await require('../models/db').query(sql, params);

    res.json(result.rows.map((t: any) => ({
      ...t,
      fare: parseFloat(t.fare),
    })));
  } catch (err) {
    next(err);
  }
}

export async function validateTicket(req: Request, res: Response, next: NextFunction) {
  try {
    const { ticket_id } = req.body;

    const ticket = await withTransaction(async (client: PoolClient) => {
      const result = await client.query(
        `SELECT * FROM tickets WHERE id = $1 FOR UPDATE`,
        [ticket_id]
      );
      const t = result.rows[0];
      if (!t) throw new AppError('Ticket not found', 404);
      if (t.status === 'used') throw new AppError('Ticket already used', 409);
      if (t.status === 'expired') throw new AppError('Ticket has expired', 410);
      if (new Date(t.expires_at) < new Date()) {
        await client.query(`UPDATE tickets SET status = 'expired' WHERE id = $1`, [ticket_id]);
        throw new AppError('Ticket has expired', 410);
      }

      // Mark used + award eco points
      await client.query(
        `UPDATE tickets SET status = 'used', used_at = NOW() WHERE id = $1`,
        [ticket_id]
      );
      await client.query(
        `UPDATE users SET reward_points = reward_points + 10,
                          carbon_saved = carbon_saved + 2.1
         WHERE id = $1`,
        [t.user_id]
      );

      return { ...t, status: 'used', used_at: new Date().toISOString() };
    });

    // Broadcast validation event via socket
    const { getIO } = await import('../services/socket.service');
    getIO().emit('ticket:validated', {
      ticket_id,
      bus_id: req.body.bus_id,
    });

    res.json({ success: true, ticket });
  } catch (err) {
    next(err);
  }
}

export async function topUpWallet(req: Request, res: Response, next: NextFunction) {
  try {
    const { amount } = req.body;
    const userId = req.user!.userId;

    if (amount <= 0 || amount > 10000) {
      throw new AppError('Invalid top-up amount (1–10,000 PKR)', 400);
    }

    const result = await withTransaction(async (client: PoolClient) => {
      await client.query(
        'UPDATE users SET wallet_balance = wallet_balance + $1 WHERE id = $2',
        [amount, userId]
      );
      const r = await client.query(
        'SELECT wallet_balance FROM users WHERE id = $1',
        [userId]
      );
      const newBalance = parseFloat(r.rows[0].wallet_balance);

      await client.query(
        `INSERT INTO wallet_transactions (user_id, amount, type, balance_after)
         VALUES ($1, $2, 'topup', $3)`,
        [userId, amount, newBalance]
      );

      return newBalance;
    });

    res.json({ wallet_balance: result, message: `PKR ${amount} added successfully` });
  } catch (err) {
    next(err);
  }
}

export async function getWalletHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await require('../models/db').query(
      `SELECT * FROM wallet_transactions WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 30`,
      [req.user!.userId]
    );
    res.json(result.rows.map((t: any) => ({
      ...t,
      amount: parseFloat(t.amount),
      balance_after: parseFloat(t.balance_after),
    })));
  } catch (err) {
    next(err);
  }
}
