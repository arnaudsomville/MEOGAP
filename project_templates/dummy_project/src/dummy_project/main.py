from collections.abc import Callable

import uvicorn
from fastapi import FastAPI

APP_TITLE = 'dummy_project'
ROOT_MESSAGE = 'Implement me'
SERVER_HOST = '0.0.0.0'
SERVER_PORT = 8000

app = FastAPI(title=APP_TITLE)


def dummy_project() -> bool:
    # Keep this as a trivial success path for smoke tests.
    return True


@app.get('/')
def root() -> str:
    # Provide a stable placeholder response for local checks.
    return ROOT_MESSAGE


def main(run_fn: Callable[..., None] = uvicorn.run) -> None:
    # Delegate server start to an injectable runner for tests.
    run_fn(app, host=SERVER_HOST, port=SERVER_PORT)


if __name__ == '__main__':
    main()
