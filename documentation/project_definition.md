# MEOGAP — Modular Earth Observation & Geospatial Analytics Platform

**Project Definition — v0.19 (Project Intent and Scientific Concepts)**

**Status:** Living document · **Date:** 12 November 2026

**Project type:** Personal learning and scientific exploration project, with an engineering portfolio dimension

> **Purpose of this document**  
> Explain *why* MEOGAP exists, with **learning Earth observation as its primary goal**, *what* it should enable, and *which responsibilities* belong to its main components. It is intentionally **not** an implementation plan: repository structure, programming interfaces, data schemas, deployment topology, and framework-level architecture will be defined separately by the project's template and subsequent design work.

---

## Documentation ownership and navigation

This document is the source of **project intent, scientific concepts and high-level architecture principles**. It is not the authority for detailed system requirements, component contracts or implementation sequencing.

| Topic | Authoritative/current reference | Role |
|---|---|---|
| System requirements and M0 treatment (SYS-*) | [System requirements baseline](specifications/sys.md) | Sole source of truth for SYS IDs, requirement text, priorities, M0 treatment and target delivery. |
| Logical component responsibilities and interaction boundaries | [Component Interaction Design](architecture/system-interactions/component-interaction-design.md) | Current architecture model for UI, GAT, CON, SCI and CAT. |
| Detailed cross-component interaction inventory | [Component Interaction Matrix](architecture/system-interactions/component-interaction-matrix.md) | Validated interaction directions, purpose and routes. |
| End-to-end interaction scenarios | [Sequence diagrams](architecture/sequence_diagrams/README.md) | Submission, execution, result retrieval and failure/recovery flows. |
| Component-level specifications | [Component specifications index](specifications/components/README.md) | First-draft component documents; they are not yet fully reconciled with the current interaction design. |
| Delivery sequencing and implementation readiness | [GitHub issues and project tickets](https://github.com/arnaudsomville/MEOGAP/issues) | Source of truth for planned work, dependencies, acceptance criteria and delivery order. |

**No duplicated SYS requirement table is maintained here.** Update system requirements in `specifications/sys.md` only. This document may explain their intent or scientific rationale, but must not reproduce stale copies of the SYS baseline.

The component documents under `specifications/components/` still contain first-draft assumptions, including legacy component terminology. Until reconciled, use the architecture documents above for current logical boundaries. Do not infer that a component is implemented merely because a specification exists.

GitHub's standard Markdown renderer does not include another Markdown file inline. Keep these references as links; do not copy detailed requirements or component tables into this document.

---

## 1. Project Rationale and Value Proposition

### 1.1 Personal motivation — the primary purpose

**MEOGAP is first and foremost a personal project to learn more about Earth observation and remote sensing.** The platform is a means of learning by doing: exploring satellite missions and their measurements, understanding the scientific assumptions behind derived products, implementing methods described in research papers, and comparing results with reference datasets when available.

Software engineering is part of this journey, but not its ultimate goal. A modular architecture should make it easier to experiment with new scientific ideas, revisit earlier work, and accumulate knowledge over time. There is no expectation to create a commercial SaaS, address a predetermined market, or commit to one application domain. The project's direction may change as new scientific interests emerge.

**The main outcome sought is deeper scientific understanding**, supported by a growing set of reusable tools and experiments. A useful portfolio project is a welcome consequence, not the primary measure of success.

### 1.2 The problem

Open Earth observation data make it possible to study vegetation, water, land surface temperature, nighttime activity, and many other environmental or human-driven changes. Access to imagery, however, is only the beginning. Turning observations into useful information requires scientific algorithms, multiple data sources, consistent spatial and temporal interpretation, quality control, and repeatable analysis.

A single research script may answer one question, but it is rarely a reusable foundation for exploring different scientific questions. Each new algorithm can otherwise require rebuilding the same acquisition, processing, comparison, and visualization steps.

### 1.3 The central idea

**Use the development of a modular scientific Product Engine as a practical way to learn Earth observation, progressively transforming open data into a catalogue of understandable, reusable scientific products.**

The Product Engine is the main technical and scientific asset of the project. It should be possible to start with elementary indices, then introduce more sophisticated methods from scientific literature, reuse previous products as inputs, compare results with reference datasets, and make new capabilities available for geographical and temporal exploration. Each new product should provide an opportunity to understand a physical phenomenon or a scientific method more deeply.

An **Indicator Engine** will make these products useful for configurable monitoring. A monitoring indicator will combine existing products, rules, and temporal conditions to observe a phenomenon over an area. A minimal indicator placeholder is present in the first end-to-end demonstration, while full monitoring indicator configuration and evaluation are implemented later. Monitoring indicators do not replace the scientific products, and **a product does not need an indicator to be useful**.

The intended value is therefore cumulative:

1. **Scientific depth:** each added product contributes new knowledge and new processing capabilities.
2. **Reusability:** products and intermediate results can support other products without duplicating the complete workflow.
3. **Coherent exploration:** different products can be inspected through a common spatial and temporal experience.
4. **Extensibility:** new sources, algorithms, and monitoring ideas can be added without redefining the entire platform.
5. **Interpretability:** data quality, scientific assumptions, and limitations remain visible alongside the results.

The project does **not** claim that its individual algorithms or map tools are novel. Its distinctive purpose is to assemble them into an understandable, evolving scientific workbench, with the Product Engine as its central asset.

### 1.4 Illustrative applications, not fixed targets

| Area of exploration | Potential products | Possible question |
|---|---|---|
| Nighttime activity | VIIRS nighttime radiance, changes and anomalies | Where has nighttime luminosity increased over successive months? |
| Vegetation dynamics | NDVI, NDWI/NDMI variants, vegetation anomalies | How has vegetation changed relative to comparable periods? |
| Surface temperature | Vegetation fraction, emissivity, LST | How does land surface temperature evolve across an area? |
| Inland water | Water masks, optical turbidity-related indices | Are observed optical water conditions changing? |
| Human-induced changes | Light, vegetation and water-related products | Do multiple indicators suggest an unusual change in land activity? |

These are **scientific exploration opportunities**, not required business domains. Neither urban heat, illegal mining, water quality nor any other example determines the project's final purpose. EO indicators must not be presented as direct proof of a cause, a crime, or a health outcome.

## 2. Vision, Objectives and Boundaries

**Vision:** *Learn Earth observation through an extensible personal laboratory in which scientific products can be studied, developed, evaluated, reused and explored spatially and temporally, with configurable monitoring as a later capability.*

**Primary objective — scientific learning.** Deepen personal understanding of Earth observation data, remote-sensing methods and environmental phenomena by implementing, testing and interpreting progressively more advanced scientific products.

**Main technical means — Product Engine.** Enable incremental development of those products, from simple operations on satellite bands to algorithms requiring multiple intermediate products or data sources.

**Supporting objectives.** Provide access to public EO data; make outputs comparable at appropriate spatial and temporal scales; display maps and time series; retain scientific context and missing-data information; make processing reusable; and keep the platform practical for a solo developer.

**Major future extension — Indicator Engine.** Allow user-configured monitoring indicators to combine already available products, temporal analysis, thresholds and other rules for monitoring. A placeholder path is included early so the full request flow can be tested end to end.

**Guiding principles:**

- **Learning-driven and capability-driven, not use-case-driven.** A new algorithm is a scientific learning opportunity, not a mandatory roadmap destination.
- **Scientific meaning before visual convenience.** An apparently finer map must never be confused with finer observational evidence.
- **Native computation first; common analysis later.** Scientific calculations and geographical aggregation have separate responsibilities.
- **Start small, grow deliberately.** A single functioning processing path is more valuable than speculative generality.
- **Open and affordable by default.** Prefer accessible public datasets and open-source tools; verify dataset-specific usage conditions.
- **Reproducibility and honesty.** Preserve enough information to understand a result, including its limitations and validation status.

**Not in scope for the initial project:** a commercial SaaS, enterprise user management, planetary-scale infrastructure, exhaustive sensor coverage, guaranteed real-time monitoring, arbitrary user-executed scientific code, or a fixed set of domain-specific dashboards. Public distribution is optional, not a measure of success.

---

## 3. Processing Model: From Observations to Products to Indicators

This is the **central conceptual model** of the platform.

### 3.1 Distinct concepts and artifacts

| Concept | Meaning | Who defines it? |
|---|---|---|
| **Source observation** | Satellite bands, radiance, reflectance, auxiliary observations or provider-supplied scientific datasets used as inputs. | External data providers |
| **Scientific product** | A documented scientific transformation or analysis based on one or more source observations or existing products. | Developed and maintained within the Product Engine |
| **Product definition** | Versioned description of what a product calculates, independently of any particular request, output file or storage layout. | Developed and maintained within the Product Engine |
| **Analysis request** | A user-initiated demand for a product over a spatial input, UTC period and parameters. | Submitted by a user or authorized consumer |
| **Product result** | The immutable, versioned outcome calculated or retrieved for a request and a precise set of inputs. | Produced by the Product Engine |
| **Result representation** | A technical or analytical view of a result: native data, a common-grid resampling, an H3 aggregation, an extracted series, a display image or an archive. | Scientific representations are generated by SCI; CON coordinates authorized access and delivery; each representation remains linked to its source result |
| **Monitoring Indicator** | A configurable monitoring definition that combines existing products and rules to follow a phenomenon over space and time. | Configured by the user; a placeholder path is present in the first end-to-end demonstration |

A **product definition** describes *what is calculated*; a **product result** is *what was calculated for particular sources, parameters, place and period*. A **result representation** is not necessarily a new scientific product: it is a derived view that must remain linked to its source result and document its transformation, spatial support, native-resolution context and known information loss. This distinction allows the same scientific method to be reused in many analyses without conflating scientific results with storage or display artifacts.

### 3.2 Internal processing levels — L0 to LN

The original **L0 → L1 → … → LN** model is retained to express increasing *processing depth*. It is a conceptual hierarchy, not a rigid scientific classification.

| Level | Purpose | Illustrative examples |
|---|---|---|
| **L0 — Source layer** | Accessible inputs from external EO collections, including relevant bands, QA data and auxiliary observations. They may already have undergone provider processing. | Sentinel-2 surface reflectance bands, VIIRS nighttime radiance, Landsat thermal data, atmospheric or emissivity inputs |
| **L1 — Elementary products** | Relatively direct transformations of source observations. An excellent starting point for the MVP. | NDVI, a precisely defined NDWI variant, simple radiance changes, elementary masks |
| **L2 — Intermediate products** | Products using L1 outputs, more elaborate transformations, additional inputs or temporal statistics. | Fractional vegetation cover, seasonal anomalies, emissivity-related estimates |
| **L3 … LN — Higher-order products** | More sophisticated methods combining several inputs, intermediate products, scientific models or sources. | Land Surface Temperature retrieval, multi-source scientific indicators, other literature-derived methods |

**Important distinctions:**

- These are **internal project levels**. They are **not** the processing levels used by providers (for example, Sentinel-2 L2A or Landsat Level-2).
- A higher level does **not** mean higher accuracy, higher spatial resolution, or stronger validation.
- Levels are explanatory: actual products form a **dependency graph**, and some computations may skip levels or depend on multiple branches.
- A monitoring indicator is **not** an additional `LN` product. It is a separate monitoring layer consuming products.
- Aggregating a product onto a spatial grid does **not**, by itself, create a higher-level scientific product.

### 3.3 How the hierarchy grows

**Example A — Nighttime luminosity**

**L0:** VIIRS radiance observations or published composites → **L1:** change between comparable periods → **L2:** anomaly against a temporal baseline → **Monitoring Indicator (placeholder early, full evaluation later):** alert when increases persist in selected spatial units.

This example can support a very small first demonstration without multi-sensor fusion.

**Example B — Land Surface Temperature (LST)**

**L0:** Landsat reflectance and thermal observations, atmospheric inputs, and emissivity-related reference data → **L1:** NDVI → **L2:** fractional vegetation cover and emissivity-related calculations → **Higher-order product:** LST estimated by a documented thermal retrieval method using the necessary thermal, atmospheric and surface inputs.

The paper by **Ermida et al. (2020)** provides a particularly useful future experiment: reproduce a published LST method and compare its outputs with available reference products. **LST cannot be inferred from NDVI alone in that method.** This is a research candidate, not a compulsory project milestone or a commitment to urban-heat monitoring.

### 3.4 Spatial and temporal analysis

The platform should distinguish **scientific processing** from **analytical harmonization**. Three spatial levels must remain separable:

1. **Native grid** — the geometry, coordinate reference system and resolution of the source observation or computed product. It is the scientific reference and must not be silently replaced.
2. **Spatial harmonization** — an explicit operation that transforms or compares data on a common support (reprojection, resampling, aggregation or another documented method).
3. **Spatial Analysis Unit (SAU)** — the unit on which values are selected, aggregated and analysed, possibly an H3 cell or a raster cell.

**H3 is a candidate common analysis grid, not a storage format and not a raster resampling algorithm.** Its parent/child hierarchy provides a spatial structure, but it does not by itself define how a scientific cell value is computed.

Scientific processing may need native raster geometry, appropriate reprojection, resampling and masking. Afterward, products may be aggregated into common **Spatial Analysis Units (SAUs)** so their evolution can be compared and displayed consistently.

An SAU is the smallest selectable geographical unit used for aggregated analysis and time-series plots. Depending on the method, it could be a raster pixel, a grid cell, a hexagon or another spatial feature. **H3 is a promising initial candidate**, not a permanent commitment. Spatial resolution and aggregation methods must remain explicit: projecting a coarse observation onto smaller cells does not create new measured detail.

A user should be able to select a spatial input (AOI, POI, or LOI) for an analysis and an individual SAU for aggregated evolution, then view a product for a chosen period and inspect its evolution by month, season or other supported time windows. For POI/LOI inputs, the UI sends the original geometry and explicit buffer parameters; buffering into an AOI is performed server-side; its detailed contract is defined separately. Missing observations, cloud masking, insufficient coverage and actual measured zeros must remain distinguishable. In particular, **“no data” must never be silently interpreted as “no change.”**

Product outputs are not restricted to raster images: they may also be numerical values, per-unit measurements, time series or other suitable representations. SCI produces scientific results and representations; GAT exposes the authorized API operations, and UI presents them as maps and charts.

### 3.5 Analysis requests as the entry point to visualization

An **analysis request** is a user-initiated demand to obtain a product for a selected spatial input, period and supported parameters. It may reuse an available result or trigger new processing. Requests have a visible lifecycle and remain accessible through a dedicated **Requests** view.

**The Requests view is the entry point for putting analytical results on the map.** A user selects a successfully completed request and chooses **Display on map**. From the displayed result, the user can explore supported time windows and inspect values or time series for an SAU or AOI summary. An unsuccessful or unfinished request cannot be displayed as a result.

A *successful request* means that processing or retrieval completed and a result is available. It does **not** imply that all periods contain valid observations or that the result has undergone independent scientific validation. Missing or masked observations remain visible as such.

### 3.6 Results, representations and storage-independent access

A **product result** is the scientific asset. It is immutable and versioned; recomputing the same product for different inputs, parameters or methods creates a new result version rather than overwriting the previous one.

A result may be exposed through several **representations**: native scientific data, a resampling onto a common grid, an H3 aggregation, extracted point or AOI series, a display-ready image, or a downloadable archive. A representation is derived, never a substitute for the result, and must record:

- the source result identifier and version;
- the transformation method and version;
- the spatial support, resolution and coordinate reference system;
- coverage and missing-data rules;
- the known information loss, approximation or uncertainty introduced.

The result-access contract exposed through GAT must remain **independent of the physical storage organization**. A consumer must be able to request a bounded temporal or spatial slice, or a single representation, without knowing whether the data are stored as rasters, multidimensional arrays, files or database records. Loading an entire result is acceptable only within explicit request limits (spatial extent, number of dates, pixel count, memory and response size).

**Cartographic images are generated on demand, possibly with a cache.** The platform must not require a persisted image per date, and a display image must never become the sole persistent copy of a scientific result. Missing, masked, invalid, partial and genuine-zero values must remain distinguishable in every representation.

The choice of a physical datacube organization (versioned raster collection, multidimensional array store such as Zarr, or another layout) is an implementation decision. It must not leak into product definitions or into the public API contract exposed by GAT.

---

## 4. Logical System Architecture

This section describes the current **logical target architecture**. It does not define deployment topology, implementation packages, API routes or message schemas.

### 4.1 Logical components

MEOGAP has five logical components:

| Component | Responsibility |
|---|---|
| **UI** | User interaction and presentation: product discovery, request configuration, Requests view, map/plot display and download actions. |
| **GAT — Gateway** | The unique public REST entry point. It validates public request structure and routes operations to the responsible logical component. |
| **CON — Control / Orchestration** | Authoritative request lifecycle, proposal preparation, cost coordination, access decisions, execution-plan orchestration, cancellation and delivery orchestration. CON does not own scientific methods or a catalogue of concrete assets. |
| **SCI — Scientific Processing** | Scientific product definitions and methods, feasibility, scientific input requirements, computation and generation of scientific result representations. SCI does not resolve scientific criteria to concrete available acquisitions or own request lifecycle. |
| **CAT — Data and Asset Catalog** | Discovery and availability of concrete source/product assets, resolution of scientific requirements to exact assets, identification of missing inputs, L0 acquisition/ingestion and itemized acquisition pricing, asset registration, actual lineage, canonical asset references and current storage locations. CAT does not define scientific methods or orchestrate generation of missing scientific products. |

### 4.2 Validated interaction boundaries

The main logical routes are:

- **UI ↔ GAT:** all user-facing operations use the single public REST Gateway.
- **GAT ↔ CON:** request submission and state, proposal confirmation, cancellation, access decisions and Delivery Management.
- **GAT ↔ SCI:** scientific product catalogue and theoretical input requirements only.
- **CON ↔ SCI:** scientific feasibility and input requirements, computation-complexity estimates, computation dispatch and execution outcomes.
- **CON ↔ CAT:** concrete dependency resolution, L0 ingestion, itemized acquisition costs, actual lineage, and on-demand resolution of canonical asset references and current storage locations.
- **SCI ↔ CAT:** registration of generated-product metadata and actual input lineage, followed by registration confirmation.
- **No direct GAT ↔ CAT interface:** user-facing asset and lineage operations pass through CON.

For a generated product, SCI writes the result object to object storage and sends CAT the computation metadata, initial location and exact input assets actually used. CAT registers the asset and its actual lineage. CON records the logical task outcome, but does not maintain a duplicate product-to-asset or asset-to-location mapping. Whenever CON needs an asset reference or location, it queries CAT.

For a computation input, the route is **CAT → CON → SCI**: CAT resolves the scientific input requirements to concrete assets; CON passes their current canonical references and locations to SCI. SCI accesses the objects directly from storage.

For visualization or delivery, CON first checks access rights and then queries CAT for the current canonical reference and location. CON passes these to SCI for representation generation, or uses them to retrieve objects and assemble a delivery. A dependency archive is generated on demand from CAT's **actual lineage**, not from CON's planned execution graph.

### 4.3 Supporting mechanisms and external infrastructure

The following are not additional logical components:

- **Workers** execute long-running ingestion, computation or archive-assembly tasks. CON decides which computations are eligible; workers do not resolve scientific dependencies themselves.
- **NATS** is a candidate internal messaging transport. It is not a business component or a public interface. Its use, delivery guarantees and recovery behavior remain interface/contract decisions.
- **EO providers** are external systems accessed by CAT for source acquisitions.
- **Object storage** is infrastructure. SCI reads and writes objects directly; CON may read objects for delivery; CAT owns the logical asset catalogue and canonical storage-location mapping.

The request state remains retrievable through REST. Notifications are optional refresh mechanisms and are not a second source of truth.

### 4.4 Request lifecycle and API behavior

Submitting an analysis request starts proposal preparation: CON persists the request, coordinates scientific feasibility and dependency resolution, and calculates the estimated cost. The proposal is returned for explicit user confirmation. Confirmation starts execution; the user may request cancellation in any request state except `COMPLETED`.

Any user-facing operation expected to take more than **5 seconds** is exposed asynchronously from the start. GAT returns a request/reference and current state; UI retrieves state and the eventual outcome through REST. This API behavior does not dictate whether internal work uses a worker, NATS or another mechanism.

### 4.5 Implementation boundary

These are logical responsibility boundaries, not a required one-to-one mapping to packages, processes, containers or deployed services. The architecture is a design target, not a claim that all listed capabilities are already implemented. The current repository remains a scaffold; M0 demonstrates a deterministic end-to-end journey with selected mocked behavior, while real EO acquisition, scientific products and reusable processing capabilities arrive incrementally under their respective tickets.

**Legacy component drafts:** some first-draft specifications still use earlier component names or responsibility allocations. They are not authoritative where they conflict with the five-component model above and must be reconciled before being used to define contracts or implementation.

---

## 5. Requirements and Reference User Journey

This document states project intent, scientific concepts and high-level architecture principles. The detailed system requirements and their M0 treatment are maintained in the dedicated baseline.

### 5.1 System requirements — single source of truth

The complete `SYS-*` requirement set, priorities, M0 treatment and target delivery are maintained exclusively in [System Requirements Baseline](specifications/sys.md).

Do not create or maintain a duplicate SYS table in this document. Requirement IDs, wording, priorities and delivery treatment must be changed in `specifications/sys.md`; this project definition may explain the scientific motivation but is not a competing requirements baseline.

### 5.2 Component specifications and architecture references

The current logical component model is **UI, GAT, CON, SCI and CAT**. The validated responsibility boundaries and interactions are documented in:

- [Component Interaction Design](architecture/system-interactions/component-interaction-design.md) — responsibilities, ownership boundaries and architecture decisions.
- [Component Interaction Matrix](architecture/system-interactions/component-interaction-matrix.md) — detailed producer/consumer interactions and logical routes.
- [Sequence diagrams](architecture/sequence_diagrams/README.md) — request submission, execution, result retrieval, and failure/recovery scenarios.

The documents under [component specifications](specifications/components/README.md) are first drafts and are not yet fully reconciled with the current architecture. They may contain legacy terminology and assumptions; do not treat those statements as current decisions until the component specifications are reviewed and aligned with the interaction design.

### 5.3 Engineering Requirements

Engineering requirements state outcomes, not implementation choices.

| ID | Priority | Requirement |
|---|---|---|
| **ENG-01** | P0 | Shared contracts shall have a single versioned source, explicit compatibility rules, contract tests, and an external API versioning policy; breaking changes shall require a version bump and coordinated consumer updates. |
| **ENG-02** | P0 | Request and execution state shall be persisted and recoverable after interruption. State-changing operations shall be idempotent so that retries do not duplicate requests, results, ledger entries, or notifications. |
| **ENG-03** | P0 | User-facing operations expected to take more than 5 seconds shall be exposed asynchronously from the start, with a persistent request reference and retrievable state/outcome. Long-running work shall execute outside the request-response cycle, with bounded retries, failure isolation and observable terminal states; a failed job shall not corrupt request state. Detailed execution progress belongs to technical observability and does not require business progress notifications. |
| **ENG-04** | P0 | Liveness and readiness shall be distinct; readiness shall reflect required dependencies, and degraded operation shall be explicit. |
| **ENG-05** | P0 | Structured logs and durable audit events shall carry request, result, and processing-run correlation; they shall be sufficient to diagnose failures and shall never contain secrets or sensitive user data. |
| **ENG-06** | P0 | Configuration shall be external, validated at startup, fail fast when invalid, and separate non-secret configuration from injected secrets. |
| **ENG-07** | P0 | Merge-blocking gates shall cover format, lint, type, unit, non-regression, functional, contract, traceability, documentation completeness, security and CVE, and migration checks. Validation and benchmark tests shall be runnable on demand. Changes to shared contracts shall validate all consumers. |
| **ENG-08** | P1 | Clean-environment reproducibility shall use lockfiles, pinned toolchains, deterministic test fixtures, and no mutable external state. |
| **ENG-09** | P1 | Documented commands shall cover installation, tests, quality, build, run, and operation. |
| **ENG-10** | P0 | Credentials and sessions shall be protected; secrets shall not be stored in the repository, images, or logs; components shall run with least privilege; dependency vulnerabilities shall be detected and exceptions documented according to the project CVE policy. |
| **ENG-11** | P1 | Operational metrics and traces shall expose request and result throughput, latency, failure rate, queue depth, and processing outcomes, correlated with request and result identifiers. |
| **ENG-12** | P0 | Persistent schema changes shall be versioned migrations, applied consistently, tested, and shall preserve result versions, lineage, and ledger history. |
| **ENG-13** | P1 | Backup and restore of requests, results, lineage, and ledger data shall be documented and tested. |
| **ENG-14** | P1 | Third-party licenses, attributions, and dependency inventory shall be tracked; an SBOM may be generated. |

### 5.4 Reference usage scenario

After signing in, a user sees a multi-resolution satellite basemap, selects a supported product (for example, nighttime radiance), defines an AOI, POI or LOI and chooses a range of months. The user submits an **analysis request**. The request appears in the **Requests** view while CON prepares the proposal by evaluating scientific feasibility, resolving dependencies and estimating cost. The estimated cost and feasibility outcome are then displayed to the user, who explicitly confirms or cancels the request. After confirmation, execution begins; the request state remains retrievable through REST, while notifications may refresh the UI. The user can request cancellation in any state except `COMPLETED`. Once the request succeeds, the user can download the **final product only**, or request an on-demand archive containing the product and its actual dependencies. The user selects **Display on map** from the request entry. The final product appears cropped to the spatial input for an available month, and the user selects a **Spatial Analysis Unit** to inspect its time series. If a month contains no valid observations, the plot shows a gap or an explicit unavailable status—not a zero. A successful request can therefore still contain missing observations. The user can also identify the source, method, quality status and scientific validation status behind the result.

**This single journey, together with the minimal indicator placeholder path, is a sufficient first end-to-end demonstration.** Multiple sensors, elaborate monitoring indicators, distributed execution and advanced scientific retrieval algorithms are not needed to prove it.

### 5.5 Terminology

- **AOI**: Area of Interest, a polygonal spatial input for a request.
- **POI**: Point of Interest, a point spatial input for a request.
- **LOI**: Line of Interest, a line spatial input for a request.
- **Spatial input**: the AOI, POI, or LOI defining a request's region of interest; the product is cropped to it.
- **SAU**: Spatial Analysis Unit used for resampling, averaging, and time-series plots; it is not a native storage grid and is not a request spatial input.
- **AOI summary**: aggregate summary over the AOI used for plots when a single SAU is not selected; it is not an SAU and does not imply native resolution.
- **Coverage**: fraction of an analysis unit with valid observations, used to qualify aggregation and missing-data status.
- **Quality index**: product quality indicator that may be `unknown` when it has not been computed.
- **Native resolution**: source or product spatial resolution; resampling to an SAU does not create new measured detail.
- **Dependency graph/tree**: versioned directed graph of product dependencies and intermediate products; it is a DAG when intermediates are shared.
- **Request**: a product submission with its spatial input, time window, and parameters.
- **Basemap**: multi-resolution satellite context used for spatial orientation and spatial-input selection; it is not an analysis result.
- **Result**: the output associated with a request; it may contain missing or masked values.
- **Result version**: immutable revision of a completed result linked to its request, product and dependency versions, and processing run; recomputation creates a new version.
- **Representation**: a derived technical or analytical view of a result (native data, common-grid resampling, H3 aggregation, extracted series, display image or archive). It is linked to its source result and documents its transformation, support, resolution, coverage and known information loss; it is not a new scientific product by itself.
- **Native grid**: the geometry, coordinate reference system and resolution of a source observation or computed product, preserved as the scientific reference.
- **Spatial harmonization**: an explicit operation that transforms or compares data on a common spatial support, such as reprojection, resampling or aggregation.
- **Spatial harmonization operation**: an explicit, replaceable scientific operation that transforms data onto a documented common support. It is a processing capability, not a sixth logical component; it must not absorb unrelated product-specific scientific computation or decide aggregation validity without a documented method.
- **Datacube**: an organized multidimensional store for a product across space and time. Its physical layout is an implementation decision and must not leak into product definitions or access contracts.
- **Partial read**: retrieval of a bounded temporal or spatial slice of a result without loading the whole result.
- **Retention**: the policy governing how long source observations, scientific results and derived representations are kept, which may differ by category.
- **Lineage**: recorded links between a result and its request, product and dependency versions, intermediate products, source observations, processing run and derived representations.
- **Successful request**: technically completed; it does not imply scientific validation or complete observations.
- **Time window**: UTC interval `[start, end]`, with both bounds inclusive, at date or month granularity.
- **Missing observation**: no usable observation; it is never treated as zero.
- **Masked/cloud-affected value**: an observation excluded by a quality mask.
- **Zero**: a genuine measured zero, distinct from a missing observation.
- **Validation record**: product metadata containing a reference, a metric, a tolerance, an observed result, and a scientific validation status (`validated` or `unvalidated`). It is distinct from per-result quality status.
- **Quality status**: per-result data-quality assessment (`validated`, `poor_quality`, `unknown`), distinct from product-level scientific validation.
- **Authentication**: identity verification and sign-in/sign-out. The platform is multi-account capable; the first demonstration may use a mock or basic auth provider, without registration, roles, or password reset.
- **Credit**: unit used to estimate and record the cost of an analysis request.
- **Cost estimate**: expected credit cost presented before a request is admitted.
- **Intermediate product**: a product produced as a dependency of another product and retained for reuse and provenance.
- **Indicator placeholder**: minimal end-to-end path that represents a monitoring indicator without implementing the full evaluation engine.
- **Configuration**: deployment-supplied values, not code constants.

## 6. Non-Functional Requirements and Scientific Safeguards

| Area | Principle |
|---|---|
| **Scientific integrity** | Document assumptions, units, data validity, source characteristics and limitations. A visually plausible output is not proof of scientific correctness. |
| **Validation status** | Scientific validation status must be explicit and must not be inferred from a successful request. |
| **Access control** | User-owned requests and results must only be accessible to the authenticated owner. The platform must be multi-account capable; the first demonstration may use a mock or basic auth provider, with registration, roles, and password reset out of scope. |
| **Security** | Credentials and sessions must be protected, and secrets must not be stored in the repository. |
| **Cost transparency** | Credit cost must be visible before admission and after processing; credit balances and cost records must remain auditable. |
| **Documentation** | Every supported product must have versioned documentation; missing or incomplete documentation is a quality defect. |
| **Reproducibility** | Preserve enough provenance to explain and, when source data remain available, reproduce a result. |
| **Spatial honesty** | Retain native resolution information, describe any resampling or spatial aggregation, and document how products are cropped to AOI, POI, or LOI; do not imply artificial precision. |
| **Representation honesty** | Every derived representation must link to its source result and state its transformation, spatial support, resolution, coverage and known loss; a display image is never the sole copy of a scientific result. |
| **Storage abstraction** | The result access contract must not expose physical paths or require a specific storage backend; bounded temporal and spatial slices must be supported. |
| **Boundary enforcement** | Spatial extent, period, pixel count, memory and response-size limits must be explicit and enforced before processing or retrieval. |
| **Temporal honesty** | Make observation gaps, cloud masking, period definitions and incomplete coverage explicit. |
| **Modularity** | A new scientific product should not require modifying unrelated presentation and service logic. |
| **Request-state reliability** | REST-accessible request statuses and results must remain recoverable after interruption. Notifications improve responsiveness but must not become the sole source of state. |
| **Pragmatism** | Work on bounded spatial inputs and periods; increase processing complexity only when a real limitation is encountered. |
| **Data use** | Prefer openly accessible datasets and open-source software, while respecting provider access, attribution and redistribution conditions. |

---

## 7. Delivery Planning and Source of Truth

**GitHub issues and project tickets are the sole source of truth for planned implementation work, milestone sequencing, acceptance criteria and readiness.** There is intentionally no separate roadmap document: duplicating ticket plans in a Markdown file would create competing sources of truth.

This definition describes project intent, scientific concepts, architecture principles and the intended capability boundaries. It does not authorize implementation or override ticket-level scope. Before implementation, use the relevant ticket to confirm scope, dependencies, acceptance criteria and the explicitly reviewed implementation/test plan. If a requirement and a ticket appear inconsistent, surface the discrepancy and resolve it in the relevant issue rather than silently reconciling the documents.

Scientific exploration remains flexible: advanced products, including LST, can be investigated whenever their scientific prerequisites and the current project priorities make sense. No specific scientific domain is mandatory simply because it appears in this definition.

## 8. Scientific Exploration Backlog

This backlog is **illustrative and non-binding**. Its role is to capture interesting learning opportunities rather than prescribe the next feature.

| Candidate exploration | Scientific learning opportunity | Possible comparison |
|---|---|---|
| Nighttime radiance | Radiometry, temporal composites, spatial trends, data quality | Published VIIRS/Black Marble products |
| NDVI / water indices | Spectral bands, reflectance, masking, index interpretation | Independently calculated or documented reference indices |
| Fractional vegetation cover | Empirical transformations, assumptions and sensitivity | Literature examples and published methods |
| Land Surface Temperature | Thermal remote sensing, emissivity, atmospheric correction, multi-input algorithms | Landsat LST products and the method of Ermida et al. (2020) |
| Optical water indicators | Water optics, atmospheric effects, local calibration | Reference products or in-situ data if available |
| Multi-source monitoring | Spatial support, temporal compatibility, composite indicators | Method-specific comparisons and sensitivity analysis |

A comparison with an existing satellite product is a useful **preliminary check**, not necessarily independent scientific validation. Each study should record what was learned, what assumptions were made, and what remains uncertain.

## 9. Key Risks and Mitigations

| Risk | Why it matters | Pragmatic response |
|---|---|---|
| **Scope creep** | Too many architectural features may delay useful scientific work. | Preserve a very small first end-to-end objective. |
| **Scientific mistakes** | An algorithm may run correctly but produce invalid physical interpretations. | Document methods and compare results with credible references. |
| **False spatial precision** | A common grid can conceal coarse native observations. | Keep native resolution and aggregation method visible. |
| **Temporal gaps and poor observations** | Missing or cloudy periods can be mistaken for real changes. | Treat data validity and coverage as part of each result. |
| **Incompatible sources** | Different units, resolutions or acquisition times may invalidate a comparison. | Harmonize deliberately; reject unsupported combinations. |
| **Cost and provider dependency** | Free datasets still have processing, storage and access constraints. | Prefer small regions, reuse results and keep data sources replaceable. |
| **Over-engineering** | Premature technical decisions can make experimentation harder. | Let the template govern implementation; document only essential responsibilities here. |
| **Datacube over-engineering** | Persisting a generic multidimensional cube before a demonstrated product need may freeze speculative schemas and heavy infrastructure. | Stabilize contracts first; prototype storage and partial reads only after the first real product. |
| **Representation mistaken for result** | A display image or aggregated grid may hide native resolution and uncertainty. | Keep representations explicitly derived and linked; never treat them as the sole result. |
| **Changing personal interests** | A rigid use-case roadmap would make the project feel like an obligation. | Keep scientific investigations optional and interchangeable; tickets, not a separate roadmap file, govern implementation sequencing. |

## 10. Future Directions and Success Criteria

**Possible future directions** include advanced product families, improved aggregation and uncertainty handling, cross-sensor fusion, richer indicator rules and alerts, more capable execution infrastructure, or controlled LLM/MCP access to the existing REST services. Extending access to an external agent is not part of the initial MVP, even though the REST interface itself is an early requirement.

**Success should be assessed primarily through scientific learning and secondarily through the platform's ability to grow:**

- Each experiment deepens the author's understanding of EO data, physical measurements, methods, assumptions or sources of uncertainty.
- A scientifically meaningful product can be added without redesigning the whole application.
- Its assumptions, sources, processing depth and limitations remain understandable.
- Successful processing requests can be retrieved from a visible request history and explored consistently through maps, spatial selection and time series.
- The software remains maintainable and useful to the author over time.
- Implementing a new product produces both a reusable capability and genuine scientific learning.

### How to use and evolve this document

This proposal is the **source of intent**, not the source of implementation details. Future design documents and the project's template will define code organization, interfaces, technologies and deployment. When an implementation choice conflicts with a stated objective, the conflict should be made explicit and this proposal revised if necessary.

An agent reading the proposal should distinguish **required capabilities**, **later extensions**, and **illustrative scientific ideas**; it should not automatically implement an example because it appears in the application list or research backlog.

### Reference

- Ermida, S. L., et al. (2020). *Google Earth Engine Open-Source Code for Land Surface Temperature Estimation from the Landsat Series*. Remote Sensing, 12(9), 1471. https://doi.org/10.3390/rs12091471 — see [Land references](papers/products/land.md#lst).

---

**End of proposal — v0.19.**
