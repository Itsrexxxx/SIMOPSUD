import os
import sys
import unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
sys.path.insert(0, str(ROOT))
os.environ["SQLALCHEMY_DATABASE_URI"] = "sqlite:///./test_flight_missions.db"

import app.models  # noqa: F401, E402
from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.models.airbase import AirBase  # noqa: E402
from app.models.aircraft import AircraftType, AircraftUnit  # noqa: E402
from app.api.v1.endpoints.aircraft import _derived_status  # noqa: E402
from app.models.flight_mission import FlightMission, FlightMissionStatus  # noqa: E402
from app.models.airbase_avtur_log import AirbaseAvturLog  # noqa: E402
from app.schemas.aircraft_schema import AircraftUnitCreate, AircraftUnitUpdate  # noqa: E402
from app.schemas.user_schema import UserCreate  # noqa: E402
from app.schemas.flight_mission_schema import (  # noqa: E402
    ETAPredictionRequest,
    FlightMissionCreate,
    FlightMissionStatusUpdate,
)
from app.services.eta_prediction_model import ETAPredictionEngine  # noqa: E402
from app.services.weather_service import calculate_haversine_distance  # noqa: E402
from app.api.v1.endpoints import flight_missions as fm  # noqa: E402
from fastapi import HTTPException  # noqa: E402


FAKE_WEATHER = {
    "temp_celsius": 28.5,
    "wind_speed_kmh": 12.0,
    "weather_condition": "Clear",
    "weather_code": 0,
    "is_realtime": False,
}


class ServiceTests(unittest.TestCase):
    def test_haversine_same_point(self):
        self.assertEqual(calculate_haversine_distance(-6.2, 106.8, -6.2, 106.8), 0.0)

    def test_haversine_jakarta_bandung(self):
        km = calculate_haversine_distance(-6.2088, 106.8456, -6.9175, 107.6191)
        self.assertGreater(km, 100)
        self.assertLess(km, 150)

    def test_eta_same_base_returns_zero(self):
        engine_eta = ETAPredictionEngine()
        result = engine_eta.predict_flight_eta(
            origin_lat=-6.2,
            origin_lon=106.8,
            dest_lat=-6.2,
            dest_lon=106.8,
            aircraft_type_name="F-16C/D Block 52",
            scheduled_departure=datetime(2026, 9, 2, 10, 0, tzinfo=timezone.utc),
            origin_weather=FAKE_WEATHER,
            dest_weather=FAKE_WEATHER,
        )
        self.assertLessEqual(result["distance_km"], 0.1)
        self.assertEqual(result["predicted_duration_minutes"], 0.0)

    def test_eta_f16_positive_duration(self):
        engine_eta = ETAPredictionEngine()
        result = engine_eta.predict_flight_eta(
            origin_lat=-6.2088,
            origin_lon=106.8456,
            dest_lat=-6.9175,
            dest_lon=107.6191,
            aircraft_type_name="F-16C/D Block 52",
            scheduled_departure=datetime(2026, 9, 2, 10, 0, tzinfo=timezone.utc),
            origin_weather=FAKE_WEATHER,
            dest_weather=FAKE_WEATHER,
        )
        self.assertGreater(result["distance_km"], 100)
        self.assertGreater(result["predicted_duration_minutes"], 0)
        self.assertGreater(result["air_time_minutes"], 10)
        self.assertIn("delay_buffer_minutes", result)
        self.assertEqual(result["cruise_speed_kmh"], 850.0)


