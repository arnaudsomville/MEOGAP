"""Synthetic map and delivery artifacts for the deterministic M0 demo."""

from __future__ import annotations

import base64
import json
from typing import Any
from urllib.parse import quote

from gateway.core.demo.constants import DELIVERY_KIND_ARCHIVE, PROVENANCE_SYNTHETIC_DEMO
from gateway.core.demo.models import ProductView
from gateway.core.demo.records import ResultRecord


def placeholder_map_url(product_id: str) -> str:
    """Build a synthetic SVG data URL for an explicit demo overlay."""
    svg = (
        "<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400'>"
        "<defs><pattern id='h' width='24' height='24' patternUnits='userSpaceOnUse' "
        "patternTransform='rotate(45)'>"
        "<rect width='24' height='24' fill='#1b6f6b' fill-opacity='.42'/>"
        "<rect width='10' height='24' fill='#35c6c0' fill-opacity='.36'/>"
        "</pattern></defs><rect width='600' height='400' fill='url(#h)'/>"
        "<text x='300' y='190' text-anchor='middle' fill='#eaf2f2' font-family='sans-serif' "
        f"font-size='30'>DEMO {product_id.upper()}</text>"
        "<text x='300' y='225' text-anchor='middle' fill='#eaf2f2' font-family='sans-serif' "
        "font-size='16'>Synthetic placeholder - not a scientific result</text>"
        '</svg>'
    )
    return f'data:image/svg+xml,{quote(svg)}'


def artifact_data_url(result: ResultRecord, product: ProductView, kind: str) -> str:
    """Build a local download URL for a clearly labelled synthetic GeoJSON artifact."""
    features: list[dict[str, Any]] = [
        {
            'type': 'Feature',
            'properties': {
                'entry': 'final_product',
                'aoi_name': result.aoi_name,
                'product_id': result.product_id,
                'units': product.units,
                'provenance': PROVENANCE_SYNTHETIC_DEMO,
                'validation_status': product.validation_status,
                'start_month': result.start_month,
                'end_month': result.end_month,
            },
            'geometry': result.geometry_snapshot,
        }
    ]
    if kind == DELIVERY_KIND_ARCHIVE:
        features.extend(
            [
                {
                    'type': 'Feature',
                    'properties': {
                        'entry': 'intermediate_product',
                        'note': 'Synthetic demo placeholder; no intermediate product was computed.',
                    },
                    'geometry': None,
                },
                {
                    'type': 'Feature',
                    'properties': {
                        'entry': 'source_observation',
                        'note': 'Synthetic demo placeholder; no real source observation was acquired.',
                    },
                    'geometry': None,
                },
                {
                    'type': 'Feature',
                    'properties': {
                        'entry': 'provenance',
                        'note': 'Synthetic demo provenance metadata only.',
                        'request_id': result.request_id,
                        'product_id': result.product_id,
                        'provenance': PROVENANCE_SYNTHETIC_DEMO,
                    },
                    'geometry': None,
                },
            ]
        )
    payload = {
        'type': 'FeatureCollection',
        'properties': {
            'note': 'MEOGAP SYNTHETIC_DEMO artifact - not a scientific product',
            'kind': kind,
            'result_id': result.result_id,
            'request_id': result.request_id,
            'product_id': result.product_id,
            'provenance': PROVENANCE_SYNTHETIC_DEMO,
        },
        'features': features,
    }
    encoded = base64.b64encode(json.dumps(payload, separators=(',', ':')).encode('utf-8')).decode('ascii')
    return f'data:application/geo+json;base64,{encoded}'
