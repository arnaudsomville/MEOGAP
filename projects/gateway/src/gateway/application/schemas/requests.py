"""Analysis-request models for the public Gateway."""

from __future__ import annotations

from typing import Literal

from meogap.scientific.products import SourceMission
from pydantic import BaseModel, ConfigDict, Field

from gateway.application.schemas.aoi import AoiGeometry
from gateway.application.schemas.common import (
    AnalysisPeriodRequest,
    FailureResponse,
    SyntheticProvenance,
    TemporalFrequency,
)


class CostEstimateResponse(BaseModel):
    """Deterministic cost estimate and admission decision."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

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


class AnalysisRequestCreateRequest(BaseModel):
    """Payload used to submit an asynchronous analysis request."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    product_id: str
    aoi_id: str
    period: AnalysisPeriodRequest
    spatial_resolution_m: int | None = Field(default=None, ge=1)
    sources: list[SourceMission] | None = None
    temporal_frequency: TemporalFrequency | None = None


class AnalysisRequestResponse(BaseModel):
    """Public analysis request lifecycle state and retained spatial snapshot."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    request_id: str
    state: Literal['queued', 'processing', 'succeeded', 'failed', 'cancelled']
    product_id: str
    aoi_id: str
    source_aoi_revision: int
    aoi_name: str
    geometry_snapshot: AoiGeometry
    start_month: str
    end_month: str
    requested_sources: list[str]
    requested_spatial_resolution_m: int | None
    temporal_frequency: TemporalFrequency | None
    provenance: SyntheticProvenance
    estimated_credits: int | None
    actual_credits: int | None
    result_id: str | None
    message: str | None
    failure: FailureResponse | None
    created_at: str
    updated_at: str


class AnalysisRequestListResponse(BaseModel):
    """Public collection of caller-owned analysis requests."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    items: list[AnalysisRequestResponse]
