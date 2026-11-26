# Sequence Diagrams

These diagrams describe end-to-end logical flows across MEOGAP components. They complement the [Component Interaction Design](../system-interactions/component-interaction-design.md) and [Component Interaction Matrix](../system-interactions/component-interaction-matrix.md).

They are design artifacts, not API contracts. They do not prescribe REST routes, payload schemas, message topics, worker topology or storage formats.

> **M0 implementation note.** CON and SCI are not integrated in M0. The Gateway mock uses the simplified lifecycle `queued → processing → succeeded` without manual confirmation ([ADR-0005](../adr/ADR-0005-m0-asynchronous-request-lifecycle.md)). The diagrams below describe the target architecture.

## Scenarios

| Scenario | Document | Coverage | Review status |
|---|---|---|---|
| Submit an analysis request | [submit-analysis-request.md](./submit-analysis-request.md) | Always-asynchronous proposal preparation, including asynchronous SCI feasibility/complexity and CAT dependency/cost outcomes; confirmation and cancellation. | Updated synchronization decisions |
| Execute an analysis | [execute-analysis.md](./execute-analysis.md) | L0 ingestion, dependency-aware task readiness, dispatch, scientific computation and CAT registration, retaining caller identity across deferred execution. | Validated |
| Retrieve and display a result | [retrieve-and-display-result.md](./retrieve-and-display-result.md) | Synchronous visualization/lineage reads; asynchronous final-product and dependency-archive delivery with UI-21 state/access outcome. | Updated synchronization decisions |
| Failure and recovery | [failure-and-recovery.md](./failure-and-recovery.md) | Scientific/harmonization failures, CAT registration failure and separate asynchronous delivery failure. | Updated delivery lifecycle |

## Cross-cutting rules

- UI uses GAT as the single public REST entry point.
- CON owns request lifecycle, proposal preparation, execution orchestration and delivery orchestration.
- SCI owns scientific feasibility, input requirements and computation.
- CAT owns concrete asset discovery, L0 acquisition/ingestion, actual lineage, canonical asset references and current storage locations.
- GAT establishes trusted caller identity at the authenticated public boundary; CON persists and propagates the context to SCI/CAT and deferred workers. CON remains responsible for request/result/delivery authorization (ENG-15).
- CON does not maintain a duplicate catalogue or asset-to-location mapping; it queries CAT when it needs asset references and locations.
- Proposal preparation (UI-05/GC-02) and both delivery operations (UI-13/GC-08 and UI-14/GC-09) are always asynchronous. UI-21 exposes delivery state/access through the same delivery resource. SCI CS-01..CS-08 and CAT CC-01..CC-08 are asynchronous internal interactions. Other interfaces follow the fixed Sync/Async classifications in the Component Interaction Matrix; no conditional mode is used. REST remains the source of truth.
- Workers are execution mechanisms, and NATS is internal communication infrastructure. Neither is a peer logical component.
- Logical Sync/Async modes are classified in the Component Interaction Matrix and Interface Contract Inventory. Physical transport, messaging guarantees, retries, idempotency and recovery contracts remain deferred to interface/contract design. GC-10 through GC-13 are deliberately absent; delivery state/access are part of the GC-08/GC-09 resource and UI-21 outcome.
