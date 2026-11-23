"""Unit tests for the worker heartbeat loop and signal handling."""

import signal
import threading

import pytest
from meogap import VERSION as CORE_VERSION

from worker.application.worker import INTERVAL_SECONDS, WORKER_NAME, main, run_forever, tick

pytestmark = pytest.mark.unit

TEST_INTERVAL_SECONDS = 2.0
EXPECTED_TICKS = 2
EXPECTED_MAIN_TICKS = 3
EXPECTED_INTERVAL_SECONDS = 30.0


class FakeStopEvent:
    """Deterministic event double for loop tests."""

    def __init__(self, already_set: bool = False, wait_results: list[bool] | None = None) -> None:
        """Store the initial state and the scripted wait results."""
        self._already_set = already_set
        self._wait_results = list(wait_results or [])
        self.wait_timeouts: list[float] = []

    def is_set(self) -> bool:
        """Return the configured initial state."""
        return self._already_set

    def wait(self, timeout: float) -> bool:
        """Record the timeout and return the next configured result."""
        self.wait_timeouts.append(timeout)
        if not self._wait_results:
            return True
        return self._wait_results.pop(0)


def test_tick_reports_core_version() -> None:
    """Validate the heartbeat identifies the worker and core version.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act
    result = tick()
    # Assert
    assert WORKER_NAME in result
    assert CORE_VERSION in result


def test_run_forever_stops_when_wait_requests_shutdown() -> None:
    """Validate the loop executes until the event wait requests a stop.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    stop_event = FakeStopEvent(wait_results=[False, True])
    ticks: list[int] = []

    def fake_tick() -> str:
        ticks.append(1)
        return 'heartbeat'

    # Act
    result = run_forever(  # type: ignore[arg-type]
        stop_event=stop_event,
        interval=TEST_INTERVAL_SECONDS,
        tick_fn=fake_tick,
    )
    # Assert
    assert result == EXPECTED_TICKS
    assert len(ticks) == EXPECTED_TICKS
    assert stop_event.wait_timeouts == [TEST_INTERVAL_SECONDS, TEST_INTERVAL_SECONDS]


def test_run_forever_returns_zero_when_already_stopped() -> None:
    """Validate an already-set event prevents any iteration.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    stop_event = FakeStopEvent(already_set=True)

    def fake_tick() -> str:
        raise AssertionError('tick must not be called')

    # Act
    result = run_forever(stop_event=stop_event, tick_fn=fake_tick)  # type: ignore[arg-type]
    # Assert
    assert result == 0


def test_main_registers_signals_and_runs_loop() -> None:
    """Validate signal handlers stop the event and the runner result is returned.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    captured: dict[str, object] = {}
    handlers: dict[int, object] = {}

    def fake_run(stop_event: threading.Event) -> int:
        captured['event'] = stop_event
        return EXPECTED_MAIN_TICKS

    def fake_signal(signum: int, handler: object) -> None:
        handlers[signum] = handler

    # Act
    result = main(run_fn=fake_run, signal_fn=fake_signal)
    # Assert
    assert result == EXPECTED_MAIN_TICKS
    assert set(handlers) == {signal.SIGTERM, signal.SIGINT}
    sigterm_handler = handlers[signal.SIGTERM]
    assert callable(sigterm_handler)
    sigterm_handler(None, None)
    event = captured['event']
    assert isinstance(event, threading.Event)
    assert event.is_set() is True
    assert INTERVAL_SECONDS == EXPECTED_INTERVAL_SECONDS
