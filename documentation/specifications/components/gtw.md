# GTW — Gateway Component Specification

**Status:** Proposed first draft  
**Responsibility:** Public REST interface and entry point to MEOGAP.

## Purpose
GTW is MEOGAP's unique public REST entry point. It validates external/UI requests and routes them to backend components through their internal contracts. It exposes public catalogue, request, status, result and download operations without leaking internal implementation or storage details. CON owns request lifecycle, ownership/access rights, admission and cost tracking; SCI owns scientific feasibility and computation. GTW routes and exposes their capabilities but owns neither responsibility. SCI Gateway is an internal SCI subcomponent, not a top-level component.

## In scope
- Public REST API and its versioning/error conventions.
- Validation of request shape and API-level constraints.
- Public access to product catalogue descriptors.
- Routing analysis-request submission and query operations to CON, and product/scientific discovery or other scientific operations to SCI as defined by the public API contract.
- Public access to request status, result metadata, SCI-generated product representations and supported representation content/references.
- Routing visualization/analysis filters to SCI and exposing the resulting representation through REST.
- Establishing/propagating caller identity and enforcing the access decision returned by the responsible authorization/ownership logic when authentication is introduced.
- Stable behavior when downstream components are unavailable or fail.

## Boundaries
- GTW does not implement scientific algorithms or own scientific product semantics.
- GTW does not own physical asset storage or asset registration.
- GTW does not expose NATS or worker messages to UI clients.
- Notifications are not authoritative request state; clients can retrieve current state through REST.
- GTW does not own the authoritative request lifecycle, request ownership or access-rights policy; those are CON responsibilities.

## Component requirements

| ID | Priority | Requirement | Target milestone | Parent SYS | Status |
|---|---|---|---|---|---|
| GTW-001 | P0 | GTW shall expose a versioned public REST interface and route product discovery, request submission/status, result metadata and result access to their responsible backend components. | M0 demo contract with mocks; extend as capabilities arrive | SYS-01, SYS-03, SYS-05, SYS-12, SYS-17, SYS-31 | Proposed |
| GTW-002 | P0 | GTW shall validate request structure and required fields and return explicit, stable errors for invalid or unsupported requests. | M0 | SYS-03, SYS-30 | Proposed |
| GTW-003 | P0 | GTW shall expose CON-owned current request state and available result references through REST independently of internal notifications. | M0 mocked lifecycle; persistent state owned by CON; delivery milestone to align with M0 plan | SYS-12, SYS-16, SYS-17 | Open |
| GTW-004 | P0 | GTW shall expose product/result metadata without requiring clients to know physical storage layout or paths. | M0 synthetic descriptors; full metadata M1–M2 | SYS-01, SYS-10, SYS-26, SYS-27, SYS-28 | Proposed |
| GTW-005 | P0 | GTW shall enforce configured request limits and return explicit feedback when spatial, temporal or other supported limits are exceeded. | M0 deterministic limits | SYS-30 | Proposed |
| GTW-006 | P0 | GTW shall consult/enforce CON's authoritative access decision before exposing result retrieval or downloads to a caller. | M0 single demo identity; real owner isolation M3 | SYS-13, SYS-17, SYS-18, SYS-23 | Proposed |
| GTW-007 | P0 | GTW shall provide REST retrieval of current request state and results after client reconnection, regardless of live-update delivery. | M0 | SYS-16, SYS-17 | Proposed |
| GTW-008 | P0 | GTW shall establish or receive a trusted caller identity and propagate it to CON on every request/resource operation; it shall enforce CON's access decision at the public API boundary. M0 must exercise this identity-propagation and authorization contract with a deterministic demo identity/token, without claiming production authentication. The mechanism may use a bearer token or another explicitly documented contract. | M0 identity propagation and owner-scoped authorization contract; production authentication/hardening M3 | SYS-17, SYS-18, SYS-31 | Proposed |
| GTW-009 | P1 | GTW shall expose cost estimate, admission outcome, actual cost and balance from the responsible business capability, clearly distinguishing deterministic/demo values from authoritative business values. GTW shall not own or fabricate authoritative accounting state. | M0 display contract; accounting semantics and authoritative state belong to the responsible business capability | SYS-24, SYS-25 | Proposed |
| GTW-010 | P0 | GTW shall expose final-product downloads through a stable public REST contract with appropriate authorization, errors and essential product metadata. M0 shall support downloading a deterministic synthetic final artifact. Optional provenance archive download remains deferred. | Functional synthetic final-product download M0; real final products as they become available; provenance archive M3 | SYS-13, SYS-23 | Proposed |
| GTW-012 | P0 | GTW shall expose product-result representations generated by SCI through a stable, storage-independent REST contract. It shall pass supported spatial/temporal filters to SCI and return representation metadata and access content/references in the agreed format, without transforming scientific datasets itself or exposing physical storage details. | M0 deterministic synthetic representation contract; real SCI-generated representations M1 | SYS-05, SYS-08a, SYS-08b, SYS-26, SYS-27, SYS-28 | Proposed |
| GTW-011 | P1 | GTW shall return explicit dependency-failure responses without fabricating request/result state. | M0 deterministic failure; persistence/recovery later | SYS-16, SYS-17 | Proposed |

## Interfaces
- Public input: REST requests from UI and future authorized consumers.
- Internal routing/dependencies: CON for request lifecycle, ownership/access rights, admission and cost; SCI for scientific feasibility, complexity estimates and computation planning (performed internally by its SCI Gateway subcomponent); CAT for asset metadata; Workers/NATS remain internal execution and messaging mechanisms. GTW never exposes NATS directly.
- Output: versioned REST resources and stable error responses.
- Not specified yet: endpoints, schemas, HTTP status mapping, authentication mechanism, notification transport and internal call protocol.

## Open questions
1. What internal contracts should GTW use for CON-owned request state/access decisions and SCI-owned scientific feasibility/product operations?
2. Which identity transport contract should M0 use (e.g. bearer token), while keeping the demo identity deterministic and clearly distinct from production authentication?
3. Are downloads served/streamed by GTW or provided through short-lived object references? Public behavior can be defined before choosing the mechanism?
4. Which representation delivery pattern best fits the first UI map/chart use cases (e.g. bounded dataset response, image/tile service or another format)? Keep this open until contract and consumer analysis; SCI generates the representation, GTW exposes it.

## M0 implementation notes

- The public Gateway currently owns a deterministic in-memory demo and does not yet route requests to CON or SCI. M0 request submission follows `queued → processing → succeeded` without manual confirmation; see `documentation/architecture/adr/ADR-0005-m0-asynchronous-request-lifecycle.md`.
- Product descriptors expose `provenance: "SYNTHETIC_DEMO"`; the bundled georeferenced NDVI-like frames are not real mission observations.
- Result-series queries require an explicit WKT geometry and an explicit `EPSG:4326` CRS, expose available/selected parameters, and preserve `VALID`, `MISSING`, `MASKED` and `INVALID` period states.
- M0 request inputs are saved AOIs only. Product descriptors must not advertise POI/LOI request inputs until the request-geometry and buffering contract exists.
