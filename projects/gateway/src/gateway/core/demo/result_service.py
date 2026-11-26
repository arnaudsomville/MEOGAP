"""Result metadata, map, lineage and temporal-series behaviour."""

from __future__ import annotations

import hashlib
import math

from fastapi import status

from gateway.core.assets import NdviAsset, ndvi_asset_for_aoi
from gateway.core.demo.artifacts import placeholder_map_url
from gateway.core.demo.constants import (
    FAILURE_RESULT_UNAVAILABLE,
    PROVENANCE_SYNTHETIC_DEMO,
    QUALITY_PARTIAL,
    QUALITY_UNKNOWN,
    QUALITY_VALID,
    RESULT_VERSION,
    SERIES_MASKED,
    SERIES_MASKED_INDEX,
    SERIES_MASKED_INTERVAL,
    SERIES_MISSING,
    SERIES_MISSING_INDEX,
    SERIES_MISSING_INTERVAL,
    SERIES_POINT_AGGREGATION,
    SERIES_VALID,
    SERIES_ZERO_INDEX,
    SERIES_ZERO_INTERVAL,
    SERIES_ZONAL_AGGREGATION,
    SUPPORTED_CRS,
)
from gateway.core.demo.errors import DemoError
from gateway.core.demo.geometry import (
    Geometry,
    copy_geometry,
    geometry_area_km2,
    geometry_bounds,
    geometry_bounds_tuple,
    parse_wkt_geometry,
    point_in_geometry,
)
from gateway.core.demo.models import (
    LegacySeriesView,
    LineageView,
    ProductView,
    ResultDetailView,
    ResultMapFrameView,
    ResultMapView,
    SeriesParameterView,
    SeriesPointView,
    SeriesView,
)
from gateway.core.demo.periods import evenly_spaced_months, month_end, month_sequence, validate_period
from gateway.core.demo.records import RequestRecord, ResultRecord
from gateway.core.demo.state import DemoState


def _parameter_metadata(product: ProductView) -> list[SeriesParameterView]:
    """Return the available series parameters declared by one product."""
    parameters = product.parameters or ['value']
    return [
        SeriesParameterView(name=parameter, label=parameter.upper(), units=product.units) for parameter in parameters
    ]


