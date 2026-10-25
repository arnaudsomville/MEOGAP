# MEOGAP — Development Roadmap v1 (Draft)

**Status:** Draft derived from `documentation/project_definition.md` v0.12.
**Purpose:** Sequence learning-enabled capabilities, not fixed deadlines. The order may evolve as scientific interests and technical findings change.

## 1. Principles

- Scientific learning and validation come before feature accumulation.
- The Product Engine comes first; the Proxy Engine is a later capability.
- Internal L0–LN levels are not provider processing levels.
- Spatial representation is not fixed; H3 is a candidate, not a commitment.
- Missing, masked, invalid, and unobserved data are never silently treated as zero.
- Every supported product carries versioned documentation, provenance, quality metadata, and an explicit validation status.
- Technical decisions that do not change requirements belong in ADRs or tickets, not in the roadmap.
- M0 proves the request workflow end to end with a technical probe and minimal proxy placeholder; it does not require a real scientific product.

## 2. Milestones at a glance

| Milestone | Objective | Epics | Tickets | Exit outcome |
|---|---|---:|---:|---|
| **M0** | Minimal foundations and first end-to-end exploration | 10 | 36 | One authenticated, cost-aware, spatial-input request reaches a downloadable, mappable result with provenance, quality, and missing-data handling. |
| **M1** | First real scientific product | 4 | 12 | One real EO product is computed, documented, and compared with a reference; its limits are explicit. |
| **M2** | Reusable Product Engine and first configurable proxy | 4 | 14 | A second product is added with limited impact; dependencies and intermediates are reused; a first proxy is configurable and evaluable. |
| **M3** | Richer spatial and temporal analysis | 4 | 12 | SAU strategies, richer temporal aggregation, and multi-source compatibility are demonstrated. |
| **M4** | Advanced Proxy Engine | 4 | 10 | Rules, temporal conditions, and monitoring outputs use already developed products. |
| **M5** | Optional advanced capabilities | 5 | 10 | Advanced scientific or execution capabilities are added only when justified by learning needs. |

Counts are provisional. M0 is estimated at ticket level; M1–M5 are indicative and are refined before each milestone starts.

## 3. M0 — Minimal foundations and first end-to-end exploration

### 3.1 Goal

Prove the complete Product Engine path with a technical probe product, deterministic data, and a minimal proxy placeholder. The scientific value of the probe is secondary; the workflow, provenance, quality semantics, and recoverability are the deliverables.

### 3.2 Epics and tickets

