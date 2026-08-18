# 🧪 Complete Testing Checklist

## Pre-Testing Setup Verification

### Backend Setup
- [ ] Database migration applied: `ALTER TABLE air_bases ADD COLUMN IF NOT EXISTS status VARCHAR(50)`
- [ ] Sample data initialized: `python -m scripts.init_sample_data` ran successfully
- [ ] Backend server running: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`
- [ ] Port 8000 is accessible: `curl http://localhost:8000/docs` shows Swagger UI
- [ ] CORS enabled for localhost:5173 and localhost:3000

### Frontend Setup
- [ ] Dependencies installed: `npm install` completed
- [ ] Frontend server running: `npm run dev` started successfully
- [ ] Vite running on http://localhost:5173
- [ ] No build errors in console

---

## API Endpoint Testing

### Aircraft API Tests

**Test 1: Get All Aircraft Units**
```bash
curl -X GET http://localhost:8000/api/v1/aircraft/units/ \
  -H "Content-Type: application/json"

Expected Response: 200 OK
Response includes:
✓ id, tail_number, aircraft_type_id, accumulated_flight_hours, status
✓ At least 8 units (TS-101, TS-102, TS-103, TK-201, TK-202, TK-301, TK-401, TK-402)
```

**Test 2: Get Aircraft Types**
```bash
curl -X GET http://localhost:8000/api/v1/aircraft/types/ \
  -H "Content-Type: application/json"

Expected Response: 200 OK
Response includes: F-16C, T-50i, Hercules C-130, CN-235
```

**Test 3: Create New Aircraft Unit**
```bash
curl -X POST http://localhost:8000/api/v1/aircraft/units/ \
  -H "Content-Type: application/json" \
  -d '{
    "aircraft_type_id": 1,
    "tail_number": "TS-999",
    "accumulated_flight_hours": 1500,
    "status": "operational"
  }'

Expected Response: 201 Created
Response includes new unit with id
```

### Airbase API Tests

**Test 4: Get All Airbases**
```bash
curl -X GET http://localhost:8000/api/v1/airbase/ \
  -H "Content-Type: application/json"

Expected Response: 200 OK
Response MUST include:
✓ id, name, location, status
✓ avtur_capacity_liters, avtur_stock_liters
✓ refueler_trucks_count, refueler_trucks_active
✓ apron_capacity_aircraft, apron_used
✓ At least 5 airbases (Halim, Yogyakarta, Surabaya, Kupang, Makassar)

Sample Response:
{
  "id": 1,
  "name": "Lanud Halim Perdanakusuma",
  "location": "Jakarta",
  "status": "optimal",
  "avtur_capacity_liters": 1000000.0,
  "avtur_stock_liters": 750000.0,
  "refueler_trucks_count": 10,
  "refueler_trucks_active": 7,
  "apron_capacity_aircraft": 25,
  "apron_used": 12,
  "special_lube_stock_liters": 0.0,
  "forklifts_count": 0
}
```

**Test 5: Update Airbase**
```bash
curl -X PATCH http://localhost:8000/api/v1/airbase/1 \
  -H "Content-Type: application/json" \
  -d '{
    "avtur_stock_liters": 900000
  }'

Expected Response: 200 OK
Response shows updated avtur_stock_liters
```

---

## Frontend Page Testing

### Dashboard Page Tests

**Test 6: Dashboard Loads**
- [ ] Navigate to http://localhost:5173
- [ ] Dashboard page loads without errors
- [ ] No console errors (F12 → Console)

**Test 7: Dashboard Metrics Display**
- [ ] "Fleet Readiness" card shows percentage (e.g., 62.5%)
- [ ] "Active Bases" card shows number of bases (should be 5)
- [ ] "Average Flight Hours" shows calculated average
- [ ] "Critical Alerts" shows number of aircraft in high usage

**Test 8: Dashboard Data from Backend**
- [ ] Fleet Readiness calculation: (readyAircraft / totalAircraft) * 100
- [ ] Active Bases = count of airbases (5)
- [ ] Average Flight Hours = sum of all aircraft hours / aircraft count
- [ ] Critical Alerts = count of aircraft with hours > 2700

**Test 9: Flight Trend Chart**
- [ ] Chart displays 7-day trend data
- [ ] Chart shows flight hours and fuel consumption
- [ ] Chart renders without errors

**Test 10: Alerts Section**
- [ ] Alert cards display with status colors
- [ ] At least one alert shows (Surabaya low fuel or high usage aircraft)
- [ ] Alert text is readable and informative

**Test 11: Recent Activity Table**
- [ ] Table displays aircraft data
- [ ] Each row shows: tail_number, aircraft_type, flight_hours, status_badge
- [ ] Status badges have correct colors:
  - 🟢 Optimal (< 70%)
  - 🟡 Warning (70-90%)
  - 🔴 Critical (> 90%)

