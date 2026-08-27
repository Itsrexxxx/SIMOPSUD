# Dokumentasi Akademik SIMKO

## Judul

**Model Analisa Prediktif Titik Kritis dan Mitigasi Hambatan Berdasarkan Jam Terbang dalam Dukungan Operasi Udara Berbasis Kecerdasan Buatan Supervised Learning pada Aplikasi SIMKO**

## Fokus Penelitian

Penelitian ini membangun sistem pendukung keputusan untuk mengidentifikasi potensi bottleneck operasional pada pangkalan udara. Sistem tidak mengambil keputusan operasional secara otomatis. Sistem memberikan indikator risiko dan rekomendasi mitigasi kepada pengguna.

## Sumber Data

Data prediksi diambil dari database SIMKO:

- `aircraft_units`: nomor ekor, status, jam terbang, dan `airbase_id`.
- `air_bases`: nama Lanud, jumlah truk refueler, jumlah forklift, dan kapasitas apron.
- Data log CSV/XLSX: menambah jam terbang pesawat dan mengurangi stok Avtur melalui modul import.

Setiap pesawat memiliki hubungan langsung dengan satu Lanud melalui `airbase_id`. Jumlah pesawat per Lanud dihitung dengan menghitung pesawat berstatus `Ready` yang memiliki `airbase_id` Lanud tersebut.

## Variabel Model

| Variabel | Keterangan |
| --- | --- |
| Rata-rata jam terbang | Rata-rata akumulasi jam terbang pesawat Ready pada Lanud |
| Truk refueler | Jumlah truk refueler aktif yang tersedia |
| Forklift | Jumlah forklift yang tersedia |
| Pesawat ditempatkan | Jumlah pesawat Ready pada Lanud |
| Target | `0 = Aman`, `1 = Kritis` |

## Metode

1. Sistem mengambil data terbaru dari database.
2. Sistem mengelompokkan pesawat berdasarkan `airbase_id`.
3. Sistem menghitung fitur per Lanud.
4. Random Forest Classifier menghasilkan probabilitas kelas `Kritis`.
5. Ambang keputusan yang digunakan adalah 50%.
6. Sistem menampilkan status risiko dan rekomendasi mitigasi berbasis faktor penyebab.

Random Forest digunakan karena dapat menangani beberapa variabel numerik, menghasilkan probabilitas klasifikasi, dan menyediakan feature importance untuk interpretasi hasil.

## Interpretasi Output

Contoh output `78%` berarti model memperkirakan probabilitas kelas Kritis sebesar 78% berdasarkan kombinasi fitur yang diberikan. Nilai tersebut bukan kepastian kejadian dan bukan prediksi kerusakan pesawat.

## Skenario Pengujian

| Skenario | Kondisi | Hasil yang diharapkan |
| --- | --- | --- |
| Aman | Jam terbang rendah, dukungan truk/forklift cukup | Risiko rendah dan status Aman |
| Dukungan minim | Pesawat banyak, truk/forklift terbatas | Risiko tinggi dan rekomendasi penambahan sumber daya |
| Jam terbang tinggi | Rata-rata jam terbang mendekati batas evaluasi | Rekomendasi percepatan maintenance |
| Data kosong | Tidak ada pesawat Ready | Prediksi tidak dilakukan, risiko 0% |
| Per Lanud | Pesawat tersebar di beberapa `airbase_id` | Setiap Lanud memiliki jumlah dan risiko berbeda |

## Batasan Penelitian

Versi prototipe menggunakan data referensi sintetis berlabel untuk melatih baseline Random Forest. Data aktual database digunakan sebagai input inferensi. Agar dapat digunakan sebagai model penelitian final, log historis perlu dikumpulkan, diberi label Aman/Kritis berdasarkan kejadian aktual, kemudian model dievaluasi menggunakan confusion matrix, accuracy, precision, recall, dan F1-score.

## Bukti Implementasi

- Modul AI: `frontend/src/pages/Simulasi.jsx`
- Endpoint prediksi: `GET /api/v1/scenarios/auto-prediction`
- Model: `backend/backend/app/services/predictive_model.py`
- Relasi pesawat-Lanud: `backend/backend/app/models/aircraft.py`
- Data log: `backend/backend/app/api/v1/endpoints/import_data.py`