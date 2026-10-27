# Timeline Pengerjaan Magang — SIMOPSUD

**Sistem Informasi Manajemen Operasi Penerbangan Udara** *(nama awal: SIMKO)*

| | |
|---|---|
| **Mahasiswa** | Reykel Raflen |
| **Instansi** | Mabes TNI AU |
| **Periode** | 10 Agustus 2026 – 4 Desember 2026 |
| **Hari kerja** | Senin – Jumat (Sabtu/Minggu libur) |
| **Total** | 17 minggu = 85 hari kerja |
| **Pola** | Dikelompokkan per minggu, dirinci per hari dalam bentuk kalimat kegiatan |
| **Urutan** | Observasi → rancang data → **backend dulu** → **frontend kemudian** → ETA → uji → laporan → presentasi |
| **Prinsip** | API lolos `/docs` dulu, baru halaman React dikerjakan |

> Satu modul API atau satu halaman React diselesaikan dalam satu minggu (lima hari kerja). Jika endpoint belum mengembalikan 200 di Swagger, tidak melanjutkan ke modul berikutnya.

---

## Ringkasan fase

```
Agu              Sep                 Okt                      Nov              4 Des
|-- F1 --|-- F2 --------|-- F3 ------|-- F4 --------|-- F5 --|-- F6 --|-- F7 --|
 Observasi  Backend inti   Backend     Frontend       ETA+     Uji+     Presentasi
 + rancang  (DB, auth,     domain      (shell,        audit    laporan
              CRUD dasar)  + seed      halaman)
```

| Fase | Minggu | Tanggal | Fokus |
|------|--------|---------|-------|
| F1 Observasi & rancang | M1–M2 | 10–23 Agu | Domain, kebutuhan, ERD, setup repo |
| F2 Backend fondasi | M3–M5 | 24 Agu – 13 Sep | FastAPI, model DB, auth, CRUD pangkalan |
| F3 Backend domain | M6–M8 | 14 Sep – 4 Okt | CRUD pesawat/misi, seed 42 lanud, pagination |
| F4 Frontend | M9–M12 | 5 Okt – 1 Nov | Login, layout, dashboard, pesawat, pangkalan, misi |
| F5 ETA & audit | M13–M14 | 2–15 Nov | Generator, model, `POST /predict-eta`, audit trail |
| F6 Uji & laporan | M15–M16 | 16–29 Nov | UAT, bugfix, naskah, slide |
| F7 Presentasi | M17 | 30 Nov – 4 Des | Rehearsal dan presentasi akhir |

Backend dikerjakan selama enam minggu (M3–M8), frontend empat minggu (M9–M12), dan fitur ETA dua minggu setelah antarmuka misi tersedia.

---

## Minggu 1 — 10–14 Agustus 2026 — Observasi awal

**Target minggu:** Memahami permasalahan operasional sebelum menulis kode fitur.

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 10 Agu | Melakukan serah terima magang, mengikuti orientasi unit, serta menyiapkan alat kerja, akses repositori, dan area kerja. | Surat tugas dan akun Git aktif |
| **Selasa** | 11 Agu | Melakukan observasi alur operasional lanud terkait pengelolaan avtur, truk refueler, dan kapasitas apron. | Catatan lapangan 1 |
| **Rabu** | 12 Agu | Melakukan observasi data alutsista dan alur misi penerbangan untuk mengetahui pencatatan yang berjalan saat ini. | Catatan lapangan 2 |
| **Kamis** | 13 Agu | Melakukan wawancara kebutuhan kepada pengguna Mabes dan lanud untuk mengidentifikasi kendala data terpisah dan perhitungan ETA manual. | Daftar kebutuhan draft |
| **Jumat** | 14 Agu | Menyusun rangkuman masalah satu sampai dua halaman, menetapkan batasan prototipe (dashboard, pesawat, pangkalan, misi, pengguna), dan berkonsultasi dengan pembimbing. | Kebutuhan v0 disepakati |

---

