"""Unit tests for the shared REST building blocks."""

import pytest
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from meogap.rest.contracts import (
    ERROR_CODE_NOT_IMPLEMENTED,
    INTERNAL_HEALTH_PATH,
    NOT_IMPLEMENTED_MESSAGE,
    STATUS_OK,
    ErrorResponse,
    HealthResponse,
    Operation,
    build_base_router,
    build_not_implemented_router,
)

pytestmark = pytest.mark.unit

SERVICE = 'svc'
VERSION = '1.2.3'
OPERATION = Operation('GET', '/internal/v1/items', 'svc_list_items', 'List items.')


def build_app() -> FastAPI:
    """Build a test application exposing the shared routers.

    Returns
    -------
        FastAPI: application under test.

    """
    app = FastAPI()
    app.include_router(build_base_router(service=SERVICE, version=VERSION, health_path=INTERNAL_HEALTH_PATH))
    app.include_router(build_not_implemented_router(service=SERVICE, operations=(OPERATION,)))
    return app


client = TestClient(build_app())


def test_health_returns_the_shared_payload() -> None:
    """Validate the base router exposes the shared health payload.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    expected = {'status': STATUS_OK, 'service': SERVICE, 'version': VERSION}
    # Act
    result = client.get(INTERNAL_HEALTH_PATH)
    # Assert
    assert result.status_code == status.HTTP_200_OK
    assert result.json() == expected


def test_business_operation_returns_the_shared_error_envelope() -> None:
    """Validate declared operations fail explicitly instead of faking success.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    expected = {
        'code': ERROR_CODE_NOT_IMPLEMENTED,
        'message': NOT_IMPLEMENTED_MESSAGE,
        'service': SERVICE,
        'operation': OPERATION.operation_id,
    }
    # Act
    result = client.get(OPERATION.path)
    # Assert
    assert result.status_code == status.HTTP_501_NOT_IMPLEMENTED
    assert result.json() == expected


def test_operation_is_immutable() -> None:
    """Validate operation definitions cannot be mutated at runtime.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    operation = Operation('GET', '/internal/v1/items', 'svc_list_items', 'List items.')
    # Act / Assert
    with pytest.raises(AttributeError):
        operation.path = '/internal/v1/other'


def test_error_response_exposes_the_contract_fields() -> None:
    """Validate the shared error model matches the reference contract fields.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    expected = {'code', 'message', 'service', 'operation'}
    # Act
    fields = set(ErrorResponse.model_fields)
    # Assert
    assert fields == expected


def test_health_response_exposes_the_contract_fields() -> None:
    """Validate the shared health model matches the reference contract fields.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    expected = {'status', 'service', 'version'}
    # Act
    fields = set(HealthResponse.model_fields)
    # Assert
    assert fields == expected


def test_base_router_registers_the_health_path() -> None:
    """Validate the base router registers exactly the health route.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    router = build_base_router(service=SERVICE, version=VERSION, health_path=INTERNAL_HEALTH_PATH)
    # Act
    paths = {route.path for route in router.routes}
    # Assert
    assert paths == {INTERNAL_HEALTH_PATH}


def test_not_implemented_router_registers_the_operation_path() -> None:
    """Validate the business router registers the declared operation.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    router = build_not_implemented_router(service=SERVICE, operations=(OPERATION,))
    # Act
    paths = {route.path for route in router.routes}
    # Assert
    assert paths == {OPERATION.path}
