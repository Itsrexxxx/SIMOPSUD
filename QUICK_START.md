# 🚀 Quick Start Guide - Bug Fixes & Testing

Dokumentasi lengkap apa yang sudah diperbaiki dan bagaimana cara menjalankannya.

## 📊 Summary of Changes

### Backend Changes (3 files)
✅ **`app/models/airbase.py`** - Added 4 new columns to AirBase model
✅ **`app/schemas/airbase_schema.py`** - Updated schema to include all new fields
✅ **`migrations/20260812_add_airbase_fields.sql`** - Database migration script

### Frontend Changes (2 files)
✅ **`src/pages/Pangkalan.jsx`** - Added error handling & improved data parsing
✅ **`src/pages/Pesawat.jsx`** - Improved API response handling

### New Scripts
✅ **`scripts/init_sample_data.py`** - Initialize database with test data
✅ **`BUG_FIXES_SUMMARY.md`** - Detailed bug documentation

---

## 🛠️ Setup Instructions

### Step 1: Update Backend Database Schema

```bash
# Option A: Using migration script (Recommended)
cd probe-ops-system/backend

# Run the migration
python scripts/run_migrations.py

# Option B: Manual migration (if above doesn't work)
# Open your database client (psql, mysql, sqlite) and run:
# Copy contents of: migrations/20260812_add_airbase_fields.sql
```

### Step 2: Initialize Sample Data

```bash
cd probe-ops-system/backend

# Run initialization script to add test data
python -m scripts.init_sample_data

# You should see:
# ✅ Added aircraft type: F-16C Fighting Falcon
# ✅ Added aircraft type: T-50i Golden Eagle
# ✅ Added aircraft type: Hercules C-130
# ✅ Added aircraft type: CN-235
# ✅ Added aircraft unit: TS-101
# ✅ Added airbase: Lanud Halim Perdanakusuma
# ... etc
```

### Step 3: Start Backend Server

```bash
cd probe-ops-system/backend

# Create virtual environment (if not exists)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run backend server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# You should see:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Application startup complete
```

### Step 4: Start Frontend Server

```bash
cd probe-ops-system/frontend

# Install dependencies (if not done)
npm install

# Run development server
npm run dev

# You should see:
# VITE v[version] ready in [time] ms
# ➜  Local:   http://localhost:5173/
# ➜  press h to show help
```

### Step 5: Test the Application

1. **Open Browser:** `http://localhost:5173`
2. **Login:** Use test credentials (if needed)
3. **Navigate to Pages:**
   - 🏠 Dashboard - View summary metrics
   - ✈️ Data Pesawat - View aircraft units
   - 🛫 Pangkalan (Lanud) - View airbases

---

## ✅ Verification Checklist

### Backend Verification

```bash
# Test Aircraft API
curl http://localhost:8000/api/v1/aircraft/units/

# Test Airbase API
curl http://localhost:8000/api/v1/airbase/

# Expected Response (should include all fields):
# {
#   "id": 1,
#   "name": "Lanud Halim Perdanakusuma",
#   "location": "Jakarta",
#   "status": "optimal",
#   "avtur_capacity_liters": 1000000,
#   "avtur_stock_liters": 750000,
#   "refueler_trucks_count": 10,
#   "refueler_trucks_active": 7,
#   "apron_capacity_aircraft": 25,
#   "apron_used": 12
# }
```

### Frontend Verification

- [ ] Dashboard loads without errors
- [ ] Dashboard shows correct metrics (Fleet Readiness %, Average Flight Hours, etc)
- [ ] Pesawat page displays aircraft table
- [ ] Pangkalan page displays airbase cards
- [ ] Each card shows Avtur Tank, Refueler Trucks, and Apron Parking
- [ ] Status badges display correctly (green=Optimal, orange=Warning, red=Critical)
- [ ] Progress bars calculate correctly
- [ ] Browser console has no errors (F12 → Console tab)
- [ ] All styling is visible (Tailwind CSS classes rendering)

---

## 🐛 Troubleshooting

### Issue: "Gagal memuat data pangkalan" (Failed to load airbase data)

**Cause:** Backend is not running or database is empty

**Solution:**
```bash
# 1. Check backend is running on port 8000
curl http://localhost:8000/api/v1/airbase/

# 2. If error, restart backend:
# (In backend terminal)
# Press Ctrl+C to stop
# Run: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 3. If still empty, initialize sample data:
python -m scripts.init_sample_data
```

