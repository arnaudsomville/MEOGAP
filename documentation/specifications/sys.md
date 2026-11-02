# SYS — System Requirements Baseline

**Status:** Reference snapshot for component-specification work  
**Source of truth:** `documentation/project_definition.md`, section 5.1, on this branch.  
**Purpose:** Make system-level intent easy to reference while deriving and reviewing component specifications.

This file is a navigational/specification view of the existing `SYS-*` baseline, not an independent authority. If this file and `project_definition.md` diverge, treat `project_definition.md` as authoritative and reconcile this document. Do not silently change, retire or renumber requirement IDs.

## Requirement interpretation

- **Priority** is not a delivery milestone. P0 means the capability must be represented in the M0 end-to-end demonstration, possibly through a real contract with mocked data/behavior or a deliberately partial implementation.
- **M0 treatment** describes the intended demonstration boundary, not full delivery of the requirement.
- **Target/full delivery** describes when the complete capability is intended to be implemented.
- Component requirements should reference one or more parent SYS IDs. A parent link establishes traceability; it does not imply the component requirement is fully delivered in the parent's milestone.
- A technically successful request does not imply complete observations, good result quality or scientific validation.

## System requirements

| ID | Priority | System requirement | M0 treatment / target for full behavior |
|---|---|---|---|
| SYS-01 | P0 | Expose a catalogue of supported scientific products with purpose, scientific context, processing level, inputs/outputs, spatial/temporal characteristics, units, limitations, documentation and scientific validation status. Catalogue support is distinct from result availability. | M0 synthetic product descriptor with explicit demo/unvalidated status; real metadata M1, reusable definitions M2. |
| SYS-02 | P0 | Let users define/select a supported spatial input (AOI, POI or LOI) within product constraints. For M0, all three are required; UI sends the original geometry and explicit buffer parameters, and the backend bufferises POIs/LOIs and treats the resulting geometry as an AOI downstream. | M0 all three input types through backend buffering; expand product-specific constraints later. |
| SYS-03 | P0 | Accept analysis requests with required product, spatial input, UTC period and parameters; reject invalid/incomplete requests explicitly. | M0 validated deterministic request through REST; source-specific validation later. |
| SYS-04 | P1 | Calculate a requested product and dependencies or reuse a compatible existing result using documented version, parameter, spatial/temporal, quality and access criteria. | M0 deterministic simulation only; real source/product M1, reusable dependency/reuse logic M2. |
| SYS-05 | P0 | Display a successful request result geographically, cropped to its spatial input, for a supported time window, through an action in Requests. | M0 synthetic result display; real product rendering M1. |
| SYS-06 | P0 | Select a point or zonal analysis (including an AOI summary) and inspect product evolution over time. Point selection sends latitude/longitude to the backend for local data/time-series retrieval; zonal analysis may return a statistic such as the mean. | M0 synthetic point extraction and zonal summary; real data/aggregation M1–M2. |
| SYS-07 | P0 | Distinguish valid values including true zeros, missing observations, masked/cloud-affected values and processing failures. | M0 fixtures/contracts; real source masks and quality handling M1. |
| SYS-08a | P0 | Filter results by inclusive UTC window `[start, end]` at date or month granularity. | M0 fixed supported granularity; product-specific temporal support M1–M2. |
| SYS-08b | P1 | Select recurring temporal subsets of an existing product dataset (e.g. summer observations for each of the last ten years) and generate an appropriate representation without implying new observations or temporal aggregation. | M0 contract may be demonstrated with deterministic data; real product-specific selection/representation M1. Statistical temporal aggregation is not implied. |
| SYS-09 | P2 | Compare/combine products with differing spatial and temporal characteristics through explicit harmonization. | Deferred; first explicit harmonization operation M1, broader comparison later. |
| SYS-10 | P0 | Make calculated results immutable/versioned on recomputation and expose lineage including sources, intermediates, method/version, parameters, period, spatial scope, quality, limitations and scientific validation. | M0 minimal synthetic result identity and request/product/scope/status; full lineage M2, hardening M3. |
| SYS-11 | P2 | Let users define monitoring indicators combining existing products and monitoring rules. | No functional engine/evaluation required M0; optional visual placeholder; initial engine/UX M4. |
| SYS-12 | P1 | Let authenticated users list their own requests, see current state and access results, cost and quality status. | M0 Requests view with deterministic demo identity/data; real authentication and ownership M3. |
| SYS-13 | P1 | Download a successful result as a final product with units and essential context. | Functional deterministic synthetic artifact download M0; real product download as real products arrive; provenance-based archive M3. |
| SYS-14a | P1 | Each supported product has a validation record with reference, metric, tolerance, observed result and status (validated/unvalidated), distinct from per-result quality. | M0 descriptor may state unvalidated; real record for first EO product M1. |
| SYS-14b | P1 | Document at least one comparison with a published method/reference product, or justify lack of a suitable comparison. | Not required for synthetic M0; first real method M1 where a reference exists. |
| SYS-15 | P1 | Add products and sources without redesigning the user experience. | M0 demonstrates an algorithm-independent product descriptor; reusable extensibility proven M2. |
| SYS-16 | P0 | Requests view reflects state changes automatically; current state remains retrievable through REST after reconnection. | M0 local deterministic updates and REST recovery; hardening later. |
| SYS-17 | P1 | Provide REST access to requests, statuses and results for authenticated/authorized consumers, scoped to caller data with caller identity and origin recorded. | M0 public contract without production auth claims; owner-scoped access/audit M3. |
| SYS-18 | P1 | Authenticate users, support sign-in/out and restrict access to each user's requests, results and derived data; support multiple accounts and propagate trusted identity. | No real auth/isolation M0; implement M3. |
| SYS-19 | P1 | Maintain versioned reusable product definitions with levels, supported spatial inputs/constraints, inputs, dependency graph/intermediates, parameters, outputs, documentation and validation. | M0 minimal descriptor; full definitions/dependency graph M2. |
| SYS-20 | P1 | Attach interpretable quality metadata to results and source observations, including status and possibly unknown quality index; select among sources by documented criteria. | M0 synthetic quality/missing fixtures; real source-quality handling M1, reusable selection M2. |
| SYS-21 | P1 | Define supported temporal frequencies and maximum periods for products and sources, including daily, monthly, annual, seasonal and custom definitions. | M0 fixed demo period; product-specific capability definitions M1–M2. |
| SYS-22 | P1 | Provide versioned product documentation covering purpose, method, inputs/outputs, units, assumptions, limitations, references and validation; verify completeness and expose status. | M0 document synthetic product and placeholder status; real quality-gated documentation M1 onward. |
| SYS-23 | P1 | Download final product alone or an archive including intermediates and source observations organized with provenance; archive follows actual lineage and may reference already stored sources. | No archive/real lineage packaging M0; real lineage-based archive M3. |
| SYS-24 | P1 | Estimate credit cost and check balance before admission; record decision, actual cost and balance changes under a configured policy. | Simulated estimate/balance/admission M0; real auditable/idempotent ledger M3. |
| SYS-25 | P0 | Show estimated cost before submission, actual cost after processing and current credit balance. | Deterministic demo values clearly labelled as simulated; authoritative ledger values M3. |
| SYS-26 | P0 | Expose storage-independent result access that can return bounded spatial/temporal slices without loading the whole result. | Define/exercise against small synthetic result M0; real partial reads after first real product and evidence/ADR. |
| SYS-27 | P1 | Link each derived representation to its source result and record transformation/version, spatial support/resolution, coverage, missing-data rules and known information loss/uncertainty. | Minimal synthetic descriptor/link M0; full lineage/coverage metadata M1–M2. |
| SYS-28 | P0 | Generate display representations on demand or from cache; do not require a persisted image per date, and never use a display image as the sole persistent scientific result. | Synthetic display representation M0; real rendering M1; no mandatory per-date image store. |
| SYS-29 | P0 | Define spatial harmonization as an explicit replaceable operation recording method, target support, aggregation, coverage and native-resolution context. H3 is not a storage format or raster resampling algorithm. | Contract and synthetic demonstration M0; first real harmonization M1; keep H3 aggregation distinct from raster resampling. |
| SYS-30 | P0 | Enforce explicit spatial, temporal, pixel-count, memory and response-size limits and reject unsupported requests clearly. | Small deterministic API limits M0; resource-aware limits as real processing arrives. |
| SYS-31 | P0 | Preserve distinct logical responsibilities for the unique public REST Gateway (GTW), request lifecycle/ownership/access/admission/cost (CON), scientific processing (SCI), Data Catalog (CAT), UI, Workers and internal NATS. CON has no scientific knowledge; SCI has no request-lifecycle or ownership responsibility. CON and SCI interact only through explicit versioned interfaces. SCI may contain internal subcomponents such as SCI Gateway for scientific orchestration; these are not peer system components by default. GTW routes external/UI requests through internal contracts; UI uses GTW and never accesses NATS directly. Logical roles do not imply separate deployables. | Document boundaries and demonstrate UI→GTW REST→CON/SCI interface flow→simulated NATS/worker processing→GTW REST result retrieval; capabilities are delivered incrementally. |

## Terminology and cross-cutting constraints

- **AOI/POI/LOI:** area, point or line spatial input to a request.
- **SAU:** spatial analysis unit for aggregation and time series; not a request input or native grid.
- **AOI summary:** aggregate over the AOI; not an SAU and not a claim of native resolution.
- **Native resolution:** source/product resolution; resampling does not create new measured detail.
- **Representation:** derived view of a scientific result (e.g. common grid, SAU aggregate, series, display image or archive), linked to its source result with transformation and information-loss context.
- **Missing / masked / zero:** absence of usable observation, quality-masked observation and genuine measured zero are distinct states.
- **Product validation:** scientific assessment of the method/product; distinct from per-result data quality and technical request success.
- **Request state, task state, acquisition state, asset availability and result quality:** distinct concepts that must not be collapsed into one status.
- **REST:** authoritative public interface for retrieving request state and results; notifications are only a convenience.
- **Storage:** physical storage technology/layout is not fixed by these requirements and must not leak into public contracts.
- **Logical boundaries:** GTW, CAT and SCI are responsibility boundaries, not mandatory separate services. Workers are execution mechanisms; NATS is internal transport.