## Minggu 2 — 17–21 Agustus 2026 — Perancangan data

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 17 Agu | Merancang ERD OLTP versi awal untuk tabel `users`, `air_bases`, `aircraft_types`, dan `aircraft_units`. | Diagram ERD kertas |
| **Selasa** | 18 Agu | Melanjutkan ERD untuk tabel `flight_missions` beserta relasi origin, destination, dan pesawat. | ERD lengkap |
| **Rabu** | 19 Agu | Menyusun kontrak API v1 di atas kertas untuk endpoint auth, airbase, aircraft, dan missions dengan prefix `/api/v1`. | Daftar endpoint |
| **Kamis** | 20 Agu | Membuat repositori Git, melakukan push ke GitLab `projekreykel`, dan menyiapkan skeleton FastAPI dengan endpoint health `GET /`. | `GET /` mengembalikan 200 |
| **Jumat** | 21 Agu | Mempresentasikan ERD dan kontrak API kepada pembimbing serta merevisi field avtur, truk, dan apron. | ERD disetujui |

---

## Minggu 3 — 24–28 Agustus 2026 — Backend: model basis data

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 24 Agu | Menyiapkan struktur proyek FastAPI, mengatur `config.py` dan CORS, serta menghubungkan basis data SQLite untuk pengembangan. | Server `uvicorn` berjalan |
| **Selasa** | 25 Agu | Membuat model `users` dan `air_bases` dengan field inti terlebih dahulu. | Tabel users dan air_bases terbentuk |
| **Rabu** | 26 Agu | Membuat model `aircraft_types` dan `aircraft_units` beserta relasinya. | Tabel aircraft terbentuk |
| **Kamis** | 27 Agu | Membuat schema Pydantic terpisah untuk Create, Update, dan Response pada setiap resource. | `py_compile` lolos tanpa error |
| **Jumat** | 28 Agu | Menjalankan `create_all` atau migrasi awal dan mengisi tiga sampai lima baris data dummy melalui script untuk pengecekan di klien SQL. | Data dummy terlihat di basis data |

---

## Minggu 4 — 31 Agu – 4 September 2026 — Backend: autentikasi JWT

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 31 Agu | Mengimplementasikan hashing password dan membuat endpoint `POST /auth/login` yang mengembalikan token JWT. | Login 200 di `/docs` |
| **Selasa** | 1 Sep | Membuat dependency `get_current_user` dan melindungi endpoint uji dengan autentikasi. | Request tanpa token mengembalikan 401 |
| **Rabu** | 2 Sep | Menambahkan pembagian peran Administrator dan operator serta membuat seed satu akun admin `admin.mabes`. | Seed admin dapat login |
| **Kamis** | 3 Sep | Menambahkan endpoint registrasi jika diizinkan unit dan melakukan validasi NIP serta username. | Validasi berjalan di `/docs` |
| **Jumat** | 4 Sep | Menguji alur login dengan menyalin token Bearer dan mengakses endpoint terlindungi. | Alur autentikasi stabil |

---

## Minggu 5 — 7–11 September 2026 — Backend: API Pangkalan

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 7 Sep | Membuat endpoint `GET /airbase/` dan `POST /airbase/` untuk mengelola nama, lokasi, Kodau, ICAO, koordinat, serta stok avtur, truk, dan apron. | POST mengembalikan 201 |
| **Selasa** | 8 Sep | Menerapkan perhitungan status pangkalan di sisi server berdasarkan ambang avtur 30/60, truk 0/50 persen, dan apron 100/80 persen. | Status berubah mengikuti stok |
| **Rabu** | 9 Sep | Membuat endpoint `PATCH /airbase/{id}` dan `DELETE` serta memastikan schema `AirBaseUpdate` bersifat opsional agar tidak terjadi 422 saat ubah koordinat. | PATCH koordinat lolos |
| **Kamis** | 10 Sep | Menguji pembuatan satu lanud dengan koordinat nyata (bukan 0,0), kemudian mengubah stok dan memeriksa daftar. | Perhitungan haversine tidak gila |
| **Jumat** | 11 Sep | Merapikan penanganan error dan dokumentasi OpenAPI untuk modul pangkalan. | Dokumentasi `/docs` pangkalan lengkap |

---

