"""Deterministic product descriptors and source-mission metadata."""

from __future__ import annotations

import copy

from fastapi import status
from meogap.scientific.products import (
    ProductAvailability,
    ProductCategory,
    ProductValidationStatus,
    SourceMission,
)

from gateway.core.demo.constants import PROVENANCE_SYNTHETIC_DEMO
from gateway.core.demo.errors import DemoError
from gateway.core.demo.models import (
    ProductListView,
    ProductMissionsView,
    ProductRequirementsView,
    ProductView,
    SourceMissionView,
)
from gateway.core.product_previews import build_product_preview

PRODUCT_COUNT = 4
SUPPORTED_SPATIAL_INPUTS = ['AOI']
SUPPORTED_SELECTION_GEOMETRIES = ['POINT', 'POLYGON', 'RESULT_EXTENT']
SUPPORTED_FREQUENCIES = ['monthly', 'semimonthly', 'weekly', 'three_day', 'two_day', 'daily']
MAX_PERIOD_MONTHS = 120

MISSION_METADATA: dict[SourceMission, dict[str, str]] = {
    SourceMission.SENTINEL: {
        'name': 'Sentinel',
        'provider': 'European Space Agency',
        'instrument': 'MSI',
        'native_resolution': '10 m',
        'temporal_resolution': '5 days',
        'availability': 'DEMO',
    },
    SourceMission.LANDSAT: {
        'name': 'Landsat',
        'provider': 'NASA / USGS',
        'instrument': 'OLI/TIRS',
        'native_resolution': '30 m',
        'temporal_resolution': '16 days',
        'availability': 'DEMO',
    },
    SourceMission.MODIS: {
        'name': 'MODIS',
        'provider': 'NASA',
        'instrument': 'MODIS',
        'native_resolution': '250 m',
        'temporal_resolution': '1 day',
        'availability': 'DEMO',
    },
    SourceMission.VIIRS: {
        'name': 'VIIRS',
        'provider': 'NOAA / NASA',
        'instrument': 'VIIRS',
        'native_resolution': '375 m',
        'temporal_resolution': '1 day',
        'availability': 'DEMO',
    },
    SourceMission.ECOSTRESS: {
        'name': 'ECOSTRESS',
        'provider': 'NASA',
        'instrument': 'ECOSTRESS',
        'native_resolution': '70 m',
        'temporal_resolution': 'irregular',
        'availability': 'DEMO',
    },
    SourceMission.GOES: {
        'name': 'GOES',
        'provider': 'NOAA',
        'instrument': 'ABI',
        'native_resolution': '2 km',
        'temporal_resolution': '10 minutes',
        'availability': 'DEMO',
    },
}

_PRODUCT_ROWS = (
    (
        'ndvi',
        'NDVI',
        'Synthetic demonstration Normalized Difference Vegetation Index descriptor.',
        'L1',
        ProductCategory.VEGETATION,
        '10 m',
        '5 days',
        'unitless',
        ['ndvi'],
        ['Red reflectance', 'Near-infrared reflectance', 'Quality mask'],
        (SourceMission.SENTINEL, SourceMission.LANDSAT, SourceMission.MODIS, SourceMission.VIIRS),
        [10, 20, 30],
    ),
    (
        'ndwi',
        'NDWI',
        'Synthetic demonstration Normalized Difference Water Index descriptor.',
        'L1',
        ProductCategory.WATER,
        '10 m',
        '5 days',
        'unitless',
        ['ndwi'],
        ['Green reflectance', 'Near-infrared reflectance', 'Quality mask'],
        (SourceMission.SENTINEL, SourceMission.LANDSAT, SourceMission.MODIS),
        [10, 20, 30],
    ),
    (
        'lst',
        'LST',
        'Synthetic demonstration Land Surface Temperature descriptor.',
        'L3',
        ProductCategory.LAND,
        '30 m',
        '5 days',
        'K',
        ['lst'],
        ['Thermal radiance', 'Emissivity estimate', 'Atmospheric inputs'],
        (
            SourceMission.LANDSAT,
            SourceMission.MODIS,
            SourceMission.VIIRS,
            SourceMission.ECOSTRESS,
            SourceMission.GOES,
        ),
        [30, 60, 100],
    ),
    (
        'ch4',
        'CH4',
        'Synthetic demonstration methane-emission proxy descriptor.',
        'L3',
        ProductCategory.ATMOSPHERE,
        '100 m',
        '10 days',
        'ppb',
        ['ch4'],
        ['Atmospheric spectral observations', 'Quality mask'],
        (SourceMission.SENTINEL, SourceMission.MODIS, SourceMission.VIIRS),
        [500, 1000, 2000],
    ),
)


