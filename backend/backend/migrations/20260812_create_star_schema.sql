-- Star Schema for Probe Ops (MABES TNI AU)
-- Dimensions: aircraft_type, aircraft_unit, airbase, scenario, date
-- Fact: deployments (measures: flight_hours, sorties, maintenance_count)

CREATE TABLE IF NOT EXISTS dim_date (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  year INT NOT NULL,
  quarter INT NOT NULL,
  month INT NOT NULL,
  day INT NOT NULL,
  weekday INT NOT NULL,
  UNIQUE KEY (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dim_aircraft_type (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(512),
  UNIQUE KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dim_aircraft_unit (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tail_number VARCHAR(255) NOT NULL,
  aircraft_type_id INT NOT NULL,
  accumulated_flight_hours DOUBLE DEFAULT 0,
  status VARCHAR(64),
  UNIQUE KEY (tail_number),
  FOREIGN KEY (aircraft_type_id) REFERENCES dim_aircraft_type(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dim_airbase (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  avtur_capacity_liters DOUBLE DEFAULT 0,
  special_lube_stock_liters DOUBLE DEFAULT 0,
  refueler_trucks_count INT DEFAULT 0,
  forklifts_count INT DEFAULT 0,
  apron_capacity INT DEFAULT 0,
  UNIQUE KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS dim_scenario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description VARCHAR(512),
  start_date DATE,
  end_date DATE,
  UNIQUE KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS fact_deployments (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  date_id INT NOT NULL,
  scenario_id INT NOT NULL,
  aircraft_unit_id INT NOT NULL,
  airbase_id INT,
  flight_hours DOUBLE DEFAULT 0,
  sorties INT DEFAULT 0,
  maintenance_events INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_datetime (date_id),
  FOREIGN KEY (date_id) REFERENCES dim_date(id) ON DELETE CASCADE,
  FOREIGN KEY (scenario_id) REFERENCES dim_scenario(id) ON DELETE CASCADE,
  FOREIGN KEY (aircraft_unit_id) REFERENCES dim_aircraft_unit(id) ON DELETE CASCADE,
  FOREIGN KEY (airbase_id) REFERENCES dim_airbase(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
