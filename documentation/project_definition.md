# MEOGAP — Modular Earth Observation & Geospatial Analytics Platform

**Project Definition — v0.16 (Concept and Requirements)**

**Status:** Living draft · **Date:** 28 October 2026

**Project type:** Personal learning and scientific exploration project, with an engineering portfolio dimension

> **Purpose of this document**  
> Explain *why* MEOGAP exists, with **learning Earth observation as its primary goal**, *what* it should enable, and *which responsibilities* belong to its main components. It is intentionally **not** an implementation plan: repository structure, programming interfaces, data schemas, deployment topology, and framework-level architecture will be defined separately by the project's template and subsequent design work.

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
| **Result representation** | A technical or analytical view of a result: native data, a common-grid resampling, an H3 aggregation, an extracted series, a display image or an archive. | Produced by the Product Engine or Backend and linked to its source result |
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

A user should be able to select a spatial input (AOI, POI, or LOI) for an analysis and an individual SAU for aggregated evolution, then view a product for a chosen period and inspect its evolution by month, season or other supported time windows. For POI/LOI inputs, the UI sends the original geometry and explicit buffer parameters; buffering into an AOI is a backend responsibility. Missing observations, cloud masking, insufficient coverage and actual measured zeros must remain distinguishable. In particular, **“no data” must never be silently interpreted as “no change.”**

Product outputs are not restricted to raster images: they may also be numerical values, per-unit measurements, time series or other suitable representations. The Core provides the analytical results; the Frontend presents them as maps and charts.

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

The access contract for results must remain **independent of the physical storage organization**. A consumer must be able to request a bounded temporal or spatial slice, or a single representation, without knowing whether the data are stored as rasters, multidimensional arrays, files or database records. Loading an entire result is acceptable only within explicit request limits (spatial extent, number of dates, pixel count, memory and response size).

**Cartographic images are generated on demand, possibly with a cache.** The platform must not require a persisted image per date, and a display image must never become the sole persistent copy of a scientific result. Missing, masked, invalid, partial and genuine-zero values must remain distinguishable in every representation.

The choice of a physical datacube organization (versioned raster collection, multidimensional array store such as Zarr, or another layout) is an implementation decision. It must not leak into product definitions or into the frontend contract.

---

## 4. Logical System Architecture

This section defines **logical responsibilities**, not a one-to-one mapping to packages, processes or deployed services. The same implementation package may support more than one responsibility, and a responsibility does not automatically require a separate microservice.

**High-level flow:** **UI → public REST Gateway (GTW) → CON / CAT / SCI or Workers → result/status exposed through GTW → UI**. GTW routes requests to backend components or Workers via internal REST or NATS according to the use case and interface contract. The UI never accesses NATS directly. REST is the public source of truth for request state and result access; NATS is internal messaging infrastructure.

| Logical responsibility / mechanism | Responsibility | Explicit boundary |
|---|---|---|
| **UI** | Product and spatial-input selection, request submission, Requests view, status display, result visualization and time-series exploration. | Communicates with the public REST Gateway only; never publishes to or consumes from NATS directly. |
| **GTW — Gateway** | Global public REST interface; validate external/UI requests and route them to backend components or Workers via internal REST or NATS. | Owns the public API contract and routing boundary; does not own request lifecycle/access policy, scientific algorithms or physical asset management. |
| **CON — Request Management** | Own analysis-request lifecycle, request ownership and access rights for computed resources; coordinate request/task state. | Owns authoritative request state and resource-access decisions; does not expose the public API or calculate scientific products. |
| **CAT — Data Catalog** | Discover and register available data assets; expose asset metadata, references, availability and persistence location; support lookup of source and derived assets. | Owns asset discoverability and registration, not scientific calculations or a second analysis orchestration engine. A separate CAT service is not mandated. |
| **SCI — Scientific Processing** | Define scientific product meaning and versions; resolve scientific dependencies; execute transformations; apply scientific quality rules; produce result metadata and provenance. | Owns scientific semantics and computation, not public request access or the physical storage implementation. |
| **Workers — execution mechanism** | Execute asynchronous acquisition or scientific tasks and report outcomes. | Runtime mechanism rather than a separate logical business responsibility. Acquisition and scientific tasks may initially share worker code/pool; split pools only if justified by workload or isolation needs. |
| **NATS — internal messaging** | Carry internal task messages and/or state-change events between backend processes. | Never a public API or a browser-facing source of truth. Exact message contracts are specified separately. |

**Implementation mapping (provisional):** `meogap_api` implements most GTW responsibilities; `meogap_core` is a reusable software library for scientific logic, adapters and shared abstractions, and is not synonymous with the SCI responsibility; `meogap_worker` executes tasks using those capabilities. CAT's software boundary and persistence mechanism remain to be designed. Do not create a separate service solely because CAT is a distinct logical responsibility.

