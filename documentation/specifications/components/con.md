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
| CON-002 | P0 | Request state distinguishes accepted, queued/running, succeeded and failed outcomes, with failure reason and result reference where applicable. | M0 synthetic transitions; durable recovery milestone to align with M0 architecture | SYS-12, SYS-16, SYS-17 | Proposed |
| CON-003 | P1 | CON shall coordinate execution tasks and associate outcomes/retries with the originating request without conflating task state, acquisition state, asset availability and result quality. | M1–M3; state concepts represented in M0 | SYS-04, SYS-10, SYS-12, SYS-20 | Proposed |
| CON-004 | P1 | CON shall decide whether a request may reuse an existing result, using scientific compatibility criteria provided by SCI and available candidate assets and metadata provided by CAT. | M2 | SYS-04, SYS-10, SYS-19, SYS-20 | Proposed |
| CON-005 | P1 | CON shall provide idempotent request-state transitions and recoverable execution tracking so retries do not create duplicate requests or result associations. | M3; design constraints considered from M0 | SYS-12, SYS-16, SYS-17 | Proposed |
| CON-006 | P1 | CON shall associate each request and computed resource with its owner and decide whether a caller may access that resource, using trusted identity rather than client-supplied ownership claims. | M3 owner-scoped authorization; M0 deterministic demo identity only | SYS-17, SYS-18 | Proposed |
| CON-007 | P1 | CON shall apply the authoritative credit/admission policy before scheduling work and record the decision and associated request context when credit accounting is implemented. | M3; M0 values may be simulated | SYS-24, SYS-25 | Open |

## Potential interfaces
- GTW → CON: create request, retrieve request, list caller-scoped requests, and later cancel if supported.
- CON ↔ Workers: dispatch tasks and receive outcomes through internal contracts and messaging.
- CON ↔ CAT: query candidate assets/results and metadata; CAT does not decide request ownership or scientific compatibility.
- CON ↔ SCI: obtain scientific compatibility criteria/product constraints and initiate processing.
- CON → GTW: request state and result availability exposed through REST.

These interfaces remain proposed and should be refined as the component contracts are specified.

## Open questions
1. How must internal components and workers enforce CON's access decision when accessing assets directly, without creating an alternate authorization authority?
2. Which request/task lifecycle state must be persisted in M0 to support the agreed reference journey and recovery requirements?
3. Should credit admission remain within CON or become a separate accounting responsibility as the credit model grows?
4. How are trusted caller identity and service-to-service identity represented and propagated?
