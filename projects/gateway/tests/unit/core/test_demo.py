"""Unit tests for deterministic Gateway demo state."""

from datetime import UTC, datetime

import pytest
from meogap.scientific.products import SourceMission

from gateway.core.demo import (
    DELIVERY_FAILED,
    DELIVERY_KIND_ARCHIVE,
    DELIVERY_READY,
    DEMO_OWNER_ID,
    FAILURE_CREDITS_UNAVAILABLE,
    FAILURE_DELIVERY,
    FAILURE_EXECUTION,
    FAILURE_INSUFFICIENT_CREDITS,
    QUALITY_PARTIAL,
    REQUEST_CANCELLED,
    REQUEST_COMPLETED,
    REQUEST_FAILED,
    REQUEST_PROPOSED,
    SERIES_MASKED,
    SERIES_MISSING,
    SERIES_VALID,
    DemoError,
    DemoSettings,
    DemoStore,
    account_identity,
    owner_for_token,
    parse_wkt_geometry,
)

pytestmark = pytest.mark.unit

NOW = datetime(2026, 1, 1, tzinfo=UTC)
PRODUCT_ID = 'ndvi'
START_MONTH = '2026-01'
END_MONTH = '2026-02'
REQUESTED_RESOLUTION_M = 20
PRODUCT_COUNT = 4
EXPECTED_MAX_PERIOD_MONTHS = 120
EXPECTED_STARTING_BALANCE = 1000
FULL_YEAR_MONTHS = 12
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


def test_request_retains_temporal_frequency_and_rejects_unsupported_frequency() -> None:
    """Validate the scientific temporal frequency is retained and constrained by the product.

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
        temporal_frequency='monthly',
    )
    completed_request = store.get_request(DEMO_OWNER_ID, request.request_id)
    # Assert
    assert store.serialize_request(completed_request)['temporal_frequency'] == 'monthly'
    with pytest.raises(DemoError, match='declared by the product'):
        store.create_request(
            DEMO_OWNER_ID,
            PRODUCT_ID,
            'aoi-1',
            START_MONTH,
            END_MONTH,
            temporal_frequency='hourly',
        )


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


def test_product_previews_are_local_labelled_and_distinct() -> None:
    """Validate each demo product carries a distinct, explicitly illustrative preview.

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
    previews = [product['preview'] for product in store.list_products()]
    # Assert
    assert len(previews) == PRODUCT_COUNT
    assert len({preview['url'] for preview in previews}) == PRODUCT_COUNT
    assert all(preview['url'].startswith('data:image/svg+xml,') for preview in previews)
    assert all('illustrative' in preview['alt'].lower() for preview in previews)
    assert all('not a scientific result' in preview['attribution'].lower() for preview in previews)


def build_completed_result(
    store: DemoStore,
    *,
    start_month: str = START_MONTH,
    end_month: str = END_MONTH,
    temporal_frequency: str | None = None,
) -> str:
    """Complete one request and return its deterministic result identifier.

    Args:
    ----
        store(DemoStore): deterministic store.
        start_month(str): inclusive request start month.
        end_month(str): inclusive request end month.
        temporal_frequency(str | None): optional request temporal frequency.

    Returns:
    -------
        str: completed result identifier.

    """
    request = store.create_request(
        DEMO_OWNER_ID,
        PRODUCT_ID,
        'aoi-1',
        start_month,
        end_month,
        temporal_frequency=temporal_frequency,
    )
    store.confirm_request(DEMO_OWNER_ID, request.request_id)
    completed = store.get_request(DEMO_OWNER_ID, request.request_id)
    assert completed.result_id is not None
    return completed.result_id


POINT_WKT = 'POINT(1.44 43.60)'
SMALL_POLYGON_WKT = 'POLYGON((1.40 43.58, 1.42 43.58, 1.42 43.60, 1.40 43.60, 1.40 43.58))'