**Data and result lifecycle:** SCI defines and executes scientific transformations. CAT registers and makes source and derived assets discoverable. The hand-off for derived results must link the scientific result and its provenance to the stored asset without conflating scientific lineage with physical storage metadata. Acquisition status and analysis-request status are distinct. Avoid duplicate download/orchestration logic between CAT and Workers.

**M0 boundary:** Demonstrate one deterministic browser-driven request journey through UI → REST API → mocked/simulated processing → result → UI. This is not evidence of a production data catalog, real EO acquisition, scientific computation, authentication, owner isolation, credit ledger or robust persistence. Contracts and observable states may be real while scientific data and selected services are mocked. Full capabilities are allocated to later milestones in the roadmap.

**Notifications:** NATS is internal and remains an implementation-level transport. Notifications only signal that state may have changed; clients retrieve authoritative state and results through REST, including after reconnection. The specific browser-facing update mechanism is a separate implementation decision and must not create a second source of truth.

**Key architectural constraint:** Keep public routing (GTW), request lifecycle/ownership/access rights (CON), asset discovery/registration (CAT), scientific semantics and computation (SCI), execution (Workers), internal transport (NATS), and presentation (UI) conceptually distinct. These boundaries do not prescribe deployment topology.

## 5. Functional Requirements

Requirements are described at these levels:

- **System/Service (`SYS`)**: what the platform must make possible, independently of implementation. System requirements may also establish logical responsibility boundaries where these are necessary to keep public access, data assets and scientific computation distinct.
- **Component (`FE`, `CORE`, `BE`)**: the current component-level requirement inventory. During refinement, each item must be mapped to its actual logical owner: UI, GTW, CON, CAT, SCI, or a cross-cutting/system concern. `BE` and `CORE` are existing requirement prefixes, not final logical component names.
- **Engineering (`ENG`)**: capabilities required to build, operate, and validate the platform, independent of user-facing features. Engineering requirements state outcomes, not implementation choices.

The logical responsibilities **GTW/CON/CAT/SCI** are not package names. Do not silently rename or delete existing requirement IDs; keep an explicit traceability/migration map when the component inventory is reallocated.

**Priorities and delivery scope:** `P0` = required to be represented in the M0 end-to-end demonstration, which may mean a real contract with mocked data/behavior or a deliberately partial implementation; it does **not** imply that the full capability is implemented in M0. `P1` = later foundational capability, generally M1–M3; `P2` = later extension. The requirement's full intended behavior and its M0 demonstration scope must be distinguished explicitly. The allocation matrix and roadmap define when full behavior is delivered.

### 5.1 System / Service Requirements

