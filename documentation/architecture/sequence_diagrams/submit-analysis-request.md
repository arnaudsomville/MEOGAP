# Submit Analysis Request

**Status:** Validated sequence diagram — design baseline  
**Companion documents:** [Component Interaction Design](../system-interactions/component-interaction-design.md) · [Component Interaction Matrix](../system-interactions/component-interaction-matrix.md)  
**Last updated:** 12 November 2026

## Purpose

Describe the nominal lifecycle from the user's submission of an analysis request through feasibility/dependency evaluation and cost estimation, up to explicit confirmation or cancellation.

The evaluation and cost estimation are part of the submitted request. They are not separate pre-submission operations.

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
    UI->>GAT: Submit analysis request
    GAT->>CON: Create request and start proposal preparation
    CON->>CON: Persist request (proposal preparation pending)

    Note over UI,GAT: Public API policy: operations expected to take more than 5 seconds are exposed asynchronously. GAT returns a request reference and current state; UI follows state through REST. Notifications remain optional.

    CON->>SCI: Evaluate scientific feasibility and input requirements
    SCI-->>CON: Feasibility, constraints and scientific input requirements

    alt Scientifically infeasible
        CON->>CON: Record infeasibility outcome
        CON-->>GAT: Return request reference and infeasibility result
        GAT-->>UI: Display infeasibility result
    else Scientifically feasible
        CON->>CAT: Resolve scientific input requirements
        CAT-->>CON: Available assets, missing intermediate products and missing L0 acquisitions

        loop For each missing intermediate product
            CON->>SCI: Evaluate intermediate product and retrieve input requirements
            SCI-->>CON: Feasibility and input requirements
            CON->>CAT: Resolve intermediate product requirements
            CAT-->>CON: Available assets and further missing dependencies
        end

        opt Missing L0 acquisitions exist
            CON->>CAT: Request itemized acquisition costs
            CAT-->>CON: Cost per missing L0 acquisition
        end

        loop For each product planned for computation
            CON->>SCI: Request computation complexity estimate
            SCI-->>CON: Complexity and resource estimate
        end

        CON->>CON: Build and persist execution plan
        CON->>CON: Calculate total estimated cost
        CON->>CON: Set request state to PROPOSED

        CON-->>GAT: Return request reference, proposal and estimated cost
        GAT-->>UI: Display proposal and estimated cost

        alt User confirms
            User->>UI: Confirm proposed request
            UI->>GAT: Confirm analysis request
            GAT->>CON: Confirm request
            CON->>CON: Record acceptance
            CON->>CON: Set request state to IN_EXECUTION
            CON-->>GAT: Return updated request status
            GAT-->>UI: Display IN_EXECUTION
        else User cancels
            User->>UI: Cancel analysis request
            UI->>GAT: Request cancellation
            GAT->>CON: Request cancellation
            CON->>CON: Record cancellation and stop further orchestration
            CON-->>GAT: Return cancellation outcome and status
            GAT-->>UI: Display cancellation status
        end
    end

    Note over UI,CON: Cancellation can be requested at any request state except COMPLETED. This diagram shows the cancellation choice after proposal preparation for readability; cancellation during evaluation or execution is covered by the same UI-GAT-CON interaction. Stopping or reconciling already-running work is refined in the execution sequence and interface contracts.
```

## Validated decisions represented

- Submitting an analysis request starts the complete proposal-preparation path; no separate pre-submission feasibility or cost-estimate operation is required.
- CON persists the request before carrying out evaluation and dependency resolution.
- SCI returns scientific feasibility and scientific input requirements. CAT resolves those criteria to concrete assets and reports missing dependencies.
- CON recursively resolves requirements for missing intermediate products.
- CAT provides itemized costs for missing L0 acquisitions. SCI provides computation-complexity estimates; CON calculates the user-facing total estimate.
- The plan and estimate are stored with the request. Once the proposal is ready, the request enters `PROPOSED`.
- Confirmation is a separate explicit user action; CON then transitions the request to `IN_EXECUTION`.
- The user can request cancellation from any state except `COMPLETED`. CON owns cancellation of the request and the orchestration response.
- REST remains the source of truth for request status. Notifications may refresh the UI but are not required for correct operation.

## Notes and boundaries

- The exact name of the state used while proposal preparation is pending is not fixed here.
- The 5-second rule concerns the user-facing API behavior. It does not select a worker technology, messaging transport or internal synchronous/asynchronous protocol.
- The sequence intentionally does not prescribe REST endpoints, HTTP status codes, NATS subjects, worker topology or payload schemas.
- The precise behavior when cancellation races with an already-running acquisition or computation must be completed in the execution and failure/recovery sequences, then specified in interface contracts.