class FlightMissionEndpointTests(unittest.TestCase):
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
        self.db.query(fm.FlightMission).delete()
        self.db.query(AircraftUnit).delete()
        self.db.query(AircraftType).delete()
        self.db.query(AirBase).delete()
        self.db.commit()
        aircraft_type = AircraftType(name="F-16C/D Block 52", description="Fighter")
        origin = AirBase(name="Lanud A", location="A", latitude=-6.2088, longitude=106.8456, avtur_capacity_liters=10000.0, avtur_stock_liters=10000.0)
        dest = AirBase(name="Lanud B", location="B", latitude=-6.9175, longitude=107.6191)
        unit = AircraftUnit(
            tail_number="TS-1601",
            accumulated_flight_hours=123.4,
            aircraft_type=aircraft_type,
            airbase=origin,
        )
        self.db.add_all([aircraft_type, origin, dest, unit])
        self.db.commit()
        self.db.refresh(unit)
        self.db.refresh(origin)
        self.db.refresh(dest)
        self.aircraft_id = unit.id
        self.origin_id = origin.id
        self.dest_id = dest.id

    def tearDown(self):
        self.db.close()

    def _predict_req(self, **overrides):
        data = {
            "aircraft_id": self.aircraft_id,
            "origin_base_id": self.origin_id,
            "destination_base_id": self.dest_id,
            "scheduled_departure": datetime(2026, 9, 2, 10, 0, tzinfo=timezone.utc),
        }
        data.update(overrides)
        return ETAPredictionRequest(**data)

    def _create_req(self, **overrides):
        data = {
            "aircraft_id": self.aircraft_id,
            "origin_base_id": self.origin_id,
            "destination_base_id": self.dest_id,
            "scheduled_departure": datetime(2026, 9, 2, 10, 0, tzinfo=timezone.utc),
        }
        data.update(overrides)
        return FlightMissionCreate(**data)

    def test_predict_same_base_rejected(self):
        with self.assertRaises(HTTPException) as ctx:
            fm.predict_flight_eta(
                self._predict_req(destination_base_id=self.origin_id),
                db=self.db,
                _=None,
            )
        self.assertEqual(ctx.exception.status_code, 400)

    def test_predict_missing_aircraft(self):
        with self.assertRaises(HTTPException) as ctx:
            fm.predict_flight_eta(self._predict_req(aircraft_id=9999), db=self.db, _=None)
        self.assertEqual(ctx.exception.status_code, 404)

    @patch("app.api.v1.endpoints.flight_missions.get_realtime_weather", return_value=FAKE_WEATHER)
    def test_crud_filter_status_delete(self, _weather):
        prediction = fm.predict_flight_eta(self._predict_req(), db=self.db, _=None)
        self.assertGreater(prediction["distance_km"], 100)
        self.assertEqual(prediction["origin_weather"]["temp_celsius"], 28.5)

        created = fm.create_flight_mission(self._create_req(), db=self.db, _=None)
        self.assertEqual(created["status"], "Scheduled")
        self.assertEqual(created["tail_number"], "TS-1601")
        mission_id = created["id"]

        listed = fm.get_flight_missions(db=self.db, _=None)
        self.assertEqual(len(listed), 1)

        detail = fm.get_flight_mission(mission_id, db=self.db, _=None)
        self.assertEqual(detail["origin_base_name"], "Lanud A")
        self.assertEqual(detail["destination_base_name"], "Lanud B")

        updated = fm.update_flight_mission(
            mission_id,
            self._create_req(scheduled_departure=datetime(2026, 9, 2, 11, 0, tzinfo=timezone.utc)),
            db=self.db,
            _=None,
        )
        self.assertEqual(updated["id"], mission_id)
        mission = self.db.query(fm.FlightMission).filter(fm.FlightMission.id == mission_id).one()
        mission.approved_at = datetime(2026, 9, 2, 10, 30, tzinfo=timezone.utc)
        self.db.commit()

        inflight = fm.update_flight_mission_status(
            mission_id,
            FlightMissionStatusUpdate(status="In-Flight", approved=True, actual_departure=datetime(2026, 9, 2, 11, 5, tzinfo=timezone.utc)),
            db=self.db,
            _=None,
        )
        self.assertIn("In-Flight", str(inflight["status"]))

        arrived = fm.update_flight_mission_status(
            mission_id,
            FlightMissionStatusUpdate(status="Arrived"),
            db=self.db,
            _=None,
        )
        self.assertIn("Arrived", str(arrived["status"]))

        filtered = fm.get_flight_missions(status_filter=fm.FlightMissionStatusSchema.ARRIVED, db=self.db, _=None)
        self.assertEqual(len(filtered), 1)

        deleted = fm.delete_flight_mission(mission_id, db=self.db, _=None)
        self.assertIn("berhasil dihapus", deleted["message"])
        self.assertEqual(fm.get_flight_missions(db=self.db, _=None), [])

    @patch("app.api.v1.endpoints.flight_missions.get_realtime_weather", return_value=FAKE_WEATHER)
    def test_status_lifecycle_consumes_fuel_and_adds_actual_hours(self, _weather):
        created = fm.create_flight_mission(self._create_req(), db=self.db, _=None)
        mission = self.db.query(fm.FlightMission).filter(fm.FlightMission.id == created["id"]).first()
        mission.total_fuel_liters = 500.0
        mission.predicted_duration_minutes = 60.0
        self.db.commit()
        before_stock = self.db.query(AirBase).filter(AirBase.id == self.origin_id).one().avtur_stock_liters or 0.0
        before_hours = self.db.query(AircraftUnit).filter(AircraftUnit.id == self.aircraft_id).one().accumulated_flight_hours
        mission.approved_at = datetime(2026, 9, 2, 9, 30, tzinfo=timezone.utc)
        self.db.commit()

        fm.update_flight_mission_status(
            mission.id,
            FlightMissionStatusUpdate(status="In-Flight", approved=True, actual_departure=datetime(2026, 9, 2, 10, 0, tzinfo=timezone.utc)),
            db=self.db,
            _=None,
        )
        self.assertEqual(self.db.query(AirBase).filter(AirBase.id == self.origin_id).one().avtur_stock_liters, before_stock - 500.0)
        self.assertEqual(self.db.query(AirbaseAvturLog).filter(AirbaseAvturLog.mission_id == mission.id).count(), 1)
        mission.actual_arrival = datetime(2026, 9, 2, 11, 0, tzinfo=timezone.utc)
        self.db.commit()

        fm.update_flight_mission_status(
            mission.id,
            FlightMissionStatusUpdate(status="Arrived"),
            db=self.db,
            _=None,
        )
        aircraft = self.db.query(AircraftUnit).filter(AircraftUnit.id == self.aircraft_id).one()
        self.assertAlmostEqual(aircraft.accumulated_flight_hours, before_hours + 1.0, places=5)
        self.assertEqual(aircraft.airbase_id, self.dest_id)
        self.assertEqual(aircraft.status, "S")