| ID | Priority | Requirement | M0 treatment / full delivery |
|---|---|---|---|
| **SYS-01** | P0 | The platform shall expose a catalogue of the scientific products it supports, with the information needed to understand each product's purpose, scientific context, processing level, inputs and outputs, spatial and temporal characteristics, units, known limitations, documentation reference, and scientific validation status. Catalogue availability shall describe what can be requested and shall not imply that a computed result is already available. | M0: expose one synthetic product descriptor with explicit demo/unvalidated status. Full real catalogue metadata grows with the first real product in M1 and reusable definitions in M2. |
| **SYS-02** | P0 | A user shall be able to define or select a spatial input for an analysis — an Area of Interest (AOI), Point of Interest (POI), or Line of Interest (LOI) — according to the spatial input types supported by the selected product and within configurable constraints. | M0: support AOI, POI and LOI. UI sends original POI/LOI geometry and explicit buffer parameters; the backend bufferises these inputs and treats the resulting geometry as an AOI downstream. Product-specific constraints may still reject unsupported requests. |
| **SYS-03** | P0 | A user shall be able to submit an analysis request for a supported product with all required inputs and parameters, including the spatial input, UTC time period, and product-specific parameters. Invalid or incomplete requests shall be rejected with explicit feedback. | M0: submit a deterministic request with validated required fields, AOI and UTC period through REST; reject invalid/missing fields. Real source-specific parameters and validation expand in M1–M2. |
| **SYS-04** | P1 | The platform shall calculate the requested product, including required intermediate products, or retrieve a suitable existing result according to documented product-version, parameter, spatial and temporal coverage, quality, and access criteria. | M0: deterministic simulated processing/result retrieval only. First real EO product and source access in M1; reusable dependency resolution and compatible-result reuse in M2. |
| **SYS-05** | P0 | A user shall be able to display a successful analysis request as a geographical result, cropped to its spatial input, for a supported time window, using an action in the Requests view. | M0: display a successful synthetic request result from Requests through the UI/API contract. Real product rendering in M1. |
| **SYS-06** | P0 | A user shall be able to select a Spatial Analysis Unit (or an AOI summary) and inspect a product's evolution over time. | M0: demonstrate a synthetic SAU-like selection or AOI summary and time series without requiring a physical H3 grid. Real SAU aggregation is developed in M1–M2. |
| **SYS-07** | P0 | The platform shall distinguish valid values (including genuine zeros), missing observations, masked/cloud-affected values, and processing failures. | M0: fixtures and UI/API contracts distinguish zero, missing/masked data and processing failure. Real sensor masks and source-specific quality handling in M1. |
| **SYS-08a** | P0 | A user shall be able to filter results by a UTC time window `[start, end]`, with both bounds inclusive, at date or month granularity. | M0: support an inclusive UTC range at the demo's fixed granularity. Product-specific supported frequencies and bounded windows are defined in M1–M2. |
| **SYS-08b** | P1 | A user shall be able to obtain configurable seasonal or richer temporal aggregations and summaries. | M0: not required. Rich seasonal/time aggregations remain a later extension. |
| **SYS-09** | P2 | The platform shall support meaningful comparison or combination of products with different spatial and temporal characteristics through explicit harmonization. | Deferred extension. Do not implement multi-product comparison in M0; first explicit harmonization operation is targeted for M1, with broader multi-product comparison later. |
| **SYS-10** | P0 | Each calculated result shall be immutable and versioned when recomputed, and shall expose its lineage: source datasets, intermediate products, method and version, parameters, time window, spatial scope, quality status and limitations, and scientific validation status. | M0: minimal synthetic result contract with stable result identity, request/product reference, parameters, spatial/time scope and status. Full scientific lineage, dependency/intermediate provenance and persistent immutable versions in M2, with platform hardening in M3. |
| **SYS-11** | P2 | A user shall be able to define a monitoring indicator that combines existing products and monitoring rules. | M0: no functional indicator engine or stub evaluation is required; a non-functional/visual placeholder may communicate future scope. Initial real engine and UX in M4; advanced rules later. |
| **SYS-12** | P1 | An authenticated user shall be able to consult a dedicated list of their own analysis requests, see the current state of each request, and access its available results, cost, and quality status. | M0: Requests view and state display against a local deterministic demo identity/data set; real authentication and owner-scoped access in M3. |
| **SYS-13** | P1 | A user shall be able to download a successful result as a final product, with its units and essential context. | M0: functional download of a deterministic synthetic result artifact; real product artifact download as real products arrive, with provenance-based archives in M3. |
| **SYS-14a** | P1 | Every supported scientific product shall carry a mandatory validation record containing at least a reference, a metric, a tolerance, an observed result, and a scientific validation status (`validated` or `unvalidated`). The record shall be exposed with the product and its results. This product-level status is distinct from the per-result quality status. | M0: synthetic catalogue may label validation as unvalidated; enforce real product validation records with the first real EO product in M1. |
| **SYS-14b** | P1 | Scientific methods shall document at least one comparison with a published method or reference product, or justify why no suitable comparison is available. | M0: not required for the synthetic demo. Compare the first real scientific method against a published method or reference in M1 where a suitable reference exists. |
| **SYS-15** | P1 | The platform shall be extensible with additional products and data sources without requiring a redesign of the user experience. | M0: demonstrate a small product descriptor/contract that does not hard-code scientific computation into the UI. Prove reusable extensibility with the Product Engine in M2. |
| **SYS-16** | P0 | The Requests view shall reflect request-state changes automatically, without requiring the user to reload the page. After reconnection, the current state shall remain retrievable through REST. | M0: demonstrate state updates in the local demo and use REST to recover current state; production-grade notification delivery and recovery are hardened later. |
| **SYS-17** | P1 | The platform shall provide REST-based access to submit and consult analysis requests, their statuses, and their results for authenticated users and authorized future consumers, with access scoped to the caller's data and with the caller identity and request origin recorded for authorization and audit. | M0: implement the public REST contract for the local demo without claiming production authentication/authorization. Authenticated, owner-scoped access and audit in M3. |
| **SYS-18** | P1 | The platform shall authenticate users, support sign-in and sign-out, and restrict access to each user's own requests, results, and derived data. It shall support multiple user accounts and propagate the authenticated identity to every component involved in processing a request. | M0: no real authentication, multi-account support or security claim. Full authentication, ownership isolation and identity propagation in M3. |
| **SYS-19** | P1 | The platform shall maintain versioned, reusable scientific product definitions, including their processing level, supported spatial input types and constraints, input requirements, dependency graph/tree with intermediate products, parameters, outputs, documentation, and scientific validation status. | M0: minimal deterministic product descriptor sufficient for the demo. Full versioned definitions and dependency graph in M2. |
| **SYS-20** | P1 | Each product result and source observation shall carry the quality metadata needed to interpret it, including a quality status (`validated`, `poor_quality`, `unknown`) and a quality index field whose value may be `unknown` when it has not been computed. When several sources are available, the platform shall select them according to documented quality and availability criteria. Computing the quality index from factors such as spatial resolution, cloud cover, and source characteristics is a later capability. | M0: synthetic fixtures preserve quality/unknown/missing distinctions. Real source-quality handling in M1; reusable quality selection in M2. |
| **SYS-21** | P1 | The platform shall support configurable temporal frequencies and maximum periods for products and source observations, including daily, monthly, annual, seasonal, and custom definitions. | M0: fixed demo-supported period/frequency only. Product-specific temporal capability definitions in M1–M2. |
| **SYS-22** | P1 | Every supported scientific product shall have versioned documentation covering its purpose, method, inputs, outputs, units, assumptions, limitations, references, and validation. Documentation completeness shall be verified by the project's quality gates and its status exposed in the product catalogue. | M0: document the synthetic demo product sufficiently to explain its placeholder status. Full quality-gated documentation for the first real product in M1 and reusable catalogue checks thereafter. |
| **SYS-23** | P1 | A user shall be able to download a successful result as a final product only, or as an archive that additionally includes its intermediate products and source observations, organized as a directory tree with the provenance needed to interpret them. The archive shall be constructed from the actual lineage of the result; source observations already available in the source store may be referenced rather than duplicated. | M0: no archive or real lineage packaging. Real archive built from actual lineage in M3. |
| **SYS-24** | P1 | Before accepting an analysis request, the platform shall estimate its cost in credits, verify that the authenticated user has sufficient credits, and record the admission decision. After processing, it shall record the actual cost and update the user's credit balance according to the configured credit policy. The initial configuration may grant unlimited credits, but estimation, admission, and recording shall still occur. | M0: simulated estimate/balance/admission for the demo only; no real ledger or financial accounting. Real admission and idempotent ledger in M3. |
| **SYS-25** | P0 | A user shall be able to see the estimated cost before submitting a request, the actual cost after processing, and their current credit balance. | M0: show deterministic simulated cost and balance with explicit demo semantics. Real values from the credit ledger in M3. |
| **SYS-26** | P0 | The platform shall expose a storage-independent access contract for a result that can return a bounded spatial and temporal slice without requiring the whole result to be loaded. | M0: define and exercise the contract against a small synthetic result. Real bounded partial reads after the first real product, based on measured needs and an ADR for storage constraints. |
| **SYS-27** | P1 | Every derived representation shall be linked to its source result and shall record its transformation method and version, spatial support and resolution, coverage, missing-data rules, and known information loss or uncertainty. | M0: minimal synthetic representation descriptor and source-result link. Full lineage/coverage/loss metadata in M1–M2 as real representations are introduced. |
| **SYS-28** | P0 | The platform shall generate display representations on demand or from a cache; it shall not require a persisted image per date, and a display representation shall never be the sole persistent copy of a scientific result. | M0: demonstrate a display representation generated from synthetic result data; real rendering follows the first real product in M1. The principle forbids designing a mandatory per-date image store. |
| **SYS-29** | P0 | The platform shall define spatial harmonization as an explicit, replaceable operation with a contract that records method, target support, aggregation, coverage and native-resolution context. H3 may be an analysis support but shall not be treated as a storage format or as a raster resampling algorithm. | M0: contract and deterministic synthetic demonstration only. First real harmonization implementation in M1; do not require a physical H3 grid in M0. H3 aggregation and raster resampling remain distinct operations. |
| **SYS-30** | P0 | The platform shall enforce explicit analysis-request limits covering spatial extent, temporal period, pixel count, memory and response size, and shall reject requests outside supported bounds with explicit feedback. | M0: enforce a small, deterministic set of request limits in the demo API. Full resource-aware limits as real data and processing are introduced. |
| **SYS-31** | P0 | The system architecture shall define and preserve distinct responsibilities for the public REST Gateway (GTW), request and resource-access management (CON), Data Catalog (CAT), Scientific Processing (SCI), user interface (UI), asynchronous execution (Workers), and internal messaging (NATS). CON shall own request lifecycle, request ownership and access rights for computed resources. GTW shall route external/UI requests to backend components or Workers through internal REST or NATS according to the interface contract. The UI shall use GTW as its public interface and shall not access NATS directly. These responsibilities shall have explicit ownership boundaries and contracts, without requiring a one-to-one mapping to packages, processes or deployed services. | M0: document the responsibility/interface model and demonstrate UI→GTW REST→simulated CON/SCI processing→GTW REST result retrieval. Runtime enforcement and complete CAT/SCI behavior are delivered incrementally in M1–M3. |

