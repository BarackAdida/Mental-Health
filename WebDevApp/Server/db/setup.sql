-- db/setup.sql — Mental Health App schema (safe to re-run)
BEGIN;

-- =========================================================
-- users (auth)
-- =========================================================
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- doctors
-- =========================================================
-- NOTE: your routes/doctors.js exists but the original schema had no
-- doctors table. If doctors are a separate entity, this is a sensible
-- starting shape — adjust to match what doctors.js actually SELECTs.
CREATE TABLE IF NOT EXISTS doctors (
  id             SERIAL PRIMARY KEY,
  user_id        INT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name           VARCHAR(255) NOT NULL,
  specialty      VARCHAR(255),
  bio            TEXT,
  location       VARCHAR(255) NOT NULL DEFAULT 'TBA',
  available      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- events
-- =========================================================
CREATE TABLE IF NOT EXISTS events (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  location    VARCHAR(255) NOT NULL DEFAULT 'TBA',
  start_time  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- user_saved_events
-- =========================================================
CREATE TABLE IF NOT EXISTS user_saved_events (
  user_id  INT NOT NULL REFERENCES users(id)  ON DELETE CASCADE,
  event_id INT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, event_id)
);

-- =========================================================
-- Indexes
-- =========================================================
CREATE INDEX IF NOT EXISTS idx_events_start_time
  ON events (start_time);
CREATE INDEX IF NOT EXISTS idx_events_cancelled_start_time
  ON events (cancelled, start_time);
CREATE INDEX IF NOT EXISTS idx_user_saved_events_event_id
  ON user_saved_events (event_id);
CREATE INDEX IF NOT EXISTS idx_doctors_available
  ON doctors (available) WHERE available;

-- =========================================================
-- updated_at auto-touch
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_events_set_updated_at  ON events;
CREATE TRIGGER trg_events_set_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_doctors_set_updated_at ON doctors;
CREATE TRIGGER trg_doctors_set_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;