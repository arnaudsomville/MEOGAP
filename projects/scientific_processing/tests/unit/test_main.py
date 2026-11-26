"""Unit tests for the scientific processing entrypoint."""

import pytest
from pytest import MonkeyPatch

from scientific_processing.application.app import APPLICATION
from scientific_processing.main import main

pytestmark = pytest.mark.unit


def test_main_runs_the_application(monkeypatch: MonkeyPatch) -> None:
    """Validate the entrypoint delegates to the application.

    Args:
    ----
        monkeypatch(MonkeyPatch): pytest monkeypatch fixture.

    Returns:
    -------
        None

    """
    # Arrange
    calls: list[bool] = []
    monkeypatch.setattr(APPLICATION, 'run', lambda: calls.append(True))
    # Act
    main()
    # Assert
    assert calls == [True]