### 5.2 Frontend Requirements

**Alignment note:** The `FE`, `BE`, `CORE`, and `ENG` requirements remain aligned with the system requirements. This revision updates the development roadmap to introduce backend architecture, mock-backed core engines, and an MVP UI earlier in M0, and to sequence the first real product and analysis baseline before the reusable Product Engine and the first configurable Indicator Engine.

| ID | Priority | Requirement | Linked system requirements |
|---|---|---|---|
| **FE-01** | P0 | Present the catalogue of supported products with the information needed to understand each product: purpose, scientific context, processing level, inputs and outputs, spatial and temporal characteristics, units, known limitations, an openable documentation reference and status, and scientific validation status. Catalogue availability shall remain distinct from result availability. | SYS-01, SYS-14a, SYS-19, SYS-22 |
| **FE-02** | P0 | Let the authenticated user define or select a supported spatial input (AOI, POI, or LOI) within the selected product's constraints, choose a product, set a UTC time range `[start, end]`, and provide all required parameters. | SYS-02, SYS-03, SYS-18 |
| **FE-03** | P0 | Provide **Display on map** for the authenticated user's successful requests in the Requests view and render only the final product, cropped to the request's spatial input and appropriate to its geometry (raster, point, or line), with legend, units, quality, and scientific validation context. The frontend shall request a display representation through a storage-independent contract and shall not depend on physical storage paths or formats. | SYS-05, SYS-12, SYS-14a, SYS-18, SYS-20, SYS-26, SYS-28 |
| **FE-04** | P0 | Display a time-series chart for a selected SAU or AOI summary, using inclusive UTC filters at the granularities supported by the product, and allow selecting the SAU or AOI summary from the map or a list. Extracted values shall be requested through a bounded, storage-independent contract and shall retain their missing, masked and genuine-zero semantics. | SYS-06, SYS-08a, SYS-18, SYS-21, SYS-26, SYS-27 |
| **FE-05** | P0 | Clearly represent missing, masked, invalid, and genuine zero values, and expose units, quality status and index, method and version, scientific validation status, and known limitations. | SYS-07, SYS-10, SYS-14a, SYS-18, SYS-20 |
| **FE-06** | P0 | Provide a dedicated Requests tab listing the authenticated user's own requests, with processing and quality statuses, estimated and actual cost, failure reasons, and access to available results and downloads. | SYS-12, SYS-16, SYS-18, SYS-20, SYS-25 |
| **FE-07** | P0 | Provide a minimal indicator placeholder view to create an indicator definition, list indicators, trigger a stub evaluation, and see the placeholder result in the indicator view. The placeholder result is not a map layer. | SYS-11, SYS-18 |
| **FE-08** | P0 | Automatically reflect request-state changes for the authenticated user's requests in the Requests view without a page reload, provide a manual refresh fallback, show the live-update connection state, and retrieve the latest state through REST after reconnection. | SYS-16, SYS-18 |
| **FE-09** | P0 | Allow the authenticated user to download a successful result as a final product, with its units and essential context; this is the default download action. | SYS-12, SYS-13, SYS-18 |
| **FE-10** | P0 | Provide sign-in and sign-out, show the authenticated identity, and protect authenticated views. | SYS-18 |
| **FE-11** | P0 | Show the estimated credit cost before submission, the actual cost after processing, and any admission rejection due to insufficient credits. | SYS-24, SYS-25 |
| **FE-12** | P0 | Offer an optional secondary action to download an archive containing the final product, intermediate products, and source observations in a directory tree; the default action remains final product only. | SYS-18, SYS-23 |
| **FE-13** | P2 | Support viewing and comparing compatible products on common spatial and temporal supports, with explicit harmonization context. | SYS-09 |
| **FE-14** | P0 | Always display the authenticated user's current credit balance in the persistent application shell, and update it when admission or processing changes it. If the balance is unavailable, show an explicit unavailable state, never zero. | SYS-18, SYS-24, SYS-25 |
| **FE-15** | P0 | Allow the authenticated user to show or hide each request's final product layer on the map. Toggling visibility is a front-end display preference: it must not delete the request, affect processing, or change the stored result. Intermediate products and source observations are never displayed as map layers. | SYS-05, SYS-12, SYS-18, SYS-23 |
| **FE-16** | P0 | Allow the user to draw or select an AOI, POI, or LOI on the map as the request's region of interest, validate it against the selected product's constraints with explicit feedback, and display the selected spatial input geometry on the map. | SYS-02, SYS-03, SYS-18 |
| **FE-17** | P0 | Expose explicit loading, empty, unavailable, partial-result, and failure states across the catalogue, requests, map, time series, balance, and downloads; show request failure reasons and download errors. | SYS-07, SYS-10, SYS-16, SYS-18, SYS-24, SYS-25 |
| **FE-18** | P0 | Handle expired or invalid sessions by redirecting to sign-in and preserving the intended destination. | SYS-18 |
| **FE-19** | P1 | Provide filtering, sorting, and pagination for the authenticated user's requests. | SYS-12, SYS-18 |
| **FE-20** | P1 | Provide search and filtering in the product catalogue. | SYS-01 |
| **FE-21** | P0 | Provide a multi-resolution satellite basemap with zoom-dependent visible imagery at multiple scales, usable as the spatial context for AOI, POI, and LOI selection. The basemap is context only, not an analysis result; attribution and licensing shall be respected. Automated tests use deterministic local tile fixtures or a local mock tile endpoint, not the live provider. Offline mode uses only cached tiles permitted by provider terms; if none are available, the UI clearly indicates that satellite imagery is unavailable while keeping supported geometry interaction and other UI states usable. | SYS-02, SYS-05, SYS-18 |

