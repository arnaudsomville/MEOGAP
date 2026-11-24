# ADR-0002 — Spatial Selection and Temporal Series Contract for M0

**Status:** Proposed — implemented in the M0 demonstration
**Date:** 24 November 2026
**Scope:** Public Gateway contract for point/polygon result exploration and temporal series

## Context

M0 already exposes a synthetic result map and an empty legacy series placeholder. The map-first
workspace must let a user select a point or polygon inside a displayed result and inspect its
temporal evolution without submitting a new scientific processing request. The selection is a
view/analysis request over an existing result, not a new product request.

The existing `GET /api/v1/results/{result_id}/series` operation cannot carry a geometry, CRS or
bounded period without unstable query-string payloads. The selection is also independent from the
request AOI: a request may have been computed over an AOI while the user explores a point or a
sub-polygon.

## Decision

1. Add `POST /api/v1/results/{result_id}/series` as the M0 temporal exploration operation.
2. The request body declares:
   - `geometry_wkt`: a `POINT` or `POLYGON` in WKT;
   - `crs`: an explicit CRS identifier, restricted to `EPSG:4326` in M0;
   - `period`: inclusive `YYYY-MM` bounds that must stay inside the result period;
   - optional analysis parameter names.
3. The response returns explicit per-period states (`VALID`, `MISSING`, `MASKED`, `INVALID`),
   values, units, quality status, coverage when applicable, aggregation method and demo provenance.
4. Missing, masked and invalid periods carry `value: null`; a measured zero is `value: 0` with
   `state: VALID`. A period without observation is never represented as zero.
5. The Gateway validates WKT geometry, CRS, result containment, selection area and period support
   before returning a deterministic demonstration series.
6. Month and season filtering are client-side display filters over the returned series. They do not
   request a new scientific computation and do not perform seasonal statistical aggregation.
7. Meteorological seasons are explicit. Their definition depends on the hemisphere of the selected
   geometry; a geometry crossing the equator disables seasonal filtering instead of guessing.
8. The legacy `GET /api/v1/results/{result_id}/series` placeholder is retained for compatibility
   and does not fabricate observations.

## Alternatives considered

- **GET with encoded query parameters:** rejected because long WKT payloads, explicit CRS and
  bounded periods are better represented as a structured request body.
- **Reuse the original request AOI only:** rejected because exploration must support arbitrary
  points and sub-polygons inside the displayed result.
- **Server-side month/season filters:** deferred because the requirement is display filtering over
  available data, not a new scientific aggregation.
- **Add a charting dependency:** rejected for M0; a small SVG chart keeps the dependency surface
  unchanged.

## Consequences

- The public Gateway contract gains additive operations and schemas; the reference OpenAPI document,
  the Gateway implementation and consumer/provider contract tests change together.
- Scientific semantics remain explicit: a successful result may still contain missing, masked or
  unsupported periods.
- Point selections use point sampling; polygon selections use a declared zonal mean in the demo.
  Real aggregation methods and coverage handling remain future scientific work.
- POI/LOI request inputs are not introduced by this ADR; they require a separate request-geometry
  and server-side buffering decision.

## References

- `documentation/project_definition.md` — spatial and temporal analysis, result representations
- `documentation/specifications/sys.md` — SYS-05, SYS-06, SYS-07, SYS-08a, SYS-08b, SYS-27
- `projects/meogap_interfaces/rest/gateway.openapi.json`
