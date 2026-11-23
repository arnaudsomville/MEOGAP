"""Deterministic M0 demo state owned directly by the public Gateway.

The data in this module exists solely to exercise the documented public REST
journey. It is explicitly synthetic and must not be interpreted as EO
processing, a scientific product, production identity, or a credit ledger.
"""

from __future__ import annotations

import base64
import copy
import json
import math
import re
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from itertools import pairwise
from threading import RLock
from typing import Any
from urllib.parse import quote

from fastapi import status

DEMO_OWNER_ID = 'demo-user'
MONTH_PATTERN = re.compile(r'^\d{4}-(0[1-9]|1[0-2])$')
REQUEST_PREPARING = 'PREPARING'
REQUEST_PROPOSED = 'PROPOSED'
REQUEST_IN_EXECUTION = 'IN_EXECUTION'
REQUEST_COMPLETED = 'COMPLETED'
REQUEST_FAILED = 'FAILED'
REQUEST_CANCELLED = 'CANCELLED'
DELIVERY_PREPARING = 'PREPARING'
DELIVERY_READY = 'READY'
DELIVERY_FAILED = 'FAILED'
FAILURE_PREPARATION = 'preparation'
FAILURE_EXECUTION = 'execution'
FAILURE_DELIVERY = 'delivery'
FAILURE_RESULT_UNAVAILABLE = 'result-unavailable'
FAILURE_INSUFFICIENT_CREDITS = 'insufficient-credits'
FAILURE_CREDITS_UNAVAILABLE = 'credits-unavailable'
DEFAULT_STARTING_CREDITS = 1000
DEFAULT_REQUEST_COST = 12
DEFAULT_PREPARATION_DELAY_SECONDS = 2
DEFAULT_EXECUTION_DELAY_SECONDS = 3
DEFAULT_DELIVERY_DELAY_SECONDS = 1
POSITION_DIMENSIONS = 2
LONGITUDE_MINIMUM = -180
LONGITUDE_MAXIMUM = 180
LATITUDE_MINIMUM = -90
LATITUDE_MAXIMUM = 90
MIN_RING_POSITIONS = 4
MIN_BOUNDARY_POINTS = 3

Geometry = dict[str, Any]
Clock = Callable[[], datetime]


class DemoError(Exception):
    """A caller-safe error returned by deterministic Gateway demo behavior.

    Args:
    ----
        status_code(int): HTTP status to expose.
        code(str): stable demo error code.
        message(str): caller-safe explanation.

    """

    def __init__(self, status_code: int, code: str, message: str) -> None:
        """Initialize the error.

        Args:
        ----
            status_code(int): HTTP status to expose.
            code(str): stable demo error code.
            message(str): caller-safe explanation.

        """
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message


@dataclass(frozen=True)
class DemoSettings:
    """Configurable timings and outcomes for deterministic M0 demo behavior."""

    starting_credits: int = DEFAULT_STARTING_CREDITS
    request_cost: int = DEFAULT_REQUEST_COST
    preparation_delay_seconds: int = DEFAULT_PREPARATION_DELAY_SECONDS
    execution_delay_seconds: int = DEFAULT_EXECUTION_DELAY_SECONDS
    delivery_delay_seconds: int = DEFAULT_DELIVERY_DELAY_SECONDS
    failure_mode: str | None = None


@dataclass
class AoiRecord:
    """One owner-scoped saved AOI record."""

    aoi_id: str
    owner_id: str
    name: str
    description: str | None
    geometry: Geometry
    revision: int
    created_at: datetime
    updated_at: datetime


@dataclass
class RequestRecord:
    """One persistent demo analysis request and immutable spatial snapshot."""

    request_id: str
    owner_id: str
    product_id: str
    aoi_id: str
    aoi_revision: int
    aoi_name: str
    geometry_snapshot: Geometry
    start_month: str
    end_month: str
    state: str
    created_at: datetime
    updated_at: datetime
    proposal_ready_at: datetime
    execution_started_at: datetime | None = None
    estimated_credits: int | None = None
    actual_credits: int | None = None
    result_id: str | None = None
    message: str | None = None
    failure_stage: str | None = None