### 5.3 Core / Product Engine Requirements

| ID | Priority | Requirement | Linked system requirements |
|---|---|---|---|
| **CORE-01** | P0 | Acquire or access the source observations needed by a product, select sources according to documented quality and availability criteria, and record source dataset identifiers and versions. | SYS-03, SYS-04, SYS-20 |
| **CORE-02** | P0 | Calculate the pinned product version from its defined inputs and parameters, reproducibly for identical versions, inputs, and parameters. | SYS-04, SYS-19 |
| **CORE-03** | P0 | Produce geographically interpretable results and values, cropped to the requested AOI, POI, or LOI and appropriate to the output geometry, while preserving native-resolution metadata and the spatial context needed by derived representations. | SYS-02, SYS-05, SYS-06, SYS-27 |
| **CORE-04** | P0 | Provide temporal filtering and analysis-ready series over inclusive UTC windows at product-supported frequencies and maximum periods, with per-period availability. | SYS-06, SYS-08a, SYS-21 |
| **CORE-05** | P0 | Handle source quality information, masks, missing observations, genuine zeros, quality status, and a quality index that may be `unknown`, without substituting misleading values. | SYS-07, SYS-20 |
| **CORE-06** | P0 | Produce immutable, versioned result artifacts with provenance and lineage: source datasets, intermediate products, method and version, product and dependency versions, parameters, time window, spatial scope, quality, limitations, validation status, processing run, and links from derived representations to their source result. | SYS-10, SYS-19, SYS-27 |
| **CORE-07** | P0 | Resolve and execute the product dependency graph/tree, produce required intermediate products, and reuse compatible intermediates with their provenance. | SYS-04, SYS-10, SYS-19 |
| **CORE-08** | P0 | Aggregate into a selected SAU or AOI summary with explicit resampling or averaging, coverage, and missing-data rules. Harmonization and aggregation shall remain explicit, replaceable operations recorded with their method, target support and native-resolution context. | SYS-06, SYS-07, SYS-15, SYS-27, SYS-29 |
| **CORE-09** | P1 | Enable scientific comparisons against documented reference data or methods. | SYS-14b |
| **CORE-10** | P2 | Harmonize and combine compatible products with different native grids, resolutions, or temporal characteristics. | SYS-09 |
| **CORE-11** | P2 | Evaluate the scientific inputs and analytical operations needed by configured monitoring indicators. | SYS-11 |
| **CORE-12** | P0 | Expose each product's validation record with its reference, metric, tolerance, observed result, and status. | SYS-14a |
| **CORE-13** | P1 | Provide seasonal and richer temporal aggregations. | SYS-08b |
| **CORE-14** | P1 | Support alternative spatial aggregation strategies without changing product definitions. | SYS-15 |
| **CORE-15** | P0 | Maintain reusable product definitions, parameter schemas, versioned documentation, and validation records. | SYS-01, SYS-14a, SYS-15, SYS-19, SYS-22 |
| **CORE-16** | P0 | Expose bounded spatial and temporal slices of a result without requiring the whole result to be loaded. | SYS-10, SYS-26 |

