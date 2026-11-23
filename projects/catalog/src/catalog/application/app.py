"""Application layer for the data and asset catalogue service."""

import os

from meogap import VERSION as SERVICE_VERSION
from meogap.app.base import BaseApplication
from meogap.rest.contracts import INTERNAL_HEALTH_PATH
from meogap.rest.factory import RestAppConfig
from meogap.rest.interface import RestInterface

from catalog.application.rest import OPERATIONS

SERVICE_NAME = 'catalog'
APP_TITLE = 'MEOGAP Catalog'
APP_DESCRIPTION = 'Internal data and asset catalogue service.'
SERVER_HOST = '0.0.0.0'  # noqa: S104
SERVER_PORT = int(os.getenv('CATALOG_PORT', '8003'))
CONFIG = RestAppConfig(
    service=SERVICE_NAME,
    title=APP_TITLE,
    version=SERVICE_VERSION,
    health_path=INTERNAL_HEALTH_PATH,
    description=APP_DESCRIPTION,
)
REST_INTERFACE = RestInterface(CONFIG, OPERATIONS, host=SERVER_HOST, port=SERVER_PORT)


class CatApplication(BaseApplication):
    """Application owning the data and asset catalogue interfaces."""

    def __init__(self) -> None:
        """Initialize the data and asset catalogue application."""
        super().__init__(interfaces=(REST_INTERFACE,))

    def startup(self) -> None:
        """Start catalog-specific dependencies."""
        return None

    def shutdown(self) -> None:
        """Stop catalog-specific dependencies."""
        return None


APPLICATION = CatApplication()
app = REST_INTERFACE.app
