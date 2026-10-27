from datetime import datetime, timezone
from unittest.mock import Mock, patch

import pytest

from app.services import adsb_provider
from app.services.adsb_provider import _bbox, fetch_provider_tracks, normalize_aircraft, normalize_opensky_state

NOW = datetime(2026, 1, 1, tzinfo=timezone.utc)


@pytest.fixture(autouse=True)
def _reset_cooldown():
    adsb_provider._cooldown.clear()
    adsb_provider._last_error.clear()
    adsb_provider._cache.clear()  # cache proses tunggal, harus bersih antar test
    yield
    adsb_provider._cooldown.clear()
    adsb_provider._last_error.clear()
    adsb_provider._cache.clear()


def _response(status_code=200, payload=None, text=""):
    response = Mock()
    response.status_code = status_code
    response.json.return_value = payload if payload is not None else {}
    response.text = text
    return response


def test_normalize_aircraft():
    result = normalize_aircraft(
        {"hex": "ABC123", "r": "A-1339", "lat": -6.2, "lon": 106.8, "alt_baro": 10000, "track": 145, "gs": 300, "seen_pos": 5},
        NOW,
    )
    assert result["icao24"] == "abc123"
    assert result["tail_number"] == "A-1339"
    assert result["altitude_m"] == 3048.0
    assert result["speed_kmh"] == 555.6
    assert result["status"] == "LIVE"
    assert result["provider"] == "adsb.lol"


def test_normalize_aircraft_rejects_bad_coordinates():
    assert normalize_aircraft({"hex": "abc123", "lat": 900, "lon": 10}, NOW) is None
    assert normalize_aircraft({"lat": -6.2, "lon": 106.8}, NOW) is None


def test_normalize_opensky_state():
    state = ["a1b2c3", "GIA253  ", "Indonesia", NOW.timestamp() - 30, NOW.timestamp() - 5, 112.7, -7.9, 10000.0, False, 230.0, 95.0, 0.0, None, 10100.0, "1234", False, 0]
    result = normalize_opensky_state(state, NOW)
    assert result["provider"] == "OpenSky"
    assert result["tail_number"] == "GIA253"
    assert result["altitude_m"] == 10100.0
    assert result["speed_kmh"] == 828.0
    assert result["status"] == "LIVE"
    assert normalize_opensky_state(["broken"], NOW) is None


def test_bbox_centres_on_radius():
    lamin, lomin, lamax, lomax = _bbox(-7.9262, 112.7136, 250)
    assert lamin < -7.9262 < lamax
    assert lomin < 112.7136 < lomax
    assert abs((lamax - lamin) - 2 * 250 / 60) < 1e-9


@patch("app.services.adsb_provider.settings.ADSB_LOL_API_KEY", "test-key")
@patch("app.services.adsb_provider.requests.get")
def test_fetch_uses_primary_provider_and_normalizes(get):
    get.return_value = _response(200, {"ac": [{"hex": "abc123", "lat": 0, "lon": 0}]})

    result = fetch_provider_tracks(0, 0)

    assert result["provider"] == "adsb.lol"
    assert result["error"] is None
    assert len(result["tracks"]) == 1
    assert result["tracks"][0]["source"] == "ADSB"
    get.assert_called_once()
    assert get.call_args.kwargs["headers"] == {"x-api-key": "test-key"}


@patch("app.services.adsb_provider.settings.ADSB_LOL_API_KEY", "test-key")
@patch("app.services.adsb_provider.requests.get")
def test_fetch_falls_back_to_opensky_when_key_rejected(get):
    get.side_effect = [
        _response(401, text="api key bound to a different address"),  # percobaan dengan key
        _response(401, text="api key bound to a different address"),  # ulang tanpa key
        _response(200, {"states": [["abc123", "GIA253", "Indonesia", NOW.timestamp(), NOW.timestamp(), 112.7, -7.9, 1000.0, False, 200.0, 90.0, None, None, 1100.0]]}),
    ]

    result = fetch_provider_tracks(-7.9262, 112.7136, 250)

    assert result["provider"] == "OpenSky"
    assert result["error"] is None
    assert len(result["tracks"]) == 1
    assert "401" in result["errors"][0]
    assert "bound to a different address" in result["errors"][0]
    assert get.call_args_list[2].kwargs["params"]["lamin"] < -7.9262


@patch("app.services.adsb_provider.settings.ADSB_LOL_API_KEY", "test-key")
def test_missing_provider_never_raises_and_explains():
    with patch.object(adsb_provider, "_adsb_lol_tracks", return_value=(None, "adsb.lol: HTTP 401")), patch.object(
        adsb_provider, "_opensky_tracks", side_effect=RuntimeError("timeout")
    ):
        result = fetch_provider_tracks(0, 0)

    assert result["tracks"] == []
    assert result["provider"] is None
    assert "OpenSky" in result["error"] and "RuntimeError" in result["error"]


@patch("app.services.adsb_provider.settings.ADSB_LOL_API_KEY", "")
@patch("app.services.adsb_provider.requests.get", return_value=_response(200, {"ac": []}))
def test_missing_key_still_queries_public_adsb_lol(get):
    """Endpoint publik adsb.lol menjawab tanpa key (fair-use) - jangan dilewati."""
    result = fetch_provider_tracks(0, 0)

    assert result["provider"] == "adsb.lol"
    assert not (get.call_args.kwargs.get("headers") or {}).get("x-api-key")


@patch("app.services.adsb_provider.settings.ADSB_LOL_API_KEY", "")
@patch("app.services.adsb_provider.requests.get", return_value=_response(200, {"ac": []}))
def test_repeat_query_served_from_cache(get):
    """Klien polling tiap 15 s tidak boleh menembak provider tiap request."""
    fetch_provider_tracks(-7.9262, 112.7136, 250)
    calls_after_first = get.call_count

    fetch_provider_tracks(-7.9262, 112.7136, 250)

    assert get.call_count == calls_after_first


@patch("app.services.adsb_provider.settings.ADSB_LOL_API_KEY", "")
@patch("app.services.adsb_provider.requests.get")
def test_missing_key_falls_back_to_opensky_when_adsb_lol_rejects(get):
    get.side_effect = [_response(401, text="rejected"), _response(200, {"states": []})]

    result = fetch_provider_tracks(0, 0)

    assert result["provider"] == "OpenSky"
    assert get.call_args.kwargs["params"]["lamin"] < 0


@patch("app.services.adsb_provider.settings.ADSB_LOL_API_KEY", "test-key")
@patch("app.services.adsb_provider.requests.get", return_value=_response(401, text="rejected"))
def test_failed_provider_is_skipped_during_cooldown(get):
    fetch_provider_tracks(0, 0)
    calls_after_first = get.call_count

    result = fetch_provider_tracks(0, 0)

    assert get.call_count == calls_after_first
    assert "dilewati sementara" in result["error"]
