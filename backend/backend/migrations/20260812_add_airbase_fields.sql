-- Add missing fields to air_bases table
ALTER TABLE air_bases ADD COLUMN status VARCHAR(50) DEFAULT 'optimal';
ALTER TABLE air_bases ADD COLUMN avtur_stock_liters FLOAT DEFAULT 0.0;
ALTER TABLE air_bases ADD COLUMN refueler_trucks_active INTEGER DEFAULT 0;
ALTER TABLE air_bases ADD COLUMN apron_used INTEGER DEFAULT 0;

-- Rename apron_capacity to apron_capacity_aircraft for consistency
ALTER TABLE air_bases RENAME COLUMN apron_capacity TO apron_capacity_aircraft;

-- Add index for status queries
CREATE INDEX idx_airbase_status ON air_bases(status);