### 5.4 Backend Requirements

| ID | Priority | Requirement | Linked system requirements |
|---|---|---|---|
| **BE-01** | P0 | Expose the versioned product catalogue with definitions, parameter schemas and constraints, documentation reference or content and its status, scientific validation, supported spatial input types and constraints, temporal frequencies and maximum periods, and availability distinct from result availability. | SYS-01, SYS-14a, SYS-19, SYS-21, SYS-22 |
| **BE-02** | P0 | Accept, validate, store, and retrieve AOI, POI, and LOI spatial inputs according to product constraints and configured limits, and snapshot the spatial input used by each request. | SYS-02, SYS-03, SYS-18 |
| **BE-03** | P0 | Accept analysis requests with all required inputs and parameters, pin the exact product definition version, validate completeness and validity, reject invalid or incomplete requests with explicit errors, and record the caller identity and origin channel. | SYS-03, SYS-17, SYS-18, SYS-19 |
| **BE-04** | P0 | Reuse only results that satisfy explicit product-version, parameter, spatial and temporal coverage, quality, and access-control criteria; otherwise coordinate computation. Associate the outcome with the originating request and owner and record the request lifecycle. | SYS-04, SYS-10, SYS-12, SYS-18, SYS-20 |
| **BE-05** | P0 | Make available the final product cropped to the request's spatial input, SAU/AOI time series, inclusive UTC time filters, per-period availability, and missing or masked values with associated quality information, through a contract independent of the physical storage organization. | SYS-05, SYS-06, SYS-07, SYS-08a, SYS-18, SYS-20, SYS-26 |
| **BE-06** | P0 | Preserve and expose source datasets, selected source criteria, method and version, parameters, time window, spatial scope, quality status and index for results and source observations, limitations, validation status, and lineage links to the request, product version, dependency graph/tree, intermediate products, processing run, and derived representations. | SYS-07, SYS-10, SYS-14a, SYS-20, SYS-27 |
| **BE-07** | P0 | Persist requests, owner, origin channel, state transitions, failure reasons, result availability, estimated and actual costs, and access them independently of notifications; scope access to the caller. | SYS-12, SYS-16, SYS-17, SYS-18, SYS-24, SYS-25 |
| **BE-08** | P0 | Publish owner-scoped request-state change events only to the authenticated owner without replacing REST-based status and result retrieval. | SYS-16, SYS-17, SYS-18 |
| **BE-09** | P0 | Provide owner-scoped final-product download by default and an optional archive containing intermediate products and source observations in a directory tree with provenance; record download access for audit. | SYS-13, SYS-17, SYS-18, SYS-23 |
| **BE-10** | P0 | Estimate cost before admission, atomically verify sufficient credits and record the admission decision, and post idempotent ledger transactions for the actual cost and balance according to a versioned credit policy, including failed or cancelled requests. Unlimited credits may be configured. | SYS-24, SYS-25 |
| **BE-11** | P0 | Authenticate users, manage sessions, support multiple accounts, enforce ownership, and propagate a trusted server-side identity to every component involved in processing; components shall not accept client-supplied identity as authoritative. | SYS-12, SYS-17, SYS-18 |
| **BE-12** | P0 | Provide a REST interface for submitting and listing requests, consulting statuses, retrieving results, downloading outputs, reading costs and balances, and exposing the current authenticated identity, with a stable error model, for authenticated users and authorized future consumers, scoped to the caller and recording the origin channel. | SYS-03, SYS-12, SYS-13, SYS-17, SYS-18, SYS-24, SYS-25 |
| **BE-13** | P0 | Persist owner-scoped indicator definitions and stub evaluations, and provide an indicator placeholder to create and list definitions, trigger a stub evaluation, and expose the placeholder result outside the map layer. | SYS-11, SYS-18 |
| **BE-14** | P1 | Manage indicator configurations and rules and expose their evaluations. | SYS-11 |
| **BE-15** | P1 | Expose documented reference comparisons for scientific methods. | SYS-14b |
| **BE-16** | P1 | Accommodate additions to the product catalogue without coupling the user interface to specific algorithms. | SYS-15 |
| **BE-17** | P2 | Expose harmonized multi-product results. | SYS-09 |
| **BE-18** | P1 | Provide seasonal and richer temporal aggregations. | SYS-08b |
| **BE-19** | P0 | Persist each product version's dependency graph/tree, including dependencies, intermediate products, and ordering, and expose it with the product definition and result provenance. | SYS-04, SYS-10, SYS-19 |
| **BE-20** | P1 | Provide filtering, sorting, and pagination for requests and search and filtering in the product catalogue. | SYS-01, SYS-12, SYS-18 |
| **BE-21** | P0 | Persist completed results as immutable versions linked to the request, product definition version, dependency graph/tree version, and processing run; recomputation shall create a new result version rather than overwrite an existing one. Derived representations shall not overwrite or replace the scientific result they reference. | SYS-04, SYS-10, SYS-19, SYS-27 |
| **BE-22** | P0 | Expose representation descriptors and bounded result slices independently of the physical storage organization, including transformation, native-resolution context, coverage, missing-data rules and limitations. | SYS-26, SYS-27, SYS-28 |

