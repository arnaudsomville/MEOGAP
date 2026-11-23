"""Application layer for the public gateway service."""

import os

from meogap import VERSION as SERVICE_VERSION
from meogap.app.base import BaseApplication
from meogap.rest.contracts import PUBLIC_HEALTH_PATH
from meogap.rest.factory import RestAppConfig
from meogap.rest.interface import RestInterface

from meogap_gat.application.rest import OPERATIONS

SERVICE_NAME = 'gat'
APP_TITLE = 'MEOGAP Gateway (GAT)'
APP_DESCRIPTION = 'Public REST gateway for the MEOGAP platform.'
ROOT_MESSAGE = 'MEOGAP GAT'
SERVER_HOST = '0.0.0.0'  # noqa: S104
SERVER_PORT = 8000
DEFAULT_CORS_ORIGINS = 'http://localhost:5173,http://localhost:8080'
CORS_ORIGINS = tuple(
    origin.strip() for origin in os.getenv('MEOGAP_CORS_ORIGINS', DEFAULT_CORS_ORIGINS).split(',') if origin.strip()
)
CONFIG = RestAppConfig(
    service=SERVICE_NAME,
    title=APP_TITLE,
    version=SERVICE_VERSION,
    health_path=PUBLIC_HEALTH_PATH,
    description=APP_DESCRIPTION,
    cors_origins=CORS_ORIGINS,
    extra_exempt_paths=('/',),
)
REST_INTERFACE = RestInterface(CONFIG, OPERATIONS, host=SERVER_HOST, port=SERVER_PORT)


class GatApplication(BaseApplication):
    """Application owning the public gateway interfaces."""

    def __init__(self) -> None:
        """Initialize the public gateway application."""
        super().__init__(interfaces=(REST_INTERFACE,))

    def startup(self) -> None:
        """Start gat-specific dependencies."""
        return None

    def shutdown(self) -> None:
        """Stop gat-specific dependencies."""
        return None


APPLICATION = GatApplication()
app = REST_INTERFACE.app


@app.get('/')
def root() -> str:
    """Return a stable placeholder for the public gateway root.

    Args:
    ----
        None

    Returns:
    -------
        The gateway root message.

    """
    return ROOT_MESSAGE
