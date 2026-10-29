# CON — Request Management Component Specification

**Status:** Proposed first draft — logical component confirmed; detailed boundaries remain under review.  
**Responsibility:** Authoritative user-request lifecycle, request ownership/access rights, admission and cost tracking, independent of scientific implementation details.

## Purpose
CON is a distinct logical component. It owns analysis requests, including their authoritative lifecycle, caller/ownership association, access decisions, request status, admission and cost tracking. CON coordinates the user request but has no scientific knowledge: it asks SCI Gateway through a versioned interface whether a request is feasible and for its estimated complexity/cost, then coordinates the request lifecycle using the returned contract. GTW is the unique public REST entry point; it routes external/UI requests to backend components. SCI Gateway independently orchestrates scientific dependencies and publishes ingestion/calculation needs to NATS.

This does not assume a separate package, process, container, service or database.

## In scope
- Create and maintain the authoritative lifecycle of analysis requests.
- Request scientific feasibility and complexity/cost estimates from SCI Gateway through explicit versioned interfaces; CON does not resolve scientific dependencies or decide scientific compatibility.
- Coordinate request admission and lifecycle using the response from SCI Gateway and CON-owned business policies.
- Track execution tasks, retries, failure reasons and links between requests, tasks and results.
- Apply admission rules such as supported-request checks and, later, credit availability.
- Carry trusted caller identity/context through internal operations from M0, using a deterministic demo identity where production authentication is not yet implemented.
- Expose internal lifecycle operations to GTW through a defined contract.

## Boundaries
- No scientific algorithms, dependency resolution, product compatibility decisions or scientific execution planning; these belong to SCI Gateway.
- No ownership of asset catalog records or physical file storage.
- No public REST API; GTW remains the public entry point.
- No replacement for NATS as internal message transport.
- No dedicated database/process/service before an explicit decision.

## Component requirements (proposed)

| Candidate ID | Priority | Candidate behavior | Target milestone | Parent SYS | Status |
|---|---|---|---|---|---|
| CON-001 | P0 | A submitted request receives a stable identifier and observable lifecycle state retrievable through GTW. | M0 deterministic mock; CON-owned authoritative state; persistence milestone to confirm | SYS-03, SYS-12, SYS-16, SYS-17, SYS-31 | Proposed |
| CON-002 | P0 | Request state distinguishes accepted, queued/running, succeeded and failed outcomes, with failure reason and result reference where applicable. | M0 synthetic transitions; durable recovery milestone to align with M0 architecture | SYS-12, SYS-16, SYS-17 | Proposed |
| CON-003 | P1 | CON shall coordinate execution tasks and associate outcomes/retries with the originating request without conflating task state, acquisition state, asset availability and result quality. | M1–M3; state concepts represented in M0 | SYS-04, SYS-10, SYS-12, SYS-20 | Proposed |
| CON-004 | P1 | CON shall decide whether a request may reuse an existing result, using scientific compatibility criteria provided by SCI and available candidate assets and metadata provided by CAT. | M2 | SYS-04, SYS-10, SYS-19, SYS-20 | Proposed |
| CON-005 | P1 | CON shall provide idempotent request-state transitions and recoverable execution tracking so retries do not create duplicate requests or result associations. | M3; design constraints considered from M0 | SYS-12, SYS-16, SYS-17 | Proposed |
| CON-006 | P0 | CON shall associate each request and computed resource with a caller identity and make the authoritative access decision using trusted identity, never client-supplied ownership claims. M0 shall exercise this contract with deterministic demo identity/ownership data; production multi-account authentication and isolation are hardened in M3. | M0 identity/ownership contract and deterministic authorization behavior; production multi-account isolation M3 | SYS-17, SYS-18, SYS-31 | Proposed |
| CON-007 | P1 | CON shall apply the authoritative credit/admission policy before scheduling work and record the decision and associated request context when credit accounting is implemented. | M3; M0 values may be simulated | SYS-24, SYS-25 | Open |

## Potential interfaces
- GTW → CON: create request, retrieve request, list caller-scoped requests, and later cancel if supported.
- CON ↔ Workers: dispatch tasks and receive outcomes through internal contracts and messaging.
- CON ↔ CAT: query candidate assets/results and metadata; CAT does not decide request ownership or scientific compatibility.
- CON ↔ SCI Gateway: request feasibility/complexity estimates and submit/coordinate a scientific plan through versioned contracts; CON does not inspect scientific dependency graphs. SCI Gateway publishes ingestion and calculation needs to NATS.
- CON → GTW: request state and result availability exposed through REST.

These interfaces remain proposed and should be refined as the component contracts are specified.

## Open questions
1. How must internal components and workers enforce CON's access decision when accessing assets directly, without creating an alternate authorization authority?
2. Which request/task lifecycle state must be persisted in M0 to support the agreed reference journey and recovery requirements?
3. Should credit admission remain within CON or become a separate accounting responsibility as the credit model grows?
4. What exact versioned interface should SCI Gateway expose for feasibility, complexity/cost estimation, plan acceptance and execution outcomes?
4. Which identity transport contract should M0 use (e.g. bearer token), and how will service-to-service identity be represented without allowing clients to assert ownership?
