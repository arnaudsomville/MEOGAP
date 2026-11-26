"""Application lifecycle abstractions shared by every MEOGAP service."""

from __future__ import annotations

import logging
import signal
import threading
from abc import ABC, abstractmethod
from collections.abc import Sequence
from threading import Event, Thread
from types import FrameType
from typing import Any

LOGGER = logging.getLogger(__name__)

INTERFACE_JOIN_TIMEOUT_SECONDS = 5.0


class BaseInterface(ABC):
    """Long-running interface managed by :class:`BaseApplication`."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Return a stable interface name.

        Returns
        -------
            str: interface name used for the worker thread.

        """

    @abstractmethod
    def run(self) -> None:
        """Run the interface until it is asked to stop.

        Returns
        -------
            None

        """

    @abstractmethod
    def stop(self) -> None:
        """Request the interface to stop and release its resources.

        Returns
        -------
            None

        """


class BaseApplication(ABC):
    """Abstract application owning startup, shutdown and interface threads."""

    def __init__(
        self,
        interfaces: Sequence[BaseInterface],
        *,
        install_signal_handlers: bool = True,
    ) -> None:
        """Initialize the application.

        Args:
        ----
            interfaces(Sequence[BaseInterface]): interfaces started in worker threads.
            install_signal_handlers(bool): install SIGINT/SIGTERM handlers when possible.

        Returns:
        -------
            None

        """
        self.interfaces = tuple(interfaces)
        self._handle_signals = install_signal_handlers
        self._threads: list[Thread] = []
        self._stop_event = Event()
        self._previous_signal_handlers: dict[signal.Signals, Any] = {}

    @abstractmethod
    def startup(self) -> None:
        """Start service-specific dependencies before interfaces.

        Returns
        -------
            None

        """

    @abstractmethod
    def shutdown(self) -> None:
        """Stop service-specific dependencies after interfaces.

        Returns
        -------
            None

        """

    def run(self) -> None:
        """Run the application until an interface stops or a signal is received.

        Returns
        -------
            None

        """
        try:
            self._install_signal_handlers()
            self.startup()
            self._start_interfaces()
            self._stop_event.wait()
        finally:
            self._stop_interfaces()
            self.shutdown()
            self._restore_signal_handlers()

    def stop(self) -> None:
        """Request the application to stop.

        Returns
        -------
            None

        """
        self._stop_event.set()

    def _start_interfaces(self) -> None:
        """Start every interface in its own daemon thread.

        Returns
        -------
            None

        """
        for interface in self.interfaces:
            thread = Thread(
                target=self._serve_interface,
                args=(interface,),
                name=f'meogap-{interface.name}',
                daemon=True,
            )
            thread.start()
            self._threads.append(thread)

    def _serve_interface(self, interface: BaseInterface) -> None:
        """Run one interface and stop the application when it exits.

        Args:
        ----
            interface(BaseInterface): interface to run.

        Returns:
        -------
            None

        """
        try:
            interface.run()
        except Exception:
            LOGGER.exception('Interface %s failed.', interface.name)
        finally:
            self._stop_event.set()

    def _stop_interfaces(self) -> None:
        """Ask every interface to stop and join its worker thread.

        Returns
        -------
            None

        """
        for interface in reversed(self.interfaces):
            try:
                interface.stop()
            except Exception:
                LOGGER.exception('Failed to stop interface %s.', interface.name)
        for thread in self._threads:
            thread.join(timeout=INTERFACE_JOIN_TIMEOUT_SECONDS)
            if thread.is_alive():
                LOGGER.warning(
                    'Interface thread %s did not stop within %.1f seconds.',
                    thread.name,
                    INTERFACE_JOIN_TIMEOUT_SECONDS,
                )
        self._threads.clear()

    def _install_signal_handlers(self) -> None:
        """Install SIGINT and SIGTERM handlers when running in the main thread.

        Returns
        -------
            None

        """
        if not self._handle_signals or threading.current_thread() is not threading.main_thread():
            return
        for sig in (signal.SIGINT, signal.SIGTERM):
            self._previous_signal_handlers[sig] = signal.getsignal(sig)
            signal.signal(sig, self._handle_signal)

    def _restore_signal_handlers(self) -> None:
        """Restore the signal handlers that were active before startup.

        Returns
        -------
            None

        """
        for sig, handler in self._previous_signal_handlers.items():
            signal.signal(sig, handler)
        self._previous_signal_handlers.clear()

    def _handle_signal(self, signum: int, frame: FrameType | None) -> None:
        """Request a graceful shutdown from a signal handler.

        Args:
        ----
            signum(int): received signal number.
            frame(FrameType | None): current stack frame.

        Returns:
        -------
            None

        """
        _ = signum, frame
        self.stop()
