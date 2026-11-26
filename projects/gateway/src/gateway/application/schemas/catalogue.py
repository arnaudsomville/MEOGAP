"""Catalogue request/response models for the public Gateway."""

from __future__ import annotations

from typing import Literal

from meogap.scientific.products import (
    ProductAvailability,
    ProductCategory,
    ProductValidationStatus,
    SourceMission,
)
from pydantic import BaseModel, ConfigDict

from gateway.application.schemas.common import SyntheticProvenance, TemporalFrequency


class ProductPreview(BaseModel):
    """Local illustrative preview metadata owned by the product descriptor."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    url: str
    alt: str
    attribution: str | None


class ProductResponse(BaseModel):
    """Public deterministic product descriptor."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    product_id: str
    name: str
    description: str
    level: str
    category: ProductCategory
    native_resolution: str
    temporal_resolution: str
    units: str
    availability: ProductAvailability
    provenance: SyntheticProvenance
    validation_status: ProductValidationStatus
    inputs: list[str]
    parameters: list[str]
    limitations: list[str]
    supported_sources: list[SourceMission]
    supported_resolutions_m: list[int]
    supported_spatial_inputs: list[Literal['AOI']]
    supported_selection_geometries: list[Literal['POINT', 'POLYGON', 'RESULT_EXTENT']]
    supported_frequencies: list[TemporalFrequency]
    max_period_months: int
    documentation_status: str
    documentation_url: str | None
    preview: ProductPreview | None


class ProductListResponse(BaseModel):
    """Public product catalogue collection."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    items: list[ProductResponse]


class ProductRequirementsResponse(BaseModel):
    """Public deterministic product input requirements."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    product_id: str
    inputs: list[str]
    limitations: list[str]
    note: str


class SourceMissionInfo(BaseModel):
    """Compatible source mission with its declared operational metadata."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    source_id: SourceMission
    name: str
    provider: str
    instrument: str
    native_resolution: str
    temporal_resolution: str
    availability: str


class ProductMissionsResponse(BaseModel):
    """Compatible source missions for one product."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    product_id: str
    items: list[SourceMissionInfo]
