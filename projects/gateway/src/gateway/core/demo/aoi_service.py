"""Owner-scoped saved AOI behaviour for the deterministic Gateway demo."""

from __future__ import annotations

from typing import Any

from fastapi import status

from gateway.core.demo.constants import DEMO_OWNER_ID
from gateway.core.demo.errors import DemoError
from gateway.core.demo.geometry import copy_geometry, geometry_area_km2, validate_geometry
from gateway.core.demo.records import AoiRecord
from gateway.core.demo.state import DemoState

Geometry = dict[str, Any]

_SEEDED_AOIS = (
    (
        'Toulouse study area',
        'Synthetic demo AOI around Toulouse, France.',
        [[1.38, 43.56], [1.49, 43.56], [1.49, 43.66], [1.38, 43.66], [1.38, 43.56]],
    ),
    (
        'Guanacaste study area',
        'Synthetic demo AOI in Guanacaste, Costa Rica.',
        [[-85.0, 10.35], [-84.82, 10.35], [-84.82, 10.5], [-85.0, 10.5], [-85.0, 10.35]],
    ),
    (
        'Cajamarca study area',
        'Synthetic demo AOI near Cajamarca, Peru.',
        [[-78.62, -7.2], [-78.45, -7.2], [-78.45, -7.05], [-78.62, -7.05], [-78.62, -7.2]],
    ),
)


class AoiService:
    """Create, read, update and delete deterministic owner-scoped AOIs."""

    def __init__(self, state: DemoState) -> None:
        """Attach the service to shared demo state."""
        self.state = state

    def list_aois(self, owner_id: str) -> list[AoiRecord]:
        """Return AOIs owned by a caller ordered by latest update."""
        with self.state.lock:
            records = [record for record in self.state.aois.values() if record.owner_id == owner_id]
            return sorted(records, key=lambda record: record.updated_at, reverse=True)

    def get_aoi(self, owner_id: str, aoi_id: str) -> AoiRecord:
        """Return one AOI only when it belongs to the caller."""
        with self.state.lock:
            record = self.state.aois.get(aoi_id)
            if record is None or record.owner_id != owner_id:
                raise DemoError(status.HTTP_404_NOT_FOUND, 'AOI_NOT_FOUND', 'The requested AOI was not found.')
            return record

    def create_aoi(
        self,
        owner_id: str,
        name: str,
        description: str | None,
        geometry: Geometry,
        *,
        enforce_area_limit: bool = True,
    ) -> AoiRecord:
        """Persist a validated AOI owned by the caller."""
        validated = validate_geometry(geometry)
        if enforce_area_limit:
            self._validate_area(validated)
        with self.state.lock:
            self.state.aoi_sequence += 1
            now = self.state.clock()
            record = AoiRecord(
                aoi_id=f'aoi-{self.state.aoi_sequence}',
                owner_id=owner_id,
                name=name.strip(),
                description=description,
                geometry=validated,
                revision=1,
                created_at=now,
                updated_at=now,
            )
            self.state.aois[record.aoi_id] = record
            return record

    def update_aoi(
        self,
        owner_id: str,
        aoi_id: str,
        name: str | None,
        description: str | None,
        *,
        description_provided: bool,
        geometry: Geometry | None = None,
    ) -> AoiRecord:
        """Update mutable AOI fields and increment its revision."""
        validated = None
        if geometry is not None:
            validated = validate_geometry(geometry)
            self._validate_area(validated)
        with self.state.lock:
            record = self.get_aoi(owner_id, aoi_id)
            if name is not None:
                record.name = name.strip()
            if description_provided:
                record.description = description
            if validated is not None:
                record.geometry = validated
            record.revision += 1
            record.updated_at = self.state.clock()
            return record

    def delete_aoi(self, owner_id: str, aoi_id: str) -> None:
        """Delete one owner-scoped AOI without changing request snapshots."""
        with self.state.lock:
            self.get_aoi(owner_id, aoi_id)
            del self.state.aois[aoi_id]

    def seed(self) -> None:
        """Seed the three documented geographic demonstration areas."""
        for name, description, ring in _SEEDED_AOIS:
            self.create_aoi(
                DEMO_OWNER_ID,
                name,
                description,
                {'type': 'Polygon', 'coordinates': [ring]},
                enforce_area_limit=False,
            )

    def _validate_area(self, geometry: Geometry) -> None:
        """Reject an AOI whose approximate area exceeds the configured limit."""
        area_km2 = geometry_area_km2(geometry)
        if area_km2 > self.state.settings.max_aoi_area_km2:
            raise DemoError(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                'AOI_AREA_EXCEEDED',
                f'An AOI cannot exceed {self.state.settings.max_aoi_area_km2:g} km².',
            )

    def snapshot(self, owner_id: str, aoi_id: str) -> tuple[AoiRecord, Geometry]:
        """Return an AOI and an isolated geometry snapshot for a request."""
        with self.state.lock:
            aoi = self.get_aoi(owner_id, aoi_id)
            return aoi, copy_geometry(aoi.geometry)
