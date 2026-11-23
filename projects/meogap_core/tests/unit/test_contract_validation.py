"""Negative tests for the shared contract-checking mechanism."""

import copy

import jsonschema
import pytest

from meogap.rest.contracts import PUBLIC_API_PREFIX, PUBLIC_HEALTH_PATH, Operation
from meogap.rest.factory import RestAppConfig, create_rest_app
from meogap.test_utilities.contracts import (
    ContractCase,
    assert_contract_compliance,
    assert_live_operation_inventory,
    assert_provider_document_matches,
    contract_path,
    load_contract,
)

pytestmark = pytest.mark.contract

CONTRACT = load_contract(contract_path('gateway'))


def test_reference_document_matches_itself() -> None:
    """Validate the baseline document is accepted by the checker.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act / Assert
    assert_provider_document_matches(CONTRACT, copy.deepcopy(CONTRACT), 'gateway')


def test_provider_property_type_drift_is_rejected() -> None:
    """Validate a changed provider property type fails.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    document = copy.deepcopy(CONTRACT)
    document['components']['schemas']['ErrorResponse']['properties']['code']['type'] = 'integer'
    # Act / Assert
    with pytest.raises(AssertionError, match='schema ErrorResponse differs'):
        assert_provider_document_matches(CONTRACT, document, 'gateway')


def test_provider_missing_required_property_is_rejected() -> None:
    """Validate a provider model missing a required property fails.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    document = copy.deepcopy(CONTRACT)
    schema = document['components']['schemas']['ErrorResponse']
    schema['properties'].pop('message')
    schema['required'].remove('message')
    # Act / Assert
    with pytest.raises(AssertionError, match='schema ErrorResponse differs'):
        assert_provider_document_matches(CONTRACT, document, 'gateway')


def test_missing_operation_is_rejected() -> None:
    """Validate a missing operation fails.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    document = copy.deepcopy(CONTRACT)
    document['paths'].pop('/api/v1/catalogue/products')
    # Act / Assert
    with pytest.raises(AssertionError, match='missing operation'):
        assert_provider_document_matches(CONTRACT, document, 'gateway')


def test_unexpected_operation_is_rejected() -> None:
    """Validate an unexpected route or method fails.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    document = copy.deepcopy(CONTRACT)
    document['paths']['/api/v1/catalogue/products']['post'] = copy.deepcopy(
        document['paths']['/api/v1/catalogue/products']['get']
    )
    # Act / Assert
    with pytest.raises(AssertionError, match='live routes differ'):
        assert_live_operation_inventory(
            CONTRACT,
            document,
            '/api/v1/health',
            '/api/v1',
            'gateway',
        )


def test_incompatible_response_status_is_rejected() -> None:
    """Validate a missing response status fails.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    document = copy.deepcopy(CONTRACT)
    document['paths']['/api/v1/catalogue/products']['get']['responses'].pop('501')
    # Act / Assert
    with pytest.raises(AssertionError, match='responses differ'):
        assert_provider_document_matches(CONTRACT, document, 'gateway')


def test_incompatible_error_response_is_rejected() -> None:
    """Validate an incompatible error response body fails.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    document = copy.deepcopy(CONTRACT)
    document['paths']['/api/v1/catalogue/products']['get']['responses']['501']['content']['application/json'][
        'schema'
    ] = {'$ref': '#/components/schemas/HealthResponse'}
    # Act / Assert
    with pytest.raises(AssertionError, match='responses differ'):
        assert_provider_document_matches(CONTRACT, document, 'gateway')


class FakeResponse:
    """Minimal HTTP response double."""

    def __init__(self, status_code: int, payload: object) -> None:
        """Initialize the fake response.

        Args:
        ----
            status_code(int): HTTP status code.
            payload(object): response payload.

        Returns:
        -------
            None

        """
        self.status_code = status_code
        self._payload = payload

    def json(self) -> object:
        """Return the configured payload.

        Returns
        -------
            object: configured payload.

        """
        return self._payload


class FakeClient:
    """HTTP client double returning a configurable business outcome."""

    status_code = 200
    payload: object = {'status': 'ok', 'service': 'gateway', 'version': '0.1.0'}

    def __init__(self, app: object) -> None:
        """Initialize the fake client.

        Args:
        ----
            app(object): application under test.

        Returns:
        -------
            None

        """
        self.app = app

    def get(self, path: str) -> FakeResponse:
        """Return a health response.

        Args:
        ----
            path(str): request path.

        Returns:
        -------
            FakeResponse: health response.

        """
        _ = path
        return FakeResponse(200, {'status': 'ok', 'service': 'gateway', 'version': '0.1.0'})

    def request(self, method: str, path: str, headers: object = None) -> FakeResponse:
        """Return a configurable business response.

        Args:
        ----
            method(str): HTTP method.
            path(str): request path.
            headers(object): optional request headers.

        Returns:
        -------
            FakeResponse: business response.

        """
        _ = method, path
        if not headers:
            return FakeResponse(
                401, {'code': 'UNAUTHORIZED', 'message': 'missing', 'service': 'gateway', 'operation': 'op'}
            )
        return FakeResponse(self.status_code, self.payload)


def build_case() -> ContractCase:
    """Build a synthetic provider case from the gateway contract.

    Returns
    -------
        ContractCase: contract case under test.

    """
    operations = tuple(
        Operation(method.upper(), path, operation['operationId'], operation.get('summary', ''))
        for path, item in CONTRACT['paths'].items()
        if path != PUBLIC_HEALTH_PATH
        for method, operation in item.items()
        if method in {'get', 'post', 'put', 'patch', 'delete'}
    )
    app = create_rest_app(
        RestAppConfig(
            service='gateway',
            title=CONTRACT['info']['title'],
            version='0.1.0',
            health_path=PUBLIC_HEALTH_PATH,
        ),
        operations,
    )
    return ContractCase(
        service='gateway',
        contract_path=contract_path('gateway'),
        app=app,
        operations=operations,
        health_path=PUBLIC_HEALTH_PATH,
        api_prefix=PUBLIC_API_PREFIX,
    )


def test_incompatible_behavior_status_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    """Validate a provider returning the wrong business status fails.

    Args:
    ----
        monkeypatch(pytest.MonkeyPatch): pytest monkeypatch fixture.

    Returns:
    -------
        None

    """
    # Arrange
    FakeClient.status_code = 200
    FakeClient.payload = {'status': 'ok', 'service': 'gateway', 'version': '0.1.0'}
    monkeypatch.setattr('meogap.test_utilities.contracts.TestClient', FakeClient)
    # Act / Assert
    with pytest.raises(AssertionError):
        assert_contract_compliance(build_case())


def test_incompatible_error_body_is_rejected(monkeypatch: pytest.MonkeyPatch) -> None:
    """Validate a provider returning a malformed error body fails.

    Args:
    ----
        monkeypatch(pytest.MonkeyPatch): pytest monkeypatch fixture.

    Returns:
    -------
        None

    """
    # Arrange
    FakeClient.status_code = 501
    FakeClient.payload = {'code': 'NOT_IMPLEMENTED'}
    monkeypatch.setattr('meogap.test_utilities.contracts.TestClient', FakeClient)
    # Act / Assert
    with pytest.raises(jsonschema.ValidationError):
        assert_contract_compliance(build_case())
