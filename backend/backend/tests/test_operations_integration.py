import os
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
sys.path.insert(0, str(ROOT))
os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///./test_operations_integration.db"

import app.models  # noqa: F401, E402
from fastapi import HTTPException  # noqa: E402
from app.api.deps import require_permissions  # noqa: E402
from app.api.v1.endpoints import dashboard, flight_missions as fm, situational_overview  # noqa: E402
from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.models.airbase import AirBase  # noqa: E402
from app.models.airbase_avtur_log import AirbaseAvturLog  # noqa: E402
from app.models.aircraft import AircraftType, AircraftUnit  # noqa: E402
from app.models.flight_mission import FlightMission, FlightMissionStatus  # noqa: E402


class OperationsIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    @classmethod
    def tearDownClass(cls):
        Base.metadata.drop_all(bind=engine)

    def setUp(self):
        self.db = SessionLocal()
        self.db.query(AirbaseAvturLog).delete()
        self.db.query(FlightMission).delete()
        self.db.query(AircraftUnit).delete()
        self.db.query(AircraftType).delete()
        self.db.query(AirBase).delete()
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_situational_overview_empty_database(self):
        result = situational_overview.get_tracks(db=self.db, status="In-Flight", airbase_id=None, q=None)
        self.assertEqual(result["airbases"], [])
        self.assertEqual(result["tracks"], [])
        self.assertEqual(result["telemetry"]["mode"], "hybrid")

    def test_situational_overview_includes_zero_zero_airbase_without_crash(self):
        zero = AirBase(name="Lanud Zero", location="Z", code="ZERO", latitude=0, longitude=0)
        normal = AirBase(name="Lanud Normal", location="N", code="NORM", latitude=-6.2, longitude=106.8)
        self.db.add_all([zero, normal])
        self.db.commit()

        result = situational_overview.get_tracks(db=self.db, status="In-Flight", airbase_id=None, q=None)
        payload = {item["name"]: item for item in result["airbases"]}
        self.assertEqual(payload["Lanud Zero"]["lat"], 0)
        self.assertEqual(payload["Lanud Zero"]["lon"], 0)
        self.assertEqual(result["tracks"], [])

    def test_situational_overview_returns_inflight_track_and_markers(self):
        typ = AircraftType(name="Integration Type", cruise_speed_kmh=700)
        origin = AirBase(name="Lanud Origin", location="O", code="ORIG", latitude=-6.2, longitude=106.8)
        dest = AirBase(name="Lanud Destination", location="D", code="DEST", latitude=-7.2, longitude=107.8)
        aircraft = AircraftUnit(tail_number="INT-001", aircraft_type=typ, airbase=origin, status="S")
        self.db.add_all([typ, origin, dest, aircraft])
        self.db.commit()
        mission = FlightMission(
            aircraft_id=aircraft.id,
            origin_base_id=origin.id,
            destination_base_id=dest.id,
            actual_departure=datetime.now(timezone.utc),
            predicted_duration_minutes=60,
            predicted_arrival=datetime.now(timezone.utc),
            status=FlightMissionStatus.IN_FLIGHT,
        )
        self.db.add(mission)
        self.db.commit()

        result = situational_overview.get_tracks(db=self.db, status="In-Flight", airbase_id=None, q=None)
        self.assertEqual(len(result["airbases"]), 2)
        self.assertEqual(len(result["tracks"]), 1)
        self.assertEqual(result["tracks"][0]["status"], "In-Flight")
        self.assertEqual(result["tracks"][0]["tail_number"], "INT-001")

    def test_dashboard_permission_denied_without_dashboard_permission(self):
        dependency = require_permissions("dashboard")
        with self.assertRaises(HTTPException) as ctx:
            dependency(SimpleNamespace(role="Analyst", permissions=["missions"]))
        self.assertEqual(ctx.exception.status_code, 403)

    def test_dashboard_permission_allows_dashboard_permission_and_admin(self):
        dependency = require_permissions("dashboard")
        analyst = SimpleNamespace(role="Analyst", permissions=["dashboard"])
        admin = SimpleNamespace(role="Administrator", permissions=[])
        self.assertIs(dependency(analyst), analyst)
        self.assertIs(dependency(admin), admin)

    def test_dashboard_summary_empty_database_is_zero_safe(self):
        result = dashboard.read_dashboard_summary(db=self.db)
        self.assertEqual(result["aircraft"]["total"], 0)
        self.assertEqual(result["airbases"]["total"], 0)
        self.assertEqual(result["missions"]["total"], 0)
        self.assertEqual(result["aircraft"]["readiness_percent"], 0)

    def test_dashboard_status_derived_matches_aircraft_module(self):
        """Kolom status warisan (READY/MAINTENANCE) tidak boleh membuat dashboard melaporkan 0 siap."""
        base = AirBase(name="Lanud Legacy", location="L")
        typ = AircraftType(name="Legacy Type")
        self.db.add_all([base, typ])
        self.db.commit()
        self.db.add_all([
            AircraftUnit(tail_number="LEG-001", aircraft_type=typ, airbase=base, status="READY", accumulated_flight_hours=100),
            AircraftUnit(tail_number="LEG-002", aircraft_type=typ, airbase=base, status="MANDATORY_GROUNDING", squawk_discrepancy="hidrolik bocor"),
        ])
        self.db.commit()

        result = dashboard.read_dashboard_summary(db=self.db)
        self.assertEqual(result["aircraft"]["total"], 2)
        self.assertEqual(result["aircraft"]["ready"], 1)
        self.assertEqual(result["aircraft"]["readiness_percent"], 50.0)
        self.assertEqual(result["aircraft"]["per_airbase"][0]["ready"], 1)
        self.assertEqual({row["status"] for row in result["aircraft"]["top_hours"]}, {"S", "U/S"})

        from app.api.v1.endpoints import aircraft as aircraft_endpoint
        module_stats = aircraft_endpoint.read_aircraft_stats(db=self.db)
        self.assertEqual(result["aircraft"]["ready"], module_stats["serviceable"])
        self.assertEqual(result["aircraft"]["unserviceable"], module_stats["unserviceable"])

    def test_dashboard_ignores_inactive_airbase(self):
        """Lanud nonaktif tidak boleh menambah total/critical/fuel_risk maupun alert."""
        active = AirBase(name="Lanud Aktif", location="A", avtur_capacity_liters=1000, avtur_stock_liters=800)
        inactive = AirBase(name="Lanud Nonaktif", location="N", avtur_capacity_liters=1000, avtur_stock_liters=50, is_active=0)
        self.db.add_all([active, inactive])
        self.db.commit()

        result = dashboard.read_dashboard_summary(db=self.db)
        self.assertEqual(result["airbases"]["total"], 1)
        self.assertEqual(result["airbases"]["critical"], 0)
        self.assertEqual(result["airbases"]["fuel_risk"], 0)
        self.assertNotIn("Lanud Nonaktif", [row["name"] for row in result["airbases"]["rows"]])
        self.assertNotIn("Lanud Nonaktif", [row["name"] for row in result["aircraft"]["per_airbase"]])
        self.assertFalse(any("Nonaktif" in alert["title"] for alert in result["alerts"]))

    def test_avtur_consumption_is_idempotent(self):
        origin = AirBase(name="Lanud Fuel", location="F", avtur_capacity_liters=1000, avtur_stock_liters=1000)
        dest = AirBase(name="Lanud Fuel Dest", location="D")
        typ = AircraftType(name="Fuel Type")
        aircraft = AircraftUnit(tail_number="FUEL-001", aircraft_type=typ, airbase=origin)
        self.db.add_all([origin, dest, typ, aircraft])
        self.db.commit()
        mission = FlightMission(
            aircraft_id=aircraft.id,
            origin_base_id=origin.id,
            destination_base_id=dest.id,
            predicted_duration_minutes=30,
            total_fuel_liters=250,
            status=FlightMissionStatus.IN_FLIGHT,
        )
        self.db.add(mission)
        self.db.commit()

        fm._deduct_avtur_for_mission(self.db, mission)
        self.db.commit()
        fm._deduct_avtur_for_mission(self.db, mission)
        self.db.commit()

        self.assertEqual(self.db.get(AirBase, origin.id).avtur_stock_liters, 750)
        self.assertEqual(self.db.query(AirbaseAvturLog).filter(AirbaseAvturLog.mission_id == mission.id).count(), 1)


if __name__ == "__main__":
    unittest.main(verbosity=2)
