"""Unit tests for the MEOGAP pytest tag plugin."""

from typing import cast

import pytest

from meogap.test_utilities.pytest_plugin import TAGS, pytest_collection_modifyitems

pytestmark = pytest.mark.unit


class FakeItem:
    """Minimal pytest item double carrying a set of markers."""

    def __init__(self, nodeid: str, markers: set[str] | None = None) -> None:
        """Initialize the fake item.

        Args:
        ----
            nodeid(str): test node identifier.
            markers(set[str] | None): declared tag names.

        Returns:
        -------
            None

        """
        self.nodeid = nodeid
        self._markers = markers or set()

    def get_closest_marker(self, name: str) -> object | None:
        """Return a marker placeholder when the tag is declared.

        Args:
        ----
            name(str): marker name.

        Returns:
        -------
            object | None: marker placeholder or None.

        """
        return object() if name in self._markers else None


def test_required_tags_are_declared() -> None:
    """Validate unit and contract tags are part of the shared tag set.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Assert
    assert {'unit', 'contract'} <= set(TAGS)


def test_collection_fails_without_a_tag() -> None:
    """Validate untagged tests are rejected during collection.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    item = FakeItem('tests/test_missing.py::test_missing')
    # Act / Assert
    with pytest.raises(pytest.UsageError):
        pytest_collection_modifyitems(cast(pytest.Config, None), [item])  # type: ignore[list-item]


def test_collection_accepts_tagged_tests() -> None:
    """Validate tagged tests pass the collection check.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    item = FakeItem('tests/test_unit.py::test_unit', {'unit'})
    # Act / Assert
    pytest_collection_modifyitems(cast(pytest.Config, None), [item])  # type: ignore[list-item]
