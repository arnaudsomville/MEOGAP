"""Unit tests for the data and asset catalogue application layer."""

import pytest
from fastapi import status
from fastapi.testclient import TestClient
from meogap import VERSION as SERVICE_VERSION
from meogap.rest.contracts import INTERNAL_HEALTH_PATH

from meogap_cat.application.app import (
    APP_TITLE,
    APPLICATION,
    REST_INTERFACE,
    SERVICE_NAME,
    app,
)

pytestmark = pytest.mark.unit

client = TestClient(app)


def test_health_reports_the_cat_identity() -> None:
    """Validate the liveness route exposes the shared health payload.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    expected = {'status': 'ok', 'service': SERVICE_NAME, 'version': SERVICE_VERSION}
    # Act
    result = client.get(INTERNAL_HEALTH_PATH)
    # Assert
    assert result.status_code == status.HTTP_200_OK
    assert result.json() == expected


def test_openapi_title_is_stable() -> None:
    """Validate the published document carries the expected title.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act
    document = app.openapi()
    # Assert
    assert document['info']['title'] == APP_TITLE


def test_application_owns_the_rest_interface() -> None:
    """Validate the application layer wires the REST interface.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Assert
    assert APPLICATION.interfaces == (REST_INTERFACE,)


def test_application_lifecycle_hooks_are_noop() -> None:
    """Validate the M0 application lifecycle hooks are safe no-ops.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act / Assert
    assert APPLICATION.startup() is None
    assert APPLICATION.shutdown() is None
