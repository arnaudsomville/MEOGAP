"""Shared in-memory state for the deterministic M0 Gateway demo."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime
from threading import RLock

from gateway.core.demo.catalogue import CatalogueService
from gateway.core.demo.constants import DEMO_OWNER_ID
from gateway.core.demo.records import AoiRecord, DeliveryRecord, RequestRecord, ResultRecord
from gateway.core.demo.settings import DemoSettings

Clock = Callable[[], datetime]


def default_clock() -> datetime:
    """Return the current UTC time for production demo behaviour.

    Returns
    -------
        datetime: timezone-aware current UTC time.

    """
    return datetime.now(UTC)


class DemoState:
    """Process-local state shared by the demo services.

    The state is intentionally not a persistence or concurrency design target:
    it exists to exercise the documented M0 REST journey deterministically.
    """

    def __init__(self, settings: DemoSettings | None = None, clock: Clock = default_clock) -> None:
        """Initialize empty state and deterministic catalogue data.

        Args:
        ----
            settings(DemoSettings): configurable demo timings and outcomes.
            clock(Clock): injectable UTC clock used by transitions and tests.

        """
        self.settings = settings or DemoSettings()
        self.clock = clock
        self.lock = RLock()
        self.catalogue = CatalogueService()
        self.aois: dict[str, AoiRecord] = {}
        self.requests: dict[str, RequestRecord] = {}
        self.results: dict[str, ResultRecord] = {}
        self.deliveries: dict[str, DeliveryRecord] = {}
        self.balances: dict[str, int] = {DEMO_OWNER_ID: self.settings.starting_credits}
        self.aoi_sequence = 0
        self.request_sequence = 0
        self.result_sequence = 0
        self.delivery_sequence = 0
