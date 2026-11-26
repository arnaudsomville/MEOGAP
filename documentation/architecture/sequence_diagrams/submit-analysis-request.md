# Submit Analysis Request

**Status:** Validated sequence diagram — updated synchronization decisions  
**Companion documents:** [Component Interaction Design](../system-interactions/component-interaction-design.md) · [Component Interaction Matrix](../system-interactions/component-interaction-matrix.md) · [Interface Contract Inventory](../system-interactions/interface-contract-inventory.md)  
**Last updated:** 20 November 2026

## Purpose

Describe the lifecycle from submission of an analysis request through scientific feasibility, dependency resolution and cost estimation, up to explicit confirmation or cancellation.

**Proposal preparation is asynchronous end-to-end.** It is not conditional on a five-second estimate. Feasibility, complexity estimation, dependency resolution and missing-L0 acquisition pricing are asynchronous internal interactions as well. Submission creates a persistent request; the proposal becomes available later through REST.

> **M0 implementation note.** This target sequence is not implemented in M0. The Gateway mock exposes `POST /analysis-requests → queued → processing → succeeded` without manual confirmation, as decided in [ADR-0005](../../architecture/adr/ADR-0005-m0-asynchronous-request-lifecycle.md). The sequence remains the reference for the CON/SCI integration milestone.

## Sequence

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant GAT
    participant CON
    participant SCI
    participant CAT

    User->>UI: Configure and submit analysis request
    UI->>GAT: UI-05 Submit request with authentication proof
    GAT->>GAT: Validate caller and derive trusted identity context
    GAT->>CON: GC-02 Create request and start proposal preparation
    CON->>CON: Persist request, owner identity and caller context in PREPARING state
    CON-->>GAT: Return persistent request ID and PREPARING state
    GAT-->>UI: Return request ID and PREPARING state

    CON->>SCI: CS-01 Async scientific feasibility and input-requirements request
    SCI-->>CON: CS-02 Async evaluation outcome (correlation ID)
    alt Scientifically infeasible
        CON->>CON: Record infeasibility outcome
    else Scientifically feasible
        CON->>CAT: CC-01 Async dependency-resolution request
        CAT-->>CON: CC-02 Async dependency-resolution outcome (including CC-03/CC-04 missing items)

        loop For each missing intermediate product
            CON->>SCI: CS-01 Async evaluation of intermediate product
            SCI-->>CON: CS-02 Async feasibility and input requirements
            CON->>CAT: CC-01 Async resolution of intermediate-product requirements
            CAT-->>CON: CC-02 Async available and missing dependencies
        end

        opt Missing L0 acquisitions exist
            CON->>CAT: CC-05 Async itemized acquisition-cost request
            CAT-->>CON: CC-06 Async cost per missing L0 acquisition
        end

        loop For each product planned for computation
            CON->>SCI: CS-03 Async computation-complexity estimate request
            SCI-->>CON: CS-04 Async complexity/resource estimate
        end

        CON->>CON: Build and persist execution plan
        CON->>CON: Calculate total estimated cost
        CON->>CON: Set request state to PROPOSED
    end

    loop Until proposal preparation reaches a terminal state
        UI->>GAT: UI-08 Retrieve request state and proposal (REST)
        GAT->>CON: GC-05 Retrieve request status (Sync)
        CON-->>GAT: Return current request/proposal state
        GAT-->>UI: Return current state; UI-17 proposal when ready
    end

    alt User confirms a feasible proposal
        User->>UI: Confirm proposed request
        UI->>GAT: UI-06 Confirm analysis request
        GAT->>CON: GC-03 Confirm request (Sync)
        CON->>CON: Atomically recheck balance, debit credits and admit execution
        CON-->>GAT: Return confirmation and IN_EXECUTION state
        GAT-->>UI: Display IN_EXECUTION
    else User cancels the request
        User->>UI: Cancel analysis request
        UI->>GAT: UI-23 Request cancellation
        GAT->>CON: GC-14 Request cancellation (Sync)
        CON->>CON: Record cancellation and stop further orchestration
        CON-->>GAT: Return cancellation outcome and current state
        GAT-->>UI: Display cancellation result
    end
```

## Interpretation

- UI-05/GC-02 immediately create a persistent request in proposal-preparation state and return its identifier/current state. Proposal preparation never blocks the initial public operation until feasibility or cost is known.
- CS-01/02 (feasibility/input requirements), CS-03/04 (complexity estimate), CC-01/02 (dependency resolution, including CC-03/04 details) and CC-05/06 (itemized missing-L0 acquisition costs) are asynchronous internal interactions. Their outcomes are correlated with the originating request/operation.
- CON owns recursive dependency planning. For every missing intermediate product, CON requests its scientific requirements from SCI, then asks CAT to resolve those criteria. CAT identifies available/missing assets; it does not orchestrate missing-product generation.
- CON combines the asynchronous SCI complexity estimates and CAT acquisition-cost outcomes to calculate the user-facing credit estimate. The pricing formula/rates remain open.
- The proposal or infeasibility result is persisted on the request and retrieved through REST. UI-17 is the asynchronous proposal outcome; UI-08/GC-05 provides the authoritative request-state retrieval path.
- Confirmation is a separate synchronous user action. CON atomically rechecks the current balance, debits credits and admits execution; an insufficient balance must not launch execution or leave a partial debit.
- Cancellation is a separate synchronous request and remains available in every request state except `COMPLETED`, including while proposal preparation or execution is ongoing.
- Each public REST operation validates caller identity at GAT; CON enforces request ownership. Notifications are optional refresh mechanisms; REST remains the source of truth.

## Validated decisions represented

- Proposal preparation is always asynchronous, with no conditional synchronous fast path.
- Feasibility and complexity estimation by SCI (CS-01/02 and CS-03/04) are asynchronous.
- Dependency resolution and itemized L0 acquisition pricing by CAT (CC-01/06) are asynchronous. CC-03/04 are details returned as part of dependency resolution, not independent dispatches.
- Product identity is the stable SCI product ID. SCI selects and records the actual definition/method version used; the caller does not supply a mandatory version selector for feasibility or estimate calls.
- The plan and estimated cost are stored with the request. A feasible completed proposal enters `PROPOSED`.
- Confirmation is synchronous and debit/admission is atomic.
- The 5-second ENG-03 rule remains applicable to other user-facing operations but does not create a conditional mode for this proposal workflow.
- Trusted caller identity/correlation survives deferred processing. The raw external credential is not forwarded indiscriminately or logged.

## Notes and boundaries

- The exact vocabulary for proposal-preparation, infeasibility and cancellation states remains open.
- The sequence classifies logical interactions only. It does not prescribe whether asynchronous exchanges use durable messaging, worker jobs, internal RPC plus callbacks, or another mechanism.
- Correlation, persistence, idempotency, bounded retries and recovery guarantees for all asynchronous sub-operations remain contract-design work.
- The precise behavior when cancellation races with an already-running acquisition or computation must be completed in the execution and failure/recovery sequences, then specified in interface contracts.