@dataclass
class ResultRecord:
    """One completed deterministic demo result."""

    result_id: str
    request_id: str
    owner_id: str
    product_id: str
    aoi_name: str
    geometry_snapshot: Geometry
    created_at: datetime


@dataclass
class DeliveryRecord:
    """One asynchronous demo delivery resource."""

    delivery_id: str
    result_id: str
    owner_id: str
    state: str
    created_at: datetime
    updated_at: datetime
    ready_at: datetime
    message: str | None = None


def default_clock() -> datetime:
    """Return the current UTC time for production demo behavior.

    Returns
    -------
        datetime: timezone-aware current UTC time.

    """
    return datetime.now(UTC)


def _copy_geometry(geometry: Geometry) -> Geometry:
    """Deep-copy a GeoJSON geometry before storing or exposing it.

    Args:
    ----
        geometry(Geometry): geometry to isolate from caller mutation.

    Returns:
    -------
        Geometry: independent geometry copy.

    """
    return copy.deepcopy(geometry)


def _as_position(value: object) -> tuple[float, float]:
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


def _ring_area_square_meters(ring: list[object]) -> float:
    """Return an approximate area for one WGS 84 ring.

    Args:
    ----
        ring(list[object]): validated GeoJSON linear ring.

    Returns:
    -------
        float: approximate ring area in square meters.

    """
    positions = [_as_position(position) for position in ring]
    mean_latitude = sum(latitude for _, latitude in positions) / len(positions)
    longitude_scale = 111_320 * math.cos(math.radians(mean_latitude))
    latitude_scale = 110_540
    projected = [(longitude * longitude_scale, latitude * latitude_scale) for longitude, latitude in positions]
    area = sum(current[0] * following[1] - following[0] * current[1] for current, following in pairwise(projected))
    return abs(area) / 2