### Pesawat Page Tests

**Test 12: Pesawat Page Loads**
- [ ] Navigate to http://localhost:5173/pesawat
- [ ] Page title: "Daftar Unit Pesawat Taktis & Transport"
- [ ] No console errors

**Test 13: Aircraft Table Displays**
- [ ] Table shows all aircraft units (at least 8 rows)
- [ ] Columns visible: Tail Number | Aircraft Type | Category | Flight Hours | Status | Actions
- [ ] Data populated from backend (not hardcoded)

**Test 14: Search Functionality**
- [ ] Search box allows input
- [ ] Typing "TS-101" filters to show only that aircraft
- [ ] Typing "F-16" filters to show all F-16 aircraft
- [ ] Typing "xyz" shows no results

**Test 15: Category Filter**
- [ ] Filter dropdown contains all categories
- [ ] Selecting "Tempur Taktis" shows only F-16s
- [ ] Selecting "Latih Lanjut" shows only T-50i
- [ ] Selecting "All" shows all aircraft

**Test 16: Flight Hours Progress Bars**
- [ ] Each aircraft shows progress bar
- [ ] Progress bar width = (accumulated_hours / 3000) * 100
- [ ] TS-102 with 2800 hours should be ~93% full (red/critical)
- [ ] TS-103 with 1200 hours should be ~40% full (green/optimal)

**Test 17: Status Badges**
- [ ] Badge colors correct based on percentage:
  - 🟢 Optimal (green) for < 70%
  - 🟡 Minor (orange) for 70-90%
  - 🔴 Kritis (red) for > 90%
- [ ] Badge text matches: "Optimal", "Minor", or "Kritis"

**Test 18: Add Data Modal**
- [ ] Click "Tambah Data" button
- [ ] Modal form appears with fields:
  - Select Aircraft Type
  - Tail Number input
  - Flight Hours input
- [ ] Form validation works (required fields)
- [ ] Submit button creates new aircraft (if connected to backend)

### Pangkalan Page Tests

**Test 19: Pangkalan Page Loads**
- [ ] Navigate to http://localhost:5173/pangkalan
- [ ] Page title: "Kapasitas Fisik & Inventaris Logistik Pangkalan"
- [ ] No console errors

**Test 20: Airbase Cards Display**
- [ ] 5 airbase cards visible in grid layout
- [ ] Cards responsive: 1 column on mobile, 2 on tablet, 3 on desktop
- [ ] No cards are missing or overlapping

**Test 21: Card Content - Lanud Halim**
```
Header Section:
✓ Location: "Jakarta"
✓ Name: "Lanud Halim Perdanakusuma"
✓ Status Badge: "Optimal" (green)

Avtur Tank:
✓ Icon and label visible
✓ Percentage: 75% (750000 / 1000000 * 100)
✓ Progress bar shows 75% width
✓ Text: "750,000 / 1,000,000 Liters"

Refueler Trucks:
✓ Shows 10 numbered boxes
✓ First 7 boxes blue (active)
✓ Boxes 8-10 gray (inactive)
✓ Label shows: "7/10"

Apron Parking:
✓ Progress bar visible
✓ Percentage: 48% (12 / 25 * 100)
✓ Text: "12/25 Bays"
```

**Test 22: Card Content - Lanud Surabaya (Warning Status)**
```
✓ Status Badge shows: "Waspada" (orange)
✓ Avtur Tank: 30% (180000 / 600000) - LOW FUEL
✓ Refueler Trucks: 2/8 (mostly inactive - gray boxes)
✓ Apron Parking: 75% (15/20) - HIGH USAGE
```

**Test 23: All Airbases Check**
- [ ] Lanud Yogyakarta: Optimal status, balanced metrics
- [ ] Lanud Surabaya: Warning status, low fuel indicator
- [ ] Lanud Kupang: Optimal status, smaller capacity
- [ ] Lanud Makassar: Optimal status, high capacity

**Test 24: Styling & Colors**
- [ ] Cards have white background with subtle gradient
- [ ] Hover effect: shadow increases (hover:shadow-lg)
- [ ] Status badges: green (optimal), orange (warning), red (critical)
- [ ] Progress bars: blue gradient (Avtur), cyan-blue (Apron)
- [ ] Icons render correctly with Material Symbols

**Test 25: Error Handling**
- [ ] Stop backend server
- [ ] Refresh Pangkalan page
- [ ] Error message appears: "Gagal memuat data pangkalan..."
- [ ] Message provides helpful hint about backend
- [ ] Restart backend and page should reload successfully

---

## Browser Console Testing

