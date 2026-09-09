-- Formal migration for flight mission module
-- Converts status columns to ENUM and aligns schema with ORM models

ALTER TABLE air_bases
  MODIFY COLUMN status ENUM('optimal','warning','critical') NOT NULL DEFAULT 'optimal';

ALTER TABLE flight_missions
  MODIFY COLUMN status ENUM('Scheduled','In-Flight','Arrived','Diverted') NOT NULL DEFAULT 'Scheduled';

ALTER TABLE users
  MODIFY COLUMN role VARCHAR(50) NOT NULL DEFAULT 'Analyst';
