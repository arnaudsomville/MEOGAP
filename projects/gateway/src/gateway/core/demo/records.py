"""In-memory records owned by the deterministic M0 Gateway demo state."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any

Geometry = dict[str, Any]


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
    """One analysis request and its immutable spatial snapshot.

    The request carries the selection-free request geometry snapshot. Result
    geometry and per-analysis selection geometry are separate records.
    """

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
    estimated_credits: int | None = None
    actual_credits: int | None = None
    processing_started_at: datetime | None = None
    result_id: str | None = None
    message: str | None = None
    failure_stage: str | None = None
    requested_sources: tuple[str, ...] = ()
    requested_spatial_resolution_m: int | None = None
    temporal_frequency: str | None = None


@dataclass
class ResultRecord:
    """One completed deterministic demo result."""

    result_id: str
    request_id: str
    owner_id: str
    product_id: str
    aoi_name: str
    geometry_snapshot: Geometry
    start_month: str
    end_month: str
    created_at: datetime


@dataclass
class DeliveryRecord:
    """One asynchronous demo delivery resource."""

    delivery_id: str
    result_id: str
    owner_id: str
    kind: str
    state: str
    created_at: datetime
    updated_at: datetime
    ready_at: datetime
    message: str | None = None
