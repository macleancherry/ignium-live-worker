ALTER TABLE live_timing ADD COLUMN team_name TEXT;
ALTER TABLE live_timing ADD COLUMN class_id INTEGER;
ALTER TABLE live_timing ADD COLUMN class_short_name TEXT;
ALTER TABLE live_timing ADD COLUMN i_rating INTEGER;
ALTER TABLE live_timing ADD COLUMN last_lap_valid INTEGER;
ALTER TABLE live_timing ADD COLUMN best_lap_number INTEGER;
ALTER TABLE live_timing ADD COLUMN in_pits INTEGER;
ALTER TABLE live_timing ADD COLUMN out_lap INTEGER;
ALTER TABLE live_timing ADD COLUMN last_pit_lap INTEGER;

CREATE INDEX IF NOT EXISTS idx_live_timing_subsession_class_position
  ON live_timing (subsession_id, class_position, position);
