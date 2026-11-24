"""Unit tests for implemented deterministic Gateway REST routes."""

from datetime import UTC, datetime

import pytest
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient
from meogap.rest.contracts import PUBLIC_HEALTH_PATH, ErrorResponse
from meogap.rest.factory import RestAppConfig, create_rest_app

from gateway.application.routes import build_demo_router
from gateway.core.demo import DemoError, DemoSettings, DemoStore

pytestmark = pytest.mark.unit

SERVICE = 'gateway-test'
AUTH_HEADERS = {'Authorization': 'Bearer demo-ui-token'}
NOW = datetime(2026, 1, 1, tzinfo=UTC)
TOULOUSE_GEOMETRY = {
    'type': 'Polygon',
    'coordinates': [[[1.43, 43.59], [1.45, 43.59], [1.45, 43.61], [1.43, 43.59]]],
}
SEEDED_AOI_COUNT = 3
UPDATED_AOI_REVISION = 2


def build_client() -> TestClient:
    """Build an isolated test app with zero-delay deterministic state.

    Returns
    -------
        TestClient: authenticated Gateway route client.

    """
    # Use the shared REST factory so bearer enforcement stays part of the route test.
    store = DemoStore(
        DemoSettings(preparation_delay_seconds=0, execution_delay_seconds=0, delivery_delay_seconds=0),
        clock=lambda: NOW,
    )
    config = RestAppConfig(
        service=SERVICE,
        title='Gateway route test',
        version='0.1.0',
        health_path=PUBLIC_HEALTH_PATH,
    )
    application = create_rest_app(config, routers=(build_demo_router(store),))

    @application.exception_handler(DemoError)
    async def handle_demo_error(request: Request, exc: DemoError) -> JSONResponse:
        """Expose caller-safe deterministic domain errors in route tests.

        Args:
        ----
            request(Request): request that triggered the domain error.
            exc(DemoError): deterministic demo error.

        Returns:
        -------
            JSONResponse: shared error envelope with the requested status.

        """
        payload = ErrorResponse(
            code=exc.code,
            message=exc.message,
            service=SERVICE,
            operation=request.url.path,
        )
        return JSONResponse(status_code=exc.status_code, content=payload.model_dump())

    return TestClient(application)


