"""Unit tests for the deterministic queued -> processing -> succeeded lifecycle."""

from datetime import UTC, datetime, timedelta

import pytest
from demo_fixtures import AOI_ID, END_MONTH, NEW_GEOMETRY, PRODUCT_ID, START_MONTH

from gateway.core.demo import (
    DEMO_OWNER_ID,
    FAILURE_INSUFFICIENT_CREDITS,
    FAILURE_PROCESSING,
    REQUEST_CANCELLED,
    REQUEST_FAILED,
    REQUEST_PROCESSING,
    REQUEST_QUEUED,
    REQUEST_SUCCEEDED,
    DemoError,
    DemoSettings,
    DemoStore,
)
from gateway.core.demo.models import RequestView

pytestmark = pytest.mark.unit
EXPECTED_REQUEST_COST = 12

NOW = datetime(2026, 1, 1, tzinfo=UTC)
QUEUE_DELAY_SECONDS = 5
PROCESSING_DELAY_SECONDS = 10


def build_observable_store(failure_mode: str | None = None) -> tuple[DemoStore, list[datetime]]:
    """Build a store whose clock can be advanced between reads."""
    now = [NOW]
    store = DemoStore(
        DemoSettings(
            queue_delay_seconds=QUEUE_DELAY_SECONDS,
            processing_delay_seconds=PROCESSING_DELAY_SECONDS,
            delivery_delay_seconds=0,
            failure_mode=failure_mode,
        ),
        clock=lambda: now[0],
    )
    return store, now


def create_request(store: DemoStore) -> str:
    """Create one request and return its identifier."""
    return store.create_request(DEMO_OWNER_ID, PRODUCT_ID, AOI_ID, START_MONTH, END_MONTH).request_id


def test_creation_returns_a_queued_request_identifier_immediately() -> None:
    """A submitted request is visible immediately with an identifier and queued state."""
    store, _ = build_observable_store()
    created = store.create_request(DEMO_OWNER_ID, PRODUCT_ID, AOI_ID, START_MONTH, END_MONTH)
    serialized = store.request_view(created)
    assert isinstance(serialized, RequestView)
    assert serialized.request_id == 'request-1'
    assert serialized.state == REQUEST_QUEUED
    assert serialized.result_id is None
    assert serialized.estimated_credits == EXPECTED_REQUEST_COST
    assert serialized.provenance == 'SYNTHETIC_DEMO'


def test_state_evolves_queued_then_processing_then_succeeded_and_holds_the_result() -> None:
    """Elapsed time moves the request through the documented M0 lifecycle."""
    store, now = build_observable_store()
    request_id = create_request(store)

    assert store.get_request(DEMO_OWNER_ID, request_id).state == REQUEST_QUEUED

    now[0] += timedelta(seconds=QUEUE_DELAY_SECONDS + 1)
    processing = store.get_request(DEMO_OWNER_ID, request_id)
    assert processing.state == REQUEST_PROCESSING
    assert processing.processing_started_at == NOW + timedelta(seconds=QUEUE_DELAY_SECONDS)
    assert processing.result_id is None

    now[0] += timedelta(seconds=PROCESSING_DELAY_SECONDS + 1)
    succeeded = store.get_request(DEMO_OWNER_ID, request_id)
    assert succeeded.state == REQUEST_SUCCEEDED
    assert succeeded.result_id == 'result-1'
    assert succeeded.actual_credits == EXPECTED_REQUEST_COST
    assert store.get_result(DEMO_OWNER_ID, succeeded.result_id or '').request_id == request_id


def test_zero_delay_settings_complete_the_lifecycle_on_the_first_read() -> None:
    """Configurable zero delays keep tests and local smoke runs fast."""
    store = DemoStore(
        DemoSettings(queue_delay_seconds=0, processing_delay_seconds=0, delivery_delay_seconds=0),
        clock=lambda: NOW,
    )
    request_id = create_request(store)
    completed = store.get_request(DEMO_OWNER_ID, request_id)
    assert completed.state == REQUEST_SUCCEEDED
    assert completed.result_id is not None