### Issue: CSS classes not rendering (no styling visible)

**Cause:** Tailwind CSS not processing or Vite cache issue

**Solution:**
```bash
# 1. Clear Vite cache
cd probe-ops-system/frontend
rm -rf .vite  # or del .vite on Windows

# 2. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 3. Restart dev server
npm run dev
```

### Issue: Database migration failed

**Cause:** Syntax error in SQL or database connection issue

**Solution:**
```bash
# 1. Check database is accessible
# Edit app/core/database.py to see connection string

# 2. Manual migration using database client:
# Open psql/mysql/sqlite client and run:
# migrations/20260812_add_airbase_fields.sql

# 3. Or, use SQLAlchemy to auto-create tables:
# python -c "from app.core.database import Base, engine; Base.metadata.create_all(engine)"
```

### Issue: CORS error (frontend can't connect to backend)

**Cause:** Backend CORS configuration missing

**Solution:**
Edit `backend/backend/app/main.py` and ensure:
```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 📱 API Documentation

### Aircraft Endpoints
```
GET    /api/v1/aircraft/units/           - Get all aircraft units
POST   /api/v1/aircraft/units/           - Create new aircraft unit
PATCH  /api/v1/aircraft/units/{id}       - Update aircraft unit

GET    /api/v1/aircraft/types/           - Get aircraft types
POST   /api/v1/aircraft/types/           - Create aircraft type
```

### Airbase Endpoints
```
GET    /api/v1/airbase/                  - Get all airbases
POST   /api/v1/airbase/                  - Create new airbase
PATCH  /api/v1/airbase/{id}              - Update airbase
DELETE /api/v1/airbase/{id}              - Delete airbase
```

### Scenario Endpoints
```
GET    /api/v1/scenarios/                - Get all scenarios
POST   /api/v1/scenarios/                - Create new scenario
DELETE /api/v1/scenarios/{id}            - Delete scenario
POST   /api/v1/scenarios/run-simulation  - Run simulation
```

---

## 📝 File Locations Reference

```
probe-ops-system/
├── backend/
│   ├── app/
│   │   ├── models/
│   │   │   └── airbase.py           ← MODIFIED
│   │   ├── schemas/
│   │   │   └── airbase_schema.py    ← MODIFIED
│   │   └── api/v1/endpoints/
│   │       ├── aircraft.py
│   │       ├── airbase.py
│   │       └── scenarios.py
│   ├── migrations/
│   │   └── 20260812_add_airbase_fields.sql  ← NEW
│   └── scripts/
│       ├── run_migrations.py
│       └── init_sample_data.py       ← NEW
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Pesawat.jsx           ← MODIFIED
│   │   │   └── Pangkalan.jsx         ← MODIFIED
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── Sidebar.jsx
│   │   └── api/
│   │       └── index.js
│   └── vite.config.js
│
└── BUG_FIXES_SUMMARY.md              ← NEW (detailed documentation)
```

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      SIMKO SYSTEM FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Frontend (React/Vite)                                          │
│  ├─ Dashboard.jsx      ──→ Get data ──→ GET /api/v1/...       │
│  ├─ Pesawat.jsx        ──→ Get data ──→ GET /api/v1/aircraft  │
│  └─ Pangkalan.jsx      ──→ Get data ──→ GET /api/v1/airbase   │
│                                            ↓                   │
│  Backend (FastAPI)                                              │
│  ├─ Endpoints                                                   │
│  ├─ CRUD Operations                                             │
│  └─ Database Queries                                            │
│                                            ↓                   │
│  Database (PostgreSQL/MySQL/SQLite)                             │
│  ├─ AircraftType table                                          │
│  ├─ AircraftUnit table                                          │
│  ├─ AirBase table       ← UPDATED (4 new columns)              │
│  └─ Scenario table                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Next Steps

1. ✅ Run database migrations
2. ✅ Initialize sample data
3. ✅ Start backend server
4. ✅ Start frontend server
5. ✅ Test all pages
6. ✅ Verify data displays correctly
7. 📋 Create additional airbases/aircraft through UI
8. 📊 Test simulation and reporting features

---

**Last Updated:** 12 Agustus 2026
**Status:** Ready for Production Testing ✅