def test_product_metadata_and_mission_endpoint_are_dynamic() -> None:
    """Validate product descriptors and mission metadata are served by the store.

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
    product = store.get_product(PRODUCT_ID)
    missions = store.list_product_missions(PRODUCT_ID)
    # Assert
    assert product['units'] == 'unitless'
    assert product['supported_spatial_inputs'] == ['AOI', 'POI', 'LOI']
    assert product['max_period_months'] == EXPECTED_MAX_PERIOD_MONTHS
    assert [mission['source_id'] for mission in missions['items']] == product['supported_sources']
    assert missions['items'][0]['provider']
    assert missions['items'][0]['native_resolution']


def test_cost_estimate_reports_admission_balance_and_unavailable_balance() -> None:
    """Validate estimate decisions distinguish admitted, insufficient and unavailable.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    admitted_store = build_store()
    poor_store = DemoStore(DemoSettings(starting_credits=1), clock=lambda: NOW)
    unavailable_store = build_store(FAILURE_CREDITS_UNAVAILABLE)
    # Act
    admitted = admitted_store.estimate_request(DEMO_OWNER_ID, PRODUCT_ID, 'aoi-1', START_MONTH, END_MONTH)
    insufficient = poor_store.estimate_request(DEMO_OWNER_ID, PRODUCT_ID, 'aoi-1', START_MONTH, END_MONTH)
    unavailable = unavailable_store.estimate_request(DEMO_OWNER_ID, PRODUCT_ID, 'aoi-1', START_MONTH, END_MONTH)
    # Assert
    assert admitted['admission'] == 'ADMITTED'
    assert admitted['balance'] == EXPECTED_STARTING_BALANCE
    assert insufficient['admission'] == 'INSUFFICIENT_CREDITS'
    assert insufficient['feasible'] is False
    assert unavailable['admission'] == 'UNAVAILABLE'
    assert unavailable['balance'] is None
    assert unavailable['balance_available'] is False


def test_request_constraints_reject_unsupported_period_and_resolution() -> None:
    """Validate product-declared temporal and resolution constraints are enforced.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    store = build_store()
    # Act / Assert
    with pytest.raises(DemoError, match='at most 120 months'):
        store.create_request(DEMO_OWNER_ID, PRODUCT_ID, 'aoi-1', '2010-01', '2025-12')
    with pytest.raises(DemoError, match='product-declared resolutions'):
        store.create_request(
            DEMO_OWNER_ID,
            PRODUCT_ID,
            'aoi-1',
            START_MONTH,
            END_MONTH,
            spatial_resolution_m=999,
        )


def test_point_and_polygon_wkt_are_validated_with_explicit_crs() -> None:
    """Validate WKT parsing, CRS validation and malformed geometry rejection.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act
    point_kind, point = parse_wkt_geometry(POINT_WKT, 'EPSG:4326')
    polygon_kind, polygon = parse_wkt_geometry(SMALL_POLYGON_WKT, 'EPSG:4326')
    # Assert
    assert point_kind == 'Point'
    assert point['coordinates'] == [1.44, 43.60]
    assert polygon_kind == 'Polygon'
    assert polygon['coordinates'][0][0] == [1.40, 43.58]
    with pytest.raises(DemoError, match='CRS must be EPSG:4326'):
        parse_wkt_geometry(POINT_WKT, 'EPSG:3857')
    with pytest.raises(DemoError, match=r'POINT|POLYGON'):
        parse_wkt_geometry('LINESTRING(1 2, 3 4)', 'EPSG:4326')


def test_query_result_series_returns_explicit_gaps_masks_and_true_zero() -> None:
    """Validate deterministic series preserve distinct missing, masked and zero states.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    store = build_store()
    result_id = build_completed_result(store, start_month='2026-01', end_month='2026-12')
    # Act
    series = store.query_result_series(DEMO_OWNER_ID, result_id, POINT_WKT, 'EPSG:4326', '2026-01', '2026-12')
    states = {point['state'] for point in series['points']}
    zero_points = [point for point in series['points'] if point['state'] == SERIES_VALID and point['value'] == 0]
    # Assert
    assert len(series['points']) == FULL_YEAR_MONTHS
    assert states >= {SERIES_VALID, SERIES_MISSING, SERIES_MASKED}
    assert zero_points
    assert all(point['value'] is None for point in series['points'] if point['state'] != SERIES_VALID)
    assert series['quality_status'] == QUALITY_PARTIAL
    assert series['is_demo'] is True
    assert series['aggregation_method'] == 'point_sample'


def test_query_result_series_rejects_outside_selection_and_unsupported_period() -> None:
    """Validate selection and period bounds are enforced before generating a series.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    store = build_store()
    result_id = build_completed_result(store)
    # Act / Assert
    with pytest.raises(DemoError, match='inside the displayed result'):
        store.query_result_series(DEMO_OWNER_ID, result_id, 'POINT(1.0 43.6)', 'EPSG:4326', START_MONTH, END_MONTH)
    with pytest.raises(DemoError, match='within the original result period'):
        store.query_result_series(DEMO_OWNER_ID, result_id, POINT_WKT, 'EPSG:4326', '2025-12', '2026-01')


