-- CREATE TABLE IF NOT EXISTS users (
--   id SERIAL PRIMARY KEY,
--   username VARCHAR(255) UNIQUE NOT NULL,
--   password_hash VARCHAR(255) NOT NULL,
--   is_admin BOOLEAN DEFAULT FALSE,
--   created_at TIMESTAMP DEFAULT NOW()
-- );

-- CREATE TABLE IF NOT EXISTS events (
--   id SERIAL PRIMARY KEY,
--   title VARCHAR(255) NOT NULL,
--   date DATE NOT NULL,
--   description TEXT,
--   created_at TIMESTAMP DEFAULT NOW(),
--   updated_at TIMESTAMP DEFAULT NOW()
-- );

-- ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);

-- Table for saved events (user favorites)
-- CREATE TABLE IF NOT EXISTS user_saved_events (
--   user_id INT REFERENCES users(id) ON DELETE CASCADE,
--   event_id INT REFERENCES events(id) ON DELETE CASCADE,
--   saved_at TIMESTAMP DEFAULT NOW(),
--   PRIMARY KEY (user_id, event_id)
-- );

ALTER TABLE events  ADD COLUMN IF NOT EXISTS location TEXT;