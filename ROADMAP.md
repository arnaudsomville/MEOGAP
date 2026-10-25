# MEOGAP — Development Roadmap v1

**Status:** Draft derived from `documentation/project_definition.md` v0.13.
**Purpose:** Sequence learning-enabled capabilities, not fixed deadlines. The order may evolve as scientific interests and technical findings change.

## 1. Principles

- Scientific learning and validation come before feature accumulation.
- The Product Engine comes first; the Proxy Engine is a later capability.
- Internal L0–LN levels are not provider processing levels.
- Spatial representation is not fixed; H3 is a candidate, not a commitment.
- Missing, masked, invalid, and unobserved data are never silently treated as zero.
- Every supported product carries versioned documentation, provenance, quality metadata, and an explicit validation status.
- Technical decisions that do not change requirements belong in ADRs or tickets, not in the roadmap.
- Interfaces are frozen through versioned contracts, contract tests, and deterministic mocks before real providers are integrated.
- M0 proves the request workflow end to end with a technical probe, mock-backed core engines, and a minimal proxy placeholder; it does not require a real scientific product.

## 2. Milestones at a glance

| Milestone | Objective | Epics | Tickets | Exit outcome |
|---|---|---:|---|---|
| **M0** | Minimal product definition, architecture, mock engines, MVP UI, and first E2E exploration | 12 | To be refined | One authenticated, cost-aware, spatial-input request reaches a downloadable, mappable result through realistic contracts and mock engines. |
| **M1** | First real scientific product and analysis baseline | 6 | Refined at milestone entry | One real EO product is computed, analysed spatially and temporally, documented, and compared with a reference. |
| **M2** | Reusable Product Engine and richer analysis | 7 | Refined at milestone entry | A second product is added with limited impact; dependencies, intermediates, multi-source analysis, and quality are addressed. |
| **M3** | First configurable Proxy Engine | 3 | Refined at milestone entry | A first proxy can be configured and evaluated from mature products. |
| **M4** | Advanced Proxy Engine | 4 | Refined at milestone entry | Rules, temporal conditions, monitoring outputs, and optional alerts are supported. |
| **M5** | Optional advanced capabilities | 5 | Refined at milestone entry | Advanced scientific or platform capabilities are added when justified by learning needs. |

M0 is detailed first. M1–M5 are refined before each milestone starts. Ticket breakdowns are listed and validated before any commit that adds them.

## 3. M0 — Minimal product definition, architecture, and E2E

### 3.1 Goal

Prove the complete Product Engine path with a technical probe, deterministic mocks, a realistic backend architecture, and an early MVP UI. The scientific value of the probe is secondary; contracts, interfaces, workflow, provenance, quality semantics, recoverability, and UI foundations are the deliverables.

### 3.2 Epic sequence

The order below is intentional. Contracts and architecture come before the UI and engine implementations. The MVP UI is developed early, against contracts and mock APIs, to establish a usable interface base.