| Epic | Ticket | Scope |
|---|---|---|
| **M0-E01 Contracts and product model** | `M0-E01-T01` | Scaffold `projects/meogap_contracts` with a single versioned source and generation strategy. |
| | `M0-E01-T02` | Define product definition, parameter schema, versioning, and dependency graph/tree contracts. |
| | `M0-E01-T03` | Define request, result, status, provenance, quality, validation, credit, and proxy contracts. |
| | `M0-E01-T04` | Add contract tests and consumer fan-out for shared-contract changes. |
| **M0-E02 Authentication and ownership** | `M0-E02-T01` | Auth-provider abstraction with a local mock or basic provider; multi-account capable. |
| | `M0-E02-T02` | Sign-in/sign-out UI, protected routes, and session handling. |
| | `M0-E02-T03` | Server-side identity propagation, ownership enforcement, and auth/ownership tests. |
| **M0-E03 Credit ledger and cost admission** | `M0-E03-T01` | Ledger schema and versioned migration; unlimited credits allowed. |
| | `M0-E03-T02` | Cost estimator, versioned credit policy, atomic admission, and idempotent postings. |
| | `M0-E03-T03` | Cost/balance API and UI with explicit unavailable states; tests. |
| **M0-E04 Catalogue, documentation, and quality metadata** | `M0-E04-T01` | Catalogue API and product detail with quality and validation status. |
| | `M0-E04-T02` | Versioned product-documentation schema and merge-blocking completeness gate. |
| | `M0-E04-T03` | Catalogue UI showing purpose, method, units, quality, and validation status; tests. |
| **M0-E05 Spatial input, basemap, and request composer** | `M0-E05-T01` | Basemap foundation and provider/attribution ADR; context only, not a result layer. |
| | `M0-E05-T02` | AOI/POI/LOI draw/select, geometry validation, and configurable AOI limit. |
| | `M0-E05-T03` | Request composer with product, spatial input, inclusive UTC window, parameters, cost preview, submit, and explicit errors. |
| | `M0-E05-T04` | Spatial-input and composer functional tests. |
| **M0-E06 Persistence, execution, and recovery** | `M0-E06-T01` | Persistence schema and migrations for requests, results, runs, and lineage. |
| | `M0-E06-T02` | Database-backed job queue, polling worker, and explicit request state machine. |
| | `M0-E06-T03` | Recovery after interruption, bounded retries, idempotency, and failure reasons. |
| | `M0-E06-T04` | Integration and recovery tests. |
| **M0-E07 Requests view, live updates, and downloads** | `M0-E07-T01` | Owner-scoped request list/detail/status API and stable error model. |
| | `M0-E07-T02` | Requests UI with loading, empty, unavailable, partial, failure, cost, and quality states. |
| | `M0-E07-T03` | Owner-scoped live updates, reconnect handling, and REST fallback. |
| | `M0-E07-T04` | Final-product download and optional archive with intermediates, sources, and provenance; tests. |
| **M0-E08 Technical probe, map, and time series** | `M0-E08-T01` | Technical probe product definition and deterministic mock data source. |
| | `M0-E08-T02` | Core computation pipeline, dependency execution, and immutable provenance. |
| | `M0-E08-T03` | Crop AOI/POI/LOI output, output geometry, and native-resolution metadata. |
| | `M0-E08-T04` | Map display and time series with distinct missing, masked, and genuine-zero states. |
| | `M0-E08-T05` | Basic SAU/AOI-summary aggregation with coverage and missing-data rules; tests. |
| **M0-E09 Minimal proxy placeholder** | `M0-E09-T01` | Persist owner-scoped proxy definitions and expose create/list API. |
| | `M0-E09-T02` | Proxy placeholder UI, stub evaluation, non-map result, and tests. |
| **M0-E10 CI, observability, and operational baseline** | `M0-E10-T01` | CI gates for format, lint, type, unit, contract, documentation, and traceability. |
| | `M0-E10-T02` | CVE scan, migration check, and documented exceptions policy. |
| | `M0-E10-T03` | Health/readiness endpoints, structured logs, and durable audit correlation. |
| | `M0-E10-T04` | Functional E2E harness and smoke suite. |

### 3.3 M0 exit criteria

- A new environment starts from documented commands and deterministic fixtures.
- Two accounts can sign in; each can access only its own requests and results.
- A user selects an AOI, POI, or LOI on the basemap, chooses a product and inclusive UTC window, sees the estimated cost, and submits.
- The request appears in the Requests view; state updates arrive automatically, and REST remains authoritative after reconnection.
- A successful result is downloadable as the final product only or as an archive with intermediates, sources, and provenance.
- The result is cropped to the spatial input and displayable on the map for an available period.
- The time series distinguishes missing, masked, and genuine zero values; coverage is explicit.
- A basic SAU or AOI-summary aggregation is selectable and interpretable.
- Provenance, quality status, quality index (`unknown` allowed), documentation, and validation status are visible.
- The minimal proxy placeholder creates, lists, and stub-evaluates a proxy outside the map layer.
- Interrupted processing recovers or fails explicitly without losing request state.
- CI is green, migrations are versioned, and no secrets are committed.

## 4. M1–M5 provisional outline

### M1 — First real scientific product

| Epic | Objective | Indicative tickets |
|---|---|---:|
| `M1-E01` | Source data access, selection criteria, and dataset versioning for one EO product. | 3 |
| `M1-E02` | Product algorithm, units, masking, quality metadata, and reproducible parameters. | 4 |
| `M1-E03` | Validation record and comparison with a documented reference. | 3 |
| `M1-E04` | Versioned product documentation and scientific-limitations review. | 2 |

### M2 — Reusable Product Engine and first configurable proxy

| Epic | Objective | Indicative tickets |
|---|---|---:|
| `M2-E01` | Product registry, parameter schemas, and versioned definitions. | 4 |
| `M2-E02` | Dependency graph execution, intermediate reuse, and lineage. | 4 |
| `M2-E03` | Add a second product with limited changes to unrelated logic. | 3 |
| `M2-E04` | First configurable proxy with rules and evaluation. | 3 |

### M3 — Richer spatial and temporal analysis

