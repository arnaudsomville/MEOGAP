"""Unit tests for owner-scoped AOI behaviour and limits."""

import pytest
from demo_fixtures import AOI_ID, NEW_GEOMETRY, build_store

from gateway.core.demo import DEMO_OWNER_ID, DemoError, DemoSettings, DemoStore
from gateway.core.demo.models import AoiListView, AoiView

pytestmark = pytest.mark.unit

SEEDED_AOI_COUNT = 3
UPDATED_REVISION = 2
SMALL_GEOMETRY = {
    'type': 'Polygon',
    'coordinates': [[[1.40, 43.60], [1.405, 43.60], [1.405, 43.605], [1.40, 43.60]]],
}
OVERSIZED_GEOMETRY = {
    'type': 'Polygon',
    'coordinates': [[[1.40, 43.60], [1.42, 43.60], [1.42, 43.62], [1.40, 43.62], [1.40, 43.60]]],
}


def test_seeded_aois_are_owner_scoped_and_ordered() -> None:
    """Only owner AOIs are visible and revisions start at one."""
    store = build_store()
    aois = store.list_aois(DEMO_OWNER_ID)
    assert isinstance(aois, AoiListView)
    assert len(aois.items) == SEEDED_AOI_COUNT
    assert all(isinstance(aoi, AoiView) and aoi.revision == 1 for aoi in aois.items)
    assert store.list_aois('another-owner').items == []


def test_update_increments_revision_and_preserves_identity() -> None:
    """AOI edits keep identity and increment the revision."""
    store = build_store()
    updated = store.update_aoi(
        DEMO_OWNER_ID,
        AOI_ID,
        'Updated Toulouse',
        'Updated description',
        description_provided=True,
        geometry=NEW_GEOMETRY,
    )
    assert isinstance(updated, AoiView)
    assert updated.aoi_id == AOI_ID
    assert updated.revision == UPDATED_REVISION
    assert store.get_aoi(DEMO_OWNER_ID, AOI_ID).geometry == NEW_GEOMETRY


def test_aoi_area_limit_applies_to_public_writes_but_not_seeded_references() -> None:
    """Configured AOI limits reject oversized public creates and updates."""
    store = DemoStore(
        DemoSettings(queue_delay_seconds=0, processing_delay_seconds=0, max_aoi_area_km2=1.0),
    )
    seeded_count = len(store.list_aois(DEMO_OWNER_ID).items)
    with pytest.raises(DemoError, match='cannot exceed 1 km'):
        store.create_aoi(DEMO_OWNER_ID, 'Oversized area', None, OVERSIZED_GEOMETRY)
    created = store.create_aoi(DEMO_OWNER_ID, 'Small area', None, SMALL_GEOMETRY)
    with pytest.raises(DemoError, match='cannot exceed 1 km'):
        store.update_aoi(
            DEMO_OWNER_ID,
            created.aoi_id,
            None,
            None,
            description_provided=False,
            geometry=OVERSIZED_GEOMETRY,
        )
    assert len(store.list_aois(DEMO_OWNER_ID).items) == seeded_count + 1


def test_invalid_geometry_is_rejected_on_create() -> None:
    """Open rings cannot represent an AOI boundary."""
    store = build_store()
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


def test_other_owners_cannot_read_an_aoi() -> None:
    """AOI access is owner-scoped."""
    store = build_store()
    with pytest.raises(DemoError, match='not found'):
        store.get_aoi('another-owner', AOI_ID)
