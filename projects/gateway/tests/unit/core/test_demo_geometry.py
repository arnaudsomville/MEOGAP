"""Unit tests for geoJSON validation, WKT parsing and explicit CRS handling."""

import pytest
from demo_fixtures import POINT_WKT, SMALL_POLYGON_WKT

from gateway.core.demo import DemoError, parse_wkt_geometry, validate_geometry

pytestmark = pytest.mark.unit


def test_point_and_polygon_wkt_are_validated_with_explicit_crs() -> None:
    """WKT parsing preserves geometry type and coordinates only for EPSG:4326."""
    point_kind, point = parse_wkt_geometry(POINT_WKT, 'EPSG:4326')
    polygon_kind, polygon = parse_wkt_geometry(SMALL_POLYGON_WKT, 'urn:ogc:def:crs:EPSG::4326')
    assert point_kind == 'Point'
    assert point['coordinates'] == [1.44, 43.60]
    assert polygon_kind == 'Polygon'
    assert polygon['coordinates'][0][0] == [1.40, 43.58]


def test_unsupported_crs_is_rejected_explicitly() -> None:
    """No geometry is assumed to be WGS 84 without an accepted explicit CRS."""
    with pytest.raises(DemoError, match='CRS must be EPSG:4326'):
        parse_wkt_geometry(POINT_WKT, 'EPSG:3857')


def test_unsupported_wkt_geometry_is_rejected() -> None:
    """Only point and polygon selections are supported in M0."""
    with pytest.raises(DemoError, match=r'POINT|POLYGON'):
        parse_wkt_geometry('LINESTRING(1 2, 3 4)', 'EPSG:4326')


def test_polygon_geojson_requires_three_distinct_points() -> None:
    """Degenerate polygons are rejected before any representation is produced."""
    with pytest.raises(DemoError, match='three distinct boundary points'):
        validate_geometry(
            {
                'type': 'Polygon',
                'coordinates': [[[1.4, 43.6], [1.4, 43.6], [1.4, 43.6], [1.4, 43.6]]],
            }
        )


def test_out_of_range_coordinates_are_rejected() -> None:
    """Coordinates outside WGS 84 bounds are rejected."""
    with pytest.raises(DemoError, match='WGS 84 bounds'):
        parse_wkt_geometry('POINT(200 43.6)', 'EPSG:4326')
