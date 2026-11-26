"""Asynchronous delivery behaviour for deterministic demo results."""

from __future__ import annotations

from datetime import timedelta

from fastapi import status

from gateway.core.demo.artifacts import artifact_data_url
from gateway.core.demo.constants import (
    DELIVERY_FAILED,
    DELIVERY_KINDS,
    DELIVERY_PREPARING,
    DELIVERY_READY,
    FAILURE_DELIVERY,
)
from gateway.core.demo.errors import DemoError
from gateway.core.demo.models import DeliveryView
from gateway.core.demo.records import DeliveryRecord
from gateway.core.demo.serialization import delivery_view
from gateway.core.demo.state import DemoState


class DeliveryService:
    """Create and advance deterministic delivery resources."""

    def __init__(self, state: DemoState) -> None:
        """Attach the service to shared demo state."""
        self.state = state

    def create_delivery(
        self,
        owner_id: str,
        result_id: str,
        kind: str = 'final_product',
    ) -> DeliveryRecord:
        """Create an asynchronous delivery for a completed demo result."""
        if kind not in DELIVERY_KINDS:
            raise DemoError(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                'INVALID_DELIVERY_KIND',
                'Deliveries must request final_product or dependency_archive.',
            )
        with self.state.lock:
            result = self.state.results.get(result_id)
            if result is None or result.owner_id != owner_id:
                raise DemoError(status.HTTP_404_NOT_FOUND, 'RESULT_NOT_FOUND', 'The requested result was not found.')
            self.state.delivery_sequence += 1
            now = self.state.clock()
            record = DeliveryRecord(
                delivery_id=f'delivery-{self.state.delivery_sequence}',
                result_id=result_id,
                owner_id=owner_id,
                kind=kind,
                state=DELIVERY_PREPARING,
                created_at=now,
                updated_at=now,
                ready_at=now + timedelta(seconds=self.state.settings.delivery_delay_seconds),
            )
            self.state.deliveries[record.delivery_id] = record
            return record

    def get_delivery(self, owner_id: str, delivery_id: str) -> DeliveryRecord:
        """Return current delivery state after applying the deterministic transition."""
        with self.state.lock:
            record = self.state.deliveries.get(delivery_id)
            if record is None or record.owner_id != owner_id:
                raise DemoError(
                    status.HTTP_404_NOT_FOUND, 'DELIVERY_NOT_FOUND', 'The requested delivery was not found.'
                )
            if record.state == DELIVERY_PREPARING and self.state.clock() >= record.ready_at:
                record.updated_at = self.state.clock()
                if self.state.settings.failure_mode == FAILURE_DELIVERY:
                    record.state = DELIVERY_FAILED
                    record.message = 'The deterministic demo delivery failed.'
                else:
                    record.state = DELIVERY_READY
                    record.message = 'Synthetic demo artifact ready for download.'
            return record

    def view(self, record: DeliveryRecord) -> DeliveryView:
        """Return one public delivery view and inline URL when ready."""
        download_url = self._download_url(record) if record.state == DELIVERY_READY else None
        return delivery_view(record, download_url)

    def _download_url(self, record: DeliveryRecord) -> str:
        """Build the synthetic GeoJSON download URL for one ready delivery."""
        result = self.state.results[record.result_id]
        product = self.state.catalogue.get_product(result.product_id)
        return artifact_data_url(result, product, record.kind)
