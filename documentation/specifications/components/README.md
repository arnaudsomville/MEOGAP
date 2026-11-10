# MEOGAP Component Specifications — First Draft

Status: Working draft for review  
Scope: UI, GTW, CON, CAT and SCI.

These documents establish the system baseline and initial component boundaries. They are not implementation authorization and do not settle every architecture decision. The system requirements are summarized in [sys.md](../sys.md), which points back to the authoritative requirements in `documentation/project_definition.md`.

## Documents
- [UI](ui.md) — user interaction and presentation.
- [GTW](gtw.md) — public REST gateway.
- [SCI](sci.md) — scientific product definitions, feasibility, processing and result characterization; SCI Gateway is an internal subcomponent for scientific orchestration.
- [CAT](cat.md) — data and asset catalog.
- [CON](con.md) — request management, ownership and access decisions.

## Requirement conventions
Each component has its own requirement table. IDs are newly proposed and may change before approval. Requirements are derived from current SYS requirements; multiple parent SYS requirements are allowed when justified.

- P0: essential to represent in the M0 journey; full target behavior need not be implemented in M0.
- P1: important target capability expected after M0, generally M1–M3.
- P2: later or optional capability.
- Target milestone means intended delivery of the complete stated behavior.
- M0 treatment belongs in the separate M0 journey/acceptance definition, not in each requirement row.
- Status is a drafting aid: Proposed, Open, or Needs decision.

Detailed REST/JSON schemas, message contracts and E2E test cases will be defined in follow-up work.

## Current assumptions

**Refinement notice:** The assumptions below are from the earlier first-draft component specifications. The broader component interaction design is maintained separately in [component-interaction-design.md](../component-interaction-design.md), with its detailed [component-interaction-matrix.md](../component-interaction-matrix.md). In particular, the current direction is that SCI defines scientific input requirements, CAT resolves those requirements to exact available product/acquisition instances and manages L0 ingestion, and CON recursively plans and orchestrates generation of missing scientific products. The individual component specifications have not yet been reconciled with this direction.
1. UI, GTW, CON, CAT and SCI are distinct logical responsibilities. SCI Gateway is a subcomponent within SCI, not a peer component. Workers are an execution mechanism; NATS is internal messaging infrastructure, not a public API or a business component.
2. GTW is the unique public REST API. No other component exposes a public REST API.
3. CON is responsible for request lifecycle/status, ownership/access rights, admission and cost tracking. It has no scientific knowledge and requests feasibility/complexity estimates from SCI through versioned interfaces. SCI internally uses its SCI Gateway subcomponent to orchestrate scientific dependencies. Logical components need not be separate processes or deployments.
4. Logical responsibilities do not imply separate processes, packages, containers or services.
5. M0 should provide broad, deterministic end-to-end foundations: real UI and explicit interfaces, with selected scientific behavior mocked.
6. Product-definition source files live in the repository; `meogap_core` implements reusable calculation primitives. The first real M1 product is NDVI.
7. SCI owns scientific result characterization and quality assessment. CAT registers physical assets and stores/exposes associated metadata, including quality metadata supplied by SCI. Asset-registration status remains distinct from scientific outcome/quality. CON consumes the relevant catalog metadata through an explicit interface and does not interpret scientific quality.
9. SCI Gateway publishes required source-ingestion requests to NATS. The consumer and execution mechanism are specified through the relevant internal contract rather than fixed by the component specification.
10. SCI applies product-supported temporal/spatial filters to existing product datasets and generates derived representations for visualization/analysis. GTW exposes these representations through REST; UI does not transform scientific datasets.
11. Spatial operations required by a scientific product are owned by SCI and are specified as explicit product-processing operations. They are not UI responsibilities.
12. SYS requirements remain the system baseline. Any SYS change is a maintainer decision and must be discussed and traced.
13. GitHub issues are the work-tracking authority. These documents describe intended behavior, not implementation tickets.

## Decisions deferred to the M0 contract ticket
The following are intentionally not resolved in these component specifications. They are in scope for [M0-E02-T03 — Identify M0 Interface and Contract Boundaries](https://github.com/arnaudsomville/MEOGAP/issues/38):
- Product-definition descriptor and versioned data models.
- Internal GTW/CON/SCI interfaces, including CON-owned request/access decisions and SCI-owned scientific feasibility/product operations.
- Deterministic M0 identity transport and propagation, explicitly distinct from production authentication.
- Public result-download behavior and its internal delivery mechanism.
- SCI-to-CAT hand-off for scientific result metadata, quality metadata and physical asset registration.
- SCI Gateway ingestion messages published to NATS and the consumer/execution interface.

These are contract-design tasks, not unresolved defects in the component responsibility model. The ticket may decide which questions need an ADR; do not pre-emptively freeze implementation details here.

## Review rule
Review each component with the user before treating its requirements as agreed. Resolve responsibility boundaries first. Create implementation tickets only after the relevant design is accepted.
