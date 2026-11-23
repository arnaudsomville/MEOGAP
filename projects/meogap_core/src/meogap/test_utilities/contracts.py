"""Shared contract-test helpers for MEOGAP services."""

from __future__ import annotations

import copy
import json
import re
from collections.abc import Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import jsonschema
from fastapi import FastAPI, status
from fastapi.testclient import TestClient

from meogap.rest.contracts import ErrorResponse, HealthResponse, Operation

HTTP_METHODS = frozenset({'get', 'post', 'put', 'patch', 'delete'})
BEARER_HEADERS = {'Authorization': 'Bearer contract-test-token'}
HEALTH_STATUS = 'ok'
UNAUTHORIZED_CODE = 'UNAUTHORIZED'
NOT_IMPLEMENTED_CODE = 'NOT_IMPLEMENTED'
MISSING_FIELD = 'code'
OPENAPI_VERSION = '3.1.0'
CONTRACTS_MANIFEST = Path('projects') / 'meogap_interfaces' / 'contracts.json'


@dataclass(frozen=True)
class ContractCase:
    """One service contract to validate against its running application."""

    service: str
    contract_path: Path
    app: FastAPI
    operations: Sequence[Operation]
    health_path: str
    api_prefix: str


def load_contract(path: Path) -> dict[str, Any]:
    """Load a reference OpenAPI contract.

    Args:
    ----
        path(Path): contract file.

    Returns:
    -------
        dict[str, Any]: parsed OpenAPI document.

    """
    document: dict[str, Any] = json.loads(path.read_text(encoding='utf-8'))
    return document


def find_repository_root(start: Path | None = None) -> Path:
    """Find the repository root containing the shared contracts manifest.

    Args:
    ----
        start(Path | None): starting path; defaults to this module.

    Returns:
    -------
        Path: repository root.

    Raises:
    ------
        FileNotFoundError: when no manifest is found.

    """
    origins = (start or Path(__file__), Path.cwd())
    for origin in origins:
        current = origin.resolve()
        for candidate in (current, *current.parents):
            if (candidate / CONTRACTS_MANIFEST).is_file():
                return candidate
    raise FileNotFoundError(f'Could not find {CONTRACTS_MANIFEST} from {origins}')


def contract_path(provider: str) -> Path:
    """Resolve the reference contract path for a provider.

    Args:
    ----
        provider(str): provider identifier declared by the component.

    Returns:
    -------
        Path: committed contract path.

    Raises:
    ------
        KeyError: when the provider is not declared in the manifest.

    """
    root = find_repository_root()
    manifest: dict[str, Any] = json.loads((root / CONTRACTS_MANIFEST).read_text(encoding='utf-8'))
    contracts: dict[str, str] = manifest['contracts']
    if provider not in contracts:
        raise KeyError(f'Unknown contract provider {provider!r}; available: {sorted(contracts)}')
    path = root / 'projects' / 'meogap_interfaces' / contracts[provider]
    if not path.is_file():
        raise FileNotFoundError(f'Contract for {provider!r} does not exist: {path}')
    return path


def load_contract_for(provider: str) -> dict[str, Any]:
    """Load the reference contract declared for a provider.

    Args:
    ----
        provider(str): provider identifier.

    Returns:
    -------
        dict[str, Any]: parsed OpenAPI document.

    """
    return load_contract(contract_path(provider))


def business_operations(contract: dict[str, Any], health_path: str) -> set[tuple[str, str]]:
    """Return the business operations declared by a contract.

    Args:
    ----
        contract(dict[str, Any]): parsed OpenAPI document.
        health_path(str): public health path excluded from business operations.

    Returns:
    -------
        set[tuple[str, str]]: method and path pairs.

    """
    return {
        (method.upper(), path)
        for path, item in contract['paths'].items()
        if path != health_path
        for method in item
        if method in HTTP_METHODS
    }


def concrete_path(path: str) -> str:
    """Replace every path placeholder with a concrete test value.

    Args:
    ----
        path(str): templated OpenAPI path.

    Returns:
    -------
        str: concrete request path.

    """
    return re.sub(r'\{[^}]+\}', 'test', path)