def test_processing_failure_is_represented_explicitly() -> None:
    """A configured processing failure exposes a failed state and stage."""
    store, now = build_observable_store(FAILURE_PROCESSING)
    request_id = create_request(store)
    now[0] += timedelta(seconds=QUEUE_DELAY_SECONDS + 1)
    assert store.get_request(DEMO_OWNER_ID, request_id).state == REQUEST_PROCESSING
    now[0] += timedelta(seconds=PROCESSING_DELAY_SECONDS + 1)
    failed = store.get_request(DEMO_OWNER_ID, request_id)
    serialized = store.request_view(failed)
    assert failed.state == REQUEST_FAILED
    assert failed.result_id is None
    assert serialized.failure is not None
    assert serialized.failure.stage == 'processing'
    assert serialized.failure.message == 'The deterministic demo processing stage failed.'


def test_admission_failure_does_not_create_a_result() -> None:
    """An insufficient deterministic balance fails admission without inventing a result."""
    store, now = build_observable_store(FAILURE_INSUFFICIENT_CREDITS)
    request_id = create_request(store)
    now[0] += timedelta(seconds=QUEUE_DELAY_SECONDS + 1)
    failed = store.get_request(DEMO_OWNER_ID, request_id)
    assert failed.state == REQUEST_FAILED
    assert failed.failure_stage == 'admission'
    assert failed.result_id is None


def test_in_flight_request_can_be_cancelled_but_succeeded_request_cannot() -> None:
    """Cancellation is limited to non-terminal requests."""
    store, now = build_observable_store()
    request_id = create_request(store)
    assert store.cancel_request(DEMO_OWNER_ID, request_id).state == REQUEST_CANCELLED

    other_id = create_request(store)
    now[0] += timedelta(seconds=QUEUE_DELAY_SECONDS + 1)
    assert store.get_request(DEMO_OWNER_ID, other_id).state == REQUEST_PROCESSING
    now[0] += timedelta(seconds=PROCESSING_DELAY_SECONDS + 1)
    completed = store.get_request(DEMO_OWNER_ID, other_id)
    assert completed.state == REQUEST_SUCCEEDED
    with pytest.raises(DemoError, match='Only a queued or processing request'):
        store.cancel_request(DEMO_OWNER_ID, other_id)


def test_request_keeps_an_immutable_aoi_snapshot_after_aoi_changes() -> None:
    """Editing or deleting the source AOI never mutates an existing request."""
    store = DemoStore(
        DemoSettings(queue_delay_seconds=0, processing_delay_seconds=0, delivery_delay_seconds=0),
        clock=lambda: NOW,
    )
    original = store.get_aoi(DEMO_OWNER_ID, AOI_ID).geometry
    request_id = create_request(store)
    completed = store.get_request(DEMO_OWNER_ID, request_id)
    store.update_aoi(
        DEMO_OWNER_ID,
        AOI_ID,
        'Updated Toulouse',
        None,
        description_provided=True,
        geometry=NEW_GEOMETRY,
    )
    store.delete_aoi(DEMO_OWNER_ID, AOI_ID)
    assert completed.geometry_snapshot == original
    assert store.get_request(DEMO_OWNER_ID, request_id).geometry_snapshot == original


def test_list_requests_returns_current_state_for_owned_requests_only() -> None:
    """REST list reads are authoritative and owner-scoped."""
    store, now = build_observable_store()
    request_id = create_request(store)
    now[0] += timedelta(seconds=QUEUE_DELAY_SECONDS + 1)
    assert store.get_request(DEMO_OWNER_ID, request_id).state == REQUEST_PROCESSING
    now[0] += timedelta(seconds=PROCESSING_DELAY_SECONDS + 1)
    requests = store.list_requests(DEMO_OWNER_ID)
    assert [request.request_id for request in requests] == [request_id]
    assert requests[0].state == REQUEST_SUCCEEDED
    assert store.list_requests('another-owner') == []
