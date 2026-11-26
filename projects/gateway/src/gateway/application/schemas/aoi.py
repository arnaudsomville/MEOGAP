"""AOI request/response models for the public Gateway."""

from __future__ import annotations

from typing import Any, Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from gateway.application.schemas.common import DESCRIPTION_MAX_LENGTH, NAME_MAX_LENGTH


class AoiGeometry(BaseModel):
    """Supported polygonal GeoJSON geometry supplied by the public client."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    type: Literal['Polygon', 'MultiPolygon']
    coordinates: list[Any]


class AoiResponse(BaseModel):
    """Public owner-scoped AOI representation."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    aoi_id: str
    name: str
    description: str | None
    geometry: AoiGeometry
    revision: int
    created_at: str
    updated_at: str


class AoiListResponse(BaseModel):
    """Public AOI collection representation."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    items: list[AoiResponse]


class AoiCreateRequest(BaseModel):
    """Payload for one new saved AOI."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX_LENGTH)
    geometry: AoiGeometry


class AoiUpdateRequest(BaseModel):
    """Partial payload for an existing saved AOI."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    name: str | None = Field(default=None, min_length=1, max_length=NAME_MAX_LENGTH)
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX_LENGTH)
    geometry: AoiGeometry | None = None

    @model_validator(mode='after')
    def require_update(self) -> Self:
        """Reject an empty PATCH payload."""
        if not self.model_fields_set:
            raise ValueError('At least one AOI field must be supplied.')
        return self
