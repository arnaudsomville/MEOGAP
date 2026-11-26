# ADR-0006 — M0 Spatial Capability Boundary: AOI Requests and Explicit Result Selections

**Status:** Accepted — implemented in the M0 demonstration
**Date:** 26 November 2026
**Scope:** Product descriptors, request submission and result temporal-series selection

## Context

Product descriptors advertised `AOI`, `POI` and `LOI` request inputs, but the implemented request
path only accepts a saved `aoi_id`. The UI therefore advertised spatial capabilities that could not
be used. At the same time, result exploration already needed point and polygon selections that are
independent from the request geometry.

The target platform will eventually support POI/LOI request inputs with explicit server-side
buffering. That workflow is not implemented in M0.

## Decision

1. M0 product descriptors declare only `supported_spatial_inputs: ["AOI"]`. POI and LOI request
   inputs are not advertised until their request-geometry and buffering contract exists.
2. Product descriptors separately declare result-analysis selections:
   `supported_selection_geometries: ["POINT", "POLYGON", "RESULT_EXTENT"]`.
3. A result-analysis selection is sent to the Gateway as an explicit WKT geometry and an explicit
   CRS. M0 accepts `EPSG:4326` only; no implicit CRS is assumed. Saved request AOIs remain GeoJSON
   in WGS 84 by contract and have no separate CRS field in M0.
4. Point selections produce a point sample. Polygon selections produce a declared zonal mean.
   Selecting the complete result geometry is an explicit polygon selection and is exempt from the
   sub-polygon area limit.
5. Three geometries remain distinct:
   - the request geometry snapshot stored on the request;
   - the result geometry snapshot exposed by the result;
   - the geometry selected for a temporal-analysis request.
6. The series response echoes the selection WKT, CRS, selection type, aggregation method and
   selection area, and marks synthetic provenance explicitly.

## Consequences

- The catalogue no longer promises usable POI/LOI request inputs.
- The UI request form documents AOI-only request inputs and offers point, polygon and full-result
  selection for result exploration.
- Adding POI/LOI request inputs later requires a product-capability change and a server-side
  buffering contract, not a silent interpretation of a point or line as an AOI.

## References

- `documentation/architecture/adr/ADR-0002-temporal-series-selection.md`
- `documentation/specifications/sys.md` — SYS-02, SYS-06, SYS-30
- `projects/meogap_interfaces/rest/gateway.openapi.json`