## Minggu 6 — 14–18 September 2026 — Backend: API Pesawat

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 14 Sep | Membuat CRUD untuk `aircraft_types` yang mencakup TBO, cruise, range, dan fuel burn dengan nilai default terlebih dahulu. | `GET /aircraft/types` 200 |
| **Selasa** | 15 Sep | Membuat CRUD untuk `aircraft_units` yang mencakup tail number, tipe, lanud, jam terbang, dan tanggal servis terakhir. | POST unit 201 |
| **Rabu** | 16 Sep | Menerapkan status S dan U/S yang dihitung otomatis di endpoint GET, create, dan patch berdasarkan TBO, phase, dan kalender. | Status S/U/S masuk akal |
| **Kamis** | 17 Sep | Menerapkan validator ketat pada Create dan Update serta melonggarkan Response agar data lama tidak menyebabkan 500. | Data lama tidak error 500 |
| **Jumat** | 18 Sep | Menguji filter `?airbase_id=&status=` dengan lima sampai sepuluh unit dan mencatat contoh TBO serta phase. | Filter berjalan |

---

## Minggu 7 — 21–25 September 2026 — Backend: API Misi (tanpa ETA)

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 21 Sep | Membuat endpoint `POST /flight-missions/` dan `GET` untuk mengelola pesawat, origin, destination, ETD, dan status misi. | Create 201 |
| **Selasa** | 22 Sep | Membuat endpoint `PUT /{id}`, `PATCH /{id}/status`, dan `DELETE` untuk pengelolaan misi. | Status patch mengembalikan ringkas |
| **Rabu** | 23 Sep | Menerapkan aturan bahwa hanya unit berstatus S yang dapat ditugaskan ke misi di sisi backend. | Unit U/S ditolak |
| **Kamis** | 24 Sep | Menguji alur pembuatan misi, perubahan status, penampilan daftar, dan penghapusan. | Alur misi penuh 200 |
| **Jumat** | 25 Sep | Merapikan response dan mencatat field ETA yang belum dikerjakan seperti payload, flight level, dan alternate. | Modul misi di-freeze |

---

## Minggu 8 — 28 Sep – 2 Oktober 2026 — Backend: seed dan pagination (gerbang frontend)

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 28 Sep | Melakukan seeding 42 Lanud Kodau I sampai III dengan GPS dan ICAO yang benar serta menolak koordinat 0,0. | 42 baris lanud |
| **Selasa** | 29 Sep | Melakukan seeding 21 tipe pesawat dan 78 tail number beserta relasi unit ke lanud. | Data master lengkap |
| **Rabu** | 30 Sep | Menerapkan pagination dengan parameter `skip`, `limit`, `q`, header `X-Total-Count`, dan konfigurasi CORS expose header. | Header terlihat di browser |
| **Kamis** | 1 Okt | Membuat endpoint `GET /airbase/stats` dan `GET /aircraft/units/stats` untuk kebutuhan KPI agar tidak menghitung dari halaman pertama. | Stats 200 |
| **Jumat** | 2 Okt | Merapikan OpenAPI untuk empat resource dan menyelesaikan dokumen star schema OLAP untuk keperluan TA. | `/docs` lengkap, gerbang frontend dibuka |

*Backend domain di-freeze setelah minggu ini kecuali perbaikan bug.*

---

## Minggu 9 — 5–9 Oktober 2026 — Frontend: shell dan login

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 5 Okt | Melakukan inisialisasi Vite dan React, mengatur proxy `/api` ke `http://127.0.0.1:8000`, dan membuat satu instance axios dengan `VITE_API_BASE_URL`. | `npm run dev` dan proxy 200 |
| **Selasa** | 6 Okt | Membuat halaman Login minimalis dengan lebar 420px, menyimpan token, dan mengarahkan ke login saat menerima 401. | Login melalui browser berhasil |
| **Rabu** | 7 Okt | Membuat layout sidebar dan navbar, melindungi route yang memerlukan login, dan menampilkan spinner saat memeriksa sesi. | Shell kosong dapat diakses |
| **Kamis** | 8 Okt | Menerapkan branding SIMOPSUD pada title dan sidebar serta menambahkan fungsi logout dan penjaga peran. | Branding konsisten |
| **Jumat** | 9 Okt | Menguji alur login dan logout serta mencatat bug terkait proxy dan CORS untuk ditindaklanjuti. | Shell stabil |

