-- Tipe lanud di daftar resmi Mabes AU bukan cuma A/B/C: ada juga "Perwakilan".
-- Kolom sebelumnya varchar(2) sehingga entri perwakilan gagal disimpan.
ALTER TABLE air_bases
  MODIFY COLUMN tipe VARCHAR(20) NULL DEFAULT NULL;