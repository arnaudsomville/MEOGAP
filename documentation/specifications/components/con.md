# CON — Request Management Component Specification

**Status:** Proposed first draft — logical component confirmed; detailed boundaries remain under review.  
**Responsibility:** Authoritative request lifecycle, request ownership and access rights for computed resources.

## Purpose
CON is a distinct logical component. It owns analysis requests, including their authoritative lifecycle, the identity/ownership association, and decisions about who may access computed resources. It also tracks execution tasks and outcomes. GTW is the global gateway: it routes external/UI requests to CON and other backend components through internal REST or NATS/Workers as appropriate.

This does not assume a separate package, process, container, service or database.

## In scope
- Create and maintain the authoritative lifecycle of analysis requests.
- Decide whether a request can reuse an existing compatible result or requires new work, in collaboration with SCI and CAT.
- Track execution tasks, retries, failure reasons and links between requests, tasks and results.
- Apply admission rules such as supported-request checks and, later, credit availability.
- Carry trusted caller identity/context into internal operations when authentication is implemented.
- Expose internal lifecycle operations to GTW through a defined contract.

## Boundaries
- No scientific algorithms or scientific-validity decisions.
- No ownership of asset catalog records or physical file storage.
- No public REST API; GTW remains the public entry point.
- No replacement for NATS as internal message transport.
- No dedicated database/process/service before an explicit decision.

## Component requirements (proposed)

| Candidate ID | Priority | Candidate behavior | Target milestone | Parent SYS | Status |
|---|---|---|---|---|---|
| CON-001 | P0 | A submitted request receives a stable identifier and observable lifecycle state retrievable through GTW. | M0 deterministic mock; CON-owned authoritative state; persistence milestone to confirm | SYS-03, SYS-12, SYS-16, SYS-17, SYS-31 | Proposed |
| CON-002 | P0 | Request state distinguishes accepted, queued/running, succeeded and failed outcomes, with failure reason and result reference where applicable. | M0 synthetic transitions; durable recovery TBD | SYS-12, SYS-16, SYS-17 | Needs decision |
| CON-003 | P1 | Request management coordinates tasks and associates outcomes/retries with the originating request without conflating task state, acquisition state and result quality. | M1–M3 | SYS-04, SYS-10, SYS-12, SYS-20 | Needs decision |
| CON-004 | P1 | Request management determines whether an existing result may satisfy a request using compatibility and access criteria provided by scientific/catalog logic. | M2 | SYS-04, SYS-10, SYS-19, SYS-20 | Needs decision |
| CON-005 | P1 | Request state transitions and execution tracking are idempotent and recoverable so retries do not create duplicate requests or result records. | M3; principles considered from M0 | SYS-12, SYS-16, SYS-17 | Needs decision |
| CON-006 | P1 | When authentication and credits are implemented, admission decisions use trusted caller identity and authoritative credit policy, not client-supplied identity. | M3 | SYS-18, SYS-24, SYS-25 | Needs decision |

## Potential interfaces
- GTW → CON: create request, retrieve request, list caller-scoped requests, and later cancel if supported.
- CON ↔ Workers: dispatch tasks and receive outcomes through internal contracts and messaging.
- CON ↔ CAT: query candidate assets/results and associate produced assets with requests.
- CON ↔ SCI: obtain product constraints/compatibility information and initiate processing.
- CON → GTW: request state and result availability exposed through REST.

These interfaces remain proposed and should be refined as the component contracts are specified.

## Open questions
1. Does CON own the final authorization decision for every computed resource, while GTW enforces the decision at the public boundary? What enforcement is required for internal component/worker access?
2. Does CON own request admission and result-reuse decisions, or does it coordinate with SCI for scientific compatibility and CAT for available candidates?
3. Which request/task lifecycle transitions must be persisted in M0 versus introduced in M1–M3?
4. Should credit admission belong to CON or a separate accounting responsibility?
5. How are trusted caller identity and service-to-service identity represented and propagated?
