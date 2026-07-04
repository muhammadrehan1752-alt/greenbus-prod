import { Router } from 'express';
import { body, param, query as qv } from 'express-validator';
import { authenticate, requireRole } from '../middleware/auth';
import { UserRole } from '../types';

// Controllers
import * as auth from '../controllers/auth.controller';
import * as bus from '../controllers/bus.controller';
import * as routes from '../controllers/routes.controller';
import * as tickets from '../controllers/ticket.controller';
import * as misc from '../controllers/misc.controller';

const router = Router();

// ─── Validation middleware ────────────────────────────────────────────────────
function validate(req: any, res: any, next: any) {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/register',
  body('email').isEmail().normalizeEmail().not().contains('test').not().contains('fake'),
  body('password').isLength({ min: 6 }),
  body('display_name').trim().isLength({ min: 2, max: 80 }),
  validate,
  auth.register
);
router.post('/auth/login',
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  validate,
  auth.login
);
router.get('/auth/me', authenticate, auth.me);
router.patch('/auth/profile', authenticate, auth.updateProfile);

// ─── Routes & Stops ───────────────────────────────────────────────────────────
router.get('/routes', authenticate, routes.getAllRoutes);
router.get('/routes/:id', authenticate, routes.getRouteById);
router.get('/stops', authenticate, routes.getAllStops);
router.get('/stops/:stopId/eta', authenticate, routes.getStopETA);

// ─── Buses ────────────────────────────────────────────────────────────────────
router.get('/buses', authenticate, bus.getAllBuses);
router.get('/buses/stats', authenticate, requireRole(UserRole.ADMIN), bus.getFleetStats);
router.get('/buses/route/:routeId', authenticate, bus.getBusByRoute);
router.get('/buses/:id', authenticate, bus.getBusById);
router.post('/buses',
  authenticate, requireRole(UserRole.ADMIN),
  body('id').notEmpty(),
  body('type').isIn(['green', 'pink']),
  validate,
  bus.createBus
);
router.patch('/buses/location',
  authenticate, requireRole(UserRole.DRIVER, UserRole.ADMIN),
  body('bus_id').notEmpty(),
  body('latitude').isFloat({ min: -90, max: 90 }),
  body('longitude').isFloat({ min: -180, max: 180 }),
  validate,
  bus.updateBusLocation
);
router.patch('/buses/:id/status',
  authenticate, requireRole(UserRole.DRIVER, UserRole.ADMIN),
  body('status').isIn(['active', 'maintenance', 'inactive']),
  validate,
  bus.updateBusStatus
);
router.patch('/buses/:busId/assign-driver',
  authenticate, requireRole(UserRole.ADMIN),
  body('driver_id').isUUID(),
  validate,
  bus.assignDriver
);

// ─── Tickets & Wallet ─────────────────────────────────────────────────────────
router.post('/tickets/buy',
  authenticate,
  body('route_id').notEmpty(),
  validate,
  tickets.buyTicket
);
router.get('/tickets', authenticate, tickets.getMyTickets);
router.post('/tickets/validate',
  authenticate, requireRole(UserRole.DRIVER, UserRole.ADMIN),
  body('ticket_id').isUUID(),
  validate,
  tickets.validateTicket
);
router.post('/wallet/topup',
  authenticate,
  body('amount').isFloat({ min: 10, max: 10000 }),
  validate,
  tickets.topUpWallet
);
router.get('/wallet/history', authenticate, tickets.getWalletHistory);

// ─── Alerts ───────────────────────────────────────────────────────────────────
router.get('/alerts', authenticate, misc.getActiveAlerts);
router.post('/alerts',
  authenticate, requireRole(UserRole.ADMIN),
  body('type').isIn(['delay', 'disruption', 'info']),
  body('message').trim().isLength({ min: 5, max: 500 }),
  validate,
  misc.createAlert
);
router.delete('/alerts/:id',
  authenticate, requireRole(UserRole.ADMIN),
  misc.deactivateAlert
);

// ─── Feedback ─────────────────────────────────────────────────────────────────
router.post('/feedback',
  authenticate,
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().trim().isLength({ max: 1000 }),
  validate,
  misc.submitFeedback
);
router.get('/feedback', authenticate, misc.getFeedback);
router.get('/feedback/stats', authenticate, misc.getFeedbackStats);

// ─── News ─────────────────────────────────────────────────────────────────────
router.get('/news', authenticate, misc.getNews);
router.post('/news',
  authenticate, requireRole(UserRole.ADMIN),
  body('title').trim().isLength({ min: 3, max: 200 }),
  body('content').trim().isLength({ min: 10 }),
  validate,
  misc.createNews
);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/admin/analytics',
  authenticate, requireRole(UserRole.ADMIN),
  misc.getAnalytics
);

export default router;
