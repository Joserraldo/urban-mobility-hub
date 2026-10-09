-- ============================================================
-- UMH · esquema SQLite (local dev con node:sqlite, prod D1)
-- Compatibilidad D1: sin extensiones, sin STRICT, booleans = INTEGER 0/1,
-- tiempos = INTEGER epoch ms, dinero = INTEGER COP.
-- Fuente de verdad de las tablas citadas en ../../entregables/diseno/src/*.puml
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','operator','courier')),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  purpose TEXT NOT NULL CHECK (purpose IN ('datos_personales','biometria')),
  accepted_at INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS biometric_templates (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  cipher_text BLOB NOT NULL,
  iv BLOB NOT NULL,
  auth_tag BLOB NOT NULL
);

CREATE TABLE IF NOT EXISTS hubs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  zone TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  capacity INTEGER NOT NULL,
  charging INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('scooter','bike','drone')),
  model TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('rent','sale')),
  status TEXT NOT NULL DEFAULT 'available'
    CHECK (status IN ('available','reserved','in_use','sold','offline')),
  condition TEXT CHECK (condition IN ('nuevo','seminuevo')),
  price_cop INTEGER,
  rate_per_min_cop INTEGER,
  spec TEXT NOT NULL DEFAULT '',
  battery INTEGER NOT NULL DEFAULT 100 CHECK (battery BETWEEN 0 AND 100),
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  hub_id TEXT REFERENCES hubs(id),
  alert_state TEXT NOT NULL DEFAULT 'ok',
  deliverable INTEGER NOT NULL DEFAULT 0,
  qr_code TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(mode, status);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  modality TEXT NOT NULL CHECK (modality IN ('hub','delivery')),
  address TEXT,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested','active','completed','cancelled')),
  requested_at INTEGER NOT NULL,
  started_at INTEGER,
  ended_at INTEGER,
  total_cost_cop INTEGER
);
CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id, status);

CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  price_cop INTEGER NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'card' CHECK (payment_method IN ('card','pse','cash')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  created_at INTEGER NOT NULL,
  paid_at INTEGER
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('purchase','reservation')),
  owner_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'base' CHECK (kind IN ('base','cargo_viaje')),
  amount_cop INTEGER NOT NULL,
  reference TEXT,
  status TEXT NOT NULL CHECK (status IN ('approved','rejected')),
  reason TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payments_owner ON payments(owner_type, owner_id);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY,
  reservation_id TEXT NOT NULL REFERENCES reservations(id),
  courier_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned','in_progress','delivered','late')),
  deadline_at INTEGER NOT NULL,
  assigned_at INTEGER NOT NULL,
  delivered_at INTEGER,
  reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_deliveries_courier ON deliveries(courier_id, status);

CREATE TABLE IF NOT EXISTS alert_log (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  type TEXT NOT NULL CHECK (type IN ('no_helmet','crash','gps_lost','low_battery')),
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  at INTEGER NOT NULL,
  origin TEXT NOT NULL DEFAULT 'telemetry' CHECK (origin IN ('telemetry','simulator'))
);
CREATE INDEX IF NOT EXISTS idx_alert_log_at ON alert_log(at DESC);

CREATE TABLE IF NOT EXISTS unlock_sessions (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  reservation_id TEXT NOT NULL REFERENCES reservations(id),
  step TEXT NOT NULL DEFAULT 'qr'
    CHECK (step IN ('qr','helmet','ready','denied','expired')),
  reason TEXT,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  delivery_id TEXT REFERENCES deliveries(id),
  channel TEXT NOT NULL DEFAULT 'email',
  provider TEXT NOT NULL DEFAULT 'brevo',
  template TEXT NOT NULL,
  to_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sent','failed','simulated')),
  provider_id TEXT,
  error TEXT,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notification_once
  ON notifications(delivery_id, template, user_id);
