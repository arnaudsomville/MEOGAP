"""Facade over the deterministic M0 Gateway demo services."""

from __future__ import annotations

from typing import Any

from meogap.scientific.products import SourceMission

from gateway.core.demo.aoi_service import AoiService
from gateway.core.demo.catalogue import CatalogueService
from gateway.core.demo.delivery_service import DeliveryService
from gateway.core.demo.identity import account_identity
from gateway.core.demo.models import (
    AccountView,
    AoiListView,
    AoiView,
    CostEstimate,
    DeliveryView,
    LegacySeriesView,
    LineageView,
    ProductListView,
    ProductMissionsView,
    ProductRequirementsView,
    ProductView,
    RequestListView,
    RequestView,
    ResultDetailView,
    ResultMapView,
    SeriesView,
)
from gateway.core.demo.records import DeliveryRecord, RequestRecord
from gateway.core.demo.request_service import RequestService
from gateway.core.demo.result_service import ResultService
from gateway.core.demo.serialization import aoi_view, request_view
from gateway.core.demo.settings import DemoSettings
from gateway.core.demo.state import Clock, DemoState, default_clock


class DemoStore:
    """Thread-safe deterministic M0 Gateway facade.

    Responsibilities are delegated to small services so transport routes,
    lifecycle transitions, catalogue data and representations stay separable.
    """

    def __init__(self, settings: DemoSettings | None = None, clock: Clock = default_clock) -> None:
        """Initialize deterministic state and seed documented destinations.

        Args:
        ----
            settings(DemoSettings): configurable demo timings and outcomes.
            clock(Clock): injectable UTC clock used by transitions and tests.

        """
        self.state = DemoState(settings, clock)
        self.settings = self.state.settings
        self.clock = self.state.clock
        self.catalogue: CatalogueService = self.state.catalogue
        self.aois = AoiService(self.state)
        self.requests = RequestService(self.state)
        self.results = ResultService(self.state)
        self.deliveries = DeliveryService(self.state)
        self.aois.seed()

    # Catalogue ------------------------------------------------------------------------------------

    def list_products(self) -> ProductListView:
        """Return deterministic public product summaries."""
        return self.catalogue.list_products()

    def get_product(self, product_id: str) -> ProductView:
        """Return one public demo product definition."""
        return self.catalogue.get_product(product_id)

    def get_product_requirements(self, product_id: str) -> ProductRequirementsView:
        """Return public scientific input requirements for a demo product."""
        return self.catalogue.get_product_requirements(product_id)

    def list_product_missions(self, product_id: str) -> ProductMissionsView:
        """Return compatible source missions with their declared metadata."""
        return self.catalogue.list_product_missions(product_id)

    # AOIs -----------------------------------------------------------------------------------------

    def list_aois(self, owner_id: str) -> AoiListView:
        """Return AOIs owned by a caller."""
        return AoiListView(items=[aoi_view(record) for record in self.aois.list_aois(owner_id)])

    def get_aoi(self, owner_id: str, aoi_id: str) -> AoiView:
        """Return one owner-scoped AOI view."""
        return aoi_view(self.aois.get_aoi(owner_id, aoi_id))

    def create_aoi(
        self,
        owner_id: str,
        name: str,
        description: str | None,
        geometry: dict[str, Any],
        *,
        enforce_area_limit: bool = True,
    ) -> AoiView:
        """Persist a validated owner-scoped AOI and return its view."""
        return aoi_view(
            self.aois.create_aoi(owner_id, name, description, geometry, enforce_area_limit=enforce_area_limit)
        )

    def update_aoi(
        self,
        owner_id: str,
        aoi_id: str,
        name: str | None,
        description: str | None,
        *,
        description_provided: bool,
        geometry: dict[str, Any] | None = None,
    ) -> AoiView:
        """Update one owner-scoped AOI and return its view."""
        return aoi_view(
            self.aois.update_aoi(
                owner_id,
                aoi_id,
                name,
                description,
                description_provided=description_provided,
                geometry=geometry,
            )
        )

    def delete_aoi(self, owner_id: str, aoi_id: str) -> None:
        """Delete one owner-scoped AOI."""
        self.aois.delete_aoi(owner_id, aoi_id)

    # Requests -------------------------------------------------------------------------------------

    def create_request(
        self,
        owner_id: str,
        product_id: str,
        aoi_id: str,
        start_month: str,
        end_month: str,
        *,
        spatial_resolution_m: int | None = None,
        sources: list[SourceMission] | None = None,
        temporal_frequency: str | None = None,
    ) -> RequestRecord:
        """Create a queued request with an immutable AOI snapshot."""
        return self.requests.create_request(
            owner_id,
            product_id,
            aoi_id,
            start_month,
            end_month,
            spatial_resolution_m=spatial_resolution_m,
            sources=sources,
            temporal_frequency=temporal_frequency,
        )

    def estimate_request(
        self,
        owner_id: str,
        product_id: str,
        aoi_id: str,
        start_month: str,
        end_month: str,
        *,
        spatial_resolution_m: int | None = None,
        sources: list[SourceMission] | None = None,
        temporal_frequency: str | None = None,
    ) -> CostEstimate:
        """Return the deterministic cost estimate and admission decision."""
        return self.requests.estimate_request(
            owner_id,
            product_id,
            aoi_id,
            start_month,
            end_month,
            spatial_resolution_m=spatial_resolution_m,
            sources=sources,
            temporal_frequency=temporal_frequency,
        )

    def list_requests(self, owner_id: str) -> list[RequestRecord]:
        """Return current owner-scoped requests after applying transitions."""
        return self.requests.list_requests(owner_id)

    def list_request_views(self, owner_id: str) -> RequestListView:
        """Return current owner-scoped request views after applying transitions."""
        return RequestListView(items=[request_view(record) for record in self.list_requests(owner_id)])

    def get_request(self, owner_id: str, request_id: str) -> RequestRecord:
        """Return current request after applying transitions."""
        return self.requests.get_request(owner_id, request_id)

    def get_request_view(self, owner_id: str, request_id: str) -> RequestView:
        """Return current request view after applying transitions."""
        return request_view(self.get_request(owner_id, request_id))

    def request_view(self, record: RequestRecord) -> RequestView:
        """Return the public view for one request record."""
        return request_view(record)

    def cancel_request(self, owner_id: str, request_id: str) -> RequestRecord:
        """Cancel a queued or processing request."""
        return self.requests.cancel_request(owner_id, request_id)

    def cancel_request_view(self, owner_id: str, request_id: str) -> RequestView:
        """Cancel a queued or processing request and return its view."""
        return request_view(self.cancel_request(owner_id, request_id))

    def get_balance(self, owner_id: str) -> int:
        """Return current demo credits."""
        return self.requests.get_balance(owner_id)

    def get_account(self, owner_id: str) -> AccountView:
        """Return the deterministic demo account identity."""
        return account_identity(owner_id)

    # Results --------------------------------------------------------------------------------------

    def get_result_map(self, owner_id: str, result_id: str, frame_count: int | None = None) -> ResultMapView:
        """Return a labelled synthetic representation for one completed result."""
        return self.results.get_result_map(owner_id, result_id, frame_count)

    def get_result(self, owner_id: str, result_id: str) -> ResultDetailView:
        """Return explicit result metadata."""
        return self.results.get_result(owner_id, result_id)

    def get_result_series(self, owner_id: str, result_id: str) -> LegacySeriesView:
        """Return the non-fabricated legacy series placeholder."""
        return self.results.get_result_series(owner_id, result_id)

    def query_result_series(  # noqa: PLR0917
        self,
        owner_id: str,
        result_id: str,
        geometry_wkt: str,
        crs: str,
        start_month: str,
        end_month: str,
        parameters: list[str] | None = None,
    ) -> SeriesView:
        """Return a deterministic series for one explicit selection."""
        return self.results.query_result_series(
            owner_id,
            result_id,
            geometry_wkt,
            crs,
            start_month,
            end_month,
            parameters,
        )

    def get_result_lineage(self, owner_id: str, result_id: str) -> LineageView:
        """Return retained demo request provenance."""
        return self.results.get_result_lineage(owner_id, result_id)

    # Deliveries -----------------------------------------------------------------------------------

    def create_delivery(self, owner_id: str, result_id: str, kind: str = 'final_product') -> DeliveryRecord:
        """Create an asynchronous delivery for a completed result."""
        return self.deliveries.create_delivery(owner_id, result_id, kind)

    def get_delivery(self, owner_id: str, delivery_id: str) -> DeliveryRecord:
        """Return current delivery state."""
        return self.deliveries.get_delivery(owner_id, delivery_id)

    def delivery_view(self, record: DeliveryRecord) -> DeliveryView:
        """Return the public view for one delivery."""
        return self.deliveries.view(record)

    def get_delivery_view(self, owner_id: str, delivery_id: str) -> DeliveryView:
        """Return the public view for the current delivery state."""
        return self.delivery_view(self.get_delivery(owner_id, delivery_id))