**Test 26: No JavaScript Errors**
- [ ] F12 → Console tab
- [ ] No red error messages
- [ ] No network errors (red failed requests)
- [ ] No warnings related to missing imports

**Test 27: Network Requests**
- [ ] F12 → Network tab
- [ ] Filter to "Fetch/XHR"
- [ ] Dashboard page: Shows requests to `/aircraft/units`, `/airbase/`, `/scenarios/`
- [ ] Pesawat page: Shows request to `/aircraft/units`
- [ ] Pangkalan page: Shows request to `/airbase/`
- [ ] All requests return 200 status with valid JSON

**Test 28: Performance**
- [ ] Dashboard loads in < 2 seconds
- [ ] Pesawat page loads in < 1 second
- [ ] Pangkalan page loads in < 1 second
- [ ] API responses complete in < 500ms

---

## Data Integrity Tests

**Test 29: Dashboard Calculations**
- [ ] Fleet Readiness: 7/8 = 87.5% (1 aircraft grounded)
- [ ] Average Flight Hours: (2500+2800+1200+3500+2200+6500+4800+2100)/8 = 3193.75
- [ ] Active Bases: 5
- [ ] Critical Alerts: Count of aircraft with > 2700 hours = 4 (TS-102, TK-201, TK-301, TK-401)

**Test 30: Pangkalan Calculations**
- [ ] Halim: 750000/1000000 = 75% ✓
- [ ] Yogyakarta: 400000/500000 = 80% ✓
- [ ] Surabaya: 180000/600000 = 30% ✓ (LOW)
- [ ] Kupang: 250000/300000 = 83% ✓
- [ ] Makassar: 600000/800000 = 75% ✓

**Test 31: Pesawat Calculations**
- [ ] TS-101: 2500/3000 = 83.3% (Warning/Orange) ✓
- [ ] TS-102: 2800/3000 = 93.3% (Critical/Red) ✓
- [ ] TS-103: 1200/3000 = 40% (Optimal/Green) ✓
- [ ] TK-201: 3500/7500 = 46.7% (Optimal/Green) ✓

---

## Edge Cases & Error Handling

**Test 32: Empty Database Simulation**
- [ ] Delete all airbases from database
- [ ] Pangkalan page shows: "Belum ada data pangkalan"
- [ ] Shows helpful message to add data
- [ ] No errors in console

**Test 33: Backend Down Scenario**
- [ ] Stop backend server
- [ ] Try to load any page
- [ ] Error message displays to user
- [ ] Page doesn't crash (graceful error handling)

**Test 34: Slow Network Simulation**
- [ ] F12 → Network tab → Throttle to "Slow 3G"
- [ ] Dashboard shows loading spinner
- [ ] Spinner disappears when data loads
- [ ] No timeout errors

**Test 35: Invalid Data Types**
- [ ] Update airbase with: `"avtur_stock_liters": "invalid"`
- [ ] Backend returns 422 Unprocessable Entity
- [ ] Frontend handles gracefully (if connected to UI)

---

## Documentation Tests

**Test 36: README Files Accurate**
- [ ] `BUG_FIXES_SUMMARY.md` describes all changes
- [ ] `QUICK_START.md` provides clear setup steps
- [ ] All file paths in docs are correct
- [ ] All commands in docs are tested and working

**Test 37: API Documentation**
- [ ] Swagger UI accessible: http://localhost:8000/docs
- [ ] All endpoints documented with request/response examples
- [ ] Schema definitions visible for all models

---

## Performance Benchmarks

**Test 38: Load Testing**
```
Dashboard:
- Initial load: < 2000ms
- Metrics calculation: < 500ms
- Chart rendering: < 1000ms

Pesawat:
- Load aircraft list: < 1000ms
- Search filter (client-side): < 100ms
- Category filter (client-side): < 100ms

Pangkalan:
- Load airbases: < 1000ms
- Calculate metrics: < 500ms
- Render grid: < 500ms
```

---

## Final Sign-Off

### Ready for Production If:
- [ ] All 38 tests pass
- [ ] No console errors or warnings
- [ ] All API responses correct
- [ ] All calculations accurate
- [ ] Error handling works properly
- [ ] Performance meets benchmarks
- [ ] Documentation is complete and accurate

### Known Limitations:
- Authentication not yet implemented
- Data persistence only in database (no file export)
- No real-time updates (page refresh required)

### Next Steps After Testing:
1. User authentication (Login/Register functionality)
2. PDF export for reports
3. Real-time data updates (WebSocket)
4. Advanced filtering and search
5. Role-based access control

---

**Test Plan Created:** 12 Agustus 2026
**Total Test Cases:** 38
**Estimated Time:** 30-45 minutes
**Success Criteria:** All tests pass with no critical issues

