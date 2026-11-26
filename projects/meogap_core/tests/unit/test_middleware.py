"""Unit tests for bearer identity extraction and enforcement."""

from typing import Annotated

from fastapi import Depends, FastAPI, status
from fastapi.testclient import TestClient
from pytest import mark

from meogap.rest.middleware import (
    ERROR_CODE_INVALID_AUTHORIZATION,
    ERROR_CODE_UNAUTHORIZED,
    INVALID_AUTHORIZATION_MESSAGE,
    UNAUTHORIZED_MESSAGE,
    BearerIdentityMiddleware,
    Identity,
    get_identity,
)

pytestmark = mark.unit

SERVICE = 'svc'
AUTH_VALUE = 'test-value'
PRIVATE_PATH = '/private'
HEALTH_PATH = '/health'


def build_app() -> FastAPI:
    """Build a test application protected by the bearer middleware.

    Returns
    -------
        FastAPI: application under test.

    """
    app = FastAPI()
    app.add_middleware(BearerIdentityMiddleware, service=SERVICE, exempt_paths=(HEALTH_PATH,))

    @app.get(HEALTH_PATH)
    def health() -> dict[str, str]:
        """Return a public health payload.

        Returns
        -------
            dict[str, str]: health payload.

        """
        return {'status': 'ok'}

    @app.get(PRIVATE_PATH)
    def private(identity: Annotated[Identity, Depends(get_identity)]) -> dict[str, str]:
        """Return the identity token for the caller.

        Args:
        ----
            identity(Identity): injected bearer identity.

        Returns:
        -------
            dict[str, str]: identity token.

        """
        return {'token': identity.token}

    @app.options(PRIVATE_PATH)
    def private_options() -> dict[str, str]:
        """Return a public preflight payload.

        Returns
        -------
            dict[str, str]: preflight payload.

        """
        return {'status': 'ok'}

    return app


client = TestClient(build_app())


def test_missing_bearer_token_is_rejected() -> None:
    """Validate business routes reject unauthenticated requests.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act
    result = client.get(PRIVATE_PATH)
    # Assert
    assert result.status_code == status.HTTP_401_UNAUTHORIZED
    assert result.headers['www-authenticate'] == 'Bearer'
    assert result.json() == {
        'code': ERROR_CODE_UNAUTHORIZED,
        'message': UNAUTHORIZED_MESSAGE,
        'service': SERVICE,
        'operation': PRIVATE_PATH,
    }


@mark.parametrize(
    'authorization',
    ['', 'Basic abc', 'Bearer', 'Bearer one two', 'Token abc'],
)
def test_malformed_authorization_is_rejected(authorization: str) -> None:
    """Validate malformed authorization headers are rejected.

    Args:
    ----
        authorization(str): raw Authorization header value.

    Returns:
    -------
        None

    """
    # Act
    result = client.get(PRIVATE_PATH, headers={'Authorization': authorization})
    # Assert
    assert result.status_code == status.HTTP_401_UNAUTHORIZED
    assert result.json()['code'] == ERROR_CODE_INVALID_AUTHORIZATION
    assert result.json()['message'] == INVALID_AUTHORIZATION_MESSAGE


def test_duplicate_authorization_headers_are_rejected() -> None:
    """Validate multiple Authorization headers are rejected.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act
    result = client.get(
        PRIVATE_PATH,
        headers=[('Authorization', f'Bearer {AUTH_VALUE}'), ('Authorization', 'Bearer other')],
    )
    # Assert
    assert result.status_code == status.HTTP_401_UNAUTHORIZED
    assert result.json()['code'] == ERROR_CODE_INVALID_AUTHORIZATION


def test_valid_bearer_token_exposes_the_identity() -> None:
    """Validate endpoints can retrieve the parsed identity.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act
    result = client.get(PRIVATE_PATH, headers={'Authorization': f'Bearer {AUTH_VALUE}'})
    # Assert
    assert result.status_code == status.HTTP_200_OK
    assert result.json() == {'token': AUTH_VALUE}


def test_health_route_is_exempt_from_authentication() -> None:
    """Validate exempt paths remain public.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act
    result = client.get(HEALTH_PATH)
    # Assert
    assert result.status_code == status.HTTP_200_OK
    assert result.json() == {'status': 'ok'}


def test_options_requests_are_exempt_from_authentication() -> None:
    """Validate CORS preflight requests bypass authentication.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act
    result = client.options(PRIVATE_PATH)
    # Assert
    assert result.status_code == status.HTTP_200_OK


def test_get_identity_without_middleware_is_rejected() -> None:
    """Validate the identity dependency refuses requests without an identity.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    app = FastAPI()

    @app.get(PRIVATE_PATH)
    def private(identity: Annotated[Identity, Depends(get_identity)]) -> dict[str, str]:
        """Return the identity token for the caller.

        Args:
        ----
            identity(Identity): injected bearer identity.

        Returns:
        -------
            dict[str, str]: identity token.

        """
        return {'token': identity.token}

    unauthenticated_client = TestClient(app)
    # Act
    result = unauthenticated_client.get(PRIVATE_PATH)
    # Assert
    assert result.status_code == status.HTTP_401_UNAUTHORIZED
    assert result.json()['detail'] == UNAUTHORIZED_MESSAGE


def test_identity_repr_hides_the_token() -> None:
    """Validate identity representations never leak the token.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    identity = Identity(token=AUTH_VALUE)
    # Act
    representation = repr(identity)
    # Assert
    assert AUTH_VALUE not in representation
