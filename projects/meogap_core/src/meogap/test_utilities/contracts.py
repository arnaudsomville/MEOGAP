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
    expected = business_operations(contract, case.health_path)
    declared = {(operation.method, operation.path) for operation in case.operations}
    assert declared == expected, f'{case.service}: declared operations differ from the contract'

    document = case.app.openapi()
    live = {
        (method.upper(), path)
        for path, item in document['paths'].items()
        if path.startswith(case.api_prefix)
        for method in item
        if method in HTTP_METHODS
    }
    assert live == expected | {('GET', case.health_path)}, f'{case.service}: live routes differ from the contract'

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
        assert result.json()['code'] == UNAUTHORIZED_CODE
        _assert_valid(result.json(), error_schema)

    for method, path in sorted(expected):
        result = client.request(method, concrete_path(path), headers=BEARER_HEADERS)
        assert result.status_code == status.HTTP_501_NOT_IMPLEMENTED, (method, path)
        assert result.json()['code'] == NOT_IMPLEMENTED_CODE
        assert result.json()['service'] == case.service
        _assert_valid(result.json(), error_schema)

    _assert_models_match(contract)
    _assert_bearer_security(contract, case.health_path)
    assert document['info']['title'] == contract['info']['title']
    _assert_negative_drift(contract, case.service)
