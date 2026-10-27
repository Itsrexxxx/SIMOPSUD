-- Spek tipe pesawat boleh NULL = belum diisi.
-- Sebelumnya kolom ini punya default 650/2200/2000/5000 sehingga tipe baru langsung
-- terlihat punya spek nyata, dan prediksi ETA memakai angka sama untuk semua tipe.
ALTER TABLE aircraft_types
  MODIFY COLUMN cruise_speed_kmh FLOAT NULL DEFAULT NULL,
  MODIFY COLUMN fuel_burn_lph FLOAT NULL DEFAULT NULL,
  MODIFY COLUMN max_range_km FLOAT NULL DEFAULT NULL,
  MODIFY COLUMN payload_capacity_kg FLOAT NULL DEFAULT NULL;
