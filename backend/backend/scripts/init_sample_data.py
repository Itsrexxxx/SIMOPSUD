"""
Initialize real-world TNI AU test data for SIMKO system.
Adjusted to match the exact schema constraints of the database:
- AircraftType only has: id, name, description
- AircraftUnit status only accepts: 'READY', 'MAINTENANCE', 'MANDATORY_GROUNDING'
"""

import random
from datetime import datetime, timedelta

from app.core.database import SessionLocal, engine
from app.models.aircraft import AircraftType, AircraftUnit
from app.models.airbase import AirBase
from app.models.airbase_avtur_log import AirbaseAvturLog
from app.models.flight_mission import FlightMission
from app.models.scenario import OperationsScenario, ScenarioDeployment
from sqlalchemy.exc import IntegrityError

from math import asin, cos, radians, sin, sqrt


def _distance_km(a, b):
    """Jarak great-circle antar dua pangkalan (km), R=6371."""
    lat1, lon1, lat2, lon2 = map(radians, [a.latitude or 0, a.longitude or 0, b.latitude or 0, b.longitude or 0])
    h = sin((lat2 - lat1) / 2) ** 2 + cos(lat1) * cos(lat2) * sin((lon2 - lon1) / 2) ** 2
    return 6371.0 * 2 * asin(sqrt(h))


# Spek aproksimasi dari data terbuka (Wikipedia/spesifikasi publik), BUKAN AFM/Skatek.
# Toleransi kasar ±20-30%. Dipakai rumus prediksi ETA (cruise, avtur) dan tampilan tabel Tipe Pesawat.
# payload None = jangan diisi (angka tidak meyakinkan). TBO/phase/kalender sengaja tidak disentuh:
# itu kebijakan harwat satuan, bukan data publik.
AIRCRAFT_TYPE_SPECS = {
    # nama tipe: (cruise km/j, avtur L/j, range km, payload kg)
    "Dassault Rafale F4": (900.0, 3000.0, 3700.0, 9500.0),
    "F-16C/D Block 52 Fighting Falcon": (850.0, 2900.0, 4200.0, 7700.0),
    "Sukhoi Su-30MK2": (900.0, 4000.0, 3000.0, 8000.0),
    "Sukhoi Su-27SKM": (900.0, 4000.0, 3500.0, 8000.0),
    "T-50i Golden Eagle": (750.0, 1800.0, 1850.0, 4500.0),
    "BAE Hawk 209": (800.0, 900.0, 2500.0, 3000.0),
    "Embraer EMB 314 Super Tucano": (520.0, 250.0, 1300.0, 1500.0),
    "C-130J-30 Super Hercules": (540.0, 2300.0, 3300.0, 19000.0),
    "Airbus A400M Atlas": (780.0, 4000.0, 6400.0, 37000.0),
    "EADS CASA C-295": (480.0, 800.0, 5600.0, 9250.0),
    "CASA/IPTN CN-235": (450.0, 700.0, 2200.0, 5900.0),
    "Boeing 737-200 Surveiller": (780.0, 3000.0, 4200.0, None),
    "Dassault Falcon 8X": (850.0, 1200.0, 11900.0, 2500.0),
}
# Penanda "belum diisi": NULL (model sekarang) atau angka default lama 650/2200/2000/5000
# yang masih tersimpan di DB hasil seed versi sebelumnya.
SPEC_DEFAULTS = {"cruise_speed_kmh": 650.0, "fuel_burn_lph": 2200.0, "max_range_km": 2000.0, "payload_capacity_kg": 5000.0}


def apply_aircraft_type_specs(db):
    """Isi spek tipe pesawat. Non-clobber: hanya kolom yang masih bernilai default."""
    filled = 0
    for name, values in AIRCRAFT_TYPE_SPECS.items():
        t = db.query(AircraftType).filter_by(name=name).first()
        if not t:
            continue
        for attr, value in zip(SPEC_DEFAULTS, values):
            if value is None:
                continue
            current = getattr(t, attr)
            if current is None or float(current) == SPEC_DEFAULTS[attr]:
                setattr(t, attr, float(value))
                filled += 1
    db.commit()
    return filled


