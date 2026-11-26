"""Result, series and delivery routes owned by the public Gateway."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query, status

from gateway.application.routes.dependencies import demo_owner
from gateway.application.schemas import (
    NOT_FOUND_ERRORS,
    DeliveryCreateRequest,
    DeliveryResponse,
    ResultDetailResponse,
    ResultLineageResponse,
    ResultMapResponse,
    ResultSeriesQueryRequest,
    ResultSeriesQueryResponse,
    ResultSeriesResponse,
)
from gateway.core.demo import DemoStore
from gateway.core.demo.models import (
    DeliveryView,
    LegacySeriesView,
    LineageView,
    ResultDetailView,
    ResultMapView,
    SeriesView,
)


def register_result_routes(router: APIRouter, store: DemoStore) -> None:
    """Register result representation, series and delivery routes."""

    @router.get(
        '/api/v1/results/{result_id}/map',
        operation_id='gateway_get_result_map',
        summary='Request a map representation.',
        response_model=ResultMapResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_result_map(
        result_id: str,
        frames: int | None = Query(default=None, ge=1, le=120, description='Optional mock frame count.'),
        owner_id: str = Depends(demo_owner),
    ) -> ResultMapView:
        """Return an explicit synthetic map representation with mock display frames."""
        return store.get_result_map(owner_id, result_id, frames)

    @router.get(
        '/api/v1/results/{result_id}',
        operation_id='gateway_get_result',
        summary='Retrieve result metadata and retained scope.',
        response_model=ResultDetailResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_result(result_id: str, owner_id: str = Depends(demo_owner)) -> ResultDetailView:
        """Return explicit metadata for one completed result."""
        return store.get_result(owner_id, result_id)

    @router.get(
        '/api/v1/results/{result_id}/series',
        operation_id='gateway_get_result_series',
        summary='Request an analytical series.',
        response_model=ResultSeriesResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_result_series(result_id: str, owner_id: str = Depends(demo_owner)) -> LegacySeriesView:
        """Return the non-fabricated legacy series placeholder."""
        return store.get_result_series(owner_id, result_id)

    @router.post(
        '/api/v1/results/{result_id}/series',
        operation_id='gateway_query_result_series',
        summary='Query a bounded spatial and temporal series.',
        response_model=ResultSeriesQueryResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def query_result_series(
        result_id: str,
        payload: ResultSeriesQueryRequest,
        owner_id: str = Depends(demo_owner),
    ) -> SeriesView:
        """Return a deterministic series for one explicit selection and CRS."""
        return store.query_result_series(
            owner_id,
            result_id,
            payload.geometry_wkt,
            payload.crs,
            payload.period.start_month,
            payload.period.end_month,
            payload.parameters,
        )

    @router.get(
        '/api/v1/results/{result_id}/lineage',
        operation_id='gateway_get_result_lineage',
        summary='Inspect result lineage.',
        response_model=ResultLineageResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_result_lineage(result_id: str, owner_id: str = Depends(demo_owner)) -> LineageView:
        """Return retained synthetic request provenance."""
        return store.get_result_lineage(owner_id, result_id)

    @router.post(
        '/api/v1/results/{result_id}/deliveries',
        operation_id='gateway_create_delivery',
        summary='Request final-product or dependency-archive delivery.',
        response_model=DeliveryResponse,
        status_code=status.HTTP_202_ACCEPTED,
        responses=NOT_FOUND_ERRORS,
    )
    def create_delivery(
        result_id: str,
        payload: DeliveryCreateRequest,
        owner_id: str = Depends(demo_owner),
    ) -> DeliveryView:
        """Start deterministic delivery preparation."""
        return store.delivery_view(store.create_delivery(owner_id, result_id, payload.kind))

    @router.get(
        '/api/v1/deliveries/{delivery_id}',
        operation_id='gateway_get_delivery',
        summary='Retrieve delivery state and access.',
        response_model=DeliveryResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_delivery(delivery_id: str, owner_id: str = Depends(demo_owner)) -> DeliveryView:
        """Return the current delivery state and access URL when ready."""
        return store.get_delivery_view(owner_id, delivery_id)