class ResultService:
    """Serve deterministic result representations without inventing provenance."""

    def __init__(self, state: DemoState) -> None:
        """Attach the service to shared demo state."""
        self.state = state

    def get_result_map(self, owner_id: str, result_id: str, frame_count: int | None = None) -> ResultMapView:
        """Return a labelled synthetic representation for one completed result."""
        with self.state.lock:
            result = self.require_result(owner_id, result_id)
            if self.state.settings.failure_mode == FAILURE_RESULT_UNAVAILABLE:
                raise DemoError(
                    status.HTTP_404_NOT_FOUND, 'RESULT_UNAVAILABLE', 'The demo result representation is unavailable.'
                )
            product = self.state.catalogue.get_product(result.product_id)
            request = self._request_for(result)
            asset = ndvi_asset_for_aoi(request.aoi_id) if result.product_id == 'ndvi' else None
            if asset is not None:
                return self._ndvi_map(result, product, request, asset, frame_count)
            return self._placeholder_map(result, product)

    def _ndvi_map(
        self,
        result: ResultRecord,
        product: ProductView,
        request: RequestRecord,
        asset: NdviAsset,
        frame_count: int | None,
    ) -> ResultMapView:
        """Build a georeferenced synthetic NDVI-like map descriptor."""
        mock_months = (
            month_sequence(request.start_month, request.end_month)
            if frame_count is None
            else evenly_spaced_months(request.start_month, request.end_month, frame_count)
        )
        frames = []
        for index, month in enumerate(mock_months):
            visual = asset.frames[index % len(asset.frames)]
            frames.append(
                ResultMapFrameView(
                    frame_id=f'{result.result_id}-frame-{index + 1}',
                    url=visual.url,
                    period_start=f'{month}-01',
                    period_end=month_end(month),
                    label=month,
                    visual_period_start=visual.period_start,
                    visual_period_end=visual.period_end,
                    is_reused_visual=True,
                )
            )
        return ResultMapView(
            url=frames[0].url if frames else None,
            bounds=asset.bounds,
            kind='SYNTHETIC_DEMO_NDVI',
            provenance=PROVENANCE_SYNTHETIC_DEMO,
            note=(
                'Synthetic, georeferenced NDVI-like demonstration raster bundled with the Gateway. '
                'Frame dates are mock request-period dates; the visual is reused and is not recomputed '
                'from Earth observation data.'
            ),
            result_id=result.result_id,
            request_id=result.request_id,
            product_id=result.product_id,
            result_version=RESULT_VERSION,
            units=product.units,
            validation_status=product.validation_status,
            quality_status=QUALITY_UNKNOWN,
            quality_note=(
                'No observation quality, cloud-cover or masking statistic is computed for this '
                'synthetic demonstration raster.'
            ),
            legend=asset.legend,
            geotiff_url=asset.geotiff_url,
            frames=frames,
            is_demo=True,
        )

    def _placeholder_map(self, result: ResultRecord, product: ProductView) -> ResultMapView:
        """Build an explicit synthetic placeholder for non-seeded results."""
        return ResultMapView(
            url=placeholder_map_url(result.product_id),
            bounds=geometry_bounds(result.geometry_snapshot),
            kind='SYNTHETIC_DEMO_PLACEHOLDER',
            provenance=PROVENANCE_SYNTHETIC_DEMO,
            note='Synthetic display placeholder. This is not a computed scientific product.',
            result_id=result.result_id,
            request_id=result.request_id,
            product_id=result.product_id,
            result_version=RESULT_VERSION,
            units=product.units,
            validation_status=product.validation_status,
            quality_status=QUALITY_UNKNOWN,
            quality_note='No observation quality is computed for this synthetic demonstration result.',
            legend=None,
            geotiff_url=None,
            frames=[],
            is_demo=True,
        )

    def get_result(self, owner_id: str, result_id: str) -> ResultDetailView:
        """Return explicit result metadata without inventing provenance."""
        with self.state.lock:
            result = self.require_result(owner_id, result_id)
            product = self.state.catalogue.get_product(result.product_id)
            return ResultDetailView(
                result_id=result.result_id,
                request_id=result.request_id,
                product_id=result.product_id,
                product_name=product.name,
                result_version=RESULT_VERSION,
                aoi_name=result.aoi_name,
                geometry_snapshot=copy_geometry(result.geometry_snapshot),
                start_month=result.start_month,
                end_month=result.end_month,
                units=product.units,
                temporal_frequency=self._request_for(result).temporal_frequency,
                provenance=PROVENANCE_SYNTHETIC_DEMO,
                available_parameters=_parameter_metadata(product),
                validation_status=product.validation_status,
                quality_status=QUALITY_UNKNOWN,
                quality_note='No observation quality is computed for this synthetic demonstration result.',
                provenance_note=(
                    'SYNTHETIC_DEMO: request metadata and bundled synthetic display assets only; '
                    'no Sentinel, Landsat or other Earth observation mission data was acquired or used.'
                ),
                is_demo=True,
            )

    def get_result_series(self, owner_id: str, result_id: str) -> LegacySeriesView:
        """Return an explicit placeholder instead of fabricated analytical values."""
        with self.state.lock:
            result = self.require_result(owner_id, result_id)
            return LegacySeriesView(
                result_id=result.result_id,
                points=[],
                note='No analytical series is available in the deterministic M0 demo.',
            )

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
        """Return a deterministic demo series for one bounded selection."""
        with self.state.lock:
            result = self.require_result(owner_id, result_id)
            selection_type, selection_geometry = parse_wkt_geometry(geometry_wkt, crs)
            self._validate_selection(result, selection_type, selection_geometry)
            validate_period(start_month, end_month)
            requested_months = month_sequence(start_month, end_month)
            allowed_months = set(month_sequence(result.start_month, result.end_month))
            if not set(requested_months).issubset(allowed_months):
                raise DemoError(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    'UNSUPPORTED_PERIOD',
                    'The requested period must stay within the original result period.',
                )
            product = self.state.catalogue.get_product(result.product_id)
            available_parameters = _parameter_metadata(product)
            available_names = [parameter.name for parameter in available_parameters]
            selected_parameters = list(parameters or available_names)
            unknown = sorted(set(selected_parameters) - set(available_names))
            if unknown:
                raise DemoError(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    'UNSUPPORTED_PARAMETER',
                    f'The result does not expose these series parameters: {", ".join(unknown)}.',
                )
            points = [
                self._series_point(result, selection_type, geometry_wkt, month, index, parameter)
                for index, month in enumerate(requested_months)
                for parameter in selected_parameters
            ]
            available = sum(1 for point in points if point.state == SERIES_VALID)
            quality = QUALITY_VALID if available == len(points) else QUALITY_PARTIAL
            if available == 0:
                quality = QUALITY_UNKNOWN
            return SeriesView(
                result_id=result.result_id,
                product_id=result.product_id,
                geometry_wkt=geometry_wkt,
                crs=SUPPORTED_CRS,
                selection_type=selection_type,
                aggregation_method=SERIES_POINT_AGGREGATION if selection_type == 'Point' else SERIES_ZONAL_AGGREGATION,
                selection_area_km2=0.0 if selection_type == 'Point' else geometry_area_km2(selection_geometry),
                units=product.units,
                available_parameters=available_parameters,
                selected_parameters=selected_parameters,
                quality_status=quality,
                quality_note='Synthetic demo series; missing and masked values are not zeros.',
                coverage=self._average_coverage(points),
                provenance=PROVENANCE_SYNTHETIC_DEMO,
                is_demo=True,
                note='Synthetic demonstration values. They are not Earth observation measurements.',
                points=points,
            )

    def get_result_lineage(self, owner_id: str, result_id: str) -> LineageView:
        """Return the minimum reliable provenance available for a demo result."""
        with self.state.lock:
            result = self.require_result(owner_id, result_id)
            request = self._request_for(result)
            return LineageView(
                result_id=result.result_id,
                request_id=request.request_id,
                product_id=result.product_id,
                aoi_name=result.aoi_name,
                geometry_snapshot=copy_geometry(result.geometry_snapshot),
                provenance=PROVENANCE_SYNTHETIC_DEMO,
                note='Synthetic demo lineage contains request metadata only; no real source assets were used.',
            )

    def require_result(self, owner_id: str, result_id: str) -> ResultRecord:
        """Return an owner-scoped result or a caller-safe not-found error."""
        result = self.state.results.get(result_id)
        if result is None or result.owner_id != owner_id:
            raise DemoError(status.HTTP_404_NOT_FOUND, 'RESULT_NOT_FOUND', 'The requested result was not found.')
        return result

    def _request_for(self, result: ResultRecord) -> RequestRecord:
        """Return the immutable request that produced a result."""
        request = self.state.requests.get(result.request_id)
        if request is None:
            raise DemoError(status.HTTP_404_NOT_FOUND, 'REQUEST_NOT_FOUND', 'The originating request was not found.')
        return request

    def _validate_selection(
        self,
        result: ResultRecord,
        selection_type: str,
        selection_geometry: Geometry,
    ) -> None:
        """Validate that one selection stays inside the displayed result."""
        result_south, result_west, result_north, result_east = geometry_bounds_tuple(result.geometry_snapshot)
        if selection_type == 'Point':
            longitude, latitude = selection_geometry['coordinates']
            inside_bounds = result_west <= longitude <= result_east and result_south <= latitude <= result_north
            if not inside_bounds or not point_in_geometry(longitude, latitude, result.geometry_snapshot):
                raise DemoError(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    'SELECTION_OUTSIDE_RESULT',
                    'The selected point must lie inside the displayed result.',
                )
            return
        south, west, north, east = geometry_bounds_tuple(selection_geometry)
        if west < result_west or east > result_east or south < result_south or north > result_north:
            raise DemoError(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                'SELECTION_OUTSIDE_RESULT',
                'The selected polygon must stay inside the displayed result extent.',
            )
        ring = selection_geometry['coordinates'][0]
        centroid_longitude = sum(position[0] for position in ring[:-1]) / (len(ring) - 1)
        centroid_latitude = sum(position[1] for position in ring[:-1]) / (len(ring) - 1)
        if not point_in_geometry(centroid_longitude, centroid_latitude, result.geometry_snapshot):
            raise DemoError(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                'SELECTION_OUTSIDE_RESULT',
                'The selected polygon must lie inside the displayed result geometry.',
            )
        is_result_extent = (south, west, north, east) == (result_south, result_west, result_north, result_east)
        if not is_result_extent and geometry_area_km2(selection_geometry) > self.state.settings.max_selection_area_km2:
            raise DemoError(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                'SELECTION_TOO_LARGE',
                f'The selected polygon exceeds {self.state.settings.max_selection_area_km2:g} km².',
            )

    def _series_point(  # noqa: PLR0917
        self,
        result: ResultRecord,
        selection_type: str,
        geometry_wkt: str,
        month: str,
        index: int,
        parameter: str,
    ) -> SeriesPointView:
        """Build one deterministic demo series point."""
        digest = hashlib.sha256(f'{result.result_id}:{geometry_wkt}:{month}:{parameter}'.encode()).hexdigest()
        seed = int(digest[:8], 16) / 0xFFFFFFFF
        period_start = f'{month}-01'
        period_end = month_end(month)
        if index % SERIES_MASKED_INTERVAL == SERIES_MASKED_INDEX:
            state = SERIES_MASKED
            value = None
            quality_status = QUALITY_PARTIAL
            note = 'Synthetic demo observation masked by quality filtering.'
        elif index % SERIES_MISSING_INTERVAL == SERIES_MISSING_INDEX:
            state = SERIES_MISSING
            value = None
            quality_status = QUALITY_UNKNOWN
            note = 'Synthetic demo period has no observation. This is not a zero.'
        else:
            state = SERIES_VALID
            baseline = 0.25 + 0.35 * seed
            seasonal = 0.18 * math.sin((index + seed) * math.pi / 3)
            value = round(baseline + seasonal, 3)
            quality_status = QUALITY_VALID
            note = None
            if index % SERIES_ZERO_INTERVAL == SERIES_ZERO_INDEX:
                value = 0.0
                note = 'Synthetic demo measured zero, distinct from a missing observation.'
        coverage = (
            None if selection_type == 'Point' else round(0.55 + 0.4 * abs(math.sin((index + seed) * math.pi / 4)), 3)
        )
        if state == SERIES_MASKED:
            coverage = round((coverage or 0.6) * 0.35, 3)
        return SeriesPointView(
            parameter=parameter,
            period_start=period_start,
            period_end=period_end,
            value=value,
            unit=self.state.catalogue.get_product(result.product_id).units,
            state=state,
            quality_status=quality_status,
            coverage=coverage,
            note=note,
        )

    @staticmethod
    def _average_coverage(points: list[SeriesPointView]) -> float | None:
        """Return the average available coverage across series points."""
        coverages = [float(point.coverage) for point in points if point.coverage is not None]
        if not coverages:
            return None
        return round(sum(coverages) / len(coverages), 3)