def test_query_result_series_rejects_oversized_polygon() -> None:
    """Validate the configured maximum selection area is enforced.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    store = DemoStore(
        DemoSettings(
            preparation_delay_seconds=0,
            execution_delay_seconds=0,
            max_selection_area_km2=0.1,
        ),
        clock=lambda: NOW,
    )
    result_id = build_completed_result(store)
    # Act / Assert
    with pytest.raises(DemoError, match='exceeds'):
        store.query_result_series(DEMO_OWNER_ID, result_id, SMALL_POLYGON_WKT, 'EPSG:4326', START_MONTH, END_MONTH)


def test_result_detail_and_delivery_archive_expose_explicit_demo_metadata() -> None:
    """Validate result metadata and archive delivery are clearly synthetic.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    store = build_store()
    result_id = build_completed_result(store, temporal_frequency='weekly')
    # Act
    detail = store.get_result(DEMO_OWNER_ID, result_id)
    delivery = store.create_delivery(DEMO_OWNER_ID, result_id, DELIVERY_KIND_ARCHIVE)
    ready = store.get_delivery(DEMO_OWNER_ID, delivery.delivery_id)
    serialized = store.serialize_delivery(ready)
    # Assert
    assert detail['result_id'] == result_id
    assert detail['units'] == 'unitless'
    assert detail['is_demo'] is True
    assert detail['temporal_frequency'] == 'weekly'
    assert 'Demo lineage' in detail['provenance_note']
    assert serialized['kind'] == DELIVERY_KIND_ARCHIVE
    assert serialized['download_url'].startswith('data:application/geo+json;base64,')
    with pytest.raises(DemoError, match='final_product or dependency_archive'):
        store.create_delivery(DEMO_OWNER_ID, result_id, 'unknown')


def test_demo_accounts_are_derived_from_bearer_tokens() -> None:
    """Validate multiple demo accounts are resolved by the Gateway, not the client.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Act
    first_owner = owner_for_token('m0-ui-demo-token')
    second_owner = owner_for_token('m0-ui-demo-token-2')
    unknown_owner = owner_for_token('unknown-token')
    identity = account_identity(second_owner)
    # Assert
    assert first_owner == 'demo-user'
    assert second_owner == 'demo-user-2'
    assert unknown_owner == DEMO_OWNER_ID
    assert identity['user_id'] == 'demo-user-2'
    assert identity['display_name'] == 'MEOGAP second demo user'


def test_aoi_area_limit_rejects_creation_and_update_but_not_seed_references() -> None:
    """Validate the configured AOI area limit applies to public writes, not seeded demos.

    Args:
    ----
        None

    Returns:
    -------
        None

    """
    # Arrange
    store = DemoStore(
        DemoSettings(
            preparation_delay_seconds=0,
            execution_delay_seconds=0,
            max_aoi_area_km2=1.0,
        ),
        clock=lambda: NOW,
    )
    oversized = {
        'type': 'Polygon',
        'coordinates': [[[1.40, 43.60], [1.42, 43.60], [1.42, 43.62], [1.40, 43.62], [1.40, 43.60]]],
    }
    small = {
        'type': 'Polygon',
        'coordinates': [[[1.40, 43.60], [1.405, 43.60], [1.405, 43.605], [1.40, 43.60]]],
    }
    seeded_count = len(store.list_aois(DEMO_OWNER_ID))
    # Act / Assert
    with pytest.raises(DemoError, match='cannot exceed 1 km'):
        store.create_aoi(DEMO_OWNER_ID, 'Oversized area', None, oversized)
    created = store.create_aoi(DEMO_OWNER_ID, 'Small area', None, small)
    with pytest.raises(DemoError, match='cannot exceed 1 km'):
        store.update_aoi(
            DEMO_OWNER_ID,
            created.aoi_id,
            None,
            None,
            description_provided=False,
            geometry=oversized,
        )
    assert store.get_aoi(DEMO_OWNER_ID, created.aoi_id).revision == 1
    assert len(store.list_aois(DEMO_OWNER_ID)) == seeded_count + 1
