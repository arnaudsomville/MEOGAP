import os
from collections.abc import Callable

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from meogap import VERSION as CORE_VERSION

APP_TITLE = 'MEOGAP API'
ROOT_MESSAGE = 'MEOGAP API'
HEALTH_PATH = '/api/v1/health'
SERVER_HOST = '0.0.0.0'
SERVER_PORT = 8000
DEFAULT_CORS_ORIGINS = 'http://localhost:5173,http://localhost:8080'
CORS_ORIGINS = [
    origin.strip() for origin in os.getenv('MEOGAP_CORS_ORIGINS', DEFAULT_CORS_ORIGINS).split(',') if origin.strip()
]

app = FastAPI(title=APP_TITLE)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=['*'],
    allow_headers=['*'],
)


@app.get('/')
def root() -> str:
    """Return a stable placeholder for the API root.

    Args:
    ----
        None

    Returns:
    -------
        The API root message.

    """
    # Keep a human-readable response for quick checks.
    return ROOT_MESSAGE


@app.get(HEALTH_PATH)
def health() -> dict[str, str]:
    """Expose the API health status and the core library version.

    Args:
    ----
        None

    Returns:
    -------
        A mapping with the service status and core version.

    """
    # Include the core version to prove the local dependency is installed.
    return {'status': 'ok', 'core_version': CORE_VERSION}


def main(run_fn: Callable[..., None] = uvicorn.run) -> None:
    """Start the API server.

    Args:
    ----
        run_fn(Callable[..., None]): server runner, injectable for tests.

    Returns:
    -------
        None

    """
    # Delegate the server start to an injectable runner.
    run_fn(app, host=SERVER_HOST, port=SERVER_PORT)


if __name__ == '__main__':
    main()
