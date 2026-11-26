"""Unit tests for result representations, series semantics and provenance."""

import pytest
from demo_fixtures import (
    END_MONTH,
    POINT_WKT,
    SMALL_POLYGON_WKT,
    START_MONTH,
    build_store,
    complete_request,
)

from gateway.core.demo import (
    DEMO_OWNER_ID,
    QUALITY_PARTIAL,
    SERIES_MASKED,
    SERIES_MISSING,
    SERIES_VALID,
    DemoError,
)
from gateway.core.demo.models import (
    LegacySeriesView,
    LineageView,
    ResultDetailView,
    ResultMapView,
    SeriesParameterView,
    SeriesView,
)

pytestmark = pytest.mark.unit

FULL_YEAR_MONTHS = 12
EXPECTED_SHORT_REQUEST_FRAMES = 2
SMALL_AREA_LIMIT_KM2 = 0.1
TOULOUSE_EXTENT_WKT = 'POLYGON((1.38 43.56, 1.49 43.56, 1.49 43.66, 1.38 43.66, 1.38 43.56))'


def test_georeferenced_map_is_synthetic_and_never_claims_a_mission() -> None:
    """The demonstration raster is labelled as synthetic with no mission provenance."""
    store = build_store()
    result_id = complete_request(store)
    result_map = store.get_result_map(DEMO_OWNER_ID, result_id)
    assert isinstance(result_map, ResultMapView)
    assert result_map.kind == 'SYNTHETIC_DEMO_NDVI'
    assert result_map.provenance == 'SYNTHETIC_DEMO'
    assert result_map.is_demo is True
    assert 'Sentinel' not in result_map.note
    assert 'No observation quality' in result_map.quality_note
    assert 'cloud-masked' not in result_map.quality_note.lower()
    assert result_map.quality_status == 'UNKNOWN'
    assert result_map.legend is not None
    assert result_map.legend.title == 'NDVI'
    assert result_map.geotiff_url is not None
    assert result_map.geotiff_url.endswith('.tif')


def test_result_detail_exposes_scope_period_parameters_and_provenance() -> None:
    """Result metadata distinguishes representation, extent, period and synthetic nature."""
    store = build_store()
    result_id = complete_request(store)
    detail = store.get_result(DEMO_OWNER_ID, result_id)
    assert isinstance(detail, ResultDetailView)
    assert detail.result_id == result_id
    assert detail.geometry_snapshot['type'] == 'Polygon'
    assert detail.start_month == START_MONTH
    assert detail.end_month == END_MONTH
    assert detail.provenance == 'SYNTHETIC_DEMO'
    assert detail.provenance_note.startswith('SYNTHETIC_DEMO')
    assert 'no Sentinel' in detail.provenance_note
    assert detail.available_parameters == [SeriesParameterView(name='ndvi', label='NDVI', units='unitless')]
    assert detail.validation_status == 'NOT_VALIDATED'


def test_map_generates_all_monthly_frames_and_honours_requested_count() -> None:
    """Mock frame dates span the request period and can be limited."""
    store = build_store()
    result_id = complete_request(store, start_month='2026-01', end_month='2026-04')
    all_frames = store.get_result_map(DEMO_OWNER_ID, result_id)
    limited = store.get_result_map(DEMO_OWNER_ID, result_id, frame_count=2)
    assert [frame.period_start for frame in all_frames.frames] == [
        '2026-01-01',
        '2026-02-01',
        '2026-03-01',
        '2026-04-01',
    ]
    assert len(limited.frames) == EXPECTED_SHORT_REQUEST_FRAMES
    assert limited.frames[0].period_start == '2026-01-01'
    assert limited.frames[1].period_start == '2026-04-01'
    assert all_frames.frames[0].url.startswith('/demo-assets/ndvi/')


def test_series_preserves_missing_masked_and_true_zero_states() -> None:
    """Missing and masked periods are null; a measured zero is an explicit VALID zero."""
    store = build_store()
    result_id = complete_request(store, start_month='2026-01', end_month='2026-12')
    series = store.query_result_series(DEMO_OWNER_ID, result_id, POINT_WKT, 'EPSG:4326', '2026-01', '2026-12')
    assert isinstance(series, SeriesView)
    states = {point.state for point in series.points}
    zero_points = [point for point in series.points if point.state == SERIES_VALID and point.value == 0]
    assert len(series.points) == FULL_YEAR_MONTHS
    assert states >= {SERIES_VALID, SERIES_MISSING, SERIES_MASKED}
    assert zero_points
    assert all(point.value is None for point in series.points if point.state != SERIES_VALID)
    assert series.quality_status == QUALITY_PARTIAL
    assert series.provenance == 'SYNTHETIC_DEMO'
    assert series.aggregation_method == 'point_sample'