def create_sample_data():
    """Create sample data matching the exact database schema columns"""
    db = SessionLocal()
    
    try:
        # --- 1. MEMBUAT DATA JENIS PESAWAT (AIRCRAFT TYPES) ---
        # Hanya menggunakan kolom 'name' dan 'description' sesuai ER Diagram
        aircraft_types = [
            AircraftType(
                name="Dassault Rafale F4",
                description="Tempur Multiperan Gen 4.5 - Dassault Aviation (Prancis)"
            ),
            AircraftType(
                name="F-16C/D Block 52 Fighting Falcon",
                description="Tempur Multiperan - Lockheed Martin (AS)"
            ),
            AircraftType(
                name="Sukhoi Su-30MK2",
                description="Tempur Multiperan Berat - Sukhoi (Rusia)"
            ),
            AircraftType(
                name="Sukhoi Su-27SKM",
                description="Superioritas Udara - Sukhoi (Rusia)"
            ),
            AircraftType(
                name="T-50i Golden Eagle",
                description="Latih Tempur (LIFT) - KAI (Korea Selatan)"
            ),
            AircraftType(
                name="BAE Hawk 209",
                description="Tempur Taktis Ringan - BAE Systems (Inggris)"
            ),
            AircraftType(
                name="Embraer EMB 314 Super Tucano",
                description="Serang Darat & Lawan Gerilya - Embraer (Brasil)"
            ),
            AircraftType(
                name="C-130J-30 Super Hercules",
                description="Angkut Strategis - Lockheed Martin (AS)"
            ),
            AircraftType(
                name="Airbus A400M Atlas",
                description="Angkut Berat & Tanker - Airbus (Uni Eropa)"
            ),
            AircraftType(
                name="EADS CASA C-295",
                description="Angkut Taktis Menengah - PTDI / EADS (Spanyol-Indo)"
            ),
            AircraftType(
                name="CASA/IPTN CN-235",
                description="Angkut Taktis Ringan - PTDI (Indonesia)"
            ),
            AircraftType(
                name="Boeing 737-200 Surveiller",
                description="Intai Maritim Strategis - Boeing (AS)"
            ),
            AircraftType(
                name="Dassault Falcon 8X",
                description="Komando Pengendalian & VIP - Dassault Aviation (Prancis)"
            )
        ]
        
        for aircraft_type in aircraft_types:
            existing = db.query(AircraftType).filter_by(name=aircraft_type.name).first()
            if not existing:
                db.add(aircraft_type)
                print(f"✅ Menambahkan jenis alutsista: {aircraft_type.name}")
        
        db.commit()

        # --- 1b. SPEK TIPE PESAWAT (cruise/avtur/range/payload) ---
        filled = apply_aircraft_type_specs(db)
        if filled:
            print(f"✅ Spek tipe pesawat diisi: {filled} kolom (hanya yang masih default)")
        
        # Mengambil referensi ID Tipe Pesawat yang baru saja dibuat
        rafale_t = db.query(AircraftType).filter_by(name="Dassault Rafale F4").first()
        f16_t = db.query(AircraftType).filter_by(name="F-16C/D Block 52 Fighting Falcon").first()
        su30_t = db.query(AircraftType).filter_by(name="Sukhoi Su-30MK2").first()
        su27_t = db.query(AircraftType).filter_by(name="Sukhoi Su-27SKM").first()
        t50_t = db.query(AircraftType).filter_by(name="T-50i Golden Eagle").first()
        hawk_t = db.query(AircraftType).filter_by(name="BAE Hawk 209").first()
        tucano_t = db.query(AircraftType).filter_by(name="Embraer EMB 314 Super Tucano").first()
        hercules_t = db.query(AircraftType).filter_by(name="C-130J-30 Super Hercules").first()
        a400m_t = db.query(AircraftType).filter_by(name="Airbus A400M Atlas").first()
        c295_t = db.query(AircraftType).filter_by(name="EADS CASA C-295").first()
        cn235_t = db.query(AircraftType).filter_by(name="CASA/IPTN CN-235").first()
        b737_t = db.query(AircraftType).filter_by(name="Boeing 737-200 Surveiller").first()
        falcon_t = db.query(AircraftType).filter_by(name="Dassault Falcon 8X").first()
        
        # --- 2. MEMBUAT DATA UNIT PESAWAT INDIVIDU (AIRCRAFT UNITS) ---
        # Mengubah parameter status menjadi 'READY' agar sesuai dengan ENUM database
        aircraft_units = [
            # Dassault Rafale F4
            AircraftUnit(aircraft_type_id=rafale_t.id, tail_number="TS-4501", accumulated_flight_hours=120, status="READY"),
            AircraftUnit(aircraft_type_id=rafale_t.id, tail_number="TS-4502", accumulated_flight_hours=95, status="READY"),
            AircraftUnit(aircraft_type_id=rafale_t.id, tail_number="TS-4503", accumulated_flight_hours=80, status="READY"),
            
            # F-16 Fighting Falcon
            AircraftUnit(aircraft_type_id=f16_t.id, tail_number="TS-1601", accumulated_flight_hours=2450, status="READY"),
            AircraftUnit(aircraft_type_id=f16_t.id, tail_number="TS-1620", accumulated_flight_hours=3200, status="READY"),
            AircraftUnit(aircraft_type_id=f16_t.id, tail_number="TS-1641", accumulated_flight_hours=1150, status="READY"),
            
            # Sukhoi Su-30MK2 & Su-27SKM
            AircraftUnit(aircraft_type_id=su30_t.id, tail_number="TS-3001", accumulated_flight_hours=2100, status="READY"),
            AircraftUnit(aircraft_type_id=su30_t.id, tail_number="TS-3011", accumulated_flight_hours=1850, status="READY"),
            AircraftUnit(aircraft_type_id=su27_t.id, tail_number="TS-2701", accumulated_flight_hours=2400, status="READY"),
            
            # T-50i Golden Eagle
            AircraftUnit(aircraft_type_id=t50_t.id, tail_number="TT-5001", accumulated_flight_hours=1500, status="READY"),
            AircraftUnit(aircraft_type_id=t50_t.id, tail_number="TT-5012", accumulated_flight_hours=2100, status="READY"),
            
            # BAE Hawk 209
            AircraftUnit(aircraft_type_id=hawk_t.id, tail_number="TT-0209", accumulated_flight_hours=4200, status="READY"),
            AircraftUnit(aircraft_type_id=hawk_t.id, tail_number="TT-0215", accumulated_flight_hours=3950, status="READY"),
            
            # Super Tucano
            AircraftUnit(aircraft_type_id=tucano_t.id, tail_number="TT-3101", accumulated_flight_hours=1400, status="READY"),
            AircraftUnit(aircraft_type_id=tucano_t.id, tail_number="TT-3108", accumulated_flight_hours=1800, status="READY"),
            
            # C-130J-30 Super Hercules & Airbus A400M
            AircraftUnit(aircraft_type_id=hercules_t.id, tail_number="A-1339", accumulated_flight_hours=450, status="READY"),
            AircraftUnit(aircraft_type_id=hercules_t.id, tail_number="A-1340", accumulated_flight_hours=320, status="READY"),
            AircraftUnit(aircraft_type_id=a400m_t.id, tail_number="A-4001", accumulated_flight_hours=180, status="READY"),
            
            # CN-235 & C-295
            AircraftUnit(aircraft_type_id=cn235_t.id, tail_number="A-2301", accumulated_flight_hours=3500, status="READY"),
            AircraftUnit(aircraft_type_id=c295_t.id, tail_number="A-2901", accumulated_flight_hours=2200, status="READY"),
            
            # Boeing 737 Surveiller
            AircraftUnit(aircraft_type_id=b737_t.id, tail_number="AI-7301", accumulated_flight_hours=7800, status="READY"),
            
            # Falcon 8X
            AircraftUnit(aircraft_type_id=falcon_t.id, tail_number="A-0801", accumulated_flight_hours=240, status="READY")
        ]
        
        for unit in aircraft_units:
            existing = db.query(AircraftUnit).filter_by(tail_number=unit.tail_number).first()
            if not existing:
                db.add(unit)
                print(f"✅ Menambahkan unit ekor pesawat: {unit.tail_number}")
        
        db.commit()

        # --- 2B. DATA TAMBAHAN UNTUK VARIASI PREDIKSI AI ---
        varied_units = [
            AircraftUnit(aircraft_type_id=rafale_t.id, tail_number="TS-4510", accumulated_flight_hours=2850, status="MAINTENANCE"),
            AircraftUnit(aircraft_type_id=f16_t.id, tail_number="TS-1652", accumulated_flight_hours=3100, status="MANDATORY_GROUNDING"),
            AircraftUnit(aircraft_type_id=su30_t.id, tail_number="TS-3022", accumulated_flight_hours=760, status="READY"),
            AircraftUnit(aircraft_type_id=su27_t.id, tail_number="TS-2714", accumulated_flight_hours=2680, status="MAINTENANCE"),
            AircraftUnit(aircraft_type_id=t50_t.id, tail_number="TT-5025", accumulated_flight_hours=420, status="READY"),
            AircraftUnit(aircraft_type_id=hawk_t.id, tail_number="TT-0224", accumulated_flight_hours=3350, status="MANDATORY_GROUNDING"),
            AircraftUnit(aircraft_type_id=tucano_t.id, tail_number="TT-3115", accumulated_flight_hours=230, status="READY"),
            AircraftUnit(aircraft_type_id=hercules_t.id, tail_number="A-1351", accumulated_flight_hours=1950, status="READY"),
            AircraftUnit(aircraft_type_id=a400m_t.id, tail_number="A-4008", accumulated_flight_hours=2750, status="MAINTENANCE"),
            AircraftUnit(aircraft_type_id=c295_t.id, tail_number="A-2912", accumulated_flight_hours=680, status="READY"),
            AircraftUnit(aircraft_type_id=b737_t.id, tail_number="AI-7314", accumulated_flight_hours=5200, status="MANDATORY_GROUNDING"),
            AircraftUnit(aircraft_type_id=falcon_t.id, tail_number="A-0812", accumulated_flight_hours=110, status="READY"),
        ]
        for unit in varied_units:
            existing = db.query(AircraftUnit).filter_by(tail_number=unit.tail_number).first()
            if not existing:
                db.add(unit)
                print(f"✅ Menambahkan unit variasi AI: {unit.tail_number} ({unit.status})")

        db.commit()

        # --- 2C. BACKFILL HARWAT (non-clobber) ---
        # Tanpa last_service_hours/date, _derived_status menghitung hs = akumulasi
        # sehingga unit >300 jam tampak U/S semua (79% armada palsu U/S).
        rng = random.Random(7)
        now = datetime.now()
        backfilled = 0
        for unit in db.query(AircraftUnit).all():
            if unit.last_service_hours and unit.last_service_date:
                continue
            acc = float(unit.accumulated_flight_hours or 0)
            unit.last_service_hours = max(0.0, round(acc - rng.uniform(5, 80), 1))
            unit.last_service_date = now - timedelta(days=rng.randint(5, 35))
            backfilled += 1
        if backfilled:
            db.commit()
            print(f"✅ Backfill harwat {backfilled} unit (last_service_hours/date)")
        
        # --- 3. MEMBUAT DATA PANGKALAN UDARA (AIRBASES) ---
        # Data 24 Lanud Utama
        airbases = [
            # WILAYAH SUMATRA (Koopsud I)
            AirBase(name="Lanud Sultan Iskandar Muda", location="Banda Aceh", status="optimal", avtur_capacity_liters=800000, avtur_stock_liters=640000, refueler_trucks_count=5, refueler_trucks_active=4, apron_capacity_aircraft=12, apron_used=3),
            AirBase(name="Lanud Soewondo", location="Medan", status="optimal", avtur_capacity_liters=1000000, avtur_stock_liters=820000, refueler_trucks_count=6, refueler_trucks_active=5, apron_capacity_aircraft=15, apron_used=6),
            AirBase(name="Lanud Roesmin Nurjadin", location="Pekanbaru", status="optimal", avtur_capacity_liters=1800000, avtur_stock_liters=1500000, refueler_trucks_count=8, refueler_trucks_active=7, apron_capacity_aircraft=30, apron_used=14),
            AirBase(name="Lanud Sri Mulyono Herlambang", location="Palembang", status="optimal", avtur_capacity_liters=750000, avtur_stock_liters=600000, refueler_trucks_count=4, refueler_trucks_active=3, apron_capacity_aircraft=12, apron_used=4),
            AirBase(name="Lanud Raden Sadjad", location="Natuna", status="warning", avtur_capacity_liters=1000000, avtur_stock_liters=320000, refueler_trucks_count=6, refueler_trucks_active=2, apron_capacity_aircraft=15, apron_used=6),
            # WILAYAH JAWA (Koopsud I & II)
            AirBase(name="Lanud Halim Perdanakusuma", location="Jakarta", status="optimal", avtur_capacity_liters=2500000, avtur_stock_liters=2100000, refueler_trucks_count=12, refueler_trucks_active=10, apron_capacity_aircraft=45, apron_used=28),
            AirBase(name="Lanud Atang Sendjaja", location="Bogor", status="optimal", avtur_capacity_liters=900000, avtur_stock_liters=720000, refueler_trucks_count=6, refueler_trucks_active=5, apron_capacity_aircraft=20, apron_used=12),
            AirBase(name="Lanud Suryadarma", location="Subang", status="optimal", avtur_capacity_liters=800000, avtur_stock_liters=650000, refueler_trucks_count=5, refueler_trucks_active=4, apron_capacity_aircraft=18, apron_used=8),
            AirBase(name="Lanud Adisutjipto", location="Yogyakarta", status="optimal", avtur_capacity_liters=1200000, avtur_stock_liters=950000, refueler_trucks_count=8, refueler_trucks_active=7, apron_capacity_aircraft=25, apron_used=15),
            AirBase(name="Lanud Adi Soemarmo", location="Solo", status="optimal", avtur_capacity_liters=1000000, avtur_stock_liters=800000, refueler_trucks_count=6, refueler_trucks_active=5, apron_capacity_aircraft=20, apron_used=10),
            AirBase(name="Lanud Iswahjudi", location="Madiun", status="optimal", avtur_capacity_liters=2000000, avtur_stock_liters=1650000, refueler_trucks_count=10, refueler_trucks_active=8, apron_capacity_aircraft=35, apron_used=21),
            AirBase(name="Lanud Abdulrachman Saleh", location="Malang", status="optimal", avtur_capacity_liters=1500000, avtur_stock_liters=1200000, refueler_trucks_count=8, refueler_trucks_active=6, apron_capacity_aircraft=30, apron_used=18),
            # WILAYAH KALIMANTAN (Koopsud I & II)
            AirBase(name="Lanud Supadio", location="Pontianak", status="optimal", avtur_capacity_liters=1200000, avtur_stock_liters=980000, refueler_trucks_count=6, refueler_trucks_active=5, apron_capacity_aircraft=20, apron_used=11),
            AirBase(name="Lanud Dhomber", location="Balikpapan", status="optimal", avtur_capacity_liters=800000, avtur_stock_liters=640000, refueler_trucks_count=4, refueler_trucks_active=3, apron_capacity_aircraft=12, apron_used=5),
            AirBase(name="Lanud Anang Busra", location="Tarakan", status="optimal", avtur_capacity_liters=900000, avtur_stock_liters=710000, refueler_trucks_count=5, refueler_trucks_active=4, apron_capacity_aircraft=15, apron_used=6),
            # WILAYAH SULAWESI & MALUKU (Koopsud II & III)
            AirBase(name="Lanud Sultan Hasanuddin", location="Makassar", status="optimal", avtur_capacity_liters=2200000, avtur_stock_liters=1800000, refueler_trucks_count=10, refueler_trucks_active=9, apron_capacity_aircraft=40, apron_used=24),
            AirBase(name="Lanud Sam Ratulangi", location="Manado", status="optimal", avtur_capacity_liters=800000, avtur_stock_liters=610000, refueler_trucks_count=4, refueler_trucks_active=3, apron_capacity_aircraft=12, apron_used=4),
            AirBase(name="Lanud Pattimura", location="Ambon", status="optimal", avtur_capacity_liters=700000, avtur_stock_liters=550000, refueler_trucks_count=4, refueler_trucks_active=3, apron_capacity_aircraft=10, apron_used=3),
            # BALI & NUSA TENGGARA (Koopsud II)
            AirBase(name="Lanud I Gusti Ngurah Rai", location="Bali", status="optimal", avtur_capacity_liters=1000000, avtur_stock_liters=850000, refueler_trucks_count=6, refueler_trucks_active=5, apron_capacity_aircraft=15, apron_used=7),
            AirBase(name="Lanud El Tari", location="Kupang", status="optimal", avtur_capacity_liters=600000, avtur_stock_liters=450000, refueler_trucks_count=4, refueler_trucks_active=3, apron_capacity_aircraft=12, apron_used=5),
            # WILAYAH PAPUA (Koopsud III)
            AirBase(name="Lanud Manuhua", location="Biak", status="optimal", avtur_capacity_liters=1500000, avtur_stock_liters=1100000, refueler_trucks_count=8, refueler_trucks_active=6, apron_capacity_aircraft=25, apron_used=10),
            AirBase(name="Lanud Silas Papare", location="Jayapura", status="optimal", avtur_capacity_liters=1000000, avtur_stock_liters=780000, refueler_trucks_count=6, refueler_trucks_active=5, apron_capacity_aircraft=18, apron_used=8),
            AirBase(name="Lanud Yohanis Kapiyau", location="Timika", status="optimal", avtur_capacity_liters=600000, avtur_stock_liters=490000, refueler_trucks_count=4, refueler_trucks_active=3, apron_capacity_aircraft=10, apron_used=4),
            AirBase(name="Lanud Johannes Abraham Dimara", location="Merauke", status="optimal", avtur_capacity_liters=500000, avtur_stock_liters=380000, refueler_trucks_count=4, refueler_trucks_active=3, apron_capacity_aircraft=10, apron_used=3)
        ]
        
        for base in airbases:
            existing = db.query(AirBase).filter_by(name=base.name).first()
            if not existing:
                db.add(base)
                print(f"✅ Menambahkan pangkalan udara: {base.name}")

        varied_airbases = [
            AirBase(name="Lanud Sultan Babullah", location="Ternate, Maluku Utara", status="warning", avtur_capacity_liters=450000, avtur_stock_liters=105000, special_lube_stock_liters=1200, refueler_trucks_count=4, refueler_trucks_active=1, forklifts_count=1, apron_capacity_aircraft=8, apron_used=7),
            AirBase(name="Lanud Komodo", location="Labuan Bajo, Nusa Tenggara Timur", status="critical", avtur_capacity_liters=300000, avtur_stock_liters=45000, special_lube_stock_liters=400, refueler_trucks_count=3, refueler_trucks_active=1, forklifts_count=0, apron_capacity_aircraft=6, apron_used=6),
            AirBase(name="Lanud Haluoleo", location="Kendari, Sulawesi Tenggara", status="optimal", avtur_capacity_liters=1400000, avtur_stock_liters=1250000, special_lube_stock_liters=6800, refueler_trucks_count=8, refueler_trucks_active=8, forklifts_count=5, apron_capacity_aircraft=24, apron_used=9),
            AirBase(name="Lanud Maimun Saleh", location="Sabang, Aceh", status="warning", avtur_capacity_liters=650000, avtur_stock_liters=195000, special_lube_stock_liters=900, refueler_trucks_count=5, refueler_trucks_active=2, forklifts_count=1, apron_capacity_aircraft=10, apron_used=8),
        ]
        for base in varied_airbases:
            existing = db.query(AirBase).filter_by(name=base.name).first()
            if not existing:
                db.add(base)
                print(f"✅ Menambahkan pangkalan variasi AI: {base.name} ({base.status})")
        
        db.commit()

        # --- 3B. BERSIHKAN LANUD FIKTIF LAMA (alihkan referensi dulu, baru hapus) ---
        legacy_fake = ["Lanud Cakrawala Timur", "Lanud Garuda Selatan", "Lanud Nusantara Barat", "Lanud Rajawali Utara"]
        fallback = db.query(AirBase).filter(AirBase.name.notin_(legacy_fake)).order_by(AirBase.id).first()
        removed = 0
        for name in legacy_fake:
            base = db.query(AirBase).filter_by(name=name).first()
            if not base:
                continue
            if fallback:
                db.query(AircraftUnit).filter(AircraftUnit.airbase_id == base.id).update({"airbase_id": fallback.id}, synchronize_session=False)
                db.query(FlightMission).filter(FlightMission.origin_base_id == base.id).update({"origin_base_id": fallback.id}, synchronize_session=False)
                db.query(FlightMission).filter(FlightMission.destination_base_id == base.id).update({"destination_base_id": fallback.id}, synchronize_session=False)
            db.query(AirbaseAvturLog).filter(AirbaseAvturLog.airbase_id == base.id).delete(synchronize_session=False)
            db.delete(base)
            removed += 1
        if removed:
            db.commit()
            print(f"✅ Hapus {removed} lanud fiktif lama (referensi dialihkan)")
        all_airbases = db.query(AirBase).order_by(AirBase.id).all()
        all_aircraft = db.query(AircraftUnit).order_by(AircraftUnit.id).all()
        for index, aircraft in enumerate(all_aircraft):
            if aircraft.airbase_id is None and all_airbases:
                aircraft.airbase_id = all_airbases[index % len(all_airbases)].id
        db.commit()

        # --- 4. SKENARIO DAN DEPLOYMENT UNTUK SIMULASI AI ---
        scenario_definitions = [
            ("Patroli Perbatasan Utara", "Pengerahan terbatas dengan dukungan logistik memadai.", ["TS-4501", "TS-4502", "TT-5001"]),
            ("Operasi Siaga Maritim", "Pengerahan armada intai dengan beban jam terbang tinggi.", ["AI-7301", "AI-7314", "A-2301", "A-2901"]),
            ("Latihan Gabungan Skala Besar", "Simulasi pengerahan multi-peran untuk menguji kapasitas pangkalan.", ["TS-1601", "TS-1641", "TS-3001", "TS-3011", "A-1339", "A-1340"]),
            ("Dukungan Kemanusiaan Regional", "Operasi angkut dengan prioritas kesiapan dan konsumsi bahan bakar.", ["A-4001", "A-4008", "A-1351", "TT-3101"]),
        ]
        for name, description, tail_numbers in scenario_definitions:
            scenario = db.query(OperationsScenario).filter_by(name=name).first()
            if not scenario:
                scenario = OperationsScenario(name=name, description=description)
                db.add(scenario)
                db.flush()
                for tail_number in tail_numbers:
                    aircraft = db.query(AircraftUnit).filter_by(tail_number=tail_number).first()
                    if aircraft:
                        db.add(ScenarioDeployment(scenario_id=scenario.id, aircraft_id=aircraft.id))
                print(f"✅ Menambahkan skenario operasi: {name}")

        # --- 4b. KOORDINAT LANUD (dasar haversine misi) ---
        lanud_coords = {
            "Lanud Sultan Iskandar Muda": (3.5592, 98.6712),
            "Lanud Soewondo": (3.5583, 98.6720),
            "Lanud Roesmin Nurjadin": (0.4608, 101.4458),
            "Lanud Sri Mulyono Herlambang": (-2.8992, 104.7010),
            "Lanud Raden Sadjad": (3.9400, 108.3840),
            "Lanud Halim Perdanakusuma": (-6.2666, 106.8908),
            "Lanud Atang Sendjaja": (-6.5536, 106.7560),
            "Lanud Suryadarma": (-6.5730, 107.6660),
            "Lanud Adisutjipto": (-7.7880, 110.4320),
            "Lanud Adi Soemarmo": (-7.5160, 110.7570),
            "Lanud Iswahjudi": (-7.6160, 111.4340),
            "Lanud Abdulrachman Saleh": (-7.9260, 112.7140),
            "Lanud Supadio": (-0.1490, 109.4030),
            "Lanud Dhomber": (-1.2680, 116.8940),
            "Lanud Anang Busra": (3.3270, 117.5690),
            "Lanud Sultan Hasanuddin": (-5.0620, 119.5540),
            "Lanud Sam Ratulangi": (1.5490, 124.9260),
            "Lanud Pattimura": (-3.7100, 128.0890),
            "Lanud I Gusti Ngurah Rai": (-8.7480, 115.1670),
            "Lanud El Tari": (-10.1720, 123.6710),
            "Lanud Manuhua": (-1.1900, 136.1080),
            "Lanud Silas Papare": (-2.5770, 140.5160),
            "Lanud Yohanis Kapiyau": (-4.5283, 136.8886),
            "Lanud Johannes Abraham Dimara": (-8.5200, 140.4180),
            "Lanud Sultan Babullah": (0.8317, 127.3810),
            "Lanud Komodo": (-8.4867, 119.8890),
            "Lanud Haluoleo": (-4.0816, 122.4180),
            "Lanud Maimun Saleh": (5.8736, 95.3394),
        }
        for name, (lat, lon) in lanud_coords.items():
            base = db.query(AirBase).filter_by(name=name).first()
            if base and not base.latitude and not base.longitude:
                base.latitude, base.longitude = lat, lon
        db.commit()

        # --- 4c. IDENTITAS LANUD (non-clobber) ---
        # Tanpa code/icao, Situational Overview merender semua marker "BASE" dan
        # dropdown jadi "Lanud X — Lanud X". Kodau juga jangan seragam "Kodau I".
        # (code, icao, tipe, runway_m, elev_m, kodau) — aproksimasi data terbuka.
        lanud_identitas = {
            "Lanud Sultan Iskandar Muda": ("SIM", "WITT", "A", 3000, 20, "Kodau I"),
            "Lanud Soewondo": ("SWO", "WIMK", "B", 2900, 35, "Kodau I"),
            "Lanud Roesmin Nurjadin": ("RSN", "WIBB", "A", 2600, 31, "Kodau I"),
            "Lanud Sri Mulyono Herlambang": ("SMH", "WIPP", "A", 3000, 15, "Kodau I"),
            "Lanud Raden Sadjad": ("RSD", "WIDO", "B", 1800, 3, "Kodau I"),
            "Lanud Halim Perdanakusuma": ("HLP", "WIHH", "A", 3000, 25, "Kodau I"),
            "Lanud Atang Sendjaja": ("ATS", "WIAJ", "B", 2500, 165, "Kodau I"),
            "Lanud Suryadarma": ("SDM", "WIIL", "B", 1500, 110, "Kodau I"),
            "Lanud Adisutjipto": ("ADI", "WAHH", "B", 2200, 114, "Kodau II"),
            "Lanud Adi Soemarmo": ("ASM", "WAHQ", "B", 2600, 128, "Kodau II"),
            "Lanud Iswahjudi": ("IWJ", "WARI", "A", 3050, 110, "Kodau II"),
            "Lanud Abdulrachman Saleh": ("ABD", "WARA", "A", 2000, 526, "Kodau II"),
            "Lanud Supadio": ("SPO", "WIOO", "A", 2250, 3, "Kodau I"),
            "Lanud Dhomber": ("DMB", "WALL", "A", 2450, 4, "Kodau II"),
            "Lanud Anang Busra": ("ANB", "WAQQ", "B", 2500, 6, "Kodau II"),
            "Lanud Sultan Hasanuddin": ("SHS", "WAAA", "A", 3100, 15, "Kodau II"),
            "Lanud Sam Ratulangi": ("SMR", "WAMM", "B", 2650, 81, "Kodau II"),
            "Lanud Pattimura": ("PTM", "WAPP", "B", 2500, 10, "Kodau III"),
            "Lanud I Gusti Ngurah Rai": ("IGN", "WADD", "A", 3000, 4, "Kodau II"),
            "Lanud El Tari": ("ELT", "WATT", "B", 2500, 102, "Kodau II"),
            "Lanud Manuhua": ("MNH", "WABB", "A", 3570, 15, "Kodau III"),
            "Lanud Silas Papare": ("SLP", "WAJJ", "B", 3000, 88, "Kodau III"),
            "Lanud Yohanis Kapiyau": ("YKP", "WABP", "B", 2200, 30, "Kodau III"),
            "Lanud Johannes Abraham Dimara": ("JAD", "WAKK", "B", 1850, 10, "Kodau III"),
            "Lanud Sultan Babullah": ("TTE", "WAEE", "B", 1850, 15, "Kodau III"),
            "Lanud Komodo": ("LBJ", "WATO", "C", 2200, 20, "Kodau II"),
            "Lanud Haluoleo": ("KDI", "WAWL", "B", 2500, 30, "Kodau II"),
            "Lanud Maimun Saleh": ("MUS", "WITB", "C", 1850, 5, "Kodau I"),
        }
        filled = 0
        for name, (code, icao, tipe, runway, elev, kodau) in lanud_identitas.items():
            base = db.query(AirBase).filter_by(name=name).first()
            if not base:
                continue
            changed = False
            for field, value in (("code", code), ("icao", icao), ("tipe", tipe), ("runway_m", runway), ("elev_m", elev), ("kodau", kodau)):
                if getattr(base, field) in (None, "", "Kodau I" if field == "kodau" else None):
                    setattr(base, field, value)
                    changed = True
            filled += 1 if changed else 0
        if filled:
            db.commit()
            print(f"✅ Identitas lanud diisi: {filled} pangkalan (code/ICAO/tipe/runway/elev/kodau)")

        # --- 5. MISI PENERBANGAN (contoh lintas status untuk uji UI/tabel) ---
        from app.models.flight_mission import FlightMissionStatus

        if db.query(FlightMission).count() == 0:
            # (tail, origin, destination, status, offset_jam_dari_sekarang, FL, payload_kg)
            mission_defs = [
                ("TS-4501", 0, 3, FlightMissionStatus.SCHEDULED, 3, 280, 3200),
                ("TS-4502", 1, 4, FlightMissionStatus.SCHEDULED, 5, 260, 2400),
                ("TS-1601", 2, 5, FlightMissionStatus.SCHEDULED, 9, 300, 4100),
                ("A-4001", 3, 1, FlightMissionStatus.SCHEDULED, 26, 240, 6800),
                ("TS-3001", 4, 2, FlightMissionStatus.IN_FLIGHT, -0.75, 290, 2900),
                ("AI-7301", 5, 0, FlightMissionStatus.IN_FLIGHT, -1.5, 270, 1800),
                ("TT-5001", 2, 4, FlightMissionStatus.IN_FLIGHT, -2.25, 250, 5200),
                ("TS-1641", 1, 3, FlightMissionStatus.ARRIVED, -6, 280, 3400),
                ("A-1351", 5, 1, FlightMissionStatus.ARRIVED, -11, 230, 7100),
            ]
            now = datetime.utcnow()
            for tail, oi, di, status, offset_hours, fl, payload in mission_defs:
                aircraft = db.query(AircraftUnit).filter_by(tail_number=tail).first()
                if not aircraft or len(all_airbases) <= max(oi, di):
                    continue
                origin, destination = all_airbases[oi], all_airbases[di]
                if origin.id == destination.id:
                    continue
                distance = round(_distance_km(origin, destination), 1)
                duration = round(distance / 780.0 * 60 + 15, 1)
                departure = now + timedelta(hours=offset_hours)
                arrival = departure + timedelta(minutes=duration)
                mission = FlightMission(
                    aircraft_id=aircraft.id,
                    origin_base_id=origin.id,
                    destination_base_id=destination.id,
                    scheduled_departure=departure,
                    predicted_duration_minutes=duration,
                    predicted_arrival=arrival,
                    distance_km=distance,
                    status=status,
                    flight_level=fl,
                    payload_kg=payload,
                    taxi_time_minutes=15,
                    aircraft_hours_before_departure=float(aircraft.accumulated_flight_hours or 0.0),
                    origin_weather_temp=29.0, origin_weather_wind_speed=14.0, origin_weather_condition="Cerah Berawan",
                    destination_weather_temp=27.5, destination_weather_wind_speed=18.0, destination_weather_condition="Hujan Ringan",
                    sigmet_active="NIL", taf_summary="TAF valid 6 jam, angin permukaan 12-18 kt",
                )
                if status == FlightMissionStatus.IN_FLIGHT:
                    mission.actual_departure = departure
                    mission.approved_at = departure - timedelta(minutes=40)
                elif status == FlightMissionStatus.ARRIVED:
                    mission.actual_departure = departure
                    mission.actual_arrival = arrival + timedelta(minutes=7)
                    mission.approved_at = departure - timedelta(minutes=45)
                    mission.eta_variance_minutes = 7.0
                db.add(mission)
            db.commit()
            print(f"✅ Menambahkan {len(mission_defs)} misi penerbangan contoh")

        # Perbaiki misi lama yang tersimpan dengan jarak 0 (koordinat lanud belum terisi).
        fixed = 0
        for mission in db.query(FlightMission).filter(FlightMission.distance_km == 0).all():
            origin = db.get(AirBase, mission.origin_base_id)
            destination = db.get(AirBase, mission.destination_base_id)
            if not origin or not destination:
                continue
            distance = round(_distance_km(origin, destination), 1)
            if distance <= 0:
                continue
            duration = round(distance / 780.0 * 60 + 15, 1)
            mission.distance_km = distance
            mission.predicted_duration_minutes = duration
            mission.predicted_arrival = mission.scheduled_departure + timedelta(minutes=duration)
            fixed += 1
        if fixed:
            db.commit()
            print(f"✅ Memperbaiki {fixed} misi dengan jarak 0")

        db.commit()
        print("\n✅ Pembuatan seluruh data sampel TNI AU berhasil diselesaikan!")
    except IntegrityError as e:
        db.rollback()
        print(f"⚠️ Data sudah ada di dalam database: {e}")
    except Exception as e:
        db.rollback()
        print(f"❌ Terjadi kesalahan dalam pembuatan data sampel: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("🚀 Memulai inisialisasi data operasional TNI AU untuk sistem SIMKO...")
    create_sample_data()
    print("✅ Proses selesai!")