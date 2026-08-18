-- Add missing fields to air_bases table
ALTER TABLE air_bases ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'optimal';
ALTER TABLE air_bases ADD COLUMN IF NOT EXISTS avtur_stock_liters FLOAT DEFAULT 0.0;
ALTER TABLE air_bases ADD COLUMN IF NOT EXISTS refueler_trucks_active INTEGER DEFAULT 0;
ALTER TABLE air_bases ADD COLUMN IF NOT EXISTS apron_used INTEGER DEFAULT 0;

-- Rename apron_capacity to apron_capacity_aircraft for consistency
ALTER TABLE air_bases RENAME COLUMN apron_capacity TO apron_capacity_aircraft;

-- Add index for status queries
CREATE INDEX IF NOT EXISTS idx_airbase_status ON air_bases(status);
