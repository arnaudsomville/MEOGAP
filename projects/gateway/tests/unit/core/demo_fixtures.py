"""Shared deterministic fixtures for Gateway demo unit tests."""

from __future__ import annotations

from datetime import UTC, datetime

from gateway.core.demo import DEMO_OWNER_ID, DemoSettings, DemoStore

NOW = datetime(2026, 1, 1, tzinfo=UTC)
PRODUCT_ID = 'ndvi'
AOI_ID = 'aoi-1'
START_MONTH = '2026-01'
END_MONTH = '2026-02'
POINT_WKT = 'POINT(1.44 43.60)'
SMALL_POLYGON_WKT = 'POLYGON((1.40 43.58, 1.42 43.58, 1.42 43.60, 1.40 43.60, 1.40 43.58))'
NEW_GEOMETRY = {
    'type': 'Polygon',
    'coordinates': [[[1.4, 43.6], [1.41, 43.6], [1.41, 43.61], [1.4, 43.6]]],
}


def build_store(failure_mode: str | None = None, **overrides: object) -> DemoStore:
    """Build a zero-delay deterministic store with an injected fixed clock."""
    settings = {
        'queue_delay_seconds': 0,
        'processing_delay_seconds': 0,
        'delivery_delay_seconds': 0,
        'failure_mode': failure_mode,
        **overrides,
    }
    return DemoStore(DemoSettings(**settings), clock=lambda: NOW)


def create_request(store: DemoStore, start_month: str = START_MONTH, end_month: str = END_MONTH) -> str:
    """Create one request and return its identifier."""
    request = store.create_request(DEMO_OWNER_ID, PRODUCT_ID, AOI_ID, start_month, end_month)
    return request.request_id


def complete_request(store: DemoStore, start_month: str = START_MONTH, end_month: str = END_MONTH) -> str:
    """Complete one zero-delay request and return its result identifier."""
    request_id = create_request(store, start_month, end_month)
    request = store.get_request(DEMO_OWNER_ID, request_id)
    assert request.result_id is not None
    return request.result_id