---

## Minggu 10 — 12–16 Oktober 2026 — Frontend: dashboard dan users

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 12 Okt | Membangun dashboard dengan `Promise.all` untuk menarik statistik pesawat, pangkalan, dan misi serta menampilkan status Live atau Offline saat error. | Angka berasal dari API |
| **Selasa** | 13 Okt | Membuat KPI Kesiapan Alutsista S/U/S, jam kritis, risiko avtur, dan misi aktif. | KPI tampil benar |
| **Rabu** | 14 Okt | Menambahkan satu sampai dua grafik Recharts dengan token warna `var(--chart-grid)`. | Grafik berhasil dirender |
| **Kamis** | 15 Okt | Membuat halaman Users khusus Administrator untuk menampilkan daftar pengguna beserta peran dan permission. | Uji CRUD satu pengguna berhasil |
| **Jumat** | 16 Okt | Menerapkan RBAC pada menu `dashboard | aircraft | airbase | missions | users` dan menguji perbedaan hak akses admin dan operator. | Menu sesuai peran |

---

## Minggu 11 — 19–23 Oktober 2026 — Frontend: pangkalan dan pesawat

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 19 Okt | Membuat tabel Pangkalan dengan pagination di sisi server, pencarian `q`, dan filter status yang sinkron dengan klik KPI. | Filter sinkron |
| **Selasa** | 20 Okt | Membuat modal create dan edit Pangkalan yang menampilkan preview status sebagai badge, bukan sebagai select. | Preview status aktif |
| **Rabu** | 21 Okt | Membuat tabel Pesawat untuk unit dan tipe pesawat dengan pilihan status hanya S dan U/S. | Pilihan status S/U/S saja |
| **Kamis** | 22 Okt | Memperbaiki form pesawat agar input angka disimpan sebagai string di state dan baru dikonversi dengan `Number()` saat menyimpan agar fokus tidak lompat. | Fokus input tidak lompat |
| **Jumat** | 23 Okt | Menggunakan kembali komponen Pagination dan melakukan uji tampilan desktop serta bimbingan. | Modul pangkalan dan pesawat selesai |

---

## Minggu 12 — 26–30 Oktober 2026 — Frontend: misi dan polish

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 26 Okt | Membuat halaman Misi yang menampilkan daftar, filter status, dan form create serta edit dengan field origin, destination, pesawat S, dan ETD. | Form misi berfungsi |
| **Selasa** | 27 Okt | Menambahkan aksi pengubahan status misi langsung dari antarmuka. | Status berhasil diganti |
| **Rabu** | 28 Okt | Melakukan polish untuk masalah yang menghambat demo seperti proxy 127.0.0.1, header CORS, dan drawer 1024px. | Bug kritis tertutup |
| **Kamis** | 29 Okt | Mengerjakan dark mode jika waktu tersedia, jika tidak maka menundanya ke minggu berikutnya karena bukan gerbang utama. | Light wajib, dark bonus |
| **Jumat** | 30 Okt | Menguji alur penuh mulai dari login, dashboard, pangkalan dan pesawat, hingga pembuatan misi. | Alur utuh 200 |

---

## Minggu 13 — 2–6 November 2026 — ML: generator, model, dan API prediksi

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 2 Nov | Membuat generator CSV dengan rumus haversine, ground speed, severity, dan taxi time tanpa menggunakan random murni. | CSV 5000 baris |
| **Selasa** | 3 Nov | Menyusun notebook untuk EDA dan satu sampai dua baseline dengan metrik MAE tanpa langsung mencoba enam model sekaligus. | MAE tercatat |
| **Rabu** | 4 Nov | Menyimpan joblib ke `app/services/_models/` dan membuat engine yang dapat memuat model serta fallback yang jelas jika file hilang. | Load `eta_core` berhasil |
| **Kamis** | 5 Nov | Membuat endpoint `POST /predict-eta` untuk menghitung ETE, ground speed, dan fuel dari origin, destination, pesawat, dan ETD. | Swagger 200 |
| **Jumat** | 6 Nov | Menguji prediksi pada tiga rute beda Kodau, menolak koordinat 0,0, dan menambahkan payload, flight level, serta alternate jika sempat. | Tiga rute masuk akal |

