-- D1 Database Schema for SSReports

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'viewer',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Shops table (synced from MySQL)
CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY,
  name TEXT,
  address TEXT,
  latitude REAL,
  longitude REAL
);

-- Checkins table (synced from MySQL)
CREATE TABLE IF NOT EXISTS checkins (
  id INTEGER PRIMARY KEY,
  agent_id INTEGER,
  shop_id INTEGER,
  timestamp TEXT,
  latitude REAL,
  longitude REAL,
  photo_path TEXT,
  photo_base64 TEXT,
  additional_photos_base64 TEXT,
  notes TEXT,
  status TEXT,
  brand_id INTEGER,
  category_id INTEGER,
  product_id INTEGER
);

-- Visit responses table (synced from MySQL)
CREATE TABLE IF NOT EXISTS visit_responses (
  id INTEGER PRIMARY KEY,
  checkin_id INTEGER,
  visit_type TEXT,
  responses TEXT,
  converted INTEGER DEFAULT 0,
  already_betting INTEGER DEFAULT 0,
  created_at TEXT
);

-- Agent performance aggregated table
CREATE TABLE IF NOT EXISTS agent_performance (
  agent_id INTEGER PRIMARY KEY,
  agent_name TEXT,
  checkin_count INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate REAL DEFAULT 0
);

-- Checkins by hour aggregated table
CREATE TABLE IF NOT EXISTS checkins_by_hour (
  hour INTEGER PRIMARY KEY,
  count INTEGER DEFAULT 0
);

-- Checkins by day aggregated table
CREATE TABLE IF NOT EXISTS checkins_by_day (
  day_num INTEGER PRIMARY KEY,
  day_name TEXT,
  count INTEGER DEFAULT 0
);

-- Checkins by month aggregated table
CREATE TABLE IF NOT EXISTS checkins_by_month (
  month TEXT PRIMARY KEY,
  count INTEGER DEFAULT 0
);

-- Geographic hotspots
CREATE TABLE IF NOT EXISTS geographic_hotspots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  latitude REAL,
  longitude REAL,
  count INTEGER DEFAULT 0
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON checkins(timestamp);
CREATE INDEX IF NOT EXISTS idx_checkins_agent ON checkins(agent_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON checkins(status);
CREATE INDEX IF NOT EXISTS idx_checkins_location ON checkins(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_visit_responses_checkin ON visit_responses(checkin_id);

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (email, password_hash, name, role) 
VALUES ('admin@ssreports.com', '240be518fabd2724ddb6f04eeb9d5b0e3a0e4e6f5c5c5c5c5c5c5c5c5c5c5c5c', 'Admin', 'admin');
