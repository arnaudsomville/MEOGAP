from dummy_project_with_local_dependancy.main import (
    ROOT_MESSAGE,
    SERVER_HOST,
    SERVER_PORT,
    dummy_project_with_local_dependancy,
    main,
    root,
)


def test_dummy_project_with_local_dependancy_returns_true() -> None:
    """Validate the local dependency wrapper returns success.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    expected = True
    # Act
    result = dummy_project_with_local_dependancy()
    # Assert
    assert result is expected


def test_root_returns_placeholder_message() -> None:
    """Validate the root endpoint payload is stable.

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
