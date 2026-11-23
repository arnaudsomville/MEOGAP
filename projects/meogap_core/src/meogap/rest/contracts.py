"""Shared REST contracts, models and route builders for MEOGAP services.

The reference contracts live in ``projects/meogap_interfaces/rest`` as
language-neutral OpenAPI JSON. This module provides the Python building blocks
that every service reuses without generating code from those documents.
"""

from __future__ import annotations

from collections.abc import Callable, Sequence
from dataclasses import dataclass
from typing import Any

from fastapi import APIRouter, Security, status
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer
from pydantic import BaseModel, Field

PUBLIC_API_PREFIX = '/api/v1'
INTERNAL_API_PREFIX = '/internal/v1'
PUBLIC_HEALTH_PATH = f'{PUBLIC_API_PREFIX}/health'
INTERNAL_HEALTH_PATH = f'{INTERNAL_API_PREFIX}/health'

STATUS_OK = 'ok'
ERROR_CODE_NOT_IMPLEMENTED = 'NOT_IMPLEMENTED'
NOT_IMPLEMENTED_MESSAGE = 'Operation is part of the M0 contract but is not implemented yet.'
NOT_IMPLEMENTED_DESCRIPTION = 'Operation intentionally not implemented in M0.'
HEALTH_SUMMARY = 'Report service liveness.'


class ErrorResponse(BaseModel):
    """Stable error envelope returned by every failed MEOGAP REST operation."""

    code: str = Field(description='Machine-readable error code.')
    message: str = Field(description='Human-readable error message.')
    service: str = Field(description='Logical service that produced the error.')
    operation: str = Field(description='Operation identifier or request path that failed.')


class HealthResponse(BaseModel):
    """Liveness payload exposed by every MEOGAP service."""

    status: str = Field(description='Service status; ok when the process answers.')
    service: str = Field(description='Logical service name.')
    version: str = Field(description='Service version.')


@dataclass(frozen=True)
class Operation:
    """One logical REST operation owned by a service."""

    method: str
    path: str
    operation_id: str
    summary: str


def build_base_router(*, service: str, version: str, health_path: str) -> APIRouter:
    """Build the base router shared by every MEOGAP REST service.

    Args:
    ----
        service(str): logical service name.
        version(str): service version reported by the liveness route.
        health_path(str): versioned liveness route path.

    Returns:
    -------
        APIRouter: router exposing the liveness endpoint.

    """
    router = APIRouter(tags=[service])

    def health() -> HealthResponse:
        """Return the service liveness payload.

        Args:
        ----
            None

        Returns:
        -------
            HealthResponse: status, service name and version.

        """
        return HealthResponse(status=STATUS_OK, service=service, version=version)

    router.add_api_route(
        health_path,
        health,
        methods=['GET'],
        name=f'{service}_health',
        operation_id=f'{service}_health',
        summary=HEALTH_SUMMARY,
        response_model=HealthResponse,
    )
    return router


def _not_implemented_endpoint(service: str, operation: Operation) -> Callable[..., Any]:
    """Build a deterministic HTTP 501 endpoint for one logical operation.

    Args:
    ----
        service(str): logical service name producing the response.
        operation(Operation): operation that is not implemented yet.

    Returns:
    -------
        object: ASGI endpoint returning the stable error envelope.

    """

    async def endpoint() -> JSONResponse:
        """Return the stable not-implemented error envelope.

        Args:
        ----
            None

        Returns:
        -------
            JSONResponse: HTTP 501 payload using the shared error model.

        """
        payload = ErrorResponse(
            code=ERROR_CODE_NOT_IMPLEMENTED,
            message=NOT_IMPLEMENTED_MESSAGE,
            service=service,
            operation=operation.operation_id,
        )
        return JSONResponse(status_code=status.HTTP_501_NOT_IMPLEMENTED, content=payload.model_dump())

    endpoint.__name__ = operation.operation_id
    endpoint.__doc__ = operation.summary
    return endpoint


def build_not_implemented_router(*, service: str, operations: Sequence[Operation]) -> APIRouter:
    """Build a router that answers every declared business operation with HTTP 501.

    Args:
    ----
        service(str): logical service name producing the responses.
        operations(Sequence[Operation]): operations owned by that service.

    Returns:
    -------
        APIRouter: router declaring the bearer security scheme and 501 routes.

    """
    # Declaring the bearer scheme keeps the generated documentation aligned with the reference contract.
    router = APIRouter(tags=[service], dependencies=[Security(HTTPBearer(auto_error=False))])
    for operation in operations:
        router.add_api_route(
            operation.path,
            _not_implemented_endpoint(service, operation),
            methods=[operation.method],
            name=operation.operation_id,
            operation_id=operation.operation_id,
            summary=operation.summary,
            responses={
                status.HTTP_401_UNAUTHORIZED: {
                    'model': ErrorResponse,
                    'description': 'Missing or malformed bearer token.',
                },
                status.HTTP_501_NOT_IMPLEMENTED: {
                    'model': ErrorResponse,
                    'description': NOT_IMPLEMENTED_DESCRIPTION,
                },
            },
        )
    return router