---

## Minggu 14 — 9–13 November 2026 — Integrasi ETA, audit, dan sesi

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 9 Nov | Menghubungkan tombol prediksi di form misi dengan mengirim `origin_base_id`, `destination_base_id`, dan `aircraft_id` sesuai schema. | Tombol prediksi aktif |
| **Selasa** | 10 Nov | Menampilkan kartu hasil prediksi yang berisi ETE, ground speed, dan fuel, serta TAF dan SIGMET jika sempat dikerjakan. | Kartu hasil tampil |
| **Rabu** | 11 Nov | Membuat tabel `audit_logs` yang bersifat insert-only dan menghubungkannya dengan proses login serta mutasi CRUD. | Log terisi |
| **Kamis** | 12 Nov | Membuat halaman audit khusus admin beserta fitur export CSV dan endpoint `POST /auth/refresh` untuk sesi delapan jam. | Export 200 |
| **Jumat** | 13 Nov | Melakukan demo tujuh menit dengan alur login, misi, prediksi, penyimpanan, dan pengecekan audit, kemudian melakukan feature freeze. | Demo freeze |

---

## Minggu 15 — 16–20 November 2026 — UAT

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 16 Nov | Melakukan UAT untuk skenario login, CRUD tiga modul, prediksi, audit, serta perbedaan peran operator dan admin. | Checklist berjalan |
| **Selasa** | 17 Nov | Menguji kasus tepi seperti avtur di bawah 30 persen, truk nol, unit U/S yang tidak dapat ditugaskan misi, halaman kosong, dan token kadaluarsa. | Kasus tepi tertutup |
| **Rabu** | 18 Nov | Menguji tampilan antarmuka pada lebar 360px, 768px, dan 1280px untuk mode light dan dark jika tersedia. | Tampilan responsif |
| **Kamis** | 19 Nov | Memperbaiki bug yang menghambat demo tanpa menambah fitur baru. | Regresi singkat |
| **Jumat** | 20 Nov | Mengambil screenshot untuk laporan dan menyusun matriks uji dengan status lulus, gagal, dan catatan. | Matriks terisi |

---

## Minggu 16 — 23–27 November 2026 — Laporan dan slide

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 23 Nov | Menulis bab satu dan dua laporan yang membahas pendahuluan, landasan teori, serta batasan bahwa sistem bersifat DSS. | Draft bab 1–2 |
| **Selasa** | 24 Nov | Menulis bab tiga dan empat yang membahas perancangan ERD dan arsitektur serta implementasi backend. | Draft bab 3–4 |
| **Rabu** | 25 Nov | Menulis bab lima yang membahas frontend, ETA dengan penegasan data sintetis, hasil uji, dan saran pengembangan. | Draft bab 5 |
| **Kamis** | 26 Nov | Membuat slide sepuluh sampai dua belas halaman beserta naskah presentasi delapan sampai sepuluh menit dan README proyek. | Slide v1 |
| **Jumat** | 27 Nov | Melakukan rehearsal pertama di mesin sendiri dan merevisi laporan berdasarkan masukan pembimbing. | Laporan dan slide tersedia |

---

## Minggu 17 — 30 Nov – 4 Desember 2026 — Presentasi

| Hari | Tanggal | Kegiatan | Output / cek |
|------|---------|----------|--------------|
| **Senin** | 30 Nov | Melakukan dry-run pertama untuk demo penuh mulai dari login, dashboard, satu CRUD, prediksi ETA, hingga batasan, sambil mencatat durasi. | Durasi 8–10 menit |
| **Selasa** | 1 Des | Memperbaiki slide dan satu sampai dua bug demo berdasarkan hasil dry-run pertama. | Patch kecil |
| **Rabu** | 2 Des | Melakukan dry-run kedua di perangkat dan ruangan yang akan dipakai untuk presentasi. | Perangkat siap |
| **Kamis** | 3 Des | Menyiapkan cadangan berupa laptop kedua, PDF laporan, dan video tiga menit untuk antisipasi gangguan jaringan. | Backup siap |
| **Jumat** | 4 Des | Melaksanakan presentasi magang dan melakukan serah terima prototipe. | Presentasi selesai |

