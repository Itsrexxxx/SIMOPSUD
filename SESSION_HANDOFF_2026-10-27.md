# Session handoff — 2026-10-27

Hermes session: `local-a9c8c074ce5385571d014ef5afb249b63781533c3d2d6815ad2b0d6fee6764ab`
Resume: `hermes --resume local-a9c8c074ce5385571d014ef5afb249b63781533c3d2d6815ad2b0d6fee6764ab`
(atau `hermes --continue` untuk sesi terakhir). Transkrip penuh tersimpan di
`C:\Users\reyke\AppData\Local\hermes\state.db` (tabel `sessions` + `messages`).

Repo: `probe-ops-system` · branch `main` · HEAD `b16418f`

## Commit sesi ini

| commit | isi |
|---|---|
| `133fcf7` | Situational Overview: peta rasio 16:9 (persegi panjang) + mode nasional langsung fit bbox Indonesia (`INDONESIA_VIEW`), panel detail meregang setinggi peta |
| `b16418f` | Dashboard sinkron dengan modul lain: status pesawat S/U/S lewat `app/services/aircraft_status.py`, filter `AirBase.is_active == 1`, alert dihitung dari status turunan |

## Akar masalah dashboard (sudah diperbaiki)

1. Kolom `aircraft_units.status` di DB berisi nilai warisan `READY` (28) / `MAINTENANCE` (3) /
   `MANDATORY_GROUNDING` (3). Modul Pesawat menurunkan S/U/S di runtime, Dashboard dulu
   membandingkan literal `"S"` di SQL → kesiapan 0/34 (0,0%). Sekarang 31/34 (91,2%), sama
   dengan `/aircraft/units/stats`.
2. Dashboard membaca semua `AirBase` tanpa filter aktif → total 57 (harusnya 56), critical 2 (1),
   fuel_risk 2 (1), dan Lanud Komodo (nonaktif) muncul di alert. Sekarang hanya lanud aktif.
3. Alert U/S dulu hanya memeriksa 8 pesawat jam terbang tertinggi dan memakai `status` mentah,
   jadi tidak pernah kena pesawat U/S nyata. Sekarang dari semua unit berstatus turunan.

Angka live setelah perbaikan: 34 pesawat (31 S / 3 U/S), 67.165 jam total, 56 lanud
(41 optimal / 14 warning / 1 critical), avtur <30% = 1 (Lanud Ternate 23,3%), 9 misi
(Scheduled 4 · In-Flight 3 · Arrived 2). Situational Overview: 56 lanud, 3 track misi, ~124–127 ADSB.

## Verifikasi yang sudah dijalankan

```bash
cd backend/backend && env -u PYTHONPATH PYTHONPATH=. ../venv/Scripts/python.exe -m pytest tests -q   # 64 passed
cd frontend && npm run build                                                                          # exit 0
cd frontend && npx playwright test                                                                    # 2 passed
```

Probe pembanding (tidak mencetak kredensial, password dibaca runtime dari
`backend/backend/scripts/create_superuser.py`):
`C:\Users\reyke\AppData\Local\hermes\cache\scratch\audit2.py` — membandingkan
`/dashboard/summary` vs `/aircraft/units/stats` vs `/airbase/?limit=100` vs `/flight-missions/`.

Backend dev berjalan di `127.0.0.1:8000` (uvicorn, tanpa `--reload`; restart wajib setelah
ubah kode). Frontend preview `127.0.0.1:4173`.

## Sisa pekerjaan (belum disetujui user)

- Normalisasi data warisan: migrasi SQL `READY → S`, `MAINTENANCE/MANDATORY_GROUNDING → U/S`
  di `aircraft_units`, dan `import_data.py:227` berhenti menulis `"MAINTENANCE"`.
  Belum dikerjakan karena mengubah data DB (user memilih opsi 1–3 saja). Risiko sekarang:
  fitur baru yang membaca kolom `status` mentah akan mengulang bug yang sama.
- Lanud `SLM` (Sulaiman) tanpa `runway_m` — tidak ada di OurAirports.
- Batas ADS-B: receiver komunitas, wilayah Papua timur / Kalimantan pedalaman / laut jauh lowong;
  pesawat militer tanpa transponder tidak muncul.
- `.env` `ADSB_LOL_API_KEY` sudah expired (401) — provider adsb.lol dipakai tanpa key.

## Catatan konvensi

- Status pesawat: satu sumber `backend/backend/app/services/aircraft_status.py::derived_status`
  (TBO, phase interval, kalender servis, `is_manually_grounded`, `squawk_discrepancy`).
  Jangan membaca kolom `aircraft_units.status` langsung.
- Setiap endpoint agregat baru wajib `AirBase.is_active == 1`, dan angkanya diuji dengan
  membandingkan langsung ke endpoint modul sumber.
- `write_file` menolak menimpa file yang pernah dibaca dengan offset/limit; rewrite lewat
  `open().write()` di `execute_code` setelah `ast.parse`.
- Layar putih React = error render, `npm run build` tidak menangkap → wajib `npx playwright test`.