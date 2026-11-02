# SCI — Scientific Processing Component Specification

**Status:** Proposed first draft  
**Responsibility:** Scientific product semantics, processing, scientific feasibility and result characterization. SCI Gateway is an internal subcomponent for scientific planning and orchestration.

## Purpose
SCI defines product semantics, versions, methods, scientific quality interpretation and provenance. Within SCI, the SCI Gateway subcomponent answers whether a requested analysis is scientifically supported, resolves the product dependency graph, identifies required source ingestion and derived calculations, assesses reuse using scientific criteria and CAT metadata, estimates scientific complexity for CON, and publishes ingestion/calculation needs to NATS. Workers execute heavy acquisition/calculation tasks; SCI Gateway plans and coordinates them rather than performing long-running work in the request path. SCI and its subcomponents are logical responsibilities and do not mandate separate deployables; implementation may use meogap_core.

## In scope
- Product definitions, versions, supported inputs, parameters, outputs and documentation.
- Scientific transformations and dependency semantics.
- Scientific execution and result characterization.
- Provenance linking results to source/product versions, methods and parameters.
- Product-level scientific validation metadata, distinct from per-result quality metadata.
- Temporal filtering/selection of existing product observations and generation of result representations for visualization/analysis.
- Product-specific spatial operations, including explicit replaceable harmonization where required by the product/method.

## Boundaries
- SCI does not expose a public REST API; GTW is the unique public REST entry point. SCI exposes internal interfaces to GTW/CON as required and publishes internal task messages to NATS through its SCI Gateway subcomponent.
- SCI does not own physical asset lifecycle or discoverability; CAT is the proposed owner of asset registration and references.
- SCI does not own user-facing request history, request ownership/access rights, authentication sessions, request lifecycle, or credit ledger/admission policy.
- SCI does not infer scientific validity from successful technical execution.
- meogap_core is an implementation/library boundary, not the complete definition of SCI.
- SCI owns the scientific feasibility contract from M0; its SCI Gateway subcomponent provides a deterministic/mock plan initially, with real source ingestion and reusable dependency graphs introduced incrementally.

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
| SCI-009 | P1 | SCI shall define product-specific temporal support and apply supported UTC filters to existing product datasets, including recurring calendar subsets across multiple years (e.g. each summer in a ten-year window). Filtering selects existing observations; it does not by itself calculate new temporal aggregates. | M1–M2; deterministic contract/fixtures may be used in M0 | SYS-06, SYS-08a, SYS-08b, SYS-21 | Proposed |
| SCI-010 | P1 | SCI shall expose product-level scientific validation separately from the quality status of each result. | M1 | SYS-14a, SYS-14b, SYS-20 | Proposed |
| SCI-011 | P0 | SCI shall expose a versioned feasibility and complexity-estimation contract and a deterministic mock plan in M0. Its SCI Gateway subcomponent resolves product dependencies, assesses reusable results using scientific compatibility criteria and CAT metadata, and publishes required ingestion/calculation tasks to NATS as the Product Engine matures. CON consumes only feasibility/complexity and lifecycle-relevant outcomes, never the scientific dependency graph. Retained/reused intermediates must preserve lineage. | M0 feasibility/complexity contract and mock plan; full dependency resolution and result reuse M2 | SYS-04, SYS-10, SYS-19, SYS-31 | Proposed |
| SCI-012 | P2 | SCI shall define scientific compatibility criteria for product comparison and may implement the spatial/temporal harmonization or combination required by those criteria, preserving methods, units, resolution, coverage and limitations. | Later extension | SYS-09 | Proposed |
| SCI-013 | P2 | SCI may provide scientific inputs and evaluation logic to the Indicator Engine; monitoring indicators remain distinct from product definitions. | M4 | SYS-11 | Proposed |
| SCI-014 | P1 | SCI shall generate an appropriate derived representation from an existing product dataset for map/chart visualization or analytical access, applying the requested supported temporal and spatial filters. The representation shall remain linked to its source result and shall not replace the scientific dataset. The output format is selected through the representation contract based on the actual consumer needs; no specific raster/tile/image format is mandated here. | M0 synthetic representation contract; real dataset transformation/rendering M1–M2 | SYS-05, SYS-08a, SYS-08b, SYS-26, SYS-27, SYS-28 | Proposed |
| SCI-015 | P0 | SCI shall define spatial operations required by scientific products as explicit, replaceable product-processing steps, recording method, parameters, target support, aggregation/resampling semantics, coverage and native-resolution context. This requirement concerns product-side scientific operations, not a UI-only display transformation. | M0 contract and deterministic synthetic demonstration; first real operation M1 | SYS-29 | Proposed |

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
3. The SCI Gateway subcomponent initiates source-ingestion needs by publishing the corresponding request to NATS; which component consumes and executes each ingestion message remains an implementation/interface decision.
4. Does SCI report scientific outcome/quality before asset registration, or does CAT acknowledge registration first? The interface must preserve the distinction between scientific result metadata and physical asset registration.
5. The first real M1 product is NDVI. NDTI, FVC and LST remain later scientific candidates.
6. Which representation format(s) should SCI produce for map display and analytical access? Keep the contract format-neutral until concrete UI and data-access requirements justify a choice.
7. Which spatial operation is required by the first NDVI workflow, and what should remain a reusable SCI operation versus product-specific method logic?