| Order | Epic | Objective |
|---:|---|---|
| 1 | **M0-E01 Product definition, documentation model, and test strategy** | Define the minimal probe product, spatial/temporal semantics, documentation and validation model, and functional test strategy. |
| 2 | **M0-E02 Backend architecture and service boundaries** | ADR comparing a modular monolith with split catalog, identity, and request-gateway services. Decide boundaries before freezing contracts. |
| 3 | **M0-E03 Contracts and product model** | Versioned shared contracts, product definitions, dependency graph, request/result/status/provenance/quality/validation/credit/proxy contracts, and engine interfaces. |
| 4 | **M0-E04 MVP UI** | Contract-first UI foundation: shell, navigation, catalogue, basemap, AOI/POI/LOI, request composer, credits, Requests view, live-update placeholder, downloads, and UI tests. |
| 5 | **M0-E05 Core engines and mocks** | Data Retrieval Engine and Resampling/Rescaling Engine with deterministic mocks, contract tests, and integration points. |
| 6 | **M0-E06 Authentication and ownership** | Multi-account-capable authentication, sessions, trusted server-side identity, and ownership enforcement. |
| 7 | **M0-E07 Credit ledger and cost API** | Ledger, cost estimation, admission, debit/credit, balance, and versioned credit policy. |
| 8 | **M0-E08 Catalogue, documentation, and quality backend** | Catalogue API, versioned documentation, validation records, quality metadata, and completeness gate. |
| 9 | **M0-E09 Persistence, request lifecycle, live updates, and downloads** | Persistence, state machine, job queue, worker, recovery, request APIs, owner-scoped events, and downloads. |
| 10 | **M0-E10 Probe computation and engine integration** | Integrate mocked engines, compute the probe, crop to spatial input, expose map data, time series, missing/masked/zero states, and SAU/AOI summaries. |
| 11 | **M0-E11 Proxy placeholder** | Owner-scoped proxy definitions, create/list, stub evaluation, non-map placeholder result, and UI integration. |
| 12 | **M0-E12 Engineering baseline, CI, and operations** | CI gates, CVE, migrations, health/readiness, structured logs, audit correlation, documented commands, and reproducibility. |

### 3.3 M0-E01 ticket for functional tests

`M0-E01` contains the single ticket **`M0-E01-T03` — Define functional test strategy and scaffold the functional test harness**. Its agreed scope:

- Create `agents/FUNCTIONAL_TEST_GUIDE.md`.
- Add a functional-test category to `agents/SOFTWARE_VALIDATION_PLAN.md`.
- Create `tests/functional/` as an isolated `uv` project.
- Use Behave + Playwright Python.
- Use tags `@m0`–`@m5`, `@e2e`, `@api`, `@ui`, `@contract`, `@recovery`, `@validation`, and `@scientific`.
- Use deterministic fixtures: seeded accounts, mock EO source, isolated database.
- Use no real external provider by default; live tests are explicitly opt-in.
- Provide page objects for UI scenarios.
- Carry `SYS`/`FE`/`BE`/`CORE`/`ENG` traceability identifiers in scenarios.
- Capture failure artifacts: Playwright traces/screenshots, Behave JSON/JUnit reports, and logs.
- Allow no silent skips; P0 scenarios are not skippable without a ticket and justification.
- Run merge-blocking functional smoke in CI; keep the full suite runnable on demand.
- Include traceability updates in the definition of done.

`M0-E12` wires the functional smoke into CI; it does not own the strategy or harness.

### 3.4 MVP UI scope

`M0-E04` owns the frontend slices that were previously split across credits, spatial input, and requests. It includes:

- application shell, routing, navigation, design tokens, error boundaries, and explicit loading/empty/unavailable/failure states;
- minimal authenticated shell and catalogue view;
- multi-resolution basemap and AOI/POI/LOI selection with product constraints and geometry display;
- request composer with product, spatial input, inclusive UTC window, parameters, cost estimate, and explicit errors;
- persistent credit balance and actual-cost display;
- Requests view with statuses, failure reasons, live-update placeholder, manual refresh fallback, and download actions;
- non-map proxy placeholder view for creating, listing, and inspecting stub proxy evaluations;
- contract-derived mock API and deterministic fixtures;
- Playwright UI scenarios and smoke checks.

`M0-E04` does not own persistence, real authentication, computation, or backend APIs. Those arrive in later M0 epics behind the same contracts. The MVP UI is built contract-first and mock-backed, with no premature polish.

### 3.5 Core engine scope

`M0-E05` establishes the two core engine boundaries:

- **Data Retrieval Engine:** source-agnostic query interface, dataset selection, spatial/temporal coverage, source version, quality/masks, licensing/attribution metadata, and a deterministic mock adapter.
- **Resampling/Rescaling Engine:** source-grid to target-grid or SAU transformation, explicit method, coverage, missing-data mask, native-resolution metadata, and a deterministic mock implementation.
- Versioned interfaces, contract tests, and integration points for the probe.
- Real adapters arrive in M1 and replace mocks without changing contracts.

