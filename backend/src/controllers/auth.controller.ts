import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../models/db';
import { generateToken } from '../middleware/auth';
import { AppError } from '../middleware/errors';
import { RegisterDto, LoginDto, UserRole, Gender } from '../types';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, display_name, gender }: RegisterDto = req.body;

    // Check existing
    const existing = await query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      throw new AppError('Email already registered', 409);
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await query<{
      id: string; email: string; display_name: string;
      wallet_balance: string; reward_points: number; carbon_saved: string;
      role: UserRole; gender: Gender; created_at: Date;
    }>(
      `INSERT INTO users (email, password_hash, display_name, gender, wallet_balance)
       VALUES ($1, $2, $3, $4, 200.00)
       RETURNING id, email, display_name, wallet_balance, reward_points,
                 carbon_saved, role, gender, created_at`,
      [email.toLowerCase(), password_hash, display_name, gender || null]
    );

    const user = result.rows[0];
    const token = generateToken({ userId: user.id, role: user.role });

    res.status(201).json({
      token,
      user: {
        ...user,
        wallet_balance: parseFloat(user.wallet_balance),
        carbon_saved: parseFloat(user.carbon_saved),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password }: LoginDto = req.body;

    const result = await query<{
      id: string; email: string; display_name: string; password_hash: string;
      wallet_balance: string; reward_points: number; carbon_saved: string;
      role: UserRole; gender: Gender; photo_url: string; assigned_bus_id: string;
      created_at: Date; updated_at: Date;
    }>(
      `SELECT id, email, display_name, password_hash, wallet_balance, reward_points,
              carbon_saved, role, gender, photo_url, assigned_bus_id, created_at, updated_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    const user = result.rows[0];
    if (!user) throw new AppError('Invalid email or password', 401);

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) throw new AppError('Invalid email or password', 401);

    const { password_hash, ...safeUser } = user;
    const token = generateToken({ userId: user.id, role: user.role });

    res.json({
      token,
      user: {
        ...safeUser,
        wallet_balance: parseFloat(user.wallet_balance),
        carbon_saved: parseFloat(user.carbon_saved),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await query(
      `SELECT id, email, display_name, wallet_balance, reward_points,
              carbon_saved, role, gender, photo_url, assigned_bus_id, created_at, updated_at
       FROM users WHERE id = $1`,
      [req.user!.userId]
    );

    if (!result.rows[0]) throw new AppError('User not found', 404);

    const u = result.rows[0];
    res.json({
      ...u,
      wallet_balance: parseFloat(u.wallet_balance),
      carbon_saved: parseFloat(u.carbon_saved),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const { display_name, gender } = req.body;

    const result = await query(
      `UPDATE users
       SET display_name = COALESCE($1, display_name),
           gender = COALESCE($2, gender)
       WHERE id = $3
       RETURNING id, email, display_name, wallet_balance, reward_points,
                 carbon_saved, role, gender, photo_url, created_at, updated_at`,
      [display_name || null, gender || null, req.user!.userId]
    );

    const u = result.rows[0];
    res.json({
      ...u,
      wallet_balance: parseFloat(u.wallet_balance),
      carbon_saved: parseFloat(u.carbon_saved),
    });
  } catch (err) {
    next(err);
  }
}
