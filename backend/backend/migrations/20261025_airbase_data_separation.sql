ALTER TABLE air_bases ADD UNIQUE KEY uq_air_bases_icao (icao);

CREATE TABLE IF NOT EXISTS airbase_references (
  id INT PRIMARY KEY AUTO_INCREMENT,
  airbase_id INT NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NULL,
  code VARCHAR(10) NULL,
  icao VARCHAR(10) NULL UNIQUE,
  latitude DOUBLE NOT NULL,
  longitude DOUBLE NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_airbase_references_airbase FOREIGN KEY (airbase_id) REFERENCES air_bases(id) ON DELETE CASCADE,
  CONSTRAINT ck_airbase_references_latitude CHECK (latitude BETWEEN -90 AND 90),
  CONSTRAINT ck_airbase_references_longitude CHECK (longitude BETWEEN -180 AND 180)
);

CREATE TABLE IF NOT EXISTS airbase_operational_data (
  id INT PRIMARY KEY AUTO_INCREMENT,
  airbase_id INT NOT NULL UNIQUE,
  avtur_capacity_liters DOUBLE NOT NULL DEFAULT 0,
  avtur_stock_liters DOUBLE NOT NULL DEFAULT 0,
  refueler_trucks_count INT NOT NULL DEFAULT 0,
  refueler_trucks_active INT NOT NULL DEFAULT 0,
  apron_capacity_aircraft INT NOT NULL DEFAULT 0,
  apron_used INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'optimal',
  updated_by INT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_airbase_operational_airbase FOREIGN KEY (airbase_id) REFERENCES air_bases(id) ON DELETE CASCADE,
  CONSTRAINT ck_airbase_operational_stock CHECK (avtur_stock_liters >= 0 AND avtur_stock_liters <= avtur_capacity_liters)
);

CREATE TABLE IF NOT EXISTS airbase_readiness_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  airbase_id INT NOT NULL,
  apron_capacity_aircraft INT NOT NULL,
  apron_used INT NOT NULL,
  refueler_trucks_count INT NOT NULL,
  refueler_trucks_active INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  changed_by INT NULL,
  created_at DATETIME NOT NULL,
  INDEX ix_airbase_readiness_airbase_created (airbase_id, created_at),
  CONSTRAINT fk_airbase_readiness_airbase FOREIGN KEY (airbase_id) REFERENCES air_bases(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS airbase_import_batches (
  id INT PRIMARY KEY AUTO_INCREMENT,
  status VARCHAR(20) NOT NULL DEFAULT 'PREVIEW',
  filename VARCHAR(255) NOT NULL,
  created_by INT NULL,
  created_at DATETIME NOT NULL,
  committed_at DATETIME NULL,
  snapshot_json TEXT NULL
);

CREATE TABLE IF NOT EXISTS airbase_import_rows (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT NOT NULL,
  source_row_number INT NOT NULL,
  payload_json TEXT NOT NULL,
  error VARCHAR(500) NULL,
  INDEX ix_airbase_import_rows_batch (batch_id),
  CONSTRAINT fk_airbase_import_rows_batch FOREIGN KEY (batch_id) REFERENCES airbase_import_batches(id) ON DELETE CASCADE
);
