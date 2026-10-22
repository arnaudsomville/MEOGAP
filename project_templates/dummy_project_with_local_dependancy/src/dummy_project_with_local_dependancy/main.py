from collections.abc import Callable

import uvicorn
from dummy_project.main import dummy_project
from fastapi import FastAPI

APP_TITLE = 'dummy_project_with_local_dependancy'
ROOT_MESSAGE = 'Implement me'
SERVER_HOST = '0.0.0.0'
SERVER_PORT = 8000

app = FastAPI(title=APP_TITLE)


def dummy_project_with_local_dependancy() -> bool:
    # Keep the local dependency call explicit for smoke tests.
    return bool(dummy_project())


@app.get('/')
def root() -> str:
    # Provide a stable placeholder response for local checks.
    return ROOT_MESSAGE


def main(run_fn: Callable[..., None] = uvicorn.run) -> None:
    # Delegate server start to an injectable runner for tests.
    run_fn(app, host=SERVER_HOST, port=SERVER_PORT)


if __name__ == '__main__':
    # Keep a lightweight runtime smoke call for the dependency chain.
    dummy_project_with_local_dependancy()
    main()
