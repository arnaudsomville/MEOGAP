"""Typed domain results returned by the deterministic Gateway demo services.

These dataclasses are internal/domain objects. Pydantic models remain confined
to the HTTP contract boundary and read these objects through attribute access.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from gateway.core.assets import LegendStop, ResultLegend
from gateway.core.product_previews import ProductPreview

__all__ = [
    'AccountView',
    'AoiListView',
    'AoiView',
    'CostEstimate',
    'CreditBalanceView',
    'DeliveryView',
    'FailureView',
    'LegacySeriesView',
    'LegendStop',
    'LineageView',
    'PlaceListView',
    'PlaceView',
    'ProductListView',
    'ProductMissionsView',
    'ProductRequirementsView',
    'ProductView',
    'RequestListView',
    'RequestView',
    'ResultDetailView',
    'ResultLegend',
    'ResultMapFrameView',
    'ResultMapView',
    'SeriesParameterView',
    'SeriesPointView',
    'SeriesView',
    'SourceMissionView',
]

Geometry = dict[str, Any]


@dataclass(frozen=True)
class ProductView:
    """One public product descriptor."""

    product_id: str
    name: str
    description: str
    level: str
    category: str
    native_resolution: str
    temporal_resolution: str
    units: str
    availability: str
    provenance: str
    validation_status: str
    inputs: list[str]
    parameters: list[str]
    limitations: list[str]
    supported_sources: list[str]
    supported_resolutions_m: list[int]
    supported_spatial_inputs: list[str]
    supported_selection_geometries: list[str]
    supported_frequencies: list[str]
    max_period_months: int
    documentation_status: str
    documentation_url: str | None
    preview: ProductPreview | None


@dataclass(frozen=True)
class ProductListView:
    """Public product collection."""

    items: list[ProductView]


@dataclass(frozen=True)
class ProductRequirementsView:
    """Public product input requirements."""

    product_id: str
    inputs: list[str]
    limitations: list[str]
    note: str


@dataclass(frozen=True)
class SourceMissionView:
    """Compatible source mission metadata."""

    source_id: str
    name: str
    provider: str
    instrument: str
    native_resolution: str
    temporal_resolution: str
    availability: str


@dataclass(frozen=True)
class ProductMissionsView:
    """Compatible source missions for one product."""

    product_id: str
    items: list[SourceMissionView]


@dataclass(frozen=True)
class AoiView:
    """Public owner-scoped AOI representation."""

    aoi_id: str
    name: str
    description: str | None
    geometry: Geometry
    revision: int
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class AoiListView:
    """Public AOI collection."""

    items: list[AoiView]


@dataclass(frozen=True)
class CostEstimate:
    """Deterministic cost estimate and admission decision."""

    product_id: str
    aoi_id: str
    start_month: str
    end_month: str
    feasible: bool
    estimated_credits: int
    currency: str
    balance: int | None
    balance_available: bool
    admission: str
    conditions: list[str]
    limitations: list[str]


@dataclass(frozen=True)
class FailureView:
    """Caller-safe request failure details."""

    stage: str
    message: str | None


@dataclass(frozen=True)
class RequestView:
    """Public request lifecycle state and retained spatial snapshot."""

    request_id: str
    state: str
    product_id: str
    aoi_id: str
    source_aoi_revision: int
    aoi_name: str
    geometry_snapshot: Geometry
    start_month: str
    end_month: str
    requested_sources: list[str]
    requested_spatial_resolution_m: int | None
    temporal_frequency: str | None
    provenance: str
    estimated_credits: int | None
    actual_credits: int | None
    result_id: str | None
    message: str | None
    failure: FailureView | None
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class RequestListView:
    """Public request collection."""

    items: list[RequestView]


@dataclass(frozen=True)
class ResultMapFrameView:
    """One mock display frame with its request-period and visual periods."""

    frame_id: str
    url: str
    period_start: str
    period_end: str
    label: str
    visual_period_start: str
    visual_period_end: str
    is_reused_visual: bool


@dataclass(frozen=True)
class ResultMapView:
    """Map overlay descriptor for a synthetic completed result."""

    url: str | None
    bounds: list[list[float]]
    kind: str
    provenance: str
    note: str
    result_id: str
    request_id: str
    product_id: str
    result_version: str
    units: str
    validation_status: str
    quality_status: str
    quality_note: str
    legend: ResultLegend | None
    geotiff_url: str | None
    frames: list[ResultMapFrameView]
    is_demo: bool


@dataclass(frozen=True)
class SeriesParameterView:
    """One available series parameter."""

    name: str
    label: str
    units: str


@dataclass(frozen=True)
class ResultDetailView:
    """Explicit result metadata and retained scope."""

    result_id: str
    request_id: str
    product_id: str
    product_name: str
    result_version: str
    aoi_name: str
    geometry_snapshot: Geometry
    start_month: str
    end_month: str
    units: str
    temporal_frequency: str | None
    provenance: str
    available_parameters: list[SeriesParameterView]
    validation_status: str
    quality_status: str
    quality_note: str
    provenance_note: str
    is_demo: bool


@dataclass(frozen=True)
class SeriesPointView:
    """One explicit period value, gap, mask or invalid observation."""

    parameter: str
    period_start: str
    period_end: str
    value: float | None
    unit: str
    state: str
    quality_status: str
    coverage: float | None
    note: str | None


@dataclass(frozen=True)
class SeriesView:
    """Structured deterministic series explicitly marked as demonstration data."""

    result_id: str
    product_id: str
    geometry_wkt: str
    crs: str
    selection_type: str
    aggregation_method: str
    selection_area_km2: float
    units: str
    available_parameters: list[SeriesParameterView]
    selected_parameters: list[str]
    quality_status: str
    quality_note: str
    coverage: float | None
    provenance: str
    is_demo: bool
    note: str
    points: list[SeriesPointView]


@dataclass(frozen=True)
class LegacySeriesView:
    """Legacy empty series placeholder."""

    result_id: str
    points: list[object]
    note: str


@dataclass(frozen=True)
class LineageView:
    """Minimal reliable synthetic provenance for one result."""

    result_id: str
    request_id: str
    product_id: str
    aoi_name: str
    geometry_snapshot: Geometry
    provenance: str
    note: str


@dataclass(frozen=True)
class PlaceView:
    """One populated place returned by the local place search."""

    place_id: int
    name: str
    country: str
    admin1: str | None
    latitude: float
    longitude: float
    population: int
    feature_code: str
    match_type: str


@dataclass(frozen=True)
class PlaceListView:
    """Place search or recommendation collection."""

    items: list[PlaceView]


@dataclass(frozen=True)
class DeliveryView:
    """Asynchronous deterministic delivery state."""

    delivery_id: str
    kind: str
    state: str
    download_url: str | None
    message: str | None
    created_at: str
    updated_at: str


@dataclass(frozen=True)
class AccountView:
    """Deterministic demo account identity."""

    user_id: str
    display_name: str
    session_status: str


@dataclass(frozen=True)
class CreditBalanceView:
    """Deterministic demo credit balance."""

    balance: int
    unit: str
    note: str
