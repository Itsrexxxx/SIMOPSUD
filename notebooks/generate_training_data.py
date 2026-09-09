"""Generate realistic TNI AU dummy datasets for Jupyter training.

Lanud = Kodau I/II/III (daftar resmi user). GPS/ICAO dari bandara nyata.
ETE/ETA deterministik: haversine(origin, dest) / cruise_speed * 60 * weather_severity + taxi.
Bukan random durasi. Cuaca hanya menggeser GS/severity (fitur model ETA).
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd

SEED = 42
N_MISSIONS = 5000
rng = np.random.default_rng(SEED)

OUT = Path(__file__).resolve().parent / "data"
OUT.mkdir(parents=True, exist_ok=True)

# taxi_min per tipe (standar militer, tetap)
TAXI = {"f-16": 6.0, "sukhoi": 7.0, "t-50i": 6.0, "c-130": 12.0, "boeing": 14.0, "tucano": 5.0}
# payload capacity per tipe (kg) — dari eta_prediction_model sync; untuk data sintetik ratio random 0..1
PAYLOAD_CAP = {"f-16": 4500, "sukhoi": 2800, "t-50i": 2200, "c-130": 8000, "boeing": 9000, "tucano": 1200}
# radius operasi ferry (km) — F-16 Natuna dari Jawa ~1300 km = dalam batas
MAX_RANGE = {"f-16": 1800, "sukhoi": 2800, "t-50i": 1400, "c-130": 4500, "boeing": 4500, "tucano": 1100}
MIN_HOP = 80  # skip hop terlalu dekat (satu kota)

# ---------------------------------------------------------------------------
# 42 Lanud unik Kodau I–III. Duplikat dibuang:
# - Iskandar Pangkalan Bun muncul di Kodau I & II → satu entri Kodau I
# - Moeljono Surabaya = Muljono Sedati → satu entri Kodau II
# - Dumatubun / DWT sekunder = Dominicus Dumatubun Langgur
# Koordinat: ICAO/ARP publik (OurAirports / Wikipedia / Hubud).
# ---------------------------------------------------------------------------
AIRBASES = [
    # Kodau I — Mako Halim
    dict(id=1, icao="WIHH", iata="HLP", code="HLM", name="Lanud Halim Perdanakusuma",
         location="Jakarta Timur, DKI Jakarta", kodau="Kodau I", tipe="A",
         lat=-6.2644, lon=106.8958, runway_m=3000, elev_m=25,
         avtur_capacity_liters=1_200_000, apron_capacity=30, status="optimal"),
    dict(id=2, icao="WIAJ", iata="", code="ATS", name="Lanud Atang Sendjaja",
         location="Kemang, Bogor, Jawa Barat", kodau="Kodau I", tipe="A",
         lat=-6.5497, lon=106.7511, runway_m=1400, elev_m=164,
         avtur_capacity_liters=180_000, apron_capacity=12, status="optimal"),
    dict(id=3, icao="WIHK", iata="", code="SDM", name="Lanud Suryadarma",
         location="Kalijati, Subang, Jawa Barat", kodau="Kodau I", tipe="A",
         lat=-6.5314, lon=107.6592, runway_m=1600, elev_m=110,
         avtur_capacity_liters=220_000, apron_capacity=14, status="optimal"),
    dict(id=4, icao="WIBB", iata="PKU", code="RSN", name="Lanud Roesmin Nurjadin",
         location="Pekanbaru, Riau", kodau="Kodau I", tipe="A",
         lat=0.4616, lon=101.4461, runway_m=2600, elev_m=31,
         avtur_capacity_liters=750_000, apron_capacity=18, status="optimal"),
    dict(id=5, icao="WIOO", iata="PNK", code="SPO", name="Lanud Supadio",
         location="Kubu Raya, Pontianak, Kalimantan Barat", kodau="Kodau I", tipe="A",
         lat=-0.1502, lon=109.4041, runway_m=2250, elev_m=3,
         avtur_capacity_liters=600_000, apron_capacity=16, status="optimal"),
    dict(id=6, icao="WION", iata="NTX", code="RSA", name="Lanud Raden Sadjad",
         location="Ranai, Natuna, Kepulauan Riau", kodau="Kodau I", tipe="B",
         lat=3.9413, lon=108.3916, runway_m=2560, elev_m=2,
         avtur_capacity_liters=350_000, apron_capacity=10, status="warning"),
    dict(id=7, icao="WICC", iata="BDO", code="HSN", name="Lanud Husein Sastranegara",
         location="Bandung, Jawa Barat", kodau="Kodau I", tipe="B",
         lat=-6.9005, lon=107.5763, runway_m=2249, elev_m=743,
         avtur_capacity_liters=400_000, apron_capacity=12, status="optimal"),
    dict(id=8, icao="WIMK", iata="MES", code="SWD", name="Lanud Soewondo",
         location="Medan, Sumatra Utara", kodau="Kodau I", tipe="B",
         lat=3.5577, lon=98.6713, runway_m=2900, elev_m=28,
         avtur_capacity_liters=450_000, apron_capacity=14, status="optimal"),
    dict(id=9, icao="WITT", iata="BTJ", code="SIM", name="Lanud Sultan Iskandar Muda",
         location="Blang Bintang, Aceh Besar, Aceh", kodau="Kodau I", tipe="B",
         lat=5.5233, lon=95.4202, runway_m=3000, elev_m=20,
         avtur_capacity_liters=420_000, apron_capacity=12, status="optimal"),
    dict(id=10, icao="WIMG", iata="", code="SSR", name="Lanud Sutan Sjahrir",
         location="Tabing, Padang, Sumatra Barat", kodau="Kodau I", tipe="B",
         lat=-0.9186, lon=100.3536, runway_m=2150, elev_m=3,
         avtur_capacity_liters=280_000, apron_capacity=10, status="optimal"),
    dict(id=11, icao="WIDN", iata="TNJ", code="RHF", name="Lanud Raja Haji Fisabilillah",
         location="Tanjungpinang, Kepulauan Riau", kodau="Kodau I", tipe="B",
         lat=0.9231, lon=104.5306, runway_m=2250, elev_m=16,
         avtur_capacity_liters=300_000, apron_capacity=10, status="optimal"),
    dict(id=12, icao="WIPP", iata="PLM", code="SMH", name="Lanud Sri Mulyono Herlambang",
         location="Palembang, Sumatra Selatan", kodau="Kodau I", tipe="B",
         lat=-2.8986, lon=104.7019, runway_m=3000, elev_m=11,
         avtur_capacity_liters=480_000, apron_capacity=14, status="optimal"),
    dict(id=13, icao="WITN", iata="SBG", code="MMS", name="Lanud Maimun Saleh",
         location="Sabang, Aceh", kodau="Kodau I", tipe="C",
         lat=5.8725, lon=95.3397, runway_m=1850, elev_m=126,
         avtur_capacity_liters=90_000, apron_capacity=6, status="warning"),
    dict(id=14, icao="WIOD", iata="TJQ", code="HAS", name="Lanud H.A.S. Hanandjoeddin",
         location="Tanjung Pandan, Belitung, Bangka Belitung", kodau="Kodau I", tipe="C",
         lat=-2.7455, lon=107.7550, runway_m=2500, elev_m=50,
         avtur_capacity_liters=160_000, apron_capacity=8, status="optimal"),
    dict(id=15, icao="WIAG", iata="AKQ", code="PBY", name="Lanud Pangeran M. Bun Yamin",
         location="Menggala, Tulang Bawang, Lampung", kodau="Kodau I", tipe="C",
         lat=-4.5016, lon=105.1950, runway_m=1600, elev_m=19,
         avtur_capacity_liters=80_000, apron_capacity=6, status="warning"),
    dict(id=16, icao="WICM", iata="TSY", code="WRD", name="Lanud Wiriadinata",
         location="Cibeureum, Tasikmalaya, Jawa Barat", kodau="Kodau I", tipe="C",
         lat=-7.3561, lon=108.2469, runway_m=1600, elev_m=352,
         avtur_capacity_liters=70_000, apron_capacity=6, status="optimal"),
    dict(id=17, icao="", iata="", code="SGS", name="Lanud Sugiri Sukani",
         location="Jatiwangi, Majalengka, Jawa Barat", kodau="Kodau I", tipe="C",
         lat=-6.6686, lon=108.2186, runway_m=1200, elev_m=50,
         avtur_capacity_liters=40_000, apron_capacity=4, status="warning"),
    dict(id=18, icao="WAOI", iata="PKN", code="ISK", name="Lanud Iskandar",
         location="Pangkalan Bun, Kotawaringin Barat, Kalimantan Tengah", kodau="Kodau I", tipe="C",
         lat=-2.7050, lon=111.6733, runway_m=1650, elev_m=75,
         avtur_capacity_liters=120_000, apron_capacity=6, status="warning"),
    dict(id=19, icao="", iata="", code="HHD", name="Lanud Harry Hadisoemantri",
         location="Bange, Sanggau Ledo, Bengkayang, Kalimantan Barat", kodau="Kodau I", tipe="C",
         lat=0.9466, lon=109.6533, runway_m=900, elev_m=45,
         avtur_capacity_liters=35_000, apron_capacity=4, status="critical"),
    dict(id=20, icao="WIDD", iata="BTH", code="HNDM", name="Lanud Hang Nadim",
         location="Batam, Kepulauan Riau", kodau="Kodau I", tipe="C",
         lat=1.1208, lon=104.1186, runway_m=4025, elev_m=38,
         avtur_capacity_liters=500_000, apron_capacity=16, status="optimal"),
    # Kodau II — Mako Daya, Makassar
    dict(id=21, icao="WAAA", iata="UPG", code="HND", name="Lanud Sultan Hasanuddin",
         location="Maros, Makassar, Sulawesi Selatan", kodau="Kodau II", tipe="A",
         lat=-5.0755, lon=119.5537, runway_m=3100, elev_m=14,
         avtur_capacity_liters=900_000, apron_capacity=20, status="optimal"),
    dict(id=22, icao="WIAR", iata="", code="IWJ", name="Lanud Iswahjudi",
         location="Maospati, Magetan, Jawa Timur", kodau="Kodau II", tipe="A",
         lat=-7.6158, lon=111.4340, runway_m=2500, elev_m=110,
         avtur_capacity_liters=850_000, apron_capacity=24, status="optimal"),
    dict(id=23, icao="WARA", iata="MLG", code="ABD", name="Lanud Abdulrachman Saleh",
         location="Pakis, Malang, Jawa Timur", kodau="Kodau II", tipe="A",
         lat=-7.9263, lon=112.7147, runway_m=2000, elev_m=526,
         avtur_capacity_liters=500_000, apron_capacity=14, status="warning"),
    dict(id=24, icao="WAHH", iata="JOG", code="ADI", name="Lanud Adisutjipto",
         location="Sleman, D.I. Yogyakarta", kodau="Kodau II", tipe="A",
         lat=-7.7880, lon=110.4316, runway_m=2200, elev_m=107,
         avtur_capacity_liters=380_000, apron_capacity=16, status="optimal"),
    dict(id=25, icao="WARQ", iata="SOC", code="ASM", name="Lanud Adi Soemarmo",
         location="Colomadu, Karanganyar, Jawa Tengah", kodau="Kodau II", tipe="A",
         lat=-7.5161, lon=110.7569, runway_m=2600, elev_m=128,
         avtur_capacity_liters=420_000, apron_capacity=16, status="optimal"),
    dict(id=26, icao="WAMM", iata="MDC", code="SRR", name="Lanud Sam Ratulangi",
         location="Manado, Sulawesi Utara", kodau="Kodau II", tipe="A",
         lat=1.5491, lon=124.9263, runway_m=2650, elev_m=80,
         avtur_capacity_liters=550_000, apron_capacity=14, status="optimal"),
    dict(id=27, icao="WATT", iata="KOE", code="ELT", name="Lanud El Tari",
         location="Kupang, Nusa Tenggara Timur", kodau="Kodau II", tipe="A",
         lat=-10.1725, lon=123.6711, runway_m=2500, elev_m=102,
         avtur_capacity_liters=400_000, apron_capacity=12, status="optimal"),
    dict(id=28, icao="WALK", iata="TRK", code="TAR", name="Lanud Anang Busra",
         location="Tarakan, Kalimantan Utara", kodau="Kodau II", tipe="A",
         lat=3.3244, lon=117.5675, runway_m=1850, elev_m=6,
         avtur_capacity_liters=250_000, apron_capacity=8, status="critical"),
    dict(id=29, icao="WALL", iata="BPN", code="DMB", name="Lanud Dhomber",
         location="Balikpapan, Kalimantan Timur", kodau="Kodau II", tipe="A",
         lat=-1.2686, lon=116.8944, runway_m=2500, elev_m=12,
         avtur_capacity_liters=520_000, apron_capacity=14, status="optimal"),
    dict(id=30, icao="WAWW", iata="KDI", code="HLO", name="Lanud Haluoleo",
         location="Konawe Selatan, Kendari, Sulawesi Tenggara", kodau="Kodau II", tipe="A",
         lat=-4.0827, lon=122.4213, runway_m=2500, elev_m=164,
         avtur_capacity_liters=320_000, apron_capacity=10, status="optimal"),
    dict(id=31, icao="WADD", iata="DPS", code="IGR", name="Lanud I Gusti Ngurah Rai",
         location="Badung, Bali", kodau="Kodau II", tipe="A",
         lat=-8.7480, lon=115.1675, runway_m=3000, elev_m=4,
         avtur_capacity_liters=800_000, apron_capacity=20, status="optimal"),
    dict(id=32, icao="WARR", iata="SUB", code="MUL", name="Lanud Muljono",
         location="Sedati, Sidoarjo, Jawa Timur", kodau="Kodau II", tipe="B",
         lat=-7.3791, lon=112.7802, runway_m=3000, elev_m=9,
         avtur_capacity_liters=600_000, apron_capacity=18, status="optimal"),
    dict(id=33, icao="WAOO", iata="BDJ", code="SJN", name="Lanud Sjamsudin Noor",
         location="Landasan Ulin, Banjarbaru, Kalimantan Selatan", kodau="Kodau II", tipe="B",
         lat=-3.4422, lon=114.7616, runway_m=2500, elev_m=20,
         avtur_capacity_liters=350_000, apron_capacity=12, status="optimal"),
    dict(id=34, icao="WADL", iata="LOP", code="ZAM", name="Lanud TGKH. M. Zainuddin Abdul Madjid",
         location="Rembiga / Praya, Lombok, Nusa Tenggara Barat", kodau="Kodau II", tipe="B",
         lat=-8.5583, lon=116.0925, runway_m=2750, elev_m=97,
         avtur_capacity_liters=380_000, apron_capacity=12, status="optimal"),
    dict(id=35, icao="WIBY", iata="", code="SLM", name="Lanud Sulaiman",
         location="Margahayu, Bandung, Jawa Barat", kodau="Kodau II", tipe="A",
         lat=-6.9836, lon=107.5922, runway_m=2249, elev_m=683,
         avtur_capacity_liters=150_000, apron_capacity=8, status="optimal"),
    # Kodau III — Mako Biak
    dict(id=36, icao="WABB", iata="BIK", code="MNH", name="Lanud Manuhua",
         location="Biak Numfor, Papua", kodau="Kodau III", tipe="A",
         lat=-1.1900, lon=136.1075, runway_m=3570, elev_m=11,
         avtur_capacity_liters=700_000, apron_capacity=16, status="optimal"),
    dict(id=37, icao="WAJJ", iata="DJJ", code="SLP", name="Lanud Silas Papare",
         location="Sentani, Jayapura, Papua", kodau="Kodau III", tipe="A",
         lat=-2.5766, lon=140.5166, runway_m=3000, elev_m=88,
         avtur_capacity_liters=550_000, apron_capacity=14, status="optimal"),
    dict(id=38, icao="WAKK", iata="MKQ", code="JAD", name="Lanud Johannes Abraham Dimara",
         location="Merauke, Papua Selatan", kodau="Kodau III", tipe="B",
         lat=-8.5202, lon=140.4172, runway_m=1850, elev_m=3,
         avtur_capacity_liters=220_000, apron_capacity=8, status="warning"),
    dict(id=39, icao="WAPP", iata="AMQ", code="PTM", name="Lanud Pattimura",
         location="Ambon, Maluku", kodau="Kodau III", tipe="B",
         lat=-3.7105, lon=128.0894, runway_m=2500, elev_m=10,
         avtur_capacity_liters=300_000, apron_capacity=10, status="optimal"),
    dict(id=40, icao="WAMR", iata="OTI", code="LWM", name="Lanud Leo Wattimena",
         location="Pitu, Pulau Morotai, Maluku Utara", kodau="Kodau III", tipe="B",
         lat=2.0455, lon=128.3294, runway_m=2400, elev_m=15,
         avtur_capacity_liters=180_000, apron_capacity=8, status="warning"),
    dict(id=41, icao="WAYY", iata="TIM", code="YKP", name="Lanud Yohanis Kapiyau",
         location="Timika, Mimika, Papua Tengah", kodau="Kodau III", tipe="B",
         lat=-4.5291, lon=136.8858, runway_m=2500, elev_m=103,
         avtur_capacity_liters=240_000, apron_capacity=8, status="optimal"),
    dict(id=42, icao="WAPL", iata="LUV", code="DMT", name="Lanud Dominicus Dumatubun",
         location="Langgur, Maluku Tenggara, Maluku", kodau="Kodau III", tipe="C",
         lat=-5.6600, lon=132.7302, runway_m=1650, elev_m=3,
         avtur_capacity_liters=90_000, apron_capacity=6, status="warning"),
]

# cruise_speed_kmh = CRUISE_SPEED_LOOKUP di eta_prediction_model.py
AIRCRAFT = [
    dict(id=1, tail="TS-1601", type_name="F-16C/D Fighting Falcon Block 52ID",
         type_key="f-16", squadron="Skadron Udara 3", homebase_code="IWJ",
         cruise_speed_kmh=850, burn_lph=3200, status="Ready", hours=145.5, min_runway_m=1800),
    dict(id=2, tail="TS-1602", type_name="F-16C/D Fighting Falcon Block 52ID",
         type_key="f-16", squadron="Skadron Udara 3", homebase_code="IWJ",
         cruise_speed_kmh=850, burn_lph=3200, status="Ready", hours=180.0, min_runway_m=1800),
    dict(id=3, tail="TS-1603", type_name="F-16C/D Fighting Falcon Block 52ID",
         type_key="f-16", squadron="Skadron Udara 3", homebase_code="IWJ",
         cruise_speed_kmh=850, burn_lph=3200, status="Ready", hours=240.2, min_runway_m=1800),
    dict(id=4, tail="TS-1604", type_name="F-16C/D Fighting Falcon Block 52ID",
         type_key="f-16", squadron="Skadron Udara 3", homebase_code="IWJ",
         cruise_speed_kmh=850, burn_lph=3200, status="Ready", hours=285.0, min_runway_m=1800),
    dict(id=5, tail="TS-1605", type_name="F-16C/D Fighting Falcon Block 52ID",
         type_key="f-16", squadron="Skadron Udara 3", homebase_code="IWJ",
         cruise_speed_kmh=850, burn_lph=3200, status="Maintenance", hours=195.0, min_runway_m=1800),
    dict(id=6, tail="TS-1606", type_name="F-16C/D Fighting Falcon Block 52ID",
         type_key="f-16", squadron="Skadron Udara 3", homebase_code="IWJ",
         cruise_speed_kmh=850, burn_lph=3200, status="Mandatory Grounding", hours=305.5, min_runway_m=1800),
    dict(id=7, tail="TS-1610", type_name="F-16C/D Fighting Falcon Block 52ID",
         type_key="f-16", squadron="Skadron Udara 16", homebase_code="RSN",
         cruise_speed_kmh=850, burn_lph=3200, status="Ready", hours=110.0, min_runway_m=1800),
    dict(id=8, tail="TS-1611", type_name="F-16C/D Fighting Falcon Block 52ID",
         type_key="f-16", squadron="Skadron Udara 16", homebase_code="RSN",
         cruise_speed_kmh=850, burn_lph=3200, status="Ready", hours=165.5, min_runway_m=1800),
    dict(id=9, tail="TS-1612", type_name="F-16C/D Fighting Falcon Block 52ID",
         type_key="f-16", squadron="Skadron Udara 16", homebase_code="RSN",
         cruise_speed_kmh=850, burn_lph=3200, status="Ready", hours=220.0, min_runway_m=1800),
    dict(id=10, tail="TS-1614", type_name="F-16C/D Fighting Falcon Block 52ID",
         type_key="f-16", squadron="Skadron Udara 16", homebase_code="RSN",
         cruise_speed_kmh=850, burn_lph=3200, status="Ready", hours=290.0, min_runway_m=1800),
    dict(id=11, tail="TS-2701", type_name="Sukhoi Su-27SKM / Su-30MK2 Flanker",
         type_key="sukhoi", squadron="Skadron Udara 11", homebase_code="HND",
         cruise_speed_kmh=900, burn_lph=4500, status="Ready", hours=125.0, min_runway_m=1800),
    dict(id=12, tail="TS-2702", type_name="Sukhoi Su-27SKM / Su-30MK2 Flanker",
         type_key="sukhoi", squadron="Skadron Udara 11", homebase_code="HND",
         cruise_speed_kmh=900, burn_lph=4500, status="Ready", hours=190.5, min_runway_m=1800),
    dict(id=13, tail="TS-3001", type_name="Sukhoi Su-27SKM / Su-30MK2 Flanker",
         type_key="sukhoi", squadron="Skadron Udara 11", homebase_code="HND",
         cruise_speed_kmh=900, burn_lph=4500, status="Ready", hours=150.0, min_runway_m=1800),
    dict(id=14, tail="TS-3002", type_name="Sukhoi Su-27SKM / Su-30MK2 Flanker",
         type_key="sukhoi", squadron="Skadron Udara 11", homebase_code="HND",
         cruise_speed_kmh=900, burn_lph=4500, status="Ready", hours=275.0, min_runway_m=1800),
    dict(id=15, tail="TS-3003", type_name="Sukhoi Su-27SKM / Su-30MK2 Flanker",
         type_key="sukhoi", squadron="Skadron Udara 11", homebase_code="HND",
         cruise_speed_kmh=900, burn_lph=4500, status="Mandatory Grounding", hours=312.0, min_runway_m=1800),
    dict(id=16, tail="TT-5001", type_name="T-50i Golden Eagle",
         type_key="t-50i", squadron="Skadron Udara 15", homebase_code="IWJ",
         cruise_speed_kmh=750, burn_lph=1800, status="Ready", hours=95.0, min_runway_m=1400),
    dict(id=17, tail="TT-5002", type_name="T-50i Golden Eagle",
         type_key="t-50i", squadron="Skadron Udara 15", homebase_code="IWJ",
         cruise_speed_kmh=750, burn_lph=1800, status="Ready", hours=130.0, min_runway_m=1400),
    dict(id=18, tail="TT-5003", type_name="T-50i Golden Eagle",
         type_key="t-50i", squadron="Skadron Udara 15", homebase_code="IWJ",
         cruise_speed_kmh=750, burn_lph=1800, status="Ready", hours=210.0, min_runway_m=1400),
    dict(id=19, tail="TT-5005", type_name="T-50i Golden Eagle",
         type_key="t-50i", squadron="Skadron Udara 15", homebase_code="IWJ",
         cruise_speed_kmh=750, burn_lph=1800, status="Maintenance", hours=185.0, min_runway_m=1400),
    dict(id=20, tail="A-1339", type_name="C-130J-30 Super Hercules",
         type_key="c-130", squadron="Skadron Udara 31", homebase_code="HLM",
         cruise_speed_kmh=540, burn_lph=2800, status="Ready", hours=140.0, min_runway_m=1600),
    dict(id=21, tail="A-1340", type_name="C-130J-30 Super Hercules",
         type_key="c-130", squadron="Skadron Udara 31", homebase_code="HLM",
         cruise_speed_kmh=540, burn_lph=2800, status="Ready", hours=175.0, min_runway_m=1600),
    dict(id=22, tail="A-1341", type_name="C-130J-30 Super Hercules",
         type_key="c-130", squadron="Skadron Udara 31", homebase_code="HLM",
         cruise_speed_kmh=540, burn_lph=2800, status="Ready", hours=230.5, min_runway_m=1600),
    dict(id=23, tail="A-1342", type_name="C-130J-30 Super Hercules",
         type_key="c-130", squadron="Skadron Udara 31", homebase_code="HLM",
         cruise_speed_kmh=540, burn_lph=2800, status="Ready", hours=85.0, min_runway_m=1600),
    dict(id=24, tail="AI-7301", type_name="Boeing 737-2X9 Surveiller",
         type_key="boeing", squadron="Skadron Udara 5", homebase_code="HND",
         cruise_speed_kmh=780, burn_lph=2600, status="Ready", hours=160.0, min_runway_m=2000),
    dict(id=25, tail="AI-7302", type_name="Boeing 737-2X9 Surveiller",
         type_key="boeing", squadron="Skadron Udara 5", homebase_code="HND",
         cruise_speed_kmh=780, burn_lph=2600, status="Ready", hours=215.0, min_runway_m=2000),
    dict(id=26, tail="AI-7303", type_name="Boeing 737-2X9 Surveiller",
         type_key="boeing", squadron="Skadron Udara 5", homebase_code="HND",
         cruise_speed_kmh=780, burn_lph=2600, status="Ready", hours=260.0, min_runway_m=2000),
    dict(id=27, tail="TT-3101", type_name="EMB-314 Super Tucano",
         type_key="tucano", squadron="Skadron Udara 21", homebase_code="ABD",
         cruise_speed_kmh=480, burn_lph=280, status="Ready", hours=115.0, min_runway_m=900),
    dict(id=28, tail="TT-3102", type_name="EMB-314 Super Tucano",
         type_key="tucano", squadron="Skadron Udara 21", homebase_code="ABD",
         cruise_speed_kmh=480, burn_lph=280, status="Ready", hours=170.0, min_runway_m=900),
    dict(id=29, tail="TT-3103", type_name="EMB-314 Super Tucano",
         type_key="tucano", squadron="Skadron Udara 21", homebase_code="ABD",
         cruise_speed_kmh=480, burn_lph=280, status="Ready", hours=225.0, min_runway_m=900),
    dict(id=30, tail="TT-3104", type_name="EMB-314 Super Tucano",
         type_key="tucano", squadron="Skadron Udara 21", homebase_code="ABD",
         cruise_speed_kmh=480, burn_lph=280, status="Ready", hours=288.0, min_runway_m=900),
]

MISSION_TYPES = {
    "f-16": ["Patroli Udara Tempur", "QRA Intersepsi", "Latihan ACM", "Transit Redeploy"],
    "sukhoi": ["Patroli Jarak Jauh", "QRA Intersepsi", "Latihan Gabungan", "Transit Redeploy"],
    "t-50i": ["Latihan LIFT", "Serang Ringan", "Transit Redeploy"],
    "c-130": ["Angkutan Logistik", "Pergeseran Pasukan", "Medevac", "Drop Udara"],
    "boeing": ["Intai Maritim", "Patroli ZEE", "Surveillance ALKI"],
    "tucano": ["COIN / CAS", "Patroli Darat", "Latihan Taktis"],
}

# WMO-like: code, label, severity (match eta_prediction_model._get_weather_severity)
WX = [
    (0, "Cerah", 1.00),
    (1, "Cerah Berawan", 1.00),
    (2, "Mendung", 1.03),
    (45, "Kabut", 1.08),
    (61, "Hujan Ringan", 1.08),
    (63, "Hujan Sedang", 1.12),
    (65, "Hujan Lebat", 1.15),
    (80, "Hujan Lokal", 1.08),
    (95, "Badai Petir", 1.25),
]

MAINT = [
    dict(id=1, status_code="Ready", description="Siap operasi", is_operational=True),
    dict(id=2, status_code="Maintenance", description="Perawatan terjadwal / unscheduled", is_operational=False),
    dict(id=3, status_code="Mandatory Grounding", description="Grounded — inspeksi wajib / AOG", is_operational=False),
]


def haversine_km(lat1, lon1, lat2, lon2) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def weather_for(month: int, hour: int, lat: float):
    """Cuaca tropis Indonesia: deterministik dari (month, hour, lat bucket) + sedikit noise terukur.

    Bukan durasi random. Severity ikut rumus model ETA.
    Versi extend: juga kembalikan visibility_m (m) dan wind_direction_deg untuk fitur prediksi.
    """
    wet = month in (11, 12, 1, 2, 3)
    afternoon = 13 <= hour <= 18
    equator = abs(lat) < 3
    # index 0-8, pilih mode musiman lalu 1 langkah dari seed grid
    if wet and afternoon:
        base = 5 if equator else 4  # hujan sedang/lebat
    elif wet:
        base = 3
    elif afternoon:
        base = 2
    else:
        base = 0
    jitter = int(rng.integers(-1, 2))
    idx = int(np.clip(base + jitter, 0, 8))
    code, label, sev = WX[idx]
    temp = round(float(np.clip(28.0 - 0.15 * abs(lat) - (1.4 if wet else 0) + (hour - 13) * 0.15, 22.0, 34.5)), 1)
    wind = round(float(8.0 + (12 if code >= 80 else 0) + (6 if wet else 0) + abs(lat) * 0.3), 1)
    wind = float(np.clip(wind, 3.0, 48.0))
    # extend: visibility & wind direction deterministik (untuk model, ponytail: ganti BMKG METAR/TAF real when tersedia)
    # VIS: hujan/kabut rendah 1500-5000, cerah 8000-15000
    if code in (45,):  # kabut
        vis = int(np.clip(1200 + rng.integers(-400, 1800), 800, 4000))
    elif code in (65, 95):  # lebat/petir
        vis = int(np.clip(2500 + rng.integers(-800, 2500), 1500, 6000))
    elif code in (63, 80, 81):  # sedang
        vis = int(np.clip(5000 + rng.integers(-1500, 4000), 3000, 9000))
    else:
        vis = int(np.clip(8500 + rng.integers(-1500, 7000), 7000, 15000))
    wdir = int(rng.integers(0, 360))
    # bias muson: barat ~270 di wet, timur ~90 di dry
    if wet:
        wdir = int(np.clip(wdir * 0.4 + 270 * 0.6 + rng.integers(-30, 30), 0, 359))
    else:
        wdir = int(np.clip(wdir * 0.5 + 90 * 0.5 + rng.integers(-40, 40), 0, 359))
    wdir %= 360
    cloud = int(np.clip(20 + idx * 9 + rng.integers(-12, 12), 5, 95))
    return code, label, sev, temp, wind, vis, wdir, cloud


def ete_minutes(distance_km: float, cruise: float, avg_wind: float, severity: float, taxi: float) -> float:
    """Durasi prediksi: jarak nyata / ground speed + taxi, dikali severity cuaca.

    GS = cruise - 0.35 * avg_wind (headwind efektif). Sama rumus di generator lama,
    tanpa noise extra.
    """
    gs = max(cruise - 0.35 * avg_wind, cruise * 0.82)
    return round((distance_km / gs) * 60.0 * severity + taxi, 1), round(gs, 1)


def reachable(ac, origin, bases):
    key = ac["type_key"]
    mx = MAX_RANGE[key]
    out = []
    for b in bases:
        if b["id"] == origin["id"]:
            continue
        if b["runway_m"] < ac["min_runway_m"]:
            continue
        d = haversine_km(origin["lat"], origin["lon"], b["lat"], b["lon"])
        if MIN_HOP <= d <= mx:
            out.append((b, d))
    return out


def dest_weight(ac, origin, dest, dist):
    """Prioritas ops nyata, bukan uniform random nationwide."""
    w = 1.0
    key = ac["type_key"]
    if dest["code"] == "RSA" and key in ("f-16", "sukhoi", "boeing"):
        w *= 2.4  # Natuna ZEE
    if dest["code"] in ("TAR", "HHD") and key in ("f-16", "tucano", "c-130"):
        w *= 1.6  # perbatasan Kalbar/Kaltara
    if dest["kodau"] == origin["kodau"]:
        w *= 1.5
    if dest["tipe"] == "A":
        w *= 1.3
    if dest["tipe"] == "C" and key in ("c-130", "boeing"):
        w *= 0.4
    if key == "tucano" and dest["kodau"] != "Kodau II" and dest["code"] not in ("HLM", "IWJ", "SPO", "ISK"):
        w *= 0.3
    # F-16 SkU 16 (RSN) sering Natuna/Batam/Tanjungpinang
    if ac["homebase_code"] == "RSN" and dest["code"] in ("RSA", "HNDM", "RHF"):
        w *= 1.8
    return w


def fmt(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def main():
    bases_by_code = {b["code"]: b for b in AIRBASES}
    bases_by_id = {b["id"]: b for b in AIRBASES}
    for ac in AIRCRAFT:
        hb = bases_by_code[ac["homebase_code"]]
        ac["homebase_id"] = hb["id"]

    flyable = [a for a in AIRCRAFT if a["status"] == "Ready"]

    df_airbase = pd.DataFrame(AIRBASES)
    df_aircraft = pd.DataFrame(AIRCRAFT).rename(columns={"tail": "tail_number", "hours": "accumulated_flight_hours"})
    df_maint = pd.DataFrame(MAINT)

    # katalog rute deterministik (cerah, wind 10 km/h) — 1 baris per pesawat siap × dest reachable
    catalog = []
    cid = 1
    for ac in flyable:
        origin = bases_by_id[ac["homebase_id"]]
        for dest, dist in reachable(ac, origin, AIRBASES):
            taxi = TAXI[ac["type_key"]]
            ete, gs = ete_minutes(dist, ac["cruise_speed_kmh"], avg_wind=10.0, severity=1.0, taxi=taxi)
            catalog.append(dict(
                catalog_id=cid,
                tail_number=ac["tail"],
                aircraft_type=ac["type_name"],
                type_key=ac["type_key"],
                squadron=ac["squadron"],
                origin_code=origin["code"],
                origin_icao=origin["icao"],
                origin_name=origin["name"],
                origin_kodau=origin["kodau"],
                dest_code=dest["code"],
                dest_icao=dest["icao"],
                dest_name=dest["name"],
                dest_kodau=dest["kodau"],
                distance_km=round(dist, 1),
                cruise_speed_kmh=ac["cruise_speed_kmh"],
                ground_speed_kmh=gs,
                taxi_min=taxi,
                weather="Cerah (VFR baseline)",
                weather_severity=1.0,
                avg_wind_kmh=10.0,
                ete_minutes=ete,
                etd_example="2026-06-01 07:00:00",
                eta_example=fmt(datetime(2026, 6, 1, 7, 0, 0) + timedelta(minutes=ete)),
            ))
            cid += 1
    df_cat = pd.DataFrame(catalog)

    start = datetime(2024, 1, 1, 6, 0, 0)
    end = datetime(2026, 8, 31, 18, 0, 0)
    span_sec = int((end - start).total_seconds())

    rows, fact_rows = [], []
    for i in range(1, N_MISSIONS + 1):
        ac = flyable[int(rng.integers(0, len(flyable)))]
        origin = bases_by_id[ac["homebase_id"]]
        # 18% transit dari lanud tipe A lain (redeploy), tetap dalam jangkauan
        if rng.random() < 0.18:
            alts = [b for b in AIRBASES if b["tipe"] == "A" and b["id"] != origin["id"]
                    and b["runway_m"] >= ac["min_runway_m"]]
            if alts:
                origin = alts[int(rng.integers(0, len(alts)))]
        opts = reachable(ac, origin, AIRBASES)
        if not opts:
            origin = bases_by_id[ac["homebase_id"]]
            opts = reachable(ac, origin, AIRBASES)
        weights = np.array([dest_weight(ac, origin, b, d) for b, d in opts], dtype=float)
        weights /= weights.sum()
        idx = int(rng.choice(len(opts), p=weights))
        dest, dist = opts[idx]

        etd = start + timedelta(seconds=int(rng.integers(0, span_sec)))
        etd = etd.replace(hour=int(rng.integers(5, 20)), minute=int(rng.choice([0, 15, 30, 45])), second=0)

        o_code, o_label, o_sev, o_temp, o_wind, o_vis, o_wdir, o_cloud = weather_for(etd.month, etd.hour, origin["lat"])
        eta_hour = (etd.hour + 2) % 24
        d_code, d_label, d_sev, d_temp, d_wind, d_vis, d_wdir, d_cloud = weather_for(etd.month, eta_hour, dest["lat"])
        sev = max(o_sev, d_sev)
        avg_wind = round((o_wind + d_wind) / 2.0, 1)

        # extend: payload & flight level sinkron eta_prediction_model.py (ponytail: ganti log misi real ketika tersedia)
        cap = PAYLOAD_CAP[ac["type_key"]]
        payload_kg = int(rng.integers(0, cap + 1)) if rng.random() < 0.85 else int(rng.integers(int(cap * 0.6), cap + 1))
        payload_ratio = round(payload_kg / cap, 3) if cap else 0.0
        # FL: fighter tinggi 180-380, transport menengah 120-280
        if ac["type_key"] in ("f-16", "sukhoi", "t-50i"):
            flight_level = int(rng.integers(150, 380))
        elif ac["type_key"] in ("c-130", "boeing"):
            flight_level = int(rng.integers(120, 300))
        else:
            flight_level = int(rng.integers(80, 200))
        # low FL penalty <100 will be 8%; keep ~12% flights low for training signal
        if rng.random() < 0.12:
            flight_level = int(rng.integers(60, 100))
        cruise_eff = ac["cruise_speed_kmh"] * (1 - 0.05 * payload_ratio) * (0.92 if flight_level < 100 else 1.0)
        # alternate: 65% NIL, else 40-380 km
        alternate_distance_km = 0.0
        if rng.random() < 0.35:
            alternate_distance_km = round(float(rng.integers(40, 380)), 1)

        taxi = TAXI[ac["type_key"]]
        predicted_min, gs = ete_minutes(dist, cruise_eff, avg_wind, sev, taxi)
        # actual = rumus yang sama (data historis "benar"). Delay = 0 kecuali badai/lanud critical
        extra = 0.0
        if sev >= 1.25:
            extra = 12.0  # holding petir, tetap
        elif sev >= 1.15:
            extra = 6.0
        if origin["status"] == "critical" or dest["status"] == "critical":
            extra += 8.0
        actual_min = round(predicted_min + extra, 1)

        atd = etd + timedelta(minutes=5)  # slot tetap 5 menit
        ata = atd + timedelta(minutes=actual_min)
        eta_pred = etd + timedelta(minutes=predicted_min)
        delay_min = round((ata - eta_pred).total_seconds() / 60.0, 1)

        if sev >= 1.25 and extra >= 12:
            status = "Arrived"  # tetap arrived; divert jarang, biar target lengkap
        else:
            status = "Arrived"

        mtype = MISSION_TYPES[ac["type_key"]][int(rng.integers(0, len(MISSION_TYPES[ac["type_key"]])))]
        avtur = round((actual_min / 60.0) * ac["burn_lph"], 1)
        sorties = 1
        callsign = f"{ac['squadron'].split()[-1]}-{ac['tail'].split('-')[-1]}"

        rows.append(dict(
            mission_id=i,
            callsign=callsign,
            tail_number=ac["tail"],
            aircraft_id=ac["id"],
            aircraft_type=ac["type_name"],
            type_key=ac["type_key"],
            squadron=ac["squadron"],
            mission_type=mtype,
            origin_id=origin["id"],
            origin_icao=origin["icao"],
            origin_code=origin["code"],
            origin_name=origin["name"],
            origin_kodau=origin["kodau"],
            origin_tipe=origin["tipe"],
            origin_lat=origin["lat"],
            origin_lon=origin["lon"],
            dest_id=dest["id"],
            dest_icao=dest["icao"],
            dest_code=dest["code"],
            dest_name=dest["name"],
            dest_kodau=dest["kodau"],
            dest_tipe=dest["tipe"],
            dest_lat=dest["lat"],
            dest_lon=dest["lon"],
            distance_km=round(dist, 1),
            cruise_speed_kmh=ac["cruise_speed_kmh"],
            ground_speed_kmh=gs,
            taxi_min=taxi,
            etd=fmt(etd),
            atd=fmt(atd),
            eta_predicted=fmt(eta_pred),
            ata=fmt(ata),
            predicted_duration_minutes=predicted_min,
            actual_duration_minutes=actual_min,
            delay_minutes=delay_min,
            origin_weather_code=o_code,
            origin_weather=o_label,
            origin_temp_c=o_temp,
            origin_wind_kmh=o_wind,
            origin_visibility_m=o_vis,
            origin_wind_direction_deg=o_wdir,
            origin_cloudcover_pct=o_cloud,
            dest_weather_code=d_code,
            dest_weather=d_label,
            dest_temp_c=d_temp,
            dest_wind_kmh=d_wind,
            dest_visibility_m=d_vis,
            dest_wind_direction_deg=d_wdir,
            dest_cloudcover_pct=d_cloud,
            avg_wind_kmh=avg_wind,
            weather_severity=sev,
            payload_kg=payload_kg,
            payload_capacity_kg=cap,
            payload_ratio=payload_ratio,
            flight_level=flight_level,
            cruise_effective_kmh=round(cruise_eff, 1),
            alternate_distance_km=alternate_distance_km,
            avtur_consumed_liters=avtur,
            status=status,
            year=etd.year,
            quarter=(etd.month - 1) // 3 + 1,
            month=etd.month,
            day=etd.day,
            hour=etd.hour,
            weekday=etd.weekday() + 1,
        ))
        fact_rows.append(dict(
            id=i,
            time_id=int(etd.strftime("%Y%m%d")),
            aircraft_id=ac["id"],
            airbase_id=origin["id"],
            dest_airbase_id=dest["id"],
            maintenance_status_id=1,
            flight_hours_logged=round(actual_min / 60.0, 3),
            sorties_count=sorties,
            fuel_consumed_liters=avtur,
            distance_km=round(dist, 1),
            delay_minutes=delay_min,
        ))

    df_missions = pd.DataFrame(rows)
    df_fact = pd.DataFrame(fact_rows)

    dates = pd.date_range("2024-01-01", "2026-08-31", freq="D")
    df_time = pd.DataFrame({
        "id": dates.strftime("%Y%m%d").astype(int),
        "date": dates.strftime("%Y-%m-%d"),
        "year": dates.year,
        "quarter": dates.quarter,
        "month": dates.month,
        "day": dates.day,
        "day_of_week": dates.weekday + 1,
        "is_weekend": (dates.weekday >= 5).astype(int),
    })

    bottleneck_rows = []
    for j in range(800):
        hours = float(np.clip(40 + (j * 47) % 380, 40, 420))
        trucks = 1 + (j * 3) % 10
        forks = 1 + (j * 2) % 6
        deployed = 2 + (j * 5) % 8
        score = int(hours >= 280) + int(trucks < deployed / 2) + int(forks < 2) + int(deployed >= 7 and trucks <= 3)
        y = 1 if score >= 2 else 0
        bottleneck_rows.append(dict(
            sample_id=j + 1,
            avg_flight_hours=round(hours, 1),
            refueler_trucks=trucks,
            forklifts=forks,
            deployed_aircraft=deployed,
            is_critical=y,
        ))
    df_bn = pd.DataFrame(bottleneck_rows)

    train = df_missions[df_missions["status"] == "Arrived"].copy()

    df_airbase.to_csv(OUT / "dim_airbase.csv", index=False)
    df_aircraft.to_csv(OUT / "dim_aircraft.csv", index=False)
    df_maint.to_csv(OUT / "dim_maintenance_status.csv", index=False)
    df_time.to_csv(OUT / "dim_time.csv", index=False)
    df_fact.to_csv(OUT / "fact_operations_log.csv", index=False)
    df_missions.to_csv(OUT / "flight_missions_full.csv", index=False)
    train.to_csv(OUT / "flight_missions_train.csv", index=False)
    df_bn.to_csv(OUT / "bottleneck_train.csv", index=False)
    df_cat.to_csv(OUT / "route_ete_catalog.csv", index=False)

    # sanity: IWJ-RSA F-16 distance ~1325, duration ~ dist/850*60
    d_iwj_rsa = haversine_km(-7.6161, 111.4339, 3.9089, 108.3881)
    print("wrote", OUT)
    print("lanud", len(AIRBASES), "kodau", df_airbase.groupby("kodau").size().to_dict())
    print("catalog routes", len(df_cat), "missions", len(df_missions), "train", len(train))
    print("types", train["type_key"].value_counts().to_dict())
    print("dest coverage", train["dest_code"].nunique(), "/", len(AIRBASES))
    print("routes top")
    print((train["origin_code"] + "-" + train["dest_code"]).value_counts().head(10).to_string())
    print("IWJ-RSA haversine", round(d_iwj_rsa, 1), "km  F-16 VFR ETE",
          round(d_iwj_rsa / 850 * 60 + 6, 1), "min")
    print("duration min/median/max",
          train["actual_duration_minutes"].min(),
          train["actual_duration_minutes"].median(),
          train["actual_duration_minutes"].max())
    print("delay mean", round(train["delay_minutes"].mean(), 2))
    # cek 1 rute katalog vs rumus
    sample = df_cat[(df_cat["origin_code"] == "IWJ") & (df_cat["dest_code"] == "RSA")].head(1)
    if len(sample):
        print("catalog IWJ-RSA", sample[["tail_number", "distance_km", "ete_minutes", "eta_example"]].to_string(index=False))


if __name__ == "__main__":
    main()
