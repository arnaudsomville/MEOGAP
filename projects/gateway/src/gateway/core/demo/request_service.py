"""Analysis-request lifecycle for the deterministic M0 Gateway demo.

The M0 decision is an asynchronous but simple lifecycle:

``POST /requests -> queued -> processing -> succeeded``

There is no manual proposal-confirmation gate. Time-based transitions are
evaluated whenever the authoritative REST state is read, so REST remains the
source of truth after a page reload or reconnection.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import status
from meogap.scientific.products import SourceMission

from gateway.core.demo.constants import (
    FAILURE_CREDITS_UNAVAILABLE,
    FAILURE_INSUFFICIENT_CREDITS,
    FAILURE_PROCESSING,
    REQUEST_CANCELLABLE_STATES,
    REQUEST_CANCELLED,
    REQUEST_FAILED,
    REQUEST_PROCESSING,
    REQUEST_QUEUED,
    REQUEST_SUCCEEDED,
)
from gateway.core.demo.errors import DemoError
from gateway.core.demo.geometry import copy_geometry
from gateway.core.demo.models import CostEstimate, ProductView, RequestView
from gateway.core.demo.periods import month_sequence, validate_period
from gateway.core.demo.records import RequestRecord, ResultRecord
from gateway.core.demo.serialization import request_view
from gateway.core.demo.state import DemoState


class RequestService:
    """Create, read and transition deterministic analysis requests."""

    def __init__(self, state: DemoState) -> None:
        """Attach the service to shared demo state."""
        self.state = state

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
        """Persist a queued request with an immutable AOI geometry snapshot."""
        product = self.state.catalogue.get_product(product_id)
        requested_sources = self._validate_constraints(
            product,
            start_month,
            end_month,
            spatial_resolution_m,
            sources,
            temporal_frequency,
        )
        with self.state.lock:
            aoi = self.state.aois.get(aoi_id)
            if aoi is None or aoi.owner_id != owner_id:
                raise DemoError(status.HTTP_404_NOT_FOUND, 'AOI_NOT_FOUND', 'The requested AOI was not found.')
            self.state.request_sequence += 1
            now = self.state.clock()
            record = RequestRecord(
                request_id=f'request-{self.state.request_sequence}',
                owner_id=owner_id,
                product_id=product_id,
                aoi_id=aoi.aoi_id,
                aoi_revision=aoi.revision,
                aoi_name=aoi.name,
                geometry_snapshot=copy_geometry(aoi.geometry),
                start_month=start_month,
                end_month=end_month,
                state=REQUEST_QUEUED,
                created_at=now,
                updated_at=now,
                estimated_credits=self.state.settings.request_cost,
                requested_sources=requested_sources,
                requested_spatial_resolution_m=spatial_resolution_m,
                temporal_frequency=temporal_frequency,
                message='Request queued for deterministic demo processing.',
            )
            self.state.requests[record.request_id] = record
            return record

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
        product = self.state.catalogue.get_product(product_id)
        self._validate_constraints(
            product,
            start_month,
            end_month,
            spatial_resolution_m,
            sources,
            temporal_frequency,
        )
        with self.state.lock:
            aoi = self.state.aois.get(aoi_id)
            if aoi is None or aoi.owner_id != owner_id:
                raise DemoError(status.HTTP_404_NOT_FOUND, 'AOI_NOT_FOUND', 'The requested AOI was not found.')
            estimated_cost = self.state.settings.request_cost
            if self.state.settings.failure_mode == FAILURE_CREDITS_UNAVAILABLE:
                balance_available = False
                balance = None
            else:
                balance_available = True
                balance = self.state.balances.setdefault(owner_id, self.state.settings.starting_credits)
            if not balance_available:
                admission = 'UNAVAILABLE'
            elif balance is not None and balance >= estimated_cost:
                admission = 'ADMITTED'
            else:
                admission = 'INSUFFICIENT_CREDITS'
            return CostEstimate(
                product_id=product_id,
                aoi_id=aoi_id,
                start_month=start_month,
                end_month=end_month,
                feasible=admission == 'ADMITTED',
                estimated_credits=estimated_cost,
                currency='credits',
                balance=balance,
                balance_available=balance_available,
                admission=admission,
                conditions=['Deterministic M0 demo estimate; submission does not require confirmation.'],
                limitations=[
                    'No real EO acquisition, processing, or scientific validation is performed.',
                    'The estimate is not a financial commitment.',
                ],
            )

    def list_requests(self, owner_id: str) -> list[RequestRecord]:
        """Return current owner-scoped request state after applying transitions."""
        with self.state.lock:
            records = [record for record in self.state.requests.values() if record.owner_id == owner_id]
            for record in records:
                self.advance(record)
            return sorted(records, key=lambda record: record.created_at, reverse=True)

    def get_request(self, owner_id: str, request_id: str) -> RequestRecord:
        """Return current request state after applying asynchronous transitions."""
        with self.state.lock:
            record = self.require_request(owner_id, request_id)
            self.advance(record)
            return record

    def cancel_request(self, owner_id: str, request_id: str) -> RequestRecord:
        """Cancel a queued or processing request."""
        with self.state.lock:
            record = self.require_request(owner_id, request_id)
            self.advance(record)
            if record.state not in REQUEST_CANCELLABLE_STATES:
                raise DemoError(
                    status.HTTP_409_CONFLICT,
                    'INVALID_STATE',
                    'Only a queued or processing request can be cancelled.',
                )
            record.state = REQUEST_CANCELLED
            record.updated_at = self.state.clock()
            record.message = 'Request cancelled. Demo credit refunds are not modelled in M0.'
            return record

    def get_balance(self, owner_id: str) -> int:
        """Return current demo credits or a simulated availability failure."""
        if self.state.settings.failure_mode == FAILURE_CREDITS_UNAVAILABLE:
            raise DemoError(
                status.HTTP_503_SERVICE_UNAVAILABLE, 'CREDITS_UNAVAILABLE', 'The demo credit balance is unavailable.'
            )
        with self.state.lock:
            return self.state.balances.setdefault(owner_id, self.state.settings.starting_credits)

    def view(self, record: RequestRecord) -> RequestView:
        """Return one public request view."""
        return request_view(record)

    def require_request(self, owner_id: str, request_id: str) -> RequestRecord:
        """Return an owner-scoped request or a caller-safe not-found error."""
        record = self.state.requests.get(request_id)
        if record is None or record.owner_id != owner_id:
            raise DemoError(
                status.HTTP_404_NOT_FOUND, 'REQUEST_NOT_FOUND', 'The requested analysis request was not found.'
            )
        return record

    def advance(self, record: RequestRecord) -> None:
        """Apply elapsed-time transitions while holding the store lock.

        Zero-delay settings intentionally complete all transitions in one read.
        A loop keeps that behaviour deterministic while still supporting
        observable intermediate states with non-zero delays.
        """
        now = self.state.clock()
        while True:
            if record.state == REQUEST_QUEUED and now >= record.created_at + timedelta(
                seconds=self.state.settings.queue_delay_seconds
            ):
                if not self._admit(record):
                    return
                record.state = REQUEST_PROCESSING
                record.processing_started_at = record.created_at + timedelta(
                    seconds=self.state.settings.queue_delay_seconds
                )
                record.updated_at = now
                record.message = 'Synthetic demo processing is in progress.'
                continue
            if (
                record.state == REQUEST_PROCESSING
                and record.processing_started_at is not None
                and now
                >= record.processing_started_at + timedelta(seconds=self.state.settings.processing_delay_seconds)
            ):
                self._succeed(record, now)
                return
            return

    def _admit(self, record: RequestRecord) -> bool:
        """Decide whether a queued request may enter processing."""
        cost = self.state.settings.request_cost
        if self.state.settings.failure_mode == FAILURE_INSUFFICIENT_CREDITS:
            self._fail(record, 'admission', 'The deterministic demo credit admission failed.')
            return False
        balance = self.state.balances.setdefault(record.owner_id, self.state.settings.starting_credits)
        if balance < cost:
            self._fail(record, 'admission', 'The current demo credit balance cannot admit this request.')
            return False
        return True

    def _succeed(self, record: RequestRecord, now: datetime) -> None:
        """Create the demo result and mark the request succeeded."""
        if self.state.settings.failure_mode == FAILURE_PROCESSING:
            self._fail(record, 'processing', 'The deterministic demo processing stage failed.')
            return
        self.state.result_sequence += 1
        result = ResultRecord(
            result_id=f'result-{self.state.result_sequence}',
            request_id=record.request_id,
            owner_id=record.owner_id,
            product_id=record.product_id,
            aoi_name=record.aoi_name,
            geometry_snapshot=copy_geometry(record.geometry_snapshot),
            start_month=record.start_month,
            end_month=record.end_month,
            created_at=now,
        )
        self.state.results[result.result_id] = result
        record.state = REQUEST_SUCCEEDED
        record.updated_at = now
        record.result_id = result.result_id
        record.actual_credits = self.state.settings.request_cost
        balance = self.state.balances.setdefault(record.owner_id, self.state.settings.starting_credits)
        self.state.balances[record.owner_id] = max(0, balance - record.actual_credits)
        record.message = 'Synthetic demo result available. It is not a computed scientific product.'

    def _fail(self, record: RequestRecord, stage: str, message: str) -> None:
        """Mark a request failed with an explicit stage."""
        record.state = REQUEST_FAILED
        record.updated_at = self.state.clock()
        record.failure_stage = stage
        record.message = message

    def _validate_constraints(  # noqa: PLR0917
        self,
        product: ProductView,
        start_month: str,
        end_month: str,
        spatial_resolution_m: int | None,
        sources: list[SourceMission] | None,
        temporal_frequency: str | None,
    ) -> tuple[str, ...]:
        """Validate request constraints declared by one product descriptor."""
        validate_period(start_month, end_month)
        months = len(month_sequence(start_month, end_month))
        if months > product.max_period_months:
            raise DemoError(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                'UNSUPPORTED_PERIOD',
                f'The product supports at most {product.max_period_months} months per request.',
            )
        if spatial_resolution_m is not None and (
            spatial_resolution_m < 1 or spatial_resolution_m not in product.supported_resolutions_m
        ):
            raise DemoError(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                'INVALID_RESOLUTION',
                'Spatial resolution must be one of the product-declared resolutions in metres.',
            )
        if temporal_frequency is not None and temporal_frequency not in product.supported_frequencies:
            raise DemoError(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                'UNSUPPORTED_FREQUENCY',
                'The temporal frequency must be one declared by the product.',
            )
        requested_sources = tuple(source.value for source in sources or ())
        unsupported = sorted(set(requested_sources) - set(product.supported_sources))
        if unsupported:
            raise DemoError(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                'UNSUPPORTED_SOURCE',
                f'The product does not declare these source missions: {", ".join(unsupported)}.',
            )
        return requested_sources