### 3.6 Backend architecture scope

`M0-E02` produces an ADR comparing:

1. a modular monolith with catalog, identity, and request/gateway modules;
2. separate catalog, identity, and request-gateway services.

Criteria: solo-maintainer simplicity, data ownership, authentication boundary, contract stability, testability, transactional consistency, latency, deployment, and operational cost.

The recommended starting hypothesis is a modular monolith with explicit module boundaries and versioned contracts. Splitting services remains possible if the ADR criteria justify it later.

### 3.7 M0 exit criteria

- A new environment starts from documented commands and deterministic fixtures.
- The backend architecture ADR is accepted before contracts are frozen.
- Shared contracts and engine interfaces are versioned and contract-tested.
- Data Retrieval and Resampling/Rescaling engines exist with mocks and are integrated into the probe.
- The MVP UI runs against contract-derived mocks and covers shell, catalogue, basemap, spatial input, composer, credits, requests, and downloads.
- The functional test strategy and harness exist, and the functional smoke is merge-blocking.
- Two accounts can sign in; each can access only its own requests and results.
- A user selects an AOI, POI, or LOI, chooses a product and inclusive UTC window, sees the estimated cost, and submits.
- The request appears in the Requests view; state updates arrive automatically, and REST remains authoritative after reconnection.
- A successful result is downloadable as the final product only or as an archive with intermediates, sources, and provenance.
- The result is cropped to the spatial input and displayable on the map for an available period.
- The time series distinguishes missing, masked, and genuine zero values; coverage is explicit.
- A basic SAU or AOI-summary aggregation is selectable and interpretable.
- Provenance, quality status, quality index (`unknown` allowed), documentation, and validation status are visible.
- The minimal proxy placeholder can be created and listed through the API and the non-map UI placeholder, and stub-evaluated outside the map layer.
- Interrupted processing recovers or fails explicitly without losing request state.
- CI is green, migrations are versioned, and no secrets are committed.

## 4. M1 — First real scientific product and analysis baseline

| Epic | Objective |
|---|---|
| **M1-E01 Source access and provenance** | Integrate a real Data Retrieval Engine adapter: source constraints, dataset versioning, quality metadata, and licensing. |
| **M1-E02 Product algorithm and scientific quality** | Implement the first real product with units, masks, quality metadata, reproducible parameters, and explicit assumptions. |
| **M1-E03 Spatial analysis baseline** | Integrate real resampling/rescaling, SAU/AOI aggregation, coverage, missing-data rules, and native-resolution metadata. |
| **M1-E04 Temporal analysis baseline** | Support inclusive UTC windows, monthly and seasonal series, and the temporal aggregations needed by the first product. |
| **M1-E05 Validation and reference comparison** | Produce the validation record and compare the method with a documented reference or justify its absence. |
| **M1-E06 Product documentation and limitations** | Publish versioned documentation, scientific limitations, and catalogue metadata for the real product. |

## 5. M2 — Reusable Product Engine and richer analysis

| Epic | Objective |
|---|---|
| **M2-E01 Reusable product registry** | Versioned definitions, parameter schemas, and catalogue reuse. |
| **M2-E02 Dependency graph and intermediate reuse** | Execute dependencies, reuse compatible intermediates, and preserve lineage. |
| **M2-E03 Second product and extensibility** | Add a second product with limited impact on unrelated logic. |
| **M2-E04 Richer spatial and temporal analysis** | Alternative SAU strategies, richer seasonal/custom aggregations, and coverage rules. |
| **M2-E05 Multi-source, comparison, and quality index** | Harmonize compatible products, expose comparisons, and compute quality indices where justified. |
| **M2-E06 Discovery** | Request filtering/sorting/pagination and catalogue search. |
| **M2-E07 Operational maturity** | Metrics/traces, backup/restore, and license/SBOM tracking. |

## 6. M3 — First configurable Proxy Engine

