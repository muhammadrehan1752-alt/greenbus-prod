-- Green Bus Balochistan - PostgreSQL Schema
-- Run: psql -U postgres -d greenbus -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy search

-- ─── Users ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  display_name  VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  photo_url     TEXT,
  wallet_balance DECIMAL(10, 2) NOT NULL DEFAULT 200.00,
  gender        VARCHAR(50) CHECK (gender IN ('male','female','other','prefer_not_to_say')),
  reward_points INTEGER NOT NULL DEFAULT 0,
  carbon_saved  DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  role          VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin','driver')),
  assigned_bus_id VARCHAR(20),
  refresh_token  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ─── Stops ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stops (
  id          VARCHAR(50) PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  latitude    DECIMAL(10, 8) NOT NULL,
  longitude   DECIMAL(11, 8) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stops_location ON stops(latitude, longitude);

-- ─── Routes ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS routes (
  id          VARCHAR(20) PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  type        VARCHAR(10) NOT NULL CHECK (type IN ('green','pink')),
  fare        DECIMAL(8, 2) NOT NULL DEFAULT 40.00,
  is_tourist  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Route Stops (ordered) ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS route_stops (
  route_id    VARCHAR(20) NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  stop_id     VARCHAR(50) NOT NULL REFERENCES stops(id) ON DELETE CASCADE,
  stop_order  SMALLINT NOT NULL,
  PRIMARY KEY (route_id, stop_id)
);

CREATE INDEX IF NOT EXISTS idx_route_stops_route ON route_stops(route_id, stop_order);

-- ─── Buses ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buses (
  id              VARCHAR(20) PRIMARY KEY,
  route_id        VARCHAR(20) REFERENCES routes(id) ON DELETE SET NULL,
  type            VARCHAR(10) NOT NULL CHECK (type IN ('green','pink')),
  latitude        DECIMAL(10, 8) NOT NULL,
  longitude       DECIMAL(11, 8) NOT NULL,
  capacity        SMALLINT NOT NULL DEFAULT 40,
  occupied_seats  SMALLINT NOT NULL DEFAULT 0,
  status          VARCHAR(20) NOT NULL DEFAULT 'inactive' CHECK (status IN ('active','maintenance','inactive')),
  driver_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  last_updated    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buses_route ON buses(route_id);
CREATE INDEX IF NOT EXISTS idx_buses_status ON buses(status);
CREATE INDEX IF NOT EXISTS idx_buses_location ON buses(latitude, longitude);

-- ─── Tickets ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tickets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  route_id    VARCHAR(20) NOT NULL REFERENCES routes(id),
  status      VARCHAR(20) NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','used','expired')),
  fare        DECIMAL(8, 2) NOT NULL,
  qr_code     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at     TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_expires ON tickets(expires_at) WHERE status = 'valid';

-- ─── Feedback ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS feedback (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bus_id      VARCHAR(20) REFERENCES buses(id) ON DELETE SET NULL,
  rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_bus ON feedback(bus_id);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);

-- ─── Alerts ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS alerts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        VARCHAR(20) NOT NULL CHECK (type IN ('delay','disruption','info')),
  message     TEXT NOT NULL,
  route_id    VARCHAR(20) REFERENCES routes(id) ON DELETE SET NULL,
  created_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_active, created_at DESC);

-- ─── News ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS news (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(500) NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Wallet Transactions ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount          DECIMAL(10, 2) NOT NULL,
  type            VARCHAR(20) NOT NULL CHECK (type IN ('topup','purchase','refund')),
  reference       TEXT,
  balance_after   DECIMAL(10, 2) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_user ON wallet_transactions(user_id, created_at DESC);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Expire tickets job function ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION expire_old_tickets()
RETURNS void AS $$
BEGIN
  UPDATE tickets SET status = 'expired'
  WHERE status = 'valid' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
