-- Star Schema Migration untuk Probe Ops MABES AU
-- Struktur DDL

-- 1. Dimensi Waktu
CREATE TABLE IF NOT EXISTS dim_time (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL,
    year INT NOT NULL,
    quarter INT NOT NULL,
    month INT NOT NULL,
    day INT NOT NULL,
    day_of_week INT NOT NULL,
    UNIQUE KEY (date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Dimensi Status Maintenance
CREATE TABLE IF NOT EXISTS dim_maintenance_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    status_code VARCHAR(50) NOT NULL,
    description VARCHAR(255),
    is_operational BOOLEAN DEFAULT FALSE,
    UNIQUE KEY (status_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Dimensi Aircraft (Tipe dan Unit Digabung dalam Dimensi Star Schema atau dipisah hierarki. Kita buat denormalisasi untuk query cepat)
CREATE TABLE IF NOT EXISTS dim_aircraft (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tail_number VARCHAR(100) NOT NULL,
    aircraft_type VARCHAR(100) NOT NULL,
    type_description VARCHAR(255),
    UNIQUE KEY (tail_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Dimensi Airbase
CREATE TABLE IF NOT EXISTS dim_airbase (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    avtur_capacity_liters DOUBLE DEFAULT 0,
    apron_capacity_aircraft INT DEFAULT 0,
    UNIQUE KEY (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabel Keamanan Users (Terpisah dari skema OLAP, bagian operasional/admin)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255),
    nip VARCHAR(50) NOT NULL,
    service_unit VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'Analyst',
    permissions JSON,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    approved_at DATETIME,
    UNIQUE KEY (username),
    UNIQUE KEY (email),
    UNIQUE KEY (nip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Fact Table Operations Log
CREATE TABLE IF NOT EXISTS fact_operations_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    time_id INT NOT NULL,
    aircraft_id INT NOT NULL,
    airbase_id INT NOT NULL,
    maintenance_status_id INT NOT NULL,
    flight_hours_logged DOUBLE DEFAULT 0,
    sorties_count INT DEFAULT 0,
    fuel_consumed_liters DOUBLE DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (time_id) REFERENCES dim_time(id) ON DELETE CASCADE,
    FOREIGN KEY (aircraft_id) REFERENCES dim_aircraft(id) ON DELETE CASCADE,
    FOREIGN KEY (airbase_id) REFERENCES dim_airbase(id) ON DELETE CASCADE,
    FOREIGN KEY (maintenance_status_id) REFERENCES dim_maintenance_status(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