def _assert_valid(payload: object, schema: dict[str, Any]) -> None:
    """Validate a payload against a contract schema.

    Args:
    ----
        payload(object): payload to validate.
        schema(dict[str, Any]): JSON schema.

    Returns:
    -------
        None

    """
    jsonschema.validate(payload, schema)


def _assert_invalid(payload: object, schema: dict[str, Any], label: str) -> None:
    """Validate that a payload is rejected by a contract schema.

    Args:
    ----
        payload(object): payload to validate.
        schema(dict[str, Any]): JSON schema.
        label(str): failure description.

    Returns:
    -------
        None

    Raises:
    ------
        AssertionError: when the payload is accepted.

    """
    try:
        jsonschema.validate(payload, schema)
    except jsonschema.ValidationError:
        return
    raise AssertionError(f'{label} was accepted by the contract')


IGNORED_SCHEMA_KEYS = frozenset({'description', 'title', 'example', 'examples'})


def _resolve_ref(document: dict[str, Any], ref: str) -> object:
    """Resolve a local OpenAPI JSON reference.

    Args:
    ----
        document(dict[str, Any]): containing OpenAPI document.
        ref(str): local reference such as ``#/components/schemas/X``.

    Returns:
    -------
        Any: referenced value.

    """
    if not ref.startswith('#/'):
        raise ValueError(f'Only local references are supported: {ref}')
    current: Any = document
    for part in ref[2:].split('/'):
        current = current[part.replace('~1', '/').replace('~0', '~')]
    return current


def _normalize_schema(schema: object, document: dict[str, Any]) -> object:
    """Normalize a JSON schema for structural comparison.

    Args:
    ----
        schema(Any): schema or schema fragment.
        document(dict[str, Any]): containing OpenAPI document.

    Returns:
    -------
        Any: normalized schema.

    """
    if not isinstance(schema, dict):
        return schema
    if '$ref' in schema:
        return _normalize_schema(_resolve_ref(document, schema['$ref']), document)
    result: dict[str, Any] = {}
    for key, value in schema.items():
        if key in IGNORED_SCHEMA_KEYS:
            continue
        if key == 'properties':
            result[key] = {name: _normalize_schema(item, document) for name, item in value.items()}
        elif key in {'items', 'additionalProperties'}:
            result[key] = _normalize_schema(value, document) if isinstance(value, dict) else value
        elif key in {'allOf', 'anyOf', 'oneOf'}:
            result[key] = [_normalize_schema(item, document) for item in value]
        elif key == 'required':
            result[key] = sorted(value)
        else:
            result[key] = value
    return result


def _normalize_parameters(parameters: list[dict[str, Any]] | None, document: dict[str, Any]) -> list[dict[str, Any]]:
    """Normalize operation parameters for comparison.

    Args:
    ----
        parameters(list[dict[str, Any]] | None): OpenAPI parameters.
        document(dict[str, Any]): containing OpenAPI document.

    Returns:
    -------
        list[dict[str, Any]]: normalized parameters.

    """
    normalized = [
        {
            'name': parameter.get('name'),
            'in': parameter.get('in'),
            'required': parameter.get('required', False),
            'schema': _normalize_schema(parameter.get('schema', {}), document),
        }
        for parameter in parameters or []
    ]
    return sorted(normalized, key=lambda item: (str(item['in']), str(item['name'])))


def _normalize_content(content: dict[str, Any] | None, document: dict[str, Any]) -> dict[str, Any]:
    """Normalize response or request content for comparison.

    Args:
    ----
        content(dict[str, Any] | None): OpenAPI content map.
        document(dict[str, Any]): containing OpenAPI document.

    Returns:
    -------
        dict[str, Any]: normalized content.

    """
    return {
        media_type: _normalize_schema(media.get('schema', {}), document)
        for media_type, media in (content or {}).items()
    }


def _normalize_request_body(body: dict[str, Any] | None, document: dict[str, Any]) -> dict[str, Any] | None:
    """Normalize a request body for comparison.

    Args:
    ----
        body(dict[str, Any] | None): OpenAPI request body.
        document(dict[str, Any]): containing OpenAPI document.

    Returns:
    -------
        dict[str, Any] | None: normalized request body.

    """
    if body is None:
        return None
    return {
        'required': body.get('required', False),
        'content': _normalize_content(body.get('content'), document),
    }


