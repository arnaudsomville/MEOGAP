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
| UI-002 | P0 | UI shall let the user draw or select an AOI, POI or LOI and a UTC time window, provide required parameters, and display validation feedback for unsupported or incomplete requests. UI sends the original geometry and explicit buffer parameters to the backend; backend processing bufferises POIs/LOIs and treats the resulting geometry as an AOI. | M0 request inputs are saved AOIs only; POI/LOI request inputs are not advertised until the buffering contract exists. Result exploration supports point, polygon and complete-result selections. | SYS-02, SYS-03, SYS-30 | Proposed |
| UI-003 | P0 | UI shall submit analysis requests through GTW and display explicit submission errors without directly invoking internal processing mechanisms. | M0 | SYS-03, SYS-17, SYS-31 | Proposed |
| UI-004 | P0 | UI shall provide a Requests view showing request status, available result, failure reason and relevant cost/quality information. | M0 deterministic demo identity/data; owner-scoped behavior M3 | SYS-12, SYS-16, SYS-25 | Proposed |
| UI-005 | P0 | UI shall reflect request-state changes without page reload and recover current state through GTW after reconnection. | M0 deterministic update mechanism; hardening later | SYS-16, SYS-31 | Proposed |
| UI-006 | P0 | UI shall display a successful request result on a map for a supported time window, with legend, units, quality context and scientific validation status where available. | M0 synthetic result; real product M1 | SYS-05, SYS-07, SYS-10, SYS-14a | Proposed |
| UI-007 | P0 | UI shall let the user select a point on the map and send its latitude/longitude through GTW to obtain local data and a time series, or inspect zonal data such as a mean over a selected zone, over an inclusive UTC window. M0 may use synthetic data and a synthetic SAU-like representation; it must not imply that the point selection itself is an SAU. | M0 synthetic point extraction and zonal summary; real data/aggregation M1–M2 | SYS-06, SYS-08a | Proposed |
| UI-008 | P0 | UI shall distinguish valid values including genuine zeros from missing observations, masked values, unavailable periods and processing failures. | M0 fixtures; source-specific masks M1 | SYS-07, SYS-20 | Proposed |
| UI-009 | P0 | UI shall display estimated cost and credit balance before submission and actual cost when available, clearly identifying simulated values in M0. | M0 demo values; real ledger M3 | SYS-24, SYS-25 | Proposed |
| UI-010 | P0 | UI shall provide a functional download of the final result artifact in M0, with units and essential context; the artifact may be deterministic and synthetic. Archive download containing intermediates and source observations with provenance is deferred. | M0 functional synthetic artifact download; provenance-based archive M3 | SYS-13, SYS-23 | Proposed |
| UI-011 | P1 | UI shall provide sign-in/sign-out views and protect authenticated views when authentication is implemented. | M3 | SYS-18 | Proposed |
| UI-012 | P2 | UI may display side-by-side or overlaid maps and compare time series for products that the backend explicitly identifies as scientifically comparable, presenting the supplied units, spatial/temporal context and limitations without determining compatibility itself. | Later extension | SYS-09 | Proposed |
| UI-013 | P0 | UI shall expose loading, empty, unavailable, partial-result and failure states for catalogue, requests, map, time series, balance and downloads. | M0 | SYS-07, SYS-16, SYS-25, SYS-30 | Proposed |
| UI-014 | P0 | UI shall provide a real multi-resolution satellite basemap as a major M0 feature, suitable for spatial orientation and AOI/POI/LOI selection, respecting provider attribution, licensing and usage limits. Automated tests shall use deterministic local tile fixtures or a local mock tile endpoint rather than depend on the live provider. When offline and no permitted cached tiles are available, UI shall clearly indicate that the satellite basemap is unavailable while keeping supported geometry interaction and non-basemap UI states usable; do not bundle or cache provider tiles unless the provider terms permit it. | M0 real basemap integration | SYS-02 | Proposed |

## Interfaces
- Input: user actions, configuration and data returned by GTW.
- Output: public REST calls through GTW and rendered catalogue/request/map/chart/download states.
- Not specified yet: endpoint paths, request/response schemas, live-update transport, map library and detailed drawing behavior.

## Decisions and remaining question

- **Spatial input in M0:** saved AOIs are the only request inputs. POI/LOI request geometry and buffering remain future work. Result analysis accepts explicit `POINT` and `POLYGON` WKT selections with an explicit CRS, including the complete result geometry.
- **Downloads in M0:** downloading a final result artifact is functional, even when the result and artifact are deterministic/synthetic. A provenance-based archive remains deferred.
- **Basemap in M0:** a real satellite basemap is a major feature, not a placeholder. Provider choice, attribution/licensing and usage limits must be documented. Automated tests use deterministic local tile fixtures or a local mock tile endpoint. Offline mode may use only permitted cached tiles; otherwise it clearly reports basemap unavailability while preserving geometry interaction and the rest of the UI.
- **Map exploration in M0:** users can select a point and send its latitude/longitude through GTW to retrieve local data and a time series, or inspect zonal data such as the mean over a selected zone. Synthetic fixtures are acceptable; real SAU aggregation is later.
- **Requests view in M0:** display all request states, transitions and failure details defined in the system proposal; state recovery remains available through REST. The UI must not collapse request, task, acquisition, asset-availability and result-quality states into one status.
