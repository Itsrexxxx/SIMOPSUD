import pytest

from app.services.route_planning import route_legs, validate_coordinate, validate_location


def test_route_legs_preserve_transit_order_and_distance():
    points = [
        {"name": "Origin", "latitude": 0, "longitude": 0},
        {"name": "Transit", "latitude": 0, "longitude": 1},
        {"name": "Destination", "latitude": 1, "longitude": 1},
    ]
    legs = route_legs(points)
    assert [leg["leg"] for leg in legs] == [1, 2]
    assert all(leg["distance_km"] > 100 for leg in legs)


def test_coordinate_zero_is_valid_and_bounds_are_enforced():
    assert validate_coordinate(0, 0) == (0.0, 0.0)
    with pytest.raises(ValueError):
        validate_coordinate(91, 0)
    with pytest.raises(ValueError):
        validate_coordinate(0, 181)


def test_new_location_requires_name_and_coordinates():
    assert validate_location({"name": "Changi", "latitude": 1.3, "longitude": 103.9})["name"] == "Changi"
    with pytest.raises(ValueError):
        validate_location({"name": "", "latitude": 1, "longitude": 1})
