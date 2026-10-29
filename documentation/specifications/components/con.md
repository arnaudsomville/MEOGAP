# CON — Contract / Request Management (Candidate Specification)

**Status:** Exploratory draft — not an approved system component.  
**Decision required:** Confirm whether CON is a distinct logical responsibility or whether its initial behavior belongs to GTW and is extracted later only if justified.

## Why this candidate exists
The current discussion has identified responsibilities that may not fit cleanly inside GTW, CAT or SCI: authoritative request lifecycle, admission/reuse decisions, orchestration state, retry tracking and possibly authorization policy. CON could own these behaviors without turning GTW into a business orchestrator or CAT into a second request manager.

This does not assume a separate package, process, container, service or database.

## Candidate scope
- Create and maintain the authoritative lifecycle of analysis requests.
- Decide whether a request can reuse an existing compatible result or requires new work, in collaboration with SCI and CAT.
- Track execution tasks, retries, failure reasons and links between requests, tasks and results.
- Apply admission rules such as supported-request checks and, later, credit availability.
- Carry trusted caller identity/context into internal operations when authentication is implemented.
- Expose internal lifecycle operations to GTW through a defined contract.

## Provisional exclusions
- No scientific algorithms or scientific-validity decisions.
- No ownership of asset catalog records or physical file storage.
- No public REST API; GTW remains the public entry point.
- No replacement for NATS as internal message transport.
- No dedicated database/process/service before an explicit decision.

## Candidate behaviors — not approved requirements

| Candidate ID | Priority | Candidate behavior | Target milestone | Parent SYS | Status |
|---|---|---|---|---|---|
| CON-C01 | P0 | A submitted request receives a stable identifier and observable lifecycle state retrievable through GTW. | M0 deterministic mock; authoritative state owner TBD | SYS-03, SYS-12, SYS-16, SYS-17, SYS-31 | Needs decision |
| CON-C02 | P0 | Request state distinguishes accepted, queued/running, succeeded and failed outcomes, with failure reason and result reference where applicable. | M0 synthetic transitions; durable recovery TBD | SYS-12, SYS-16, SYS-17 | Needs decision |
| CON-C03 | P1 | Request management coordinates tasks and associates outcomes/retries with the originating request without conflating task state, acquisition state and result quality. | M1–M3 | SYS-04, SYS-10, SYS-12, SYS-20 | Needs decision |
| CON-C04 | P1 | Request management determines whether an existing result may satisfy a request using compatibility and access criteria provided by scientific/catalog logic. | M2 | SYS-04, SYS-10, SYS-19, SYS-20 | Needs decision |
| CON-C05 | P1 | Request state transitions and execution tracking are idempotent and recoverable so retries do not create duplicate requests or result records. | M3; principles considered from M0 | SYS-12, SYS-16, SYS-17 | Needs decision |
| CON-C06 | P1 | When authentication and credits are implemented, admission decisions use trusted caller identity and authoritative credit policy, not client-supplied identity. | M3 | SYS-18, SYS-24, SYS-25 | Needs decision |

## Potential interfaces
- GTW → CON: create request, retrieve request, list caller-scoped requests, and later cancel if supported.
- CON ↔ Workers: dispatch tasks and receive outcomes through internal contracts and messaging.
- CON ↔ CAT: query candidate assets/results and associate produced assets with requests.
- CON ↔ SCI: obtain product constraints/compatibility information and initiate processing.
- CON → GTW: request state and result availability exposed through REST.

These are hypotheses and must be revised if CON is not accepted.

## Decision questions
1. Is CON a distinct logical responsibility, or should M0 implement request lifecycle in GTW behind a clear internal interface?
2. If CON exists logically, does it own authoritative request state, task/retry tracking and result-reuse admission?
3. Should authorization policy live in CON, GTW, or a dedicated identity/access-control capability introduced in M3?
4. Should credit admission belong to CON or another accounting responsibility?
5. What minimum M0 contract prevents UI/GTW interfaces from changing when internal ownership is clarified?