class IntegrityConstraintTests(unittest.TestCase):
    def test_airbase_coordinates_are_bounded(self):
        from pydantic import ValidationError
        from app.schemas.airbase_schema import AirBaseCreate

        with self.assertRaises(ValidationError):
            AirBaseCreate(name="Bad", latitude=90.1, longitude=0)
        with self.assertRaises(ValidationError):
            AirBaseCreate(name="Bad", latitude=0, longitude=-180.1)

    def test_airbase_stock_cannot_be_negative_or_exceed_capacity(self):
        from pydantic import ValidationError
        from app.schemas.airbase_schema import AirBaseCreate

        with self.assertRaises(ValidationError):
            AirBaseCreate(name="Bad", avtur_capacity_liters=100, avtur_stock_liters=-1)
        with self.assertRaises(ValidationError):
            AirBaseCreate(name="Bad", avtur_capacity_liters=100, avtur_stock_liters=101)

    def test_mission_status_transition_rejects_invalid_path(self):
        with self.assertRaises(HTTPException):
            fm.validate_mission_transition("Scheduled", "Arrived")
        with self.assertRaises(HTTPException):
            fm.validate_mission_transition("In-Flight", "Cancelled")
        self.assertIsNone(fm.validate_mission_transition("Scheduled", "In-Flight", approved=True))
        self.assertIsNone(fm.validate_mission_transition("In-Flight", "Arrived"))
        self.assertIsNone(fm.validate_mission_transition("Scheduled", "Cancelled"))
        with self.assertRaises(HTTPException):
            fm.validate_mission_transition("Scheduled", "In-Flight", approved=False)

    def test_mission_timeline_delay_is_calculated(self):
        predicted = datetime(2026, 9, 2, 12, 0, tzinfo=timezone.utc)
        actual = datetime(2026, 9, 2, 12, 15, tzinfo=timezone.utc)
        self.assertEqual(fm.calculate_eta_variance_minutes(predicted, actual), 15.0)

    def test_mission_requires_serviceable_aircraft(self):
        unit = AircraftUnit(status="U/S")
        with self.assertRaises(HTTPException):
            fm.ensure_aircraft_available(unit, [])


class Task2SchemaTests(unittest.TestCase):
    def test_nrp_accepts_alphanumeric_identity(self):
        item = UserCreate(
            username="nrp.user",
            full_name="Prajurit NRP",
            nip="NRP-1234/A",
            service_unit="Skadron",
            password="Password1234!",
        )
        self.assertEqual(item.nip, "NRP-1234/A")

    def test_aircraft_readiness_requires_all_conditions(self):
        typ = AircraftType(tbo_hours=100, phase_interval_hours=50, calendar_interval_days=60)
        unit = AircraftUnit(accumulated_flight_hours=10, last_service_hours=0)
        self.assertEqual(_derived_status(unit, typ), "S")
        unit.squawk_discrepancy = "fuel leak"
        self.assertEqual(_derived_status(unit, typ), "U/S")
        unit.squawk_discrepancy = "  "
        unit.is_manually_grounded = True
        self.assertEqual(_derived_status(unit, typ), "U/S")
        unit.is_manually_grounded = False
        unit.accumulated_flight_hours = 100
        self.assertEqual(_derived_status(unit, typ), "U/S")

    def test_aircraft_schemas_round_trip_new_fields(self):
        create = AircraftUnitCreate(
            tail_number="TS-1234",
            aircraft_type_id=1,
            squawk_discrepancy="hydraulic leak",
            is_manually_grounded=True,
        )
        update = AircraftUnitUpdate(squawk_discrepancy=None, is_manually_grounded=False)
        self.assertTrue(create.is_manually_grounded)
        self.assertEqual(update.is_manually_grounded, False)

    def test_new_mission_statuses_are_exposed(self):
        self.assertEqual(FlightMissionStatus.DIVERTED.value, "Diverted")
        self.assertEqual(FlightMissionStatus.DELAYED.value, "Delayed")


if __name__ == "__main__":
    unittest.main(verbosity=2)
