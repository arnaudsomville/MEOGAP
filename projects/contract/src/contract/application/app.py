"""Application layer for the control and orchestration service."""

import os

from meogap import VERSION as SERVICE_VERSION
from meogap.app.base import BaseApplication
from meogap.rest.contracts import INTERNAL_HEALTH_PATH
from meogap.rest.factory import RestAppConfig
from meogap.rest.interface import RestInterface

from contract.application.rest import OPERATIONS

SERVICE_NAME = 'contract'
APP_TITLE = 'MEOGAP Contract'
APP_DESCRIPTION = 'Internal contract, control and orchestration service.'
SERVER_HOST = '0.0.0.0'  # noqa: S104
SERVER_PORT = int(os.getenv('CONTRACT_PORT', '8001'))
CONFIG = RestAppConfig(
    service=SERVICE_NAME,
    title=APP_TITLE,
    version=SERVICE_VERSION,
    health_path=INTERNAL_HEALTH_PATH,
    description=APP_DESCRIPTION,
)
REST_INTERFACE = RestInterface(CONFIG, OPERATIONS, host=SERVER_HOST, port=SERVER_PORT)


class ConApplication(BaseApplication):
    """Application owning the control and orchestration interfaces."""

    def __init__(self) -> None:
        """Initialize the control and orchestration application."""
        super().__init__(interfaces=(REST_INTERFACE,))

    def startup(self) -> None:
        """Start contract-specific dependencies."""
        return None

    def shutdown(self) -> None:
        """Stop contract-specific dependencies."""
        return None


APPLICATION = ConApplication()
app = REST_INTERFACE.app
