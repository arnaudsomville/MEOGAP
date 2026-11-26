# ADR-0003 — Temporal Frequency as a Scientific Request Parameter

**Status:** Proposed — implemented in the M0 demonstration
**Date:** 24 November 2026
**Scope:** Public Gateway request contract and UI request configuration

## Context

Product descriptors already declare `supported_frequencies` (`monthly`, `semimonthly`, `weekly`, `three_day`, `two_day`, `daily`).
The analysis request contract did not retain which frequency the user requested. Temporal display
filters in the chart workspace are a separate, client-side concern and must not be confused with
the scientific frequency of an analysis request.

## Decision

1. Add an optional `temporal_frequency` field to `AnalysisRequestCreateRequest`, restricted to the
   product-declared values through Gateway validation.
2. Retain the selected value in `AnalysisRequestResponse` and expose it in `ResultDetailResponse`.
3. Populate the request-form selector exclusively from the selected product's
   `supported_frequencies`; do not hardcode values and do not silently choose a default. The UI
   renders English labels (`Monthly`, `Semi-monthly`, `Weekly`, `3-day`, `2-day`, `1-day`).
4. If a product declares no supported frequency, show an explicit unavailable state and disable
   submission.
5. Include `temporal_frequency` in both cost-estimation and request-creation payloads.
6. Keep chart temporal filters (`years`, `months`, `seasons`) strictly display-only. They never
   alter the request, the immutable result, or the Gateway payload.

## Consequences

- The public contract gains an optional request field and a retained response field. Existing
  requests without a frequency remain readable with `null`.
- The Gateway rejects a frequency not declared by the product.
- Consumers must distinguish the scientific request frequency from chart display filters.

## References

- `projects/meogap_interfaces/rest/gateway.openapi.json`
- `documentation/architecture/adr/ADR-0002-temporal-series-selection.md`
- `documentation/project_definition.md` — temporal analysis and representation honesty
