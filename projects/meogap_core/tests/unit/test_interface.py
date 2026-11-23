"""Unit tests for the REST interface."""

from __future__ import annotations

from typing import ClassVar

import pytest
from fastapi import FastAPI
from pytest import MonkeyPatch

from meogap.rest.contracts import INTERNAL_HEALTH_PATH, Operation
from meogap.rest.factory import RestAppConfig
from meogap.rest.interface import RestInterface

pytestmark = pytest.mark.unit

SERVICE = 'svc'
VERSION = '1.2.3'
TEST_PORT = 9000
OPERATION = Operation('GET', '/internal/v1/items', 'svc_list_items', 'List items.')


class FakeServer:
    """Minimal uvicorn server double."""

    instances: ClassVar[list[FakeServer]] = []

    def __init__(self, config: object) -> None:
        """Initialize the fake server.

        Args:
        ----
            config(object): uvicorn configuration.

        Returns:
        -------
            None

        """
        self.config = config
        self.should_exit = False
        self.run_called = False
        FakeServer.instances.append(self)

    def run(self) -> None:
        """Record the run call.

        Returns
        -------
            None

        """
        self.run_called = True


def build_config() -> RestAppConfig:
    """Build a deterministic REST application configuration.

    Returns
    -------
        RestAppConfig: configuration under test.

    """
    return RestAppConfig(service=SERVICE, title='Test service', version=VERSION, health_path=INTERNAL_HEALTH_PATH)


def test_rest_interface_exposes_the_application_and_name() -> None:
    """Validate the REST interface owns the FastAPI application.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act
    interface = RestInterface(build_config(), (OPERATION,))
    # Assert
    assert isinstance(interface.app, FastAPI)
    assert interface.name == f'{SERVICE}-rest'
    assert interface.operations == (OPERATION,)


def test_rest_interface_runs_uvicorn_with_the_configured_address(monkeypatch: MonkeyPatch) -> None:
    """Validate the interface forwards its configuration to uvicorn.

    Args:
    ----
        monkeypatch(MonkeyPatch): pytest monkeypatch fixture.

    Returns:
    -------
        None

    """
    # Arrange
    configs: list[dict[str, object]] = []

    def fake_config(app: FastAPI, **kwargs: object) -> object:
        configs.append({'app': app, 'kwargs': kwargs})
        return object()

    FakeServer.instances.clear()
    monkeypatch.setattr('meogap.rest.interface.uvicorn.Config', fake_config)
    monkeypatch.setattr('meogap.rest.interface.uvicorn.Server', FakeServer)
    interface = RestInterface(build_config(), host='127.0.0.1', port=TEST_PORT, log_level='debug')
    # Act
    interface.run()
    # Assert
    assert configs[0]['app'] is interface.app
    assert configs[0]['kwargs'] == {'host': '127.0.0.1', 'port': TEST_PORT, 'log_level': 'debug'}
    assert FakeServer.instances[0].run_called


def test_rest_interface_stop_before_run_requests_immediate_exit(monkeypatch: MonkeyPatch) -> None:
    """Validate a pre-run stop request is honored by the server.

    Args:
    ----
        monkeypatch(MonkeyPatch): pytest monkeypatch fixture.

    Returns:
    -------
        None

    """
    # Arrange
    FakeServer.instances.clear()
    monkeypatch.setattr('meogap.rest.interface.uvicorn.Config', lambda app, **kwargs: object())
    monkeypatch.setattr('meogap.rest.interface.uvicorn.Server', FakeServer)
    interface = RestInterface(build_config())
    # Act
    interface.stop()
    interface.run()
    # Assert
    assert FakeServer.instances[0].should_exit is True
