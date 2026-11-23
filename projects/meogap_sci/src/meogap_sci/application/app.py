"""Application layer for the scientific processing service."""

import os

from meogap import VERSION as SERVICE_VERSION
from meogap.app.base import BaseApplication
from meogap.rest.contracts import INTERNAL_HEALTH_PATH
from meogap.rest.factory import RestAppConfig
from meogap.rest.interface import RestInterface

from meogap_sci.application.rest import OPERATIONS

SERVICE_NAME = 'sci'
APP_TITLE = 'MEOGAP Scientific Processing (SCI)'
APP_DESCRIPTION = 'Internal scientific processing service.'
SERVER_HOST = '0.0.0.0'  # noqa: S104
SERVER_PORT = int(os.getenv('MEOGAP_SCI_PORT', '8002'))
CONFIG = RestAppConfig(
    service=SERVICE_NAME,
    title=APP_TITLE,
    version=SERVICE_VERSION,
    health_path=INTERNAL_HEALTH_PATH,
    description=APP_DESCRIPTION,
)
REST_INTERFACE = RestInterface(CONFIG, OPERATIONS, host=SERVER_HOST, port=SERVER_PORT)


class SciApplication(BaseApplication):
    """Application owning the scientific processing interfaces."""

    def __init__(self) -> None:
        """Initialize the scientific processing application."""
        super().__init__(interfaces=(REST_INTERFACE,))

    def startup(self) -> None:
        """Start sci-specific dependencies."""
        return None

    def shutdown(self) -> None:
        """Stop sci-specific dependencies."""
        return None


APPLICATION = SciApplication()
app = REST_INTERFACE.app