def _normalize_responses(responses: dict[str, Any], document: dict[str, Any]) -> dict[str, Any]:
    """Normalize operation responses for comparison.

    Args:
    ----
        responses(dict[str, Any]): OpenAPI responses.
        document(dict[str, Any]): containing OpenAPI document.

    Returns:
    -------
        dict[str, Any]: normalized responses.

    """
    return {
        status_code: {
            'content': _normalize_content(response.get('content'), document),
        }
        for status_code, response in responses.items()
    }


def _assert_operation_matches(
    expected: dict[str, Any],
    actual: dict[str, Any],
    expected_document: dict[str, Any],
    actual_document: dict[str, Any],
    label: str,
) -> None:
    """Compare one OpenAPI operation structurally.

    Args:
    ----
        expected(dict[str, Any]): reference operation.
        actual(dict[str, Any]): provider operation.
        expected_document(dict[str, Any]): reference document.
        actual_document(dict[str, Any]): provider document.
        label(str): diagnostic label.

    Returns:
    -------
        None

    """
    assert actual.get('operationId') == expected.get('operationId'), f'{label}: operationId differs'
    assert _normalize_parameters(actual.get('parameters'), actual_document) == _normalize_parameters(
        expected.get('parameters'), expected_document
    ), f'{label}: parameters differ'
    assert _normalize_request_body(actual.get('requestBody'), actual_document) == _normalize_request_body(
        expected.get('requestBody'), expected_document
    ), f'{label}: request body differs'
    actual_responses = _normalize_responses(actual.get('responses', {}), actual_document)
    expected_responses = _normalize_responses(expected.get('responses', {}), expected_document)
    assert actual_responses == expected_responses, f'{label}: responses differ'


def assert_operations_match(contract: dict[str, Any], operations: Sequence[Operation], service: str) -> None:
    """Validate declared operations, methods, paths and identifiers.

    Args:
    ----
        contract(dict[str, Any]): reference OpenAPI document.
        operations(Sequence[Operation]): provider operations.
        service(str): provider identifier.

    Returns:
    -------
        None

    """
    health_path = next(path for path in contract['paths'] if path.endswith('/health'))
    expected = {
        (method.upper(), path): operation['operationId']
        for path, item in contract['paths'].items()
        if path != health_path
        for method, operation in item.items()
        if method in HTTP_METHODS
    }
    declared = {(operation.method, operation.path): operation.operation_id for operation in operations}
    assert declared == expected, f'{service}: declared operations differ from the contract'


def assert_live_operation_inventory(
    contract: dict[str, Any],
    document: dict[str, Any],
    health_path: str,
    api_prefix: str,
    service: str,
) -> None:
    """Validate the provider operation inventory.

    Args:
    ----
        contract(dict[str, Any]): reference OpenAPI document.
        document(dict[str, Any]): provider OpenAPI document.
        health_path(str): health path.
        api_prefix(str): versioned API prefix.
        service(str): provider identifier.

    Returns:
    -------
        None

    """
    expected = business_operations(contract, health_path) | {('GET', health_path)}
    live = {
        (method.upper(), path)
        for path, item in document.get('paths', {}).items()
        if path.startswith(api_prefix)
        for method in item
        if method in HTTP_METHODS
    }
    assert live == expected, f'{service}: live routes differ from the contract'


def assert_provider_document_matches(
    contract: dict[str, Any],
    document: dict[str, Any],
    service: str,
) -> None:
    """Validate a provider OpenAPI document against the reference contract.

    Args:
    ----
        contract(dict[str, Any]): reference OpenAPI document.
        document(dict[str, Any]): provider OpenAPI document.
        service(str): provider identifier.

    Returns:
    -------
        None

    """
    expected_schemas = contract['components']['schemas']
    actual_schemas = document.get('components', {}).get('schemas', {})
    for name in ('ErrorResponse', 'HealthResponse'):
        assert name in actual_schemas, f'{service}: missing schema {name}'
        assert _normalize_schema(actual_schemas[name], document) == _normalize_schema(
            expected_schemas[name], contract
        ), f'{service}: schema {name} differs'

    health_path = next(path for path in contract['paths'] if path.endswith('/health'))
    for path, item in contract['paths'].items():
        for method, expected in item.items():
            if method not in HTTP_METHODS:
                continue
            actual = document.get('paths', {}).get(path, {}).get(method)
            assert actual is not None, f'{service}: missing operation {method.upper()} {path}'
            _assert_operation_matches(expected, actual, contract, document, f'{service}: {method.upper()} {path}')
    assert document['info']['title'] == contract['info']['title'], f'{service}: title differs'
    health_security = document['paths'].get(health_path, {}).get('get', {}).get('security')
    assert health_security in (None, []), f'{service}: health is not public'


