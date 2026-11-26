"""REST interface managed by the shared application lifecycle."""

from __future__ import annotations

from collections.abc import Sequence
from threading import Event, Lock

import uvicorn
from fastapi import APIRouter

from meogap.app.base import BaseInterface
from meogap.rest.contracts import Operation
from meogap.rest.factory import RestAppConfig, create_rest_app

DEFAULT_REST_HOST = '0.0.0.0'  # noqa: S104
DEFAULT_REST_PORT = 8000
DEFAULT_REST_LOG_LEVEL = 'info'


class RestInterface(BaseInterface):
    """Concrete REST interface running a FastAPI application through uvicorn."""

    def __init__(
        self,
        config: RestAppConfig,
        operations: Sequence[Operation] = (),
        routers: Sequence[APIRouter] = (),
        *,
        host: str = DEFAULT_REST_HOST,
        port: int = DEFAULT_REST_PORT,
        log_level: str = DEFAULT_REST_LOG_LEVEL,
    ) -> None:
        """Initialize the REST interface.

        Args:
        ----
            config(RestAppConfig): REST application configuration.
            operations(Sequence[Operation]): stubbed business operations owned by the service.
            routers(Sequence[APIRouter]): implemented business routers owned by the service.
            host(str): bind address.
            port(int): bind port.
            log_level(str): uvicorn log level.

        Returns:
        -------
            None

        """
        self.config = config
        self.operations = tuple(operations)
        self.routers = tuple(routers)
        self.host = host
        self.port = port
        self.log_level = log_level
        self.app = create_rest_app(config, self.operations, self.routers)
        self._server: uvicorn.Server | None = None
        self._server_lock = Lock()
        self._stop_requested = Event()

    @property
    def name(self) -> str:
        """Return the interface name used for the worker thread.

        Returns
        -------
            str: stable interface name.

        """
        return f'{self.config.service}-rest'

    def run(self) -> None:
        """Run the REST server until it is asked to stop.

        Returns
        -------
            None

        """
        config = uvicorn.Config(self.app, host=self.host, port=self.port, log_level=self.log_level)
        server = uvicorn.Server(config)
        with self._server_lock:
            self._server = server
        if self._stop_requested.is_set():
            server.should_exit = True
        try:
            server.run()
        finally:
            with self._server_lock:
                self._server = None

    def stop(self) -> None:
        """Request the REST server to stop.

        Returns
        -------
            None

        """
        self._stop_requested.set()
        with self._server_lock:
            server = self._server
        if server is not None:
            server.should_exit = True