### 5.5 Engineering Requirements

Engineering requirements state outcomes, not implementation choices.

| ID | Priority | Requirement |
|---|---|---|
| **ENG-01** | P0 | Shared contracts shall have a single versioned source, explicit compatibility rules, contract tests, and an external API versioning policy; breaking changes shall require a version bump and coordinated consumer updates. |
| **ENG-02** | P0 | Request and execution state shall be persisted and recoverable after interruption. State-changing operations shall be idempotent so that retries do not duplicate requests, results, ledger entries, or notifications. |
| **ENG-03** | P0 | Long-running work shall execute outside the request-response cycle with progress, bounded retries, failure isolation, and observable terminal states; a failed job shall not corrupt request state. |
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

### 5.6 Reference usage scenario

After signing in, a user sees a multi-resolution satellite basemap, selects a supported product (for example, nighttime radiance), defines an AOI, POI, or LOI and chooses a range of months. The platform shows the estimated cost and the user's credit balance before submission. The user submits an **analysis request**, which appears in the **Requests** tab with its current status and updates automatically; REST remains the source of truth after reconnection. Once it succeeds, the user can download the **final product only**, or include intermediate products and source observations in an archive. The user selects **Display on map** from that request entry. The final product appears cropped to the spatial input for an available month, and the user selects a **Spatial Analysis Unit** to inspect its time series. If a month contains no valid observations, the plot shows a gap or an explicit unavailable status—not a zero. A successful request can therefore still contain missing observations. The user can also identify the source, method, quality status, and scientific validation status behind the result.

