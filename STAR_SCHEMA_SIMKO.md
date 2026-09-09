# Desain Star Schema - SIMKO Probe Ops MABES AU

## 1. Struktur Basis Data Star Schema

Pusat: `fact_operations_log`. Mengelilingi: 4 dimensi + 1 tabel keamanan.

| Tabel | Jenis | Fungsi |
|---|---|---|
| `dim_aircraft` | Dimensi | Master pesawat (tail_number, type) |
| `dim_airbase` | Dimensi | Master pangkalan udara |
| `dim_time` | Dimensi | Waktu (date, year, quarter, month, day) |
| `dim_maintenance_status` | Dimensi | Status kelaikan (Ready, Maintenance, Grounding) |
| `fact_operations_log` | Fakta | Log operasional (FK ke 4 dimensi + measures: flight_hours, sorties, fuel) |
| `users` | Keamanan | Akun + RBAC (terpisah OLTP, tidak join ke fact) |

## 2. DDL Script Lokal

File: `backend/backend/migrations/star_schema_setup.sql`

Jalankan lokal:
```bash
mysql -u root -p probe_ops < backend/backend/migrations/star_schema_setup.sql
# atau SQLite untuk simulasi:
# sqlite3 probe_ops.db < backend/backend/migrations/star_schema_setup.sql
```

Isi DDL: `dim_time`, `dim_maintenance_status`, `dim_aircraft`, `dim_airbase`, `users`, `fact_operations_log` + FK ke dimensi, engine InnoDB utf8mb4.

## 3. ERD Star Schema (Mermaid)

```mermaid
erDiagram
    dim_aircraft {
        int id PK
        string tail_number UK
        string aircraft_type
        string type_description
    }
    dim_airbase {
        int id PK
        string name UK
        string location
        float avtur_capacity_liters
        int apron_capacity_aircraft
    }
    dim_time {
        int id PK
        date date UK
        int year
        int quarter
        int month
        int day
        int day_of_week
    }
    dim_maintenance_status {
        int id PK
        string status_code UK
        string description
        boolean is_operational
    }
    fact_operations_log {
        bigint id PK
        int time_id FK
        int aircraft_id FK
        int airbase_id FK
        int maintenance_status_id FK
        float flight_hours_logged
        int sorties_count
        float fuel_consumed_liters
        datetime created_at
    }
    users {
        int id PK
        string username UK
        string hashed_password
        string full_name
        string email UK
        string nip UK
        string role
        json permissions
        boolean is_approved
    }

    dim_aircraft ||--o{ fact_operations_log : "1 aircraft -> N logs"
    dim_airbase ||--o{ fact_operations_log : "1 airbase -> N logs"
    dim_time ||--o{ fact_operations_log : "1 time -> N logs"
    dim_maintenance_status ||--o{ fact_operations_log : "1 status -> N logs"
```

> Catatan: `users` sengaja tidak berelasi ke fact (keamanan OLTP). Jika butuh audit, tambah `created_by` FK ke `users.id` di fact.

## 4. Flowchart Alur Sistem Keseluruhan

```mermaid
flowchart TD
    A([Start - User Buka SIMKO]) --> B{Login?}
    B -- Belum --> C[Input username/password]
    C --> D[Auth API - /auth/login]
    D --> E{Valid & is_approved?}
    E -- Tidak --> F[Tampilkan Error]
    F --> C
    E -- Ya --> G[Terbit JWT Token]
    B -- Sudah Login --> G
    G --> H[Dashboard - Role Based]
    H --> I{Pilih Menu}
    I --> J[Master Data - Aircraft/Airbase]
    I --> K[Operations - Skenario & Deployment]
    I --> L[Analytics - Fact Aggregasi Star Schema]
    I --> M[Admin - Manajemen Users/RBAC]
    J --> N[CRUD dim_aircraft/dim_airbase]
    K --> O[Create Scenario + Deploy Aircraft]
    O --> P[Insert fact_operations_log]
    L --> Q[Query OLAP - GROUP BY dim_time/dim_airbase/dll]
    Q --> R[Tampilkan Chart/Table]
    M --> S[Approve/Reject User]
    N --> T[Update Dimensi]
    P --> U[Trigger Update Status Maintenance]
    T --> H
    U --> H
    R --> H
    S --> H
    H --> V{Logout?}
    V -- Ya --> W[Clear Token] --> A
    V -- Tidak --> H
```

## 5. Diagram Konteks (Level 0 DFD)

```mermaid
flowchart LR
    subgraph Eksternal
        A1[Analyst - Staf Ops]
        A2[Executive - Pimpinan]
        A3[Administrator]
        A4[Sistem Cuaca BMKG API]
    end

    subgraph SIMKO["SIMKO Probe Ops System"]
        P1((1.0 Auth & RBAC - users))
        P2((2.0 Master Data - dim_*))
        P3((3.0 Operasi Log - fact_operations_log))
        P4((4.0 Analytics OLAP))
    end

    DB[(MySQL - Star Schema)]

    A1 -- "Login, Input Log Operasi, Lihat Dashboard" --> P1
    A1 --> P3
    P1 --> A1
    P3 --> DB
    DB --> P4
    P4 --> A1
    P4 --> A2

    A2 -- "Login, Lihat Laporan Executive" --> P1
    A2 --> P4

    A3 -- "Kelola User, Approve, Master Data" --> P1
    A3 --> P2
    P2 --> DB
    DB --> P2
    P2 --> A3

    A4 -- "Data Cuaca JSON" --> P3

    P1 -. "validasi" .-> DB
    P1 -. "JWT" .-> A1 & A2 & A3
```

## 6. Verifikasi Lokal

```bash
# cek sintaks SQLite (simulasi cepat)
sqlite3 :memory: < backend/backend/migrations/star_schema_setup.sql && echo OK
```
MySQL asli: jalankan file `star_schema_setup.sql` via Workbench / CLI. Semua FK cascade/restrict sesuai desain OLAP.
