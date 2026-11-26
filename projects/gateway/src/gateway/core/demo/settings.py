"""Configurable timings and limits for deterministic M0 demo behaviour."""

from __future__ import annotations

from dataclasses import dataclass

from gateway.core.config import MAX_AOI_AREA_KM2
from gateway.core.demo.constants import (
    DEFAULT_DELIVERY_DELAY_SECONDS,
    DEFAULT_MAX_SELECTION_AREA_KM2,
    DEFAULT_PROCESSING_DELAY_SECONDS,
    DEFAULT_QUEUE_DELAY_SECONDS,
    DEFAULT_REQUEST_COST,
    DEFAULT_STARTING_CREDITS,
)


@dataclass(frozen=True)
class DemoSettings:
    """Configurable timings and outcomes for deterministic M0 demo behaviour.

    ``queue_delay_seconds`` and ``processing_delay_seconds`` make the
    ``queued -> processing -> succeeded`` lifecycle observable in tests and in
    the UI without introducing a real queue or worker.
    """

    starting_credits: int = DEFAULT_STARTING_CREDITS
    request_cost: int = DEFAULT_REQUEST_COST
    queue_delay_seconds: float = DEFAULT_QUEUE_DELAY_SECONDS
    processing_delay_seconds: float = DEFAULT_PROCESSING_DELAY_SECONDS
    delivery_delay_seconds: float = DEFAULT_DELIVERY_DELAY_SECONDS
    failure_mode: str | None = None
    max_selection_area_km2: float = DEFAULT_MAX_SELECTION_AREA_KM2
    max_aoi_area_km2: float = MAX_AOI_AREA_KM2
