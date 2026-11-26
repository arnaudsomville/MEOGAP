"""GeoJSON and WKT geometry validation for the deterministic M0 demo."""

from __future__ import annotations

import copy
import math
from collections.abc import Sequence
from itertools import pairwise
from typing import Any

from fastapi import status

from gateway.core.demo.constants import (
    LATITUDE_MAXIMUM,
    LATITUDE_MINIMUM,
    LONGITUDE_MAXIMUM,
    LONGITUDE_MINIMUM,
    MIN_BOUNDARY_POINTS,
    MIN_RING_POSITIONS,
    POSITION_DIMENSIONS,
    SUPPORTED_CRS,
    SUPPORTED_CRS_ALIASES,
    WKT_COORDINATE_PATTERN,
    WKT_POINT_PATTERN,
    WKT_POLYGON_HEADER_PATTERN,
    WKT_RING_PATTERN,
)
from gateway.core.demo.errors import DemoError

Geometry = dict[str, Any]


def copy_geometry(geometry: Geometry) -> Geometry:
    """Deep-copy a GeoJSON geometry before storing or exposing it.

    Args:
    ----
        geometry(Geometry): geometry to isolate from caller mutation.

    Returns:
    -------
        Geometry: independent geometry copy.

    """
    return copy.deepcopy(geometry)


