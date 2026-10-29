# UI — Component Specification

**Status:** Proposed first draft  
**Responsibility:** User interaction and presentation.

## Purpose
UI enables a user to discover supported products, configure an analysis request, follow its lifecycle, and explore results through maps, time series and downloads. UI communicates through GTW's public REST interface and does not depend on internal messaging or physical storage details.

## In scope
- Product catalogue browsing and product information.
- Spatial-input selection and request parameter entry within advertised constraints.
- Request submission and Requests view.
- Request status, failure reason, cost/credit presentation and result availability.
- Map display and time-series exploration for a supported SAU or AOI summary.
- Distinguishing missing, masked, invalid and genuine-zero values.
- Download actions.
- Sign-in/sign-out presentation when authentication is delivered.

## Boundaries
- UI does not calculate scientific products.
- UI does not access CAT persistence, object storage, workers or NATS directly.
- A successful request is not proof of scientific validation or complete temporal coverage.
- Missing or unavailable data must never be displayed as zero.
- UI does not expose physical paths or assume a storage layout.

## Component requirements

| ID | Priority | Requirement | Target milestone | Parent SYS | Status |
|---|---|---|---|---|---|
| UI-001 | P0 | UI shall present supported product descriptors, including purpose, processing level, inputs/outputs, spatial and temporal characteristics, units, limitations, documentation and validation status. Catalogue availability shall remain distinct from result availability. | M0 synthetic descriptor; full real metadata M1–M2 | SYS-01, SYS-19, SYS-22 | Proposed |
| UI-002 | P0 | UI shall let the user configure a supported spatial input and UTC time window, provide required parameters, and display validation feedback for unsupported or incomplete requests. | M0 AOI reference path; expand later by product | SYS-02, SYS-03, SYS-30 | Proposed |
| UI-003 | P0 | UI shall submit analysis requests through GTW and display explicit submission errors without directly invoking internal processing mechanisms. | M0 | SYS-03, SYS-17, SYS-31 | Proposed |
| UI-004 | P0 | UI shall provide a Requests view showing request status, available result, failure reason and relevant cost/quality information. | M0 deterministic demo identity/data; owner-scoped behavior M3 | SYS-12, SYS-16, SYS-25 | Proposed |
| UI-005 | P0 | UI shall reflect request-state changes without page reload and recover current state through GTW after reconnection. | M0 deterministic update mechanism; hardening later | SYS-16, SYS-31 | Proposed |
| UI-006 | P0 | UI shall display a successful request result on a map for a supported time window, with legend, units, quality context and scientific validation status where available. | M0 synthetic result; real product M1 | SYS-05, SYS-07, SYS-10, SYS-14a | Proposed |
| UI-007 | P0 | UI shall let the user inspect a time series for a supported spatial analysis unit or AOI summary over an inclusive UTC window. | M0 synthetic series; real SAU aggregation M1–M2 | SYS-06, SYS-08a | Proposed |
| UI-008 | P0 | UI shall distinguish valid values including genuine zeros from missing observations, masked values, unavailable periods and processing failures. | M0 fixtures; source-specific masks M1 | SYS-07, SYS-20 | Proposed |
| UI-009 | P0 | UI shall display estimated cost and credit balance before submission and actual cost when available, clearly identifying simulated values in M0. | M0 demo values; real ledger M3 | SYS-24, SYS-25 | Proposed |
| UI-010 | P1 | UI shall offer final-product download and, when supported, optional archive download containing intermediates and source observations with provenance. | Final download M0/M1 to confirm; archive M3 | SYS-13, SYS-23 | Open |
| UI-011 | P1 | UI shall provide sign-in/sign-out views and protect authenticated views when authentication is implemented. | M3 | SYS-18 | Proposed |
| UI-012 | P2 | UI may display side-by-side or overlaid maps and compare time series for products that the backend explicitly identifies as scientifically comparable, presenting the supplied units, spatial/temporal context and limitations without determining compatibility itself. | Later extension | SYS-09 | Proposed |
| UI-013 | P0 | UI shall expose loading, empty, unavailable, partial-result and failure states for catalogue, requests, map, time series, balance and downloads. | M0 | SYS-07, SYS-16, SYS-25, SYS-30 | Proposed |
| UI-014 | P0 | UI shall provide a multi-resolution satellite basemap suitable for spatial orientation and AOI selection, respecting attribution and licensing. | M0 | SYS-02 | Proposed |

## Interfaces
- Input: user actions, configuration and data returned by GTW.
- Output: public REST calls through GTW and rendered catalogue/request/map/chart/download states.
- Not specified yet: endpoint paths, request/response schemas, live-update transport, map library and detailed drawing behavior.

## Open questions
1. Does M0 require AOI, POI and LOI, or only AOI with other types advertised only by compatible products?
2. Must download be functional in M0, or is a contract plus deterministic synthetic artifact sufficient?
3. Does M0 require a real satellite basemap provider and what test/offline fallback is needed?
4. What is the minimum map interaction for selecting an SAU/AOI summary and viewing its time series?
5. Which request transitions and failure details must appear in Requests?
