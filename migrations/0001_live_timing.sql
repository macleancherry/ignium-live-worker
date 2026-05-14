CREATE TABLE IF NOT EXISTS live_timing (
  session_id TEXT NOT NULL,
  subsession_id TEXT NOT NULL,
  customer_id INTEGER NOT NULL,
  driver_name TEXT NOT NULL,
  car_number TEXT NOT NULL,
  position INTEGER NOT NULL,
  class_position INTEGER NOT NULL,
  lap INTEGER NOT NULL,
  last_lap REAL,
  best_lap REAL,
  interval_s REAL,
  gap_s REAL,
  updated_at TEXT NOT NULL,
  received_at TEXT NOT NULL,
  PRIMARY KEY (subsession_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_live_timing_subsession_position
  ON live_timing (subsession_id, position);

CREATE INDEX IF NOT EXISTS idx_live_timing_received
  ON live_timing (received_at);
