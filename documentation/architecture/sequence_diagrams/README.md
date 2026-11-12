# Sequence Diagrams

These diagrams describe end-to-end logical flows across MEOGAP components. They complement the [Component Interaction Design](../system-interactions/component-interaction-design.md) and [Component Interaction Matrix](../system-interactions/component-interaction-matrix.md).

They are design artifacts, not API contracts. They do not prescribe REST routes, payload schemas, message topics, worker topology or storage formats.

## Scenarios

| Scenario | Document | Coverage | Review status |
|---|---|---|---|
| Submit an analysis request | [submit-analysis-request.md](./submit-analysis-request.md) | Request creation, scientific feasibility, dependency resolution, cost proposal, confirmation and cancellation. | Validated |
| Execute an analysis | [execute-analysis.md](./execute-analysis.md) | L0 ingestion, dependency-aware task readiness, dispatch, scientific computation and CAT registration. | Working draft — final diagram review pending |
| Retrieve and display a result | [retrieve-and-display-result.md](./retrieve-and-display-result.md) | Visualization, actual lineage inspection, final-product download and on-demand dependency archive. | Validated |
| Failure and recovery | [failure-and-recovery.md](./failure-and-recovery.md) | Scientific computation failure and CAT asset-registration failure; independent work may finish before request failure is finalized. | Failure policy validated |

## Cross-cutting rules

- UI uses GAT as the single public REST entry point.
- CON owns request lifecycle, proposal preparation, execution orchestration and delivery orchestration.
- SCI owns scientific feasibility, input requirements and computation.
- CAT owns concrete asset discovery, L0 acquisition/ingestion, actual lineage, canonical asset references and current storage locations.
- CON does not maintain a duplicate catalogue or asset-to-location mapping; it queries CAT when it needs asset references and locations.
- Operations expected to take more than 5 seconds are exposed asynchronously at the user-facing API. REST remains the source of truth for request state; notifications are optional refresh mechanisms.
- Workers are execution mechanisms, and NATS is internal communication infrastructure. Neither is a peer logical component.
- Detailed synchronous/asynchronous interface behavior, messaging guarantees, retries, idempotency and recovery contracts are deferred to interface/contract design.
