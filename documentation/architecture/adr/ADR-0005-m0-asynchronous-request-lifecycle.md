# ADR-0005 — Asynchronous M0 Request Lifecycle Without Manual Confirmation

**Status:** Accepted — implemented in the M0 demonstration
**Date:** 26 November 2026
**Scope:** Public Gateway request contract, deterministic Gateway behaviour and Requests UI

## Context

The target architecture describes a proposal-oriented lifecycle where CON prepares feasibility and
cost, returns a proposal and waits for explicit user confirmation before execution. The M0 Gateway
does not integrate SCI/CON yet and was implementing a variant of that target lifecycle
(`PREPARING → PROPOSED → confirm → IN_EXECUTION → COMPLETED`). This created two problems:

1. a submitted request could remain blocked waiting for a manual confirmation that the M0 mock did
   not need;
2. the Gateway contract, the Gateway implementation and the UI had to agree on an artificial
   proposal state that is not part of the M0 functional decision.

The M0 functional decision is a simple asynchronous lifecycle:

```text
POST /requests -> queued -> processing -> succeeded
```

## Decision

1. The Gateway creates and persists the request synchronously, assigns an identifier and returns
   HTTP `201` with `state: "queued"`. No manual confirmation is required.
2. Subsequent REST reads (`GET /analysis-requests` and
   `GET /analysis-requests/{request_id}`) are authoritative and apply the time-based transitions
   `queued → processing → succeeded`.
3. A deterministic result is created and associated with the request when processing completes.
   The request response then exposes `result_id`.
4. `failed` is an explicit terminal state with a failure stage. `cancelled` remains available for
   queued or processing requests.
5. Queue and processing delays are configurable (`GATEWAY_DEMO_QUEUE_DELAY_SECONDS`,
   `GATEWAY_DEMO_PROCESSING_DELAY_SECONDS`, `GATEWAY_DEMO_DELIVERY_DELAY_SECONDS`) so the
   intermediate states are observable in tests and in the UI.
6. The `/analysis-requests/{request_id}/confirm` operation is removed from the M0 contract. The
   cost estimate endpoint remains informational and does not create a confirmation gate.
7. The UI polls REST while a request is non-terminal and recovers the real state from REST after a
   reload or reconnection. No real-time transport is introduced.

The future CON-owned proposal/confirmation workflow remains valid as a target architecture. When CON
and SCI are integrated, the public request contract must evolve with an explicit migration decision;
this ADR only fixes M0 behaviour.

## Consequences

- The Requests view shows a new request immediately.
- Tests can assert each intermediate state by controlling the injected clock and configured delays.
- The removed confirmation operation and proposal payload are breaking contract changes for M0
  consumers; the reference OpenAPI document, Gateway, UI and tests are updated together.
- A successful request still does not imply complete observations or scientific validation.

## References

- `documentation/architecture/sequence_diagrams/submit-analysis-request.md` (target architecture)
- `documentation/specifications/sys.md` — SYS-12, SYS-16, SYS-25
- `projects/meogap_interfaces/rest/gateway.openapi.json`
- `projects/gateway/src/gateway/core/demo/request_service.py`
