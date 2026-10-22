"""MEOGAP worker entrypoint and heartbeat loop."""

import logging
import os
import signal
import threading
from collections.abc import Callable

from meogap import VERSION as CORE_VERSION

WORKER_NAME = 'meogap-worker'
INTERVAL_SECONDS = 30.0
LOG_LEVEL = os.getenv('MEOGAP_WORKER_LOG_LEVEL', 'INFO')

logger = logging.getLogger(__name__)


def tick() -> str:
    """Build the heartbeat message for one worker iteration.

    Args:
    ----
        None

    Returns:
    -------
        A short message containing the core library version.

    """
    # Include the core version to prove the local dependency is installed.
    return f'{WORKER_NAME} alive (core {CORE_VERSION})'


def run_forever(
    stop_event: threading.Event,
    interval: float = INTERVAL_SECONDS,
    tick_fn: Callable[[], str] = tick,
) -> int:
    """Run heartbeat iterations until the stop event is set.

    Args:
    ----
        stop_event(threading.Event): event used to request a graceful stop.
        interval(float): seconds to wait between iterations.
        tick_fn(Callable[[], str]): heartbeat builder, injectable for tests.

    Returns:
    -------
        The number of completed iterations.

    """
    # Count iterations so callers and tests can observe the loop behavior.
    ticks = 0
    while not stop_event.is_set():
        logger.info(tick_fn())
        ticks += 1
        # A set event during the wait requests a clean shutdown.
        if stop_event.wait(interval):
            break
    return ticks


def main(
    run_fn: Callable[[threading.Event], int] = run_forever,
    signal_fn: Callable[..., object] = signal.signal,
) -> int:
    """Install signal handlers and run the worker loop.

    Args:
    ----
        run_fn(Callable[[threading.Event], int]): loop runner, injectable for tests.
        signal_fn(Callable[..., object]): signal registration function, injectable for tests.

    Returns:
    -------
        The number of completed iterations.

    """
    # Configure logging once at the process entrypoint.
    logging.basicConfig(level=LOG_LEVEL)
    stop_event = threading.Event()
    # Translate container stop signals into a graceful loop exit.
    signal_fn(signal.SIGTERM, lambda *_: stop_event.set())
    signal_fn(signal.SIGINT, lambda *_: stop_event.set())
    ticks = run_fn(stop_event)
    logger.info('worker stopped after %s ticks', ticks)
    return ticks


if __name__ == '__main__':
    main()
