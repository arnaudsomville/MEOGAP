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
    participant EO as EO Data Provider
    participant SCI
    participant S3 as Object Storage

    opt Missing L0 acquisitions exist
        CON->>CAT: Request acquisition and ingestion of missing L0 sources
        CAT->>EO: Acquire missing source observations
        EO-->>CAT: Return source observations
        CAT->>S3: Store source objects
        S3-->>CAT: Return initial object locations
        CAT->>CAT: Register L0 assets
        CAT-->>CON: Return ingestion outcome and canonical L0 asset references
    end

    CON->>CON: Update execution plan with available L0 references

    loop Until the execution plan is complete
        CON->>CON: Evaluate task dependencies and identify READY tasks

        alt One or more tasks are READY
            loop For each READY task
                CON->>SCI: Dispatch product computation with canonical input references
            end
            Note over SCI: SCI executes dispatched computations using workers. Independent READY tasks may run concurrently. Workers are execution mechanisms, not logical components.
        else No task is currently READY
            CON->>CON: Wait for an outstanding acquisition or computation outcome
        end

        opt A dispatched computation completes
            SCI->>SCI: Execute scientific computation in worker
            SCI->>S3: Write generated product object
            S3-->>SCI: Return initial object location
            SCI->>CAT: Register product metadata, initial location and actual input references

            opt CAT reorganizes the stored asset
                CAT->>S3: Move or reorganize product object
                S3-->>CAT: Confirm new object location
            end

            CAT->>CAT: Register product and actual lineage
            CAT-->>SCI: Confirm registration and return canonical asset reference
            SCI-->>CON: Return successful computation outcome and canonical product reference
            CON->>CON: Mark task SUCCEEDED and record canonical output reference
            CON->>CON: Reevaluate dependencies; newly unblocked tasks become READY
        end
    end

    CON->>CON: Verify all requested outputs have successful tasks and canonical registered references
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
- The exact granularity of CAT's L0 ingestion outcome is still open: CAT may report each acquisition independently or return a consolidated outcome. The sequence only requires CON to receive canonical references for each successfully registered L0 asset before dispatching dependent tasks.
- The sequence does not prescribe whether internal dispatch and completion use NATS, REST or another transport. It does not model workers as logical components.
- The precise concurrency limit, retry/backoff policy, duplicate-task prevention, idempotency and scheduler recovery behavior belong to interface/execution contract design.
- Object storage is infrastructure. SCI accesses input objects and writes output objects directly; CAT owns catalogue registration and canonical asset references. CON uses those canonical references to orchestrate dependencies.
