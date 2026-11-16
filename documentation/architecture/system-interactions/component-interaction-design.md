# Component Interaction Design

**Status:** Working design note — component responsibilities, architecture decisions and open design questions  
**Last updated:** 16 November 2026

> This document records the responsibility model, architecture decisions and open design questions for M0. The detailed, user-validated interaction inventory is maintained separately in [M0 Component Interaction Matrix](./component-interaction-matrix.md). This note is not an implementation specification, an API contract, or an ADR. The component specifications under [documentation/specifications/components](../../specifications/components/) are earlier drafts and have not yet been reconciled with every decision below.

## 1. Modelling boundary

The logical component interaction diagram contains exactly five peer components:

- **UI** — user interaction and presentation.
- **GAT** — the unique public REST Gateway.
- **CON** — request, execution-plan and delivery orchestration.
- **SCI** — scientific product semantics, input requirements and computation.
- **CAT** — concrete data/product discovery, dependency resolution, acquisition and asset lineage.

The following are **not** peer logical components:

- **Workers** are execution mechanisms used to run long-running operations.
- **NATS** is internal messaging infrastructure.
- **EO data providers** are external systems.
- **Object storage** is infrastructure behind asset access. An S3-compatible store has been considered, but no storage backend is selected by this note.

A logical component does not imply a dedicated package, process, container, service or deployment.

## 2. Current responsibility model

| Logical component | Owns | Explicitly does not own |
|---|---|---|
| **UI** | Product discovery experience, request configuration/confirmation, Requests view, maps, plots, layer visibility/overlay and download actions. | Scientific computation, dependency resolution, internal messaging, physical storage access. |
| **GAT** | The public REST boundary; request validation; validation of caller authentication; derivation and propagation of trusted caller identity context; routing UI operations to the responsible internal components; exposing request state, product representations and download access. | Authoritative request lifecycle, final cost policy, access-policy decisions, scientific algorithms, physical asset inventory or storage layout. |
| **CON** | Feasibility/cost coordination, request lifecycle and ownership association, persistence of the trusted caller context with the request and execution plan, access decisions, orchestration of missing product generation, and delivery orchestration. | Authentication credential validation, scientific product semantics, scientific compatibility decisions, provider-specific data acquisition, physical asset cataloguing or scientific computation. |
| **SCI** | Scientific product definitions/methods, scientific feasibility, the input requirements/criteria needed for a computation, computation and scientific result characterization; consuming trusted caller/request context for correlation, tracing and audit where needed. | Knowing which concrete product instances or acquisitions are currently available; resolving those requirements to actual assets; provider inventory/pricing; request lifecycle, caller authentication and user access-policy decisions. |
| **CAT** | Discovery and availability of concrete source observations and product assets; resolution of scientific input requirements to exact available product/acquisition instances; identification of missing inputs; L0 acquisition/ingestion and provider-specific acquisition pricing; asset registration and actual product lineage; consuming trusted caller/request context for correlation, tracing and audit where needed. | Defining scientific methods, deciding scientific compatibility, caller authentication, user access-policy decisions, or orchestrating the generation of missing scientific products. |

### Terminology clarification: what SCI knows

The statement that “SCI does not know the products” means that SCI does **not** know the concrete product instances, acquisitions or assets available in CAT, nor which exact existing instances can satisfy a request.

SCI still owns scientific product definitions and methods. For a requested computation, it describes the required inputs using scientific criteria such as spectral band, spectral/spatial resolution, acquisition period, spatial scope and quality constraints. It does not select the concrete acquisition or product instance.

### Dependency ownership

Three distinct views must not be conflated:

1. **Scientific input requirements — SCI.** What kinds of inputs a scientific method needs.
2. **Concrete dependency resolution — CAT.** Which exact existing product/acquisition instances satisfy those requirements, and which are missing.
3. **Planned execution — CON.** Which missing intermediate products must be generated, which L0 inputs must be acquired, and in which dependency order the request will be executed.