**This single journey, together with the minimal indicator placeholder path, is a sufficient first end-to-end demonstration.** Multiple sensors, elaborate monitoring indicators, distributed execution and advanced scientific retrieval algorithms are not needed to prove it.

### 5.7 Terminology

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
- **Spatial Harmonization Engine**: the replaceable component responsible for explicit spatial harmonization operations; it does not absorb product-specific scientific computation or decide aggregation validity on its own.
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

## 7. Development Roadmap

The roadmap describes **learning-enabled capabilities**, not mandated scientific domains or deadlines. The order may evolve as technical discoveries and personal research interests change. Scientific understanding matters more than completing a predefined feature list.

| Stage | Main objective | Tangible deliverable |
|---|---|---|
| **0 — Scientific feasibility** | Demonstrate access to one EO dataset and calculation or extraction of one meaningful value. | Small reproducible scientific experiment. |
| **1 — First end-to-end exploration (M0)** | Establish the backend architecture, versioned shared contracts, mock-backed Data Retrieval and Resampling/Rescaling engines, and an MVP UI; then connect product selection, an AOI, POI, or LOI spatial input, a multi-resolution satellite basemap, request submission with cost visibility, automatic request-status updates, final and intermediate downloads, a Requests tab, **Display on map**, a basic SAU/AOI time series with missing-data handling, multi-account-capable authentication, a real credit ledger, and a minimal indicator placeholder. | A usable authenticated spatial-input-driven, single-product exploration flow built on stable interfaces, with automatic status updates, credit accounting, downloadable provenance, an early UI foundation, and a minimal indicator placeholder. |
| **2 — First real scientific product and analysis baseline (M1)** | Replace the technical probe with one real EO product, real source access, real resampling, a first validation record, and basic spatial and temporal analysis. | One real product is computed, analysed spatially and temporally, documented, and compared with a reference or an explicitly justified alternative. |
| **3 — Reusable Product Engine and richer analysis (M2)** | Introduce a reusable product registry, explicit dependencies and repeatable results, a second product, and richer spatial, temporal, multi-source, and quality analysis. | A second product can be introduced with limited impact; dependencies, intermediates, comparisons, and quality are addressed coherently. |
| **4 — First configurable Indicator Engine (M3)** | Replace the indicator placeholder with a first configurable indicator engine built on mature products. | A first monitoring indicator can be configured and evaluated from existing products. |
| **5 — Advanced Indicator Engine (M4)** | Extend indicator rules, temporal conditions, monitoring outputs, and optional alerts. | One or more understandable monitoring indicators using already developed products, with monitoring and notification support where justified. |
| **6 — Optional advanced capabilities (M5)** | Add sophisticated scientific methods, export/interoperability, external API/MCP access, performance work, or automation as interest and needs justify. | Individually documented experiments or platform improvements that do not redefine the Product Engine foundations. |

Detailed epics are maintained in `ROADMAP.md`; ticket breakdowns are added as each milestone is refined. This table defines the capability order, and the roadmap document defines milestone and epic sequencing.

Advanced scientific products, including LST, **can be explored at any suitable point once their prerequisites exist**. They are not contingent on completing the Indicator Engine, and no specific one is required to finish the roadmap.

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
| **Changing personal interests** | A rigid use-case roadmap would make the project feel like an obligation. | Keep scientific investigations optional and interchangeable. |

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

**End of proposal — v0.15.**
