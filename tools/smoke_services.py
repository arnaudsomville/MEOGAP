"""Smoke-test the containerized MEOGAP REST services."""

from __future__ import annotations

import json
import re
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / 'projects' / 'meogap_interfaces' / 'contracts.json'
HTTP_METHODS = {'get', 'post', 'put', 'patch', 'delete'}
SERVICE_PORTS = {
    'gateway': 8000,
    'contract': 8001,
    'scientific_processing': 8002,
    'catalog': 8003,
}
BEARER_HEADERS = ('Authorization: Bearer smoke-test-token',)
HEALTH_WAIT_SECONDS = 60


def fail(message: str) -> None:
    """Print a failure and exit.

    Args:
    ----
        message(str): failure description.

    Returns:
    -------
        None

    """
    print(f'SMOKE FAILURE: {message}', file=sys.stderr)
    raise SystemExit(1)


def curl(service: str, method: str, path: str, headers: tuple[str, ...] = (), *, allow_failure: bool = False) -> str:
    """Execute curl inside a service container.

    Args:
    ----
        service(str): Compose service name.
        method(str): HTTP method.
        path(str): URL path.
        headers(tuple[str, ...]): request headers.
        allow_failure(bool): return a sentinel instead of exiting on failure.

    Returns:
    -------
        str: HTTP status code.

    """
    port = SERVICE_PORTS[service]
    command = [
        'docker',
        'compose',
        'exec',
        '-T',
        service,
        'curl',
        '-sS',
        '-o',
        '/dev/null',
        '-w',
        '%{http_code}',
        '-X',
        method,
        f'http://127.0.0.1:{port}{path}',
    ]
    for header in headers:
        command.extend(['-H', header])
    result = subprocess.run(command, check=False, capture_output=True, text=True)
    if result.returncode != 0:
        if allow_failure:
            return '000'
        fail(f'curl failed for {service} {method} {path}: {result.stderr.strip()}')
    return result.stdout.strip()


def wait_for_health(service: str) -> None:
    """Wait until a service health endpoint answers 200.

    Args:
    ----
        service(str): Compose service name.

    Returns:
    -------
        None

    """
    deadline = time.monotonic() + HEALTH_WAIT_SECONDS
    while time.monotonic() < deadline:
        if curl(service, 'GET', _health_path(service), allow_failure=True) == '200':
            return
        time.sleep(1)
    fail(f'{service} did not become healthy within {HEALTH_WAIT_SECONDS} seconds')


def _health_path(service: str) -> str:
    return '/api/v1/health' if service == 'gateway' else '/internal/v1/health'


def concrete_path(path: str) -> str:
    """Replace path placeholders with test values.

    Args:
    ----
        path(str): templated path.

    Returns:
    -------
        str: concrete path.

    """
    return re.sub(r'\{[^}]+\}', 'smoke', path)


def main() -> int:
    """Run the container smoke suite.

    Returns
    -------
        int: process exit code.

    """
    manifest: dict[str, Any] = json.loads(MANIFEST.read_text(encoding='utf-8'))
    contracts_root = MANIFEST.parent
    for provider, relative_path in manifest['contracts'].items():
        if provider not in SERVICE_PORTS:
            fail(f'No service port declared for provider {provider}')
        wait_for_health(provider)
        contract: dict[str, Any] = json.loads((contracts_root / relative_path).read_text(encoding='utf-8'))
        health_path = next(path for path in contract['paths'] if path.endswith('/health'))
        for path, item in contract['paths'].items():
            if path == health_path:
                continue
            for method in item:
                if method not in HTTP_METHODS:
                    continue
                concrete = concrete_path(path)
                without_auth = curl(provider, method.upper(), concrete)
                if without_auth != '401':
                    fail(f'{provider} {method.upper()} {path}: expected 401, got {without_auth}')
                with_auth = curl(provider, method.upper(), concrete, BEARER_HEADERS)
                if with_auth != '501':
                    fail(f'{provider} {method.upper()} {path}: expected 501, got {with_auth}')
        print(f'{provider}: health and {sum(1 for _ in contract["paths"]) - 1} contract paths OK')
    print('Container smoke suite passed.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