| Epic | Objective |
|---|---|
| **M3-E01 Proxy rule model** | Rules, temporal conditions, and combinations of existing products. |
| **M3-E02 Proxy configuration and evaluation** | Configure a proxy and evaluate it over products and time. |
| **M3-E03 Proxy API and UI** | Create, inspect, and display proxy configuration and evaluation results. |

## 7. M4 — Advanced Proxy Engine

| Epic | Objective |
|---|---|
| **M4-E01 Advanced rules and temporal conditions** | Richer rule composition and temporal logic. |
| **M4-E02 Monitoring and evaluation outputs** | Multi-product monitoring results and evaluation history. |
| **M4-E03 Proxy API and UI extensions** | Advanced configuration, inspection, and comparison. |
| **M4-E04 Optional alerts and notifications** | Notify on configured proxy conditions without replacing REST. |

## 8. M5 — Optional advanced capabilities

| Epic | Objective |
|---|---|
| **M5-E01 Advanced scientific product** | LST or another literature-derived product when prerequisites exist. |
| **M5-E02 Export and interoperability** | Additional export formats and interchange. |
| **M5-E03 External API or MCP** | External consumer access with the same authorization and audit guarantees. |
| **M5-E04 Performance and scaling** | Caching, bounded processing, and scaling only when justified. |
| **M5-E05 Advanced notifications and automation** | Operational automation and richer notification flows. |

## 9. Cross-cutting workstreams

| Workstream | Applies to | Rule |
|---|---|---|
| Shared contracts | All milestones | One versioned source; breaking changes require a version bump and consumer fan-out. |
| Documentation gate | All products | Missing or incomplete documentation is a quality defect. |
| Quality metadata | All results and source observations | Quality status and index exist; `unknown` is explicit. |
| Scientific validation | M1 onward | A successful request does not imply scientific validation. |
| Security and CVE | All milestones | CVE policy, least privilege, no secrets in repository, images, or logs. |
| Observability | All milestones | Structured logs, durable audit, request/result/run correlation. |
| Migrations | All persistence changes | Versioned, tested, and preserving result versions, lineage, and ledger history. |
| Functional tests | M0 onward | Behave + Playwright Python; final feature files in `tests/functional/`. |
| Contract-first UI | M0 onward | UI develops against versioned contracts and deterministic mocks. |

## 10. Traceability

`documentation/project_definition.md` v0.13 is authoritative. The matrix below is the P0 baseline. BDD identifiers are acceptance labels; final Gherkin files belong in `tests/functional/features/`.

