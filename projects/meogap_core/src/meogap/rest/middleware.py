"""Bearer identity extraction and enforcement for MEOGAP REST services.

The middleware validates that a bearer token is present and exposes the parsed
identity on ``request.state.identity``. Endpoints retrieve it through the
``get_identity`` dependency instead of parsing headers themselves.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response
from starlette.types import ASGIApp

from .contracts import ErrorResponse

AUTHORIZATION_HEADER = 'Authorization'
BEARER_SCHEME = 'Bearer'
WWW_AUTHENTICATE_VALUE = 'Bearer'
IDENTITY_STATE_KEY = 'identity'
UNAUTHORIZED_MESSAGE = 'A bearer token is required.'
INVALID_AUTHORIZATION_MESSAGE = 'Authorization header must contain exactly one Bearer token.'
ERROR_CODE_UNAUTHORIZED = 'UNAUTHORIZED'
ERROR_CODE_INVALID_AUTHORIZATION = 'INVALID_AUTHORIZATION'
BEARER_PARTS_COUNT = 2
EXEMPT_METHODS = frozenset({'OPTIONS'})
DEFAULT_EXEMPT_PATHS = (
    '/docs',
    '/docs/oauth2-redirect',
    '/openapi.json',
    '/redoc',
)


@dataclass(frozen=True)
class Identity:
    """Caller identity derived from the validated bearer token."""

    token: str = field(repr=False)


def get_identity(request: Request) -> Identity:
    """Return the identity attached to the current request.

    Args:
    ----
        request(Request): current FastAPI request.

    Returns:
    -------
        Identity: bearer identity populated by the middleware.

    Raises:
    ------
        HTTPException: when no validated identity is available.

    """
    identity = getattr(request.state, IDENTITY_STATE_KEY, None)
    if not isinstance(identity, Identity):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=UNAUTHORIZED_MESSAGE,
            headers={'WWW-Authenticate': WWW_AUTHENTICATE_VALUE},
        )
    return identity


class BearerIdentityMiddleware(BaseHTTPMiddleware):
    """Require a bearer token and expose the parsed identity on the request."""

    def __init__(
        self,
        app: ASGIApp,
        *,
        service: str,
        exempt_paths: Sequence[str] = (),
    ) -> None:
        """Initialize the middleware.

        Args:
        ----
            app(ASGIApp): wrapped ASGI application.
            service(str): logical service name used in error envelopes.
            exempt_paths(Sequence[str]): paths that do not require a bearer token.

        Returns:
        -------
            None

        """
        super().__init__(app)
        self.service = service
        self.exempt_paths = frozenset(DEFAULT_EXEMPT_PATHS) | frozenset(exempt_paths)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        """Validate the bearer token before forwarding the request.

        Args:
        ----
            request(Request): incoming request.
            call_next(RequestResponseEndpoint): next middleware or endpoint.

        Returns:
        -------
            Response: downstream response or a 401 error envelope.

        """
        if request.method in EXEMPT_METHODS or request.url.path in self.exempt_paths:
            return await call_next(request)

        values = request.headers.getlist(AUTHORIZATION_HEADER)
        if not values:
            return self._unauthorized(request, ERROR_CODE_UNAUTHORIZED, UNAUTHORIZED_MESSAGE)

        parts = values[0].split()
        if len(values) != 1 or len(parts) != BEARER_PARTS_COUNT or parts[0].lower() != BEARER_SCHEME.lower():
            return self._unauthorized(request, ERROR_CODE_INVALID_AUTHORIZATION, INVALID_AUTHORIZATION_MESSAGE)

        request.state.identity = Identity(token=parts[1])
        return await call_next(request)

    def _unauthorized(self, request: Request, code: str, message: str) -> JSONResponse:
        """Build a deterministic 401 response using the shared error envelope.

        Args:
        ----
            request(Request): request that failed authentication.
            code(str): machine-readable error code.
            message(str): human-readable error message.

        Returns:
        -------
            JSONResponse: HTTP 401 payload.

        """
        payload = ErrorResponse(
            code=code,
            message=message,
            service=self.service,
            operation=request.url.path,
        )
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=payload.model_dump(),
            headers={'WWW-Authenticate': WWW_AUTHENTICATE_VALUE},
        )
