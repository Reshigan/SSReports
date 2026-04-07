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

-- Shops table (synced from MySQL and FieldVibe)
CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY,
  name TEXT,
  address TEXT,
  latitude REAL,
  longitude REAL,
  data_source TEXT DEFAULT 'salessync',
  fv_id TEXT
);

-- Checkins table (synced from MySQL and FieldVibe)
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
  product_id INTEGER,
  data_source TEXT DEFAULT 'salessync',
  fv_id TEXT,
  individual_name TEXT,
  individual_surname TEXT,
  individual_phone TEXT
);

-- Visit responses table (synced from MySQL and FieldVibe)
CREATE TABLE IF NOT EXISTS visit_responses (
  id INTEGER PRIMARY KEY,
  checkin_id INTEGER,
  visit_type TEXT,
  responses TEXT,
  converted INTEGER DEFAULT 0,
  already_betting INTEGER DEFAULT 0,
  created_at TEXT,
  data_source TEXT DEFAULT 'salessync',
  fv_id TEXT
);

-- Agent performance aggregated table
CREATE TABLE IF NOT EXISTS agent_performance (
  agent_id INTEGER PRIMARY KEY,
  agent_name TEXT,
  checkin_count INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  conversion_rate REAL DEFAULT 0,
  data_source TEXT DEFAULT 'salessync',
  fv_agent_id TEXT
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

-- Sync metadata table to track last sync timestamps
CREATE TABLE IF NOT EXISTS sync_metadata (
  source TEXT PRIMARY KEY,
  last_sync_at TEXT,
  records_synced INTEGER DEFAULT 0,
  status TEXT DEFAULT 'idle'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_checkins_timestamp ON checkins(timestamp);
CREATE INDEX IF NOT EXISTS idx_checkins_agent ON checkins(agent_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON checkins(status);
CREATE INDEX IF NOT EXISTS idx_checkins_location ON checkins(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_checkins_source ON checkins(data_source);
CREATE INDEX IF NOT EXISTS idx_visit_responses_checkin ON visit_responses(checkin_id);
CREATE INDEX IF NOT EXISTS idx_visit_responses_source ON visit_responses(data_source);
CREATE INDEX IF NOT EXISTS idx_shops_source ON shops(data_source);
CREATE INDEX IF NOT EXISTS idx_agent_performance_source ON agent_performance(data_source);

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (email, password_hash, name, role) 
VALUES ('admin@ssreports.com', '240be518fabd2724ddb6f04eeb9d5b0e3a0e4e6f5c5c5c5c5c5c5c5c5c5c5c5c', 'Admin', 'admin');

-- Insert goldrush user (password: goldrush)
INSERT OR IGNORE INTO users (email, password_hash, name, role) 
VALUES ('goldrush@ssreports.com', '2c6451a7bf9cf5b2aa91b1d20c8f729be95cb0db780cca946a860f047cb66573', 'Goldrush', 'viewer');
