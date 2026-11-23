"""Validate the MEOGAP interface contracts as a consistent set."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
CONTRACTS = ROOT / 'projects' / 'meogap_interfaces' / 'rest'
MANIFEST = CONTRACTS.parent / 'contracts.json'
REQUIRED_SCHEMAS = ('ErrorResponse', 'HealthResponse')
HTTP_METHODS = {'get', 'post', 'put', 'patch', 'delete'}


class ContractError(Exception):
    """Raised when a reference contract violates the repository rules."""


def load_contract(path: Path) -> dict[str, Any]:
    """Load and validate the document-level contract rules.

    Args:
    ----
        path(Path): contract file.

    Returns:
    -------
        dict[str, Any]: parsed OpenAPI document.

    Raises:
    ------
        ContractError: when the document is invalid.

    """
    try:
        document: dict[str, Any] = json.loads(path.read_text(encoding='utf-8'))
    except json.JSONDecodeError as exc:
        raise ContractError(f'{path}: invalid JSON: {exc}') from exc
    if document.get('openapi') != '3.1.0':
        raise ContractError(f'{path}: expected OpenAPI 3.1.0')
    if not document.get('paths'):
        raise ContractError(f'{path}: no paths declared')
    schemes = document.get('components', {}).get('securitySchemes', {})
    if schemes.get('bearerAuth', {}).get('scheme') != 'bearer':
        raise ContractError(f'{path}: missing bearerAuth scheme')
    if document.get('security') != [{'bearerAuth': []}]:
        raise ContractError(f'{path}: missing global bearer security')
    return document


def validate_operation(path: Path, path_name: str, method: str, operation: dict[str, Any]) -> None:
    """Validate one business or health operation.

    Args:
    ----
        path(Path): contract file.
        path_name(str): OpenAPI path.
        method(str): HTTP method.
        operation(dict[str, Any]): operation object.

    Returns:
    -------
        None

    Raises:
    ------
        ContractError: when the operation is invalid.

    """
    responses = operation.get('responses', {})
    if path_name.endswith('/health'):
        if '200' not in responses:
            raise ContractError(f'{path}: health route must return 200')
        if operation.get('security') != []:
            raise ContractError(f'{path}: health route must be public')
        return
    if '401' not in responses:
        raise ContractError(f'{path}: {method.upper()} {path_name} missing 401')
    has_success = any(str(status).startswith('2') for status in responses)
    if not has_success and '501' not in responses:
        raise ContractError(f'{path}: {method.upper()} {path_name} needs a success response or 501 stub response')


def validate_contract(path: Path) -> dict[str, Any]:
    """Validate a complete reference contract.

    Args:
    ----
        path(Path): contract file.

    Returns:
    -------
        dict[str, Any]: parsed OpenAPI document.

    Raises:
    ------
        ContractError: when the document is invalid.

    """
    document = load_contract(path)
    for path_name, item in document['paths'].items():
        for method, operation in item.items():
            if method in HTTP_METHODS:
                validate_operation(path, path_name, method, operation)
    return document


def validate_shared_schemas(documents: dict[str, dict[str, Any]]) -> None:
    """Validate that shared schemas are identical across contracts.

    Args:
    ----
        documents(dict[str, dict[str, Any]]): contracts keyed by file name.

    Returns:
    -------
        None

    Raises:
    ------
        ContractError: when a shared schema is missing or differs.

    """
    reference_name, reference = next(iter(documents.items()))
    reference_schemas = reference['components']['schemas']
    for name in REQUIRED_SCHEMAS:
        expected = reference_schemas.get(name)
        if expected is None:
            raise ContractError(f'{reference_name}: missing schema {name}')
        for file_name, document in documents.items():
            actual = document['components']['schemas'].get(name)
            if actual != expected:
                raise ContractError(f'{file_name}: schema {name} differs from {reference_name}')


def main() -> int:
    """Validate every committed OpenAPI document.

    Returns
    -------
        int: process exit code.

    """
    files = sorted(CONTRACTS.glob('*.openapi.json'))
    if not files:
        print(f'ERROR: no contracts found in {CONTRACTS}', file=sys.stderr)
        return 1
    try:
        manifest: dict[str, Any] = json.loads(MANIFEST.read_text(encoding='utf-8'))
        declared = set(manifest.get('contracts', {}).values())
        actual = {path.relative_to(CONTRACTS.parent).as_posix() for path in files}
        if declared != actual:
            raise ContractError(f'contracts.json does not match rest/: {sorted(declared ^ actual)}')
        documents = {path.name: validate_contract(path) for path in files}
        validate_shared_schemas(documents)
    except ContractError as exc:
        print(f'ERROR: {exc}', file=sys.stderr)
        return 1
    print(f'Validated {len(files)} contracts: {", ".join(documents)}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
