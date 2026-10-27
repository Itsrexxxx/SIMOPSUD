"""
Database Seeder - SIMKO
42 Lanud Kodau I/II/III + 21 tipe pesawat (5 kategori) sesuai daftar TNI AU
Tail per skadron + spek real cruise/TBO/phase/payload untuk ETA & harwat S/U/S
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy import text
from app.core.database import engine, SessionLocal, Base
from app.core.security import hash_password
from app.models.user import User
from app.models.aircraft import AircraftType, AircraftUnit
from app.models.airbase import AirBase
from app.models.scenario import OperationsScenario, ScenarioDeployment
from app.models.flight_mission import FlightMission

def seed_database():
    db = SessionLocal()
    print("Memulai sinkronisasi dan pengisian data dummy TNI AU...")
    try:
        try:
            db.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
            db.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        except Exception:
            pass
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)
        try:
            db.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        except Exception:
            pass
        db.commit()
        print("Tabel & skema baru berhasil dibuat ulang.")

        default_pwd = hash_password("admin123")
        now = datetime.now(timezone.utc)
        admin_user = User(username="admin.mabes", hashed_password=default_pwd, full_name="Kolonel Pnb Hendra Kurniawan, S.E., M.M.S.", email="hendra.kurniawan@tni-au.mil.id", nip="523819", service_unit="Sopsau Mabes TNI AU", role="Administrator", permissions=["dashboard", "aircraft", "airbase", "users", "missions"], is_approved=True, approved_at=now)
        db.add(admin_user); db.commit()
        users_data = [
            User(username="analyst.ops", hashed_password=default_pwd, full_name="Mayor Pnb Dimas Prasetyo, M.Han.", email="dimas.prasetyo@tni-au.mil.id", nip="534210", service_unit="Disbangopsau Mabes AU", role="Operator", permissions=["dashboard", "aircraft", "airbase", "missions"], is_approved=True, approved_at=now, approved_by=admin_user.id),
            User(username="pangkoopsud", hashed_password=default_pwd, full_name="Marsda TNI Agus Setiawan, S.T., M.Sc.", email="agus.setiawan@koopsudnas.mil.id", nip="512903", service_unit="Mako Koopsudnas", role="Pimpinan", permissions=["dashboard", "missions"], is_approved=True, approved_at=now, approved_by=admin_user.id),
            User(username="ops.iswahjudi", hashed_password=default_pwd, full_name="Kapten Pnb Rizky Firmansyah", email="rizky.f@skadron3.mil.id", nip="541092", service_unit="Skadron Udara 3 Lanud Iswahjudi", role="Operator", permissions=["dashboard", "aircraft", "airbase", "missions"], is_approved=True, approved_at=now, approved_by=admin_user.id),
            User(username="ops.roesmin", hashed_password=default_pwd, full_name="Kapten Pnb Aditya Wardhana", email="aditya.w@skadron16.mil.id", nip="542314", service_unit="Skadron Udara 16 Lanud Roesmin Nurjadin", role="Operator", permissions=["dashboard", "aircraft", "airbase", "missions"], is_approved=True, approved_at=now, approved_by=admin_user.id),
            User(username="cadet.pending", hashed_password=default_pwd, full_name="Letda Pnb Fajar Nugraha", email="fajar.nugraha@tni-au.mil.id", nip="548901", service_unit="Wing Udara 1", role="Operator", permissions=["dashboard"], is_approved=False, approved_at=None, approved_by=None),
        ]
        db.add_all(users_data); db.commit()
        print("Berhasil menambahkan Akun Personel TNI AU.")

        # ============ 21 TIPE PESAWAT — 5 kategori ============
        types_data = [
            # 1. Jet Tempur & Serang
            AircraftType(name="Dassault Rafale", description="Jet tempur multiperan gen 4.5 — Skadron 12 Lanud Roesmin Nurjadin (Mach 1.4 / 1480 km/h)", cruise_speed_kmh=1480, tbo_hours=4000, phase_interval_hours=300, calendar_interval_days=90, fuel_burn_lph=3800, max_range_km=3700, payload_capacity_kg=9500),
            AircraftType(name="Sukhoi Su-27 & Su-30 Flanker", description="Jet tempur berat Air Superiority — Skadron 11 Lanud Sultan Hasanuddin (Mach 0.90 / 1100 km/h)", cruise_speed_kmh=1100, tbo_hours=4000, phase_interval_hours=300, calendar_interval_days=60, fuel_burn_lph=5000, max_range_km=3000, payload_capacity_kg=8000),
            AircraftType(name="F-16 Fighting Falcon", description="Jet tempur multiperan taktis — Skadron 3 & 16 Lanud Iswahjudi / Roesmin Nurjadin (885 km/h)", cruise_speed_kmh=885, tbo_hours=4000, phase_interval_hours=300, calendar_interval_days=60, fuel_burn_lph=2500, max_range_km=2300, payload_capacity_kg=7700),
            AircraftType(name="BAE Hawk 209", description="Jet tempur taktis ringan & serang darat — Skadron 1 & 12 Lanud Supadio / Roesmin Nurjadin (796 km/h)", cruise_speed_kmh=796, tbo_hours=3000, phase_interval_hours=250, calendar_interval_days=60, fuel_burn_lph=1500, max_range_km=2500, payload_capacity_kg=3000),
            AircraftType(name="EMB-314 Super Tucano", description="Serang darat ringan & COIN — Skadron 21 Lanud Abdulrachman Saleh (520 km/h)", cruise_speed_kmh=520, tbo_hours=3500, phase_interval_hours=300, calendar_interval_days=60, fuel_burn_lph=520, max_range_km=1330, payload_capacity_kg=1550),
            # 2. Angkut Strategis & Taktis
            AircraftType(name="Airbus A400M Atlas MRTT", description="Angkut berat & tanker udara — Skadron 31/32 Lanud Halim / Abdulrachman Saleh (780 km/h)", cruise_speed_kmh=780, tbo_hours=6000, phase_interval_hours=400, calendar_interval_days=90, fuel_burn_lph=4200, max_range_km=3300, payload_capacity_kg=37000),
            AircraftType(name="C-130J-30 Super Hercules", description="Angkut berat logistik & pasukan — Skadron 31 Lanud Halim Perdanakusuma (650 km/h)", cruise_speed_kmh=650, tbo_hours=6000, phase_interval_hours=400, calendar_interval_days=90, fuel_burn_lph=3500, max_range_km=3300, payload_capacity_kg=20000),
            AircraftType(name="C-130B/H Hercules", description="Angkut berat taktis & logistik — Skadron 31 & 32 Lanud Halim / Abdulrachman Saleh (540 km/h)", cruise_speed_kmh=540, tbo_hours=6000, phase_interval_hours=400, calendar_interval_days=90, fuel_burn_lph=3000, max_range_km=2800, payload_capacity_kg=19000),
            AircraftType(name="CASA CN-295", description="Angkut taktis menengah — Skadron 2 Lanud Halim Perdanakusuma (480 km/h)", cruise_speed_kmh=480, tbo_hours=5000, phase_interval_hours=350, calendar_interval_days=60, fuel_burn_lph=800, max_range_km=2600, payload_capacity_kg=9250),
            AircraftType(name="CASA CN-235", description="Angkut taktis menengah — Skadron 2 Lanud Halim Perdanakusuma (450 km/h)", cruise_speed_kmh=450, tbo_hours=5000, phase_interval_hours=350, calendar_interval_days=60, fuel_burn_lph=750, max_range_km=2300, payload_capacity_kg=6000),
            AircraftType(name="NC212i Aviocar", description="Angkut ringan & modifikasi cuaca — Skadron 4 Lanud Abdulrachman Saleh (360 km/h)", cruise_speed_kmh=360, tbo_hours=4000, phase_interval_hours=300, calendar_interval_days=60, fuel_burn_lph=400, max_range_km=1400, payload_capacity_kg=2800),
            # 3. Intai & VVIP/VIP
            AircraftType(name="Boeing 737-200 Surveiller", description="Intai strategis & patroli maritim — Skadron 5 Lanud Sultan Hasanuddin (796 km/h)", cruise_speed_kmh=796, tbo_hours=5000, phase_interval_hours=350, calendar_interval_days=60, fuel_burn_lph=2600, max_range_km=3000, payload_capacity_kg=5000),
            AircraftType(name="Dassault Falcon 8X / 7X", description="Komando taktis & VVIP/VIP — Skadron 17 Lanud Halim Perdanakusuma (850 km/h)", cruise_speed_kmh=850, tbo_hours=5000, phase_interval_hours=350, calendar_interval_days=90, fuel_burn_lph=1500, max_range_km=11000, payload_capacity_kg=2000),
            AircraftType(name="Boeing 737-BBJ2 / VVIP", description="Angkut VIP / Pesawat Kepresidenan — Skadron 17 Lanud Halim Perdanakusuma (848 km/h)", cruise_speed_kmh=848, tbo_hours=5000, phase_interval_hours=350, calendar_interval_days=90, fuel_burn_lph=2700, max_range_km=11000, payload_capacity_kg=5000),
            # 4. Latih
            AircraftType(name="KAI T-50i Golden Eagle", description="Latih lanjut tempur supersonik — Skadron 15 Lanud Iswahjudi (850 km/h)", cruise_speed_kmh=850, tbo_hours=3500, phase_interval_hours=300, calendar_interval_days=60, fuel_burn_lph=1800, max_range_km=1850, payload_capacity_kg=4500),
            AircraftType(name="KT-1B Woong Bee", description="Latih dasar turboprop / Tim Jupiter — Skadron Dik 102 Lanud Adisutjipto (500 km/h)", cruise_speed_kmh=500, tbo_hours=3000, phase_interval_hours=250, calendar_interval_days=60, fuel_burn_lph=320, max_range_km=1700, payload_capacity_kg=500),
            AircraftType(name="Grob G 120TP", description="Latih mula / dasar penerbang — Skadron Dik 101 Lanud Adisutjipto (380 km/h)", cruise_speed_kmh=380, tbo_hours=2500, phase_interval_hours=200, calendar_interval_days=60, fuel_burn_lph=150, max_range_km=1500, payload_capacity_kg=300),
            # 5. Helikopter
            AircraftType(name="H225M / EC725 Caracal", description="Angkut berat taktis & SAR Tempur — Skadron 8 Lanud Atang Sendjaja (262 km/h)", cruise_speed_kmh=262, tbo_hours=3000, phase_interval_hours=250, calendar_interval_days=60, fuel_burn_lph=600, max_range_km=860, payload_capacity_kg=4750),
            AircraftType(name="NAS 332 Super Puma", description="Angkut personel taktis & VIP — Skadron 6 & 45 Lanud Atang Sendjaja / Halim (245 km/h)", cruise_speed_kmh=245, tbo_hours=3000, phase_interval_hours=250, calendar_interval_days=60, fuel_burn_lph=550, max_range_km=850, payload_capacity_kg=4000),
            AircraftType(name="SA 330 Puma", description="Angkut personel & logistik — Skadron 8 Lanud Atang Sendjaja (250 km/h)", cruise_speed_kmh=250, tbo_hours=3000, phase_interval_hours=250, calendar_interval_days=60, fuel_burn_lph=550, max_range_km=550, payload_capacity_kg=3000),
            AircraftType(name="EC120 Colibri", description="Latih dasar helikopter — Skadron Dik 105 Lanud Suryadarma (223 km/h)", cruise_speed_kmh=223, tbo_hours=2500, phase_interval_hours=200, calendar_interval_days=60, fuel_burn_lph=150, max_range_km=710, payload_capacity_kg=700),
        ]
        db.add_all(types_data); db.commit()
        print(f"Berhasil menambahkan {len(types_data)} Tipe Pesawat.")

        # ============ 42 AIR BASES ============
        bases_data = [
            AirBase(name="Lanud Halim Perdanakusuma", location="Jakarta Timur, DKI Jakarta", status="optimal", kodau="Kodau I", code="HLP", icao="WIHH", tipe="A", runway_m=3000, elev_m=25, latitude=-6.2644, longitude=106.8958, avtur_capacity_liters=1200000, avtur_stock_liters=950000, special_lube_stock_liters=6000, refueler_trucks_count=10, refueler_trucks_active=9, forklifts_count=8, apron_capacity_aircraft=30, apron_used=14),
            AirBase(name="Lanud Atang Sendjaja", location="Bogor, Jawa Barat", status="optimal", kodau="Kodau I", code="ATS", icao="WIAJ", tipe="A", runway_m=2800, elev_m=120, latitude=-6.5497, longitude=106.7511, avtur_capacity_liters=600000, avtur_stock_liters=420000, special_lube_stock_liters=3200, refueler_trucks_count=5, refueler_trucks_active=4, forklifts_count=4, apron_capacity_aircraft=16, apron_used=7),
            AirBase(name="Lanud Suryadarma", location="Subang, Jawa Barat", status="optimal", kodau="Kodau I", code="SDM", icao="WIDS", tipe="B", runway_m=2200, elev_m=30, latitude=-6.5314, longitude=107.6592, avtur_capacity_liters=450000, avtur_stock_liters=320000, special_lube_stock_liters=2400, refueler_trucks_count=4, refueler_trucks_active=3, forklifts_count=3, apron_capacity_aircraft=12, apron_used=5),
            AirBase(name="Lanud Roesmin Nurjadin", location="Pekanbaru, Riau", status="optimal", kodau="Kodau I", code="RSN", icao="WIBB", tipe="A", runway_m=2600, elev_m=35, latitude=0.4616, longitude=101.4461, avtur_capacity_liters=750000, avtur_stock_liters=590000, special_lube_stock_liters=3800, refueler_trucks_count=6, refueler_trucks_active=5, forklifts_count=4, apron_capacity_aircraft=18, apron_used=8),
            AirBase(name="Lanud Supadio", location="Pontianak, Kalimantan Barat", status="optimal", kodau="Kodau I", code="SPO", icao="WIOO", tipe="A", runway_m=2500, elev_m=5, latitude=-0.1502, longitude=109.4041, avtur_capacity_liters=600000, avtur_stock_liters=480000, special_lube_stock_liters=3000, refueler_trucks_count=5, refueler_trucks_active=4, forklifts_count=4, apron_capacity_aircraft=16, apron_used=6),
            AirBase(name="Lanud Soewondo", location="Medan, Sumatra Utara", status="warning", kodau="Kodau I", code="SWO", icao="WIMK", tipe="B", runway_m=2300, elev_m=20, latitude=3.5577, longitude=98.6713, avtur_capacity_liters=550000, avtur_stock_liters=280000, special_lube_stock_liters=2700, refueler_trucks_count=5, refueler_trucks_active=3, forklifts_count=3, apron_capacity_aircraft=14, apron_used=7),
            AirBase(name="Lanud Husein Sastranegara", location="Bandung, Jawa Barat", status="optimal", kodau="Kodau I", code="HSS", icao="WICC", tipe="A", runway_m=2500, elev_m=742, latitude=-6.9005, longitude=107.5763, avtur_capacity_liters=500000, avtur_stock_liters=380000, special_lube_stock_liters=2600, refueler_trucks_count=4, refueler_trucks_active=4, forklifts_count=3, apron_capacity_aircraft=12, apron_used=5),
            AirBase(name="Lanud Sultan Iskandar Muda", location="Aceh Besar, Aceh", status="optimal", kodau="Kodau I", code="SIM", icao="WITT", tipe="A", runway_m=3000, elev_m=15, latitude=5.5233, longitude=95.4202, avtur_capacity_liters=700000, avtur_stock_liters=520000, special_lube_stock_liters=3400, refueler_trucks_count=6, refueler_trucks_active=5, forklifts_count=4, apron_capacity_aircraft=18, apron_used=8),
            AirBase(name="Lanud Maimun Saleh", location="Sabang, Aceh", status="warning", kodau="Kodau I", code="MUS", icao="WITB", tipe="C", runway_m=1800, elev_m=10, latitude=5.8725, longitude=95.3397, avtur_capacity_liters=250000, avtur_stock_liters=110000, special_lube_stock_liters=1200, refueler_trucks_count=2, refueler_trucks_active=1, forklifts_count=2, apron_capacity_aircraft=8, apron_used=4),
            AirBase(name="Lanud Sutan Sjahrir", location="Padang, Sumatra Barat", status="optimal", kodau="Kodau I", code="SJA", icao="WIEE", tipe="B", runway_m=2200, elev_m=8, latitude=-0.9186, longitude=100.3536, avtur_capacity_liters=400000, avtur_stock_liters=300000, special_lube_stock_liters=2000, refueler_trucks_count=3, refueler_trucks_active=3, forklifts_count=3, apron_capacity_aircraft=10, apron_used=5),
            AirBase(name="Lanud Sri Mulyono Herlambang", location="Palembang, Sumatra Selatan", status="optimal", kodau="Kodau I", code="SMH", icao="WIPP", tipe="B", runway_m=2250, elev_m=10, latitude=-2.8986, longitude=104.7019, avtur_capacity_liters=450000, avtur_stock_liters=340000, special_lube_stock_liters=2300, refueler_trucks_count=4, refueler_trucks_active=3, forklifts_count=3, apron_capacity_aircraft=12, apron_used=6),
            AirBase(name="Lanud Raden Sadjad", location="Natuna, Kepulauan Riau", status="warning", kodau="Kodau I", code="RSA", icao="WION", tipe="A", runway_m=2560, elev_m=12, latitude=3.9413, longitude=108.3916, avtur_capacity_liters=350000, avtur_stock_liters=140000, special_lube_stock_liters=1800, refueler_trucks_count=3, refueler_trucks_active=2, forklifts_count=2, apron_capacity_aircraft=10, apron_used=6),
            AirBase(name="Lanud Raja Haji Fisabilillah", location="Tanjungpinang, Kepri", status="optimal", kodau="Kodau I", code="RHF", icao="WIDN", tipe="B", runway_m=2250, elev_m=15, latitude=0.9231, longitude=104.5306, avtur_capacity_liters=380000, avtur_stock_liters=260000, special_lube_stock_liters=1900, refueler_trucks_count=3, refueler_trucks_active=3, forklifts_count=2, apron_capacity_aircraft=10, apron_used=4),
            AirBase(name="Lanud Hang Nadim", location="Batam, Kepulauan Riau", status="optimal", kodau="Kodau I", code="HNM", icao="WIDD", tipe="B", runway_m=2600, elev_m=40, latitude=1.1208, longitude=104.1186, avtur_capacity_liters=500000, avtur_stock_liters=400000, special_lube_stock_liters=2600, refueler_trucks_count=4, refueler_trucks_active=4, forklifts_count=3, apron_capacity_aircraft=14, apron_used=6),
            AirBase(name="Lanud H. AS. Hanandjoeddin", location="Tanjung Pandan, Belitung", status="optimal", kodau="Kodau I", code="TJQ", icao="WIKT", tipe="C", runway_m=2000, elev_m=12, latitude=-2.7455, longitude=107.7550, avtur_capacity_liters=300000, avtur_stock_liters=210000, special_lube_stock_liters=1500, refueler_trucks_count=3, refueler_trucks_active=2, forklifts_count=2, apron_capacity_aircraft=8, apron_used=3),
            AirBase(name="Lanud Pangeran M. Bun Yamin", location="Tulang Bawang, Lampung", status="warning", kodau="Kodau I", code="BUM", icao="WIBY", tipe="C", runway_m=1800, elev_m=25, latitude=-4.5016, longitude=105.1950, avtur_capacity_liters=280000, avtur_stock_liters=130000, special_lube_stock_liters=1400, refueler_trucks_count=2, refueler_trucks_active=1, forklifts_count=2, apron_capacity_aircraft=8, apron_used=4),
            AirBase(name="Lanud Sugiri Sukani", location="Majalengka, Jawa Barat", status="optimal", kodau="Kodau I", code="SKI", icao="WIDS2", tipe="B", runway_m=2400, elev_m=60, latitude=-6.6686, longitude=108.2186, avtur_capacity_liters=400000, avtur_stock_liters=310000, special_lube_stock_liters=2100, refueler_trucks_count=3, refueler_trucks_active=3, forklifts_count=2, apron_capacity_aircraft=10, apron_used=4),
            AirBase(name="Lanud Wiriadinata", location="Tasikmalaya, Jawa Barat", status="optimal", kodau="Kodau I", code="WRT", icao="WICW", tipe="B", runway_m=2000, elev_m=350, latitude=-7.3561, longitude=108.2469, avtur_capacity_liters=320000, avtur_stock_liters=240000, special_lube_stock_liters=1700, refueler_trucks_count=3, refueler_trucks_active=2, forklifts_count=2, apron_capacity_aircraft=8, apron_used=3),
            AirBase(name="Lanud Harry Hadisoemantri", location="Bengkayang, Kalbar", status="critical", kodau="Kodau I", code="HAD", icao="WIOH", tipe="C", runway_m=1600, elev_m=20, latitude=0.9466, longitude=109.6533, avtur_capacity_liters=250000, avtur_stock_liters=60000, special_lube_stock_liters=1000, refueler_trucks_count=2, refueler_trucks_active=1, forklifts_count=1, apron_capacity_aircraft=8, apron_used=5),
            AirBase(name="Lanud Sultan Hasanuddin", location="Maros, Sulawesi Selatan", status="optimal", kodau="Kodau II", code="HND", icao="WAAA", tipe="A", runway_m=3100, elev_m=15, latitude=-5.0755, longitude=119.5537, avtur_capacity_liters=900000, avtur_stock_liters=720000, special_lube_stock_liters=5000, refueler_trucks_count=7, refueler_trucks_active=6, forklifts_count=5, apron_capacity_aircraft=20, apron_used=10),
            AirBase(name="Lanud Iswahjudi", location="Madiun/Magetan, Jawa Timur", status="optimal", kodau="Kodau II", code="IWJ", icao="WARI", tipe="A", runway_m=3000, elev_m=110, latitude=-7.6158, longitude=111.4340, avtur_capacity_liters=850000, avtur_stock_liters=680000, special_lube_stock_liters=4500, refueler_trucks_count=8, refueler_trucks_active=7, forklifts_count=6, apron_capacity_aircraft=24, apron_used=12),
            AirBase(name="Lanud Abdulrachman Saleh", location="Malang, Jawa Timur", status="warning", kodau="Kodau II", code="ABD", icao="WARA", tipe="A", runway_m=3000, elev_m=526, latitude=-7.9263, longitude=112.7147, avtur_capacity_liters=500000, avtur_stock_liters=210000, special_lube_stock_liters=2500, refueler_trucks_count=4, refueler_trucks_active=3, forklifts_count=3, apron_capacity_aircraft=14, apron_used=7),
            AirBase(name="Lanud Adisutjipto", location="Sleman, DI Yogyakarta", status="optimal", kodau="Kodau II", code="ADI", icao="WAHH", tipe="A", runway_m=2200, elev_m=150, latitude=-7.7880, longitude=110.4316, avtur_capacity_liters=600000, avtur_stock_liters=440000, special_lube_stock_liters=3000, refueler_trucks_count=5, refueler_trucks_active=4, forklifts_count=4, apron_capacity_aircraft=16, apron_used=8),
            AirBase(name="Lanud Adi Soemarmo", location="Boyolali, Jawa Tengah", status="optimal", kodau="Kodau II", code="ASM", icao="WAHQ", tipe="A", runway_m=2400, elev_m=130, latitude=-7.5161, longitude=110.7569, avtur_capacity_liters=550000, avtur_stock_liters=430000, special_lube_stock_liters=2800, refueler_trucks_count=5, refueler_trucks_active=5, forklifts_count=4, apron_capacity_aircraft=14, apron_used=6),
            AirBase(name="Lanud Sulaiman", location="Bandung, Jawa Barat", status="optimal", kodau="Kodau II", code="SLM", icao="WICS", tipe="B", runway_m=1800, elev_m=740, latitude=-6.9836, longitude=107.5922, avtur_capacity_liters=350000, avtur_stock_liters=260000, special_lube_stock_liters=1800, refueler_trucks_count=3, refueler_trucks_active=3, forklifts_count=2, apron_capacity_aircraft=10, apron_used=4),
            AirBase(name="Lanud Sam Ratulangi", location="Manado, Sulawesi Utara", status="optimal", kodau="Kodau II", code="MDC", icao="WAMM", tipe="A", runway_m=2650, elev_m=5, latitude=1.5491, longitude=124.9263, avtur_capacity_liters=600000, avtur_stock_liters=470000, special_lube_stock_liters=3000, refueler_trucks_count=5, refueler_trucks_active=4, forklifts_count=4, apron_capacity_aircraft=16, apron_used=7),
            AirBase(name="Lanud El Tari", location="Kupang, NTT", status="optimal", kodau="Kodau II", code="KOE", icao="WATT", tipe="A", runway_m=2500, elev_m=100, latitude=-10.1725, longitude=123.6711, avtur_capacity_liters=550000, avtur_stock_liters=420000, special_lube_stock_liters=2700, refueler_trucks_count=4, refueler_trucks_active=3, forklifts_count=3, apron_capacity_aircraft=14, apron_used=6),
            AirBase(name="Lanud Dhomber", location="Balikpapan, Kaltim", status="optimal", kodau="Kodau II", code="BPN", icao="WALL", tipe="A", runway_m=2500, elev_m=20, latitude=-1.2686, longitude=116.8944, avtur_capacity_liters=650000, avtur_stock_liters=500000, special_lube_stock_liters=3200, refueler_trucks_count=5, refueler_trucks_active=4, forklifts_count=4, apron_capacity_aircraft=16, apron_used=7),
            AirBase(name="Lanud Anang Busra", location="Tarakan, Kalimantan Utara", status="critical", kodau="Kodau II", code="TAR", icao="WALJ", tipe="B", runway_m=2250, elev_m=8, latitude=3.3244, longitude=117.5675, avtur_capacity_liters=250000, avtur_stock_liters=65000, special_lube_stock_liters=1000, refueler_trucks_count=2, refueler_trucks_active=1, forklifts_count=1, apron_capacity_aircraft=8, apron_used=5),
            AirBase(name="Lanud I Gusti Ngurah Rai", location="Badung, Bali", status="optimal", kodau="Kodau II", code="DPS", icao="WADD", tipe="A", runway_m=3000, elev_m=5, latitude=-8.7480, longitude=115.1675, avtur_capacity_liters=800000, avtur_stock_liters=640000, special_lube_stock_liters=4000, refueler_trucks_count=6, refueler_trucks_active=5, forklifts_count=5, apron_capacity_aircraft=18, apron_used=8),
            AirBase(name="Lanud Haluoleo", location="Kendari, Sulawesi Tenggara", status="optimal", kodau="Kodau II", code="KDI", icao="WAWW", tipe="B", runway_m=2500, elev_m=50, latitude=-4.0827, longitude=122.4213, avtur_capacity_liters=380000, avtur_stock_liters=280000, special_lube_stock_liters=1900, refueler_trucks_count=3, refueler_trucks_active=3, forklifts_count=2, apron_capacity_aircraft=10, apron_used=4),
            AirBase(name="Lanud Muljono", location="Surabaya, Jawa Timur", status="optimal", kodau="Kodau II", code="SUB", icao="WARR", tipe="B", runway_m=2200, elev_m=8, latitude=-7.3791, longitude=112.7802, avtur_capacity_liters=450000, avtur_stock_liters=360000, special_lube_stock_liters=2300, refueler_trucks_count=4, refueler_trucks_active=3, forklifts_count=3, apron_capacity_aircraft=12, apron_used=5),
            AirBase(name="Lanud Syamsudin Noor", location="Banjarmasin, Kalsel", status="optimal", kodau="Kodau II", code="BDJ", icao="WAOO", tipe="A", runway_m=2500, elev_m=20, latitude=-3.4422, longitude=114.7616, avtur_capacity_liters=500000, avtur_stock_liters=380000, special_lube_stock_liters=2500, refueler_trucks_count=4, refueler_trucks_active=3, forklifts_count=3, apron_capacity_aircraft=12, apron_used=5),
            AirBase(name="Lanud M. Zainuddin Abdul Madjid", location="Lombok, NTB", status="optimal", kodau="Kodau II", code="LOP", icao="WADL", tipe="A", runway_m=2750, elev_m=10, latitude=-8.5583, longitude=116.0925, avtur_capacity_liters=450000, avtur_stock_liters=350000, special_lube_stock_liters=2300, refueler_trucks_count=4, refueler_trucks_active=3, forklifts_count=3, apron_capacity_aircraft=12, apron_used=5),
            AirBase(name="Lanud Iskandar", location="Pangkalan Bun, Kalteng", status="warning", kodau="Kodau II", code="PKN", icao="WAOI", tipe="B", runway_m=2100, elev_m=20, latitude=-2.7050, longitude=111.6733, avtur_capacity_liters=300000, avtur_stock_liters=150000, special_lube_stock_liters=1500, refueler_trucks_count=3, refueler_trucks_active=2, forklifts_count=2, apron_capacity_aircraft=10, apron_used=6),
            AirBase(name="Lanud Silas Papare", location="Jayapura, Papua", status="optimal", kodau="Kodau III", code="DJJ", icao="WAJJ", tipe="A", runway_m=3000, elev_m=88, latitude=-2.5766, longitude=140.5166, avtur_capacity_liters=600000, avtur_stock_liters=480000, special_lube_stock_liters=3000, refueler_trucks_count=5, refueler_trucks_active=4, forklifts_count=4, apron_capacity_aircraft=14, apron_used=6),
            AirBase(name="Lanud Manuhua", location="Biak, Papua", status="optimal", kodau="Kodau III", code="BIK", icao="WABB", tipe="A", runway_m=3570, elev_m=14, latitude=-1.1900, longitude=136.1075, avtur_capacity_liters=650000, avtur_stock_liters=520000, special_lube_stock_liters=3200, refueler_trucks_count=5, refueler_trucks_active=4, forklifts_count=4, apron_capacity_aircraft=16, apron_used=7),
            AirBase(name="Lanud Johannes Abraham Dimara", location="Merauke, Papua Selatan", status="warning", kodau="Kodau III", code="MKQ", icao="WAKK", tipe="B", runway_m=2500, elev_m=5, latitude=-8.5202, longitude=140.4172, avtur_capacity_liters=350000, avtur_stock_liters=160000, special_lube_stock_liters=1800, refueler_trucks_count=3, refueler_trucks_active=2, forklifts_count=2, apron_capacity_aircraft=10, apron_used=5),
            AirBase(name="Lanud Pattimura", location="Ambon, Maluku", status="optimal", kodau="Kodau III", code="AMQ", icao="WAPP", tipe="A", runway_m=2500, elev_m=10, latitude=-3.7105, longitude=128.0894, avtur_capacity_liters=550000, avtur_stock_liters=420000, special_lube_stock_liters=2700, refueler_trucks_count=4, refueler_trucks_active=3, forklifts_count=3, apron_capacity_aircraft=14, apron_used=6),
            AirBase(name="Lanud Leo Wattimena", location="Morotai, Maluku Utara", status="warning", kodau="Kodau III", code="OTI", icao="WAMR", tipe="B", runway_m=2400, elev_m=10, latitude=2.0455, longitude=128.3294, avtur_capacity_liters=300000, avtur_stock_liters=140000, special_lube_stock_liters=1500, refueler_trucks_count=3, refueler_trucks_active=2, forklifts_count=2, apron_capacity_aircraft=10, apron_used=6),
            AirBase(name="Lanud Dominicus Dumatubun", location="Langgur, Maluku Tenggara", status="optimal", kodau="Kodau III", code="LUV", icao="WAPF", tipe="B", runway_m=2200, elev_m=10, latitude=-5.6600, longitude=132.7302, avtur_capacity_liters=280000, avtur_stock_liters=200000, special_lube_stock_liters=1400, refueler_trucks_count=3, refueler_trucks_active=2, forklifts_count=2, apron_capacity_aircraft=8, apron_used=3),
            AirBase(name="Lanud Yohanis Kapiyau", location="Timika, Papua Tengah", status="critical", kodau="Kodau III", code="TIM", icao="WABP", tipe="B", runway_m=2500, elev_m=30, latitude=-4.5291, longitude=136.8858, avtur_capacity_liters=320000, avtur_stock_liters=75000, special_lube_stock_liters=1600, refueler_trucks_count=3, refueler_trucks_active=1, forklifts_count=2, apron_capacity_aircraft=10, apron_used=7),
        ]
        db.add_all(bases_data); db.commit()
        print(f"Berhasil menambahkan {len(bases_data)} Pangkalan Udara (42 Lanud).")

        def _base_id(substr: str) -> int:
            for b in bases_data:
                if substr.lower() in b.name.lower():
                    return b.id
            return bases_data[0].id
        def _type_id(name: str) -> int:
            for t in types_data:
                if t.name == name:
                    return t.id
            return types_data[0].id

        # airbase ids per skadron
        iwj = _base_id("Iswahjudi"); rsn = _base_id("Roesmin Nurjadin"); hnd = _base_id("Sultan Hasanuddin")
        spo = _base_id("Supadio"); abd = _base_id("Abdulrachman Saleh"); hlm = _base_id("Halim Perdanakusuma")
        adi = _base_id("Adisutjipto"); ats = _base_id("Atang Sendjaja"); sdm = _base_id("Suryadarma")

        # type ids
        raf = _type_id("Dassault Rafale"); su = _type_id("Sukhoi Su-27 & Su-30 Flanker"); f16 = _type_id("F-16 Fighting Falcon")
        hawk = _type_id("BAE Hawk 209"); tuc = _type_id("EMB-314 Super Tucano"); a400 = _type_id("Airbus A400M Atlas MRTT")
        c130j = _type_id("C-130J-30 Super Hercules"); c130bh = _type_id("C-130B/H Hercules")
        cn295 = _type_id("CASA CN-295"); cn235 = _type_id("CASA CN-235"); n212 = _type_id("NC212i Aviocar")
        b732 = _type_id("Boeing 737-200 Surveiller"); falcon = _type_id("Dassault Falcon 8X / 7X"); bbj2 = _type_id("Boeing 737-BBJ2 / VVIP")
        t50 = _type_id("KAI T-50i Golden Eagle"); kt1 = _type_id("KT-1B Woong Bee"); grob = _type_id("Grob G 120TP")
        h225 = _type_id("H225M / EC725 Caracal"); nas332 = _type_id("NAS 332 Super Puma"); sa330 = _type_id("SA 330 Puma"); ec120 = _type_id("EC120 Colibri")

        units_data = [
            # Rafale — Skad 12 Roesmin Nurjadin (4)
            AircraftUnit(tail_number="RF-1201", accumulated_flight_hours=95, status="S", aircraft_type_id=raf, airbase_id=rsn),
            AircraftUnit(tail_number="RF-1202", accumulated_flight_hours=140, status="S", aircraft_type_id=raf, airbase_id=rsn),
            AircraftUnit(tail_number="RF-1203", accumulated_flight_hours=210, status="S", aircraft_type_id=raf, airbase_id=rsn),
            AircraftUnit(tail_number="RF-1204", accumulated_flight_hours=285, status="S", aircraft_type_id=raf, airbase_id=rsn),
            # Sukhoi — Skad 11 Sultan Hasanuddin (5)
            AircraftUnit(tail_number="TS-2701", accumulated_flight_hours=125, status="S", aircraft_type_id=su, airbase_id=hnd),
            AircraftUnit(tail_number="TS-2702", accumulated_flight_hours=190, status="S", aircraft_type_id=su, airbase_id=hnd),
            AircraftUnit(tail_number="TS-3001", accumulated_flight_hours=150, status="S", aircraft_type_id=su, airbase_id=hnd),
            AircraftUnit(tail_number="TS-3002", accumulated_flight_hours=275, status="S", aircraft_type_id=su, airbase_id=hnd),
            AircraftUnit(tail_number="TS-3003", accumulated_flight_hours=312, status="U/S", aircraft_type_id=su, airbase_id=hnd),
            # F-16 — Skad 3 Iswahjudi (4) + Skad 16 Roesmin (4)
            AircraftUnit(tail_number="TS-1601", accumulated_flight_hours=145, status="S", aircraft_type_id=f16, airbase_id=iwj),
            AircraftUnit(tail_number="TS-1602", accumulated_flight_hours=180, status="S", aircraft_type_id=f16, airbase_id=iwj),
            AircraftUnit(tail_number="TS-1603", accumulated_flight_hours=240, status="S", aircraft_type_id=f16, airbase_id=iwj),
            AircraftUnit(tail_number="TS-1604", accumulated_flight_hours=305, status="U/S", aircraft_type_id=f16, airbase_id=iwj),
            AircraftUnit(tail_number="TS-1610", accumulated_flight_hours=110, status="S", aircraft_type_id=f16, airbase_id=rsn),
            AircraftUnit(tail_number="TS-1611", accumulated_flight_hours=165, status="S", aircraft_type_id=f16, airbase_id=rsn),
            AircraftUnit(tail_number="TS-1612", accumulated_flight_hours=220, status="S", aircraft_type_id=f16, airbase_id=rsn),
            AircraftUnit(tail_number="TS-1614", accumulated_flight_hours=290, status="S", aircraft_type_id=f16, airbase_id=rsn),
            # Hawk 209 — Skad 1 Supadio (3) + Skad 12 Roesmin (3)
            AircraftUnit(tail_number="TT-0101", accumulated_flight_hours=90, status="S", aircraft_type_id=hawk, airbase_id=spo),
            AircraftUnit(tail_number="TT-0102", accumulated_flight_hours=160, status="S", aircraft_type_id=hawk, airbase_id=spo),
            AircraftUnit(tail_number="TT-0103", accumulated_flight_hours=235, status="S", aircraft_type_id=hawk, airbase_id=spo),
            AircraftUnit(tail_number="TT-1201", accumulated_flight_hours=100, status="S", aircraft_type_id=hawk, airbase_id=rsn),
            AircraftUnit(tail_number="TT-1202", accumulated_flight_hours=175, status="S", aircraft_type_id=hawk, airbase_id=rsn),
            AircraftUnit(tail_number="TT-1203", accumulated_flight_hours=265, status="U/S", aircraft_type_id=hawk, airbase_id=rsn),
            # Super Tucano — Skad 21 Abdulrachman Saleh (4)
            AircraftUnit(tail_number="TT-3101", accumulated_flight_hours=115, status="S", aircraft_type_id=tuc, airbase_id=abd),
            AircraftUnit(tail_number="TT-3102", accumulated_flight_hours=170, status="S", aircraft_type_id=tuc, airbase_id=abd),
            AircraftUnit(tail_number="TT-3103", accumulated_flight_hours=225, status="S", aircraft_type_id=tuc, airbase_id=abd),
            AircraftUnit(tail_number="TT-3104", accumulated_flight_hours=288, status="S", aircraft_type_id=tuc, airbase_id=abd),
            # A400M — Skad 31/32 (3: 2 Halim +1 Abd)
            AircraftUnit(tail_number="A-4001", accumulated_flight_hours=80, status="S", aircraft_type_id=a400, airbase_id=hlm),
            AircraftUnit(tail_number="A-4002", accumulated_flight_hours=150, status="S", aircraft_type_id=a400, airbase_id=hlm),
            AircraftUnit(tail_number="A-4003", accumulated_flight_hours=210, status="S", aircraft_type_id=a400, airbase_id=abd),
            # C-130J — Skad 31 Halim (4)
            AircraftUnit(tail_number="A-1339", accumulated_flight_hours=140, status="S", aircraft_type_id=c130j, airbase_id=hlm),
            AircraftUnit(tail_number="A-1340", accumulated_flight_hours=175, status="S", aircraft_type_id=c130j, airbase_id=hlm),
            AircraftUnit(tail_number="A-1341", accumulated_flight_hours=230, status="S", aircraft_type_id=c130j, airbase_id=hlm),
            AircraftUnit(tail_number="A-1342", accumulated_flight_hours=85, status="S", aircraft_type_id=c130j, airbase_id=hlm),
            # C-130B/H — Skad 31 Halim 2 + Skad 32 Abd 2
            AircraftUnit(tail_number="A-1301", accumulated_flight_hours=120, status="S", aircraft_type_id=c130bh, airbase_id=hlm),
            AircraftUnit(tail_number="A-1302", accumulated_flight_hours=200, status="S", aircraft_type_id=c130bh, airbase_id=hlm),
            AircraftUnit(tail_number="A-1321", accumulated_flight_hours=180, status="S", aircraft_type_id=c130bh, airbase_id=abd),
            AircraftUnit(tail_number="A-1322", accumulated_flight_hours=260, status="U/S", aircraft_type_id=c130bh, airbase_id=abd),
            # CN-295 — Skad 2 Halim (3)
            AircraftUnit(tail_number="A-2901", accumulated_flight_hours=90, status="S", aircraft_type_id=cn295, airbase_id=hlm),
            AircraftUnit(tail_number="A-2902", accumulated_flight_hours=140, status="S", aircraft_type_id=cn295, airbase_id=hlm),
            AircraftUnit(tail_number="A-2903", accumulated_flight_hours=210, status="S", aircraft_type_id=cn295, airbase_id=hlm),
            # CN-235 — Skad 2 Halim (3)
            AircraftUnit(tail_number="A-2301", accumulated_flight_hours=100, status="S", aircraft_type_id=cn235, airbase_id=hlm),
            AircraftUnit(tail_number="A-2302", accumulated_flight_hours=160, status="S", aircraft_type_id=cn235, airbase_id=hlm),
            AircraftUnit(tail_number="A-2303", accumulated_flight_hours=240, status="S", aircraft_type_id=cn235, airbase_id=hlm),
            # NC212i — Skad 4 Abd (3)
            AircraftUnit(tail_number="A-2110", accumulated_flight_hours=85, status="S", aircraft_type_id=n212, airbase_id=abd),
            AircraftUnit(tail_number="A-2111", accumulated_flight_hours=130, status="S", aircraft_type_id=n212, airbase_id=abd),
            AircraftUnit(tail_number="A-2112", accumulated_flight_hours=195, status="S", aircraft_type_id=n212, airbase_id=abd),
            # B737 Surveiller — Skad 5 Hasanuddin (3)
            AircraftUnit(tail_number="AI-7301", accumulated_flight_hours=160, status="S", aircraft_type_id=b732, airbase_id=hnd),
            AircraftUnit(tail_number="AI-7302", accumulated_flight_hours=215, status="S", aircraft_type_id=b732, airbase_id=hnd),
            AircraftUnit(tail_number="AI-7303", accumulated_flight_hours=260, status="S", aircraft_type_id=b732, airbase_id=hnd),
            # Falcon 8X/7X — Skad 17 Halim (2)
            AircraftUnit(tail_number="A-0801", accumulated_flight_hours=70, status="S", aircraft_type_id=falcon, airbase_id=hlm),
            AircraftUnit(tail_number="A-0802", accumulated_flight_hours=130, status="S", aircraft_type_id=falcon, airbase_id=hlm),
            # BBJ2 — Skad 17 Halim (2)
            AircraftUnit(tail_number="A-001", accumulated_flight_hours=60, status="S", aircraft_type_id=bbj2, airbase_id=hlm),
            AircraftUnit(tail_number="A-002", accumulated_flight_hours=110, status="S", aircraft_type_id=bbj2, airbase_id=hlm),
            # T-50i — Skad 15 Iswahjudi (4)
            AircraftUnit(tail_number="TT-5001", accumulated_flight_hours=95, status="S", aircraft_type_id=t50, airbase_id=iwj),
            AircraftUnit(tail_number="TT-5002", accumulated_flight_hours=130, status="S", aircraft_type_id=t50, airbase_id=iwj),
            AircraftUnit(tail_number="TT-5003", accumulated_flight_hours=210, status="S", aircraft_type_id=t50, airbase_id=iwj),
            AircraftUnit(tail_number="TT-5005", accumulated_flight_hours=185, status="U/S", aircraft_type_id=t50, airbase_id=iwj),
            # KT-1B — Skad Dik 102 Adisutjipto (4)
            AircraftUnit(tail_number="LD-1101", accumulated_flight_hours=60, status="S", aircraft_type_id=kt1, airbase_id=adi),
            AircraftUnit(tail_number="LD-1102", accumulated_flight_hours=110, status="S", aircraft_type_id=kt1, airbase_id=adi),
            AircraftUnit(tail_number="LD-1103", accumulated_flight_hours=170, status="S", aircraft_type_id=kt1, airbase_id=adi),
            AircraftUnit(tail_number="LD-1104", accumulated_flight_hours=220, status="S", aircraft_type_id=kt1, airbase_id=adi),
            # Grob G120TP — Skad Dik 101 Adisutjipto (4)
            AircraftUnit(tail_number="LD-1201", accumulated_flight_hours=45, status="S", aircraft_type_id=grob, airbase_id=adi),
            AircraftUnit(tail_number="LD-1202", accumulated_flight_hours=80, status="S", aircraft_type_id=grob, airbase_id=adi),
            AircraftUnit(tail_number="LD-1203", accumulated_flight_hours=120, status="S", aircraft_type_id=grob, airbase_id=adi),
            AircraftUnit(tail_number="LD-1204", accumulated_flight_hours=160, status="S", aircraft_type_id=grob, airbase_id=adi),
            # H225M — Skad 8 Atang Sendjaja (3)
            AircraftUnit(tail_number="H-7201", accumulated_flight_hours=70, status="S", aircraft_type_id=h225, airbase_id=ats),
            AircraftUnit(tail_number="H-7202", accumulated_flight_hours=130, status="S", aircraft_type_id=h225, airbase_id=ats),
            AircraftUnit(tail_number="H-7203", accumulated_flight_hours=190, status="S", aircraft_type_id=h225, airbase_id=ats),
            # NAS332 — Skad 6 Atang 2 + Skad 45 Halim 2
            AircraftUnit(tail_number="H-3301", accumulated_flight_hours=80, status="S", aircraft_type_id=nas332, airbase_id=ats),
            AircraftUnit(tail_number="H-3302", accumulated_flight_hours=140, status="S", aircraft_type_id=nas332, airbase_id=ats),
            AircraftUnit(tail_number="H-3303", accumulated_flight_hours=90, status="S", aircraft_type_id=nas332, airbase_id=hlm),
            AircraftUnit(tail_number="H-3304", accumulated_flight_hours=150, status="S", aircraft_type_id=nas332, airbase_id=hlm),
            # SA330 — Skad 8 Atang Sendjaja (2)
            AircraftUnit(tail_number="H-3201", accumulated_flight_hours=75, status="S", aircraft_type_id=sa330, airbase_id=ats),
            AircraftUnit(tail_number="H-3202", accumulated_flight_hours=135, status="S", aircraft_type_id=sa330, airbase_id=ats),
            # EC120 — Skad Dik 105 Suryadarma (3)
            AircraftUnit(tail_number="H-1201", accumulated_flight_hours=40, status="S", aircraft_type_id=ec120, airbase_id=sdm),
            AircraftUnit(tail_number="H-1202", accumulated_flight_hours=75, status="S", aircraft_type_id=ec120, airbase_id=sdm),
            AircraftUnit(tail_number="H-1203", accumulated_flight_hours=110, status="S", aircraft_type_id=ec120, airbase_id=sdm),
        ]
        db.add_all(units_data); db.commit()
        print(f"Berhasil menambahkan {len(units_data)} Unit Armada (78 tail) sesuai skadron & lanud.")

        scenarios_data = [
            OperationsScenario(name="Operasi Kilat Udara Natuna (Patroli ZEE & Pengamanan Wilayah)", description="Pengerahan F-16, Rafale, Hawk & intai Boeing 737 untuk patroli kedaulatan ZEE Natuna Utara.", start_date=now - timedelta(days=2), end_date=now + timedelta(days=5), created_by=admin_user.id),
            OperationsScenario(name="Latihan Gabungan Matra Udara 'Angkasa Yudha 2026'", description="Simulasi manuver Koopsud I/II/III — formasi Rafale, F-16, Sukhoi, T-50i, Hawk.", start_date=now - timedelta(days=1), end_date=now + timedelta(days=7), created_by=admin_user.id),
            OperationsScenario(name="Operasi Trisula Perbatasan (ALKI II - Selat Makassar)", description="Patroli ALKI II & intersepsi oleh Sukhoi Skad 11 + B737 Surveiller.", start_date=now - timedelta(days=5), end_date=now + timedelta(days=10), created_by=admin_user.id),
            OperationsScenario(name="Operasi Dukungan Udara Taktis Logistik Cepat", description="Airlift A400M, C-130J/B/H, CN-295/235, NC212i antar pangkalan.", start_date=now, end_date=now + timedelta(days=3), created_by=admin_user.id),
        ]
        db.add_all(scenarios_data); db.commit()
        print(f"Berhasil menambahkan {len(scenarios_data)} Skenario.")

        sc1, sc2, sc3, sc4 = scenarios_data[0].id, scenarios_data[1].id, scenarios_data[2].id, scenarios_data[3].id
        deployments_data = [
            ScenarioDeployment(scenario_id=sc1, aircraft_id=units_data[0].id), ScenarioDeployment(scenario_id=sc1, aircraft_id=units_data[9].id), ScenarioDeployment(scenario_id=sc1, aircraft_id=units_data[17].id), ScenarioDeployment(scenario_id=sc1, aircraft_id=units_data[48].id),
            ScenarioDeployment(scenario_id=sc2, aircraft_id=units_data[0].id), ScenarioDeployment(scenario_id=sc2, aircraft_id=units_data[4].id), ScenarioDeployment(scenario_id=sc2, aircraft_id=units_data[9].id), ScenarioDeployment(scenario_id=sc2, aircraft_id=units_data[53].id),
            ScenarioDeployment(scenario_id=sc3, aircraft_id=units_data[4].id), ScenarioDeployment(scenario_id=sc3, aircraft_id=units_data[5].id), ScenarioDeployment(scenario_id=sc3, aircraft_id=units_data[48].id),
            ScenarioDeployment(scenario_id=sc4, aircraft_id=units_data[28].id), ScenarioDeployment(scenario_id=sc4, aircraft_id=units_data[32].id), ScenarioDeployment(scenario_id=sc4, aircraft_id=units_data[40].id),
        ]
        db.add_all(deployments_data); db.commit()
        print(f"Berhasil mendaftarkan {len(deployments_data)} Deployment.")

        rsa = _base_id("Raden Sadjad"); tar = _base_id("Anang Busra")
        missions_data = [
            FlightMission(aircraft_id=units_data[9].id, origin_base_id=iwj, destination_base_id=rsa, scheduled_departure=now + timedelta(hours=2), predicted_duration_minutes=92.5, predicted_arrival=now + timedelta(hours=2, minutes=92, seconds=30), status="Scheduled", distance_km=1285.4, origin_weather_temp=29.0, origin_weather_wind_speed=12.5, origin_weather_condition="Cerah Berawan", destination_weather_temp=28.2, destination_weather_wind_speed=18.0, destination_weather_condition="Hujan Ringan"),
            FlightMission(aircraft_id=units_data[4].id, origin_base_id=hnd, destination_base_id=tar, scheduled_departure=now - timedelta(hours=1), actual_departure=now - timedelta(hours=1), predicted_duration_minutes=68.0, predicted_arrival=now + timedelta(minutes=8), status="In-Flight", distance_km=980.2, origin_weather_temp=30.5, origin_weather_wind_speed=10.0, origin_weather_condition="Cerah", destination_weather_temp=27.5, destination_weather_wind_speed=15.2, destination_weather_condition="Mendung"),
            FlightMission(aircraft_id=units_data[32].id, origin_base_id=hlm, destination_base_id=rsn, scheduled_departure=now - timedelta(hours=4), actual_departure=now - timedelta(hours=4), predicted_duration_minutes=105.0, predicted_arrival=now - timedelta(hours=2, minutes=15), status="Arrived", distance_km=945.0, origin_weather_temp=31.0, origin_weather_wind_speed=8.0, origin_weather_condition="Cerah", destination_weather_temp=30.0, destination_weather_wind_speed=11.0, destination_weather_condition="Cerah Berawan"),
        ]
        db.add_all(missions_data); db.commit()
        print(f"Berhasil mendaftarkan {len(missions_data)} Misi Penerbangan.")

        print("\n=======================================================")
        print(f"[SUCCESS] 42 Lanud + {len(types_data)} tipe + {len(units_data)} tail + 4 skenario + 3 misi OK")
        print("=======================================================")
    except Exception as e:
        db.rollback(); print(f"[ERROR] {e}"); raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