def test_all_public_demo_routes_complete_the_documented_happy_path() -> None:
    """Validate each implemented public route produces a usable deterministic response.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    client = build_client()
    # Act
    products = client.get('/api/v1/catalogue/products', headers=AUTH_HEADERS)
    product = client.get('/api/v1/catalogue/products/ndvi', headers=AUTH_HEADERS)
    requirements = client.get('/api/v1/catalogue/products/ndvi/input-requirements', headers=AUTH_HEADERS)
    missions = client.get('/api/v1/catalogue/products/ndvi/missions', headers=AUTH_HEADERS)
    aois = client.get('/api/v1/aois', headers=AUTH_HEADERS)
    created_aoi = client.post(
        '/api/v1/aois',
        headers=AUTH_HEADERS,
        json={'name': 'Toulouse test area', 'description': None, 'geometry': TOULOUSE_GEOMETRY},
    )
    aoi_id = created_aoi.json()['aoi_id']
    retrieved_aoi = client.get(f'/api/v1/aois/{aoi_id}', headers=AUTH_HEADERS)
    updated_aoi = client.patch(
        f'/api/v1/aois/{aoi_id}',
        headers=AUTH_HEADERS,
        json={'description': 'Updated deterministic AOI.'},
    )
    estimate = client.post(
        '/api/v1/analysis-requests/estimate',
        headers=AUTH_HEADERS,
        json={
            'product_id': 'ndvi',
            'aoi_id': aoi_id,
            'period': {'start_month': '2026-01', 'end_month': '2026-02'},
            'temporal_frequency': 'monthly',
        },
    )
    created_request = client.post(
        '/api/v1/analysis-requests',
        headers=AUTH_HEADERS,
        json={
            'product_id': 'ndvi',
            'aoi_id': aoi_id,
            'period': {'start_month': '2026-01', 'end_month': '2026-02'},
            'temporal_frequency': 'monthly',
        },
    )
    request_id = created_request.json()['request_id']
    requests = client.get('/api/v1/analysis-requests', headers=AUTH_HEADERS)
    proposed = client.get(f'/api/v1/analysis-requests/{request_id}', headers=AUTH_HEADERS)
    executing = client.post(f'/api/v1/analysis-requests/{request_id}/confirm', headers=AUTH_HEADERS)
    completed = client.get(f'/api/v1/analysis-requests/{request_id}', headers=AUTH_HEADERS)
    result_id = completed.json()['result_id']
    result_map = client.get(f'/api/v1/results/{result_id}/map', headers=AUTH_HEADERS)
    result_detail = client.get(f'/api/v1/results/{result_id}', headers=AUTH_HEADERS)
    series = client.get(f'/api/v1/results/{result_id}/series', headers=AUTH_HEADERS)
    series_query = client.post(
        f'/api/v1/results/{result_id}/series',
        headers=AUTH_HEADERS,
        json={
            'geometry_wkt': 'POINT(1.44 43.60)',
            'crs': 'EPSG:4326',
            'period': {'start_month': '2026-01', 'end_month': '2026-02'},
        },
    )
    lineage = client.get(f'/api/v1/results/{result_id}/lineage', headers=AUTH_HEADERS)
    delivery = client.post(
        f'/api/v1/results/{result_id}/deliveries',
        headers=AUTH_HEADERS,
        json={'kind': 'final_product'},
    )
    archive = client.post(
        f'/api/v1/results/{result_id}/deliveries',
        headers=AUTH_HEADERS,
        json={'kind': 'dependency_archive'},
    )
    ready_delivery = client.get(f'/api/v1/deliveries/{delivery.json()["delivery_id"]}', headers=AUTH_HEADERS)
    ready_archive = client.get(f'/api/v1/deliveries/{archive.json()["delivery_id"]}', headers=AUTH_HEADERS)
    account = client.get('/api/v1/account', headers=AUTH_HEADERS)
    balance = client.get('/api/v1/credits/balance', headers=AUTH_HEADERS)
    deleted_aoi = client.delete(f'/api/v1/aois/{aoi_id}', headers=AUTH_HEADERS)
    # Assert
    assert products.status_code == status.HTTP_200_OK
    assert product.status_code == status.HTTP_200_OK
    assert requirements.status_code == status.HTTP_200_OK
    assert missions.json()['items'][0]['source_id'] == 'Sentinel'
    assert len(aois.json()['items']) == SEEDED_AOI_COUNT
    assert created_aoi.status_code == status.HTTP_201_CREATED
    assert retrieved_aoi.status_code == status.HTTP_200_OK
    assert updated_aoi.json()['revision'] == UPDATED_AOI_REVISION
    assert estimate.json()['admission'] == 'ADMITTED'
    assert created_request.status_code == status.HTTP_201_CREATED
    assert created_request.json()['temporal_frequency'] == 'monthly'
    assert requests.status_code == status.HTTP_200_OK
    assert proposed.json()['state'] == 'PROPOSED'
    assert executing.json()['state'] == 'IN_EXECUTION'
    assert completed.json()['state'] == 'COMPLETED'
    assert result_map.json()['kind'] == 'DEMO_PLACEHOLDER'
    assert result_map.json()['is_demo'] is True
    assert result_detail.json()['result_id'] == result_id
    assert result_detail.json()['temporal_frequency'] == 'monthly'
    assert series.json()['points'] == []
    assert series_query.status_code == status.HTTP_200_OK
    assert series_query.json()['selection_type'] == 'Point'
    assert series_query.json()['crs'] == 'EPSG:4326'
    assert series_query.json()['points'][0]['state'] in {'VALID', 'MISSING', 'MASKED'}
    assert lineage.json()['request_id'] == request_id
    assert delivery.status_code == status.HTTP_202_ACCEPTED
    assert ready_delivery.json()['state'] == 'READY'
    assert ready_delivery.json()['kind'] == 'final_product'
    assert ready_archive.json()['kind'] == 'dependency_archive'
    assert account.json()['user_id'] == 'demo-user'
    assert balance.json()['unit'] == 'credits'
    assert deleted_aoi.status_code == status.HTTP_204_NO_CONTENT


def test_routes_require_a_bearer_and_use_the_shared_validation_envelope() -> None:
    """Validate public operations reject missing bearer credentials and malformed AOIs.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    client = build_client()
    # Act
    unauthenticated = client.get('/api/v1/aois')
    invalid = client.post(
        '/api/v1/aois',
        headers=AUTH_HEADERS,
        json={'name': 'Invalid Toulouse area', 'geometry': {'type': 'Point', 'coordinates': [1.4, 43.6]}},
    )
    oversized_aoi = client.post(
        '/api/v1/aois',
        headers=AUTH_HEADERS,
        json={
            'name': 'Oversized area',
            'geometry': {
                'type': 'Polygon',
                'coordinates': [[[1.0, 43.0], [2.0, 43.0], [2.0, 44.0], [1.0, 44.0], [1.0, 43.0]]],
            },
        },
    )
    unsupported_frequency = client.post(
        '/api/v1/analysis-requests/estimate',
        headers=AUTH_HEADERS,
        json={
            'product_id': 'ndvi',
            'aoi_id': 'aoi-1',
            'period': {'start_month': '2026-01', 'end_month': '2026-02'},
            'temporal_frequency': 'hourly',
        },
    )
    # Assert
    assert unauthenticated.status_code == status.HTTP_401_UNAUTHORIZED
    assert unauthenticated.json()['code'] == 'UNAUTHORIZED'
    assert invalid.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert invalid.json()['code'] == 'UNPROCESSABLE_ENTITY'
    assert oversized_aoi.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    assert oversized_aoi.json()['code'] == 'AOI_AREA_EXCEEDED'
    assert unsupported_frequency.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
