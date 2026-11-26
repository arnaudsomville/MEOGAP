"""Caller-safe errors raised by deterministic Gateway demo behaviour."""

from __future__ import annotations


class DemoError(Exception):
    """A caller-safe error returned by deterministic Gateway demo behaviour.

    Args:
    ----
        status_code(int): HTTP status to expose.
        code(str): stable demo error code.
        message(str): caller-safe explanation.

    """

    def __init__(self, status_code: int, code: str, message: str) -> None:
        """Initialize the error.

        Args:
        ----
            status_code(int): HTTP status to expose.
            code(str): stable demo error code.
            message(str): caller-safe explanation.

        """
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
