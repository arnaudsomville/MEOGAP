# ADR-0004 — Synthetic Georeferenced NDVI Demonstration Assets

**Status:** Accepted — implemented in the M0 demonstration
**Date:** 24 November 2026 · **Revised:** 26 November 2026
**Scope:** Gateway result map representation for the three seeded test AOIs

## Context

The Gateway previously returned a synthetic SVG placeholder for every result map. The MEOGAP
learning workflow needs a visually realistic, georeferenced NDVI-like representation for the three
seeded demonstration AOIs (Toulouse, Guanacaste and Cajamarca). A PNG thumbnail alone is not
georeferenced, so it cannot be placed on a map without explicit spatial metadata.

The demonstration raster is **not** a scientific product computed from Sentinel-2, Landsat or any
other Earth observation mission. Earlier wording implied a real mission composite and cloud masking;
that wording was incorrect and has been removed.

## Decision

1. Bundle a georeferenced NDVI-like GeoTIFF and several display PNG frames per seeded AOI. Their
   provenance is `SYNTHETIC_DEMO`.
2. Keep the GeoTIFF as the georeferenced demonstration representation and bundle it with the
   Gateway. It is not a validated scientific dataset.
3. Derive RGBA PNG display frames from the same synthetic raster. Store the exact WGS 84 bounds and
   return them with the map descriptor so the PNG can be placed on the map.
4. Let the Gateway generate mock frame periods distributed inside the request period. The same
   static visuals are cycled when the requested number of frames exceeds the available maps.
5. Return `provenance: "SYNTHETIC_DEMO"`, bounds, the GeoTIFF URL, a colour-map legend and an
   ordered `frames` list. Each frame carries its mock request-period dates plus the static visual
   period and a `is_reused_visual` flag.
6. The UI places the selected frame PNG on the map using the returned bounds, renders the legend,
   exposes a slider in the Result Inspector and displays the selected frame period as a floating
   map badge.
7. The map descriptor explicitly states that the visual is synthetic and that frame dates are mock
   dates. It must not claim real mission provenance, cloud cover, masking statistics or scientific
   validation.

## Consequences

- The PNG is georeferenced operationally by exact bounds from the GeoTIFF, not by visual guesswork.
- The GeoTIFF remains available for verification and future geospatial experiments.
- The colour map, units and `SYNTHETIC_DEMO` provenance are part of the public Gateway metadata.
- `quality_status` is `UNKNOWN` and no observation-quality statistic is fabricated.
- Requests on non-seeded AOIs still receive an explicit synthetic placeholder.
- Availability of a georeferenced representation does not imply scientific validation.

## References

- `projects/gateway/src/gateway/core/assets.py`
- `projects/gateway/src/gateway/core/demo/result_service.py`
- `projects/meogap_interfaces/rest/gateway.openapi.json`
- `documentation/architecture/adr/ADR-0006-m0-spatial-capability-boundary.md`
