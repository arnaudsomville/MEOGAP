"""Place search and recommendation routes owned by the public Gateway."""

from __future__ import annotations

from fastapi import APIRouter, Query, status

from gateway.application.schemas import (
    COMMON_UNAUTHORIZED,
    PlaceSuggestionListResponse,
)
from gateway.core.demo import DemoError
from gateway.core.demo.models import PlaceListView
from gateway.core.places import DEFAULT_LIMIT, MAX_LIMIT, PlaceDatabase


def register_place_routes(router: APIRouter, places: PlaceDatabase) -> None:
    """Register local populated-place search and recommendation routes."""

    @router.get(
        '/api/v1/places/suggestions',
        operation_id='gateway_list_place_suggestions',
        summary='Search populated places or recommend places near a map position.',
        response_model=PlaceSuggestionListResponse,
        responses=COMMON_UNAUTHORIZED,
    )
    def list_place_suggestions(
        q: str | None = Query(default=None, max_length=120, description='Place name, country or region.'),
        lat: float | None = Query(default=None, ge=-90, le=90, description='Map centre latitude.'),
        lng: float | None = Query(default=None, ge=-180, le=180, description='Map centre longitude.'),
        limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
    ) -> PlaceListView:
        """Return matching places, nearby places or popular places."""
        if (lat is None) != (lng is None):
            raise DemoError(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                'INVALID_COORDINATES',
                'Both lat and lng are required for nearby recommendations.',
            )
        if q and q.strip():
            return places.search(q, limit)
        if lat is not None and lng is not None:
            return places.recommend(lat, lng, limit)
        return places.popular(limit)
