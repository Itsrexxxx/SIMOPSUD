from datetime import datetime, timezone
from unittest.mock import Mock, patch

from app.services.adsb_provider import fetch_tracks, normalize_aircraft


class TestAdsbProvider:
    def test_normalize_aircraft(self):
        result = normalize_aircraft(
            {
                "hex": "ABC123",
                "r": "A-1339",
                "lat": -6.2,
                "lon": 106.8,
                "alt_baro": 10000,
                "track": 145,
                "gs": 300,
                "seen_pos": 5,
            },
            datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
        assert result["icao24"] == "abc123"
        assert result["tail_number"] == "A-1339"
        assert result["altitude_m"] == 3048.0
        assert result["speed_kmh"] == 555.6
        assert result["status"] == "LIVE"

    @patch("app.services.adsb_provider.settings.ADSB_LOL_API_KEY", "test-key")
    @patch("app.services.adsb_provider.requests.get")
    def test_fetch_tracks_uses_provider_and_normalizes(self, get):
        response = Mock()
        response.json.return_value = {"ac": [{"hex": "abc123", "lat": 0, "lon": 0}]}
        response.raise_for_status.return_value = None
        get.return_value = response

        result = fetch_tracks(0, 0)

        assert len(result) == 1
        assert result[0]["source"] == "ADSB"
        get.assert_called_once()
        assert get.call_args.kwargs["headers"] == {"x-api-key": "test-key"}

    @patch("app.services.adsb_provider.settings.ADSB_LOL_API_KEY", "")
    def test_missing_key_skips_provider(self):
        assert fetch_tracks(0, 0) == []
