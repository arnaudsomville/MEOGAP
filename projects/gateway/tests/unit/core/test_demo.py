"""Unit tests for deterministic Gateway demo state."""

from datetime import UTC, datetime

import pytest
from meogap.scientific.products import SourceMission

from gateway.core.demo import (
    DELIVERY_FAILED,
    DELIVERY_READY,
    DEMO_OWNER_ID,
    FAILURE_DELIVERY,
    FAILURE_EXECUTION,
    FAILURE_INSUFFICIENT_CREDITS,
    REQUEST_CANCELLED,
    REQUEST_COMPLETED,
    REQUEST_FAILED,
    REQUEST_PROPOSED,
    DemoError,
    DemoSettings,
    DemoStore,
)

pytestmark = pytest.mark.unit

NOW = datetime(2026, 1, 1, tzinfo=UTC)
PRODUCT_ID = 'ndvi'
START_MONTH = '2026-01'
END_MONTH = '2026-02'
REQUESTED_RESOLUTION_M = 20
NEW_GEOMETRY = {
    'type': 'Polygon',
    'coordinates': [[[1.4, 43.6], [1.41, 43.6], [1.41, 43.61], [1.4, 43.6]]],
}


def build_store(failure_mode: str | None = None) -> DemoStore:
    """Build a zero-delay deterministic store with an injected fixed clock.

    Args:
    ----
        failure_mode(str | None): deterministic failure mode under test.

    Returns:
    -------
        DemoStore: isolated deterministic store.

    """
    return DemoStore(
        DemoSettings(
            preparation_delay_seconds=0,
            execution_delay_seconds=0,
            delivery_delay_seconds=0,
            failure_mode=failure_mode,
        ),
        clock=lambda: NOW,
    )


def prepare_proposal(store: DemoStore) -> str:
    """Create and advance one request to its proposal state.

    Args:
    ----
        store(DemoStore): deterministic store under test.

    Returns:
    -------
        str: proposed request identifier.

    """
    # The seeded first AOI is the documented Toulouse example.
    request = store.create_request(DEMO_OWNER_ID, PRODUCT_ID, 'aoi-1', START_MONTH, END_MONTH)
    return store.get_request(DEMO_OWNER_ID, request.request_id).request_id


def test_request_keeps_immutable_aoi_snapshot_through_completion_and_deletion() -> None:
    """Validate requests retain their captured AOI geometry and revision after AOI changes.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    store = build_store()
    aoi = store.get_aoi(DEMO_OWNER_ID, 'aoi-1')
    original_geometry = aoi.geometry
    request_id = prepare_proposal(store)
    # Act
    request = store.confirm_request(DEMO_OWNER_ID, request_id)
    completed = store.get_request(DEMO_OWNER_ID, request.request_id)
    store.update_aoi(
        DEMO_OWNER_ID,
        'aoi-1',
        'Updated Toulouse',
        None,
        description_provided=True,
        geometry=NEW_GEOMETRY,
    )
    store.delete_aoi(DEMO_OWNER_ID, 'aoi-1')
    # Assert
    assert completed.state == REQUEST_COMPLETED
    assert completed.aoi_revision == 1
    assert completed.geometry_snapshot == original_geometry
    assert completed.result_id == 'result-1'


def test_delivery_reaches_ready_with_a_valid_synthetic_artifact_and_map() -> None:
    """Validate completed requests expose explicitly synthetic map and delivery representations.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    store = build_store()
    request_id = prepare_proposal(store)
    request = store.confirm_request(DEMO_OWNER_ID, request_id)
    completed = store.get_request(DEMO_OWNER_ID, request.request_id)
    # Act
    result_map = store.get_result_map(DEMO_OWNER_ID, completed.result_id or '')
    delivery = store.create_delivery(DEMO_OWNER_ID, completed.result_id or '')
    ready_delivery = store.get_delivery(DEMO_OWNER_ID, delivery.delivery_id)
    # Assert
    assert result_map['kind'] == 'DEMO_PLACEHOLDER'
    assert 'not a computed scientific product' in result_map['note']
    assert ready_delivery.state == DELIVERY_READY
    assert store.serialize_delivery(ready_delivery)['download_url'].startswith('data:application/geo+json;base64,')


