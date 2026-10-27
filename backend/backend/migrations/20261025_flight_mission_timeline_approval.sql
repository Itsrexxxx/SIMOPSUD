ALTER TABLE flight_missions ADD COLUMN eta_variance_minutes FLOAT NULL;
ALTER TABLE flight_missions ADD COLUMN delay_reason VARCHAR(500) NULL;
ALTER TABLE flight_missions ADD COLUMN approved_by INT NULL;
ALTER TABLE flight_missions ADD COLUMN approved_at DATETIME NULL;
