# GTW — Gateway Component Specification

**Status:** Proposed first draft  
**Responsibility:** Public REST interface and entry point to MEOGAP.

## Purpose
GTW is MEOGAP's global gateway and public REST entry point. It validates external/UI requests and routes them to the appropriate backend component, or to a Worker for specific use cases, using internal REST or NATS according to the relevant interface contract. It exposes public catalogue, request, status, result and download operations without leaking internal implementation or storage details. CON remains the owner of request lifecycle, resource ownership and access rights; GTW routes and exposes those capabilities rather than owning them.

## In scope
- Public REST API and its versioning/error conventions.
- Validation of request shape and API-level constraints.
- Public access to product catalogue descriptors.
- Routing analysis-request submission and query operations to CON.
- Public access to request status, result metadata and supported representations.
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
| GTW-006 | P0 | GTW shall expose result retrieval and downloads only for results available to the requesting caller under the active access-control policy. | M0 single demo identity; real owner isolation M3 | SYS-13, SYS-17, SYS-18, SYS-23 | Proposed |
| GTW-007 | P0 | GTW shall provide REST retrieval of current request state and results after client reconnection, regardless of live-update delivery. | M0 | SYS-16, SYS-17 | Proposed |
| GTW-008 | P1 | GTW shall expose caller identity and enforce owner-scoped access for requests, results, downloads and related resources when authentication is enabled. | M3 | SYS-17, SYS-18 | Proposed |
| GTW-009 | P1 | GTW shall expose cost estimate, admission outcome, actual cost and balance from the responsible business capability without presenting simulated values as authoritative ledger entries. | M0 display contract; authoritative values M3 | SYS-24, SYS-25 | Proposed |
| GTW-010 | P1 | GTW shall expose final-product and optional archive downloads through a stable contract with appropriate errors and metadata. | Final download M0/M1 to confirm; archive M3 | SYS-13, SYS-23 | Open |
| GTW-011 | P1 | GTW shall return explicit dependency-failure responses without fabricating request/result state. | M0 deterministic failure; persistence/recovery later | SYS-16, SYS-17 | Proposed |

## Interfaces
- Public input: REST requests from UI and future authorized consumers.
- Internal routing/dependencies: CAT for catalogue/asset metadata; SCI for product-related operations; CON for request lifecycle, ownership and access rights; Workers for use cases that require asynchronous execution. Internal REST or NATS is selected per contract.
- Output: versioned REST resources and stable error responses.
- Not specified yet: endpoints, schemas, HTTP status mapping, authentication mechanism, notification transport and internal call protocol.

## Open questions
1. Is GTW a thin API boundary, or does it own request orchestration initially?
2. If CON is accepted, does GTW store request state or expose CON-owned state?
3. Who decides whether an existing result satisfies a new request: CON, SCI, CAT, or coordinated policy?
4. How is caller identity represented in M0 without claiming real authentication?
5. Are downloads served/streamed by GTW or provided through short-lived object references? Public behavior can be defined before choosing the mechanism.
