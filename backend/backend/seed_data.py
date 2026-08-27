"""
Database Seeder - Script Pengisian Data Master & Operasional Realistis TNI AU
Untuk Aplikasi SIMKO (Sistem Informasi Manajemen Kekuatan Operasi Udara)
"""

from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from app.core.database import engine, SessionLocal, Base
from app.core.security import hash_password
from app.models.user import User
from app.models.aircraft import AircraftType, AircraftUnit, AircraftStatus
from app.models.airbase import AirBase
from app.models.scenario import OperationsScenario, ScenarioDeployment

def seed_database():
    db = SessionLocal()
    print("Memulai sinkronisasi dan pengisian data dummy TNI AU...")

    try:
        # 1. Buat tabel jika belum ada
        Base.metadata.create_all(bind=engine)

        # 2. Bersihkan data lama secara berurutan
        db.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        db.execute(text("TRUNCATE TABLE scenario_deployments;"))
        db.execute(text("TRUNCATE TABLE operations_scenarios;"))
        db.execute(text("TRUNCATE TABLE aircraft_units;"))
        db.execute(text("TRUNCATE TABLE aircraft_types;"))
        db.execute(text("TRUNCATE TABLE air_bases;"))
        db.execute(text("TRUNCATE TABLE users;"))
        db.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        db.commit()
        print("Tabel berhasil dibersihkan.")

        # 3. Seeding Data USERS (Personel & Pengguna Sistem TNI AU)
        # Default password untuk semua akun dummy: admin123
        default_pwd = hash_password("admin123")
        now = datetime.now(timezone.utc)

        users_data = [
            User(
                username="admin.mabes",
                hashed_password=default_pwd,
                full_name="Kolonel Pnb Hendra Kurniawan, S.E., M.M.S.",
                email="hendra.kurniawan@tni-au.mil.id",
                nip="523819",
                service_unit="Sopsau Mabes TNI AU",
                role="Administrator",
                permissions=["dashboard", "aircraft", "airbase", "scenarios", "ai", "users"],
                is_approved=True,
                approved_at=now
            ),
            User(
                username="analyst.ops",
                hashed_password=default_pwd,
                full_name="Mayor Pnb Dimas Prasetyo, M.Han.",
                email="dimas.prasetyo@tni-au.mil.id",
                nip="534210",
                service_unit="Disbangopsau Mabes AU",
                role="Operator",
                permissions=["dashboard", "aircraft", "airbase", "scenarios", "ai"],
                is_approved=True,
                approved_at=now
            ),
            User(
                username="pangkoopsud",
                hashed_password=default_pwd,
                full_name="Marsda TNI Agus Setiawan, S.T., M.Sc.",
                email="agus.setiawan@koopsudnas.mil.id",
                nip="512903",
                service_unit="Mako Koopsudnas",
                role="Pimpinan",
                permissions=["dashboard", "scenarios", "ai"],
                is_approved=True,
                approved_at=now
            ),
            User(
                username="ops.iswahjudi",
                hashed_password=default_pwd,
                full_name="Kapten Pnb Rizky Firmansyah",
                email="rizky.f@skadron3.mil.id",
                nip="541092",
                service_unit="Skadron Udara 3 Lanud Iswahjudi",
                role="Operator",
                permissions=["dashboard", "aircraft", "airbase", "scenarios", "ai"],
                is_approved=True,
                approved_at=now
            ),
            User(
                username="ops.roesmin",
                hashed_password=default_pwd,
                full_name="Kapten Pnb Aditya Wardhana",
                email="aditya.w@skadron16.mil.id",
                nip="542314",
                service_unit="Skadron Udara 16 Lanud Roesmin Nurjadin",
                role="Operator",
                permissions=["dashboard", "aircraft", "airbase", "scenarios", "ai"],
                is_approved=True,
                approved_at=now
            ),
            User(
                username="cadet.pending",
                hashed_password=default_pwd,
                full_name="Letda Pnb Fajar Nugraha",
                email="fajar.nugraha@tni-au.mil.id",
                nip="548901",
                service_unit="Wing Udara 1",
                role="Operator",
                permissions=["dashboard"],
                is_approved=False,
                approved_at=None
            ),
        ]
        db.add_all(users_data)
        db.commit()
        print(f"Berhasil menambahkan {len(users_data)} Akun Personel TNI AU.")

        # 4. Seeding Data AIRCRAFT TYPES (Jenis Pesawat Nyata TNI AU)
        types_data = [
            AircraftType(
                name="F-16C/D Fighting Falcon Block 52ID",
                description="Pesawat Tempur Multi-Peran Taktis (Air Superiority & Close Air Support) Skadron Udara 3 & 16"
            ),
            AircraftType(
                name="Sukhoi Su-27SKM / Su-30MK2 Flanker",
                description="Pesawat Tempur Berat Superioritas Udara Jarak Jauh Skadron Udara 11"
            ),
            AircraftType(
                name="T-50i Golden Eagle",
                description="Pesawat Tempur Latih Lanjut & Serang Ringan (Lead-In Fighter Trainer) Skadron Udara 15"
            ),
            AircraftType(
                name="C-130J-30 Super Hercules",
                description="Pesawat Angkut Berat Taktis Strategis Skadron Udara 31 & 32"
            ),
            AircraftType(
                name="Boeing 737-2X9 Surveiller",
                description="Pesawat Intai Maritim Taktis Jarak Jauh (Maritime Patrol & Reconnaissance) Skadron Udara 5"
            ),
            AircraftType(
                name="EMB-314 Super Tucano",
                description="Pesawat Tempur Taktis Counter-Insurgency (COIN) & Serang Darat Skadron Udara 21"
            ),
        ]
        db.add_all(types_data)
        db.commit()
        print(f"Berhasil menambahkan {len(types_data)} Tipe Pesawat TNI AU.")

        # 5. Seeding Data AIR BASES (Pangkalan Udara Utama Koopsud I, II, III)
        bases_data = [
            AirBase(
                name="Lanud Iswahjudi (IWJ)",
                location="Madiun, Jawa Timur (Koopsud II)",
                status="optimal",
                avtur_capacity_liters=850000.0,
                avtur_stock_liters=680000.0,
                special_lube_stock_liters=4500.0,
                refueler_trucks_count=8,
                refueler_trucks_active=7,
                forklifts_count=6,
                apron_capacity_aircraft=24,
                apron_used=12
            ),
            AirBase(
                name="Lanud Roesmin Nurjadin (RSN)",
                location="Pekanbaru, Riau (Koopsud I)",
                status="optimal",
                avtur_capacity_liters=750000.0,
                avtur_stock_liters=590000.0,
                special_lube_stock_liters=3800.0,
                refueler_trucks_count=6,
                refueler_trucks_active=5,
                forklifts_count=4,
                apron_capacity_aircraft=18,
                apron_used=8
            ),
            AirBase(
                name="Lanud Sultan Hasanuddin (HND)",
                location="Makassar, Sulawesi Selatan (Koopsud II)",
                status="optimal",
                avtur_capacity_liters=900000.0,
                avtur_stock_liters=720000.0,
                special_lube_stock_liters=5000.0,
                refueler_trucks_count=7,
                refueler_trucks_active=6,
                forklifts_count=5,
                apron_capacity_aircraft=20,
                apron_used=10
            ),
            AirBase(
                name="Lanud Halim Perdanakusuma (HLM)",
                location="Jakarta Timur, DKI Jakarta (Koopsud I)",
                status="optimal",
                avtur_capacity_liters=1200000.0,
                avtur_stock_liters=950000.0,
                special_lube_stock_liters=6000.0,
                refueler_trucks_count=10,
                refueler_trucks_active=9,
                forklifts_count=8,
                apron_capacity_aircraft=30,
                apron_used=14
            ),
            AirBase(
                name="Lanud Abdulrachman Saleh (ABD)",
                location="Malang, Jawa Timur (Koopsud II)",
                status="warning",
                avtur_capacity_liters=500000.0,
                avtur_stock_liters=210000.0, # Stock rendah (warning)
                special_lube_stock_liters=2500.0,
                refueler_trucks_count=4,
                refueler_trucks_active=3,
                forklifts_count=3,
                apron_capacity_aircraft=14,
                apron_used=7
            ),
            AirBase(
                name="Lanud Supadio (SPO)",
                location="Pontianak, Kalimantan Barat (Koopsud I)",
                status="optimal",
                avtur_capacity_liters=600000.0,
                avtur_stock_liters=480000.0,
                special_lube_stock_liters=3000.0,
                refueler_trucks_count=5,
                refueler_trucks_active=4,
                forklifts_count=4,
                apron_capacity_aircraft=16,
                apron_used=6
            ),
            AirBase(
                name="Lanud Raden Sadjad (RSA)",
                location="Ranai, Natuna (Koopsud I)",
                status="warning",
                avtur_capacity_liters=350000.0,
                avtur_stock_liters=140000.0,
                special_lube_stock_liters=1800.0,
                refueler_trucks_count=3,
                refueler_trucks_active=2,
                forklifts_count=2,
                apron_capacity_aircraft=10,
                apron_used=6
            ),
            AirBase(
                name="Lanud Anang Busra (TAR)",
                location="Tarakan, Kalimantan Utara (Koopsud II)",
                status="critical",
                avtur_capacity_liters=250000.0,
                avtur_stock_liters=65000.0, # Sangat minim (critical)
                special_lube_stock_liters=1000.0,
                refueler_trucks_count=2,
                refueler_trucks_active=1,
                forklifts_count=1,
                apron_capacity_aircraft=8,
                apron_used=5
            ),
        ]
        db.add_all(bases_data)
        db.commit()
        print(f"Berhasil menambahkan {len(bases_data)} Pangkalan Udara (Lanud).")

        # 6. Seeding Data AIRCRAFT UNITS (Tail Numbers Nyata & Jam Terbang)
        # Ambil ID types dan bases
        f16_id = types_data[0].id
        su_id = types_data[1].id
        t50_id = types_data[2].id
        c130_id = types_data[3].id
        b737_id = types_data[4].id
        tucano_id = types_data[5].id

        iwj_id = bases_data[0].id
        rsn_id = bases_data[1].id
        hnd_id = bases_data[2].id
        hlm_id = bases_data[3].id
        abd_id = bases_data[4].id

        units_data = [
            # Skadron Udara 3 (Lanud Iswahjudi) - F-16
            AircraftUnit(tail_number="TS-1601", accumulated_flight_hours=145.5, status=AircraftStatus.READY, aircraft_type_id=f16_id, airbase_id=iwj_id),
            AircraftUnit(tail_number="TS-1602", accumulated_flight_hours=180.0, status=AircraftStatus.READY, aircraft_type_id=f16_id, airbase_id=iwj_id),
            AircraftUnit(tail_number="TS-1603", accumulated_flight_hours=240.2, status=AircraftStatus.READY, aircraft_type_id=f16_id, airbase_id=iwj_id),
            AircraftUnit(tail_number="TS-1604", accumulated_flight_hours=285.0, status=AircraftStatus.READY, aircraft_type_id=f16_id, airbase_id=iwj_id), # Mendekati batas
            AircraftUnit(tail_number="TS-1605", accumulated_flight_hours=195.0, status=AircraftStatus.MAINTENANCE, aircraft_type_id=f16_id, airbase_id=iwj_id),
            AircraftUnit(tail_number="TS-1606", accumulated_flight_hours=305.5, status=AircraftStatus.MANDATORY_GROUNDING, aircraft_type_id=f16_id, airbase_id=iwj_id), # Grounding (>300h)

            # Skadron Udara 16 (Lanud Roesmin Nurjadin) - F-16
            AircraftUnit(tail_number="TS-1610", accumulated_flight_hours=110.0, status=AircraftStatus.READY, aircraft_type_id=f16_id, airbase_id=rsn_id),
            AircraftUnit(tail_number="TS-1611", accumulated_flight_hours=165.5, status=AircraftStatus.READY, aircraft_type_id=f16_id, airbase_id=rsn_id),
            AircraftUnit(tail_number="TS-1612", accumulated_flight_hours=220.0, status=AircraftStatus.READY, aircraft_type_id=f16_id, airbase_id=rsn_id),
            AircraftUnit(tail_number="TS-1614", accumulated_flight_hours=290.0, status=AircraftStatus.READY, aircraft_type_id=f16_id, airbase_id=rsn_id),

            # Skadron Udara 11 (Lanud Sultan Hasanuddin) - Sukhoi Su-27/30
            AircraftUnit(tail_number="TS-2701", accumulated_flight_hours=125.0, status=AircraftStatus.READY, aircraft_type_id=su_id, airbase_id=hnd_id),
            AircraftUnit(tail_number="TS-2702", accumulated_flight_hours=190.5, status=AircraftStatus.READY, aircraft_type_id=su_id, airbase_id=hnd_id),
            AircraftUnit(tail_number="TS-3001", accumulated_flight_hours=150.0, status=AircraftStatus.READY, aircraft_type_id=su_id, airbase_id=hnd_id),
            AircraftUnit(tail_number="TS-3002", accumulated_flight_hours=275.0, status=AircraftStatus.READY, aircraft_type_id=su_id, airbase_id=hnd_id),
            AircraftUnit(tail_number="TS-3003", accumulated_flight_hours=312.0, status=AircraftStatus.MANDATORY_GROUNDING, aircraft_type_id=su_id, airbase_id=hnd_id),

            # Skadron Udara 15 (Lanud Iswahjudi) - T-50i Golden Eagle
            AircraftUnit(tail_number="TT-5001", accumulated_flight_hours=95.0, status=AircraftStatus.READY, aircraft_type_id=t50_id, airbase_id=iwj_id),
            AircraftUnit(tail_number="TT-5002", accumulated_flight_hours=130.0, status=AircraftStatus.READY, aircraft_type_id=t50_id, airbase_id=iwj_id),
            AircraftUnit(tail_number="TT-5003", accumulated_flight_hours=210.0, status=AircraftStatus.READY, aircraft_type_id=t50_id, airbase_id=iwj_id),
            AircraftUnit(tail_number="TT-5005", accumulated_flight_hours=185.0, status=AircraftStatus.MAINTENANCE, aircraft_type_id=t50_id, airbase_id=iwj_id),

            # Skadron Udara 31 (Lanud Halim Perdanakusuma) - C-130J Super Hercules
            AircraftUnit(tail_number="A-1339", accumulated_flight_hours=140.0, status=AircraftStatus.READY, aircraft_type_id=c130_id, airbase_id=hlm_id),
            AircraftUnit(tail_number="A-1340", accumulated_flight_hours=175.0, status=AircraftStatus.READY, aircraft_type_id=c130_id, airbase_id=hlm_id),
            AircraftUnit(tail_number="A-1341", accumulated_flight_hours=230.5, status=AircraftStatus.READY, aircraft_type_id=c130_id, airbase_id=hlm_id),
            AircraftUnit(tail_number="A-1342", accumulated_flight_hours=85.0, status=AircraftStatus.READY, aircraft_type_id=c130_id, airbase_id=hlm_id),

            # Skadron Udara 5 (Lanud Sultan Hasanuddin) - Boeing 737 Surveiller
            AircraftUnit(tail_number="AI-7301", accumulated_flight_hours=160.0, status=AircraftStatus.READY, aircraft_type_id=b737_id, airbase_id=hnd_id),
            AircraftUnit(tail_number="AI-7302", accumulated_flight_hours=215.0, status=AircraftStatus.READY, aircraft_type_id=b737_id, airbase_id=hnd_id),
            AircraftUnit(tail_number="AI-7303", accumulated_flight_hours=260.0, status=AircraftStatus.READY, aircraft_type_id=b737_id, airbase_id=hnd_id),

            # Skadron Udara 21 (Lanud Abdulrachman Saleh) - Super Tucano
            AircraftUnit(tail_number="TT-3101", accumulated_flight_hours=115.0, status=AircraftStatus.READY, aircraft_type_id=tucano_id, airbase_id=abd_id),
            AircraftUnit(tail_number="TT-3102", accumulated_flight_hours=170.0, status=AircraftStatus.READY, aircraft_type_id=tucano_id, airbase_id=abd_id),
            AircraftUnit(tail_number="TT-3103", accumulated_flight_hours=225.0, status=AircraftStatus.READY, aircraft_type_id=tucano_id, airbase_id=abd_id),
            AircraftUnit(tail_number="TT-3104", accumulated_flight_hours=288.0, status=AircraftStatus.READY, aircraft_type_id=tucano_id, airbase_id=abd_id),
        ]
        db.add_all(units_data)
        db.commit()
        print(f"Berhasil menambahkan {len(units_data)} Unit Armada Pesawat (Tail Numbers).")

        # 7. Seeding Data OPERATIONS SCENARIOS (Skenario Operasi Militer)
        scenarios_data = [
            OperationsScenario(
                name="Operasi Kilat Udara Natuna (Patroli ZEE & Pengamanan Wilayah)",
                description="Pengerahan unsur tempur taktis F-16 dan intai maritim Boeing 737 untuk patroli udara kedaulatan di ZEE Laut Natuna Utara.",
                start_date=now - timedelta(days=2),
                end_date=now + timedelta(days=5)
            ),
            OperationsScenario(
                name="Latihan Gabungan Matra Udara 'Angkasa Yudha 2026'",
                description="Simulasi manuver lapangan pertempuran udara terpadu Koopsud I, II, dan III melibatkan formasi tempur gabungan F-16 dan Sukhoi Su-27/30.",
                start_date=now - timedelta(days=1),
                end_date=now + timedelta(days=7)
            ),
            OperationsScenario(
                name="Operasi Trisula Perbatasan (ALKI II - Selat Makassar)",
                description="Patroli rutin pengawasan jalur laut kepulauan Indonesia II dan intersepsi sasaran udara mencurigakan oleh Skadron Udara 11.",
                start_date=now - timedelta(days=5),
                end_date=now + timedelta(days=10)
            ),
            OperationsScenario(
                name="Operasi Dukungan Udara Taktis Logistik Cepat",
                description="Misi angkutan udara militer menggunakan armada C-130J Super Hercules untuk pergeseran pasukan dan logistik darurat antar pangkalan.",
                start_date=now,
                end_date=now + timedelta(days=3)
            ),
        ]
        db.add_all(scenarios_data)
        db.commit()
        print(f"Berhasil menambahkan {len(scenarios_data)} Skenario Operasi Udara.")

        # 8. Seeding Data SCENARIO DEPLOYMENTS (Hubungan Pesawat -> Skenario)
        # Skenario 1: Operasi Natuna (TS-1601, TS-1602, TS-1610, AI-7301)
        sc1_id = scenarios_data[0].id
        sc2_id = scenarios_data[1].id
        sc3_id = scenarios_data[2].id
        sc4_id = scenarios_data[3].id

        deployments_data = [
            # Skenario 1 (Natuna)
            ScenarioDeployment(scenario_id=sc1_id, aircraft_id=units_data[0].id), # TS-1601
            ScenarioDeployment(scenario_id=sc1_id, aircraft_id=units_data[1].id), # TS-1602
            ScenarioDeployment(scenario_id=sc1_id, aircraft_id=units_data[6].id), # TS-1610
            ScenarioDeployment(scenario_id=sc1_id, aircraft_id=units_data[22].id), # AI-7301

            # Skenario 2 (Angkasa Yudha)
            ScenarioDeployment(scenario_id=sc2_id, aircraft_id=units_data[0].id), # TS-1601
            ScenarioDeployment(scenario_id=sc2_id, aircraft_id=units_data[2].id), # TS-1603
            ScenarioDeployment(scenario_id=sc2_id, aircraft_id=units_data[10].id), # TS-2701
            ScenarioDeployment(scenario_id=sc2_id, aircraft_id=units_data[12].id), # TS-3001
            ScenarioDeployment(scenario_id=sc2_id, aircraft_id=units_data[14].id), # TT-5001

            # Skenario 3 (ALKI II)
            ScenarioDeployment(scenario_id=sc3_id, aircraft_id=units_data[10].id), # TS-2701
            ScenarioDeployment(scenario_id=sc3_id, aircraft_id=units_data[11].id), # TS-2702
            ScenarioDeployment(scenario_id=sc3_id, aircraft_id=units_data[13].id), # TS-3002

            # Skenario 4 (Dukungan C-130)
            ScenarioDeployment(scenario_id=sc4_id, aircraft_id=units_data[18].id), # A-1339
            ScenarioDeployment(scenario_id=sc4_id, aircraft_id=units_data[19].id), # A-1340
            ScenarioDeployment(scenario_id=sc4_id, aircraft_id=units_data[20].id), # A-1341
        ]
        db.add_all(deployments_data)
        db.commit()
        print(f"Berhasil mendaftarkan {len(deployments_data)} Deployment Pesawat ke Skenario.")

        print("\n=======================================================")
        print("[SUCCESS] SEMUA DATA REALISTIS TNI AU BERHASIL DISINKRONISASI!")
        print("Akun Login Default:")
        print("  - Username: admin.mabes | Password: admin123 (Administrator)")
        print("  - Username: analyst.ops | Password: admin123 (Operator/Analyst)")
        print("  - Username: pangkoopsud | Password: admin123 (Pimpinan/Executive)")
        print("=======================================================")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] saat seeding data: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