CAT also preserves the **actual lineage** of each generated product: the exact parent product/acquisition instances and versions that were really used. Planned dependencies and actual lineage are different records.

The internal L0–LN levels are conceptual. The lineage model should preserve exact direct input references and must not assume that every product dependency is necessarily one level lower if a product definition legitimately skips a level.

## 3. Validated interaction inventory

The detailed interaction inventory is maintained in the companion [M0 Component Interaction Matrix](./component-interaction-matrix.md). That document records the producer/consumer direction, purpose and validated route of each interaction.

The key interface boundaries are:

- **UI ↔ GAT:** all user-facing operations use the single public REST Gateway.
- **GAT ↔ CON:** request lifecycle, feasibility/cost coordination, result-access authorization and Delivery Management.
- **CON ↔ SCI:** scientific evaluation (including input requirements), computation-complexity estimation and product computation/outcome.
- **CON ↔ CAT:** concrete dependency resolution, itemized L0 acquisition costs, ingestion, asset references and actual lineage.
- **SCI ↔ CAT:** generated-product metadata/lineage registration and registration confirmation only.
- **GAT ↔ SCI:** scientific product catalogue and theoretical input requirements only. Requests to visualize or analyze a specific computed result pass through CON for access authorization.
- **GAT ↔ CAT:** no direct interface in the validated model.

The matrix is the reference for the interaction list. This note explains the responsibilities and the reasoning behind those boundaries.

### Identity and caller-context propagation (ENG-15)

Identity propagation is a cross-cutting property of the interactions below, not a separate business component or an independent request lifecycle.

1. An authenticated public REST call must carry proof of caller authentication. GAT validates that proof using the configured trust mechanism and derives a **trusted identity context**. Explicitly unauthenticated bootstrap and health/readiness operations are exceptions.
2. Caller-supplied owner IDs or identity headers are not proof of identity. The authoritative owner is derived from the validated caller identity, not accepted from request payload fields.
3. GAT passes the trusted context to CON for request, access and delivery operations. Direct GAT → SCI catalogue calls also carry the caller/trace context needed for audit and correlation; they do not grant access to private computed results.
4. CON associates the authenticated subject/owner, initiating actor where distinct, calling client/origin and request/trace correlation with the request. It propagates the trusted context to the SCI and CAT operations it coordinates, including L0 ingestion, dependency resolution, computation dispatch, result registration context and delivery.
5. Deferred execution must persist enough trusted context with the request/task so that a worker can restore the original owner and correlation when it runs. It must not depend on the original HTTP request remaining alive or on forwarding the external credential itself.
6. CON remains responsible for request/result/delivery authorization decisions. SCI and CAT consume only the context needed for their operations, audit and tracing; they do not independently redefine ownership or make user access-policy decisions.
7. Propagate the validated identity context, not the raw external credential by default. Credentials and secrets must never be written to logs or traces.

