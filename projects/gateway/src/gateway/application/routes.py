"""Implemented deterministic M0 Gateway REST routes."""

from __future__ import annotations

from typing import Any, Literal, Self, TypeAlias

from fastapi import APIRouter, Depends, Response, Security, status
from fastapi.security import HTTPBearer
from meogap.rest.contracts import ErrorResponse
from meogap.rest.middleware import Identity, get_identity
from pydantic import BaseModel, ConfigDict, Field, model_validator

from gateway.core.demo import DEMO_OWNER_ID, DemoStore

API_TAG = 'gateway'
DESCRIPTION_MAX_LENGTH = 1000
NAME_MAX_LENGTH = 120


class AoiGeometry(BaseModel):
    """Supported polygonal GeoJSON geometry supplied by the public client."""

    model_config = ConfigDict(extra='forbid')

    type: Literal['Polygon', 'MultiPolygon']
    coordinates: list[Any]


class AoiResponse(BaseModel):
    """Public owner-scoped AOI representation."""

    model_config = ConfigDict(extra='forbid')

    aoi_id: str
    name: str
    description: str | None
    geometry: AoiGeometry
    revision: int
    created_at: str
    updated_at: str


class AoiListResponse(BaseModel):
    """Public AOI collection representation."""

    model_config = ConfigDict(extra='forbid')

    items: list[AoiResponse]


class AoiCreateRequest(BaseModel):
    """Payload for one new saved AOI."""

    model_config = ConfigDict(extra='forbid')

    name: str = Field(min_length=1, max_length=NAME_MAX_LENGTH)
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX_LENGTH)
    geometry: AoiGeometry


class AoiUpdateRequest(BaseModel):
    """Partial payload for an existing saved AOI."""

    model_config = ConfigDict(extra='forbid')

    name: str | None = Field(default=None, min_length=1, max_length=NAME_MAX_LENGTH)
    description: str | None = Field(default=None, max_length=DESCRIPTION_MAX_LENGTH)
    geometry: AoiGeometry | None = None

    @model_validator(mode='after')
    def require_update(self) -> Self:
        """Reject an empty PATCH payload.

        Returns
        -------
            Self: validated update request.

        Raises
        ------
            ValueError: when no mutable field was supplied.

        """
        if not self.model_fields_set:
            raise ValueError('At least one AOI field must be supplied.')
        return self


class ProductResponse(BaseModel):
    """Public deterministic product descriptor."""

    model_config = ConfigDict(extra='forbid')

    product_id: str
    name: str
    description: str
    level: str
    category: str
    native_resolution: str
    temporal_resolution: str
    availability: str
    validation_status: str
    inputs: list[str]
    parameters: list[str]
    limitations: list[str]


class ProductListResponse(BaseModel):
    """Public product catalogue collection."""

    model_config = ConfigDict(extra='forbid')

    items: list[ProductResponse]


class ProductRequirementsResponse(BaseModel):
    """Public deterministic product input requirements."""

    model_config = ConfigDict(extra='forbid')

    product_id: str
    inputs: list[str]
    limitations: list[str]
    note: str


class AnalysisPeriodRequest(BaseModel):
    """Inclusive analysis period expressed in UTC calendar months."""

    model_config = ConfigDict(extra='forbid')

    start_month: str
    end_month: str


class AnalysisRequestCreateRequest(BaseModel):
    """Payload used to begin deterministic proposal preparation."""

    model_config = ConfigDict(extra='forbid')

    product_id: str
    aoi_id: str
    period: AnalysisPeriodRequest


class ProposalResponse(BaseModel):
    """Explicit estimate and limitations available for a proposed request."""

    model_config = ConfigDict(extra='forbid')

    feasible: bool
    estimated_credits: int
    currency: str
    conditions: list[str]
    limitations: list[str]


class FailureResponse(BaseModel):
    """Caller-safe request failure details."""

    model_config = ConfigDict(extra='forbid')

    stage: str
    message: str | None


class AnalysisRequestResponse(BaseModel):
    """Public analysis request lifecycle state and retained spatial snapshot."""

    model_config = ConfigDict(extra='forbid')

    request_id: str
    state: str
    product_id: str
    aoi_id: str
    source_aoi_revision: int
    aoi_name: str
    geometry_snapshot: AoiGeometry
    start_month: str
    end_month: str
    proposal: ProposalResponse | None
    actual_credits: int | None
    result_id: str | None
    message: str | None
    failure: FailureResponse | None
    created_at: str
    updated_at: str


class AnalysisRequestListResponse(BaseModel):
    """Public collection of caller-owned analysis requests."""

    model_config = ConfigDict(extra='forbid')

    items: list[AnalysisRequestResponse]


class CreditBalanceResponse(BaseModel):
    """Available deterministic demo credits."""

    model_config = ConfigDict(extra='forbid')

    balance: int
    unit: str
    note: str


