# Execute Analysis

**Status:** Working sequence diagram — nominal execution flow  
**Companion documents:** [Component Interaction Design](../system-interactions/component-interaction-design.md) · [Component Interaction Matrix](../system-interactions/component-interaction-matrix.md) · [Submit Analysis Request](./submit-analysis-request.md)  
**Last updated:** 12 November 2026

## Purpose

Describe the nominal execution of a confirmed analysis request, from the acquisition/ingestion of missing L0 source data through dependency-aware scheduling, scientific computation, asset registration and final request completion.

The request is assumed to be in IN_EXECUTION state, with an accepted execution plan already persisted by CON.

## Sequence

```mermaid
sequenceDiagram
    participant CON
    participant CAT
    participant EO as EO Provider
    participant SCI
    participant S3 as Object Storage

    CON->>CAT: Request missing source ingestion
    CAT->>EO: Acquire source observations
    EO-->>CAT: Return source observations
    CAT->>S3: Store source objects
    S3-->>CAT: Return object locations
    CAT->>CAT: Register L0 assets
    CAT-->>CON: Return ingestion outcome and L0 references

    CON->>CON: Update plan with available L0 references
    CON->>CON: Evaluate dependencies
    CON->>CON: Identify READY tasks
    CON->>SCI: Dispatch READY computations with input references

    SCI->>S3: Read input objects
    S3-->>SCI: Return input data
    SCI->>SCI: Execute scientific computations
    SCI->>S3: Write generated products
    S3-->>SCI: Return initial product locations
    SCI->>CAT: Register product metadata and actual input references
    CAT->>S3: Set canonical object location
    S3-->>CAT: Confirm object location
    CAT->>CAT: Register products and actual lineage
    CAT-->>SCI: Confirm registration and return canonical references
    SCI-->>CON: Return computation outcomes and canonical references
    CON->>CON: Record task outcomes and output references
    CON->>CON: Reevaluate dependencies
    CON->>CON: Identify newly READY tasks

    CON->>CON: Verify all requested outputs are registered
    CON->>CON: Set request state to COMPLETED
```

## Validated execution rules

1. **L0 acquisition precedes dependent calculations.** CON asks CAT to acquire and ingest missing L0 sources. CAT interacts with EO providers, stores the source objects and registers the L0 assets before returning canonical references to CON.
2. **CON owns dependency-aware scheduling.** CON evaluates the persisted execution plan and dispatches only tasks whose required input assets/products are available.
3. **Workers do not resolve scientific dependencies.** Workers are execution mechanisms, not logical components. CON dispatches eligible tasks to SCI for execution by workers; workers do not independently traverse the dependency plan or repeatedly requeue tasks whose dependencies are not ready.
4. **Independent READY tasks may execute concurrently.** CON dispatches all tasks currently eligible for execution without waiting for each task to finish before dispatching the next. Completion outcomes are received later; the diagram does not prescribe the internal transport.
5. **A generated intermediate product becomes available to dependent tasks only after CAT registration succeeds.** SCI writes the object to storage, sends CAT the computation metadata, initial location and exact input references actually consumed. CAT registers the product and actual lineage, may reorganize the stored object, and returns the canonical asset reference to SCI. SCI then reports the successful outcome and canonical reference to CON.
6. **CON reevaluates dependencies after outcomes.** When a task succeeds and its output reference is recorded, CON reevaluates the execution plan. Tasks that were previously blocked may become READY and be dispatched in the next scheduling pass.
7. **A task is considered SUCCEEDED only after successful asset registration.** Scientific computation success alone is insufficient to make the product available to downstream tasks.
8. **Request completion is verified.** CON moves the request to COMPLETED only when every requested output product has been successfully generated or otherwise satisfied by an already available asset, and the corresponding canonical CAT references are recorded. No required task may remain blocked, pending or running.

## Conceptual task states

The following state names illustrate the dependency scheduler's logical distinctions. Their exact vocabulary and persistence model remain to be defined in interface/contract design.

| State | Meaning |
|---|---|
| BLOCKED | One or more dependencies are not yet available. |
| READY | All required input references are available; the task can be dispatched. |
| RUNNING | The computation has been dispatched and is in progress. |
| SUCCEEDED | Computation and CAT asset registration succeeded; a canonical output reference is recorded. |
| FAILED | Computation or asset registration failed. |
| CANCELLED | The task will not be executed because the request was cancelled. |

The request can remain IN_EXECUTION while some tasks are BLOCKED and others are RUNNING. Task state and request state are separate concepts.

## Notes and boundaries

- The sequence covers the nominal path. Acquisition failure, computation failure, asset-registration failure, cancellation during execution and recovery are handled in the dedicated failure/recovery sequence.
- The diagram shows one scheduling pass. CON repeats dependency evaluation, dispatch and outcome processing until the execution plan is complete. If no task is READY while work remains outstanding, CON waits for an ingestion/computation outcome and reevaluates the plan; it does not repeatedly requeue blocked tasks.
- The exact granularity of CAT's L0 ingestion outcome is still open: CAT may report each acquisition independently or return a consolidated outcome. The sequence only requires CON to receive canonical references for each successfully registered L0 asset before dispatching dependent tasks.
- The sequence does not prescribe whether internal dispatch and completion use NATS, REST or another transport. It does not model workers as logical components.
- The precise concurrency limit, retry/backoff policy, duplicate-task prevention, idempotency and scheduler recovery behavior belong to interface/execution contract design.
- Object storage is infrastructure. SCI accesses input objects and writes output objects directly; CAT owns catalogue registration and canonical asset references. CON uses those canonical references to orchestrate dependencies.