def test_series_exposes_available_parameters_and_rejects_unknown_ones() -> None:
    """Parameter filtering is explicit and validated against available series."""
    store = build_store()
    result_id = complete_request(store)
    series = store.query_result_series(
        DEMO_OWNER_ID, result_id, POINT_WKT, 'EPSG:4326', START_MONTH, END_MONTH, ['ndvi']
    )
    assert series.available_parameters == [SeriesParameterView(name='ndvi', label='NDVI', units='unitless')]
    assert series.selected_parameters == ['ndvi']
    assert {point.parameter for point in series.points} == {'ndvi'}
    with pytest.raises(DemoError, match='does not expose these series parameters'):
        store.query_result_series(DEMO_OWNER_ID, result_id, POINT_WKT, 'EPSG:4326', START_MONTH, END_MONTH, ['unknown'])


def test_point_and_polygon_selections_return_consistent_aggregations() -> None:
    """Point selections sample and polygon selections declare a zonal mean."""
    store = build_store()
    result_id = complete_request(store)
    point = store.query_result_series(DEMO_OWNER_ID, result_id, POINT_WKT, 'EPSG:4326', START_MONTH, END_MONTH)
    polygon = store.query_result_series(
        DEMO_OWNER_ID, result_id, SMALL_POLYGON_WKT, 'EPSG:4326', START_MONTH, END_MONTH
    )
    assert point.selection_type == 'Point'
    assert point.aggregation_method == 'point_sample'
    assert point.selection_area_km2 == 0.0
    assert all(item.coverage is None for item in point.points)
    assert polygon.selection_type == 'Polygon'
    assert polygon.aggregation_method == 'zonal_mean'
    assert polygon.selection_area_km2 > 0
    assert all(item.coverage is not None for item in polygon.points)


def test_full_result_extent_is_an_explicit_valid_selection() -> None:
    """The complete result geometry can be analysed without tripping the area limit."""
    store = build_store(max_selection_area_km2=SMALL_AREA_LIMIT_KM2)
    result_id = complete_request(store)
    series = store.query_result_series(
        DEMO_OWNER_ID, result_id, TOULOUSE_EXTENT_WKT, 'EPSG:4326', START_MONTH, END_MONTH
    )
    assert series.selection_type == 'Polygon'
    assert series.selection_area_km2 > SMALL_AREA_LIMIT_KM2


def test_selection_outside_result_and_unsupported_period_are_rejected() -> None:
    """Selection containment and result-period bounds are enforced."""
    store = build_store()
    result_id = complete_request(store)
    with pytest.raises(DemoError, match='inside the displayed result'):
        store.query_result_series(DEMO_OWNER_ID, result_id, 'POINT(1.0 43.6)', 'EPSG:4326', START_MONTH, END_MONTH)
    with pytest.raises(DemoError, match='within the original result period'):
        store.query_result_series(DEMO_OWNER_ID, result_id, POINT_WKT, 'EPSG:4326', '2025-12', '2026-01')


def test_oversized_sub_polygon_is_rejected() -> None:
    """Configured sub-selection limits are enforced for non-extent polygons."""
    store = build_store(max_selection_area_km2=0.0001)
    result_id = complete_request(store)
    with pytest.raises(DemoError, match='exceeds'):
        store.query_result_series(DEMO_OWNER_ID, result_id, SMALL_POLYGON_WKT, 'EPSG:4326', START_MONTH, END_MONTH)


def test_legacy_series_endpoint_does_not_fabricate_observations() -> None:
    """The legacy GET series placeholder remains explicitly empty."""
    store = build_store()
    result_id = complete_request(store)
    legacy = store.get_result_series(DEMO_OWNER_ID, result_id)
    assert isinstance(legacy, LegacySeriesView)
    assert legacy.points == []
    assert 'No analytical series' in legacy.note


def test_lineage_is_synthetic_and_links_request_and_result() -> None:
    """Lineage retains the originating request without claiming real assets."""
    store = build_store()
    result_id = complete_request(store)
    lineage = store.get_result_lineage(DEMO_OWNER_ID, result_id)
    assert isinstance(lineage, LineageView)
    assert lineage.result_id == result_id
    assert lineage.request_id == 'request-1'
    assert lineage.provenance == 'SYNTHETIC_DEMO'
    assert 'no real source assets' in lineage.note
