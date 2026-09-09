import sys; sys.path.insert(0, 'backend/backend')
from app.core.database import SessionLocal, engine
from sqlalchemy import text
from app.models.airbase import AirBase

# Data user: 42 Lanud Kodau I/II/III + koordinat desimal (lat,lon) exact
# Untuk runway/elev/icao/code/tipe ambil dari generator bila ada, fallback default
DATA = [
    # Kodau I 19
    ("Halim Perdanakusuma","Kodau I",-6.2644,106.8958,"WIHH","HLM","A",3000,25,"Jakarta Timur"),
    ("Atang Sendjaja","Kodau I",-6.5497,106.7511,"WIAJ","ATS","A",1400,164,"Bogor, Jawa Barat"),
    ("Suryadarma","Kodau I",-6.5314,107.6592,"WIHK","SDM","A",1600,110,"Subang, Jawa Barat"),
    ("Roesmin Nurjadin","Kodau I",0.4616,101.4461,"WIBB","RSN","A",2600,31,"Pekanbaru, Riau"),
    ("Supadio","Kodau I",-0.1502,109.4041,"WIOO","SPO","A",2250,3,"Pontianak, Kalimantan Barat"),
    ("Soewondo","Kodau I",3.5577,98.6713,"WIMK","SWD","B",2900,28,"Medan, Sumatra Utara"),
    ("Husein Sastranegara","Kodau I",-6.9005,107.5763,"WICC","HSN","B",2249,743,"Bandung, Jawa Barat"),
    ("Sultan Iskandar Muda","Kodau I",5.5233,95.4202,"WITT","SIM","B",3000,20,"Aceh Besar, Aceh"),
    ("Maimun Saleh","Kodau I",5.8725,95.3397,"WITN","MMS","C",1850,126,"Sabang, Aceh"),
    ("Sutan Sjahrir","Kodau I",-0.9186,100.3536,"WIMG","SSR","B",2150,3,"Padang, Sumatra Barat"),
    ("Sri Mulyono Herlambang","Kodau I",-2.8986,104.7019,"WIPP","SMH","B",3000,11,"Palembang, Sumatra Selatan"),
    ("Raden Sadjad","Kodau I",3.9413,108.3916,"WION","RSA","B",2560,2,"Natuna, Kepulauan Riau"),
    ("Raja Haji Fisabilillah","Kodau I",0.9231,104.5306,"WIDN","RHF","B",2250,16,"Tanjungpinang, Kepri"),
    ("Hang Nadim","Kodau I",1.1208,104.1186,"WIDD","HNDM","C",4025,38,"Batam, Kepulauan Riau"),
    ("H. AS. Hanandjoeddin","Kodau I",-2.7455,107.7550,"WIOD","HAS","C",2500,50,"Tanjung Pandan, Belitung"),
    ("Pangeran M. Bun Yamin","Kodau I",-4.5016,105.1950,"WIAG","PBY","C",1600,19,"Tulang Bawang, Lampung"),
    ("Sugiri Sukani","Kodau I",-6.6686,108.2186,"","SGS","C",1200,50,"Majalengka, Jawa Barat"),
    ("Wiriadinata","Kodau I",-7.3561,108.2469,"WICM","WRD","C",1600,352,"Tasikmalaya, Jawa Barat"),
    ("Harry Hadisoemantri","Kodau I",0.9466,109.6533,"","HHD","C",900,45,"Bengkayang, Kalbar"),
    # Kodau II 16
    ("Sultan Hasanuddin","Kodau II",-5.0755,119.5537,"WAAA","HND","A",3100,14,"Maros, Sulawesi Selatan"),
    ("Iswahjudi","Kodau II",-7.6158,111.4340,"WIAR","IWJ","A",2500,110,"Madiun/Magetan, Jatim"),
    ("Abdulrachman Saleh","Kodau II",-7.9263,112.7147,"WARA","ABD","A",2000,526,"Malang, Jawa Timur"),
    ("Adisutjipto","Kodau II",-7.7880,110.4316,"WAHH","ADI","A",2200,107,"Sleman, DI Yogyakarta"),
    ("Adi Soemarmo","Kodau II",-7.5161,110.7569,"WARQ","ASM","A",2600,128,"Boyolali, Jawa Tengah"),
    ("Sulaiman","Kodau II",-6.9836,107.5922,"WIBY","SLM","A",2249,683,"Bandung, Jawa Barat"),  # Lanud Sulaiman Margahayu
    ("Sam Ratulangi","Kodau II",1.5491,124.9263,"WAMM","SRR","A",2650,80,"Manado, Sulawesi Utara"),
    ("El Tari","Kodau II",-10.1725,123.6711,"WATT","ELT","A",2500,102,"Kupang, NTT"),
    ("Dhomber","Kodau II",-1.2686,116.8944,"WALR","DMB","A",2500,12,"Balikpapan, Kaltim"),
    ("Anang Busra","Kodau II",3.3244,117.5675,"WALR","TAR","A",1850,6,"Tarakan, Kalimantan Utara"),
    ("I Gusti Ngurah Rai","Kodau II",-8.7480,115.1675,"WADD","IGR","A",3000,4,"Badung, Bali"),
    ("Haluoleo","Kodau II",-4.0827,122.4213,"WAWW","HLO","A",2500,164,"Kendari, Sulawesi Tenggara"),
    ("Muljono","Kodau II",-7.3791,112.7802,"WARR","MUL","B",3000,9,"Surabaya, Jawa Timur"),
    ("Syamsudin Noor","Kodau II",-3.4422,114.7616,"WAOO","SJN","B",2500,20,"Banjarmasin, Kalsel"),
    ("M. Zainuddin Abdul Madjid","Kodau II",-8.5583,116.0925,"WADL","ZAM","B",2750,97,"Lombok, NTB"),
    ("Iskandar","Kodau II",-2.7050,111.6733,"WAOI","ISK","C",1650,75,"Pangkalan Bun, Kalteng"),
    # Kodau III 7
    ("Silas Papare","Kodau III",-2.5766,140.5166,"WAJJ","SLP","A",3000,88,"Jayapura, Papua"),
    ("Manuhua","Kodau III",-1.1900,136.1075,"WABB","MNH","A",3570,11,"Biak, Papua"),
    ("Johannes Abraham Dimara","Kodau III",-8.5202,140.4172,"WAKK","JAD","B",1850,3,"Merauke, Papua Selatan"),
    ("Pattimura","Kodau III",-3.7105,128.0894,"WAPP","PTM","B",2500,10,"Ambon, Maluku"),
    ("Leo Wattimena","Kodau III",2.0455,128.3294,"WAMR","LWM","B",2400,15,"Morotai, Maluku Utara"),
    ("Dominicus Dumatubun","Kodau III",-5.6600,132.7302,"WAPL","DMT","C",1650,3,"Langgur, Maluku Tenggara"),
    ("Yohanis Kapiyau","Kodau III",-4.5291,136.8858,"WAYY","YKP","B",2500,103,"Timika, Papua Tengah"),
]