@pytest.mark.parametrize(
    ('failure_mode', 'expected_state'),
    [(FAILURE_EXECUTION, REQUEST_FAILED), (FAILURE_DELIVERY, DELIVERY_FAILED)],
    ids=['execution', 'delivery'],
)
def test_configured_failures_are_deterministic(failure_mode: str, expected_state: str) -> None:
    """Validate configured execution and delivery failures have stable public states.

    Args:
    ----
        failure_mode(str): configured deterministic failure.
        expected_state(str): resulting request or delivery state.

    Returns:
    -------
        None

    """
    # Arrange
    store = build_store(failure_mode)
    request_id = prepare_proposal(store)
    request = store.confirm_request(DEMO_OWNER_ID, request_id)
    # Act
    if failure_mode == FAILURE_EXECUTION:
        outcome = store.get_request(DEMO_OWNER_ID, request.request_id).state
    else:
        completed = store.get_request(DEMO_OWNER_ID, request.request_id)
        delivery = store.create_delivery(DEMO_OWNER_ID, completed.result_id or '')
        outcome = store.get_delivery(DEMO_OWNER_ID, delivery.delivery_id).state
    # Assert
    assert outcome == expected_state


def test_insufficient_credits_leave_a_proposal_confirmable_after_the_error() -> None:
    """Validate failed admission does not debit or move a proposed request.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    store = build_store(FAILURE_INSUFFICIENT_CREDITS)
    request_id = prepare_proposal(store)
    # Act / Assert
    with pytest.raises(DemoError, match='cannot admit'):
        store.confirm_request(DEMO_OWNER_ID, request_id)
    assert store.get_request(DEMO_OWNER_ID, request_id).state == REQUEST_PROPOSED


def test_completed_request_cannot_be_cancelled_and_invalid_geometry_is_rejected() -> None:
    """Validate lifecycle and polygonal AOI invariants reject invalid transitions and inputs.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    store = build_store()
    request_id = prepare_proposal(store)
    request = store.confirm_request(DEMO_OWNER_ID, request_id)
    completed = store.get_request(DEMO_OWNER_ID, request.request_id)
    # Act / Assert
    with pytest.raises(DemoError, match='cannot be cancelled'):
        store.cancel_request(DEMO_OWNER_ID, completed.request_id)
    with pytest.raises(DemoError, match='boundaries must be closed'):
        store.create_aoi(
            DEMO_OWNER_ID,
            'Invalid Toulouse area',
            None,
            {
                'type': 'Polygon',
                'coordinates': [[[1.4, 43.6], [1.41, 43.6], [1.41, 43.61], [1.4, 43.61]]],
            },
        )
    cancelled = store.create_request(DEMO_OWNER_ID, PRODUCT_ID, 'aoi-1', START_MONTH, END_MONTH)
    assert completed.state == REQUEST_COMPLETED
    assert store.cancel_request(DEMO_OWNER_ID, cancelled.request_id).state == REQUEST_CANCELLED


def test_request_retains_requested_constraints_and_rejects_unsupported_sources() -> None:
    """Validate requested source missions and resolution are retained without pretending availability.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    store = build_store()
    # Act
    request = store.create_request(
        DEMO_OWNER_ID,
        PRODUCT_ID,
        'aoi-1',
        START_MONTH,
        END_MONTH,
        spatial_resolution_m=REQUESTED_RESOLUTION_M,
        sources=[SourceMission.SENTINEL],
    )
    # Assert
    assert request.requested_sources == ('Sentinel',)
    assert request.requested_spatial_resolution_m == REQUESTED_RESOLUTION_M
    assert store.serialize_request(request)['requested_sources'] == ['Sentinel']
    with pytest.raises(DemoError, match='does not declare'):
        store.create_request(
            DEMO_OWNER_ID,
            PRODUCT_ID,
            'aoi-1',
            START_MONTH,
            END_MONTH,
            sources=[SourceMission.GOES],
        )
