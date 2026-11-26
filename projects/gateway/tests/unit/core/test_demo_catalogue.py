"""Unit tests for deterministic catalogue data and honest M0 capabilities."""

import pytest
from demo_fixtures import build_store

from gateway.core.demo import DemoError
from gateway.core.demo.models import (
    ProductListView,
    ProductMissionsView,
    ProductRequirementsView,
    ProductView,
)

pytestmark = pytest.mark.unit

PRODUCT_COUNT = 4
EXPECTED_MAX_PERIOD_MONTHS = 120


def test_products_declare_only_implemented_spatial_inputs_and_explicit_selections() -> None:
    """Advertised request inputs match the AOI-only request path."""
    store = build_store()
    products = store.list_products()
    assert isinstance(products, ProductListView)
    assert len(products.items) == PRODUCT_COUNT
    for product in products.items:
        assert isinstance(product, ProductView)
        assert product.supported_spatial_inputs == ['AOI']
        assert product.supported_selection_geometries == ['POINT', 'POLYGON', 'RESULT_EXTENT']
        assert product.availability == 'DEMO'
        assert product.provenance == 'SYNTHETIC_DEMO'
        assert product.validation_status == 'NOT_VALIDATED'


def test_product_metadata_and_mission_endpoint_are_dynamic() -> None:
    """Product descriptors and mission metadata are served by the catalogue."""
    store = build_store()
    product = store.get_product('ndvi')
    missions = store.list_product_missions('ndvi')
    assert isinstance(product, ProductView)
    assert isinstance(missions, ProductMissionsView)
    assert product.units == 'unitless'
    assert product.parameters == ['ndvi']
    assert product.max_period_months == EXPECTED_MAX_PERIOD_MONTHS
    assert [mission.source_id for mission in missions.items] == product.supported_sources
    assert missions.items[0].provider
    assert missions.items[0].native_resolution


def test_product_requirements_and_limitations_distinguish_provenance() -> None:
    """Requirements and limitations must not present mission compatibility as provenance."""
    store = build_store()
    requirements = store.get_product_requirements('ndvi')
    assert isinstance(requirements, ProductRequirementsView)
    limitations = ' '.join(requirements.limitations).lower()
    assert 'compatibility descriptors only' in limitations
    assert 'no earth observation data is acquired' in limitations


def test_product_previews_are_local_labelled_and_distinct() -> None:
    """Each demo product carries a distinct, explicitly illustrative preview."""
    store = build_store()
    previews = [product.preview for product in store.list_products().items]
    assert len(previews) == PRODUCT_COUNT
    assert all(preview is not None for preview in previews)
    assert len({preview.url for preview in previews if preview is not None}) == PRODUCT_COUNT
    assert all(preview.url.startswith('data:image/svg+xml,') for preview in previews if preview is not None)
    assert all('illustrative' in preview.alt.lower() for preview in previews if preview is not None)
    assert all('not a scientific result' in preview.attribution.lower() for preview in previews if preview is not None)


def test_unknown_product_is_rejected() -> None:
    """Unknown catalogue identifiers return a caller-safe error."""
    store = build_store()
    with pytest.raises(DemoError, match='not available'):
        store.get_product('unknown')
