"""
Initialize real-world TNI AU test data for SIMKO system.
Adjusted to match the exact schema constraints of the database:
- AircraftType only has: id, name, description
- AircraftUnit status only accepts: 'READY', 'MAINTENANCE', 'MANDATORY_GROUNDING'
"""

from app.core.database import SessionLocal, engine
from app.models.aircraft import AircraftType, AircraftUnit
from app.models.airbase import AirBase
# from app.models.scenario import Scenario 
from sqlalchemy.exc import IntegrityError

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