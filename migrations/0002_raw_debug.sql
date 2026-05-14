CREATE TABLE IF NOT EXISTS raw_ingest_debug (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  captured_at TEXT,
  received_at TEXT NOT NULL,
  payload_json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_raw_ingest_debug_received
  ON raw_ingest_debug (received_at DESC);
