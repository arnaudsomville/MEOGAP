"""Application layer for the public gateway service."""

import logging
import os

from fastapi import HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse, Response
from meogap import VERSION as SERVICE_VERSION
from meogap.app.base import BaseApplication
from meogap.rest.contracts import PUBLIC_HEALTH_PATH, ErrorResponse
from meogap.rest.factory import RestAppConfig
from meogap.rest.interface import RestInterface
from starlette.middleware.base import RequestResponseEndpoint

from gateway.application.routes import build_demo_router
from gateway.core.assets import geotiff_path, png_path
from gateway.core.demo import DemoError, DemoSettings, DemoStore

SERVICE_NAME = 'gateway'
APP_TITLE = 'MEOGAP Gateway'
APP_DESCRIPTION = 'Public REST gateway for the MEOGAP platform.'
ROOT_MESSAGE = 'MEOGAP GAT'
SERVER_HOST = '0.0.0.0'  # noqa: S104
SERVER_PORT = 8000
DEFAULT_CORS_ORIGINS = 'http://localhost:5173,http://localhost:8080'
CORS_ORIGINS = tuple(
    origin.strip() for origin in os.getenv('GATEWAY_CORS_ORIGINS', DEFAULT_CORS_ORIGINS).split(',') if origin.strip()
)
DEMO_HEADER = 'X-MEOGAP-Demo'
DEMO_HEADER_VALUE = 'true'
LOGGER = logging.getLogger(__name__)
CONFIG = RestAppConfig(
    service=SERVICE_NAME,
    title=APP_TITLE,
    version=SERVICE_VERSION,
    health_path=PUBLIC_HEALTH_PATH,
    description=APP_DESCRIPTION,
    cors_origins=CORS_ORIGINS,
    extra_exempt_paths=('/',),
    extra_exempt_prefixes=('/demo-assets/',),
)
DEMO_STORE = DemoStore(
    DemoSettings(
        queue_delay_seconds=float(os.getenv('GATEWAY_DEMO_QUEUE_DELAY_SECONDS', '1')),
        processing_delay_seconds=float(os.getenv('GATEWAY_DEMO_PROCESSING_DELAY_SECONDS', '2')),
        delivery_delay_seconds=float(os.getenv('GATEWAY_DEMO_DELIVERY_DELAY_SECONDS', '1')),
        failure_mode=os.getenv('GATEWAY_DEMO_FAILURE_MODE') or None,
    ),
)
REST_INTERFACE = RestInterface(
    CONFIG,
    routers=(build_demo_router(DEMO_STORE),),
    host=SERVER_HOST,
    port=SERVER_PORT,
)


class GatApplication(BaseApplication):
    """Application owning the public gateway interfaces."""

    def __init__(self) -> None:
        """Initialize the public gateway application."""
        super().__init__(interfaces=(REST_INTERFACE,))

    def startup(self) -> None:
        """Start gateway-specific dependencies."""
        LOGGER.warning('Gateway is running with deterministic in-memory M0 demo data; no EO processing is performed.')

    def shutdown(self) -> None:
        """Stop gateway-specific dependencies."""
        return None


APPLICATION = GatApplication()
app = REST_INTERFACE.app


@app.exception_handler(DemoError)
async def handle_demo_error(request: Request, exc: DemoError) -> JSONResponse:
    """Return caller-safe deterministic demo errors in the shared envelope.

    Args:
    ----
        request(Request): request that triggered the demo-domain failure.
        exc(DemoError): deterministic domain error.

    Returns:
    -------
        JSONResponse: shared error envelope with the requested status.

    """
    payload = ErrorResponse(
        code=exc.code,
        message=exc.message,
        service=SERVICE_NAME,
        operation=request.url.path,
    )
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump())


@app.middleware('http')
async def disclose_demo_response(request: Request, call_next: RequestResponseEndpoint) -> Response:
    """Label and log every response served by the deterministic demo Gateway.

    Args:
    ----
        request(Request): incoming HTTP request.
        call_next(object): downstream ASGI request handler.

    Returns:
    -------
        Response: downstream response labelled as deterministic demo data.

    """
    response = await call_next(request)
    response.headers[DEMO_HEADER] = DEMO_HEADER_VALUE
    LOGGER.info('Deterministic M0 demo response: %s %s -> %s', request.method, request.url.path, response.status_code)
    return response


@app.get('/demo-assets/ndvi/geotiff/{asset_name}', include_in_schema=False)
def demo_ndvi_geotiff(asset_name: str) -> FileResponse:
    """Serve one whitelisted georeferenced NDVI GeoTIFF.

    Args:
    ----
        asset_name(str): bundled GeoTIFF filename.

    Returns:
    -------
        FileResponse: GeoTIFF download.

    Raises:
    ------
        HTTPException: when the asset is not a known demonstration product.

    """
    path = geotiff_path(asset_name)
    if path is None:
        raise HTTPException(status_code=404, detail='NDVI GeoTIFF asset not found.')
    return FileResponse(
        path,
        media_type='image/tiff',
        filename=asset_name,
        headers={'Cache-Control': 'public, max-age=86400'},
    )


@app.get('/demo-assets/ndvi/{asset_name}', include_in_schema=False)
def demo_ndvi_png(asset_name: str) -> FileResponse:
    """Serve one whitelisted NDVI display PNG.

    Args:
    ----
        asset_name(str): bundled PNG filename.

    Returns:
    -------
        FileResponse: PNG display representation.

    Raises:
    ------
        HTTPException: when the asset is not a known demonstration product.

    """
    path = png_path(asset_name)
    if path is None:
        raise HTTPException(status_code=404, detail='NDVI display asset not found.')
    return FileResponse(
        path,
        media_type='image/png',
        headers={'Cache-Control': 'public, max-age=86400'},
    )


@app.get('/', include_in_schema=False)
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