---

## Kalender ringkas (minggu → output)

| Minggu | Tanggal | Layer | Output konkret |
|--------|---------|-------|----------------|
| 1 | 10–14 Agu | — | Catatan kebutuhan |
| 2 | 17–21 Agu | Backend skeleton | ERD dan `GET /` |
| 3 | 24–28 Agu | Backend | Tabel DB dan dummy |
| 4 | 31 Agu – 4 Sep | Backend | Login JWT |
| 5 | 7–11 Sep | Backend | API pangkalan |
| 6 | 14–18 Sep | Backend | API pesawat |
| 7 | 21–25 Sep | Backend | API misi |
| 8 | 28 Sep – 2 Okt | Backend | Seed 42 lanud dan pagination |
| 9 | 5–9 Okt | Frontend | Login dan shell |
| 10 | 12–16 Okt | Frontend | Dashboard dan users |
| 11 | 19–23 Okt | Frontend | Pangkalan dan pesawat |
| 12 | 26–30 Okt | Frontend | Misi dan polish |
| 13 | 2–6 Nov | ML + API | `POST /predict-eta` |
| 14 | 9–13 Nov | Integrasi | ETA di UI dan audit |
| 15 | 16–20 Nov | Uji | Matriks UAT |
| 16 | 23–27 Nov | Dokumen | Laporan dan slide |
| 17 | 30 Nov – 4 Des | — | Presentasi 4 Des |

---

## Yang sengaja diundur (agar tidak terkesan selesai dalam sebulan)

| Item | Baru dikerjakan | Alasan |
|------|-----------------|--------|
| Halaman React | M9, setelah API seed | Antarmuka tanpa API yang stabil akan dikerjakan dua kali |
| Prediksi ETA | M13–M14 | Memerlukan misi dan koordinat yang benar terlebih dahulu |
| Audit trail | M14 | Memerlukan mutasi antarmuka agar log memiliki isi |
| Refresh delapan jam | M14 | Baru terasa manfaatnya saat form dipakai dalam durasi lama |
| Dark mode rapi | M12/M14 | Bersifat kosmetik, bukan jalur kritis |
| Star schema | M8 dokumen | Untuk keperluan TA, bukan syarat demo |
| TAF/SIGMET/alternate penuh | M13 akhir atau saran | Sistem tetap dapat berjalan tanpanya |

---

## Risiko dan cadangan

| Risiko | Cadangan |
|--------|----------|
| Seed koordinat salah sehingga ETA menjadi gila | Melakukan pengecekan GPS di M8 dan menguji tiga rute di M13 |
| Backend crash karena syntax atau enum | Menjalankan `py_compile` dan membuka `/docs` setiap hari |
| Proxy Vite salah port | Mengatur target ke `127.0.0.1:8000` dan me-restart Vite |
| Pengerjaan ETA molor | Melakukan demo dengan rumus fisika dan menempatkan ML di lampiran |
| UAT memakan waktu M16 | Memulai pengambilan screenshot sejak M15 tanpa menunggu sempurna |

---

## Catatan pembimbing

- Urutan pengerjaan adalah **backend selesai terlebih dahulu (M3–M8), baru frontend (M9–M12), kemudian fitur prediksi (M13–M14).**
- Nama produk akhir adalah **SIMOPSUD** (SIMKO merupakan nama awal).
- Sistem bersifat DSS yang menampilkan indikator kesiapan dan ETA, bukan pengambil keputusan otomatis.
- Data latih ETA bersifat sintetis yang dibuat dengan rumus fisika, bukan log penerbangan rahasia.

---

*Revisi 4 — 21 September 2026. Harian Senin–Jumat dalam kalimat kegiatan, dikelompokkan per minggu, 17 minggu sampai 4 Desember.*
