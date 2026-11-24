# ADR-0004 — Static NDVI Assets for Seeded Demonstration AOIs

**Status:** Proposed — implemented in the M0 demonstration
**Date:** 24 November 2026
**Scope:** Gateway result map representation for the three seeded test AOIs

## Context

The gateway previously returned a synthetic SVG placeholder for every result map. The MEOGAP
learning workflow now needs real NDVI visualizations for the three seeded demonstration AOIs
(Toulouse, Guanacaste and Cajamarca). A PNG thumbnail alone is not georeferenced, so it cannot be
placed on a map without explicit spatial metadata.

## Decision

1. For each seeded test AOI, generate a georeferenced Sentinel-2 NDVI GeoTIFF for the fixed
   demonstration period `2025-06-01` to `2025-09-30`.
2. Keep the GeoTIFF as the source representation and bundle it with the Gateway.
3. Derive an RGBA PNG display representation from the same NDVI composite. Store the exact WGS 84
   bounds extracted from the GeoTIFF and return them with the map descriptor.
4. Bundle several NDVI display frames per seeded AOI and let the Gateway generate mock frame
   periods distributed inside the request period. The same static visuals are cycled when the
   requested number of frames exceeds the available maps.
5. Return bounds, the GeoTIFF URL, a colour-map legend and an ordered `frames` list in
   `ResultMapResponse`. Each frame carries its mock request-period dates plus the real visual
   composite period and a `is_reused_visual` flag.
6. The UI places the selected frame PNG on the map using the returned bounds, renders the legend
   and exposes a slider in the Result Inspector. The browser does not need a GeoTIFF reader.
7. The map descriptor must state that frame dates are mock dates and that visuals are reused static
   demonstration composites, not results recomputed for the current request period.

## Consequences

- The PNG is georeferenced operationally by exact bounds from the GeoTIFF, not by visual guesswork.
- The GeoTIFF remains available for verification and future geospatial processing.
- The colour map and units are part of the public Gateway metadata and are not hardcoded in the UI.
- Requests on non-seeded AOIs still receive the explicit synthetic placeholder.
- The fixed demonstration period remains visible as a limitation and does not claim to represent
  arbitrary request periods.

## References

- `projects/gateway/src/gateway/core/assets.py`
- `projects/gateway/src/gateway/core/demo.py`
- `projects/meogap_interfaces/rest/gateway.openapi.json`
