"""Stable scientific product vocabulary shared by MEOGAP services.

These enumerations describe controlled values exposed by the product catalogue.
They do not assert that any source mission, acquisition, or product is actually
implemented or scientifically validated.
"""

from enum import StrEnum


class SourceMission(StrEnum):
    """Source mission labels a product may declare as a requestable input."""

    GOES = 'GOES'
    SENTINEL = 'Sentinel'
    LANDSAT = 'Landsat'
    ECOSTRESS = 'ECOSTRESS'
    MODIS = 'MODIS'
    VIIRS = 'VIIRS'


class ProductCategory(StrEnum):
    """Broad scientific domain used to group products."""

    VEGETATION = 'Vegetation'
    WATER = 'Water'
    LAND = 'Land'
    ATMOSPHERE = 'Atmosphere'


class ProductAvailability(StrEnum):
    """Lifecycle availability of a product definition."""

    DEMO = 'DEMO'
    AVAILABLE = 'AVAILABLE'
    UNAVAILABLE = 'UNAVAILABLE'


class ProductValidationStatus(StrEnum):
    """Scientific validation state explicitly declared by the product owner."""

    NOT_VALIDATED = 'NOT_VALIDATED'
    VALIDATED = 'VALIDATED'
