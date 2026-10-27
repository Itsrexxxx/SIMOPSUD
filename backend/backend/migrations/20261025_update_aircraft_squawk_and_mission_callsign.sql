ALTER TABLE aircraft_units ADD COLUMN squawk_discrepancy TEXT NULL;
ALTER TABLE aircraft_units ADD COLUMN is_manually_grounded BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE users MODIFY COLUMN nip VARCHAR(50) NOT NULL;

ALTER TABLE flight_missions
  MODIFY COLUMN status ENUM('Scheduled','In-Flight','Completed','Cancelled','Arrived','Diverted','Delayed')
  NOT NULL DEFAULT 'Scheduled';
