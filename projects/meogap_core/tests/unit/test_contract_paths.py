"""Unit tests for shared contract discovery."""

from pathlib import Path

import pytest

from meogap.test_utilities.contracts import contract_path, find_repository_root, load_contract_for

pytestmark = pytest.mark.unit


def test_contract_path_resolves_a_declared_provider() -> None:
    """Validate the shared manifest resolves a provider contract.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act
    path = contract_path('gateway')
    # Assert
    assert path.name == 'gateway.openapi.json'
    assert path.is_file()


def test_load_contract_for_marks_the_expected_service() -> None:
    """Validate a loaded provider contract carries the expected service.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act
    contract = load_contract_for('gateway')
    # Assert
    assert contract['info']['title'] == 'MEOGAP Gateway'
    example = contract['paths']['/api/v1/catalogue/products']['get']['responses']['401']['content']['application/json'][
        'example'
    ]
    assert example['service'] == 'gateway'


def test_unknown_provider_is_rejected() -> None:
    """Validate unknown providers are rejected.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act / Assert
    with pytest.raises(KeyError):
        contract_path('unknown')


def test_repository_root_is_discovered_from_this_module() -> None:
    """Validate repository-root discovery is independent of the working directory.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act
    root = find_repository_root(Path(__file__))
    # Assert
    assert (root / 'projects' / 'meogap_interfaces' / 'contracts.json').is_file()