def _assert_models_match(contract: dict[str, Any]) -> None:
    """Validate that local models match the shared contract schemas.

    Args:
    ----
        contract(dict[str, Any]): parsed OpenAPI document.

    Returns:
    -------
        None

    """
    error_schema = contract['components']['schemas']['ErrorResponse']
    health_schema = contract['components']['schemas']['HealthResponse']
    assert set(ErrorResponse.model_fields) == set(error_schema['properties'])
    assert set(error_schema['required']) == set(error_schema['properties'])
    assert set(HealthResponse.model_fields) == set(health_schema['properties'])
    assert set(health_schema['required']) == set(health_schema['properties'])


def _assert_bearer_security(contract: dict[str, Any], health_path: str) -> None:
    """Validate bearer security declarations in the contract.

    Args:
    ----
        contract(dict[str, Any]): parsed OpenAPI document.
        health_path(str): public health path.

    Returns:
    -------
        None

    """
    scheme = contract['components']['securitySchemes']['bearerAuth']
    assert scheme['type'] == 'http'
    assert scheme['scheme'] == 'bearer'
    assert contract['security'] == [{'bearerAuth': []}]
    assert contract['paths'][health_path]['get']['security'] == []


def _assert_negative_drift(contract: dict[str, Any], service: str) -> None:
    """Prove that a missing required field is rejected by the contract.

    Args:
    ----
        contract(dict[str, Any]): parsed OpenAPI document.
        service(str): service identifier.

    Returns:
    -------
        None

    """
    original = contract['components']['schemas']['ErrorResponse']
    weakened = copy.deepcopy(original)
    weakened['required'].remove(MISSING_FIELD)
    payload = ErrorResponse(code='X', message='message', service=service, operation='operation').model_dump()
    payload.pop(MISSING_FIELD)
    _assert_valid(payload, weakened)
    _assert_invalid(payload, original, 'payload missing code')


def assert_contract_compliance(case: ContractCase) -> None:
    """Validate one service against its committed reference contract.

    Args:
    ----
        case(ContractCase): service contract case.

    Returns:
    -------
        None

    """
    contract = load_contract(case.contract_path)
    assert contract['openapi'] == OPENAPI_VERSION
    assert_operations_match(contract, case.operations, case.service)

    document = case.app.openapi()
    expected = business_operations(contract, case.health_path)
    assert_live_operation_inventory(contract, document, case.health_path, case.api_prefix, case.service)
    assert_provider_document_matches(contract, document, case.service)

    client = TestClient(case.app)
    health_schema = contract['components']['schemas']['HealthResponse']
    error_schema = contract['components']['schemas']['ErrorResponse']
    health = client.get(case.health_path)
    assert health.status_code == status.HTTP_200_OK
    expected_health = {'status': HEALTH_STATUS, 'service': case.service, 'version': case.app.version}
    assert health.json() == expected_health
    _assert_valid(health.json(), health_schema)

    for method, path in sorted(expected):
        result = client.request(method, concrete_path(path))
        assert result.status_code == status.HTTP_401_UNAUTHORIZED, (method, path)
        payload = result.json()
        _assert_valid(payload, error_schema)
        assert payload['code'] == UNAUTHORIZED_CODE

    for method, path in sorted(expected):
        result = client.request(method, concrete_path(path), headers=BEARER_HEADERS)
        assert result.status_code == status.HTTP_501_NOT_IMPLEMENTED, (method, path)
        payload = result.json()
        _assert_valid(payload, error_schema)
        assert payload['code'] == NOT_IMPLEMENTED_CODE
        assert payload['service'] == case.service

    _assert_models_match(contract)
    _assert_bearer_security(contract, case.health_path)
    _assert_negative_drift(contract, case.service)
