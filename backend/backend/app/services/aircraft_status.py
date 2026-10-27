"""Turunan status S/U/S pesawat — satu sumber untuk modul Pesawat dan Dashboard.

Kolom `aircraft_units.status` di DB masih berisi nilai warisan (READY/MAINTENANCE/
MANDATORY_GROUNDING), jadi status yang dipakai UI selalu diturunkan dari harwat.
"""
from datetime import datetime, timezone

# ponytail: nilai warisan dianggap S; normalisasi kolom DB = migrasi terpisah
_LEGACY_DEFAULT = "S"


def derived_status(unit, typ, now: datetime | None = None) -> str:
    if unit.is_manually_grounded or (unit.squawk_discrepancy or "").strip():
        return "U/S"
    if not typ:
        return unit.status if unit.status in ("S", "U/S") else _LEGACY_DEFAULT
    now = now or datetime.now(timezone.utc).replace(tzinfo=None)
    if (unit.accumulated_flight_hours or 0) >= (typ.tbo_hours or 999999):
        return "U/S"
    hs = (unit.accumulated_flight_hours or 0) - (unit.last_service_hours or 0)
    if hs >= (typ.phase_interval_hours or 300):
        return "U/S"
    if unit.last_service_date:
        lsd = unit.last_service_date
        if lsd.tzinfo is not None:
            lsd = lsd.replace(tzinfo=None)
        if (now - lsd).days >= (typ.calendar_interval_days or 60):
            return "U/S"
    return "S"
