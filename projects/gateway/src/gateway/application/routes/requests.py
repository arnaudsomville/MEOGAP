"""Analysis-request routes owned by the public Gateway."""

from __future__ import annotations

from fastapi import APIRouter, Depends, status

from gateway.application.routes.dependencies import demo_owner
from gateway.application.schemas import (
    COMMON_UNAUTHORIZED,
    CONFLICT_ERRORS,
    NOT_FOUND_ERRORS,
    AnalysisRequestCreateRequest,
    AnalysisRequestListResponse,
    AnalysisRequestResponse,
    CostEstimateResponse,
)
from gateway.core.demo import DemoStore
from gateway.core.demo.models import CostEstimate, RequestListView, RequestView


def register_request_routes(router: APIRouter, store: DemoStore) -> None:
    """Register asynchronous analysis-request routes."""

    @router.post(
        '/api/v1/analysis-requests/estimate',
        operation_id='gateway_estimate_analysis_request',
        summary='Estimate cost and admission for an analysis request.',
        response_model=CostEstimateResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def estimate_analysis_request(
        payload: AnalysisRequestCreateRequest,
        owner_id: str = Depends(demo_owner),
    ) -> CostEstimate:
        """Return the deterministic estimate and admission decision."""
        return store.estimate_request(
            owner_id,
            payload.product_id,
            payload.aoi_id,
            payload.period.start_month,
            payload.period.end_month,
            spatial_resolution_m=payload.spatial_resolution_m,
            sources=payload.sources,
            temporal_frequency=payload.temporal_frequency,
        )

    @router.post(
        '/api/v1/analysis-requests',
        operation_id='gateway_create_analysis_request',
        summary='Submit an analysis request and return its queued state.',
        response_model=AnalysisRequestResponse,
        status_code=status.HTTP_201_CREATED,
        responses=NOT_FOUND_ERRORS,
    )
    def create_analysis_request(
        payload: AnalysisRequestCreateRequest,
        owner_id: str = Depends(demo_owner),
    ) -> RequestView:
        """Create a queued request immediately; no manual confirmation is required."""
        record = store.create_request(
            owner_id,
            payload.product_id,
            payload.aoi_id,
            payload.period.start_month,
            payload.period.end_month,
            spatial_resolution_m=payload.spatial_resolution_m,
            sources=payload.sources,
            temporal_frequency=payload.temporal_frequency,
        )
        return store.request_view(record)

    @router.get(
        '/api/v1/analysis-requests',
        operation_id='gateway_list_analysis_requests',
        summary='List analysis requests.',
        response_model=AnalysisRequestListResponse,
        responses=COMMON_UNAUTHORIZED,
    )
    def list_analysis_requests(owner_id: str = Depends(demo_owner)) -> RequestListView:
        """Return all caller-owned analysis requests in their current state."""
        return store.list_request_views(owner_id)

    @router.get(
        '/api/v1/analysis-requests/{request_id}',
        operation_id='gateway_get_analysis_request',
        summary='Retrieve the authoritative request state.',
        response_model=AnalysisRequestResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_analysis_request(request_id: str, owner_id: str = Depends(demo_owner)) -> RequestView:
        """Return the authoritative lifecycle state for one request."""
        return store.get_request_view(owner_id, request_id)

    @router.post(
        '/api/v1/analysis-requests/{request_id}/cancel',
        operation_id='gateway_cancel_analysis_request',
        summary='Request analysis cancellation.',
        response_model=AnalysisRequestResponse,
        responses=CONFLICT_ERRORS,
    )
    def cancel_analysis_request(request_id: str, owner_id: str = Depends(demo_owner)) -> RequestView:
        """Cancel a queued or processing request."""
        return store.cancel_request_view(owner_id, request_id)
