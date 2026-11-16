# ENG — Engineering Requirements Baseline

**Status:** Current engineering requirements baseline  
**Source of truth:** This file is the sole authority for `ENG-*` requirement IDs, statements and priorities.  
**Last updated:** 16 November 2026

## Purpose and scope

These requirements define cross-cutting engineering outcomes for MEOGAP. They complement, but do not replace, the scientific and user-facing capabilities in the [System Requirements Baseline](./sys.md).

They are not component contracts, implementation tickets or a deployment architecture. They must not be used to infer a specific worker topology, messaging transport, database, object-storage provider, identity provider or service decomposition.

## Priority interpretation

- **P0:** essential to represent in the M0 end-to-end foundation; the complete production behavior does not necessarily need to be implemented in M0.
- **P1:** important engineering capability expected after the initial M0 foundation.
- The relevant GitHub issue remains the authority for delivery sequencing, acceptance criteria and the actual M0 implementation boundary.

## Engineering requirements

| ID | Priority | Requirement |
|---|---|---|
| **ENG-01** | P0 | Shared contracts shall have a single versioned source, explicit compatibility rules, contract tests, and an external API versioning policy; breaking changes shall require a version bump and coordinated consumer updates. |
| **ENG-02** | P0 | Request and execution state shall be persisted and recoverable after interruption. State-changing operations shall be idempotent so that retries do not duplicate requests, results, ledger entries, or notifications. |
| **ENG-03** | P0 | User-facing operations expected to take more than 5 seconds shall be exposed asynchronously from the start, with a persistent request reference and retrievable state/outcome. Long-running work shall execute outside the request-response cycle, with failure isolation and observable terminal states; if retries are implemented, they shall be bounded and shall preserve idempotency. A failed job shall not corrupt request state. Detailed execution progress belongs to technical observability and does not require business progress notifications. |
| **ENG-04** | P0 | Liveness and readiness shall be distinct; readiness shall reflect required dependencies, and degraded operation shall be explicit. |
| **ENG-05** | P0 | Structured logs and durable audit events shall carry request, result, and processing-run correlation; they shall be sufficient to diagnose failures and shall never contain secrets or sensitive user data. |
| **ENG-06** | P0 | Configuration shall be external, validated at startup, fail fast when invalid, and separate non-secret configuration from injected secrets. |
| **ENG-07** | P0 | Merge-blocking gates shall cover format, lint, type, unit, non-regression, functional, contract, traceability, documentation completeness, security and CVE, and migration checks. Validation and benchmark tests shall be runnable on demand. Changes to shared contracts shall validate all consumers. |
| **ENG-08** | P1 | Clean-environment reproducibility shall use lockfiles, pinned toolchains, deterministic test fixtures, and no mutable external state. |
| **ENG-09** | P1 | Documented commands shall cover installation, tests, quality, build, run, and operation. |
| **ENG-10** | P0 | Credentials and sessions shall be protected; secrets shall not be stored in the repository, images, or logs; components shall run with least privilege; dependency vulnerabilities shall be detected and exceptions documented according to the project CVE policy. |
| **ENG-11** | P1 | Operational metrics and traces shall expose request and result throughput, latency, failure rate, pending/running workload and processing outcomes, correlated with request, result and processing-run identifiers. |
| **ENG-12** | P0 | Persistent schema changes shall be versioned migrations, applied consistently, tested, and shall preserve result versions, lineage, and ledger history. |
| **ENG-13** | P1 | Backup and restore of requests, results, lineage, and ledger data shall be documented and tested. |
| **ENG-14** | P1 | Third-party licenses, attributions, and dependency inventory shall be tracked; an SBOM may be generated. |
| **ENG-15** | P0 | Every user-originated request to an authenticated public REST operation shall be associated with verifiable caller authentication, except for explicitly unauthenticated bootstrap and health/readiness operations. GAT shall validate the presented credential or authentication proof through a configured trust mechanism and derive a trusted caller identity; caller-supplied identity headers or request payload fields shall not be trusted as proof of identity. The trusted identity context shall be propagated across all internal operations and used for request/result ownership, authorization checks, audit events and distributed traces. It shall preserve, at minimum, the authenticated subject/owner, the initiating actor where distinct, the calling client/origin, and request/trace correlation. Internal calls shall propagate an integrity-protected trusted identity context; the external credential itself need not be forwarded and shall never be copied into logs. CON remains responsible for request/result access decisions. M0 may use a deterministic demo identity/authentication context to exercise the propagation contract; production authentication and multi-account isolation remain aligned with SYS-17 and SYS-18 and their planned delivery. The authentication mechanism and credential format (for example, a Bearer access token) are deliberately left open for security/contract design. |
 
## Relationship to system requirements

- **SYS-17** covers authenticated/authorized REST access, caller scoping, and recording caller identity and origin.
- **SYS-18** covers user authentication, multi-account support and trusted identity propagation.
- **ENG-15** defines the cross-cutting engineering contract for carrying that trusted identity through API and internal execution paths. It does not transfer authorization ownership from CON to GAT or define a specific identity provider/token issuer.

## Architecture alignment

- GAT is the unique public REST entry point and the trust boundary for public Bearer-token validation.
- CON owns access decisions for requests, results and deliveries, using the trusted identity context supplied through internal interfaces.
- SCI and CAT receive only the identity/context information needed for their authorized operation and audit/tracing; they do not independently redefine user ownership or override CON's access decision.
- A distributed trace must correlate the public request with its internal operations while keeping authentication credentials, token values and sensitive claims out of logs.
- The exact authentication mechanism, credential format (a Bearer token is one possible option), issuer/trust model, credential lifetime/renewal, identity claims, internal context format and service-to-service authentication mechanism remain interface/security design decisions. They must be specified before production authentication is implemented.

## Consistency notes

- The 5-second asynchronous API rule is user-facing and does not prescribe the internal execution transport.
- Retry behavior is conditional on the project adopting retries; any adopted retry must be bounded and idempotent. The failure/recovery design has not yet selected a retry policy.
- Workload observability is described independently of a particular queue or worker implementation.
- These requirements express target behavior. Their presence does not imply that the corresponding functionality is already implemented.
