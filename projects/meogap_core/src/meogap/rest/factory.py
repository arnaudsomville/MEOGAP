"""Reusable FastAPI application factory and exception handling for MEOGAP services."""

from __future__ import annotations

import logging
from collections.abc import Mapping, Sequence
from dataclasses import dataclass

from fastapi import APIRouter, FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .contracts import ErrorResponse, Operation, build_base_router, build_not_implemented_router
from .middleware import ERROR_CODE_UNAUTHORIZED, BearerIdentityMiddleware

LOGGER = logging.getLogger(__name__)

ERROR_CODE_BAD_REQUEST = 'BAD_REQUEST'
ERROR_CODE_FORBIDDEN = 'FORBIDDEN'
ERROR_CODE_NOT_FOUND = 'NOT_FOUND'
ERROR_CODE_METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED'
ERROR_CODE_CONFLICT = 'CONFLICT'
ERROR_CODE_UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY'
ERROR_CODE_INTERNAL_ERROR = 'INTERNAL_ERROR'
ERROR_CODE_HTTP_ERROR = 'HTTP_ERROR'
INTERNAL_ERROR_MESSAGE = 'An unexpected internal error occurred.'
VALIDATION_ERROR_MESSAGE = 'The request payload is invalid.'

STATUS_CODE_TO_ERROR_CODE: dict[int, str] = {
    status.HTTP_400_BAD_REQUEST: ERROR_CODE_BAD_REQUEST,
    status.HTTP_401_UNAUTHORIZED: ERROR_CODE_UNAUTHORIZED,
    status.HTTP_403_FORBIDDEN: ERROR_CODE_FORBIDDEN,
    status.HTTP_404_NOT_FOUND: ERROR_CODE_NOT_FOUND,
    status.HTTP_405_METHOD_NOT_ALLOWED: ERROR_CODE_METHOD_NOT_ALLOWED,
    status.HTTP_409_CONFLICT: ERROR_CODE_CONFLICT,
    status.HTTP_422_UNPROCESSABLE_ENTITY: ERROR_CODE_UNPROCESSABLE_ENTITY,
    status.HTTP_500_INTERNAL_SERVER_ERROR: ERROR_CODE_INTERNAL_ERROR,
}


@dataclass(frozen=True)
class RestAppConfig:
    """Declarative configuration for a reusable MEOGAP REST application."""

    service: str
    title: str
    version: str
    health_path: str
    description: str = ''
    summary: str = ''
    cors_origins: tuple[str, ...] = ()
    require_bearer: bool = True
    extra_exempt_paths: tuple[str, ...] = ()


def error_code_for_status(status_code: int) -> str:
    """Map an HTTP status code to the stable MEOGAP error code.

    Args:
    ----
        status_code(int): HTTP status code.

    Returns:
    -------
        str: machine-readable error code.

    """
    return STATUS_CODE_TO_ERROR_CODE.get(status_code, ERROR_CODE_HTTP_ERROR)


def _error_response(
    request: Request,
    service: str,
    status_code: int,
    message: str,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    """Build a JSON error response using the shared envelope.

    Args:
    ----
        request(Request): request that failed.
        service(str): logical service name.
        status_code(int): HTTP status code.
        message(str): human-readable error message.
        headers(Mapping[str, str] | None): optional response headers.

    Returns:
    -------
        JSONResponse: formatted error response.

    """
    payload = ErrorResponse(
        code=error_code_for_status(status_code),
        message=message,
        service=service,
        operation=request.url.path,
    )
    return JSONResponse(status_code=status_code, content=payload.model_dump(), headers=headers)


def install_exception_handlers(app: FastAPI, *, service: str) -> None:
    """Register the shared exception handlers on an application.

    Args:
    ----
        app(FastAPI): application receiving the handlers.
        service(str): logical service name used in error envelopes.

    Returns:
    -------
        None

    """

    @app.exception_handler(HTTPException)
    async def handle_http_exception(request: Request, exc: HTTPException) -> JSONResponse:
        """Return the shared envelope for HTTP exceptions.

        Args:
        ----
            request(Request): current request.
            exc(HTTPException): raised HTTP exception.

        Returns:
        -------
            JSONResponse: formatted error response.

        """
        return _error_response(request, service, exc.status_code, str(exc.detail), headers=exc.headers)

    @app.exception_handler(RequestValidationError)
    async def handle_request_validation_error(request: Request, exc: RequestValidationError) -> JSONResponse:
        """Map request validation failures to the shared error envelope.

        Args:
        ----
            request(Request): request with an invalid path, query or body value.
            exc(RequestValidationError): FastAPI validation failure.

        Returns:
        -------
            JSONResponse: caller-safe HTTP 422 error response.

        """
        del exc
        return _error_response(
            request,
            service,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            VALIDATION_ERROR_MESSAGE,
        )

    @app.exception_handler(ValueError)
    async def handle_value_error(request: Request, exc: ValueError) -> JSONResponse:
        """Map invalid values to HTTP 400.

        Args:
        ----
            request(Request): current request.
            exc(ValueError): raised value error.

        Returns:
        -------
            JSONResponse: formatted error response.

        """
        return _error_response(request, service, status.HTTP_400_BAD_REQUEST, str(exc))

    @app.exception_handler(KeyError)
    async def handle_key_error(request: Request, exc: KeyError) -> JSONResponse:
        """Map missing keys to HTTP 404.

        Args:
        ----
            request(Request): current request.
            exc(KeyError): raised key error.

        Returns:
        -------
            JSONResponse: formatted error response.

        """
        detail = str(exc.args[0]) if exc.args else str(exc)
        return _error_response(request, service, status.HTTP_404_NOT_FOUND, detail)

    @app.exception_handler(Exception)
    async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
        """Map unexpected failures to HTTP 500 without leaking internals.

        Args:
        ----
            request(Request): current request.
            exc(Exception): unhandled exception.

        Returns:
        -------
            JSONResponse: formatted error response.

        """
        LOGGER.exception('Unexpected error while handling %s %s: %s', request.method, request.url.path, exc)
        return _error_response(request, service, status.HTTP_500_INTERNAL_SERVER_ERROR, INTERNAL_ERROR_MESSAGE)


def create_rest_app(
    config: RestAppConfig,
    operations: Sequence[Operation] = (),
    routers: Sequence[APIRouter] = (),
) -> FastAPI:
    """Create a reusable MEOGAP REST application.

    Args:
    ----
        config(RestAppConfig): application configuration.
        operations(Sequence[Operation]): stubbed business operations owned by the service.
        routers(Sequence[APIRouter]): implemented business routers owned by the service.

    Returns:
    -------
        FastAPI: configured application exposing health and declared operations.

    """
    app = FastAPI(
        title=config.title,
        description=config.description,
        summary=config.summary,
        version=config.version,
    )
    app.state.service = config.service
    app.state.identity_required = config.require_bearer

    if config.require_bearer:
        # Add the bearer middleware first so CORS remains the outermost layer.
        app.add_middleware(
            BearerIdentityMiddleware,
            service=config.service,
            exempt_paths=(config.health_path, *config.extra_exempt_paths),
        )
    if config.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=list(config.cors_origins),
            allow_methods=['*'],
            allow_headers=['*'],
        )

    install_exception_handlers(app, service=config.service)
    app.include_router(
        build_base_router(service=config.service, version=config.version, health_path=config.health_path)
    )
    if operations:
        app.include_router(build_not_implemented_router(service=config.service, operations=operations))
    for router in routers:
        app.include_router(router)
    return app
