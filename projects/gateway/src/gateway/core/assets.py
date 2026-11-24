"""Static demonstration products bundled with the public Gateway.

The PNG files are display frames generated from georeferenced NDVI GeoTIFFs.
The GeoTIFFs remain the georeferenced source representation; PNG frames are
placed on the map using the explicit WGS 84 bounds below.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

ASSET_ROOT = Path(__file__).resolve().parents[1] / 'assets' / 'demo' / 'ndvi'
GEOTIFF_ROOT = ASSET_ROOT / 'geotiff'
NDVI_LEGEND: dict[str, Any] = {
    'title': 'NDVI',
    'units': 'unitless',
    'min': -0.2,
    'max': 0.9,
    'stops': [
        {'value': -0.2, 'color': '#744d2e'},
        {'value': 0.0, 'color': '#c9a66b'},
        {'value': 0.2, 'color': '#f2e6b3'},
        {'value': 0.4, 'color': '#b7d98b'},
        {'value': 0.6, 'color': '#4c9b3f'},
        {'value': 0.8, 'color': '#1f6b2a'},
        {'value': 0.9, 'color': '#0c461c'},
    ],
}
DEMO_NDVI_ASSETS: dict[str, dict[str, Any]] = {
    'aoi-1': {
        'geotiff': 'toulouse-ndvi-2025.tif',
        'bounds': [[43.5598471, 1.3799919], [43.6600991, 1.4901254]],
        'label': 'Toulouse study area',
        'frames': [
            {
                'png': 'toulouse-ndvi-2025-06-07.png',
                'period_start': '2025-06-01',
                'period_end': '2025-07-31',
            },
            {
                'png': 'toulouse-ndvi-2025-07-08.png',
                'period_start': '2025-07-01',
                'period_end': '2025-08-31',
            },
            {
                'png': 'toulouse-ndvi-2025-08-09.png',
                'period_start': '2025-08-01',
                'period_end': '2025-09-30',
            },
        ],
    },
    'aoi-2': {
        'geotiff': 'guanacaste-ndvi-2025.tif',
        'bounds': [[10.3498497, -85.0000295], [10.500048, -84.8198274]],
        'label': 'Guanacaste study area',
        'frames': [
            {
                'png': 'guanacaste-ndvi-2025-06-07.png',
                'period_start': '2025-06-01',
                'period_end': '2025-07-31',
            },
            {
                'png': 'guanacaste-ndvi-2025-07-08.png',
                'period_start': '2025-07-01',
                'period_end': '2025-08-31',
            },
            {
                'png': 'guanacaste-ndvi-2025-08-09.png',
                'period_start': '2025-08-01',
                'period_end': '2025-09-30',
            },
        ],
    },
    'aoi-3': {
        'geotiff': 'cajamarca-ndvi-2025.tif',
        'bounds': [[-7.2001767, -78.6200147], [-7.0499783, -78.4498738]],
        'label': 'Cajamarca study area',
        'frames': [
            {
                'png': 'cajamarca-ndvi-2025-06-07.png',
                'period_start': '2025-06-01',
                'period_end': '2025-07-31',
            },
            {
                'png': 'cajamarca-ndvi-2025-07-08.png',
                'period_start': '2025-07-01',
                'period_end': '2025-08-31',
            },
            {
                'png': 'cajamarca-ndvi-2025-08-09.png',
                'period_start': '2025-08-01',
                'period_end': '2025-09-30',
            },
        ],
    },
}
PNG_ASSETS = frozenset(frame['png'] for asset in DEMO_NDVI_ASSETS.values() for frame in asset['frames'])
GEOTIFF_ASSETS = frozenset(asset['geotiff'] for asset in DEMO_NDVI_ASSETS.values())


def png_path(asset_name: str) -> Path | None:
    """Resolve a whitelisted display PNG.

    Args:
    ----
        asset_name(str): requested bundled PNG name.

    Returns:
    -------
        Path | None: existing file path or None when the asset is unknown.

    """
    if asset_name not in PNG_ASSETS:
        return None
    path = ASSET_ROOT / asset_name
    return path if path.is_file() else None


def geotiff_path(asset_name: str) -> Path | None:
    """Resolve a whitelisted georeferenced GeoTIFF.

    Args:
    ----
        asset_name(str): requested bundled GeoTIFF name.

    Returns:
    -------
        Path | None: existing file path or None when the asset is unknown.

    """
    if asset_name not in GEOTIFF_ASSETS:
        return None
    path = GEOTIFF_ROOT / asset_name
    return path if path.is_file() else None


def ndvi_asset_for_aoi(aoi_id: str) -> dict[str, Any] | None:
    """Return display, frame and georeferencing metadata for a seeded test AOI.

    Args:
    ----
        aoi_id(str): stable saved AOI identifier.

    Returns:
    -------
        dict[str, Any] | None: bundled NDVI metadata when available.

    """
    asset = DEMO_NDVI_ASSETS.get(aoi_id)
    if asset is None:
        return None
    return {
        'geotiff_url': f'/demo-assets/ndvi/geotiff/{asset["geotiff"]}',
        'bounds': asset['bounds'],
        'legend': NDVI_LEGEND,
        'label': asset['label'],
        'frames': [
            {
                **frame,
                'url': f'/demo-assets/ndvi/{frame["png"]}',
            }
            for frame in asset['frames']
        ],
    }
