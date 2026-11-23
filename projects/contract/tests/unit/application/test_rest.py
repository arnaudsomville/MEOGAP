"""Unit tests for the control and orchestration inbound REST operations."""

import pytest

from contract.application.rest import OPERATIONS

pytestmark = pytest.mark.unit


def test_operations_are_unique() -> None:
    """Validate operation identifiers and routes are unique.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange / Act
    identifiers = {operation.operation_id for operation in OPERATIONS}
    routes = {(operation.method, operation.path) for operation in OPERATIONS}
    # Assert
    assert len(identifiers) == len(OPERATIONS)
    assert len(routes) == len(OPERATIONS)
