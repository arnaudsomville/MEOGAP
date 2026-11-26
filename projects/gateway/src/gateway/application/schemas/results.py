"""Result, series and delivery models for the public Gateway."""

from __future__ import annotations

from typing import Any

from meogap.scientific.products import ProductValidationStatus
from pydantic import BaseModel, ConfigDict, Field

from gateway.application.schemas.aoi import AoiGeometry
from gateway.application.schemas.common import AnalysisPeriodRequest, SyntheticProvenance, TemporalFrequency


class LegendStop(BaseModel):
    """One value/color break in a display colour map."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    value: float
    color: str


class ResultLegend(BaseModel):
    """Colour-map metadata required to interpret a display representation."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    title: str
    units: str
    min: float
    max: float
    stops: list[LegendStop]


class ResultMapFrame(BaseModel):
    """One mock display frame with its request-period date and reused visual period."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    frame_id: str
    url: str
    period_start: str
    period_end: str
    label: str
    visual_period_start: str
    visual_period_end: str
    is_reused_visual: bool


class ResultMapResponse(BaseModel):
    """Map overlay descriptor for a synthetic or bundled completed result."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    url: str | None
    bounds: list[list[float]]
    kind: str
    provenance: SyntheticProvenance
    note: str
    result_id: str
    request_id: str
    product_id: str
    result_version: str
    units: str
    validation_status: ProductValidationStatus
    quality_status: str
    quality_note: str
    legend: ResultLegend | None
    geotiff_url: str | None
    frames: list[ResultMapFrame]
    is_demo: bool


class SeriesParameter(BaseModel):
    """One available series parameter exposed by a result representation."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    name: str
    label: str
    units: str


class ResultDetailResponse(BaseModel):
    """Explicit result metadata and retained scope."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    result_id: str
    request_id: str
    product_id: str
    product_name: str
    result_version: str
    aoi_name: str
    geometry_snapshot: AoiGeometry
    start_month: str
    end_month: str
    units: str
    temporal_frequency: TemporalFrequency | None
    provenance: SyntheticProvenance
    available_parameters: list[SeriesParameter]
    validation_status: ProductValidationStatus
    quality_status: str
    quality_note: str
    provenance_note: str
    is_demo: bool


class ResultSeriesQueryRequest(BaseModel):
    """Bounded spatial/temporal series request for one result."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    geometry_wkt: str = Field(min_length=1)
    crs: str = Field(min_length=1)
    period: AnalysisPeriodRequest
    parameters: list[str] | None = None


class ResultSeriesPoint(BaseModel):
    """One explicit period value, gap, mask or invalid observation."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    parameter: str
    period_start: str
    period_end: str
    value: float | None
    unit: str
    state: str
    quality_status: str
    coverage: float | None
    note: str | None


class ResultSeriesResponse(BaseModel):
    """Legacy empty series placeholder retained for compatibility."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    result_id: str
    points: list[Any]
    note: str


class ResultSeriesQueryResponse(BaseModel):
    """Structured deterministic series explicitly marked as demonstration data."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    result_id: str
    product_id: str
    geometry_wkt: str
    crs: str
    selection_type: str
    aggregation_method: str
    selection_area_km2: float
    units: str
    available_parameters: list[SeriesParameter]
    selected_parameters: list[str]
    quality_status: str
    quality_note: str
    coverage: float | None
    provenance: SyntheticProvenance
    is_demo: bool
    note: str
    points: list[ResultSeriesPoint]


class ResultLineageResponse(BaseModel):
    """Minimal reliable M0 provenance for one result."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    result_id: str
    request_id: str
    product_id: str
    aoi_name: str
    geometry_snapshot: AoiGeometry
    provenance: SyntheticProvenance
    note: str


class DeliveryCreateRequest(BaseModel):
    """Delivery representation requested for a completed result."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    kind: str = Field(min_length=1)


class DeliveryResponse(BaseModel):
    """Asynchronous deterministic demo delivery state."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    delivery_id: str
    kind: str
    state: str
    download_url: str | None
    message: str | None
    created_at: str
    updated_at: str
