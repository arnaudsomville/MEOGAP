"""Unit tests for the package version."""

import pytest

from meogap import VERSION
from meogap.version import VERSION as VERSION_MODULE

pytestmark = pytest.mark.unit


def test_version_is_exposed() -> None:
    """Validate the package and module expose the same version.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    expected = '0.1.0'
    # Act
    package_version = VERSION
    module_version = VERSION_MODULE
    # Assert
    assert package_version == expected
    assert module_version == package_version
