from meogap import VERSION as CORE_VERSION

from api.main import HEALTH_PATH, ROOT_MESSAGE, SERVER_HOST, SERVER_PORT, health, main, root


def test_root_returns_placeholder_message() -> None:
    """Validate the API root payload is stable.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    expected = ROOT_MESSAGE
    # Act
    result = root()
    # Assert
    assert result == expected


def test_health_reports_core_version() -> None:
    """Validate the health payload exposes the core version.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    expected = {'status': 'ok', 'core_version': CORE_VERSION}
    # Act
    result = health()
    # Assert
    assert result == expected


def test_health_path_is_versioned() -> None:
    """Validate the health route stays under the versioned API prefix.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    expected = '/api/v1/health'
    # Act
    result = HEALTH_PATH
    # Assert
    assert result == expected


def test_main_invokes_runner_with_expected_args() -> None:
    """Validate the runner receives the expected host and port.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    calls: list[dict[str, object]] = []

    def fake_run(*args: object, **kwargs: object) -> None:
        calls.append({'args': args, 'kwargs': kwargs})

    # Act
    main(run_fn=fake_run)
    # Assert
    assert len(calls) == 1
    assert calls[0]['kwargs']['host'] == SERVER_HOST
    assert calls[0]['kwargs']['port'] == SERVER_PORT