def as_position(value: object) -> tuple[float, float]:
    """Validate one GeoJSON longitude/latitude position.

    Args:
    ----
        value(object): untrusted coordinate candidate.

    Returns:
    -------
        tuple[float, float]: validated longitude and latitude.

    Raises:
    ------
        DemoError: when the position is malformed or outside WGS 84 bounds.

    """
    if not isinstance(value, list) or len(value) < POSITION_DIMENSIONS:
        raise DemoError(
            status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_GEOMETRY', 'A position needs longitude and latitude.'
        )
    longitude, latitude = value[0], value[1]
    if not isinstance(longitude, (int, float)) or not isinstance(latitude, (int, float)):
        raise DemoError(status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_GEOMETRY', 'AOI coordinates must be numeric.')
    if (
        not LONGITUDE_MINIMUM <= float(longitude) <= LONGITUDE_MAXIMUM
        or not LATITUDE_MINIMUM <= float(latitude) <= LATITUDE_MAXIMUM
    ):
        raise DemoError(
            status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_GEOMETRY', 'AOI coordinates must use WGS 84 bounds.'
        )
    return float(longitude), float(latitude)


def ring_area_square_meters(ring: Sequence[object]) -> float:
    """Return an approximate area for one WGS 84 ring.

    Args:
    ----
        ring(list[object]): validated GeoJSON linear ring.

    Returns:
    -------
        float: approximate ring area in square meters.

    """
    positions = [as_position(position) for position in ring]
    mean_latitude = sum(latitude for _, latitude in positions) / len(positions)
    longitude_scale = 111_320 * math.cos(math.radians(mean_latitude))
    latitude_scale = 110_540
    projected = [(longitude * longitude_scale, latitude * latitude_scale) for longitude, latitude in positions]
    area = sum(current[0] * following[1] - following[0] * current[1] for current, following in pairwise(projected))
    return abs(area) / 2


def validate_ring(ring: object) -> list[object]:
    """Validate a closed GeoJSON linear ring with measurable area.

    Args:
    ----
        ring(object): untrusted linear-ring candidate.

    Returns:
    -------
        list[object]: validated ring.

    Raises:
    ------
        DemoError: when the ring cannot represent an AOI boundary.

    """
    if not isinstance(ring, list) or len(ring) < MIN_RING_POSITIONS:
        raise DemoError(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            'INVALID_GEOMETRY',
            'A polygon boundary needs at least four closed positions.',
        )
    first = as_position(ring[0])
    last = as_position(ring[-1])
    if first != last:
        raise DemoError(status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_GEOMETRY', 'Polygon boundaries must be closed.')
    for position in ring:
        as_position(position)
    if len({tuple(as_position(position)) for position in ring[:-1]}) < MIN_BOUNDARY_POINTS:
        raise DemoError(
            status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_GEOMETRY', 'An AOI needs three distinct boundary points.'
        )
    if ring_area_square_meters(ring) <= 1:
        raise DemoError(
            status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_GEOMETRY', 'An AOI boundary must enclose an area.'
        )
    return ring


def validate_geometry(geometry: Geometry) -> Geometry:
    """Validate supported GeoJSON AOI geometry and return an isolated copy.

    Args:
    ----
        geometry(Geometry): untrusted Polygon or MultiPolygon geometry.

    Returns:
    -------
        Geometry: validated isolated geometry.

    Raises:
    ------
        DemoError: when the geometry is not a valid supported AOI shape.

    """
    geometry_type = geometry.get('type')
    coordinates = geometry.get('coordinates')
    if geometry_type == 'Polygon':
        if not isinstance(coordinates, list) or not coordinates:
            raise DemoError(
                status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_GEOMETRY', 'A Polygon needs coordinate rings.'
            )
        for ring in coordinates:
            validate_ring(ring)
        return copy_geometry(geometry)
    if geometry_type == 'MultiPolygon':
        if not isinstance(coordinates, list) or not coordinates:
            raise DemoError(status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_GEOMETRY', 'A MultiPolygon needs polygons.')
        for polygon in coordinates:
            if not isinstance(polygon, list) or not polygon:
                raise DemoError(
                    status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_GEOMETRY', 'A MultiPolygon needs polygon rings.'
                )
            for ring in polygon:
                validate_ring(ring)
        return copy_geometry(geometry)
    raise DemoError(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        'INVALID_GEOMETRY',
        'AOIs must use a GeoJSON Polygon or MultiPolygon geometry.',
    )


def geometry_rings(geometry: Geometry) -> list[list[list[float]]]:
    """Return every ring of a validated Polygon or MultiPolygon geometry.

    Args:
    ----
        geometry(Geometry): validated geometry.

    Returns:
    -------
        list[list[list[float]]]: flattened rings.

    """
    if geometry['type'] == 'Polygon':
        coordinates: list[list[list[float]]] = geometry['coordinates']
        return coordinates
    polygons: list[list[list[list[float]]]] = geometry['coordinates']
    return [ring for polygon in polygons for ring in polygon]


def geometry_area_km2(geometry: Geometry) -> float:
    """Approximate the area enclosed by a supported GeoJSON geometry.

    Args:
    ----
        geometry(Geometry): validated Polygon or MultiPolygon geometry.

    Returns:
    -------
        float: area in square kilometres.

    """
    area = sum(ring_area_square_meters(ring) for ring in geometry_rings(geometry))
    return round(area / 1_000_000, 3)


def geometry_bounds(geometry: Geometry) -> list[list[float]]:
    """Return Leaflet-compatible southwest/northeast bounds for a geometry.

    Args:
    ----
        geometry(Geometry): validated Polygon or MultiPolygon geometry.

    Returns:
    -------
        list[list[float]]: southwest and northeast latitude/longitude positions.

    """
    positions = [as_position(position) for ring in geometry_rings(geometry) for position in ring]
    longitudes = [longitude for longitude, _ in positions]
    latitudes = [latitude for _, latitude in positions]
    return [[min(latitudes), min(longitudes)], [max(latitudes), max(longitudes)]]


def geometry_bounds_tuple(geometry: Geometry) -> tuple[float, float, float, float]:
    """Return south, west, north and east bounds for a geometry.

    Args:
    ----
        geometry(Geometry): validated geometry.

    Returns:
    -------
        tuple[float, float, float, float]: south, west, north and east bounds.

    """
    bounds = geometry_bounds(geometry)
    return bounds[0][0], bounds[0][1], bounds[1][0], bounds[1][1]


def validate_crs(crs: str) -> str:
    """Validate the explicitly declared selection CRS.

    Args:
    ----
        crs(str): caller-declared coordinate reference system.

    Returns:
    -------
        str: normalized supported CRS.

    Raises:
    ------
        DemoError: when the CRS is missing or unsupported.

    """
    normalized = crs.strip()
    if normalized not in SUPPORTED_CRS_ALIASES:
        raise DemoError(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            'UNSUPPORTED_CRS',
            'The selection CRS must be EPSG:4326 with longitude/latitude coordinates.',
        )
    return SUPPORTED_CRS


def _wkt_position(text: str) -> list[float]:
    """Parse one WKT longitude/latitude position.

    Args:
    ----
        text(str): coordinate pair text.

    Returns:
    -------
        list[float]: GeoJSON-compatible longitude/latitude position.

    Raises:
    ------
        DemoError: when the position is malformed or outside WGS 84 bounds.

    """
    match = WKT_COORDINATE_PATTERN.fullmatch(text)
    if match is None:
        raise DemoError(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            'INVALID_GEOMETRY',
            'WKT positions must contain longitude then latitude.',
        )
    longitude = float(match.group(1))
    latitude = float(match.group(2))
    as_position([longitude, latitude])
    return [longitude, latitude]


def parse_wkt_geometry(wkt: str, crs: str) -> tuple[str, Geometry]:
    """Parse and validate a point or polygon WKT selection.

    Args:
    ----
        wkt(str): WKT geometry supplied by the client.
        crs(str): explicitly declared coordinate reference system.

    Returns:
    -------
        tuple[str, Geometry]: selection kind and validated GeoJSON geometry.

    Raises:
    ------
        DemoError: when the CRS or WKT geometry is invalid.

    """
    validate_crs(crs)
    point_match = WKT_POINT_PATTERN.fullmatch(wkt)
    if point_match is not None:
        longitude = float(point_match.group('longitude'))
        latitude = float(point_match.group('latitude'))
        as_position([longitude, latitude])
        return 'Point', {'type': 'Point', 'coordinates': [longitude, latitude]}
    if WKT_POLYGON_HEADER_PATTERN.match(wkt) is None:
        raise DemoError(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            'INVALID_GEOMETRY',
            'Selections must use POINT(...) or POLYGON((...)) WKT.',
        )
    opening = wkt.find('(')
    closing = wkt.rfind(')')
    if opening < 0 or closing <= opening:
        raise DemoError(status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_GEOMETRY', 'A WKT polygon needs parentheses.')
    rings = WKT_RING_PATTERN.findall(wkt[opening + 1 : closing])
    if not rings:
        raise DemoError(status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_GEOMETRY', 'A WKT polygon needs a closed ring.')
    coordinates: list[list[list[float]]] = []
    for ring_text in rings:
        positions = [_wkt_position(item) for item in ring_text.split(',')]
        validate_ring(positions)
        coordinates.append(positions)
    return 'Polygon', {'type': 'Polygon', 'coordinates': coordinates}


def _point_in_ring(longitude: float, latitude: float, ring: list[list[float]]) -> bool:
    """Return whether a point lies inside one closed ring using ray casting.

    Args:
    ----
        longitude(float): point longitude.
        latitude(float): point latitude.
        ring(list[list[float]]): closed longitude/latitude ring.

    Returns:
    -------
        bool: whether the point is inside the ring.

    """
    inside = False
    previous_longitude, previous_latitude = ring[-1][0], ring[-1][1]
    for current_longitude, current_latitude in ring:
        crosses = (current_latitude > latitude) != (previous_latitude > latitude)
        if crosses:
            intersection = (previous_longitude - current_longitude) * (latitude - current_latitude) / (
                previous_latitude - current_latitude
            ) + current_longitude
            if longitude < intersection:
                inside = not inside
        previous_longitude, previous_latitude = current_longitude, current_latitude
    return inside


def point_in_geometry(longitude: float, latitude: float, geometry: Geometry) -> bool:
    """Return whether a position lies inside a supported polygonal geometry.

    Args:
    ----
        longitude(float): point longitude.
        latitude(float): point latitude.
        geometry(Geometry): validated polygonal geometry.

    Returns:
    -------
        bool: whether the position is inside the geometry.

    """
    polygons = [geometry['coordinates']] if geometry['type'] == 'Polygon' else geometry['coordinates']
    return any(polygon and _point_in_ring(longitude, latitude, polygon[0]) for polygon in polygons)