| SYS | Responsible components | BDD sketch | Target milestone |
|---|---|---|---|
| SYS-01 | BE-01, BE-20, CORE-15, FE-01, FE-20 | `E2E-CAT-01` | M0 |
| SYS-02 | BE-02, CORE-03, FE-02, FE-16, FE-21 | `E2E-AOI-01`, `E2E-AOI-02` | M0 |
| SYS-03 | BE-02, BE-03, BE-12, CORE-01, FE-02, FE-16 | `E2E-REQ-01` | M0 |
| SYS-04 | BE-04, BE-19, BE-21, CORE-01, CORE-02, CORE-07 | `E2E-REQ-02`, `E2E-PROD-01` | M0 / M1 |
| SYS-05 | BE-05, CORE-03, FE-03, FE-15, FE-21 | `E2E-MAP-01` | M0 |
| SYS-06 | BE-05, CORE-03, CORE-04, CORE-08, FE-04 | `E2E-SERIES-01` | M0 / M1 |
| SYS-07 | BE-05, BE-06, CORE-05, CORE-08, FE-05, FE-17 | `E2E-SERIES-01`, `E2E-QUAL-01` | M0 |
| SYS-08a | BE-05, CORE-04, FE-04 | `E2E-REQ-01`, `E2E-SERIES-01` | M0 |
| SYS-10 | BE-04, BE-06, BE-19, BE-21, CORE-06, CORE-07, FE-05, FE-17 | `E2E-PROV-01` | M0 / M1 |
| SYS-11 | BE-13, BE-14, CORE-11, FE-07 | `E2E-PROXY-01` (placeholder) | M0 / M3 |
| SYS-12 | BE-04, BE-07, BE-11, BE-12, BE-20, FE-03, FE-06, FE-09, FE-15, FE-19 | `E2E-REQ-02`, `E2E-OWN-01` | M0 |
| SYS-13 | BE-09, BE-12, FE-09 | `E2E-DL-01` | M0 |
| SYS-14a | BE-01, BE-06, CORE-12, CORE-15, FE-01, FE-03, FE-05 | `E2E-CAT-01`, `E2E-PROV-01` | M0 / M1 |
| SYS-16 | BE-07, BE-08, FE-06, FE-08, FE-17 | `E2E-LIVE-01` | M0 |
| SYS-17 | BE-03, BE-07, BE-08, BE-09, BE-11, BE-12 | `E2E-REQ-02` | M0 |
| SYS-18 | BE-02, BE-03, BE-04, BE-05, BE-07, BE-08, BE-09, BE-11, BE-12, BE-13, BE-20, FE-02, FE-03, FE-04, FE-05, FE-06, FE-07, FE-08, FE-09, FE-10, FE-12, FE-14, FE-15, FE-16, FE-17, FE-18, FE-19, FE-21 | `E2E-AUTH-01`, `E2E-AUTH-02`, `E2E-OWN-01` | M0 |
| SYS-19 | BE-01, BE-03, BE-19, BE-21, CORE-02, CORE-06, CORE-07, CORE-15, FE-01 | `E2E-PROD-01` | M0 / M2 |
| SYS-20 | BE-04, BE-05, BE-06, CORE-01, CORE-05, FE-03, FE-05, FE-06 | `E2E-QUAL-01` | M0 / M1 |
| SYS-21 | BE-01, CORE-04, FE-04 | `E2E-TEMP-01` | M0 |
| SYS-22 | BE-01, CORE-15, FE-01 | `E2E-DOC-01` | M0 / M1 |
| SYS-23 | BE-09, FE-12, FE-15 | `E2E-DL-02` | M0 |
| SYS-24 | BE-07, BE-10, BE-12, FE-11, FE-14, FE-17 | `E2E-COST-01` | M0 |
| SYS-25 | BE-07, BE-10, BE-12, FE-06, FE-11, FE-14, FE-17 | `E2E-COST-02` | M0 |

| ENG | Responsible components | BDD sketch | Target milestone |
|---|---|---|---|
| ENG-01 | All components | `E2E-CONTRACT-01` | M0 |
| ENG-02 | API, worker | `E2E-RECOVERY-01` | M0 |
| ENG-03 | API, worker | `E2E-REQ-02` | M0 |
| ENG-04 | API, worker | `E2E-HEALTH-01` | M0 |
| ENG-05 | All components | `E2E-OBS-01` | M0 |
| ENG-06 | All components | `E2E-CONFIG-01` | M0 |
| ENG-07 | CI, functional tests | `E2E-TRACE-01` | M0 |
| ENG-10 | API, UI, worker | `E2E-AUTH-01` | M0 |
| ENG-12 | API, worker, persistence | `E2E-MIGRATION-01` | M0 |

P1 and P2 system requirements are traced when their milestone is refined.

## 11. Functional test linkage

- Location: `tests/functional/`, isolated `uv` project.
- Stack: Behave + Playwright Python.
- Tags: `@m0`–`@m5`, `@e2e`, `@api`, `@ui`, `@contract`, `@recovery`, `@validation`, `@scientific`.
- Every P0 scenario has a traceability identifier from the matrix.
- Default execution uses deterministic fixtures and no live external provider.
- Scientific validation campaigns and benchmarks are not part of the default unit/functional suite.
- Merge-blocking functional smoke runs in CI; the full suite is runnable on demand.
- Final conventions belong in `agents/FUNCTIONAL_TEST_GUIDE.md`.

## 12. GitHub conventions

