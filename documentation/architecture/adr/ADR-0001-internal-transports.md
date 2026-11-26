# ADR-0001 — Internal Component Transports for M0

**Status:** Proposed — not approved
**Date:** 23 November 2026
**Scope:** Physical transport for validated internal logical interactions

## Context

The validated component interaction design and matrix fix logical Sync/Async semantics, but explicitly leave the physical transport of internal interactions open. The current M0 repository scaffolding exposes provisional FastAPI REST surfaces for logical CON, SCI and CAT components. That scaffolding is useful for route and contract validation, but it must not be mistaken for an approved transport decision.

Relevant open decisions include:

- GAT ↔ CON request, access and delivery coordination;
- GAT ↔ SCI public catalogue access;
- CON ↔ SCI asynchronous evaluation, estimation, computation and harmonization;
- CON ↔ CAT dependency, acquisition, reference and lineage operations;
- SCI ↔ CAT registration operations and confirmations.

The matrix does not select REST, RPC, NATS or in-process calls for these interactions. Workers and NATS remain mechanisms, not logical components. The public UI ↔ GAT boundary is already REST.

## Current M0 position

- The public UI ↔ GAT boundary uses HTTP REST.
- Internal REST OpenAPI files are **provisional M0 scaffolding** only, used to exercise route and contract conformance.
- No internal transport is approved by this ADR.
- No NATS subjects or XML message contracts are introduced.
- The component interaction matrix and logical responsibilities are unchanged.

## Alternatives to evaluate later

1. In-process calls within a shared Python foundation.
2. Internal HTTP REST/RPC between separately deployed services.
3. NATS or another durable messaging transport for asynchronous interactions.
4. A mixed model where synchronous interactions use one mechanism and asynchronous interactions use another.

## Consequences

- M0 contract tests may validate provisional internal REST stubs, but they do not establish a production transport.
- Any future transport decision must preserve the validated logical interaction semantics and identity/context propagation requirements.
- A follow-up ADR must be approved before internal REST or NATS is treated as the selected architecture.

## References

- `documentation/architecture/system-interactions/component-interaction-design.md`
- `documentation/architecture/system-interactions/component-interaction-matrix.md`
- `documentation/specifications/eng.md` — ENG-15
