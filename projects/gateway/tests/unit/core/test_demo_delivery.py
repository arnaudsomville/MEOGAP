"""Unit tests for deterministic demo deliveries and accounts."""

import pytest
from demo_fixtures import END_MONTH, NOW, START_MONTH, build_store, complete_request

from gateway.core.demo import (
    DELIVERY_FAILED,
    DELIVERY_KIND_ARCHIVE,
    DELIVERY_READY,
    DEMO_OWNER_ID,
    FAILURE_CREDITS_UNAVAILABLE,
    FAILURE_DELIVERY,
    DemoError,
    DemoSettings,
    DemoStore,
    account_identity,
    owner_for_token,
)
from gateway.core.demo.models import AccountView, CostEstimate, DeliveryView

pytestmark = pytest.mark.unit
EXPECTED_STARTING_BALANCE = 1000


def test_delivery_reaches_ready_with_a_synthetic_artifact() -> None:
    """Ready deliveries expose an explicitly synthetic GeoJSON artifact."""
    store = build_store()
    result_id = complete_request(store)
    delivery = store.create_delivery(DEMO_OWNER_ID, result_id)
    ready = store.get_delivery(DEMO_OWNER_ID, delivery.delivery_id)
    view = store.delivery_view(ready)
    assert isinstance(view, DeliveryView)
    assert ready.state == DELIVERY_READY
    assert view.download_url is not None
    assert view.download_url.startswith('data:application/geo+json;base64,')
    assert view.kind == 'final_product'


def test_archive_delivery_and_failure_are_explicit() -> None:
    """Archive deliveries are distinguished and configured failures are visible."""
    store = build_store()
    result_id = complete_request(store)
    archive = store.create_delivery(DEMO_OWNER_ID, result_id, DELIVERY_KIND_ARCHIVE)
    archive_view = store.get_delivery_view(DEMO_OWNER_ID, archive.delivery_id)
    assert archive_view.kind == DELIVERY_KIND_ARCHIVE
    with pytest.raises(DemoError, match='final_product or dependency_archive'):
        store.create_delivery(DEMO_OWNER_ID, result_id, 'unknown')

    failing_store = build_store(FAILURE_DELIVERY)
    failing_result = complete_request(failing_store)
    failing = failing_store.create_delivery(DEMO_OWNER_ID, failing_result)
    assert failing_store.get_delivery(DEMO_OWNER_ID, failing.delivery_id).state == DELIVERY_FAILED


def test_demo_accounts_are_derived_from_bearer_tokens() -> None:
    """Multiple demo accounts are resolved by the Gateway, not the client."""
    first_owner = owner_for_token('m0-ui-demo-token')
    second_owner = owner_for_token('m0-ui-demo-token-2')
    unknown_owner = owner_for_token('unknown-token')
    identity = account_identity(second_owner)
    assert isinstance(identity, AccountView)
    assert first_owner == 'demo-user'
    assert second_owner == 'demo-user-2'
    assert unknown_owner == 'demo-user'
    assert identity.user_id == 'demo-user-2'
    assert identity.display_name == 'MEOGAP second demo user'


def test_cost_estimate_reports_admission_balance_and_unavailable_balance() -> None:
    """Estimate decisions distinguish admitted, insufficient and unavailable."""
    admitted_store = build_store()
    poor_store = DemoStore(DemoSettings(starting_credits=1), clock=lambda: NOW)
    unavailable_store = build_store(FAILURE_CREDITS_UNAVAILABLE)
    admitted = admitted_store.estimate_request(DEMO_OWNER_ID, 'ndvi', 'aoi-1', START_MONTH, END_MONTH)
    insufficient = poor_store.estimate_request(DEMO_OWNER_ID, 'ndvi', 'aoi-1', START_MONTH, END_MONTH)
    unavailable = unavailable_store.estimate_request(DEMO_OWNER_ID, 'ndvi', 'aoi-1', START_MONTH, END_MONTH)
    assert isinstance(admitted, CostEstimate)
    assert admitted.admission == 'ADMITTED'
    assert admitted.balance == EXPECTED_STARTING_BALANCE
    assert insufficient.admission == 'INSUFFICIENT_CREDITS'
    assert insufficient.feasible is False
    assert unavailable.admission == 'UNAVAILABLE'
    assert unavailable.balance is None
    assert unavailable.balance_available is False