class ResultMapResponse(BaseModel):
    """Map overlay descriptor for a synthetic completed result."""

    model_config = ConfigDict(extra='forbid')

    url: str
    bounds: list[list[float]]
    kind: str
    note: str
    result_id: str


class ResultSeriesResponse(BaseModel):
    """Series response that avoids fabricating scientific observations."""

    model_config = ConfigDict(extra='forbid')

    result_id: str
    points: list[Any]
    note: str


class ResultLineageResponse(BaseModel):
    """Minimal reliable M0 provenance for one result."""

    model_config = ConfigDict(extra='forbid')

    result_id: str
    request_id: str
    product_id: str
    aoi_name: str
    geometry_snapshot: AoiGeometry
    note: str


class DeliveryCreateRequest(BaseModel):
    """Delivery representation requested for a completed result."""

    model_config = ConfigDict(extra='forbid')

    kind: str = Field(min_length=1)


class DeliveryResponse(BaseModel):
    """Asynchronous deterministic demo delivery state."""

    model_config = ConfigDict(extra='forbid')

    delivery_id: str
    state: str
    download_url: str | None
    message: str | None
    created_at: str
    updated_at: str


ResponseDefinitions: TypeAlias = dict[int | str, dict[str, Any]]

COMMON_UNAUTHORIZED: ResponseDefinitions = {
    status.HTTP_401_UNAUTHORIZED: {'model': ErrorResponse, 'description': 'Missing or invalid authentication.'},
}
VALIDATION_ERRORS: ResponseDefinitions = {
    **COMMON_UNAUTHORIZED,
    status.HTTP_422_UNPROCESSABLE_ENTITY: {'model': ErrorResponse, 'description': 'Request payload was invalid.'},
}
NOT_FOUND_ERRORS: ResponseDefinitions = {
    **VALIDATION_ERRORS,
    status.HTTP_404_NOT_FOUND: {'model': ErrorResponse, 'description': 'Requested resource was not found.'},
}
CONFLICT_ERRORS: ResponseDefinitions = {
    **VALIDATION_ERRORS,
    status.HTTP_409_CONFLICT: {'model': ErrorResponse, 'description': 'Request state prevents this operation.'},
}
BALANCE_ERRORS: ResponseDefinitions = {
    **COMMON_UNAUTHORIZED,
    status.HTTP_503_SERVICE_UNAVAILABLE: {'model': ErrorResponse, 'description': 'Credit balance is unavailable.'},
}
DEMO_OWNER_DEPENDENCY = Depends(get_identity)


def _demo_owner(_: Identity = DEMO_OWNER_DEPENDENCY) -> str:
    """Return the single deterministic owner after transport authentication.

    Args:
    ----
        _(Identity): syntactically validated M0 bearer credential.

    Returns:
    -------
        str: deterministic demo owner identifier.

    """
    return DEMO_OWNER_ID