| Item | Convention |
|---|---|
| Milestone | One per `M0`–`M5`; no due dates. |
| Epic issue | Title `[M0-E01] Product definition, documentation model, and test strategy`; labels `type:epic`, `area:*`, `priority:*`; links to roadmap section. |
| Ticket issue | Title `[M0-E01-T01] ...`; label `type:task`, `area:*`, `priority:*`, `size:*`; linked as a sub-issue of its epic. |
| Project fields | `Status`, `Priority`, `Area`, `Size`, `Type`, `Milestone`. |
| Initial status | M0 in `Todo`; M1–M5 in `Backlog`. |
| Language | English for issues, PRs, commits, documentation, and code comments. |
| Traceability | Every ticket lists the `SYS`/`FE`/`BE`/`CORE`/`ENG` IDs it implements or verifies. |
| Pull requests | Link the ticket and milestone; no merge without explicit approval. |

## 13. Definition of ready and done

### Ready

- The ticket has a clear outcome, scope, and acceptance criteria.
- Requirements links are present.
- Dependencies and open ADR decisions are identified.
- The ticket is small enough for a bounded implementation step.

### Done

- Acceptance criteria are verified by targeted tests.
- Relevant unit, contract, functional, migration, and security checks pass.
- Documentation and provenance impacts are handled.
- No secrets are committed.
- Traceability and roadmap status are updated.

## 14. Refinement and cleanup protocol

1. Before starting a milestone, refine its epics and tickets; split anything larger than a bounded implementation step.
2. Remove duplicate, obsolete, or superseded items; record the reason.
3. Move unresolved technical choices to an ADR or a dedicated spike ticket.
4. Recalculate epic and ticket counts after refinement; do not preserve stale totals.
5. Update the traceability matrix when requirements or component links change.
6. Never mark a ticket done because code exists; mark it done only when its acceptance checks pass.
7. Keep M0 focused on the end-to-end path and realistic interfaces; defer scientific breadth to later milestones.

## 15. Provisional technical decisions

These are working assumptions, not requirements. They may change through ADRs.

| Topic | Provisional decision |
|---|---|
| M0 test data | Deterministic mock data source for contract and functional tests. |
| BDD stack | Behave + Playwright Python. |
| Persistence and execution | Postgres + database-backed job queue + polling worker. |
| Functional tests | Root `tests/functional/` with an isolated `uv` project. |
| Configuration | Local configuration files plus environment variables; `confz` for Python components. |
| Shared contracts | New `projects/meogap_contracts`, imported by every component. |
| Backend topology | Modular monolith hypothesis, confirmed by the M0-E02 ADR; split services only if justified. |
| Core engines | Interfaces in contracts; deterministic mocks in M0; real adapters in M1. |
| MVP UI | Contract-first with a mock API; frontend slices of credits, spatial input, and requests; minimal auth/catalogue shell. |
| Authentication | Multi-account-capable mock or basic provider in M0; mechanism remains an ADR. |
| Proxy | Minimal placeholder in M0; configurable engine in M3; advanced rules in M4. |

## 16. Open decisions

- Authentication mechanism, session policy, and credential storage.
- Configuration organization and secret injection.
- Contract source format and generation strategy.
- Map provider, map library, zoom levels, labels, and tile strategy; licensing and attribution.
- POI/LOI crop footprints and SAU applicability per spatial input.
- Notification transport and event-delivery semantics.
- Real EO data source and access method.
- Quality-index computation factors and validation thresholds.
- Metrics, tracing, backup/restore, and SBOM tooling.
- Final confirmation of backend topology after the M0-E02 ADR.

## 17. Change control

- Roadmap changes are allowed when they preserve the scientific-learning goal and the Product Engine priority.
- Requirement changes require an update to `documentation/project_definition.md` first, then the roadmap and traceability matrix.
- A milestone is not complete until its exit outcome and acceptance checks are demonstrated.
- No application code, test implementation, or architecture implementation is introduced by this roadmap document.