def _validate_ring(ring: object) -> list[object]:
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
    first = _as_position(ring[0])
    last = _as_position(ring[-1])
    if first != last:
        raise DemoError(status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_GEOMETRY', 'Polygon boundaries must be closed.')
    for position in ring:
        _as_position(position)
    if len({tuple(_as_position(position)) for position in ring[:-1]}) < MIN_BOUNDARY_POINTS:
        raise DemoError(
            status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_GEOMETRY', 'An AOI needs three distinct boundary points.'
        )
    if _ring_area_square_meters(ring) <= 1:
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
            _validate_ring(ring)
        return _copy_geometry(geometry)
    if geometry_type == 'MultiPolygon':
        if not isinstance(coordinates, list) or not coordinates:
            raise DemoError(status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_GEOMETRY', 'A MultiPolygon needs polygons.')
        for polygon in coordinates:
            if not isinstance(polygon, list) or not polygon:
                raise DemoError(
                    status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_GEOMETRY', 'A MultiPolygon needs polygon rings.'
                )
            for ring in polygon:
                _validate_ring(ring)
        return _copy_geometry(geometry)
    raise DemoError(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        'INVALID_GEOMETRY',
        'AOIs must use a GeoJSON Polygon or MultiPolygon geometry.',
    )


def geometry_area_km2(geometry: Geometry) -> float:
    """Approximate the area enclosed by a supported GeoJSON geometry.

    Args:
    ----
        geometry(Geometry): validated Polygon or MultiPolygon geometry.

    Returns:
    -------
        float: area in square kilometres.

    """
    geometry_type = geometry['type']
    coordinates = geometry['coordinates']
    if geometry_type == 'Polygon':
        rings = coordinates
    else:
        rings = [ring for polygon in coordinates for ring in polygon]
    area = sum(_ring_area_square_meters(ring) for ring in rings)
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
    coordinates = geometry['coordinates']
    rings = coordinates if geometry['type'] == 'Polygon' else [ring for polygon in coordinates for ring in polygon]
    positions = [_as_position(position) for ring in rings for position in ring]
    longitudes = [longitude for longitude, _ in positions]
    latitudes = [latitude for _, latitude in positions]
    return [[min(latitudes), min(longitudes)], [max(latitudes), max(longitudes)]]


class DemoStore:
    """Thread-safe deterministic M0 Gateway state.

    The store intentionally keeps all data process-local. It is a learning/demo
    implementation and is not a persistence, identity, EO-processing, or
    financial-accounting design.
    """

    def __init__(self, settings: DemoSettings | None = None, clock: Clock = default_clock) -> None:
        """Initialize deterministic state and seed documented geographic examples.

        Args:
        ----
            settings(DemoSettings): configurable demo timings and outcomes.
            clock(Clock): injectable UTC clock used by transitions and tests.

        """
        self.settings = settings or DemoSettings()
        self.clock = clock
        self._lock = RLock()
        self._aois: dict[str, AoiRecord] = {}
        self._requests: dict[str, RequestRecord] = {}
        self._results: dict[str, ResultRecord] = {}
        self._deliveries: dict[str, DeliveryRecord] = {}
        self._balances: dict[str, int] = {DEMO_OWNER_ID: self.settings.starting_credits}
        self._aoi_sequence = 0
        self._request_sequence = 0
        self._result_sequence = 0
        self._delivery_sequence = 0
        self._products = self._build_products()
        self._seed_aois()

    def list_products(self) -> list[dict[str, Any]]:
        """Return deterministic public product summaries.

        Returns
        -------
            list[dict[str, Any]]: demo scientific product descriptors.

        """
        return [copy.deepcopy(product) for product in self._products.values()]

    def get_product(self, product_id: str) -> dict[str, Any]:
        """Return one public demo product definition.

        Args:
        ----
            product_id(str): product identifier requested by the caller.

        Returns:
        -------
            dict[str, Any]: deterministic product definition.

        Raises:
        ------
            DemoError: when the product does not exist.

        """
        product = self._products.get(product_id)
        if product is None:
            raise DemoError(status.HTTP_404_NOT_FOUND, 'PRODUCT_NOT_FOUND', 'The requested product is not available.')
        return copy.deepcopy(product)

    def get_product_requirements(self, product_id: str) -> dict[str, Any]:
        """Return public scientific input requirements for a demo product.

        Args:
        ----
            product_id(str): product identifier requested by the caller.

        Returns:
        -------
            dict[str, Any]: deterministic input requirement information.

        """
        product = self.get_product(product_id)
        return {
            'product_id': product['product_id'],
            'inputs': product['inputs'],
            'limitations': product['limitations'],
            'note': 'Demo requirements only; this Gateway does not resolve real acquisitions.',
        }

    def list_aois(self, owner_id: str) -> list[AoiRecord]:
        """Return AOIs owned by a caller.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.

        Returns:
        -------
            list[AoiRecord]: owner-scoped AOIs ordered by latest update.

        """
        with self._lock:
            records = [record for record in self._aois.values() if record.owner_id == owner_id]
            return sorted(records, key=lambda record: record.updated_at, reverse=True)

    def get_aoi(self, owner_id: str, aoi_id: str) -> AoiRecord:
        """Return one AOI only when it belongs to the caller.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.
            aoi_id(str): saved AOI identifier.

        Returns:
        -------
            AoiRecord: requested AOI.

        Raises:
        ------
            DemoError: when the AOI is absent or belongs to another owner.

        """
        with self._lock:
            record = self._aois.get(aoi_id)
            if record is None or record.owner_id != owner_id:
                raise DemoError(status.HTTP_404_NOT_FOUND, 'AOI_NOT_FOUND', 'The requested AOI was not found.')
            return record

    def create_aoi(self, owner_id: str, name: str, description: str | None, geometry: Geometry) -> AoiRecord:
        """Persist one validated user-owned demo AOI.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.
            name(str): caller-visible AOI name.
            description(str | None): optional caller-visible description.
            geometry(Geometry): GeoJSON polygonal geometry.

        Returns:
        -------
            AoiRecord: created AOI.

        """
        clean_name = name.strip()
        if not clean_name:
            raise DemoError(status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_AOI', 'An AOI name is required.')
        validated_geometry = validate_geometry(geometry)
        with self._lock:
            self._aoi_sequence += 1
            now = self.clock()
            record = AoiRecord(
                aoi_id=f'aoi-{self._aoi_sequence}',
                owner_id=owner_id,
                name=clean_name,
                description=description.strip() if description else None,
                geometry=validated_geometry,
                revision=1,
                created_at=now,
                updated_at=now,
            )
            self._aois[record.aoi_id] = record
            return record

    def update_aoi(
        self,
        owner_id: str,
        aoi_id: str,
        name: str | None,
        description: str | None,
        description_provided: bool,
        geometry: Geometry | None,
    ) -> AoiRecord:
        """Update a saved AOI and advance its revision.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.
            aoi_id(str): saved AOI identifier.
            name(str | None): replacement name when supplied.
            description(str | None): replacement description when supplied.
            description_provided(bool): whether the caller explicitly supplied a description.
            geometry(Geometry | None): replacement geometry when supplied.

        Returns:
        -------
            AoiRecord: updated AOI.

        """
        with self._lock:
            record = self.get_aoi(owner_id, aoi_id)
            if name is not None:
                if not name.strip():
                    raise DemoError(status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_AOI', 'An AOI name cannot be empty.')
                record.name = name.strip()
            if description_provided:
                record.description = description.strip() if description else None
            if geometry is not None:
                record.geometry = validate_geometry(geometry)
            record.revision += 1
            record.updated_at = self.clock()
            return record

    def delete_aoi(self, owner_id: str, aoi_id: str) -> None:
        """Delete one owner-scoped AOI without changing request snapshots.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.
            aoi_id(str): saved AOI identifier.

        """
        with self._lock:
            self.get_aoi(owner_id, aoi_id)
            del self._aois[aoi_id]

    def create_request(
        self,
        owner_id: str,
        product_id: str,
        aoi_id: str,
        start_month: str,
        end_month: str,
    ) -> RequestRecord:
        """Persist a PREPARING request with an immutable AOI geometry snapshot.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.
            product_id(str): selected product identifier.
            aoi_id(str): selected saved AOI identifier.
            start_month(str): inclusive UTC month in YYYY-MM form.
            end_month(str): inclusive UTC month in YYYY-MM form.

        Returns:
        -------
            RequestRecord: newly created PREPARING request.

        """
        self.get_product(product_id)
        self._validate_period(start_month, end_month)
        with self._lock:
            aoi = self.get_aoi(owner_id, aoi_id)
            self._request_sequence += 1
            now = self.clock()
            record = RequestRecord(
                request_id=f'request-{self._request_sequence}',
                owner_id=owner_id,
                product_id=product_id,
                aoi_id=aoi.aoi_id,
                aoi_revision=aoi.revision,
                aoi_name=aoi.name,
                geometry_snapshot=_copy_geometry(aoi.geometry),
                start_month=start_month,
                end_month=end_month,
                state=REQUEST_PREPARING,
                created_at=now,
                updated_at=now,
                proposal_ready_at=now + timedelta(seconds=self.settings.preparation_delay_seconds),
            )
            self._requests[record.request_id] = record
            return record

    def list_requests(self, owner_id: str) -> list[RequestRecord]:
        """Return current owner-scoped request state after applying transitions.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.

        Returns:
        -------
            list[RequestRecord]: latest request state ordered by creation time.

        """
        with self._lock:
            records = [record for record in self._requests.values() if record.owner_id == owner_id]
            for record in records:
                self._advance_request(record)
            return sorted(records, key=lambda record: record.created_at, reverse=True)

    def get_request(self, owner_id: str, request_id: str) -> RequestRecord:
        """Return current request state after applying asynchronous transitions.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.
            request_id(str): request identifier.

        Returns:
        -------
            RequestRecord: authoritative current request state.

        """
        with self._lock:
            record = self._require_request(owner_id, request_id)
            self._advance_request(record)
            return record

    def confirm_request(self, owner_id: str, request_id: str) -> RequestRecord:
        """Atomically debit demo credits and launch an approved proposal.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.
            request_id(str): proposed request identifier.

        Returns:
        -------
            RequestRecord: request now admitted for execution.

        Raises:
        ------
            DemoError: when the proposal is not confirmable or credits are insufficient.

        """
        with self._lock:
            record = self._require_request(owner_id, request_id)
            self._advance_request(record)
            if record.state != REQUEST_PROPOSED:
                raise DemoError(status.HTTP_409_CONFLICT, 'INVALID_STATE', 'Only a proposed request can be confirmed.')
            if self.settings.failure_mode == FAILURE_INSUFFICIENT_CREDITS:
                available_credits = 0
            else:
                available_credits = self._balances.setdefault(owner_id, self.settings.starting_credits)
            cost = record.estimated_credits if record.estimated_credits is not None else self.settings.request_cost
            if available_credits < cost:
                raise DemoError(
                    status.HTTP_409_CONFLICT,
                    'INSUFFICIENT_CREDITS',
                    'The current demo credit balance cannot admit this request.',
                )
            self._balances[owner_id] = available_credits - cost
            now = self.clock()
            record.actual_credits = cost
            record.execution_started_at = now
            record.state = REQUEST_IN_EXECUTION
            record.updated_at = now
            record.message = 'Demo execution was admitted. No EO computation is running.'
            return record

    def cancel_request(self, owner_id: str, request_id: str) -> RequestRecord:
        """Cancel a non-completed request without refunding demo credits.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.
            request_id(str): request identifier.

        Returns:
        -------
            RequestRecord: cancelled request.

        Raises:
        ------
            DemoError: when the request already completed.

        """
        with self._lock:
            record = self._require_request(owner_id, request_id)
            self._advance_request(record)
            if record.state == REQUEST_COMPLETED:
                raise DemoError(status.HTTP_409_CONFLICT, 'INVALID_STATE', 'A completed request cannot be cancelled.')
            record.state = REQUEST_CANCELLED
            record.updated_at = self.clock()
            record.message = 'Request cancelled. Demo credit refunds are not modelled in M0.'
            return record

    def get_balance(self, owner_id: str) -> int:
        """Return current demo credits or a simulated availability failure.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.

        Returns:
        -------
            int: available demo credits.

        Raises:
        ------
            DemoError: when the deterministic scenario marks balance unavailable.

        """
        if self.settings.failure_mode == FAILURE_CREDITS_UNAVAILABLE:
            raise DemoError(
                status.HTTP_503_SERVICE_UNAVAILABLE, 'CREDITS_UNAVAILABLE', 'The demo credit balance is unavailable.'
            )
        with self._lock:
            return self._balances.setdefault(owner_id, self.settings.starting_credits)

    def get_result_map(self, owner_id: str, result_id: str) -> dict[str, Any]:
        """Return a labelled synthetic representation for one completed result.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.
            result_id(str): completed result identifier.

        Returns:
        -------
            dict[str, Any]: synthetic map overlay descriptor.

        """
        with self._lock:
            result = self._require_result(owner_id, result_id)
            if self.settings.failure_mode == FAILURE_RESULT_UNAVAILABLE:
                raise DemoError(
                    status.HTTP_404_NOT_FOUND, 'RESULT_UNAVAILABLE', 'The demo result representation is unavailable.'
                )
            return {
                'url': self._map_data_url(result.product_id),
                'bounds': geometry_bounds(result.geometry_snapshot),
                'kind': 'DEMO_PLACEHOLDER',
                'note': 'Synthetic display placeholder. This is not a computed scientific product.',
                'result_id': result.result_id,
            }

    def get_result_series(self, owner_id: str, result_id: str) -> dict[str, Any]:
        """Return an explicit placeholder instead of fabricated analytical values.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.
            result_id(str): completed result identifier.

        Returns:
        -------
            dict[str, Any]: result-series representation with no observations.

        """
        with self._lock:
            result = self._require_result(owner_id, result_id)
            return {
                'result_id': result.result_id,
                'points': [],
                'note': 'No analytical series is available in the deterministic M0 demo.',
            }

    def get_result_lineage(self, owner_id: str, result_id: str) -> dict[str, Any]:
        """Return the minimum reliable provenance available for a demo result.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.
            result_id(str): completed result identifier.

        Returns:
        -------
            dict[str, Any]: retained request and AOI snapshot provenance.

        """
        with self._lock:
            result = self._require_result(owner_id, result_id)
            request = self._requests[result.request_id]
            return {
                'result_id': result.result_id,
                'request_id': request.request_id,
                'product_id': result.product_id,
                'aoi_name': result.aoi_name,
                'geometry_snapshot': _copy_geometry(result.geometry_snapshot),
                'note': 'Demo lineage contains request metadata only; no real source assets were used.',
            }

    def create_delivery(self, owner_id: str, result_id: str) -> DeliveryRecord:
        """Create an asynchronous delivery for a completed demo result.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.
            result_id(str): completed result identifier.

        Returns:
        -------
            DeliveryRecord: newly persisted PREPARING delivery.

        """
        with self._lock:
            self._require_result(owner_id, result_id)
            self._delivery_sequence += 1
            now = self.clock()
            record = DeliveryRecord(
                delivery_id=f'delivery-{self._delivery_sequence}',
                result_id=result_id,
                owner_id=owner_id,
                state=DELIVERY_PREPARING,
                created_at=now,
                updated_at=now,
                ready_at=now + timedelta(seconds=self.settings.delivery_delay_seconds),
            )
            self._deliveries[record.delivery_id] = record
            return record

    def get_delivery(self, owner_id: str, delivery_id: str) -> DeliveryRecord:
        """Return current delivery state after applying the deterministic transition.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.
            delivery_id(str): delivery identifier.

        Returns:
        -------
            DeliveryRecord: authoritative current delivery state.

        """
        with self._lock:
            record = self._deliveries.get(delivery_id)
            if record is None or record.owner_id != owner_id:
                raise DemoError(
                    status.HTTP_404_NOT_FOUND, 'DELIVERY_NOT_FOUND', 'The requested delivery was not found.'
                )
            if record.state == DELIVERY_PREPARING and self.clock() >= record.ready_at:
                record.updated_at = self.clock()
                if self.settings.failure_mode == FAILURE_DELIVERY:
                    record.state = DELIVERY_FAILED
                    record.message = 'The deterministic demo delivery failed.'
                else:
                    record.state = DELIVERY_READY
                    record.message = 'Synthetic demo artifact ready for download.'
            return record

    def serialize_aoi(self, record: AoiRecord) -> dict[str, Any]:
        """Return one public AOI payload.

        Args:
        ----
            record(AoiRecord): stored AOI record.

        Returns:
        -------
            dict[str, Any]: public AOI payload.

        """
        return {
            'aoi_id': record.aoi_id,
            'name': record.name,
            'description': record.description,
            'geometry': _copy_geometry(record.geometry),
            'revision': record.revision,
            'created_at': record.created_at.isoformat(),
            'updated_at': record.updated_at.isoformat(),
        }

    def serialize_request(self, record: RequestRecord) -> dict[str, Any]:
        """Return one public request payload with immutable AOI provenance.

        Args:
        ----
            record(RequestRecord): stored request record.

        Returns:
        -------
            dict[str, Any]: public request payload.

        """
        proposal = None
        if record.estimated_credits is not None:
            proposal = {
                'feasible': True,
                'estimated_credits': record.estimated_credits,
                'currency': 'credits',
                'conditions': ['Deterministic M0 demo proposal.'],
                'limitations': ['No real EO acquisition, processing, or validation is performed.'],
            }
        failure = None
        if record.failure_stage is not None:
            failure = {
                'stage': record.failure_stage,
                'message': record.message,
            }
        return {
            'request_id': record.request_id,
            'state': record.state,
            'product_id': record.product_id,
            'aoi_id': record.aoi_id,
            'source_aoi_revision': record.aoi_revision,
            'aoi_name': record.aoi_name,
            'geometry_snapshot': _copy_geometry(record.geometry_snapshot),
            'start_month': record.start_month,
            'end_month': record.end_month,
            'proposal': proposal,
            'actual_credits': record.actual_credits,
            'result_id': record.result_id,
            'message': record.message,
            'failure': failure,
            'created_at': record.created_at.isoformat(),
            'updated_at': record.updated_at.isoformat(),
        }

    def serialize_delivery(self, record: DeliveryRecord) -> dict[str, Any]:
        """Return one public delivery payload and inline data URL when ready.

        Args:
        ----
            record(DeliveryRecord): stored delivery record.

        Returns:
        -------
            dict[str, Any]: public delivery payload.

        """
        download_url = self._artifact_data_url(record.result_id) if record.state == DELIVERY_READY else None
        return {
            'delivery_id': record.delivery_id,
            'state': record.state,
            'download_url': download_url,
            'message': record.message,
            'created_at': record.created_at.isoformat(),
            'updated_at': record.updated_at.isoformat(),
        }

    def _advance_request(self, record: RequestRecord) -> None:
        """Apply elapsed-time transitions while holding the store lock.

        Args:
        ----
            record(RequestRecord): request to transition.

        """
        now = self.clock()
        if record.state == REQUEST_PREPARING and now >= record.proposal_ready_at:
            record.updated_at = now
            if self.settings.failure_mode == FAILURE_PREPARATION:
                record.state = REQUEST_FAILED
                record.failure_stage = 'PREPARATION'
                record.message = 'The deterministic feasibility/proposal stage failed.'
                return
            record.state = REQUEST_PROPOSED
            record.estimated_credits = self.settings.request_cost
            record.message = 'Demo proposal ready. Confirm to simulate execution admission.'
            return
        if (
            record.state == REQUEST_IN_EXECUTION
            and record.execution_started_at is not None
            and now >= record.execution_started_at + timedelta(seconds=self.settings.execution_delay_seconds)
        ):
            record.updated_at = now
            if self.settings.failure_mode == FAILURE_EXECUTION:
                record.state = REQUEST_FAILED
                record.failure_stage = 'EXECUTION'
                record.message = 'The deterministic execution stage failed.'
                return
            record.state = REQUEST_COMPLETED
            self._result_sequence += 1
            result = ResultRecord(
                result_id=f'result-{self._result_sequence}',
                request_id=record.request_id,
                owner_id=record.owner_id,
                product_id=record.product_id,
                aoi_name=record.aoi_name,
                geometry_snapshot=_copy_geometry(record.geometry_snapshot),
                created_at=now,
            )
            self._results[result.result_id] = result
            record.result_id = result.result_id
            record.message = 'Demo result available. It is synthetic and not scientifically computed.'

    def _require_request(self, owner_id: str, request_id: str) -> RequestRecord:
        """Return an owner-scoped request or a caller-safe not-found error.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.
            request_id(str): request identifier.

        Returns:
        -------
            RequestRecord: owned request record.

        Raises:
        ------
            DemoError: when the request is absent or not owned.

        """
        record = self._requests.get(request_id)
        if record is None or record.owner_id != owner_id:
            raise DemoError(
                status.HTTP_404_NOT_FOUND, 'REQUEST_NOT_FOUND', 'The requested analysis request was not found.'
            )
        return record

    def _require_result(self, owner_id: str, result_id: str) -> ResultRecord:
        """Return an owner-scoped result or a caller-safe not-found error.

        Args:
        ----
            owner_id(str): trusted demo owner identifier.
            result_id(str): result identifier.

        Returns:
        -------
            ResultRecord: owned completed result.

        Raises:
        ------
            DemoError: when the result is absent or not owned.

        """
        result = self._results.get(result_id)
        if result is None or result.owner_id != owner_id:
            raise DemoError(status.HTTP_404_NOT_FOUND, 'RESULT_NOT_FOUND', 'The requested result was not found.')
        return result

    def _validate_period(self, start_month: str, end_month: str) -> None:
        """Validate an inclusive month range.

        Args:
        ----
            start_month(str): inclusive start month.
            end_month(str): inclusive end month.

        Raises:
        ------
            DemoError: when either month is invalid or the range is inverted.

        """
        if not MONTH_PATTERN.fullmatch(start_month) or not MONTH_PATTERN.fullmatch(end_month):
            raise DemoError(status.HTTP_422_UNPROCESSABLE_ENTITY, 'INVALID_PERIOD', 'Months must use YYYY-MM format.')
        if start_month > end_month:
            raise DemoError(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                'INVALID_PERIOD',
                'The start month must be on or before the end month.',
            )

    def _build_products(self) -> dict[str, dict[str, Any]]:
        """Build deterministic public descriptors without asserting scientific availability.

        Returns
        -------
            dict[str, dict[str, Any]]: product definitions keyed by identifier.

        """
        products = (
            (
                'ndvi',
                'NDVI',
                'Demo Normalized Difference Vegetation Index descriptor.',
                'L1',
                'Vegetation',
                '10 m',
                '5 days',
                ['Red reflectance', 'Near-infrared reflectance', 'Quality mask'],
            ),
            (
                'ndwi',
                'NDWI',
                'Demo Normalized Difference Water Index descriptor.',
                'L1',
                'Water',
                '10 m',
                '5 days',
                ['Green reflectance', 'Near-infrared reflectance', 'Quality mask'],
            ),
            (
                'lst',
                'LST',
                'Demo Land Surface Temperature descriptor.',
                'L3',
                'Land',
                '30 m',
                '5 days',
                ['Thermal radiance', 'Emissivity estimate', 'Atmospheric inputs'],
            ),
            (
                'ch4',
                'CH4',
                'Demo methane-emission proxy descriptor.',
                'L3',
                'Atmosphere',
                '100 m',
                '10 days',
                ['Atmospheric spectral observations', 'Quality mask'],
            ),
        )
        return {
            product_id: {
                'product_id': product_id,
                'name': name,
                'description': description,
                'level': level,
                'category': category,
                'native_resolution': resolution,
                'temporal_resolution': revisit,
                'availability': 'DEMO',
                'validation_status': 'NOT_VALIDATED',
                'inputs': inputs,
                'parameters': [],
                'limitations': [
                    'This is a deterministic M0 descriptor.',
                    'No EO acquisition, scientific computation, or validation is implemented.',
                ],
            }
            for product_id, name, description, level, category, resolution, revisit, inputs in products
        }

    def _seed_aois(self) -> None:
        """Seed the three requested geographic references for the demo library.

        Returns
        -------
            None

        """
        seeds = (
            (
                'Toulouse study area',
                'Demo AOI around Toulouse, France.',
                [[1.38, 43.56], [1.49, 43.56], [1.49, 43.66], [1.38, 43.66], [1.38, 43.56]],
            ),
            (
                'Guanacaste study area',
                'Demo AOI in Guanacaste, Costa Rica.',
                [[-85.0, 10.35], [-84.82, 10.35], [-84.82, 10.5], [-85.0, 10.5], [-85.0, 10.35]],
            ),
            (
                'Cajamarca study area',
                'Demo AOI near Cajamarca, Peru.',
                [[-78.62, -7.2], [-78.45, -7.2], [-78.45, -7.05], [-78.62, -7.05], [-78.62, -7.2]],
            ),
        )
        for name, description, ring in seeds:
            self.create_aoi(
                DEMO_OWNER_ID,
                name,
                description,
                {'type': 'Polygon', 'coordinates': [ring]},
            )

    def _map_data_url(self, product_id: str) -> str:
        """Build a synthetic SVG data URL for an explicit demo overlay.

        Args:
        ----
            product_id(str): product shown by the synthetic overlay.

        Returns:
        -------
            str: browser-safe SVG data URL.

        """
        svg = (
            "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>"
            "<defs><pattern id='h' width='24' height='24' patternUnits='userSpaceOnUse' "
            "patternTransform='rotate(45)'>"
            "<rect width='24' height='24' fill='#1b6f6b' fill-opacity='.42'/>"
            "<rect width='10' height='24' fill='#35c6c0' fill-opacity='.36'/>"
            "</pattern></defs><rect width='600' height='400' fill='url(#h)'/>"
            "<text x='300' y='190' text-anchor='middle' fill='#eaf2f2' font-family='sans-serif' "
            f"font-size='30'>DEMO {product_id.upper()}</text>"
            "<text x='300' y='225' text-anchor='middle' fill='#eaf2f2' font-family='sans-serif' "
            "font-size='16'>Not a scientific result</text>"
            '</svg>'
        )
        return f'data:image/svg+xml,{quote(svg)}'

    def _artifact_data_url(self, result_id: str) -> str:
        """Build a local download URL for a clearly labelled demo GeoJSON artifact.

        Args:
        ----
            result_id(str): completed result identifier.

        Returns:
        -------
            str: base64 data URL for a synthetic GeoJSON artifact.

        """
        result = self._results[result_id]
        payload = {
            'type': 'FeatureCollection',
            'properties': {
                'note': 'MEOGAP DEMO - synthetic artifact, not a scientific product',
                'result_id': result.result_id,
                'request_id': result.request_id,
                'product_id': result.product_id,
            },
            'features': [
                {
                    'type': 'Feature',
                    'properties': {'aoi_name': result.aoi_name},
                    'geometry': result.geometry_snapshot,
                }
            ],
        }
        encoded = base64.b64encode(json.dumps(payload, separators=(',', ':')).encode('utf-8')).decode('ascii')
        return f'data:application/geo+json;base64,{encoded}'
