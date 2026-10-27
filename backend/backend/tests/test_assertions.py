"""1 file assert untuk _compute_status & aircraft types CRUD — ponytail: tambah coverage lain when perlu."""
import unittest, sys, os
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT); sys.path.insert(0, str(ROOT))
os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///./test_assertions.db"
import app.models  # noqa
from app.core.database import Base, SessionLocal, engine
from app.models.airbase import AirBase
from app.models.aircraft import AircraftType, AircraftUnit
from app.api.v1.endpoints.airbase import _compute_status
from app.schemas.aircraft_schema import TAIL_RE, _validate_tail

class ComputeStatusTest(unittest.TestCase):
    def _s(self, pct, trucks_active=2, trucks_count=2, apron_used=2, apron_cap=10):
        cap=100000; stock=cap*pct/100
        return str(_compute_status(stock, cap, trucks_active, trucks_count, apron_used, apron_cap)).lower()
    def test_avtur_critical(self): self.assertIn("critical", self._s(20))
    def test_avtur_warning(self): self.assertIn("warning", self._s(45))
    def test_avtur_optimal(self): self.assertIn("optimal", self._s(80))
    def test_alert_below_15_is_critical(self): self.assertIn("critical", self._s(10))
    def test_trucks_zero_critical(self): self.assertIn("critical", self._s(80, trucks_active=0, trucks_count=2))
    def test_trucks_half_warning(self): self.assertIn("warning", self._s(80, trucks_active=1, trucks_count=4))
    def test_apron_full_critical(self): self.assertIn("critical", self._s(80, apron_used=10, apron_cap=10))
    def test_apron_80_warning(self): self.assertIn("warning", self._s(80, apron_used=8, apron_cap=10))

class TailValidationTest(unittest.TestCase):
    def test_valid(self):
        self.assertEqual(_validate_tail("TS-1601"), "TS-1601")
        self.assertEqual(_validate_tail("a-1339"), "A-1339")
        self.assertEqual(_validate_tail("TS-12345"), "TS-12345")
    def test_invalid(self):
        for bad in ["bad", "TS-12", "TS-abc", "TS1601", "X-1234", "TS-123456"]:
            with self.assertRaises(ValueError): _validate_tail(bad)
    def test_regex(self):
        self.assertTrue(TAIL_RE.match("TS-1601")); self.assertTrue(TAIL_RE.match("A-1339"))
        self.assertIsNone(TAIL_RE.match("TS-12"))

class EscapeLikeTest(unittest.TestCase):
    def test_escape(self):
        from app.api.v1.endpoints.aircraft import _escape_like as esc
        self.assertEqual(esc("a%b_c\\d"), "a\\%b\\_c\\\\d")
        self.assertEqual(esc("normal"), "normal")

class AircraftTypeCRUDTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.drop_all(bind=engine); Base.metadata.create_all(bind=engine)
    @classmethod
    def tearDownClass(cls): Base.metadata.drop_all(bind=engine)
    def setUp(self):
        self.db=SessionLocal()
        self.db.query(AircraftUnit).delete(); self.db.query(AircraftType).delete(); self.db.query(AirBase).delete(); self.db.commit()
    def tearDown(self): self.db.close()
    def test_create_and_duplicate_409(self):
        from app.schemas.aircraft_schema import AircraftTypeCreate
        from app.api.v1.endpoints.aircraft import create_aircraft_type
        from fastapi import Request
        from unittest.mock import MagicMock
        req=MagicMock(spec=Request); req.client=MagicMock(); req.client.host="127.0.0.1"; req.headers={}
        user=MagicMock(); user.id=1
        item=AircraftTypeCreate(name="F-16 Test", description="x", cruise_speed_kmh=850, fuel_burn_lph=2900, max_range_km=4200, payload_capacity_kg=7700)
        r=create_aircraft_type(item, req, self.db, user)
        self.assertEqual(r.name, "F-16 Test")
        with self.assertRaises(Exception) as cm:
            create_aircraft_type(item, req, self.db, user)
        self.assertIn("409", str(cm.exception.status_code) if hasattr(cm.exception,"status_code") else str(cm.exception))
    def test_delete_blocked_when_used(self):
        from app.api.v1.endpoints.aircraft import delete_aircraft_type, create_aircraft_type
        from app.schemas.aircraft_schema import AircraftTypeCreate
        from unittest.mock import MagicMock
        from fastapi import Request
        req=MagicMock(spec=Request); req.client=MagicMock(); req.client.host="127.0.0.1"; req.headers={}
        user=MagicMock(); user.id=1
        typ=create_aircraft_type(AircraftTypeCreate(name="T-50 Test", cruise_speed_kmh=750, fuel_burn_lph=1800, max_range_km=1850, payload_capacity_kg=4500), req, self.db, user)
        self.db.add(AircraftUnit(tail_number="TS-9999", aircraft_type_id=typ.id, accumulated_flight_hours=0, status="S")); self.db.commit()
        with self.assertRaises(Exception) as cm:
            delete_aircraft_type(typ.id, req, self.db, user)
        self.assertEqual(cm.exception.status_code, 409)
    def test_create_requires_specs(self):
        from pydantic import ValidationError
        from app.schemas.aircraft_schema import AircraftTypeCreate
        with self.assertRaises(ValidationError):
            AircraftTypeCreate(name="Tanpa Spek")
        with self.assertRaises(ValidationError):
            AircraftTypeCreate(name="Spek Nol", cruise_speed_kmh=0, fuel_burn_lph=2200, max_range_km=2000, payload_capacity_kg=5000)
    def test_tail_create_rejects_bad_format(self):
        from pydantic import ValidationError
        from app.schemas.aircraft_schema import AircraftUnitCreate
        with self.assertRaises(ValidationError):
            AircraftUnitCreate(tail_number="BAD-12", aircraft_type_id=1)

if __name__=="__main__": unittest.main(verbosity=2)
