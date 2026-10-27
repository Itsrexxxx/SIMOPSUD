"""Sinkronisasi daftar resmi Pangkalan TNI AU (Lanud) ke tabel air_bases.

Sumber daftar: STAF OPERASI Mabes AU — KODAU I/II/III (ex-KOOPSAU) + KODIKLATAU (termasuk
lanud perwakilan). Koordinat/elevasi/panjang landasan disalin dari OurAirports
(airports.csv + runways.csv); entri tanpa data OurAirports dibiarkan None.

Idempotent: dipanggil ulang akan meng-update baris yang sudah ada, bukan duplikat.
Logistik (avtur, refueler, apron, dll) TIDAK disentuh — hanya identitas lanud.
Baris lama yang tidak ada di daftar resmi dinonaktifkan (is_active=0), tidak dihapus
(aman terhadap FK unit pesawat / misi).

Pakai: DRY=1 python scripts/sync_lanud.py   # lihat rencana tanpa tulis
       python scripts/sync_lanud.py          # tulis ke DB
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal  # noqa: E402
from app.models.airbase import AirBase  # noqa: E402

# (kodau, tipe, code, name, location, icao, iata, lat, lon, elev_m, runway_m)
DATA = [
    ('Kodau I', 'A', 'HLM', 'Lanud Halim Perdanakusuma', 'Jakarta', 'WIHH', 'HLP', -6.26699, 106.89032, 26, 3000),
    ('Kodau I', 'A', 'ATS', 'Lanud Atang Sanjaya', 'Bogor', 'WIAJ', '', -6.53882, 106.75547, 164, None),
    ('Kodau I', 'A', 'RSN', 'Lanud Roesmin Nurjadin', 'Pekanbaru', 'WIBB', 'PKU', 0.45865, 101.44432, 31, 2243),
    ('Kodau I', 'A', 'SPO', 'Lanud Supadio', 'Pontianak', 'WIOO', 'PNK', -0.15226, 109.40449, 3, 2600),
    ('Kodau I', 'A', 'SDM', 'Lanud Suryadarma', 'Kalijati, Subang', 'WIIK', '', -6.53139, 107.659, 110, None),
    ('Kodau I', 'B', 'HSN', 'Lanud Husein Sastranegara', 'Bandung', 'WICC', 'BDO', -6.90063, 107.576, 742, 2250),
    ('Kodau I', 'B', 'SWO', 'Lanud Soewondo', 'Medan', 'WIMK', 'MES', 3.55843, 98.67227, 35, 2900),
    ('Kodau I', 'B', 'SIM', 'Lanud Sultan Iskandar Muda', 'Banda Aceh', 'WITT', 'BTJ', 5.52509, 95.41997, 20, 3000),
    ('Kodau I', 'B', 'SMH', 'Lanud Sri Mulyono Herlambang', 'Palembang', 'WIPP', 'PLM', -2.89765, 104.69815, 15, 2500),
    ('Kodau I', 'B', 'RSA', 'Lanud Raden Sadjad', 'Ranai, Natuna', 'WION', 'NTX', 3.90871, 108.388, 2, 2563),
    ('Kodau I', 'B', 'SUT', 'Lanud Sutan Sjahrir', 'Parupuk Tabing, Padang', 'WIMG', 'PDG', -0.87499, 100.352, 3, 2146),
    ('Kodau I', 'C', 'MUS', 'Lanud Maimun Saleh', 'Sabang, Aceh', 'WITN', 'SBG', 5.87467, 95.33967, 120, 1844),
    ('Kodau I', 'C', 'ASH', 'Lanud H.A.S. Hanandjoeddin', 'Tanjung Pandan, Belitung', 'WIOD', 'TJQ', -2.74411, 107.75454, 50, 2500),
    ('Kodau I', 'C', 'RHF', 'Lanud Raja Haji Fisabilillah', 'Tanjung Pinang, Bintan', 'WIDN', 'TNJ', 0.92397, 104.53341, 16, 2249),
    ('Kodau I', 'C', 'WIR', 'Lanud Wiriadinata', 'Tasikmalaya', 'WICM', 'TSY', -7.34797, 108.247, 350, 1094),
    ('Kodau I', 'C', 'BNY', 'Lanud Pangeran M. Bun Yamin', 'Bandar Lampung', 'WILL', 'TKG', -5.2468, 105.18253, 86, 2770),
    ('Kodau I', 'C', 'HAD', 'Lanud Harry Hadisumantry', 'Bange, Sanggau Ledo, Bengkayang', '', '', 1.07568, 109.688, 84, 900),
    ('Kodau I', 'C', 'SKI', 'Lanud Sugiri Sukani', 'Kertajati, Majalengka', 'WICA', 'KJT', -6.64738, 108.16556, 41, 3000),
    ('Kodau I', 'C', 'SUD', 'Lanud Jenderal Besar Soedirman', 'Purbalingga', 'WAHP', 'PWL', -7.46124, 109.41412, 69, 1600),
    ('Kodau I', 'Perwakilan', 'SBG', 'Lanud Sibolga', 'Sibolga (Perwakilan Lanud Soewondo)', 'WIMS', 'FLZ', 1.55713, 98.88715, 10, 1724),
    ('Kodau I', 'Perwakilan', 'LSE', 'Lanud Lhokseumawe', 'Lhokseumawe (Perwakilan Lanud Sultan Iskandar Muda)', 'WIMA', 'LSW', 5.22668, 96.9503, 27, 1850),
    ('Kodau I', 'Perwakilan', 'BTM', 'Lanud Batam', 'Batam (Perwakilan Lanud Raja Haji Fisabilillah)', 'WIDD', 'BTH', 1.12103, 104.119, 38, 4029),
    ('Kodau I', 'Perwakilan', 'MIA', 'Lanud Minangkabau', 'Katapiang, Padang (Perwakilan Lanud Sutan Sjahrir)', 'WIPT', 'PDG', -0.78596, 100.28038, 5, 3000),
    ('Kodau I', 'Perwakilan', 'RDI', 'Lanud Radin Inten II', 'Bandar Lampung (Perwakilan Lanud Pangeran M. Bun Yamin)', '', 'TKG', -5.2468, 105.18253, 86, 2770),
    ('Kodau I', 'Perwakilan', 'SKI', 'Lanud Cirebon', 'Penggung, Cirebon (Perwakilan Lanud Sugiri Sukani)', 'WICD', 'CBN', -6.757, 108.53885, 27, 1259),
    ('Kodau II', 'A', 'IWJ', 'Lanud Iswahjudi', 'Magetan, Jawa Timur', 'WARI', '', -7.61577, 111.434, 110, 3057),
    ('Kodau II', 'A', 'ABD', 'Lanud Abdulrachman Saleh', 'Malang', 'WARA', 'MLG', -7.9291, 112.71423, 526, 2500),
    ('Kodau II', 'A', 'HND', 'Lanud Sultan Hasanuddin', 'Makassar', 'WAAA', 'UPG', -5.07554, 119.5537, 14, 3100),
    ('Kodau II', 'B', 'MUL', 'Lanud Muljono', 'Juanda, Sidoarjo', 'WARR', 'SUB', -7.37983, 112.787, 3, 3000),
    ('Kodau II', 'B', 'DMB', 'Lanud Dhomber', 'Sepinggan, Balikpapan', 'WALL', 'BPN', -1.26834, 116.89452, 4, 2500),
    ('Kodau II', 'B', 'SRI', 'Lanud Sam Ratulangi', 'Manado', 'WAMM', 'MDC', 1.54859, 124.92625, 80, 2650),
    ('Kodau II', 'B', 'ZAM', 'Lanud TGH M. Zainuddin Abdul Madjid', 'Rembiga, Mataram', 'WADA', 'AMI', -8.56056, 116.0951, 16, 2089),
    ('Kodau II', 'B', 'ANB', 'Lanud Anang Busra', 'Tarakan', 'WAQQ', 'TRK', 3.32515, 117.56417, 7, 2250),
    ('Kodau II', 'B', 'RAI', 'Lanud I Gusti Ngurah Rai', 'Kuta, Badung, Bali', 'WADD', 'DPS', -8.74841, 115.16712, 4, 2984),
    ('Kodau II', 'C', 'SAM', 'Lanud Sjamsudin Noor', 'Banjarbaru', 'WAOO', 'BDJ', -3.44011, 114.76121, 20, 2500),
    ('Kodau II', 'C', 'HLO', 'Lanud Haluoleo', 'Kendari', 'WAWW', 'KDI', -4.08161, 122.418, 164, 2100),
    ('Kodau II', 'C', 'IKR', 'Lanud Iskandar', 'Pangkalan Bun', 'WAOI', 'PKN', -2.7052, 111.673, 23, 1650),
    ('Kodau II', 'Perwakilan', 'PALU', 'Lanud Palu', 'Palu (Perwakilan Lanud Sultan Hasanuddin)', 'WAFF', 'PLW', -0.91646, 119.90865, 87, 2067),
    ('Kodau II', 'Perwakilan', 'BIL', 'Lanud Lombok', 'Pujut, Lombok Tengah (Perwakilan Lanud ZAM)', 'WADL', 'LOP', -8.75996, 116.27817, 97, 3300),
    ('Kodau II', 'Perwakilan', 'JAL', 'Lanud Gorontalo', 'Gorontalo (Perwakilan Lanud Sam Ratulangi)', 'WAMG', 'GTO', 0.63712, 122.85, 32, 2500),
    ('Kodau II', 'Perwakilan', 'PLK', 'Lanud Palangkaraya', 'Palangkaraya (Perwakilan Lanud Iskandar)', 'WAGG', 'PKY', -2.22715, 113.94339, 25, 2500),
    ('Kodau III', 'A', 'SPR', 'Lanud Silas Papare', 'Sentani, Jayapura', 'WAJJ', 'DJJ', -2.57963, 140.51986, 88, 3000),
    ('Kodau III', 'A', 'MNA', 'Lanud Manuhua', 'Biak', '', '', -1.17304, 136.08118, 10, None),
    ('Kodau III', 'B', 'DMA', 'Lanud Johannes Abraham Dimara', 'Merauke', 'WAKK', 'MKQ', -8.5239, 140.41969, 3, 1850),
    ('Kodau III', 'B', 'PTM', 'Lanud Pattimura', 'Ambon', 'WAPP', 'AMQ', -3.71026, 128.089, 10, 2500),
    ('Kodau III', 'B', 'LWM', 'Lanud Leo Wattimena', 'Pitu, Morotai', 'WAEW', 'OTI', 2.04599, 128.325, 15, 2402),
    ('Kodau III', 'B', 'ELI', 'Lanud El Tari', 'Kupang', 'WATT', 'KOE', -10.1716, 123.671, 102, 2500),
    ('Kodau III', 'C', 'DMN', 'Lanud Duma Tubun', 'Langgur, Tual', 'WAPL', '', -5.66162, 132.731, 3, 1300),
    ('Kodau III', 'C', 'YKU', 'Lanud Yohanis Kapiyau', 'Timika', 'WABP', 'TIM', -4.52978, 136.88739, 31, 2390),
    ('Kodau III', 'Perwakilan', 'WMA', 'Lanud Wamena', 'Wamena (Perwakilan Lanud Silas Papare)', 'WAVV', 'WMX', -4.09732, 138.95242, 1657, 2175),
    ('Kodau III', 'Perwakilan', 'SRO', 'Lanud Sorong', 'Sorong (Perwakilan Lanud Manuhua)', 'WASS', 'SOQ', -0.894, 131.287, 3, 1850),
    ('Kodau III', 'Perwakilan', 'TEE', 'Lanud Ternate', 'Ternate (Perwakilan Lanud Leo Wattimena)', 'WAEE', 'TTE', 0.83101, 127.38161, 15, 1791),
    ('Kodau III', 'Perwakilan', 'MME', 'Lanud Maumere', 'Waioti, Sikka (Perwakilan Lanud El Tari)', 'WATC', 'MOF', -8.63951, 122.23813, 35, 1823),
    ('Kodiklatau', 'A', 'ADI', 'Lanud Adisutjipto', 'Yogyakarta', 'WAHH', 'JOG', -7.78818, 110.432, 116, 2199),
    ('Kodiklatau', 'B', 'SMO', 'Lanud Adi Soemarmo', 'Surakarta', 'WAHQ', 'SOC', -7.51604, 110.75749, 128, 2600),
    ('Kodiklatau', 'B', 'SLM', 'Lanud Sulaiman', 'Margahayu, Bandung', 'WIAK', '', -6.98278, 107.573, 666, None),
]

# kode lama di DB -> kode baru di DATA (lanud yang berganti kode setelah daftar resmi)
ALIAS = {
    'RSD': 'RSA', 'HLP': 'HLM', 'ASM': 'SMO', 'SHS': 'HND', 'SMR': 'SRI',
    'IGN': 'RAI', 'ELT': 'ELI', 'MNH': 'MNA', 'SLP': 'SPR', 'YKP': 'YKU',
    'JAD': 'DMA', 'KDI': 'HLO', 'TTE': 'TEE',
}

FIELDS = ('kodau', 'tipe', 'code', 'name', 'location', 'icao', 'iata', 'latitude', 'longitude', 'elev_m', 'runway_m')


def main():
    dry = bool(os.environ.get('DRY'))
    db = SessionLocal()
    try:
        rows = db.query(AirBase).all()
        by_code = {(r.code or '').upper(): r for r in rows}
        by_icao = {(r.icao or '').upper(): r for r in rows if r.icao}
        by_name = {r.name.strip().lower(): r for r in rows}
        # kode lanud tidak unik (mis. SKI dipakai Lanud Sugiri Sukani & Lanud Cirebon),
        # jadi cocokkan per ICAO/nama dulu; kode hanya dipakai kalau unik di DATA
        counts = {}
        for e in DATA:
            counts[e[2]] = counts.get(e[2], 0) + 1
        unique_codes = {c for c, n in counts.items() if n == 1}
        used, created, updated, deactivated = set(), 0, 0, 0

        for entry in DATA:
            kodau, tipe, code, name, loc, icao, iata, lat, lon, elev, rwy = entry
            target = by_icao.get(icao.upper()) if icao else None
            if target is None:
                target = by_name.get(name.strip().lower())
            if target is None and code in ALIAS:
                target = by_code.get(ALIAS[code])
            if target is None and code in unique_codes:
                target = by_code.get(code)
            if target is None:
                target = AirBase(name=name)
                db.add(target)
                created += 1
                action = 'create'
            else:
                used.add(target.id)
                action = None
                updated += 1
            new = dict(zip(FIELDS, (kodau, tipe, code, name, loc, icao or None, iata or None, lat, lon, elev, rwy)))
            changed = [k for k, v in new.items() if v is not None and getattr(target, k, None) != v]
            for k in changed:
                setattr(target, k, new[k])
            target.is_active = 1
            print(f"{action or 'update':<7} {code:<5} {name:<42} {('fields: ' + ','.join(changed)) if changed else ''}")

        renamed = 0
        for r in rows:
            if (r.kodau or '').startswith('Koopsau'):
                print(f"rename  {(r.code or '-'):<5} {r.name:<42} kodau: {r.kodau} -> {r.kodau.replace('Koopsau', 'Kodau')}")
                r.kodau = r.kodau.replace('Koopsau', 'Kodau')
                renamed += 1

        for r in rows:
            if r.id not in used and r.is_active:
                print(f"off     {(r.code or '-'):<5} {r.name:<42} fields: is_active=0 (tidak ada di daftar resmi)")
                r.is_active = 0
                deactivated += 1

        print(f"\ncreated={created} updated={updated} renamed={renamed} deactivated={deactivated} total_daftar={len(DATA)}")
        if dry:
            db.rollback()
            print('DRY run — rollback, tidak ada yang ditulis.')
        else:
            db.commit()
            print('COMMIT ok.')
    finally:
        db.close()


if __name__ == '__main__':
    main()