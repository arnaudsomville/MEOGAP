"""Unit tests for the reusable REST application factory."""

import pytest
from fastapi import FastAPI, HTTPException, status
from fastapi.testclient import TestClient

from meogap.rest.contracts import INTERNAL_HEALTH_PATH, Operation
from meogap.rest.factory import (
    ERROR_CODE_BAD_REQUEST,
    ERROR_CODE_HTTP_ERROR,
    ERROR_CODE_INTERNAL_ERROR,
    ERROR_CODE_NOT_FOUND,
    INTERNAL_ERROR_MESSAGE,
    RestAppConfig,
    create_rest_app,
    error_code_for_status,
)

pytestmark = pytest.mark.unit

SERVICE = 'svc'
VERSION = '1.2.3'
AUTH_VALUE = 'test-value'
TEST_PORT = 9000
OPERATION = Operation('GET', '/internal/v1/items', 'svc_list_items', 'List items.')


def build_config(
    *,
    require_bearer: bool = True,
    cors_origins: tuple[str, ...] = (),
    extra_exempt_paths: tuple[str, ...] = (),
) -> RestAppConfig:
    """Build a default application configuration with optional overrides.

    Args:
    ----
        require_bearer(bool): whether business routes require a bearer token.
        cors_origins(tuple[str, ...]): allowed CORS origins.
        extra_exempt_paths(tuple[str, ...]): paths exempt from bearer enforcement.

    Returns:
    -------
        RestAppConfig: configuration under test.

    """
    return RestAppConfig(
        service=SERVICE,
        title='Test service',
        version=VERSION,
        health_path=INTERNAL_HEALTH_PATH,
        require_bearer=require_bearer,
        cors_origins=cors_origins,
        extra_exempt_paths=extra_exempt_paths,
    )


def test_health_is_public_and_business_routes_require_a_token() -> None:
    """Validate health stays public while declared operations require a token.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    app = create_rest_app(build_config(), (OPERATION,))
    client = TestClient(app)
    # Act
    health = client.get(INTERNAL_HEALTH_PATH)
    unauthenticated = client.get(OPERATION.path)
    authenticated = client.get(OPERATION.path, headers={'Authorization': f'Bearer {AUTH_VALUE}'})
    # Assert
    assert health.status_code == status.HTTP_200_OK
    assert unauthenticated.status_code == status.HTTP_401_UNAUTHORIZED
    assert authenticated.status_code == status.HTTP_501_NOT_IMPLEMENTED


def test_application_state_exposes_the_service_configuration() -> None:
    """Validate the application state records the service configuration.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    app = create_rest_app(build_config(), (OPERATION,))
    # Act
    state = app.state
    # Assert
    assert state.service == SERVICE
    assert state.identity_required is True


def test_bearer_enforcement_can_be_disabled() -> None:
    """Validate applications can opt out of bearer enforcement.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    app = create_rest_app(build_config(require_bearer=False), (OPERATION,))
    client = TestClient(app)
    # Act
    result = client.get(OPERATION.path)
    # Assert
    assert result.status_code == status.HTTP_501_NOT_IMPLEMENTED


def test_extra_exempt_paths_remain_public() -> None:
    """Validate extra exempt paths bypass authentication.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    app = create_rest_app(build_config(extra_exempt_paths=('/public',)), (OPERATION,))

    @app.get('/public')
    def public() -> dict[str, str]:
        """Return a public payload.

        Returns
        -------
            dict[str, str]: public payload.

        """
        return {'status': 'ok'}

    client = TestClient(app)
    # Act
    result = client.get('/public')
    # Assert
    assert result.status_code == status.HTTP_200_OK


def test_cors_headers_are_added_to_error_responses() -> None:
    """Validate CORS stays outermost so error responses carry its headers.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    origin = 'http://example.test'
    app = create_rest_app(build_config(cors_origins=(origin,)), (OPERATION,))
    client = TestClient(app)
    # Act
    result = client.get(OPERATION.path, headers={'Origin': origin})
    # Assert
    assert result.status_code == status.HTTP_401_UNAUTHORIZED
    assert result.headers['access-control-allow-origin'] == origin


def test_value_errors_map_to_bad_request() -> None:
    """Validate value errors use the shared 400 envelope.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    app = create_rest_app(build_config(require_bearer=False))

    @app.get('/value-error')
    def value_error() -> None:
        """Raise a value error.

        Returns
        -------
            None

        """
        raise ValueError('bad value')

    client = TestClient(app)
    # Act
    result = client.get('/value-error')
    # Assert
    assert result.status_code == status.HTTP_400_BAD_REQUEST
    assert result.json()['code'] == ERROR_CODE_BAD_REQUEST
    assert result.json()['message'] == 'bad value'


def test_key_errors_map_to_not_found() -> None:
    """Validate key errors use the shared 404 envelope.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    app = create_rest_app(build_config(require_bearer=False))

    @app.get('/key-error')
    def key_error() -> None:
        """Raise a key error.

        Returns
        -------
            None

        """
        raise KeyError('missing')

    client = TestClient(app)
    # Act
    result = client.get('/key-error')
    # Assert
    assert result.status_code == status.HTTP_404_NOT_FOUND
    assert result.json()['code'] == ERROR_CODE_NOT_FOUND
    assert result.json()['message'] == 'missing'


def test_unexpected_errors_use_the_shared_internal_error_envelope() -> None:
    """Validate unexpected failures do not leak internal details.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    app = create_rest_app(build_config(require_bearer=False))

    @app.get('/unexpected')
    def unexpected() -> None:
        """Raise an unexpected error.

        Returns
        -------
            None

        """
        raise RuntimeError('internal detail')

    client = TestClient(app, raise_server_exceptions=False)
    # Act
    result = client.get('/unexpected')
    # Assert
    assert result.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    assert result.json()['code'] == ERROR_CODE_INTERNAL_ERROR
    assert result.json()['message'] == INTERNAL_ERROR_MESSAGE


def test_http_exceptions_use_the_shared_envelope() -> None:
    """Validate HTTP exceptions use the shared envelope and preserve status.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    app = create_rest_app(build_config(require_bearer=False))

    @app.get('/teapot')
    def teapot() -> None:
        """Raise an HTTP exception.

        Returns
        -------
            None

        """
        raise HTTPException(status_code=status.HTTP_418_IM_A_TEAPOT, detail='teapot')

    client = TestClient(app)
    # Act
    result = client.get('/teapot')
    # Assert
    assert result.status_code == status.HTTP_418_IM_A_TEAPOT
    assert result.json()['code'] == ERROR_CODE_HTTP_ERROR
    assert result.json()['message'] == 'teapot'


def test_error_code_for_status_falls_back_to_http_error() -> None:
    """Validate unknown status codes use the generic HTTP error code.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act / Assert
    assert error_code_for_status(status.HTTP_418_IM_A_TEAPOT) == ERROR_CODE_HTTP_ERROR
    assert error_code_for_status(status.HTTP_400_BAD_REQUEST) == ERROR_CODE_BAD_REQUEST


def test_application_is_a_fastapi_instance() -> None:
    """Validate the factory returns a FastAPI application.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act
    app = create_rest_app(build_config())
    # Assert
    assert isinstance(app, FastAPI)
