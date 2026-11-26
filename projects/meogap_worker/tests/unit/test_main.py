"""Unit tests for the worker package entrypoint."""

import pytest

from worker.application.worker import main as application_main
from worker.main import main

pytestmark = pytest.mark.unit


def test_main_is_exported() -> None:
    """Validate the package entrypoint exposes the application runner.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Assert
    assert main is application_main