| Epic | Objective | Indicative tickets |
|---|---|---:|
| `M3-E01` | Alternative SAU strategies, resampling, and coverage rules. | 3 |
| `M3-E02` | Seasonal and richer temporal aggregations. | 3 |
| `M3-E03` | Multi-source or multi-product compatibility and harmonization. | 3 |
| `M3-E04` | Scientific comparison, uncertainty, and limitation reporting. | 3 |

### M4 — Advanced Proxy Engine

| Epic | Objective | Indicative tickets |
|---|---|---:|
| `M4-E01` | Rule model, temporal conditions, and product combinations. | 3 |
| `M4-E02` | Proxy evaluation engine and monitoring outputs. | 3 |
| `M4-E03` | Proxy API and UI for configuration and results. | 2 |
| `M4-E04` | Optional alerting and notification integration. | 2 |

### M5 — Optional advanced capabilities

| Epic | Objective | Indicative tickets |
|---|---|---:|
| `M5-E01` | Land Surface Temperature or another advanced product. | 2 |
| `M5-E02` | Export and interoperability formats. | 2 |
| `M5-E03` | External API or MCP access. | 2 |
| `M5-E04` | Performance, caching, and scaling. | 2 |
| `M5-E05` | Advanced notifications and operational automation. | 2 |

## 5. Cross-cutting workstreams

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

## 6. Traceability

`documentation/project_definition.md` v0.12 is authoritative. The matrix below is the working P0 baseline. BDD identifiers are acceptance labels; final Gherkin files belong in `tests/functional/features/`.

| SYS | Responsible components | BDD sketch | Target milestone |
|---|---|---|---|
| SYS-01 | BE-01, BE-20, CORE-15, FE-01, FE-20 | `E2E-CAT-01` | M0 |
| SYS-02 | BE-02, CORE-03, FE-02, FE-16, FE-21 | `E2E-AOI-01`, `E2E-AOI-02` | M0 |
| SYS-03 | BE-02, BE-03, BE-12, CORE-01, FE-02, FE-16 | `E2E-REQ-01` | M0 |
| SYS-04 | BE-04, BE-19, BE-21, CORE-01, CORE-02, CORE-07 | `E2E-REQ-02`, `E2E-PROD-01` | M0 |
| SYS-05 | BE-05, CORE-03, FE-03, FE-15, FE-21 | `E2E-MAP-01` | M0 |
| SYS-06 | BE-05, CORE-03, CORE-04, CORE-08, FE-04 | `E2E-SERIES-01` | M0 |
| SYS-07 | BE-05, BE-06, CORE-05, CORE-08, FE-05, FE-17 | `E2E-SERIES-01`, `E2E-QUAL-01` | M0 |
| SYS-08a | BE-05, CORE-04, FE-04 | `E2E-REQ-01`, `E2E-SERIES-01` | M0 |
| SYS-10 | BE-04, BE-06, BE-19, BE-21, CORE-06, CORE-07, FE-05, FE-17 | `E2E-PROV-01` | M0 |
| SYS-11 | BE-13, BE-14, CORE-11, FE-07 | `E2E-PROXY-01` (placeholder) | M0 / M2 |
| SYS-12 | BE-04, BE-07, BE-11, BE-12, BE-20, FE-03, FE-06, FE-09, FE-15, FE-19 | `E2E-REQ-02`, `E2E-OWN-01` | M0 |
| SYS-13 | BE-09, BE-12, FE-09 | `E2E-DL-01` | M0 |
| SYS-14a | BE-01, BE-06, CORE-12, CORE-15, FE-01, FE-03, FE-05 | `E2E-CAT-01`, `E2E-PROV-01` | M0 / M1 |
| SYS-16 | BE-07, BE-08, FE-06, FE-08, FE-17 | `E2E-LIVE-01` | M0 |
| SYS-17 | BE-03, BE-07, BE-08, BE-09, BE-11, BE-12 | `E2E-REQ-02` | M0 |
| SYS-18 | BE-02, BE-03, BE-04, BE-05, BE-07, BE-08, BE-09, BE-11, BE-12, BE-13, BE-20, FE-02, FE-03, FE-04, FE-05, FE-06, FE-07, FE-08, FE-09, FE-10, FE-12, FE-14, FE-15, FE-16, FE-17, FE-18, FE-19, FE-21 | `E2E-AUTH-01`, `E2E-AUTH-02`, `E2E-OWN-01` | M0 |
| SYS-19 | BE-01, BE-03, BE-19, BE-21, CORE-02, CORE-06, CORE-07, CORE-15, FE-01 | `E2E-PROD-01` | M0 / M2 |
| SYS-20 | BE-04, BE-05, BE-06, CORE-01, CORE-05, FE-03, FE-05, FE-06 | `E2E-QUAL-01` | M0 |
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

