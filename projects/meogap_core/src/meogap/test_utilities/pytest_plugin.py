"""Pytest plugin enforcing MEOGAP test tags."""

from __future__ import annotations

import pytest

TAGS = (
    'unit',
    'contract',
    'functional',
    'integration',
    'validation',
    'benchmark',
    'regression',
)
TAG_DESCRIPTIONS = {
    'unit': 'Validates isolated logic, exceptions and edge cases.',
    'contract': 'Validates component boundaries against the committed contracts.',
    'functional': 'Validates a complete user-visible behavior.',
    'integration': 'Validates interactions with real infrastructure.',
    'validation': 'Compares results with external reference data.',
    'benchmark': 'Measures performance or resource usage.',
    'regression': 'Freezes expected behavior against stored references.',
}


def pytest_configure(config: pytest.Config) -> None:
    """Register the shared MEOGAP test tags.

    Args:
    ----
        config(pytest.Config): pytest configuration.

    Returns:
    -------
        None

    """
    for tag in TAGS:
        config.addinivalue_line('markers', f'{tag}: {TAG_DESCRIPTIONS[tag]}')


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    """Fail collection when a test declares no MEOGAP tag.

    Args:
    ----
        config(pytest.Config): pytest configuration.
        items(list[pytest.Item]): collected test items.

    Returns:
    -------
        None

    Raises:
    ------
        pytest.UsageError: when one or more tests have no tag.

    """
    _ = config
    missing = [item.nodeid for item in items if not any(item.get_closest_marker(tag) for tag in TAGS)]
    if missing:
        raise pytest.UsageError(
            'Every test must declare at least one tag: ' + ', '.join(TAGS) + '. Missing: ' + ', '.join(missing)
        )
