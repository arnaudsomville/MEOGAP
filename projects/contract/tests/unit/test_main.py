"""Unit tests for the control and orchestration entrypoint."""

import pytest
from pytest import MonkeyPatch

from contract.application.app import APPLICATION
from contract.main import main

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
