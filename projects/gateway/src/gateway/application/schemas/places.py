"""Place search and recommendation models for the public Gateway."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class PlaceSuggestion(BaseModel):
    """One populated place suggestion."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    place_id: int
    name: str
    country: str
    admin1: str | None
    latitude: float
    longitude: float
    population: int
    feature_code: str
    match_type: str


class PlaceSuggestionListResponse(BaseModel):
    """Place suggestion collection."""

    model_config = ConfigDict(extra='forbid', from_attributes=True)

    items: list[PlaceSuggestion]
