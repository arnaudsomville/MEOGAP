"""Typed public views built from deterministic demo records."""

from __future__ import annotations

from gateway.core.demo.constants import PROVENANCE_SYNTHETIC_DEMO
from gateway.core.demo.geometry import copy_geometry
from gateway.core.demo.models import AoiView, DeliveryView, FailureView, RequestView
from gateway.core.demo.records import AoiRecord, DeliveryRecord, RequestRecord


def aoi_view(record: AoiRecord) -> AoiView:
    """Return the public AOI view for one stored AOI."""
    return AoiView(
        aoi_id=record.aoi_id,
        name=record.name,
        description=record.description,
        geometry=copy_geometry(record.geometry),
        revision=record.revision,
        created_at=record.created_at.isoformat(),
        updated_at=record.updated_at.isoformat(),
    )


def request_view(record: RequestRecord) -> RequestView:
    """Return the public request view for one stored request."""
    failure = None
    if record.failure_stage is not None:
        failure = FailureView(stage=record.failure_stage, message=record.message)
    return RequestView(
        request_id=record.request_id,
        state=record.state,
        product_id=record.product_id,
        aoi_id=record.aoi_id,
        source_aoi_revision=record.aoi_revision,
        aoi_name=record.aoi_name,
        geometry_snapshot=copy_geometry(record.geometry_snapshot),
        start_month=record.start_month,
        end_month=record.end_month,
        requested_sources=list(record.requested_sources),
        requested_spatial_resolution_m=record.requested_spatial_resolution_m,
        temporal_frequency=record.temporal_frequency,
        provenance=PROVENANCE_SYNTHETIC_DEMO,
        estimated_credits=record.estimated_credits,
        actual_credits=record.actual_credits,
        result_id=record.result_id,
        message=record.message,
        failure=failure,
        created_at=record.created_at.isoformat(),
        updated_at=record.updated_at.isoformat(),
    )


def delivery_view(record: DeliveryRecord, download_url: str | None) -> DeliveryView:
    """Return the public delivery view for one stored delivery."""
    return DeliveryView(
        delivery_id=record.delivery_id,
        kind=record.kind,
        state=record.state,
        download_url=download_url,
        message=record.message,
        created_at=record.created_at.isoformat(),
        updated_at=record.updated_at.isoformat(),
    )
