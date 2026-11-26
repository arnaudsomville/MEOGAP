"""Owner-scoped AOI routes owned by the public Gateway."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response, status

from gateway.application.routes.dependencies import demo_owner
from gateway.application.schemas import (
    COMMON_UNAUTHORIZED,
    NOT_FOUND_ERRORS,
    VALIDATION_ERRORS,
    AoiCreateRequest,
    AoiListResponse,
    AoiResponse,
    AoiUpdateRequest,
)
from gateway.core.demo import DemoStore
from gateway.core.demo.models import AoiListView, AoiView


def register_aoi_routes(router: APIRouter, store: DemoStore) -> None:
    """Register owner-scoped AOI routes."""

    @router.get(
        '/api/v1/aois',
        operation_id='gateway_list_user_aois',
        summary='List AOIs owned by the authenticated user.',
        response_model=AoiListResponse,
        responses=COMMON_UNAUTHORIZED,
    )
    def list_aois(owner_id: str = Depends(demo_owner)) -> AoiListView:
        """Return all caller-owned saved AOIs."""
        return store.list_aois(owner_id)

    @router.post(
        '/api/v1/aois',
        operation_id='gateway_create_user_aoi',
        summary='Create an AOI owned by the authenticated user.',
        response_model=AoiResponse,
        status_code=status.HTTP_201_CREATED,
        responses=VALIDATION_ERRORS,
    )
    def create_aoi(payload: AoiCreateRequest, owner_id: str = Depends(demo_owner)) -> AoiView:
        """Create one caller-owned AOI."""
        return store.create_aoi(owner_id, payload.name, payload.description, payload.geometry.model_dump())

    @router.get(
        '/api/v1/aois/{aoi_id}',
        operation_id='gateway_get_user_aoi',
        summary='Retrieve an AOI owned by the authenticated user.',
        response_model=AoiResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_aoi(aoi_id: str, owner_id: str = Depends(demo_owner)) -> AoiView:
        """Return one caller-owned AOI."""
        return store.get_aoi(owner_id, aoi_id)

    @router.patch(
        '/api/v1/aois/{aoi_id}',
        operation_id='gateway_update_user_aoi',
        summary='Update an owned AOI and increment its revision.',
        response_model=AoiResponse,
        responses=VALIDATION_ERRORS,
    )
    def update_aoi(
        aoi_id: str,
        payload: AoiUpdateRequest,
        owner_id: str = Depends(demo_owner),
    ) -> AoiView:
        """Update one caller-owned AOI."""
        return store.update_aoi(
            owner_id,
            aoi_id,
            payload.name,
            payload.description,
            description_provided='description' in payload.model_fields_set,
            geometry=payload.geometry.model_dump() if payload.geometry else None,
        )

    @router.delete(
        '/api/v1/aois/{aoi_id}',
        operation_id='gateway_delete_user_aoi',
        summary='Delete an owned AOI. Existing request snapshots are unaffected.',
        status_code=status.HTTP_204_NO_CONTENT,
        responses=NOT_FOUND_ERRORS,
    )
    def delete_aoi(aoi_id: str, owner_id: str = Depends(demo_owner)) -> Response:
        """Delete one caller-owned AOI."""
        store.delete_aoi(owner_id, aoi_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
