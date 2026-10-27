ALTER TABLE air_bases
  ADD CONSTRAINT ck_air_bases_latitude CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT ck_air_bases_longitude CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
  ADD CONSTRAINT ck_air_bases_stock_nonnegative CHECK (avtur_stock_liters IS NULL OR avtur_stock_liters >= 0),
  ADD CONSTRAINT ck_air_bases_capacity_nonnegative CHECK (avtur_capacity_liters IS NULL OR avtur_capacity_liters >= 0),
  ADD CONSTRAINT ck_air_bases_stock_capacity CHECK (
    avtur_stock_liters IS NULL OR avtur_capacity_liters IS NULL OR avtur_stock_liters <= avtur_capacity_liters
  );

ALTER TABLE air_bases
  MODIFY COLUMN latitude DOUBLE NULL DEFAULT 0,
  MODIFY COLUMN longitude DOUBLE NULL DEFAULT 0,
  MODIFY COLUMN avtur_capacity_liters DOUBLE NOT NULL DEFAULT 0,
  MODIFY COLUMN avtur_stock_liters DOUBLE NOT NULL DEFAULT 0;

ALTER TABLE flight_missions
  ADD CONSTRAINT ck_flight_missions_distinct_bases CHECK (origin_base_id <> destination_base_id);
