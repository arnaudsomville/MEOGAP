"""Unit tests for the shared application lifecycle."""

from __future__ import annotations

import threading
from collections.abc import Sequence
from threading import Event

import pytest

from meogap.app.base import BaseApplication, BaseInterface

pytestmark = pytest.mark.unit


class RecordingInterface(BaseInterface):
    """Interface recording its lifecycle without external dependencies."""

    def __init__(self, *, fail: bool = False) -> None:
        """Initialize lifecycle state.

        Args:
        ----
            fail(bool): whether the interface should fail when running.

        Returns:
        -------
            None

        """
        self.fail = fail
        self.started = Event()
        self.stopped = Event()
        self.run_calls = 0
        self.stop_calls = 0

    @property
    def name(self) -> str:
        """Return the interface name.

        Returns
        -------
            str: interface name.

        """
        return 'recording'

    def run(self) -> None:
        """Wait until the interface is asked to stop.

        Returns
        -------
            None

        """
        self.run_calls += 1
        self.started.set()
        if self.fail:
            raise RuntimeError('interface failed')
        self.stopped.wait(timeout=1)

    def stop(self) -> None:
        """Record the stop request.

        Returns
        -------
            None

        """
        self.stop_calls += 1
        self.stopped.set()


class RecordingApplication(BaseApplication):
    """Application recording startup and shutdown calls."""

    def __init__(self, interfaces: Sequence[BaseInterface]) -> None:
        """Initialize the application.

        Args:
        ----
            interfaces(Sequence[BaseInterface]): interfaces to run.

        Returns:
        -------
            None

        """
        super().__init__(interfaces, install_signal_handlers=False)
        self.startup_calls = 0
        self.shutdown_calls = 0

    def startup(self) -> None:
        """Record startup.

        Returns
        -------
            None

        """
        self.startup_calls += 1

    def shutdown(self) -> None:
        """Record shutdown.

        Returns
        -------
            None

        """
        self.shutdown_calls += 1


def test_base_application_is_abstract() -> None:
    """Validate the base application cannot be instantiated directly.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act / Assert
    with pytest.raises(TypeError):
        BaseApplication(())  # type: ignore[abstract]


def test_application_runs_interfaces_in_threads_and_stops_them() -> None:
    """Validate startup, interface threads, stop and shutdown ordering.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    interface = RecordingInterface()
    application = RecordingApplication((interface,))
    thread = threading.Thread(target=application.run)
    # Act
    thread.start()
    assert interface.started.wait(timeout=1)
    application.stop()
    thread.join(timeout=1)
    # Assert
    assert not thread.is_alive()
    assert application.startup_calls == 1
    assert application.shutdown_calls == 1
    assert interface.run_calls == 1
    assert interface.stop_calls == 1


def test_interface_failure_stops_the_application() -> None:
    """Validate an interface failure triggers shutdown.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    interface = RecordingInterface(fail=True)
    application = RecordingApplication((interface,))
    thread = threading.Thread(target=application.run)
    # Act
    thread.start()
    thread.join(timeout=1)
    # Assert
    assert not thread.is_alive()
    assert application.startup_calls == 1
    assert application.shutdown_calls == 1
    assert interface.stop_calls == 1