def build_product_descriptors() -> list[ProductView]:
    """Build deterministic product descriptors without asserting availability.

    Returns
    -------
        list[ProductView]: product definitions.

    """
    return [
        ProductView(
            product_id=product_id,
            name=name,
            description=description,
            level=level,
            category=category.value,
            native_resolution=resolution,
            temporal_resolution=revisit,
            units=units,
            availability=ProductAvailability.DEMO.value,
            provenance=PROVENANCE_SYNTHETIC_DEMO,
            validation_status=ProductValidationStatus.NOT_VALIDATED.value,
            inputs=inputs,
            parameters=parameters,
            limitations=[
                'This is a deterministic synthetic M0 descriptor; no Earth observation data is acquired.',
                'The listed source missions are compatibility descriptors only and do not establish provenance.',
                'No scientific computation or validation is implemented for this product.',
            ],
            supported_sources=[source.value for source in supported_sources],
            supported_resolutions_m=supported_resolutions,
            supported_spatial_inputs=list(SUPPORTED_SPATIAL_INPUTS),
            supported_selection_geometries=list(SUPPORTED_SELECTION_GEOMETRIES),
            supported_frequencies=list(SUPPORTED_FREQUENCIES),
            max_period_months=MAX_PERIOD_MONTHS,
            documentation_status='PLACEHOLDER',
            documentation_url=None,
            preview=build_product_preview(product_id, name),
        )
        for (
            product_id,
            name,
            description,
            level,
            category,
            resolution,
            revisit,
            units,
            parameters,
            inputs,
            supported_sources,
            supported_resolutions,
        ) in _PRODUCT_ROWS
    ]


class CatalogueService:
    """Read-only product catalogue backed by deterministic descriptors."""

    def __init__(self) -> None:
        """Build the deterministic catalogue once."""
        self._products = {product.product_id: product for product in build_product_descriptors()}

    def list_products(self) -> ProductListView:
        """Return deterministic public product summaries."""
        return ProductListView(items=[copy.deepcopy(product) for product in self._products.values()])

    def get_product(self, product_id: str) -> ProductView:
        """Return one public demo product definition.

        Args:
        ----
            product_id(str): product identifier requested by the caller.

        Returns:
        -------
            ProductView: deterministic product definition.

        Raises:
        ------
            DemoError: when the product does not exist.

        """
        product = self._products.get(product_id)
        if product is None:
            raise DemoError(status.HTTP_404_NOT_FOUND, 'PRODUCT_NOT_FOUND', 'The requested product is not available.')
        return copy.deepcopy(product)

    def get_product_requirements(self, product_id: str) -> ProductRequirementsView:
        """Return public scientific input requirements for a demo product.

        Args:
        ----
            product_id(str): product identifier requested by the caller.

        Returns:
        -------
            ProductRequirementsView: deterministic input requirement information.

        """
        product = self.get_product(product_id)
        return ProductRequirementsView(
            product_id=product.product_id,
            inputs=product.inputs,
            limitations=product.limitations,
            note='Demo requirements only; this Gateway does not resolve real acquisitions.',
        )

    def list_product_missions(self, product_id: str) -> ProductMissionsView:
        """Return compatible source missions with their declared metadata.

        Args:
        ----
            product_id(str): product identifier requested by the caller.

        Returns:
        -------
            ProductMissionsView: product mission descriptors.

        """
        product = self.get_product(product_id)
        items: list[SourceMissionView] = []
        for source in product.supported_sources:
            metadata = MISSION_METADATA[SourceMission(source)]
            items.append(
                SourceMissionView(
                    source_id=source,
                    name=metadata['name'],
                    provider=metadata['provider'],
                    instrument=metadata['instrument'],
                    native_resolution=metadata['native_resolution'],
                    temporal_resolution=metadata['temporal_resolution'],
                    availability=metadata['availability'],
                )
            )
        return ProductMissionsView(product_id=product_id, items=items)