# Normalisasi nama DB: "Lanud X (CODE)" -> "X"
db = SessionLocal()
try:
    # Ambil semua lanud
    rows = db.query(AirBase).all()
    # build lookup by stripped name
    def strip(n): 
        import re
        m=re.match(r"Lanud\s+(.+?)(?:\s*\(.*\))?\s*$", n)
        return m.group(1).strip() if m else n.strip()
    lookup = {strip(b.name).lower(): b for b in rows}
    # alias untuk nama berbeda
    aliases = {
        "jb soedirman": None,  # akan di-reuse jadi Sulaiman
        "j.b. soedirman": None,
        "wiriadinata": "wiriadinata",
        "husein sastranegara": "husein sastranegara",
    }
    updated=0; created=0
    for name,kodau,lat,lon,icao,code,tipe,runway,elev,loc in DATA:
        key=name.lower()
        b=lookup.get(key)
        # fallback cari dengan contains
        if not b:
            for k,v in lookup.items():
                if key in k or k in key:
                    b=v; break
        if b:
            b.latitude=lat; b.longitude=lon; b.kodau=kodau; b.icao=icao; b.code=code; b.tipe=tipe; b.runway_m=runway; b.elev_m=elev
            # perbaiki location jika lebih detail dari user
            if loc and loc not in (b.location or ""):
                pass
            updated+=1
        else:
            # buat baru (Sulaiman)
            nb=AirBase(name=f"Lanud {name} ({code})" if code else f"Lanud {name}", location=loc, latitude=lat, longitude=lon, kodau=kodau, icao=icao, code=code, tipe=tipe, runway_m=runway, elev_m=elev, status="optimal", avtur_capacity_liters=380000, avtur_stock_liters=280000, special_lube_stock_liters=2500, refueler_trucks_count=4, refueler_trucks_active=3, forklifts_count=3, apron_capacity_aircraft=12, apron_used=0)
            db.add(nb); created+=1
            print(f"CREATE {name}")
    # Handle JBS -> Sulaiman: jika masih ada JBS dan Sulaiman baru dibuat, hapus atau ubah JBS jadi Sulaiman already handled via reuse
    # Cek JBS
    jbs=None
    for b in db.query(AirBase).all():
        if "soedirman" in b.name.lower():
            jbs=b; break
    if jbs:
        # JBS tidak di user table, tapi kita pertahankan? User total 42 incl Sulaiman excl JBS -> JBS harus hapus biar tetap 42
        # Kita hapus JBS karena user tidak minta, atau ubah jadi Sulaiman jika belum ada
        sul = [b for b in db.query(AirBase).all() if "sulaiman" in b.name.lower()]
        if sul and jbs not in sul:
            # hapus JBS, sudah ada Sulaiman
            cnt = db.query(AirBase).filter(AirBase.id==jbs.id).count()
            # cek aircraft_units memakai JBS?
            from app.models.aircraft import AircraftUnit
            used = db.query(AircraftUnit).filter(AircraftUnit.airbase_id==jbs.id).count()
            if used==0:
                db.delete(jbs)
                print(f"DELETE JBS id={jbs.id}")
            else:
                # pindahkan aircraft ke Sulaiman
                for u in db.query(AircraftUnit).filter(AircraftUnit.airbase_id==jbs.id).all():
                    u.airbase_id = sul[0].id
                db.delete(jbs)
                print(f"MOVED aircraft from JBS to Sulaiman then DELETE JBS")
    db.commit()
    print(f"updated {updated} created {created} total {db.query(AirBase).count()}")
    for b in db.query(AirBase).order_by(AirBase.id).all():
        print(f"{b.id:2d} {b.name:35s} {b.kodau:9s} {b.latitude:.4f},{b.longitude:.4f} {b.code or '-':4s} {b.icao or '-'}")
finally:
    db.close()