def build_demo_router(store: DemoStore) -> APIRouter:  # noqa: C901
    """Build public Gateway routes backed by deterministic in-memory state.

    Args:
    ----
        store(DemoStore): process-local deterministic Gateway state.

    Returns:
    -------
        APIRouter: implemented public business routes.

    """
    router = APIRouter(
        tags=[API_TAG],
        dependencies=[Depends(_demo_owner), Security(HTTPBearer(auto_error=False, scheme_name='bearerAuth'))],
    )

    @router.get(
        '/api/v1/catalogue/products',
        operation_id='gateway_list_products',
        summary='Browse the scientific product catalogue.',
        response_model=ProductListResponse,
        responses=COMMON_UNAUTHORIZED,
    )
    def list_products() -> dict[str, list[dict[str, Any]]]:
        """Return deterministic public product descriptors.

        Returns
        -------
            dict[str, list[dict[str, Any]]]: public product collection.

        """
        return {'items': store.list_products()}

    @router.get(
        '/api/v1/catalogue/products/{product_id}',
        operation_id='gateway_get_product',
        summary='Retrieve a product definition.',
        response_model=ProductResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_product(product_id: str) -> dict[str, Any]:
        """Return one deterministic public product descriptor.

        Args:
        ----
            product_id(str): requested product identifier.

        Returns:
        -------
            dict[str, Any]: product descriptor.

        """
        return store.get_product(product_id)

    @router.get(
        '/api/v1/catalogue/products/{product_id}/input-requirements',
        operation_id='gateway_get_product_input_requirements',
        summary='Inspect abstract scientific input requirements.',
        response_model=ProductRequirementsResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_product_requirements(product_id: str) -> dict[str, Any]:
        """Return one deterministic product requirement descriptor.

        Args:
        ----
            product_id(str): requested product identifier.

        Returns:
        -------
            dict[str, Any]: product requirements.

        """
        return store.get_product_requirements(product_id)

    @router.get(
        '/api/v1/aois',
        operation_id='gateway_list_user_aois',
        summary='List AOIs owned by the authenticated user.',
        response_model=AoiListResponse,
        responses=COMMON_UNAUTHORIZED,
    )
    def list_aois(owner_id: str = Depends(_demo_owner)) -> dict[str, list[dict[str, Any]]]:
        """Return all caller-owned saved AOIs.

        Args:
        ----
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            dict[str, list[dict[str, Any]]]: saved AOIs.

        """
        return {'items': [store.serialize_aoi(record) for record in store.list_aois(owner_id)]}

    @router.post(
        '/api/v1/aois',
        operation_id='gateway_create_user_aoi',
        summary='Create an AOI owned by the authenticated user.',
        response_model=AoiResponse,
        status_code=status.HTTP_201_CREATED,
        responses=VALIDATION_ERRORS,
    )
    def create_aoi(payload: AoiCreateRequest, owner_id: str = Depends(_demo_owner)) -> dict[str, Any]:
        """Create one caller-owned AOI.

        Args:
        ----
            payload(AoiCreateRequest): AOI content and geometry.
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            dict[str, Any]: created AOI.

        """
        record = store.create_aoi(owner_id, payload.name, payload.description, payload.geometry.model_dump())
        return store.serialize_aoi(record)

    @router.get(
        '/api/v1/aois/{aoi_id}',
        operation_id='gateway_get_user_aoi',
        summary='Retrieve an AOI owned by the authenticated user.',
        response_model=AoiResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_aoi(aoi_id: str, owner_id: str = Depends(_demo_owner)) -> dict[str, Any]:
        """Return one caller-owned AOI.

        Args:
        ----
            aoi_id(str): saved AOI identifier.
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            dict[str, Any]: saved AOI.

        """
        return store.serialize_aoi(store.get_aoi(owner_id, aoi_id))

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
        owner_id: str = Depends(_demo_owner),
    ) -> dict[str, Any]:
        """Update one caller-owned AOI.

        Args:
        ----
            aoi_id(str): saved AOI identifier.
            payload(AoiUpdateRequest): requested AOI changes.
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            dict[str, Any]: updated AOI.

        """
        record = store.update_aoi(
            owner_id,
            aoi_id,
            payload.name,
            payload.description,
            'description' in payload.model_fields_set,
            payload.geometry.model_dump() if payload.geometry else None,
        )
        return store.serialize_aoi(record)

    @router.delete(
        '/api/v1/aois/{aoi_id}',
        operation_id='gateway_delete_user_aoi',
        summary='Delete an owned AOI. Existing request snapshots are unaffected.',
        status_code=status.HTTP_204_NO_CONTENT,
        responses=NOT_FOUND_ERRORS,
    )
    def delete_aoi(aoi_id: str, owner_id: str = Depends(_demo_owner)) -> Response:
        """Delete one caller-owned AOI.

        Args:
        ----
            aoi_id(str): saved AOI identifier.
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            Response: empty successful deletion response.

        """
        store.delete_aoi(owner_id, aoi_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @router.post(
        '/api/v1/analysis-requests',
        operation_id='gateway_create_analysis_request',
        summary='Submit an analysis request.',
        response_model=AnalysisRequestResponse,
        status_code=status.HTTP_201_CREATED,
        responses=NOT_FOUND_ERRORS,
    )
    def create_analysis_request(
        payload: AnalysisRequestCreateRequest,
        owner_id: str = Depends(_demo_owner),
    ) -> dict[str, Any]:
        """Begin deterministic proposal preparation for an analysis request.

        Args:
        ----
            payload(AnalysisRequestCreateRequest): product, AOI and month range.
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            dict[str, Any]: newly created PREPARING request.

        """
        record = store.create_request(
            owner_id,
            payload.product_id,
            payload.aoi_id,
            payload.period.start_month,
            payload.period.end_month,
        )
        return store.serialize_request(record)

    @router.get(
        '/api/v1/analysis-requests',
        operation_id='gateway_list_analysis_requests',
        summary='List analysis requests.',
        response_model=AnalysisRequestListResponse,
        responses=COMMON_UNAUTHORIZED,
    )
    def list_analysis_requests(owner_id: str = Depends(_demo_owner)) -> dict[str, list[dict[str, Any]]]:
        """Return all caller-owned analysis requests.

        Args:
        ----
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            dict[str, list[dict[str, Any]]]: current request collection.

        """
        return {'items': [store.serialize_request(record) for record in store.list_requests(owner_id)]}

    @router.get(
        '/api/v1/analysis-requests/{request_id}',
        operation_id='gateway_get_analysis_request',
        summary='Retrieve the authoritative request state.',
        response_model=AnalysisRequestResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_analysis_request(request_id: str, owner_id: str = Depends(_demo_owner)) -> dict[str, Any]:
        """Return the authoritative lifecycle state for one request.

        Args:
        ----
            request_id(str): request identifier.
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            dict[str, Any]: current request state.

        """
        return store.serialize_request(store.get_request(owner_id, request_id))

    @router.post(
        '/api/v1/analysis-requests/{request_id}/confirm',
        operation_id='gateway_confirm_analysis_request',
        summary='Confirm a proposed analysis request.',
        response_model=AnalysisRequestResponse,
        responses=CONFLICT_ERRORS,
    )
    def confirm_analysis_request(request_id: str, owner_id: str = Depends(_demo_owner)) -> dict[str, Any]:
        """Atomically debit demo credits and begin deterministic execution.

        Args:
        ----
            request_id(str): request identifier.
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            dict[str, Any]: request now in execution.

        """
        return store.serialize_request(store.confirm_request(owner_id, request_id))

    @router.post(
        '/api/v1/analysis-requests/{request_id}/cancel',
        operation_id='gateway_cancel_analysis_request',
        summary='Request analysis cancellation.',
        response_model=AnalysisRequestResponse,
        responses=CONFLICT_ERRORS,
    )
    def cancel_analysis_request(request_id: str, owner_id: str = Depends(_demo_owner)) -> dict[str, Any]:
        """Cancel a request unless it already completed.

        Args:
        ----
            request_id(str): request identifier.
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            dict[str, Any]: cancelled request state.

        """
        return store.serialize_request(store.cancel_request(owner_id, request_id))

    @router.get(
        '/api/v1/results/{result_id}/map',
        operation_id='gateway_get_result_map',
        summary='Request a map representation.',
        response_model=ResultMapResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_result_map(result_id: str, owner_id: str = Depends(_demo_owner)) -> dict[str, Any]:
        """Return an explicit synthetic map representation.

        Args:
        ----
            result_id(str): result identifier.
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            dict[str, Any]: synthetic map overlay descriptor.

        """
        return store.get_result_map(owner_id, result_id)

    @router.get(
        '/api/v1/results/{result_id}/series',
        operation_id='gateway_get_result_series',
        summary='Request an analytical series.',
        response_model=ResultSeriesResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_result_series(result_id: str, owner_id: str = Depends(_demo_owner)) -> dict[str, Any]:
        """Return the non-fabricated M0 series placeholder.

        Args:
        ----
            result_id(str): result identifier.
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            dict[str, Any]: empty analytical series representation.

        """
        return store.get_result_series(owner_id, result_id)

    @router.get(
        '/api/v1/results/{result_id}/lineage',
        operation_id='gateway_get_result_lineage',
        summary='Inspect result lineage.',
        response_model=ResultLineageResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_result_lineage(result_id: str, owner_id: str = Depends(_demo_owner)) -> dict[str, Any]:
        """Return retained demo request provenance.

        Args:
        ----
            result_id(str): result identifier.
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            dict[str, Any]: minimal retained lineage.

        """
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
        _: DeliveryCreateRequest,
        owner_id: str = Depends(_demo_owner),
    ) -> dict[str, Any]:
        """Start deterministic delivery preparation.

        Args:
        ----
            result_id(str): completed result identifier.
            _(DeliveryCreateRequest): requested delivery kind.
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            dict[str, Any]: newly preparing delivery.

        """
        return store.serialize_delivery(store.create_delivery(owner_id, result_id))

    @router.get(
        '/api/v1/deliveries/{delivery_id}',
        operation_id='gateway_get_delivery',
        summary='Retrieve delivery state and access.',
        response_model=DeliveryResponse,
        responses=NOT_FOUND_ERRORS,
    )
    def get_delivery(delivery_id: str, owner_id: str = Depends(_demo_owner)) -> dict[str, Any]:
        """Return the current delivery state and access URL when ready.

        Args:
        ----
            delivery_id(str): delivery identifier.
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            dict[str, Any]: current delivery state.

        """
        return store.serialize_delivery(store.get_delivery(owner_id, delivery_id))

    @router.get(
        '/api/v1/credits/balance',
        operation_id='gateway_get_credit_balance',
        summary='Retrieve the caller credit balance.',
        response_model=CreditBalanceResponse,
        responses=BALANCE_ERRORS,
    )
    def get_credit_balance(owner_id: str = Depends(_demo_owner)) -> dict[str, Any]:
        """Return available deterministic demo credits.

        Args:
        ----
            owner_id(str): deterministic authenticated owner.

        Returns:
        -------
            dict[str, Any]: balance and demo disclosure.

        """
        return {
            'balance': store.get_balance(owner_id),
            'unit': 'credits',
            'note': 'Deterministic demo credits, not a financial balance.',
        }

    return router