The credential format, authentication provider, identity claims and internal context representation remain open for interface/security contract design (see [ENG-15](../../specifications/eng.md#eng-15)).

## 4. Request submission, feasibility, dependency resolution and cost estimation

The proposal-preparation flow starts when the user submits an analysis request. There is no separate pre-submission feasibility or cost-estimation operation.

1. The user configures a product, spatial scope, period and parameters in UI and submits the request.
2. GAT forwards the submitted request to CON.
3. CON creates and persists the request in a proposal-preparation state before starting evaluation. The exact state name is not fixed yet.
4. CON asks SCI for scientific feasibility and the scientific input requirements for the requested product.
5. CON passes those criteria to CAT.
6. CAT resolves the criteria against its concrete inventory and returns:
   - exact existing product/acquisition instances that can be reused;
   - missing intermediate products that do not currently exist;
   - missing L0 acquisition requirements;
   - acquisition/download costs for missing L0 data.
7. For each missing intermediate product, **CON** asks SCI for that product's own scientific input requirements and asks CAT to resolve those requirements. CON repeats this process until the required existing products and L0 inputs are identified.
8. CON builds and persists the planned execution for the request, including the intermediate products that must be generated.
9. CON calculates the total estimated request cost.
10. If the request is feasible and proposal preparation is complete, CON moves it to **PROPOSED** and returns the proposal and estimated cost through GAT.

The estimated cost must include at least:
- acquisition/download costs for missing L0 data, supplied by CAT itemized per acquisition;
- generation/computation costs for every missing intermediate and requested product.

CON owns the overall request estimate and admission decision. SCI may provide feasibility and computation-complexity information. The precise computation-pricing model, rates and cost breakdown are not yet defined.

**Important boundary:** CAT may identify that an L1 product is missing and resolve the L0 inputs needed by that L1 product once CON asks SCI for its requirements. CAT does not trigger or orchestrate the L1 computation. CON owns recursive planning and all missing scientific-product generation.

## 5. Request acceptance, cancellation and execution

The current request lifecycle decisions are:

- On submission, CON first persists the request in a proposal-preparation state. Feasibility evaluation, dependency resolution and cost estimation are then performed as part of that request. The exact proposal-preparation state name is not fixed yet.
- Once proposal preparation is complete and the request is feasible, it enters **PROPOSED** state with an estimated cost and a planned set of required acquisitions/product generations.
- When the user accepts the proposal, CON records the acceptance and transitions the request from **PROPOSED** to **IN_EXECUTION**.
- The user may request cancellation in any request state except **COMPLETED**. GAT forwards the cancellation request to CON. CON owns the request lifecycle, records the cancellation and stops further orchestration. How already-running ingestion or computation is interrupted or reconciled is addressed in the execution and failure/recovery flows.
- CON asks CAT to acquire/ingest the missing L0 source data.
- Once the required source assets are available, CON evaluates the persisted dependency plan and dispatches only computations whose required inputs are available. Independent eligible tasks may be dispatched concurrently; workers execute the tasks but do not resolve dependencies or repeatedly requeue blocked tasks.
- SCI computes each product and writes its result object to storage. SCI sends CAT the computation metadata, initial object location and exact input references actually consumed. CAT registers the product and actual lineage, then confirms registration to SCI.
- SCI reports the computation and registration outcome to CON, distinguishing scientific execution failure from asset-registration failure. CON owns the authoritative request/task state. CON does not store CAT's canonical asset reference or storage location; when it needs an asset, it queries CAT using the logical product/task identifier from its execution plan.
- After a successful registration, CON records the task outcome and reevaluates the plan. Newly unblocked tasks become eligible for dispatch.
- If a required task fails, CON marks that task **FAILED** and keeps its dependent tasks **BLOCKED**. Independent tasks that were already **READY** or **RUNNING** when the failure was detected are allowed to finish. CON waits for that work to settle; if a requested output remains impossible to produce, CON marks the overall request **FAILED**.
- The request enters **COMPLETED** only after all requested outputs are available and registered in CAT. CON verifies completion using the logical output identifiers in its execution plan and CAT's authoritative catalogue state; it does not maintain a duplicate asset-reference/location mapping.
- Computation progress is handled through technical observability (for example traces or a workflow visualizer); it is not a required business notification from SCI to CON.

The persisted request plan identifies the logical products/tasks that CON intends to generate. It is not a substitute for CAT's actual asset lineage and does not duplicate CAT's canonical asset references or storage locations.

The exact task-state vocabulary, proposal-preparation and infeasibility states, cancellation outcome semantics, retry policy, idempotency and replanning behavior remain open.

## 6. Delivery orchestration and dependency archive

CON owns **delivery orchestration**.

For a request to download a product together with its dependencies:

1. GAT forwards the delivery request to CON.
2. CON checks the caller's access rights.
3. CON asks CAT for the actual dependency lineage of the requested result, then requests the canonical asset references and current storage locations for the assets in that lineage.
4. CON coordinates archive generation from those actual assets.
5. GAT exposes the resulting download access to UI.

The archive is generated **on demand**, rather than pre-generated for every product, to avoid unnecessary storage consumption. It is temporary and must expire/ be cleaned up according to a retention policy.

CON owns the delivery lifecycle. CAT remains the sole authority for canonical asset references, current storage locations and actual lineage. CON queries CAT when required and uses the returned information for the current delivery operation; it does not maintain a duplicate product/asset catalogue or persistent storage mapping. The mechanism that physically assembles the ZIP (for example, a worker executing a CON-orchestrated task), temporary archive registration/location, secure asset access references and the exact TTL/cleanup policy remain open. Physical storage paths must not leak into the public UI contract.

Archive contents must be based on the **actual lineage** of the result, not merely the planned execution graph.

## 7. Visualization and multiple layers

SCI provides product representations for map visualization and analytical plots/time series. For a specific computed result, the route is GAT → CON → SCI: CON verifies access rights before requesting the representation, then the result returns through CON and GAT to UI. The direct GAT ↔ SCI interface is limited to the scientific product catalogue and its theoretical input requirements.

The user should be able to display and overlay multiple product layers. Visual overlay is not equivalent to scientific harmonization or proof that products are directly comparable. Native resolution, spatial support, temporal support and any representation transformations remain explicit.

## 8. Execution and messaging mechanisms

- Workers may execute long-running L0 ingestion, scientific computation and archive-generation tasks. They are mechanisms, not logical components.
- NATS is a candidate internal messaging transport, not a logical component and never a UI-facing interface.
- User-facing API policy: an operation expected to take more than **5 seconds** is exposed asynchronously from the start. GAT returns a request reference and current state; UI retrieves state and the eventual outcome through REST. Notifications are optional refresh mechanisms; REST remains the source of truth. This policy does not determine whether the internal work uses a worker, NATS or another mechanism.
- CON is expected to dispatch scientific computation to SCI through an asynchronous interaction.
- SCI reports one business outcome to CON: success or failure, distinguishing scientific computation failure from asset-registration failure. The outcome does not carry a canonical asset-to-location mapping. CON queries CAT when it needs a canonical reference or current location. Completion transport (for example a durable NATS event) remains undecided. A key concern is avoiding lost completion notifications if CON is unavailable; durability, acknowledgement, correlation, idempotency and recovery must be examined in the contract/execution design.
- Computation progress is not a required SCI → CON business notification. Use technical observability (traces or a workflow visualizer) to inspect execution progress.
- The precise CAT ingestion dispatch and outcome-notification mechanism also remains to be specified.

## 9. Decisions still open

1. **Request state and cancellation:** exact proposal-preparation/infeasibility states, cancellation outcome semantics, and how CON reconciles cancellation with already-running ingestion or computation.
2. **Failure recovery:** which failure categories are retryable, retry limits/backoff, idempotency, whether partially successful independent outputs remain available after an overall request failure, and cleanup or reconciliation of objects written to storage but not registered in CAT.
3. **Computation pricing:** how SCI's complexity information is converted into a computation cost, how CON aggregates it with CAT's L0 acquisition costs, and how actual cost is recorded.
4. **Messaging and reliability:** whether CON → SCI dispatch and SCI → CON completion use NATS or another mechanism; how durable delivery, retries, acknowledgement, correlation and idempotency are handled.
5. **CAT ingestion workflow:** how CON requests missing L0 ingestion, how partial/failed acquisition is reported, and how CON resumes the planned execution.
6. **Execution-plan representation:** whether CON stores a DAG, an ordered task plan or another representation; how shared dependencies are deduplicated and costed.
7. **Actual lineage semantics:** the exact metadata/version references CAT records for each generated product, including direct inputs actually consumed.
8. **Delivery implementation:** which execution mechanism assembles the ZIP, how CAT provides asset access, where the temporary archive is held, and its TTL/cleanup behavior.
9. **Storage backend:** S3-compatible object storage has been considered, but is not selected by this note.
10. **Visualization representations:** supported map/plot representations, bounded spatial/temporal retrieval and overlay limitations. The access route is established: GAT → CON for authorization, then CON → SCI for representation retrieval.
11. **Product and asset catalogue interfaces:** the criteria model, catalogue queries, product metadata and stable asset-reference/access contract.
12. **Identity and security contracts:** the authentication/trust mechanism, credential format, identity claims, trusted internal context representation and its integrity protection/propagation. ENG-15 establishes the required behavior; concrete choices belong to M0-E02-T03 and any necessary security ADR.

## 10. Reconciliation with existing component drafts

The existing first-draft component specifications contain assumptions that predate this refinement. In particular, the current SCI draft assigns scientific dependency-graph resolution and ingestion/calculation orchestration to the SCI Gateway. The current CON draft says CON does not resolve dependency plans, and the current CAT draft does not yet describe the full provider-pricing and concrete dependency-resolution responsibility captured here.

For this design, the decisions in this working note are the latest user-reviewed direction. The individual component specifications should be reconciled only after the component interaction model and matrix are reviewed. Do not silently treat the older draft statements as settled decisions or update the future contract schemas from this note alone.

## 11. Component Interaction Diagram

The diagram below shows the validated logical interaction boundaries and the main purpose of each direction. It contains exactly the five MEOGAP logical components. It does not prescribe REST routes, message topics, protocols, deployment units or execution mechanisms.

```mermaid
flowchart LR
    UI[UI]
    GAT[GAT - Public REST Gateway]
    CON[CON - Request and Delivery Orchestration]
    SCI[SCI - Scientific Processing]
    CAT[CAT - Data and Asset Catalog]

    UI -->|User operations| GAT
    GAT -->|REST responses| UI

    GAT -->|Request + trusted identity context| CON
    CON -->|Proposals, state and access outcomes| GAT

    GAT -->|Catalogue queries + caller/trace context| SCI
    SCI -->|Product definitions and input requirements| GAT

    CON -->|Scientific operations + trusted identity context| SCI
    SCI -->|Evaluation and computation outcome| CON

    CON -->|Dependency, ingestion and asset operations + trusted context| CAT
    CAT -->|Resolved assets, costs, ingestion outcomes and lineage| CON

    SCI -->|Product registration + request context| CAT
    CAT -->|Product registration confirmation| SCI
```

### Important interpretation rules

- **GAT ↔ SCI** is limited to the scientific product catalogue and theoretical input requirements. Visualization and analytical representations of a specific result follow **GAT → CON → SCI**, with the response returning through CON and GAT.
- **GAT ↔ CAT does not exist** in the validated model. User-facing asset and lineage operations are routed through CON.
- **CON ↔ SCI** covers scientific evaluation, computation-complexity estimation, computation dispatch and computation outcome. Progress monitoring is handled by observability, not by a required business notification.
- **CON ↔ CAT** covers concrete dependency resolution, itemized L0 acquisition pricing, ingestion coordination, canonical asset references and actual lineage.
- **SCI ↔ CAT** is limited to registering generated-product metadata and actual inputs, then returning registration confirmation. CAT does not supply input references directly to SCI; the path is **CAT → CON → SCI**.
- CON stores logical product/task identifiers and execution outcomes, not a duplicate mapping of products to canonical asset references or storage locations. When CON needs to use a product, it queries CAT for the current canonical reference and location.
- SCI writes generated outputs directly to object storage. CON reads objects directly from storage for delivery. Object storage is infrastructure, not a logical component in this diagram.

Workers, NATS, EO data providers and object storage are deliberately excluded from the component diagram. They may be shown as supporting mechanisms or external infrastructure in the relevant sequence diagrams, without being represented as peer logical components.

## 12. Failure and recovery sequence

The validated failure policy and its two distinct scenarios are documented in [Failure and Recovery](../sequence_diagrams/failure-and-recovery.md). It distinguishes scientific computation failure from CAT asset-registration failure, preserves already eligible independent work, and prevents false request completion.