P1 and P2 system requirements are traced in `PLAN.md` §10 and must be added here when their milestone is refined.

## 7. Functional test linkage

- Location: `tests/functional/`, isolated `uv` project.
- Stack: Behave + Playwright Python.
- Tags: `@m0`–`@m5`, `@e2e`, `@api`, `@ui`, `@contract`, `@recovery`, `@validation`, `@scientific`.
- Every P0 scenario has a traceability identifier from the matrix.
- Default execution uses deterministic fixtures and no live external provider.
- Scientific validation campaigns and benchmarks are not part of the default unit/functional suite.
- Final conventions belong in `agents/FUNCTIONAL_TEST_GUIDE.md`.

## 8. GitHub conventions

| Item | Convention |
|---|---|
| Milestone | One per `M0`–`M5`; no due dates. |
| Epic issue | Title `[M0-E01] Contracts and product model`; labels `type:epic`, `area:*`, `priority:*`; links to roadmap section. |
| Ticket issue | Title `[M0-E01-T01] Scaffold contracts package`; label `type:task`, `area:*`, `priority:*`, `size:*`; linked as a sub-issue of its epic. |
| Project fields | `Status`, `Priority`, `Area`, `Size`, `Type`, `Milestone`. |
| Initial status | M0 in `Todo`; M1–M5 in `Backlog`. |
| Language | English for issues, PRs, commits, documentation, and code comments. |
| Traceability | Every ticket lists the `SYS`/`FE`/`BE`/`CORE`/`ENG` IDs it implements or verifies. |
| Pull requests | Link the ticket and milestone; no merge without explicit approval. |

## 9. Definition of ready and done

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

## 10. Refinement and cleanup protocol

1. Before starting a milestone, refine its epics and tickets; split anything larger than a bounded implementation step.
2. Remove duplicate, obsolete, or superseded items; record the reason.
3. Move unresolved technical choices to an ADR or a dedicated spike ticket.
4. Recalculate epic and ticket counts after refinement; do not preserve stale totals.
5. Update the traceability matrix when requirements or component links change.
6. Never mark a ticket done because code exists; mark it done only when its acceptance checks pass.
7. Keep M0 focused on the end-to-end path; defer scientific breadth to later milestones.

## 11. Provisional technical decisions

These are working assumptions, not requirements. They may change through ADRs.

| Topic | Provisional decision |
|---|---|
| M0 test data | Deterministic mock data source for contract and functional tests. |
| BDD stack | Behave + Playwright Python. |
| Persistence and execution | Postgres + database-backed job queue + polling worker. |
| Functional tests | Root `tests/functional/` with an isolated `uv` project. |
| Configuration | Local configuration files plus environment variables; `confz` for Python components. |
| Shared contracts | New `projects/meogap_contracts`, imported by every component. |
| Authentication | Multi-account-capable mock or basic provider in M0; mechanism remains an ADR. |
| Proxy | Minimal placeholder in M0; configurable engine in M2 and advanced rules in M4. |

## 12. Open decisions

- Authentication mechanism, session policy, and credential storage.
- Configuration organization and secret injection.
- Contract source format and generation strategy.
- Map provider, map library, zoom levels, labels, and tile strategy; licensing and attribution.
- POI/LOI crop footprints and SAU applicability per spatial input.
- Notification transport and event-delivery semantics.
- Real EO data source and access method.
- Quality-index computation factors and validation thresholds.
- Metrics, tracing, backup/restore, and SBOM tooling.
- Whether a real scientific product belongs in M1 or is preceded by a separate feasibility spike.

## 13. Change control

- Roadmap changes are allowed when they preserve the scientific-learning goal and the Product Engine priority.
- Requirement changes require an update to `documentation/project_definition.md` first, then the roadmap and traceability matrix.
- A milestone is not complete until its exit outcome and acceptance checks are demonstrated.
- No application code, test implementation, or architecture implementation is introduced by this roadmap document.
