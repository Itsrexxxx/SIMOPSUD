ALTER TABLE aircraft_units
  ADD COLUMN airbase_id INT NULL,
  ADD INDEX idx_aircraft_units_airbase_id (airbase_id),
  ADD CONSTRAINT fk_aircraft_units_airbase
    FOREIGN KEY (airbase_id) REFERENCES air_bases(id)
    ON DELETE SET NULL;