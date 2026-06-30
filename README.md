# 🚌 Green Bus Balochistan — Production App

Smart public transit platform for Quetta & Gwadar. Built for the Government of Balochistan.

## Stack

| Layer       | Technology                               |
|-------------|------------------------------------------|
| Frontend    | React 18 + TypeScript + Tailwind CSS     |
| Backend     | Node.js + Express + TypeScript           |
| Database    | PostgreSQL 16                            |
| Real-time   | Socket.io (WebSocket)                    |
| Auth        | JWT (jsonwebtoken + bcryptjs)            |
| Maps        | OpenStreetMap + React Leaflet            |
| Deployment  | Docker + Docker Compose                  |

---

## Quick Start (Docker)

```bash
# 1. Clone and enter the project
cd greenbus-prod

# 2. Set environment variables
cp .env.example .env
# Edit .env — set DB_PASSWORD and JWT_SECRET

# 3. Build and start all services
docker compose up -d --build

# 4. Check logs
docker compose logs -f backend
```

Visit: http://localhost

---

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16 running locally

### Backend

```bash
cd backend
npm install

# Create database
psql -U postgres -c "CREATE DATABASE greenbus;"
psql -U postgres -d greenbus -f src/models/schema.sql

# Configure
cp .env.example .env
# Edit .env with your DB credentials and JWT_SECRET

# Start dev server
npm run dev

# Seed sample data
npm run seed
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable       | Description                                      |
|----------------|--------------------------------------------------|
| `PORT`         | API server port (default: 3001)                  |
| `DB_HOST`      | PostgreSQL host                                  |
| `DB_PORT`      | PostgreSQL port (default: 5432)                  |
| `DB_NAME`      | Database name (greenbus)                         |
| `DB_USER`      | Database user                                    |
| `DB_PASSWORD`  | Database password                                |
| `JWT_SECRET`   | 64-char random hex — generate with command below |
| `FRONTEND_URL` | Frontend URL for CORS (e.g. http://localhost)    |

Generate JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## API Reference

### Auth
| Method | Endpoint            | Auth | Description        |
|--------|---------------------|------|--------------------|
| POST   | /api/auth/register  | —    | Register new user  |
| POST   | /api/auth/login     | —    | Login, get JWT     |
| GET    | /api/auth/me        | ✓    | Get current user   |
| PATCH  | /api/auth/profile   | ✓    | Update profile     |

### Routes & Stops
| Method | Endpoint               | Auth | Description             |
|--------|------------------------|------|-------------------------|
| GET    | /api/routes            | ✓    | All routes (filterable) |
| GET    | /api/routes/:id        | ✓    | Single route + stops    |
| GET    | /api/stops             | ✓    | All stops               |
| GET    | /api/stops/:id/eta     | ✓    | ETA for a stop          |

### Buses
| Method | Endpoint                    | Auth    | Description         |
|--------|-----------------------------|---------|---------------------|
| GET    | /api/buses                  | ✓       | All buses live      |
| GET    | /api/buses/route/:routeId   | ✓       | Buses on a route    |
| PATCH  | /api/buses/location         | Driver  | Update GPS          |
| PATCH  | /api/buses/:id/status       | Driver  | Update status       |
| PATCH  | /api/buses/:busId/assign-driver | Admin | Assign driver   |
| GET    | /api/buses/stats            | Admin   | Fleet stats         |

### Tickets & Wallet
| Method | Endpoint             | Auth  | Description           |
|--------|----------------------|-------|-----------------------|
| POST   | /api/tickets/buy     | ✓     | Purchase ticket       |
| GET    | /api/tickets         | ✓     | My tickets            |
| POST   | /api/tickets/validate| Driver| Validate ticket (QR)  |
| POST   | /api/wallet/topup    | ✓     | Top up balance        |
| GET    | /api/wallet/history  | ✓     | Transaction history   |

### Alerts, Feedback, News
| Method | Endpoint          | Auth  | Description        |
|--------|-------------------|-------|--------------------|
| GET    | /api/alerts       | ✓     | Active alerts      |
| POST   | /api/alerts       | Admin | Broadcast alert    |
| DELETE | /api/alerts/:id   | Admin | Deactivate alert   |
| POST   | /api/feedback     | ✓     | Submit rating      |
| GET    | /api/feedback     | ✓     | All feedback       |
| GET    | /api/news         | ✓     | News items         |
| GET    | /api/admin/analytics | Admin | Full analytics  |

---

## Socket.io Events

### Server → Client
| Event                  | Data                              | Description             |
|------------------------|-----------------------------------|-------------------------|
| `bus:location_updated` | `{ bus_id, lat, lng, seats, ts }` | Live GPS update         |
| `bus:status_changed`   | `{ bus_id, status }`              | Bus status change       |
| `alert:new`            | `Alert`                           | New service alert       |
| `ticket:validated`     | `{ ticket_id, bus_id }`           | Ticket scanned          |

### Client → Server
| Event                   | Data                              | Description              |
|-------------------------|-----------------------------------|--------------------------|
| `driver:update_location`| `{ bus_id, lat, lng, seats }`     | Driver pushes GPS        |
| `subscribe:route`       | `routeId`                         | Subscribe to route feed  |
| `unsubscribe:route`     | `routeId`                         | Unsubscribe              |

---

## Demo Accounts (after seed)

| Role   | Email                   | Password   |
|--------|-------------------------|------------|
| Admin  | admin@greenbus.pk       | admin123   |
| Driver | driver@greenbus.pk      | driver123  |

---

## Seeded Routes

| ID  | Name                           | Type  | Fare  |
|-----|--------------------------------|-------|-------|
| R1  | Quetta Express (UoB – Cantt)   | Green | PKR 40|
| R2  | Women Special (Sariab – Cantt) | Pink  | PKR 30|
| R3  | Gwadar Port Shuttle            | Green | PKR 40|
| T1  | Quetta Heritage Tour           | Green | PKR100|
| T2  | Gwadar Beach Explorer          | Green | PKR150|

---

## Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Deploy backend
cd backend
railway init
railway add postgresql
railway up

# Deploy frontend (set VITE_API_URL env var to backend URL)
cd ../frontend
railway init
railway up
```

---

## Security Notes

- All API routes require JWT authentication except `/auth/login` and `/auth/register`
- Admin endpoints require `role: admin` claim in JWT
- Driver endpoints require `role: driver` claim
- Wallet top-up uses Firestore transaction — prevents race conditions
- Ticket validation uses PostgreSQL `FOR UPDATE` lock — prevents double-spend
- Rate limiting: 300 req/15min general, 20 req/15min on auth routes
- Helmet.js sets secure HTTP headers
- CORS restricted to `FRONTEND_URL` env variable
