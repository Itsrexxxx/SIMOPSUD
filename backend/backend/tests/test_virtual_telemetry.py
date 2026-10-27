from datetime import datetime, timezone
import unittest

from app.services.virtual_telemetry import interpolate_position


class VirtualTelemetryTests(unittest.TestCase):
    def test_position_is_deterministic_and_halfway(self):
        departure = datetime(2026, 1, 1, tzinfo=timezone.utc)
        result = interpolate_position(0, 100, 10, 120, departure, 60, 600, departure.replace(minute=30))
        self.assertEqual(result["position"], {"lat": 5.0, "lon": 110.0})
        self.assertEqual(result["progress_percent"], 50.0)

    def test_nonpositive_duration_rejected(self):
        with self.assertRaises(ValueError):
            interpolate_position(0, 0, 1, 1, datetime.now(timezone.utc), 0, 600)


if __name__ == "__main__":
    unittest.main()
