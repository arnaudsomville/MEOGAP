# SCI Gateway — Scientific Processing and Orchestration Specification

**Status:** Proposed first draft  
**Responsibility:** Scientific feasibility, dependency resolution, computation planning/orchestration, scientific product semantics and result characterization.

## Purpose
SCI Gateway is the internal scientific orchestration boundary. It answers whether a requested analysis is scientifically supported, resolves the product's dependency graph, identifies required source ingestion and derived calculations, looks for reusable compatible products using scientific criteria and CAT metadata, estimates scientific complexity for CON, and publishes ingestion/calculation needs to NATS. It owns product definitions and versions, scientific transformations, dependency semantics, scientific quality interpretation, and scientific provenance. Workers execute the heavy acquisition/calculation tasks; SCI Gateway plans and coordinates them rather than performing long-running work in the request path. Its implementation may use meogap_core and need not be a separate deployable.

## In scope
- Product definitions, versions, supported inputs, parameters, outputs and documentation.
- Scientific transformations and dependency semantics.
- Scientific execution and result characterization.
- Provenance linking results to source/product versions, methods and parameters.
- Product-level scientific validation metadata, distinct from per-result quality metadata.
- Temporal/value extraction semantics needed by supported products, coordinated with result-access contracts.

## Boundaries
- SCI Gateway does not expose a public REST API; GTW is the unique public REST entry point. SCI may expose internal interfaces to GTW/CON and publish internal task messages to NATS.
- SCI does not own physical asset lifecycle or discoverability; CAT is the proposed owner of asset registration and references.
- SCI does not own user-facing request history, request ownership/access rights, authentication sessions, request lifecycle, or credit ledger/admission policy.
- SCI does not infer scientific validity from successful technical execution.
- meogap_core is an implementation/library boundary, not the complete definition of SCI.
- SCI Gateway owns scientific feasibility and planning contracts from M0; dependency execution may be deterministic/mock in M0, with real source ingestion and reusable dependency graphs introduced incrementally.

## Component requirements

| ID | Priority | Requirement | Target milestone | Parent SYS | Status |
|---|---|---|---|---|---|
| SCI-001 | P0 | SCI shall provide a versioned product descriptor sufficient to understand purpose, processing level, supported spatial/temporal inputs, parameters, outputs, units, limitations, documentation and validation status. | M0 synthetic descriptor; real definitions M1–M2 | SYS-01, SYS-15, SYS-19, SYS-22 | Proposed |
| SCI-002 | P0 | SCI shall expose a stable processing contract that accepts a supported product version and validated inputs and produces a deterministic synthetic result for M0. | M0 mock execution; real EO computation M1 | SYS-03, SYS-04, SYS-31 | Proposed |
| SCI-003 | P0 | SCI shall provide result metadata distinguishing technical completion, per-result quality and product-level scientific validation. | M0 synthetic/unknown values; real assessment M1–M2 | SYS-07, SYS-10, SYS-14a, SYS-20 | Proposed |
| SCI-004 | P0 | SCI shall preserve requested spatial/time scope, parameters and product identity/version in result metadata without claiming synthetic values are scientifically validated. | M0 synthetic metadata; complete lineage M2 | SYS-03, SYS-10, SYS-27 | Proposed |
| SCI-005 | P1 | SCI shall define and version real products with documented methods, inputs, outputs, units, assumptions, limitations, references and validation status. | First real product M1; reusable definitions M2 | SYS-14a, SYS-14b, SYS-19, SYS-22 | Proposed |
| SCI-006 | P1 | SCI shall execute a pinned product definition reproducibly for identical method/version, inputs and parameters, and expose processing outcome and quality metadata. | First product M1; generalized behavior M2 | SYS-04, SYS-10, SYS-20 | Proposed |
| SCI-007 | P1 | SCI shall preserve provenance for each result, including source identifiers/versions, method/version, parameters, spatial/time scope, quality, limitations and validation status. | Basic provenance M1; full dependency lineage M2 | SYS-10, SYS-14a, SYS-20 | Proposed |
| SCI-008 | P1 | SCI shall distinguish missing observations, masked values, genuine zeros and processing failures in outputs and time series. | Synthetic contract M0; real masks M1 | SYS-07, SYS-20 | Proposed |
| SCI-009 | P1 | SCI shall define product-specific temporal support, UTC windows/frequencies and rules for producing values or series for supported analysis units. | M1–M2 | SYS-06, SYS-08a, SYS-21 | Proposed |
| SCI-010 | P1 | SCI shall expose product-level scientific validation separately from the quality status of each result. | M1 | SYS-14a, SYS-14b, SYS-20 | Proposed |
| SCI-011 | P0 | SCI Gateway shall expose a versioned feasibility and complexity-estimation contract and a deterministic mock plan in M0. As the Product Engine matures, it shall resolve versioned product dependencies, assess reusable results using scientific compatibility criteria and CAT metadata, and publish required ingestion/calculation tasks to NATS; CON consumes only feasibility/complexity and lifecycle-relevant outcomes, never the scientific dependency graph. Retained/reused intermediates must preserve lineage. | M0 feasibility/complexity contract and mock plan; full dependency resolution and result reuse M2 | SYS-04, SYS-10, SYS-19, SYS-31 | Proposed |
| SCI-012 | P2 | SCI shall define scientific compatibility criteria for product comparison and may implement the spatial/temporal harmonization or combination required by those criteria, preserving methods, units, resolution, coverage and limitations. | Later extension | SYS-09 | Proposed |
| SCI-013 | P2 | SCI may provide scientific inputs and evaluation logic to the Indicator Engine; monitoring indicators remain distinct from product definitions. | M4 | SYS-11 | Proposed |

## Interfaces
- Input: versioned product identity, validated parameters, spatial/temporal scope and source asset references.
- Output: processing outcome, result descriptor, scientific provenance/quality metadata and references to produced assets.
- Dependencies: CAT for source/derived asset discovery and registration; NATS for publishing ingestion/calculation needs; Workers for asynchronous execution.
- Not specified yet: product schema, processing message schema, registry implementation, dependency resolution protocol and result storage layout.

## Scientific guardrails
- Product validation is not per-result quality.
- A technically successful request may contain missing or masked periods.
- Missing values must not be silently replaced with zero.
- Native resolution, resampling/aggregation, coverage and limitations must remain interpretable.
- Recalculation must not overwrite an existing immutable result version.

## Open questions
1. What minimum product descriptor is needed in M0 without freezing the full Product Engine schema?
2. Should product-definition source files live in the repository while meogap_core implements reusable calculation primitives? Proposed: yes.
3. SCI Gateway initiates source-ingestion needs by publishing the corresponding request to NATS; which component consumes and executes each ingestion message remains an implementation/interface decision.
4. Does SCI Gateway report scientific outcome/quality before asset registration, or does CAT acknowledge registration first? The interface must preserve the distinction between scientific result metadata and physical asset registration.
5. Which first real product is selected for M1? NDVI is a candidate; NDTI, FVC and LST remain scientific planning, not requirements fixed here.
