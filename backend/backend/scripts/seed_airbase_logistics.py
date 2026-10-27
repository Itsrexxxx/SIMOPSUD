"""Seed logistik lanud (avtur, apron, refueler, forklift, pelumas) yang masih kosong.

Nilai simulasi deterministik per lanud: dipilih dari rentang berdasarkan tipe lanud
(A/B/C/Perwakilan) memakai CRC32 kode lanud sebagai seed, jadi hasilnya stabil
walau script dijalankan berulang. Hanya kolom yang masih 0/None yang diisi —
nilai yang sudah ada (mis. hasil init_sample_data.py) tidak ditimpa.

Pakai: DRY=1 python scripts/seed_airbase_logistics.py
       python scripts/seed_airbase_logistics.py
"""
import os
import sys
import zlib

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal  # noqa: E402
from app.models.airbase import AirBase  # noqa: E402
from app.models.aircraft import AircraftUnit  # noqa: E402

# tipe -> (kapasitas avtur L, stok % min-max, truk refueler min-max, apron min-max, forklift, pelumas L)
TIER = {
    'A': (2_000_000, (55, 85), (6, 8), (28, 36), 3, 3000),
    'B': (1_000_000, (50, 85), (4, 6), (14, 20), 2, 1500),
    'C': (600_000, (45, 80), (3, 4), (8, 12), 1, 900),
    'Perwakilan': (400_000, (50, 80), (2, 3), (6, 8), 1, 600),
}


def pick(code, low, high):
    """Angka stabil 0..(high-low) dari kode lanud."""
    return low + zlib.crc32(code.encode()) % (high - low + 1)


def main():
    dry = bool(os.environ.get('DRY'))
    db = SessionLocal()
    try:
        units_per_base = {}
        for u in db.query(AircraftUnit).all():
            units_per_base[u.airbase_id] = units_per_base.get(u.airbase_id, 0) + 1

        filled = 0
        for base in db.query(AirBase).filter(AirBase.is_active == 1).order_by(AirBase.code).all():
            cap_cfg, stock_cfg, truck_cfg, apron_cfg, forklift, lube = TIER.get(base.tipe, TIER['Perwakilan'])
            code = base.code or base.name
            cap = base.avtur_capacity_liters or 0
            changes = []
            if cap <= 0:
                cap = float(cap_cfg)
                changes.append(f'capacity={cap:,.0f}')
            if not base.avtur_stock_liters:
                stock = round(cap * pick(code, *stock_cfg) / 100 / 1000) * 1000
                base.avtur_stock_liters = min(stock, cap)
                changes.append(f'stock={base.avtur_stock_liters:,.0f}')
            if not base.special_lube_stock_liters:
                base.special_lube_stock_liters = float(lube)
                changes.append(f'lube={lube}')
            if not base.refueler_trucks_count:
                n = pick(code + 't', *truck_cfg)
                base.refueler_trucks_count = n
                base.refueler_trucks_active = max(1, round(n * 0.8))
                changes.append(f'truk={n} (aktif {base.refueler_trucks_active})')
            if not base.forklifts_count:
                base.forklifts_count = forklift
                changes.append(f'forklift={forklift}')
            if not base.apron_capacity_aircraft:
                base.apron_capacity_aircraft = pick(code + 'a', *apron_cfg)
                changes.append(f'apron={base.apron_capacity_aircraft}')
            if base.apron_used is None or base.apron_used == 0:
                base.apron_used = min(units_per_base.get(base.id, 0) or pick(code + 'u', 1, 3), base.apron_capacity_aircraft)
                changes.append(f'terpakai={base.apron_used}')
            if cap > 0 and not base.avtur_capacity_liters:
                base.avtur_capacity_liters = cap
            if changes:
                filled += 1
                print(f"{(base.kodau or '-'):<12} {code:<5} {base.name:<42} {' '.join(changes)}")

        print(f"\nlanud aktif diisi={filled}")
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