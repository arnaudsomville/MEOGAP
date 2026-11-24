"""Configurable demo limits owned by the public Gateway."""

from __future__ import annotations

import os

DEFAULT_MAX_AOI_AREA_KM2 = 100.0
MAX_AOI_AREA_KM2 = float(os.getenv('GATEWAY_MAX_AOI_AREA_KM2', str(DEFAULT_MAX_AOI_AREA_KM2)))
