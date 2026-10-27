# MEOGAP — Development Roadmap

**Version:** 2.1-draft · **Date:** 2026-10-27 · **Status:** indicative, human-owned backlog; GitHub issues are created from this file.

**Intent:** A learning-driven scientific project, not a SaaS product plan. This file defines milestone outcomes, epics and indicative issue candidates; it is **not** an approved implementation plan, fixed deadline schedule or authorization for an agent to write code or create GitHub issues.

**Existing context:** `documentation/project_definition.md` v0.15 is the current requirements baseline; `README.md`, `AGENTS.md`, `agents/CODING_STANDARDS.md`, `agents/UNIT_TEST_GUIDE.md`, `agents/SOFTWARE_VALIDATION_PLAN.md` and the existing Make/Docker/CI template describe the working engineering foundations. See [Requirements migration notes](#requirements-migration-notes) for roadmap allocation decisions and any remaining differences with the v0.15 specification.

## 1. Agreed direction and guardrails

- **Science before platform breadth.** The Product Engine exists to study Earth observation, algorithms, data quality and validation. Domain examples are optional; do not turn the backlog into a fixed application catalogue.
- **A real existing monorepo.** Reuse `meogap_core` (Python library), `meogap_api`, `meogap_worker` and `meogap_ui` (React/Vite), existing Make/uv/npm tooling, Buildx Bake, GitHub CI and conventions. A new repository system is **not** a milestone deliverable.
- **Local-first only.** M0 needs Docker Compose for repeatable development and E2E tests. No production or hosted infrastructure is planned in M0–M5. Even M6 does not automatically imply deployment; hosted infrastructure remains optional.
- **Minimal M0.** One useful integrated AOI-based prototype, real HTTP/API boundaries, deterministic simulated Core, basic map/series UI and functional tests. No real user sign-in, ownership enforcement, credit ledger, robust persistence or production operations in M0.
- **First real science in M1.** Start with a small L1 product family (e.g. NDVI and a second well-defined index). Source access, validity masks, spatial treatment and validation must be scientifically explicit.
- **H3 is a candidate first spatial harmonization strategy.** Use a replaceable Spatial Harmonization Engine; allow H3 as an early common analysis support, while recording the approximation, native resolution, cell coverage, masks and method version. H3 does not constitute exact per-pixel raster registration, and aggregation order can affect nonlinear index results. A more precise raster strategy is learning-driven, not a prerequisite for M1.
- **Storage and representations are deferred decisions.** M0 defines logical product/request/result/representation contracts and a storage-independent access boundary. It does not choose Zarr, S3, a datacube schema, H3 storage or precomputed representations. Those choices require an ADR and, for physical storage, evidence from the first real product.
- **A representation is not a result.** Derived representations (common grid, H3 aggregation, extracted series, display image, archive) must link to their source result and record their transformation, support, resolution, coverage and known loss. A display image is never the sole persistent copy of a scientific result.
- **M2 proves processing depth.** A second L1 index does not establish the reusable multi-level engine. M2 must execute an L2 product depending on L1 (FVC-from-NDVI is the leading candidate), preserve intermediates and lineage, and expose SAU-based analyses.
- **UX follows science.** M0 minimal UI; M3 consolidates the scientific workspace once L1/L2 needs are concrete; M4 contains a dedicated Indicator UX research, prototype and initial builder consolidation epic.
- **Terminology.** `Indicator Engine` is the component; `Monitoring Indicator` is a configurable monitoring definition; `Indicator Evaluation` is its evaluated result. These are **not** MEOGAP scientific product levels. Retire the former `Proxy Engine` / `Proxy` names in new issues.
- **Priority is not delivery date.** The P0/P1/P2 requirement priority must be distinct from the target milestone. A partially implemented or simulated M0 capability is not fully verified simply because its parent requirement was originally tagged P0.
- **No agent autonomy assumed.** Tickets guide the human maintainer's research and decisions. Coding is supervised and only follows an agreed ticket-specific implementation and test plan.

## 2. Milestones at a glance

| Milestone | Goal | Epic count | Indicative ticket count | Exit demonstration |
|---|---|---:|---:|---|
| **M0 — Minimal Foundations** | A reproducible local prototype with a real UI → API → simulated Core → result → UI path; no real EO source. | 6 | 16 | Engineering foundation, not a miniature production platform. |
| **M1 — First L1 Scientific Products** | Real EO observations yield one or more scientifically specified L1 products; an initial spatial harmonization strategy (H3 candidate) is tested and qualified. | 6 | 13 | Native sensor data, quality masks and validation come before breadth. |
| **M2 — Multi-level Product Engine** | A real L2 product (FVC is the candidate) depends on L1 outputs through a reusable dependency graph, with intermediates, provenance and SAU analyses. | 5 | 12 | The milestone proves processing depth, not merely another L1 index. |
| **M3 — Platform & UX Consolidation** | Improve the full product-exploration experience and reinforce local services, identity, request execution, result management and testability. | 6 | 16 | Architecture and UX are informed by the actual M1–M2 scientific workflows. |
| **M4 — First Indicator Engine** | Define, configure, evaluate and understand real Monitoring Indicators built from scientific products; prototype and consolidate the initial visual configuration experience. | 5 | 13 | Indicator UX design is a first-class epic, not a by-product of API implementation. |
| **M5 — Advanced Monitoring Indicators** | Richer rule composition, temporal evaluation, monitoring history and progressive refinement of indicator UX; notifications are optional. | 4 | Not yet refined | Epic-level outline only; tickets are intentionally deferred. |
| **M6 — Secondary Platform & Scientific Extensions** | Rolling backlog (Minfinite) of optional secondary platform and scientific capabilities; epics may be promoted, deferred or dropped. | 11 | Not yet refined | No fixed exit; not a delivery milestone; no impact on M0–M5. |

Milestones have **no due dates**. M0–M4 are elaborated below as a first issue catalogue. M5 is an epic-only outline; M6 is an open rolling backlog (Minfinite); M7+ is an open exploration horizon.

## 3. Backlog and GitHub issue conventions

1. Create one GitHub **Milestone** for each active M0–M6 stage (M7+ optional). Create one GitHub **Epic issue** for each heading such as `[M1-E03] Spatial Harmonization Engine — H3 Candidate Strategy`, with the matching milestone. Create each `[M1-E03-T01] …` as a task/sub-issue of that epic. Do not invent extra tasks when generating issues from this file.
2. Preserve identifiers as stable planning keys; issue numbers assigned by GitHub are separate. If a ticket is removed, keep its identifier retired rather than silently renumbering later tickets.
3. All tickets start **Proposed / Backlog**. Promote a ticket to **Ready for implementation** only after the user has researched options, agreed the solution and explicitly reviewed an implementation plan and test plan. Neither a detailed ticket nor a roadmap milestone is authorization to start coding.
4. Issue titles, bodies, PRs and code-facing documentation use **English**; see [`agents/REPOSITORY_RULES.md`](agents/REPOSITORY_RULES.md). Avoid invented due dates, estimates, priorities, implementation classes or files. Type labels may express `research`, `design`, `implementation`, `validation` and `ux`.
5. Use the ticket format in [`agents/REPOSITORY_RULES.md`](agents/REPOSITORY_RULES.md); preserve identifiers, dependencies and native relationships. Existing ticket bodies remain valid and are migrated when refined; never auto-fill research, decisions or implementation plans as if decided.
6. Epic order and dependencies are guides, not a forced critical path. Research/prototyping can run in parallel. Update, split, merge, defer or close tickets when real scientific findings justify it; record the reason and traceability impact.
7. An agent asked to **create GitHub issues** may create issues and link them only when expressly instructed; it must **not** change source code, open PRs, commit, push or begin execution from the roadmap alone.

### Epic index (M0–M4)

| Milestone | Epic | Indicative tickets | Epic outcome |
|---|---|---:|---|
| M0 | **M0-E01** — Monorepo Tooling & Quality Integration | 3 | Reuse and complete the established monorepo tooling; only fill gaps that hinder M0. |
| M0 | **M0-E02** — Minimal Architecture & Contracts | 3 | Define the smallest end-to-end component boundaries and versioned data interchange needed for M0. |
| M0 | **M0-E03** — Frontend Foundations & Minimal UX | 3 | Build a coherent, intentionally small UI for the first local end-to-end journey. |
| M0 | **M0-E04** — Minimal Backend & Mock Product Engine | 3 | Exercise real API/Core boundaries and deterministic synthetic computation without integrating external EO providers. |
| M0 | **M0-E05** — Local Docker Compose Integration | 2 | Use the existing containerization and Make targets as a reliable local integration/test environment. |
| M0 | **M0-E06** — Functional E2E Validation | 2 | Make requirements-based functional testing part of normal local development from the first prototype. |
| M1 | **M1-E01** — EO Product Research & Scientific Specification | 2 | Select and properly specify a small family of scientifically meaningful L1 products. |
| M1 | **M1-E02** — Real EO Data Retrieval & Preparation | 2 | Make the first genuine source observations available to the scientific Core with faithful metadata and validity information. |
| M1 | **M1-E03** — Spatial Harmonization Engine — H3 Candidate Strategy | 3 | Develop a replaceable spatial harmonization abstraction and use H3 as a deliberately simple, qualified first candidate strategy. |
| M1 | **M1-E04** — First L1 Scientific Products | 2 | Implement a small, meaningful L1 product family over actual EO data. |
| M1 | **M1-E05** — Real Product Integration & Basic Exploration | 2 | Replace the synthetic demonstration results with scientifically grounded L1 outputs in the existing app journey. |
| M1 | **M1-E06** — Scientific Verification & Product Documentation | 2 | Conclude M1 with evidence of scientific meaning rather than only technical success. |
| M2 | **M2-E01** — Multi-level Product Model & Registry | 2 | Make the Product Engine generic across MEOGAP internal levels L0, L1 and L2+. |
| M2 | **M2-E02** — Dependency Graph, Intermediate Products & Lineage | 3 | Execute real product-on-product computations with pinned versions and reusable intermediate results. |
| M2 | **M2-E03** — First L2 Scientific Product — FVC Candidate | 3 | Use a meaningful scientific transformation of an existing L1 product to prove the new processing depth. |
| M2 | **M2-E04** — SAU Generation & Reusable Spatial/Temporal Analysis | 2 | Turn harmonized spatial supports (H3 candidate) into stable selectable analysis units and product time-series services. |
| M2 | **M2-E05** — Product Engine Generalization & Scientific Regression | 2 | Verify that multi-level processing is truly reusable and retains scientific interpretability. |
| M3 | **M3-E01** — Architecture & Contract Consolidation | 2 | Use actual L1/L2 implementations to address real design friction instead of theoretical architecture work. |
| M3 | **M3-E02** — Scientific Workspace UX Consolidation | 4 | Build an effective human workflow for understanding products, constructing requests and interpreting results. |
| M3 | **M3-E03** — Authentication, Sessions & User Ownership | 3 | Introduce real accounts after initial local scientific learning, while preserving clear ownership of persisted data. |
| M3 | **M3-E04** — Request Execution, State & Reliability | 3 | Harden the request lifecycle for real scientific computations and asynchronous execution on a local stack. |
| M3 | **M3-E05** — Credits, Results & Data Management | 2 | Complete deferred P0 transparency and retrieval functions in a local, auditable implementation. |
| M3 | **M3-E06** — Local Operations, Security & Integrated Verification | 2 | Consolidate local engineering reliability and confidence without creating a production deployment project. |
| M4 | **M4-E01** — Monitoring Indicator Concepts & Functional Model | 2 | Define Monitoring Indicators as configurations consuming scientific products, clearly distinct from L0–LN products. |
| M4 | **M4-E02** — Indicator UX Research & Visual Builder Design | 3 | Research and prototype an intelligible way to build, inspect and evaluate Monitoring Indicators. |
| M4 | **M4-E03** — First Indicator Evaluation Engine | 3 | Implement a small real evaluator consuming already calculated scientific products under defined simple rules. |
| M4 | **M4-E04** — Indicator API & Frontend Integration | 3 | Connect real indicator definitions and evaluations to the user experience designed in the dedicated UX epic. |
| M4 | **M4-E05** — Indicator Functional Validation & Usability | 2 | Demonstrate correct, interpretable and usable indicator behavior before adding advanced monitoring features. |

### Ticket types and acceptance levels

- **Research/design:** accepted with a documented comparison, decisions/open questions and planned experiment or ADR; *not* with placeholder code.
- **Implementation:** accepted with working behavior, narrow tests, documentation/contract changes and an explicit statement of simulated versus real components.
- **Validation/UX:** accepted with reproducible checks, actual observations and captured limitations. Scientific reference agreement is not automatically independent validation.
- **Maturity labels:** `real`, `mocked`, `visual-only`, `partial`, `deferred` describe the current implementation. Test coverage of a mock only validates that mock path.

## 4. M0 — Minimal Foundations

**Milestone objective:** a local, deterministic, browser-driven demonstration proving the existing monorepo can support UI → HTTP API → mocked Core → result → UI. The frontend offers a small coherent P0 subset, not all future features.

**Exit checks:** documented local start/reset; product catalogue; AOI and inclusive UTC range; actual API submission; synthetic completion/failure semantics; Requests display; simple mapped result and temporal series; explicit zero/missing/masked semantics; traceable functional browser smoke. No real auth, credit ledger, Indicator Engine or scientific result claims.

### [M0-E01] Monorepo Tooling & Quality Integration

**Objective:** Reuse and complete the established monorepo tooling; only fill gaps that hinder M0.
**Epic acceptance:** The documented Make/CI entry points exercise the relevant Python and frontend checks, including a meaningful cross-project change.
**Out of scope:** No repository migration, wholesale template rewrite, new CI platform or production pipeline.

#### [M0-E01-T01] Audit the Existing Monorepo and Record Only Actionable Gaps

- **Type:** research
- **Outcome:** Establish what already works in the project/component/library structure, Make targets, uv/npm dependency flow, Docker Bake and CI.
- **Research / decisions:** Inspect repository files and reproduce representative commands; look for obsolete template paths, root-level changes and impact of changes to shared libraries.
- **Evidence to accept:** A short evidence-based inventory states verified, missing and deliberately deferred items; no assumed refactor.
- **Dependencies:** —
- **Related requirements:** ENG-07, ENG-09

#### [M0-E01-T02] Complete TypeScript and React Quality and Unit-Test Conventions

- **Type:** implementation
- **Outcome:** Make frontend formatting, linting, typing and unit/component tests consistent with existing Make conventions.
- **Research / decisions:** Compare existing package scripts and configurations before selecting or changing ESLint, formatting, TS checks and a UI test runner.
- **Evidence to accept:** A representative failing lint/type/test is caught, valid checks pass through Make, and frontend standards are documented.
- **Dependencies:** M0-E01-T01
- **Related requirements:** ENG-07

#### [M0-E01-T03] Verify CI Coverage for Affected Projects and Root Changes

- **Type:** research/implementation
- **Outcome:** Ensure CI checks meaningful affected projects rather than silently missing changes to common code or tooling.
- **Research / decisions:** Study push versus pull-request triggers, dependency fan-out from meogap_core, root Make/Docker/workflow edits and CI behavior on no detected projects.
- **Evidence to accept:** Documented test cases show that changes trigger appropriate consumer checks; implement only justified fixes.
- **Dependencies:** M0-E01-T01
- **Related requirements:** ENG-07, ENG-09

### [M0-E02] Minimal Architecture & Contracts

**Objective:** Define the smallest end-to-end component boundaries and versioned data interchange needed for M0, including logical result/representation contracts and a storage-independent access boundary.
**Epic acceptance:** UI, API and mock Core agree on product/request/result/representation shapes and lifecycle semantics; the access contract does not expose the physical storage organization; all deferred requirements are explicit.
**Out of scope:** No speculative service decomposition, full product DAG, real identity model or complete future Indicator schemas. No physical datacube decision: Zarr, S3, versioned raster collections, H3 storage, partial-read implementation and precomputed representations are deferred. No persisted image per date.

**Architecture note (2026-10-27):** The logical model distinguishes a product definition, an analysis request, an immutable product result and a derived representation. A representation carries a link to its source result plus transformation, support, resolution, coverage and loss metadata. M0 may hold results in memory or temporary files, but consumers must access them through the same bounded, storage-independent contract that a later backend will implement.

#### [M0-E02-T01] Define M0 Reference Journey and Reallocate Requirements

- **Type:** design
- **Outcome:** Write down the single observable M0 demonstration and the real/mock/visual/deferred capability boundary.
- **Research / decisions:** Choose the initial AOI/UTC-window flow; map original P0 requirements to partial M0 demonstrations versus full M1–M4 delivery; identify essential negative cases. Allocate the new representation/storage/harmonization concepts explicitly as deferred or partially demonstrated rather than omitting them.
- **Evidence to accept:** A versioned acceptance checklist and allocation matrix exist; M0 does not claim full compliance with deferred P0 requirements; deferred storage, datacube, H3 and precomputed-representation decisions are listed.
- **Architecture note (2026-10-27):** The M0 journey must not require a specific storage layout, a per-date image or a physical H3 grid. Deferred items include Zarr, S3, common-grid resampling at scale, precomputed representations and the production Spatial Harmonization Engine.
- **Dependencies:** —
- **Related requirements:** SYS-01, SYS-02, SYS-03, SYS-05, SYS-06, SYS-07, SYS-12, ENG-07

#### [M0-E02-T02] Define Minimal Product, Request, Result and Error Contracts

- **Type:** design
- **Outcome:** Specify small cross-component interfaces for the M0 demonstration, including a logical representation descriptor and a bounded access contract that does not depend on physical storage.
- **Research / decisions:** Choose contract source and Python/TypeScript sharing or generation; model product ID/version, AOI, UTC range, request status, mapped result, simple series and missing/masked/valid-zero states. Decide the minimum result identity and provenance (result ID, version, product definition version, spatial scope, time window, native grid/resolution, limitations). Decide how a consumer requests a bounded time/AOI slice or a display representation without receiving a storage path. Define explicit request limits: spatial extent, period, pixel count, memory and response size.
- **Evidence to accept:** Examples and boundary tests demonstrate agreement between consumers and explicit errors; contracts are version-identifiable. The same consumer works against two interchangeable result backends (for example in-memory and file-backed) without contract changes. A temporal/spatial slice can be requested without loading the whole synthetic result. Missing, masked, unavailable and genuine-zero values remain distinct.
- **Dependencies:** M0-E02-T01
- **Related requirements:** ENG-01, SYS-01, SYS-03, SYS-07, SYS-26, SYS-27, SYS-30
- **Architecture note (2026-10-27):** Model four distinct objects: product definition, analysis request, immutable result and derived representation. A representation descriptor must include `representation_id`, `kind` (native, common-grid, H3, extracted-series, display-image, archive), `source_result_id` and version, transformation method/version, spatial support and resolution, coverage, missing-data rules and known loss. The API must not expose a physical path or assume Zarr, S3, raster files or an H3 store. M0 may load a tiny whole result internally, but the contract must already be slice-oriented.
- **Open decisions (2026-10-27):** Descriptor schema and identifier strategy; selector semantics (inclusive UTC window, bbox vs geometry, SAU selector); whether a representation is a separate API resource or an embedded descriptor; exact M0 limits; how provenance references the exact versioned method documentation.

#### [M0-E02-T03] Document Minimal Component Boundaries and Deferred Architecture Choices

- **Type:** design
- **Outcome:** Capture where UI, API, Core library and existing worker responsibilities sit in M0.
- **Research / decisions:** Decide whether mock execution is inline or worker-backed; how temporary request state works; how a later authenticated user context can be introduced without implementing login now. Record the storage/representation boundary and state that physical storage, datacube and harmonization choices are deferred.
- **Evidence to accept:** One short architectural decision record and component flow exist; all intentionally postponed choices are listed, including Zarr, S3, datacube schema, H3 storage, precomputed representations, partial-read implementation and the first harmonization backend.
- **Dependencies:** M0-E02-T01, M0-E02-T02
- **Related requirements:** ENG-01, ENG-03, SYS-26, SYS-27, SYS-29
- **Architecture note (2026-10-27):** The ADR must state the non-decisions explicitly. Any later decision that constrains product definitions, the access contract or the frontend requires its own ADR before becoming an architectural constraint. M0 uses in-memory/temporary storage; durable immutability and retention remain deferred.

### [M0-E03] Frontend Foundations & Minimal UX

**Objective:** Build a coherent, intentionally small UI for the first local end-to-end journey.
**Epic acceptance:** A user can choose the probe product and AOI, submit a request, inspect a synthetic result on the map and see a basic series.
**Out of scope:** No advanced Product Engine workbench, completed POI/LOI flows, Indicator builder or comprehensive UX polish.

#### [M0-E03-T01] Implement Minimal Application Shell, Catalogue and Map Context

- **Type:** implementation
- **Outcome:** Provide navigation, a clear demo catalogue and a usable spatial context in the existing React/Vite project.
- **Research / decisions:** Review current UI before adding components; choose minimal map interaction, loading/error states, attribution and distinction between basemap and results.
- **Evidence to accept:** Catalogue and map render reliably and are covered by appropriate UI/component tests.
- **Dependencies:** M0-E02-T02, M0-E01-T02
- **Related requirements:** FE-01, FE-17, FE-21

#### [M0-E03-T02] Implement AOI and Time-Window Request Composition

- **Type:** implementation
- **Outcome:** Let a user select or draw an AOI, select the demo product and submit a bounded UTC period.
- **Research / decisions:** Decide the simplest AOI control and valid geometry/time constraints; present precise validation errors; do not invent advanced spatial input capabilities.
- **Evidence to accept:** A valid request reaches the real local API with the expected geometry and inclusive UTC period; invalid input is rejected visibly.
- **Dependencies:** M0-E03-T01, M0-E04-T02
- **Related requirements:** SYS-02, SYS-03, FE-02, FE-16

#### [M0-E03-T03] Display Requests, Synthetic Map Results and Basic Time Series

- **Type:** implementation
- **Outcome:** Make the entire prototype demonstrable without pretending it is scientifically validated.
- **Research / decisions:** Choose a minimal Requests state display and map/time-series representation; distinguish zero, missing, masked and failure states; mark the probe as synthetic. Render the display representation on demand from the logical result, without persisting an image per date and without knowing the physical storage.
- **Evidence to accept:** A completed result can be selected from Requests and displayed; missing values remain gaps, not zeros; failure states are explicit; no per-date image artifact is required; native resolution and the synthetic/unvalidated status remain visible.
- **Dependencies:** M0-E03-T01, M0-E04-T02
- **Related requirements:** SYS-05, SYS-06, SYS-07, SYS-28, FE-03, FE-04, FE-05, FE-06
- **Architecture note (2026-10-27):** A display image is a derived representation, not the scientific result. It may be cached later, but M0 must work without a cache or a stored image per date.

### [M0-E04] Minimal Backend & Mock Product Engine

**Objective:** Exercise real API/Core boundaries and deterministic synthetic computation without integrating external EO providers.
**Epic acceptance:** A true HTTP request flows into a predictable Core adapter and returns a mapped, inspectable result with meaningful metadata.
**Out of scope:** No scientific product claims, real source access, complex job orchestration, credit ledger, multi-account security or durable recovery.

#### [M0-E04-T01] Create Deterministic Source and Probe Product Fixtures

- **Type:** implementation
- **Outcome:** Produce a repeatable synthetic product with spatial scope and multiple observation periods.
- **Research / decisions:** Design tiny fixtures with valid zeros, absent observations, masked samples, partial coverage and simple reference calculations; give the probe explicit synthetic/unvalidated metadata. Include native grid/resolution metadata and a representation descriptor so the fixture exercises the M0 contract rather than a storage-specific format.
- **Evidence to accept:** Identical inputs yield identical results and representation metadata; tests cover validity semantics and partial coverage; no remote provider is contacted; no per-date image is produced.
- **Dependencies:** M0-E02-T02
- **Related requirements:** CORE-02, CORE-03, CORE-04, CORE-05, SYS-07, SYS-27
- **Architecture note (2026-10-27):** Fixtures are synthetic source/result/representation examples, not a mini datacube. They must be swappable behind the access contract and must not assume Zarr, S3, H3 or a raster collection.

#### [M0-E04-T02] Connect Catalogue and Request API to the Mock Core

- **Type:** implementation
- **Outcome:** Use meogap_api and the importable meogap_core library to serve the prototype through real HTTP, returning a display-ready representation and its metadata without exposing the physical storage.
- **Research / decisions:** Choose minimal routes, input validation and request/result association; decide the storage-independent slice/representation endpoint (result ID + bounded period and AOI); reuse existing worker only if it simplifies this bounded path. An in-memory or temporary backend is acceptable in M0.
- **Evidence to accept:** A request submitted over HTTP produces a retrievable synthetic result through the Core boundary; a bounded time/AOI slice and a display representation are retrievable through the same contract; no storage path leaks; contract and integration tests pass and a backend swap does not change the consumer.
- **Dependencies:** M0-E02-T02, M0-E04-T01
- **Related requirements:** BE-01, BE-03, BE-05, BE-12, SYS-26, SYS-27, SYS-28
- **Architecture note (2026-10-27):** Endpoints may be minimal, but their shape must not encode a storage backend. Keep the logical selectors (result, period, spatial extent, representation kind) separate from any future Zarr/raster/S3 implementation.

#### [M0-E04-T03] Implement Minimal Request States and Transparent Failure Semantics

- **Type:** implementation
- **Outcome:** Give the prototype enough lifecycle behavior to test successful, rejected and failed analyses, including partial scientific availability.
- **Research / decisions:** Choose simple state transitions and error codes; expose unavailable periods and synthetic provenance; keep storage/retry guarantees explicitly outside M0. Distinguish `success`, `partial`, `unavailable`, `missing`, `masked` and `failed` semantics.
- **Evidence to accept:** Users and tests can distinguish success, invalid submission, processing failure, partial results and missing scientific observations; a successful request with no valid period for some dates remains visibly partial rather than failing or showing zero.
- **Dependencies:** M0-E04-T02
- **Related requirements:** SYS-07, SYS-12, BE-07
- **Architecture note (2026-10-27):** M0 does not guarantee durable immutability or version retention; it must not claim them. The states must remain compatible with the later immutable result/version model.

### [M0-E05] Local Docker Compose Integration

**Objective:** Use the existing containerization and Make targets as a reliable local integration/test environment.
**Epic acceptance:** A documented local stack starts, becomes ready, runs tests and resets reproducibly without remote infrastructure.
**Out of scope:** No Kubernetes, cloud provisioning, remote environments, HA, production secrets or production deployment.

#### [M0-E05-T01] Establish a Minimal Docker Compose Profile for Local E2E

- **Type:** implementation
- **Outcome:** Make local UI, API and any needed worker/storage start together from the existing build/run tooling.
- **Research / decisions:** Inspect actual Compose definitions; verify ports and health checks; consider a test profile that avoids decrypting external-service keys when mocks suffice.
- **Evidence to accept:** A clean checkout with documented local prerequisites can build and start the required stack, and a smoke check reaches UI and API.
- **Dependencies:** M0-E01-T01, M0-E02-T03
- **Related requirements:** ENG-04, ENG-06, ENG-09

#### [M0-E05-T02] Make Local Test State, Fixtures, Logs and Teardown Reproducible

- **Type:** implementation
- **Outcome:** Prevent test results from depending on leftover containers or mutable local state.
- **Research / decisions:** Decide fixture seeding, reset and cleanup strategy, log collection, failure artifacts and which state needs isolation.
- **Evidence to accept:** Two consecutive clean-stack runs produce equivalent test outcomes; diagnostics are available on a deliberate failure.
- **Dependencies:** M0-E05-T01, M0-E04-T01
- **Related requirements:** ENG-05, ENG-08, ENG-09

### [M0-E06] Functional E2E Validation

**Objective:** Make requirements-based functional testing part of normal local development from the first prototype.
**Epic acceptance:** A repeatable test drives the browser through the real local API and simulated Core, and reports traceable results.
**Out of scope:** No claim of scientific validation; no mandatory full P0 regression suite in M0.

#### [M0-E06-T01] Define M0 Functional Scenarios, Traceability and Test Harness Decision

- **Type:** research/design
- **Outcome:** Select an executable functional testing approach consistent with existing unit, regression and scientific validation policies.
- **Research / decisions:** Review the Behave + Playwright Python proposal, tags and fixture approach; define smoke, negative and validity scenarios with requirement IDs and explicit partial/mock statuses. Include a bounded-slice retrieval scenario, a representation-metadata scenario and missing/masked/partial/zero scenarios.
- **Evidence to accept:** Agreed scenarios and harness design cover the M0 reference journey with unambiguous expected outcomes, including storage-independent access and the absence of a per-date image requirement.
- **Dependencies:** M0-E02-T01
- **Related requirements:** ENG-07, SYS-03, SYS-05, SYS-07, SYS-26, SYS-27

#### [M0-E06-T02] Run Local Browser E2E Smoke Against the Compose Stack

- **Type:** implementation/verification
- **Outcome:** Exercise catalogue → AOI/request → API/Core mock → Requests → map/time series with a browser-driven test.
- **Research / decisions:** Decide fixtures, clean boot, screenshots/traces/logs, CI scope and failure policy; ensure calls are not replaced entirely by browser intercepts. Exercise the logical result/representation contract rather than a storage-specific shape.
- **Evidence to accept:** Clean runs pass repeatably, an intentionally failing path is observable, and CI runs an agreed smoke subset. The smoke demonstrates that the UI requests a bounded result slice/representation without knowing the storage backend and does not depend on a stored image per date.
- **Dependencies:** M0-E06-T01, M0-E05-T02, M0-E03-T03
- **Related requirements:** ENG-07, SYS-02, SYS-03, SYS-05, SYS-06, SYS-26, SYS-28

## 5. M1 — First L1 Scientific Products

**Milestone objective:** Real EO observations yield one or more scientifically specified L1 products; an initial spatial harmonization strategy (H3 candidate) is tested and qualified.
**Exit focus:** Native sensor data, quality masks and validation come before breadth.

**Spatial-method guardrail:** An H3-based harmonization/aggregation policy is an acceptable **first experiment** for selected products; it must be explicitly qualified. If a scientific operation requires native-grid calculations to preserve meaning, compute on the appropriate native/support grid and only then aggregate for SAU/display. The contract must not force a scientifically invalid operation.

**Exit demonstration:** At least two well-specified L1 products can be obtained through the common path from real EO inputs; each has reproducible scientific checks, validation documentation and explicit source/spatial-quality limitations.

### [M1-E01] EO Product Research & Scientific Specification

**Objective:** Select and properly specify a small family of scientifically meaningful L1 products.
**Epic acceptance:** At least one first product and one second L1 candidate have documented inputs, equations, assumptions and verification strategies.
**Out of scope:** No fixed application domain; NDVI, NDMI and a precisely specified NDTI are candidates, not irrevocable commitments.

#### [M1-E01-T01] Review and Select the Initial L1 Scientific Products

- **Type:** research
- **Outcome:** Choose a tractable first real satellite dataset and L1 calculation, plus a useful second L1 candidate.
- **Research / decisions:** Compare data accessibility, pixel resolutions, available QA masks, scientific meaning, expected learning and reference material; disambiguate NDTI before selecting it.
- **Evidence to accept:** A justified shortlist and an initial product sequence are documented with sources and open questions.
- **Dependencies:** M0-E06-T02
- **Related requirements:** SYS-01, SYS-14b, CORE-02

#### [M1-E01-T02] Specify Product Methods, Units, Parameters and Validation Evidence

- **Type:** research/design
- **Outcome:** Define what will be computed and how its correctness and limitations will be assessed.
- **Research / decisions:** Record band identities and processing levels, physical units, masks, valid ranges, temporal interpretation, versioning and scientific references.
- **Evidence to accept:** Product specs include inputs, outputs, assumptions, quality rules, test cases and preliminary reference comparisons.
- **Dependencies:** M1-E01-T01
- **Related requirements:** SYS-14a, SYS-20, SYS-22

### [M1-E02] Real EO Data Retrieval & Preparation

**Objective:** Make the first genuine source observations available to the scientific Core with faithful metadata and validity information.
**Epic acceptance:** A small real AOI/time slice can be fetched reproducibly and inspected, including acquisition identity, grids, masks and permissions.
**Out of scope:** No exhaustive provider support, planetary tiling or expensive bulk ingestion.

#### [M1-E02-T01] Research and Integrate the First Real EO Source Adapter

- **Type:** research/implementation
- **Outcome:** Replace the synthetic source for selected analyses with genuine remote-sensing observations.
- **Research / decisions:** Compare available source APIs and access modes, product levels, terms of use, time/area limits and local caching; implement only the selected narrow adapter.
- **Evidence to accept:** A repeatable bounded acquisition yields input data plus provenance and licensing context; failure conditions are surfaced clearly.
- **Dependencies:** M1-E01-T01, M0-E04-T02
- **Related requirements:** CORE-01, SYS-04, SYS-10

#### [M1-E02-T02] Preserve Source Grids, QA Masks, Availability and Missing Data

- **Type:** implementation
- **Outcome:** Carry source acquisition identity, coordinate system, band resolution, quality flags and native-grid context into processing and into the result/representation metadata.
- **Research / decisions:** Decide how to interpret cloud/no-data/invalid observations per provider; retain metadata needed by the spatial engine, scientific algorithms and derived representations. Decide the source/result artifact boundary without committing to a physical datacube layout.
- **Evidence to accept:** Source tests demonstrate correct mask propagation and distinguish measured zero from unobserved or invalid data; the native grid and resolution survive into the result/representation metadata.
- **Dependencies:** M1-E02-T01, M1-E01-T02
- **Related requirements:** SYS-07, SYS-20, CORE-05, CORE-03, SYS-27
- **Architecture note (2026-10-27):** A Zarr / partial-read prototype is deliberately deferred until after the first real product, so that its schema is informed by actual access patterns. M1 must preserve enough native metadata to evaluate that later without recomputing sources.

### [M1-E03] Spatial Harmonization Engine — H3 Candidate Strategy

**Objective:** Develop a replaceable Spatial Harmonization Engine and use H3 as a deliberately simple, qualified first candidate strategy.
**Epic acceptance:** One real multi-band example is handled through an explicit harmonization contract with a declared target support, weighting/coverage assumptions, preserved native resolution and validation against controlled cases.
**Out of scope:** Do not present H3 indexing as exact pixel co-registration, as a storage format, or as proof that grid refinement increases observational resolution. Do not decide the first backend by implication.

**Architecture note (2026-10-27):** This epic owns the *explicit spatial harmonization* responsibility, not multi-product scientific comparison. Keep three levels separable: native grid, harmonization operation and SAU. The engine records the method, parameters, target support, aggregation, coverage, missing-data rules and native-resolution context. Product definitions must not depend on H3 or on a particular library. The first backend, H3 level and weighting method remain open decisions.

#### [M1-E03-T01] Research the First Spatial Harmonization Strategy (H3 Candidate) and Define a Replaceable Interface

- **Type:** research/design
- **Outcome:** Specify the contract for transforming a source representation onto a common analysis support without locking the Core to H3 or to one backend.
- **Research / decisions:** Explore H3 level selection, centroid versus area-weighted mapping, CRS transformations, source/target GSD, mask rules, whether index-before/after-aggregation is appropriate, and how a common raster grid would compare. Define the input/output contract: source representation + target support + method + parameters → derived representation + metadata.
- **Evidence to accept:** An ADR states the chosen first-strategy approximations, expected errors, alternative raster implementations and the open decisions; examples are reproducible; the contract can be exercised with a non-H3 test double.
- **Dependencies:** M1-E01-T02, M1-E02-T02
- **Related requirements:** CORE-03, CORE-08, SYS-07, SYS-27, SYS-29
- **Open decisions (2026-10-27):** First backend; H3 resolution policy; centroid vs area-weighted assignment; whether to resample before or after index computation; how the engine reports coverage and information loss.

#### [M1-E03-T02] Implement the First Harmonization Strategy (H3 Candidate) with Mapping, Aggregation and Coverage

- **Type:** implementation
- **Outcome:** Provide a usable, explicit source-to-common-support path for the first products, including mixed native band resolutions if selected.
- **Research / decisions:** Handle cell assignment, optional weighting, partial cells, quality masks, native-resolution preservation and provenance of the spatial method; avoid hard-coding H3 into product formulas; keep the backend replaceable.
- **Evidence to accept:** Small synthetic tests and one real example produce interpretable, reproducible aligned/aggregated observations with explicit coverage and transformation metadata; the same operation can be invoked through the abstract contract.
- **Dependencies:** M1-E03-T01
- **Related requirements:** CORE-03, CORE-08, SYS-06, SYS-20, SYS-27, SYS-29

#### [M1-E03-T03] Quantify First-Strategy Spatial Error and Define the Improvement Threshold

- **Type:** research/validation
- **Outcome:** Measure how the initial strategy differs from an appropriate native-grid or raster-resampling reference.
- **Research / decisions:** Study boundary cells, sub-cell variation, ratio-of-means versus mean-of-ratios, mixed-GSD inputs, conservation/coverage behavior and cases where several H3 cells reflect one source observation rather than independent measurements.
- **Evidence to accept:** A documented comparison explains where the first strategy is acceptable, when it is not, which future tests must guard improvement work, and why H3 is or is not scientifically appropriate for each tested product family.
- **Dependencies:** M1-E03-T02
- **Related requirements:** SYS-07, SYS-20, CORE-08, SYS-29

### [M1-E04] First L1 Scientific Products

**Objective:** Implement a small, meaningful L1 product family over actual EO data.
**Epic acceptance:** At least one L1 result is scientifically specified and computed end-to-end; a second L1 product demonstrates a nearby but non-identical scientific path.
**Out of scope:** No requirement to build all indices or advanced L2/L3 methods here.

#### [M1-E04-T01] Implement and Verify the First L1 Product (NDVI Candidate)

- **Type:** implementation
- **Outcome:** Calculate the first elementary product independently from UI and provider-specific presentation code.
- **Research / decisions:** Use product specification, expected band semantics, safe denominator rules, source masks, units and controlled analytical examples.
- **Evidence to accept:** Scientific unit tests, source-to-product integration and documented metadata demonstrate a reproducible real result.
- **Dependencies:** M1-E01-T02, M1-E02-T02, M1-E03-T02
- **Related requirements:** CORE-02, CORE-05, SYS-04

#### [M1-E04-T02] Implement a Second L1 Product to Exercise Different Inputs

- **Type:** research/implementation
- **Outcome:** Add a second elementary product, potentially NDMI or a scientifically specified NDTI, without a second bespoke application path.
- **Research / decisions:** Choose an index with different useful characteristics (e.g. SWIR or quality/scale issues); reuse source and spatial abstractions; retain distinct method documentation.
- **Evidence to accept:** Both L1 products run via the same interface, with independent scientific tests and no algorithm-specific UI branching.
- **Dependencies:** M1-E01-T02, M1-E04-T01
- **Related requirements:** SYS-15, CORE-02, CORE-15

### [M1-E05] Real Product Integration & Basic Exploration

**Objective:** Replace the synthetic demonstration results with scientifically grounded L1 outputs in the existing app journey.
**Epic acceptance:** The user can request, inspect and plot genuine L1 results for a bounded area/period, with visible quality and scale context.
**Out of scope:** Advanced UX consolidation, full SAU selection and enterprise-grade request operations are postponed.

#### [M1-E05-T01] Integrate Real L1 Execution Through the Existing Request Path

- **Type:** implementation
- **Outcome:** Make real scientific results retrievable through the established API/request/result contract.
- **Research / decisions:** Connect chosen adapter, spatial operation and L1 algorithm without embedding scientific formulas in the API; preserve error semantics.
- **Evidence to accept:** A browser or API request yields a real L1 result with method/source identity and clear unvalidated/validated status.
- **Dependencies:** M1-E04-T01, M0-E04-T02
- **Related requirements:** BE-04, BE-05, SYS-04, SYS-05

#### [M1-E05-T02] Expose Real Map and Temporal Results with Validity and Coverage

- **Type:** implementation
- **Outcome:** Upgrade the minimal visualization to make actual observation periods and quality information understandable.
- **Research / decisions:** Define coherent output units, spatial scope and time bins; show native GSD, aggregation support, representation method and periods lacking observations. Generate the map/series representation on demand from the scientific result.
- **Evidence to accept:** A bounded real analysis can be mapped and its time periods inspected without confusing masked, missing or zero data; the displayed image is a derived representation, not a stored per-date artifact; native GSD and transformation context remain visible.
- **Dependencies:** M1-E05-T01, M1-E03-T02
- **Related requirements:** SYS-05, SYS-06, SYS-07, SYS-08a, SYS-27, SYS-28

### [M1-E06] Scientific Verification & Product Documentation

**Objective:** Conclude M1 with evidence of scientific meaning rather than only technical success.
**Epic acceptance:** Each delivered L1 product has a versioned method/validation record and reproducible reference or benchmark comparison.
**Out of scope:** Matching a reference product is evidence of agreement, not automatic independent scientific validation.

#### [M1-E06-T01] Compare L1 Outputs Against Reproducible Scientific References

- **Type:** research/validation
- **Outcome:** Evaluate numerical outputs on controlled examples and appropriate independent or published references where feasible.
- **Research / decisions:** Distinguish analytical tests, provider/reference-product comparisons, uncertainty sources and scientifically meaningful tolerances.
- **Evidence to accept:** Comparison results are repeatable and report agreement, discrepancies and limitations, including spatial V1 approximations.
- **Dependencies:** M1-E04-T01, M1-E04-T02
- **Related requirements:** SYS-14a, SYS-14b, CORE-09

#### [M1-E06-T02] Publish Versioned L1 Product Documentation and Validation Status

- **Type:** documentation
- **Outcome:** Document the method, bands, assumptions, quality, limitations, lineage and level for each supported product.
- **Research / decisions:** Define a minimally complete scientific validation record and status without equating HTTP success with validation.
- **Evidence to accept:** Catalogue and results link to versioned docs with an explicit scientifically justified validation status.
- **Dependencies:** M1-E06-T01
- **Related requirements:** SYS-01, SYS-10, SYS-14a, SYS-22

## 6. M2 — Multi-level Product Engine

**Milestone objective:** A real L2 product (FVC is the candidate) depends on L1 outputs through a reusable dependency graph, with intermediates, provenance and SAU analyses.
**Exit focus:** The milestone proves processing depth, not merely another L1 index.

**Depth criterion:** At least one L2 calculation must genuinely consume a versioned L1 product, execute dependencies and preserve complete provenance; adding another independent L1 formula does not satisfy M2.

**Exit demonstration:** An L2 product (preferably FVC) executes through a versioned L1 dependency, retains intermediate provenance, and supplies spatial-unit and AOI time series with coverage/validity semantics.

### [M2-E01] Multi-level Product Model & Registry

**Objective:** Make the Product Engine generic across MEOGAP internal levels L0, L1 and L2+.
**Epic acceptance:** Products are registered through versioned definitions and dependency declarations rather than special cases in orchestration.
**Out of scope:** Provider processing levels must remain distinct from MEOGAP levels; no plug-in marketplace needed.

#### [M2-E01-T01] Define a Versioned Registry for L0–LN Product Definitions

- **Type:** design/implementation
- **Outcome:** Express product identity, internal level, source dependencies, parameters, units, outputs and validation/documentation references.
- **Research / decisions:** Check which M1 contracts can be extended versus replaced; define compatibility/version policies without overdesigning arbitrary future science.
- **Evidence to accept:** Existing L1 products are registered unchanged scientifically; invalid or incompatible definitions are rejected.
- **Dependencies:** M1-E06-T02
- **Related requirements:** SYS-19, CORE-15, ENG-01

#### [M2-E01-T02] Formalize Product Parameters, Capabilities and Extension Boundaries

- **Type:** design/implementation
- **Outcome:** Allow a new level of product to declare required inputs and analytical capabilities through shared interfaces.
- **Research / decisions:** Study product-specific spatial/temporal constraints, source selection and supported output forms; avoid leaking engine-specific rules into UI code.
- **Evidence to accept:** One well-formed candidate L2 definition can be described and inspected using only the reusable registry/contract.
- **Dependencies:** M2-E01-T01
- **Related requirements:** SYS-15, SYS-19, CORE-15

### [M2-E02] Dependency Graph, Intermediate Products & Lineage

**Objective:** Execute real product-on-product computations with pinned versions and reusable intermediate results.
**Epic acceptance:** A requested L2 computation resolves its L1 dependency, stores lineage and avoids invalid reuse.
**Out of scope:** No fully distributed DAG scheduler; build only the local behavior required by demonstrated products.

#### [M2-E02-T01] Plan and Execute a Versioned Product Dependency Graph

- **Type:** design/implementation
- **Outcome:** Resolve dependency order, missing inputs and invalid cycles for L1→L2 chains.
- **Research / decisions:** Decide how to pin definitions/parameters and represent a DAG shared by dependencies; keep execution local and inspectable.
- **Evidence to accept:** A multi-stage computation runs in dependency order and tests reject cycles and incompatible inputs.
- **Dependencies:** M2-E01-T02
- **Related requirements:** CORE-07, BE-19, SYS-04, SYS-19

#### [M2-E02-T02] Persist and Reuse Compatible Intermediate Products

- **Type:** implementation
- **Outcome:** Avoid recomputing an unchanged compatible L1 intermediate when producing a derived L2 product.
- **Research / decisions:** Define compatibility keys for dataset versions, algorithms, parameters, spatial/temporal coverage and quality; ensure immutable result versions.
- **Evidence to accept:** Tests show reuse only when safe and new result/intermediate versions when relevant inputs or methods change.
- **Dependencies:** M2-E02-T01
- **Related requirements:** SYS-04, SYS-10, CORE-06, CORE-07

#### [M2-E02-T03] Expose End-to-End Scientific Provenance and Lineage

- **Type:** implementation
- **Outcome:** Keep sufficient links to reproduce and interpret an L2 output, including the chosen L1 intermediate, EO observations and any derived representation.
- **Research / decisions:** Determine minimum processing-run identity, source/algorithm versions, spatial method, validation/quality metadata across stages and the link from each representation to its source result. Decide how provenance references the exact version of the method documentation.
- **Evidence to accept:** An L2 result can be traced backward to its exact L1 version and source inputs, with no ambiguous overwritten history; every derived representation identifies its source result and transformation.
- **Dependencies:** M2-E02-T02
- **Related requirements:** SYS-10, BE-06, BE-19, BE-21, SYS-27
- **Architecture note (2026-10-27):** Lineage covers representations as well as products. A representation must not become an alternative provenance root.

### [M2-E03] First L2 Scientific Product — FVC Candidate

**Objective:** Use a meaningful scientific transformation of an existing L1 product to prove the new processing depth.
**Epic acceptance:** A documented FVC-like L2 result derives from pinned NDVI inputs and is tested scientifically, including boundary and invalid cases.
**Out of scope:** No Landsat thermal retrieval or LST promise in M2; FVC and emissivity relevance are only future scientific groundwork.

#### [M2-E03-T01] Review FVC Methods, Parameters and Scientific Applicability

- **Type:** research
- **Outcome:** Select and justify an FVC estimation method that actually uses an L1 NDVI dependency.
- **Research / decisions:** Review literature on NDVI-based pixel dichotomy or alternatives, calibration endpoints, saturation, clipping, land-cover assumptions and uncertainty.
- **Evidence to accept:** An explicit method specification, validity domain, source references and validation plan are agreed.
- **Dependencies:** M1-E06-T02
- **Related requirements:** SYS-14b, CORE-09

#### [M2-E03-T02] Implement FVC as a Versioned L2 Product Depending on NDVI

- **Type:** implementation
- **Outcome:** Exercise the new registry, dependency resolver and intermediate tracking through an actual L2 calculation.
- **Research / decisions:** Handle units, parameter validation, masks, boundedness and reproducibility; do not hard-code FVC as a special path in request handling.
- **Evidence to accept:** FVC runs from cached or computed NDVI through the common engine, with closed-form unit tests and full lineage.
- **Dependencies:** M2-E03-T01, M2-E02-T02
- **Related requirements:** CORE-02, CORE-07, CORE-15

#### [M2-E03-T03] Evaluate FVC Results and Document Scientific Limitations

- **Type:** research/validation
- **Outcome:** Compare the L2 result with relevant methods/data and make parameter sensitivity visible.
- **Research / decisions:** Investigate reference suitability, sensitivity to NDVI source quality, spatial aggregation order, vegetation/endmember assumptions and uncertainty.
- **Evidence to accept:** A scientific validation record documents agreement, failure cases and what cannot be inferred from FVC alone.
- **Dependencies:** M2-E03-T02
- **Related requirements:** SYS-14a, SYS-14b, SYS-20, SYS-22

### [M2-E04] SAU Generation & Reusable Spatial/Temporal Analysis

**Objective:** Turn harmonized spatial supports (H3 candidate) into stable selectable analysis units and product time-series services.
**Epic acceptance:** An AOI can be partitioned into SAUs and each unit can return correctly qualified values through time.
**Out of scope:** An advanced interactive map/plot experience comes in M3; H3 remains a replaceable strategy.

#### [M2-E04-T01] Generate Stable SAUs and Coverage-Aware Spatial Summaries

- **Type:** design/implementation
- **Outcome:** Expose H3-backed SAUs with stable identifiers and explicit AOI overlap/coverage semantics.
- **Research / decisions:** Define grid resolution policy, cell boundary behavior, polygon and raster intersection assumptions, null/quality rules, native resolution metadata, assignment method, aggregation method, prior resampling and coverage. Record that several H3 cells may reflect one source observation and are not independent measurements.
- **Evidence to accept:** Tests prove stable SAU identities, correct partial-coverage handling, reproducible summaries and complete spatial-method metadata for sample products; a smaller H3 cell is never presented as adding measured detail.
- **Dependencies:** M1-E03-T03, M2-E01-T02
- **Related requirements:** CORE-08, SYS-06, SYS-07, SYS-27, SYS-29
- **Architecture note (2026-10-27):** H3 remains a candidate analysis support, not a storage or processing format. SAU identity and spatial metadata must survive a future change of harmonization backend.

#### [M2-E04-T02] Provide SAU and AOI Temporal Series Across Product Levels

- **Type:** implementation
- **Outcome:** Generate comparable time series for a selected SAU or AOI summary for both L1 and L2 products.
- **Research / decisions:** Define UTC period inclusion, supported frequencies, missing periods and mixed-quality coverage; do not require the final M3 UI.
- **Evidence to accept:** The same identified SAU yields period-qualified series for NDVI and derived FVC, with missing/zero separation.
- **Dependencies:** M2-E04-T01, M2-E03-T02
- **Related requirements:** CORE-04, CORE-08, SYS-06, SYS-08a, SYS-21

### [M2-E05] Product Engine Generalization & Scientific Regression

**Objective:** Verify that multi-level processing is truly reusable and retains scientific interpretability.
**Epic acceptance:** The first L2 product extends the engine without duplicating unrelated L1 orchestration; reference and regression suites detect breaking changes.
**Out of scope:** No promise of a universally generic EO scientific platform or mandatory multi-sensor fusion.

#### [M2-E05-T01] Prove Extensibility by Exercising L1-to-L2 Product Addition

- **Type:** verification
- **Outcome:** Assess change impact when adding FVC and a small additional variant or parameterized dependency.
- **Research / decisions:** Track modifications to existing products, API/UI coupling and registry/runner logic; identify accidental product-specific switches.
- **Evidence to accept:** A documented extension exercise and tests show that L1 products remain unchanged and the general path supports L2.
- **Dependencies:** M2-E03-T02, M2-E02-T03
- **Related requirements:** SYS-15, CORE-07, CORE-15

#### [M2-E05-T02] Consolidate Scientific Quality, Regression Fixtures and Spatial V2 Backlog

- **Type:** research/validation
- **Outcome:** Turn M1–M2 scientific learnings into test coverage and prioritized potential improvements.
- **Research / decisions:** Recheck provenance, quality masks, deterministic regression references, first-strategy (H3 candidate) bias and situations needing precise raster co-registration.
- **Evidence to accept:** Scientific, regression and integration checks cover demonstrated product levels; any spatial V2 work is explicitly justified and deferred or scoped.
- **Dependencies:** M2-E05-T01, M2-E04-T02
- **Related requirements:** SYS-07, SYS-10, SYS-20, ENG-07

## 7. M3 — Platform & UX Consolidation

**Milestone objective:** Improve the full product-exploration experience and reinforce local services, identity, request execution, result management and testability.
**Exit focus:** Architecture and UX are informed by the actual M1–M2 scientific workflows.

**Local-only consolidation:** Authentication and owned data are introduced for sound session boundaries and tests, not as a step towards a planned public production deployment.

**Exit demonstration:** The local scientific workbench is usable for the supported spatial inputs, products and SAUs; two accounts are isolated, request execution is reliable, credits/downloads work, and integrated tests support these claims.

### [M3-E01] Architecture & Contract Consolidation

**Objective:** Use actual L1/L2 implementations to address real design friction instead of theoretical architecture work.
**Epic acceptance:** Component boundaries and contracts are simplified or strengthened with supported migration and regression paths.
**Out of scope:** No cloud deployment, artificial service splitting or infrastructure for hypothetical SaaS load.

#### [M3-E01-T01] Review M0–M2 Architecture with Real Scientific Workflows

- **Type:** research/design
- **Outcome:** Identify API/Core/worker/UI coupling, performance limits and duplication revealed by multiple scientific product levels, including whether the storage/access contract still fits real workflows.
- **Research / decisions:** Inspect actual code paths, ownership boundaries, contract proliferation, storage and data exchange; prefer minimal incremental change. Reassess the result/representation access contract and decide whether a Zarr, versioned raster collection or other backend prototype is justified.
- **Evidence to accept:** A prioritized decision log distinguishes necessary refactors from optional architecture ideas, with justifications; storage/representation decisions are supported by observed access patterns rather than speculative schemas.
- **Dependencies:** M2-E05-T01
- **Related requirements:** ENG-01, SYS-15, SYS-26, SYS-27, SYS-29
- **Architecture note (2026-10-27):** This is the natural point to revisit the deferred physical-storage decision after the first real product. No backend is selected by default.

#### [M3-E01-T02] Evolve Shared Contracts with Compatibility and Consumer Tests

- **Type:** implementation
- **Outcome:** Make product/request/result/representation contracts robust enough for authentication, ownership, advanced UI and future Indicators.
- **Research / decisions:** Define versioning policy, migration compatibility, API error conventions, representation descriptor compatibility and who tests cross-language changes.
- **Evidence to accept:** Contract upgrades have automated compatibility/consumer checks, including the representation/slice contract, without breaking existing L1/L2 reference journeys.
- **Dependencies:** M3-E01-T01
- **Related requirements:** ENG-01, SYS-17, SYS-26, SYS-27

### [M3-E02] Scientific Workspace UX Consolidation

**Objective:** Build an effective human workflow for understanding products, constructing requests and interpreting results.
**Epic acceptance:** The existing UI supports complete P0-relevant exploration of products and their SAU/time series, with meaningful validation of usability.
**Out of scope:** This is not the advanced Indicator builder; that has a dedicated M4 epic.

#### [M3-E02-T01] Review Scientific User Journeys and Define the UX Consolidation Scope

- **Type:** research/design
- **Outcome:** Identify friction in the real catalogue → request → results → interpretation workflow after M1/M2.
- **Research / decisions:** Review actual screens and workflows; evaluate map-first versus request-first navigation, discoverability, states and small-screen constraints if relevant.
- **Evidence to accept:** An annotated user-flow inventory and prioritized UX improvements exist, supported by functional scenarios.
- **Dependencies:** M2-E04-T02, M1-E05-T02
- **Related requirements:** FE-01, FE-03, FE-06

#### [M3-E02-T02] Refine Catalogue, Request Composer and Requests Views

- **Type:** implementation
- **Outcome:** Make real products, their constraints and request lifecycle easy to understand and use.
- **Research / decisions:** Study product documentation/availability, AOI/POI/LOI input support as scientifically relevant, parameter editing, status/errors, request history and helpful cost/quality labels.
- **Evidence to accept:** Users can discover products, supply supported AOI/POI/LOI inputs where applicable and manage real requests without ambiguous availability states.
- **Dependencies:** M3-E02-T01
- **Related requirements:** FE-01, FE-02, FE-06, FE-17

#### [M3-E02-T03] Integrate Map-Based SAU Selection and Spatial Exploration

- **Type:** implementation
- **Outcome:** Provide intuitive selection/inspection of H3 or other SAUs over displayed scientific results.
- **Research / decisions:** Evaluate map layering, cell highlighting, AOI summaries, spatial precision legends, partial coverage and future alternative SAU layouts.
- **Evidence to accept:** A user can select a stable SAU and see spatially correct values/metadata; native GSD is not mistaken for display resolution.
- **Dependencies:** M3-E02-T01, M2-E04-T02
- **Related requirements:** FE-03, FE-04, FE-15, FE-16

#### [M3-E02-T04] Consolidate Time-Series Charts, Quality and Provenance Presentation

- **Type:** implementation
- **Outcome:** Make source validity, algorithm versions, lineage and temporal evolution interpretable in the UI.
- **Research / decisions:** Choose chart treatment of absent/cloud-masked/zero points, confidence/quality labels, contextual docs and comparisons within current supported products.
- **Evidence to accept:** Real L1/L2 results expose meaningful periods, gaps, quality and scientific validation without falsely implying certainty.
- **Dependencies:** M3-E02-T03, M2-E02-T03
- **Related requirements:** FE-04, FE-05, FE-17, SYS-10

### [M3-E03] Authentication, Sessions & User Ownership

**Objective:** Introduce real accounts after initial local scientific learning, while preserving clear ownership of persisted data.
**Epic acceptance:** Two local test accounts are isolated throughout requests, results, downloads and Indicators-ready APIs.
**Out of scope:** No enterprise IAM, self-service registration, complex roles or public SaaS deployment.

#### [M3-E03-T01] Choose and Implement a Proportionate Local Authentication Approach

- **Type:** research/implementation
- **Outcome:** Add sign-in/sign-out and session identity without changing scientific Core algorithms.
- **Research / decisions:** Compare a small local auth approach with external identity providers; define session/credential handling and an identity context at the API boundary.
- **Evidence to accept:** Login/logout works locally, secrets are not committed, and unauthenticated restricted requests are rejected.
- **Dependencies:** M3-E01-T02
- **Related requirements:** SYS-18, BE-11, ENG-10

#### [M3-E03-T02] Introduce Ownership and Migrate Existing Local Request Data

- **Type:** implementation
- **Outcome:** Protect requests/results/derived data by their authenticated owner, including pre-auth M0–M2 data.
- **Research / decisions:** Decide migration policy for legacy single-user records and storage model; ensure Core receives trusted server-derived identity, not caller-spoofed ownership.
- **Evidence to accept:** Cross-account access to requests/results/artifacts fails; migrated historical records are accounted for and tested.
- **Dependencies:** M3-E03-T01
- **Related requirements:** SYS-12, SYS-17, SYS-18, BE-11

#### [M3-E03-T03] Validate Session Lifecycle and Ownership Boundaries End-to-End

- **Type:** verification
- **Outcome:** Exercise sign-in, sign-out, expired sessions and cross-account access across APIs and frontend.
- **Research / decisions:** Test URL redirect/back navigation, failed downloads, request events and direct API calls as a second account.
- **Evidence to accept:** Functional and API tests prove owner isolation and explicit session failure states.
- **Dependencies:** M3-E03-T02, M3-E02-T02
- **Related requirements:** FE-10, FE-18, SYS-18

### [M3-E04] Request Execution, State & Reliability

**Objective:** Harden the request lifecycle for real scientific computations and asynchronous execution on a local stack.
**Epic acceptance:** Interrupted or repeated operations recover or fail explicitly; REST remains authoritative while UI statuses update automatically.
**Out of scope:** No distributed cluster scheduler or production uptime SLOs.

#### [M3-E04-T01] Persist Request States and Add Recoverable Worker Execution

- **Type:** implementation
- **Outcome:** Move beyond ephemeral M0 processing to traceable durable request and execution state.
- **Research / decisions:** Assess actual need for the existing meogap_worker, local queue, persistence choice, bounded retries and interruption semantics.
- **Evidence to accept:** A request survives application restart or ends in an explicit recoverable failure; duplicate work is bounded.
- **Dependencies:** M3-E01-T01, M3-E03-T02
- **Related requirements:** ENG-02, ENG-03, SYS-12

#### [M3-E04-T02] Add Owner-Scoped Status Updates with REST Reconciliation

- **Type:** design/implementation
- **Outcome:** Update Requests automatically without making notifications a second source of truth.
- **Research / decisions:** Compare light polling, SSE and events; decide whether NATS is justified; account for reconnect and owner filtering.
- **Evidence to accept:** State changes appear without page reload; REST returns authoritative current state after reconnect and isolation tests pass.
- **Dependencies:** M3-E04-T01, M3-E03-T02
- **Related requirements:** SYS-16, BE-08, FE-08

#### [M3-E04-T03] Implement Safe Result Reuse and Idempotent Request Operations

- **Type:** implementation
- **Outcome:** Reuse compatible completed scientific artifacts and ensure repeated requests/actions do not corrupt state.
- **Research / decisions:** Define equivalence across product/dependency versions, AOI/time, parameters, quality and owner; evaluate transaction and retry semantics.
- **Evidence to accept:** Tests show incompatible results are not reused and repeated processing does not duplicate terminal results or owner-visible events.
- **Dependencies:** M3-E04-T01, M2-E02-T03
- **Related requirements:** SYS-04, SYS-10, ENG-02

### [M3-E05] Credits, Results & Data Management

**Objective:** Complete deferred P0 transparency and retrieval functions in a local, auditable implementation.
**Epic acceptance:** Costs and balances have reliable records; users can download final results or interpretable provenance archives.
**Out of scope:** Credits are an internal accounting abstraction, not an external billing integration.

#### [M3-E05-T01] Design and Implement Local Credit Estimation, Admission and Ledger

- **Type:** design/implementation
- **Outcome:** Expose estimated and actual credit costs and implement a versioned policy, including an unlimited-credit mode.
- **Research / decisions:** Study atomic admission, idempotent postings, failures/cancellations and balance interpretation; avoid money-payment concerns.
- **Evidence to accept:** Tests cover admitted/rejected requests, repeated events, ledger audit and accurate UI balance/cost display.
- **Dependencies:** M3-E03-T02, M3-E04-T01
- **Related requirements:** SYS-24, SYS-25, BE-10, FE-11, FE-14

#### [M3-E05-T02] Consolidate Immutable Result Artifacts and Provenance Downloads

- **Type:** implementation
- **Outcome:** Allow final-only download and an optional archive of intermediates/sources when permitted, built from the actual lineage of the result.
- **Research / decisions:** Choose local artifact format, storage/versioning, source licensing, directory tree/provenance manifest and authorization enforcement. Decide which source observations are copied and which are referenced unambiguously instead of being duplicated. Compare archive formats that preserve provenance.
- **Evidence to accept:** A completed owner-scoped request downloads the expected immutable artifact and optional auditable archive; the archive contains only the real lineage (not every file associated with the product), forbidden access fails, and referenced sources remain resolvable.
- **Dependencies:** M3-E03-T02, M2-E02-T03
- **Related requirements:** SYS-10, SYS-13, SYS-23, BE-09, BE-21, SYS-27
- **Open decisions (2026-10-27):** Archive format; manifest schema; copy-vs-reference rule for sources; how documentation versions are pinned in the archive.

### [M3-E06] Local Operations, Security & Integrated Verification

**Objective:** Consolidate local engineering reliability and confidence without creating a production deployment project.
**Epic acceptance:** Local Compose, diagnostics, migrations and appropriately scoped CI/E2E suites cover the consolidated application.
**Out of scope:** Cloud hosting, Kubernetes, high availability and managed observability services remain outside M3.

#### [M3-E06-T01] Harden Local Compose, Configuration, Migrations and Diagnostics

- **Type:** implementation
- **Outcome:** Support realistic local API, worker, storage and UI operation with simple repeatable tooling.
- **Research / decisions:** Review health/readiness, configuration validation, local secret handling, schema migrations, structured logs and straightforward troubleshooting.
- **Evidence to accept:** From a clean local start the stack is diagnosable and restartable; data/migration and failure paths are verified.
- **Dependencies:** M3-E04-T01, M3-E05-T01
- **Related requirements:** ENG-04, ENG-05, ENG-06, ENG-12

#### [M3-E06-T02] Extend Functional, Contract and Security Regression Coverage

- **Type:** verification
- **Outcome:** Make the P0 consolidated platform checks reliable as daily or merge-blocking tests where practical.
- **Research / decisions:** Prioritize owner isolation, workflow failures, credits, downloads, recovery, contracts and CVE checks; retain heavier science validations on-demand.
- **Evidence to accept:** Local/CI suites report repeatable results with coverage-to-requirements and actionable failure artifacts; no silent P0 skips.
- **Dependencies:** M3-E03-T03, M3-E04-T03, M3-E05-T02, M3-E06-T01
- **Related requirements:** ENG-07, ENG-10, SYS-18

## 8. M4 — First Indicator Engine

**Milestone objective:** Define, configure, evaluate and understand real Monitoring Indicators built from scientific products; prototype and consolidate the initial visual configuration experience.
**Exit focus:** Indicator UX design is a first-class epic, not a by-product of API implementation.

**UX gate:** UX research and a prototype precede a committed builder implementation; a follow-up usability review closes M4 and informs M5.

**Exit demonstration:** A real Monitoring Indicator can be defined, evaluated and understood through the UI, with explicit inconclusive results for insufficient data; the visual-builder research and usability review produce a solid baseline for M5.

### [M4-E01] Monitoring Indicator Concepts & Functional Model

**Objective:** Define Monitoring Indicators as configurations consuming scientific products, clearly distinct from L0–LN products.
**Epic acceptance:** A minimal indicator definition/rule/evaluation model is agreed and can be represented through stable contracts.
**Out of scope:** Avoid the ambiguous term Proxy Engine and do not turn a configurable indicator into a new scientific product level.

#### [M4-E01-T01] Define Indicator Concepts, Inputs and Simple Rule Semantics

- **Type:** research/design
- **Outcome:** Specify what a Monitoring Indicator monitors and how it differs from Product Engine computations.
- **Research / decisions:** Study threshold, comparison, temporal window, AOI/SAU scope and possible multi-product conditions; define missing/uncertain/unavailable outcomes.
- **Evidence to accept:** A concise concept model and example indicators cover both valid and undecidable cases, with clear semantics.
- **Dependencies:** M2-E05-T01
- **Related requirements:** SYS-11, CORE-11

#### [M4-E01-T02] Specify Versioned Indicator Definitions and Evaluation Contracts

- **Type:** design
- **Outcome:** Describe configuration, pinned product references, validation, evaluation state and outputs independently of UI widget choices.
- **Research / decisions:** Check ownership, versioning, parameter schemas and constraint reporting; avoid implementing advanced expression languages now.
- **Evidence to accept:** Sample definitions can be validated and round-tripped, while invalid configurations produce understandable errors.
- **Dependencies:** M4-E01-T01, M3-E01-T02
- **Related requirements:** SYS-11, BE-14, ENG-01

### [M4-E02] Indicator UX Research & Visual Builder Design

**Objective:** Research and prototype an intelligible way to build, inspect and evaluate Monitoring Indicators.
**Epic acceptance:** A tested interactive design specifies the initial blocks/tools, editing behaviors, validation feedback and output explanations.
**Out of scope:** Do not assume a node editor or drag-and-drop before evidence; advanced composition can evolve in M5.

#### [M4-E02-T01] Research Indicator Creation Workflows and Candidate UI Patterns

- **Type:** research/ux
- **Outcome:** Determine which mental model makes configurable monitoring approachable to the intended user.
- **Research / decisions:** Compare forms, guided rules, visual blocks and node graphs for simple and moderately composed indicators; define representative user tasks.
- **Evidence to accept:** A reasoned UX decision and prioritized tool/block inventory exist, with initial usability hypotheses.
- **Dependencies:** M4-E01-T01, M3-E02-T01
- **Related requirements:** FE-07, SYS-11

#### [M4-E02-T02] Prototype Visual Indicator Configuration and Evaluation Preview

- **Type:** ux/prototype
- **Outcome:** Build a disposable or reusable interactive prototype to test creating, editing and previewing basic indicator rules.
- **Research / decisions:** Study source-product selection, thresholds, units, spatial scope, validation affordances, inspectability and error recovery.
- **Evidence to accept:** A user can complete representative tasks in a prototype without a real engine; design assumptions and compromises are recorded.
- **Dependencies:** M4-E02-T01, M4-E01-T02
- **Related requirements:** SYS-11, FE-07

#### [M4-E02-T03] Test Usability and Consolidate the Initial Indicator UX Specification

- **Type:** research/ux
- **Outcome:** Validate whether the initial builder is understandable before freezing its component design.
- **Research / decisions:** Run a small task-based review including missing-data, incompatible-input and condition-not-met cases; examine output interpretation.
- **Evidence to accept:** A prioritized UX specification and tested prototype are approved for initial implementation, with advanced concerns deferred to M5.
- **Dependencies:** M4-E02-T02
- **Related requirements:** FE-07, SYS-11

### [M4-E03] First Indicator Evaluation Engine

**Objective:** Implement a small real evaluator consuming already calculated scientific products under defined simple rules.
**Epic acceptance:** Evaluations are reproducible and distinguish false conditions from unavailable or invalid evidence.
**Out of scope:** No arbitrary user-executed code, heavyweight event engine or advanced alert platform.

#### [M4-E03-T01] Implement Simple Product-Driven Indicator Evaluation

- **Type:** implementation
- **Outcome:** Evaluate the first approved rule types against pinned product results and analysis supports.
- **Research / decisions:** Define evaluation resolution, per-period input selection, units, threshold comparison and input compatibility; start with deterministic fixtures and simple real examples.
- **Evidence to accept:** Controlled tests prove rule behavior and a real product-backed evaluation returns the expected outcome.
- **Dependencies:** M4-E01-T02, M2-E04-T02
- **Related requirements:** CORE-11, SYS-11

#### [M4-E03-T02] Propagate Missing, Masked, Low-Coverage and Invalid Evidence

- **Type:** implementation
- **Outcome:** Keep indicator outcomes scientifically honest when product evidence is incomplete.
- **Research / decisions:** Define evaluation states (e.g. triggered, not triggered, insufficient data, error) and reason codes; avoid treating absence as negative monitoring evidence.
- **Evidence to accept:** Tests show genuine zeros, masked inputs, unavailable periods and threshold equality are handled consistently.
- **Dependencies:** M4-E03-T01, M4-E01-T01
- **Related requirements:** SYS-07, SYS-20, SYS-11

#### [M4-E03-T03] Record Reproducible Indicator Evaluations and Input Provenance

- **Type:** implementation
- **Outcome:** Link an indicator run to the exact rule version, product versions, spatial support and time window.
- **Research / decisions:** Choose minimal persistence/history compatible with owner scope; document which intermediate evidence to retain for explanation.
- **Evidence to accept:** An evaluation can be inspected again and its outcome traced to versioned scientific inputs and rules.
- **Dependencies:** M4-E03-T02, M3-E03-T02
- **Related requirements:** SYS-10, SYS-11, BE-14

### [M4-E04] Indicator API & Frontend Integration

**Objective:** Connect real indicator definitions and evaluations to the user experience designed in the dedicated UX epic.
**Epic acceptance:** An authenticated user can create, inspect, edit and evaluate a basic Monitoring Indicator and interpret the result.
**Out of scope:** No advanced temporal rule composer or notification integration until M5.

#### [M4-E04-T01] Expose Owner-Scoped Indicator Definition and Evaluation API

- **Type:** implementation
- **Outcome:** Create/version/list/read indicator definitions, validate inputs and trigger/retrieve evaluations through REST.
- **Research / decisions:** Review stable schema/error handling, request origin and ownership; keep scientific evaluation in the engine, not the API.
- **Evidence to accept:** API tests cover valid/invalid rules, execution states, history visibility and cross-account denial.
- **Dependencies:** M4-E01-T02, M4-E03-T03
- **Related requirements:** BE-14, SYS-11, SYS-18

#### [M4-E04-T02] Implement the Initial Indicator Builder and User Workflow

- **Type:** implementation
- **Outcome:** Turn the validated M4 UX prototype into a maintainable UI integrated with real endpoints.
- **Research / decisions:** Reuse M3 design system, expose valid/invalid/incomplete states and keep configuration readable rather than adding unsupported widgets.
- **Evidence to accept:** A user creates and edits a basic indicator with clear feedback, and functional tests exercise the real API.
- **Dependencies:** M4-E02-T03, M4-E04-T01
- **Related requirements:** FE-07, SYS-11

#### [M4-E04-T03] Present Evaluation Results, Rules and Scientific Evidence

- **Type:** implementation
- **Outcome:** Show why an Indicator triggered, did not trigger or was inconclusive, including source product context.
- **Research / decisions:** Choose suitable map/series/summary displays based on actual output types and coverage; keep indicator outputs distinct from scientific raster layers.
- **Evidence to accept:** Users can inspect contributing products, rule versions, time/spatial context and uncertainty without misreading no-data.
- **Dependencies:** M4-E04-T02, M4-E03-T03
- **Related requirements:** SYS-11, SYS-20

### [M4-E05] Indicator Functional Validation & Usability

**Objective:** Demonstrate correct, interpretable and usable indicator behavior before adding advanced monitoring features.
**Epic acceptance:** End-to-end cases cover a real scientific product, a configured indicator and understandable evaluation results.
**Out of scope:** Alert reliability and complex compositional semantics are reserved for M5.

#### [M4-E05-T01] Validate Indicator Rules, Ownership and End-to-End Evaluation

- **Type:** verification
- **Outcome:** Prove that indicator configuration and execution are correct through unit, contract, API and browser scenarios.
- **Research / decisions:** Use deterministic rule cases and real pinned product samples; include invalid configurations, masked inputs, history and account isolation.
- **Evidence to accept:** A traceable E2E scenario exercises real UI→API→Indicator Engine→Product Engine results→UI and negative paths.
- **Dependencies:** M4-E04-T03, M4-E03-T02
- **Related requirements:** SYS-11, SYS-18, ENG-07

#### [M4-E05-T02] Conduct Final M4 Indicator UX Review and Capture M5 Improvements

- **Type:** research/ux
- **Outcome:** Check whether initial builder choices and interpretation tools work with real product-backed evaluations.
- **Research / decisions:** Observe editing errors, unintuitive blocks, default parameters, state explanation and reasonable extension needs.
- **Evidence to accept:** A reviewed UX baseline and prioritized M5 enhancement backlog exist, with unresolved scientific/UX questions explicit.
- **Dependencies:** M4-E05-T01, M4-E02-T03
- **Related requirements:** FE-07, SYS-11

## 9. M5 — Advanced Monitoring Indicators (epic outline only)

M5 is intentionally not ticketized yet; the M4 prototype, evaluation findings and usability review must shape its content.

| Proposed epic | Intended capability |
|---|---|
| **M5-E01 — Advanced Rule Composition** | Combine rule conditions and multi-product expressions with validated units and well-defined logical semantics. |
| **M5-E02 — Temporal Monitoring & Evaluation History** | Evaluate persistence, change and recurrence over time; inspect historical outcomes and changing input quality. |
| **M5-E03 — Advanced Indicator UX** | Evolve the M4 builder to support added complexity without sacrificing readability or scientific interpretability. |
| **M5-E04 — Optional Alerts & Notifications** | Add alerts only when compelling research or actual usage justifies their design and lifecycle. |

## 10. M6 — Secondary Platform & Scientific Extensions (epic outline only)

M6 is an open-ended rolling backlog (Minfinite), not a finite delivery milestone. It has no exit criteria or due date; epics may be promoted to a milestone, deferred, merged or dropped. No M6 tickets are created yet; candidate directions are illustrative, not commitments. M6 does not gate or block M0–M5.

| Proposed epic | Intended capability | Candidate directions (non-binding) | Prerequisites / guardrails |
|---|---|---|---|
| **M6-E01 — Hosted Infrastructure & Operations** | Deploy and operate MEOGAP in a hosted environment when local workflows no longer suffice. | Configuration and secrets, persistence, backups, access control, observability, cost boundaries. | Only if justified; no production SaaS commitment. |
| **M6-E02 — Elastic Execution & Resource Management** | Allocate and scale worker resources automatically while keeping execution bounded and recoverable. | Worker autoscaling, resource limits, queue/backpressure, cost-aware scheduling, failure recovery. | Only against demonstrated bottlenecks; local Docker Compose remains the default. |
| **M6-E03 — Automated Monitoring & Scheduling** | Schedule scene discovery and monitoring work without losing REST as the source of truth. | Scheduled scene discovery, automatic triggers, deduplication, freshness/coverage checks, optional notifications. | No guaranteed real-time monitoring; notifications remain optional. |
| **M6-E04 — External Access & MCP** | Expose controlled external access to existing services for agents and other consumers. | REST/MCP clients, authentication, authorization, audit, quotas, versioned contracts. | Reuse existing REST contracts; no arbitrary code execution; security review required. |
| **M6-E05 — Advanced Scientific Products** | Add physically based or literature-derived scientific products once their prerequisites exist. | Land surface temperature (Ermida et al. physical retrieval candidate), local turbidity/water optics, nighttime radiance, additional non-ML or literature-derived products. | LST cannot be inferred from NDVI alone; explicit units, uncertainty and validation; no health or causal claims. ML-based product generation is handled in M6-E10. |
| **M6-E06 — Monitoring Proxies & Change Detection** | Research indirect monitoring proxies and multi-source change detection without overstating evidence. | Mining-detection proxies, multi-source/cross-sensor change detection, anomalies, nighttime luminosity. | Indicators are not proof of cause, crime or illegal activity; document assumptions, sensitivity and limitations. |
| **M6-E07 — Scientific Quality & Spatial Methods** | Improve spatial treatment, uncertainty handling and scientific quality beyond the first harmonization baseline. | More precise raster alignment, uncertainty propagation, native-resolution preservation, validation improvements. | H3 remains selectable; only pursue when demonstrated limitations justify it. |
| **M6-E08 — Interoperability & Data Exchange** | Make products and provenance usable outside the original workflow. | Exports, metadata/provenance interchange, open formats, external consumers. | Align with versioned contracts; avoid format churn. |
| **M6-E09 — Performance & Cost Optimization** | Improve throughput and cost efficiency against measured limitations. | Caching, result reuse, profiling, bounded processing, cost visibility. | No premature scaling; measure before optimizing. |
| **M6-E10 — ML-Based Product Generation** | Generate scientific products using versioned machine-learning models and reproducible inference pipelines. | Land-cover classification; ground-level ozone estimation (e.g., He et al., 2024, XGBoost + SHAP); optional Prithvi-EO-2.0 (300M/600M) fine-tuning via TerraTorch/Hugging Face; model registry, provenance, spatial/temporal validation, uncertainty and interpretability. | Representative labels and ground-station data where required; spatial and temporal cross-validation; extreme-value bias; statistical proxy, not a direct measurement; no health or causal claims; GPU/compute, versioning, licensing and attribution; classical baselines first. |
| **M6-E11 — User-Trained Indicators** | Allow user-labeled examples to train, validate and apply learned monitoring indicators. | Positive/negative samples; classical ML first (Random Forest, gradient boosting, anomaly detection); guided training workflow; spatial/temporal validation; model registry; indicator integration; interpretability. | No auto-training without sufficient labels; learned indicators are not scientific validation; human approval required; keep indicator training separate from Product Engine; no causal or criminal claims. |

### M7+ — Open horizon

M7+ remains an open horizon for ideas not yet scoped, including further scientific products, cross-sensor fusion, improved aggregation and uncertainty, richer interoperability, and other capabilities justified by learning. It is not a commitment. Products may be explored earlier when scientifically ready; M6 and M7+ are not rigid gates for scientific curiosity.

## 11. Cross-cutting disciplines

| Discipline | Working rule |
|---|---|
| Scientific integrity | Preserve provider processing level separately from MEOGAP L0–LN. Keep units, native GSD, masks, invalid/missing/zero semantics, coverage, assumptions and quality/validation statuses explicit. |
| Spatial abstraction | Separate native grid, explicit harmonization operation and SAU. Keep H3 a selectable method, not a storage format or a resampling algorithm. Retain metadata sufficient to compare against a raster implementation later. Never imply that finer H3 cells add source measurements. |
| Storage & access | Keep the result access contract independent of the physical storage organization. Support bounded temporal/spatial slices. Defer Zarr, S3, datacube schema and precomputed representations until the first real product provides evidence; require an ADR before constraining the architecture. |
| Representations | A representation is derived, never a result. Link it to its source result and record transformation, support, resolution, coverage, missing-data rules and known loss. Display images are generated on demand or cached; they are never the sole copy. |
| Contracts | Prefer the minimum shared, versioned contract needed at each milestone. Changes affecting Python/TS consumers get coordinated compatibility tests. Any structuring decision not covered by an existing ADR requires a new ADR before becoming an architectural constraint. |
| Test taxonomy | Respect existing unit, non-regression, external scientific validation and benchmark categories in `SOFTWARE_VALIDATION_PLAN.md`; introduce functional browser E2E tests separately. |
| Local reproducibility | Prefer stable fixtures and bounded AOIs. The E2E Docker Compose stack is a development/test tool, not an operational service. |
| Security | No secrets in repo, images or logs. M0 must not expose an unauthenticated local backend publicly; authenticated authorization and user isolation arrive in M3. |
| Human-guided workflow | Scientific research → joint decision → implementation plan + tests → supervised coding → evidence. No automatic ticket-driven coding. |

## 12. Requirements migration notes

The current `project_definition.md` is **v0.15**. It now includes the representation, storage-independent access, bounded-slice, on-demand visualization and explicit-harmonization requirements (`SYS-26…30`, `CORE-16`, `BE-22` and related component clauses). The changes below remain **roadmap allocation decisions**, not silent edits to the functional requirements. Before adopting this roadmap as the sole authority, keep terminology and milestone allocation aligned while preserving requirement identifiers and scientific intent.

| Requirement theme / existing IDs | New intended delivery allocation |
|---|---|
| Catalogue, AOI, UTC submission, demo map/series (`SYS-01/02/03/05/06/07/08a/12`) | M0 **partial/mock-backed**, M1–M3 progressively real and complete (POI/LOI and full SAU UI when justified). |
| Real product computation/source/quality/validation (`SYS-04/14a/14b/20/22`, `CORE-01/02/05`) | M1 real L1 products and references; M2 generalized dependencies/quality. |
| Versioned registry, DAG, lineage, intermediates, SAU (`SYS-10/15/19/21`, `CORE-06/07/08/15`) | M2 engine capability; M3 hardening and full user presentation. |
| Requests, automatic updates, identity, downloads, credits (`SYS-12/13/16/17/18/23/24/25`) | M0 prototype only; full implementation and owner protection M3. |
| Representation, storage-independent access, bounded slices (`SYS-26/27/30`, `CORE-16`, `BE-22`) | Logical contract and simulated slice in M0; physical storage and partial-read implementation after the first real product (M1/M3), with an ADR. |
| On-demand visualization (`SYS-28`) | Principle in M0; real rendering and optional cache in M1/M3. No per-date image persistence. |
| Explicit harmonization and H3 as analysis support (`SYS-29`, `CORE-08`, `CORE-14`) | M1 first harmonization strategy (H3 candidate) and M2 SAU work; multi-product comparison remains P2/M6. |
| Archive from real lineage and reference-vs-copy sources (`SYS-23`) | M3 local archive implementation; format and manifest remain open decisions. |
| Configurable monitoring (`SYS-11`, `FE-07`, `BE-13/14`, `CORE-11`) | Rename Proxy → Monitoring Indicator; **no functional M0 placeholder**; initial real engine and UX M4, advanced capability M5. Revise old P0 requirements accordingly without changing identifiers silently. |
| Engineering (`ENG-01…14`) | Minimal contracts/CI/local Compose in M0; reliability, authorization, migrations, stronger gates in M3; advanced/remote operations only if justified later. |

**Important:** Keep the scientific and functional requirements authoritative for *intended behavior* until changed; use this roadmap for the newly agreed *delivery order*. Record any unresolved conflict in the issue rather than pretending the two source documents are already synchronized.

## 13. Backlog maintenance and change control

1. Use this document as the source for the **initial** GitHub issue batch **only when explicitly requested**. Do not begin any implementation as part of importing issues.
2. For each ticket, refine scientific evidence, proposed approach and tests with the project owner before marking it ready; keep all original ticket text editable.
3. Add, merge, split or retire issues freely when research changes the best path. Reflect accepted changes in the epic summary and requirement mapping without preserving an arbitrary ticket count.
4. Keep the project-definition requirements and agent guidance synchronized as a separate, reviewed documentation task; never infer scientific validation from a passing software test.
5. At each milestone exit, demonstrate the actual user/scientific outcome, record what is mocked/deferred, and update the next milestone based on what was learned.
6. Record any structuring decision not covered by an existing ADR in a new ADR before it becomes an architectural constraint. Do not let an implementation detail (storage backend, cube schema, H3 usage, archive format) silently become a product-definition or frontend requirement.

---

**Draft size:** 28 detailed epics and 70 indicative tickets across M0–M4; four M5 outline epics; eleven M6 outline epics and zero M6 tickets. All ticket IDs are unique and all declared ticket dependencies refer to entries in this document.
