# MEOGAP — Modular Earth Observation & Geospatial Analytics Platform

**Project Definition — v0.7 (Concept and Requirements)**

**Status:** Living draft · **Date:** 25 October 2026

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

A **Proxy Engine** will make these products useful for configurable monitoring. A proxy will combine existing products, rules, and temporal conditions to observe a phenomenon over an area. A minimal proxy placeholder is present in the first end-to-end demonstration, while full proxy configuration and evaluation are implemented later. Proxies do not replace the scientific products, and **a product does not need a proxy to be useful**.

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

**Major future extension — Proxy Engine.** Allow user-configured indicators to combine already available products, temporal analysis, thresholds and other rules for monitoring. A placeholder path is included early so the full request flow can be tested end to end.

**Guiding principles:**

- **Learning-driven and capability-driven, not use-case-driven.** A new algorithm is a scientific learning opportunity, not a mandatory roadmap destination.
- **Scientific meaning before visual convenience.** An apparently finer map must never be confused with finer observational evidence.
- **Native computation first; common analysis later.** Scientific calculations and geographical aggregation have separate responsibilities.
- **Start small, grow deliberately.** A single functioning processing path is more valuable than speculative generality.
- **Open and affordable by default.** Prefer accessible public datasets and open-source tools; verify dataset-specific usage conditions.
- **Reproducibility and honesty.** Preserve enough information to understand a result, including its limitations and validation status.

**Not in scope for the initial project:** a commercial SaaS, enterprise user management, planetary-scale infrastructure, exhaustive sensor coverage, guaranteed real-time monitoring, arbitrary user-executed scientific code, or a fixed set of domain-specific dashboards. Public distribution is optional, not a measure of success.

---

## 3. Processing Model: From Observations to Products to Proxies

This is the **central conceptual model** of the platform.

### 3.1 Three distinct concepts

| Concept | Meaning | Who defines it? |
|---|---|---|
| **Source observation** | Satellite bands, radiance, reflectance, auxiliary observations or provider-supplied scientific datasets used as inputs. | External data providers |
| **Scientific product** | A documented scientific transformation or analysis based on one or more source observations or existing products. | Developed and maintained within the Product Engine |
| **Proxy** | A configurable monitoring definition that combines existing products and rules to follow a phenomenon over space and time. | Configured by the user; a placeholder path is present in the first end-to-end demonstration |

A **product definition** describes *what is calculated*; a **product result** is *what was calculated for particular sources, parameters, place and period*. This distinction allows the same scientific method to be reused in many analyses.

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
- A proxy is **not** an additional `LN` product. It is a separate monitoring layer consuming products.
- Aggregating a product onto a spatial grid does **not**, by itself, create a higher-level scientific product.

### 3.3 How the hierarchy grows

**Example A — Nighttime luminosity**

**L0:** VIIRS radiance observations or published composites → **L1:** change between comparable periods → **L2:** anomaly against a temporal baseline → **Proxy (placeholder early, full evaluation later):** alert when increases persist in selected spatial units.

This example can support a very small first demonstration without multi-sensor fusion.

**Example B — Land Surface Temperature (LST)**

**L0:** Landsat reflectance and thermal observations, atmospheric inputs, and emissivity-related reference data → **L1:** NDVI → **L2:** fractional vegetation cover and emissivity-related calculations → **Higher-order product:** LST estimated by a documented thermal retrieval method using the necessary thermal, atmospheric and surface inputs.

The paper by **Ermida et al. (2020)** provides a particularly useful future experiment: reproduce a published LST method and compare its outputs with available reference products. **LST cannot be inferred from NDVI alone in that method.** This is a research candidate, not a compulsory project milestone or a commitment to urban-heat monitoring.

### 3.4 Spatial and temporal analysis

The platform should distinguish **scientific processing** from **analytical harmonization**.

Scientific processing may need native raster geometry, appropriate reprojection, resampling and masking. Afterward, products may be aggregated into common **Spatial Analysis Units (SAUs)** so their evolution can be compared and displayed consistently.

An SAU is the smallest selectable geographical unit used for an analysis. Depending on the method, it could be a raster pixel, a grid cell, a hexagon or another spatial feature. **H3 is a promising initial candidate**, not a permanent commitment. Spatial resolution and aggregation methods must remain explicit: projecting a coarse observation onto smaller cells does not create new measured detail.

A user should eventually be able to select an AOI or an individual SAU, view a product for a chosen period, and inspect its evolution by month, season or other supported time windows. Missing observations, cloud masking, insufficient coverage and actual measured zeros must remain distinguishable. In particular, **“no data” must never be silently interpreted as “no change.”**

Product outputs are not restricted to raster images: they may also be numerical values, per-unit measurements, time series or other suitable representations. The Core provides the analytical results; the Frontend presents them as maps and charts.

### 3.5 Analysis requests as the entry point to visualization

An **analysis request** is a user-initiated demand to obtain a product for a selected area, period and supported parameters. It may reuse an available result or trigger new processing. Requests have a visible lifecycle and remain accessible through a dedicated **Requests** view.

**The Requests view is the entry point for putting analytical results on the map.** A user selects a successfully completed request and chooses **Display on map**. From the displayed result, the user can explore supported time windows and inspect values or time series for an SAU or AOI. An unsuccessful or unfinished request cannot be displayed as a result.

A *successful request* means that processing or retrieval completed and a result is available. It does **not** imply that all periods contain valid observations or that the result has undergone independent scientific validation. Missing or masked observations remain visible as such.

---

## 4. Logical System Architecture

The proposal defines **responsibilities only**. It does not prescribe repository organization, component packaging, runtime deployment or specific frameworks; those choices will follow the project's template.

**High-level flow:** **Frontend submits an analysis request → Backend retrieves or coordinates computation → Core / Product Engine supplies an analytical result → Backend makes the request result available → Frontend displays it from the Requests view**. External EO sources feed the Core. The **Proxy Engine** will consume scientific products and their analytical results; a minimal placeholder path is present in the first end-to-end demonstration, while full evaluation is implemented later. Execution may be synchronous or delegated to background workers when needed.

| Logical component | Responsibility | Boundary |
|---|---|---|
| **Frontend** | Provide product and AOI selection, a dedicated Requests view showing current statuses, a **Display on map** action for completed requests, spatial/temporal exploration and charts. Automatic status updates are included in the first end-to-end demonstration. | Displays available scientific outputs; does not redefine scientific algorithms. |
| **Backend** | Expose REST services; manage AOIs, product catalogue information, requests, request status changes, result availability and retrieval; publish request-state notifications. | Coordinates processing and keeps track of request state; does not duplicate scientific computation. |
| **Core / Product Engine** | Access data sources; calculate scientific products; resolve product dependencies; apply quality rules; support spatial and temporal operations; provide analysis-ready results. | Works independently of the user interface. |
| **Execution responsibility** | Run potentially long calculations and report their outcome. | May initially be part of the backend process; dedicated workers are optional later. |
| **Proxy Engine (placeholder early; full engine later)** | Interpret configurable monitoring rules and combine available scientific products. The placeholder path exposes the proxy concept without implementing the full evaluation engine. | Depends on the Product Engine; does not replace its scientific methods. |

**Service and notification principles:** REST remains the stable interface for creating and consulting requests, statuses and results, including for future external consumers (such as MCP-powered agents). **Automatic notifications are part of the first end-to-end demonstration**: a request-state change should become visible in the UI without a page reload. **NATS is a candidate for publishing these change notifications**, but the browser-facing transport is not prescribed here. Notifications indicate that something changed; REST remains the source of truth for retrieving the current request state and result, including after reconnection.

**Key architectural constraint:** Keep source-specific data handling, scientific product computation, spatial aggregation, request tracking and presentation conceptually separable. The exact technical boundaries remain open.

## 5. Functional Requirements

Requirements are described at three levels:

- **System/Service (`SYS`)**: what the platform must make possible, independently of implementation.
- **Component (`FE`, `CORE`, `BE`)**: what each main component is responsible for providing. Each component requirement explicitly references its parent system requirement(s).
- **Engineering (`ENG`)**: capabilities required to build, operate, and validate the platform, independent of user-facing features. Engineering requirements state outcomes, not implementation choices.

**Priorities:** `P0` = required for the first working end-to-end demonstration (milestone M0); `P1` = incremental improvement, including potential late-MVP enhancements; `P2` = later extension. They are not dates, and a `P2` requirement is not part of the MVP.

### 5.1 System / Service Requirements

| ID | Priority | Requirement |
|---|---|---|
| **SYS-01** | P0 | The platform shall expose a catalogue of the scientific products it supports, with the information needed to understand each product's purpose, scientific context, processing level, inputs and outputs, spatial and temporal characteristics, units, known limitations, documentation reference, and scientific validation status. Catalogue availability shall describe what can be requested and shall not imply that a computed result is already available. |
| **SYS-02** | P0 | A user shall be able to define or select an Area of Interest (AOI) for an analysis, within a configurable size limit. |
| **SYS-03** | P0 | A user shall be able to submit an analysis request for a supported product with a chosen geographical area, UTC time period, and supported parameters. |
| **SYS-04** | P0 | The platform shall calculate the requested product, including required intermediate products, or retrieve a suitable existing result. |
| **SYS-05** | P0 | A user shall be able to display a successful analysis request as a geographical layer for a supported time window, using an action in the Requests view. |
| **SYS-06** | P0 | A user shall be able to select a Spatial Analysis Unit (or an AOI summary) and inspect a product's evolution over time. |
| **SYS-07** | P0 | The platform shall distinguish valid values (including genuine zeros), missing observations, masked/cloud-affected values, and processing failures. |
| **SYS-08a** | P0 | A user shall be able to filter results by a UTC time window `[start, end]`, with both bounds inclusive, at date or month granularity. |
| **SYS-08b** | P1 | A user shall be able to obtain configurable seasonal or richer temporal aggregations and summaries. |
| **SYS-09** | P2 | The platform shall support meaningful comparison or combination of products with different spatial and temporal characteristics through explicit harmonization. |
| **SYS-10** | P0 | Each calculated result shall expose its source datasets, intermediate products, method and version, parameters, time window, spatial scope, quality status and limitations, and scientific validation status. |
| **SYS-11** | P0 | A user shall be able to define a proxy that combines existing products and monitoring rules. The platform shall expose a minimal proxy placeholder path in the first end-to-end demonstration; full proxy evaluation and configuration are later capabilities. |
| **SYS-12** | P0 | An authenticated user shall be able to consult a dedicated list of their own analysis requests, see the current state of each request, and access its available results, cost, and quality status. |
| **SYS-13** | P0 | A user shall be able to download a successful result as a final product, with its units and essential context. |
| **SYS-14a** | P0 | Every supported scientific product shall carry a mandatory validation record containing at least a reference, a metric, a tolerance, an observed result, and a scientific validation status (`validated` or `unvalidated`). The record shall be exposed with the product and its results. This product-level status is distinct from the per-result quality status. |
| **SYS-14b** | P1 | Scientific methods shall document at least one comparison with a published method or reference product, or justify why no suitable comparison is available. |
| **SYS-15** | P1 | The platform shall be extensible with additional products and data sources without requiring a redesign of the user experience. |
| **SYS-16** | P0 | The Requests view shall reflect request-state changes automatically, without requiring the user to reload the page. After reconnection, the current state shall remain retrievable through REST. |
| **SYS-17** | P0 | The platform shall provide REST-based access to submit and consult analysis requests, their statuses, and their results for authenticated users and authorized future consumers, with access scoped to the caller's data and with the caller identity and request origin recorded for authorization and audit. |
| **SYS-18** | P0 | The platform shall authenticate users, support sign-in and sign-out, and restrict access to each user's own requests, results, and derived data. It shall support multiple user accounts and propagate the authenticated identity to every component involved in processing a request. |
| **SYS-19** | P0 | The platform shall maintain versioned, reusable scientific product definitions, including their processing level, inputs and dependencies, parameters, outputs, intermediate products, documentation, and scientific validation status. |
| **SYS-20** | P0 | Each product result and source observation shall carry the quality metadata needed to interpret it, including a quality status (`validated`, `poor_quality`, `unknown`) and a quality index field whose value may be `unknown` when it has not been computed. When several sources are available, the platform shall select them according to documented quality and availability criteria. Computing the quality index from factors such as spatial resolution, cloud cover, and source characteristics is a later capability. |
| **SYS-21** | P0 | The platform shall support configurable temporal frequencies and maximum periods for products and source observations, including daily, monthly, annual, seasonal, and custom definitions. |
| **SYS-22** | P0 | Every supported scientific product shall have versioned documentation covering its purpose, method, inputs, outputs, units, assumptions, limitations, references, and validation. Documentation completeness shall be verified by the project's quality gates and its status exposed in the product catalogue. |
| **SYS-23** | P0 | A user shall be able to download a successful result as a final product only, or as an archive that additionally includes its intermediate products and source observations, organized as a directory tree with the provenance needed to interpret them. |
| **SYS-24** | P0 | Before accepting an analysis request, the platform shall estimate its cost in credits, verify that the authenticated user has sufficient credits, and record the admission decision. After processing, it shall record the actual cost and update the user's credit balance according to the configured credit policy. The initial configuration may grant unlimited credits, but estimation, admission, and recording shall still occur. |
| **SYS-25** | P0 | A user shall be able to see the estimated cost before submitting a request, the actual cost after processing, and their current credit balance. |

### 5.2 Frontend Requirements

**Alignment note:** The `FE`, `CORE`, and `BE` requirements below are being aligned with the v0.7 system requirements in a subsequent pass. Their priorities and links may temporarily lag behind §5.1.

| ID | Priority | Requirement | Linked system requirements |
|---|---|---|---|
| **FE-01** | P0 | Present available products with their main scientific descriptions and validation status. | SYS-01, SYS-14a |
| **FE-02** | P0 | Let the user define or select an AOI within the configured size limit, a product, and a UTC time range `[start, end]`. | SYS-02, SYS-03, SYS-18 |
| **FE-03** | P0 | Provide **Display on map** for the authenticated user's successful requests in the Requests view and render their available geographical results for a selected period. | SYS-05, SYS-12, SYS-18 |
| **FE-04** | P0 | Display a time-series chart for a selected SAU or AOI summary, using UTC date/month filters with inclusive bounds. | SYS-06, SYS-08a, SYS-18 |
| **FE-05** | P0 | Clearly represent missing, masked, invalid, and genuine zero values, and show available units, quality, method, and validation status. | SYS-07, SYS-10, SYS-14a, SYS-18 |
| **FE-06** | P0 | Provide a dedicated Requests tab listing the authenticated user's own analysis requests, their current statuses, and links to available results. | SYS-12, SYS-18 |
| **FE-07** | P2 | Support viewing comparable products and configuring basic monitoring proxies. | SYS-09, SYS-11 |
| **FE-08** | P1 (late MVP) | Automatically reflect request-state changes for the authenticated user's requests in the Requests view without a page reload, while allowing the latest state to be retrieved after reconnection. | SYS-16, SYS-18 |
| **FE-09** | P1 | Allow export of supported successful results from the authenticated user's request entries. | SYS-12, SYS-13, SYS-18 |
| **FE-10** | P0 | Provide sign-in and sign-out and protect authenticated views. | SYS-18 |

### 5.3 Core / Product Engine Requirements

| ID | Priority | Requirement | Linked system requirements |
|---|---|---|---|
| **CORE-01** | P0 | Acquire or access the source observations needed by an available product. | SYS-03, SYS-04 |
| **CORE-02** | P0 | Calculate a scientific product from its defined inputs and parameters. | SYS-04 |
| **CORE-03** | P0 | Produce geographically interpretable product results and values suitable for spatial selection. | SYS-05, SYS-06 |
| **CORE-04** | P0 | Provide temporal filtering and analysis-ready series over UTC windows `[start, end]` with inclusive bounds; support additional aggregation methods progressively. | SYS-06, SYS-08a, SYS-08b |
| **CORE-05** | P0 | Handle source quality information, masks and genuinely missing observations without replacing them with misleading values. | SYS-07 |
| **CORE-06** | P0 | Preserve and expose scientific provenance: source datasets, method and version, parameters, time window, spatial scope, quality limitations, and validation status. | SYS-10 |
| **CORE-07** | P1 | Manage reusable product definitions, their validation records, and their dependencies, including intermediate products. | SYS-04, SYS-14a, SYS-15 |
| **CORE-08** | P0 / P1 | Support basic aggregation into selected SAUs for the first exploration (P0), with alternative spatial strategies introduced later (P1). | SYS-06, SYS-15 |
| **CORE-09** | P1 | Enable scientific comparisons against documented reference data or methods. | SYS-14b |
| **CORE-10** | P2 | Harmonize and combine compatible products with different native grids, resolutions or temporal characteristics. | SYS-09 |
| **CORE-11** | P2 | Evaluate the scientific inputs and analytical operations needed by configured proxies. | SYS-11 |
| **CORE-12** | P0 | Expose each product's validation record with its reference, metric, tolerance, observed result, and status. | SYS-14a |

### 5.4 Backend Requirements

| ID | Priority | Requirement | Linked system requirements |
|---|---|---|---|
| **BE-01** | P0 | Make the product catalogue, including validation status, available to the Frontend. | SYS-01, SYS-14a |
| **BE-02** | P0 | Manage AOI selections within the configured limit and receive product requests with their spatial and UTC temporal scope. | SYS-02, SYS-03, SYS-18 |
| **BE-03** | P0 | Coordinate access to existing results and the calculation of unavailable results, associating the outcome with the originating request and its owner. | SYS-04, SYS-12, SYS-18 |
| **BE-04** | P0 | Make spatial outputs of the authenticated owner's successful requests, selected-unit series, and associated quality information available for presentation. | SYS-05, SYS-06, SYS-07, SYS-08a, SYS-18 |
| **BE-05** | P0 | Preserve and expose the essential provenance and validation status of available results. | SYS-10, SYS-14a, SYS-18 |
| **BE-06** | P0 | Record analysis requests, their owner, current state, and result availability so they remain accessible independently of live notifications. | SYS-04, SYS-12, SYS-16, SYS-18 |
| **BE-07** | P1 | Provide access to result exports and scientific product documentation or reference comparisons. | SYS-13, SYS-14b |
| **BE-08** | P1 | Accommodate additions to the scientific product catalogue without coupling the user interface to specific algorithms. | SYS-15 |
| **BE-09** | P2 | Manage proxy configurations and make their evaluations available to the user. | SYS-11 |
| **BE-10** | P2 | Expose comparable results of harmonized multi-product analyses. | SYS-09 |
| **BE-11** | P1 (late MVP) | Make request-state change notifications for the authenticated user's requests available to the Frontend without replacing REST-based status retrieval. | SYS-16, SYS-17, SYS-18 |
| **BE-12** | P0 | Provide a REST interface for submitting and listing requests, consulting their statuses, and retrieving completed results for authenticated users and authorized future consumers, scoped to the caller's data. | SYS-03, SYS-12, SYS-17, SYS-18 |
| **BE-13** | P0 | Authenticate the user, manage the session, and enforce ownership of requests and results. | SYS-12, SYS-17, SYS-18 |

### 5.5 Engineering Requirements

Engineering requirements state outcomes, not implementation choices.

| ID | Priority | Requirement |
|---|---|---|
| **ENG-01** | P0 | The system shall define stable, shared contracts for data exchanged between components. |
| **ENG-02** | P0 | The system shall preserve request and execution state so that it can be recovered after an interruption. |
| **ENG-03** | P0 | The system shall execute long-running work outside the request-response cycle and report progress and failures. |
| **ENG-04** | P0 | The system shall expose health and readiness information for its components. |
| **ENG-05** | P0 | The system shall produce sufficient logs and error information to diagnose failures. |
| **ENG-06** | P0 | The system shall be configurable without code changes. |
| **ENG-07** | P0 | The system shall enforce automated quality gates for unit, functional, and traceability checks. |
| **ENG-08** | P1 | The system shall be reproducible in a clean environment. |
| **ENG-09** | P1 | The system shall provide documented developer commands for setup, test, and operation. |
| **ENG-10** | P0 | The system shall protect authentication credentials and sessions and shall not store secrets in the repository. |

### 5.6 Reference usage scenario

After signing in, a user selects a supported product (for example, nighttime radiance), defines an AOI and chooses a range of months. The platform shows the estimated cost and the user's credit balance before submission. The user submits an **analysis request**, which appears in the **Requests** tab with its current status and updates automatically; REST remains the source of truth after reconnection. Once it succeeds, the user can download the **final product only**, or include intermediate products and source observations in an archive. The user selects **Display on map** from that request entry. The result appears geographically for an available month, and the user selects a **Spatial Analysis Unit** to inspect its time series. If a month contains no valid observations, the plot shows a gap or an explicit unavailable status—not a zero. A successful request can therefore still contain missing observations. The user can also identify the source, method, quality status, and scientific validation status behind the result.

**This single journey, together with the minimal proxy placeholder path, is a sufficient first end-to-end demonstration.** Multiple sensors, elaborate proxies, distributed execution and advanced scientific retrieval algorithms are not needed to prove it.

### 5.7 Terminology

- **AOI**: Area of Interest selected for an analysis.
- **SAU**: Spatial Analysis Unit used for aggregation; it is not a native storage grid.
- **Request**: a product submission with its AOI, time window, and parameters.
- **Result**: the output associated with a request; it may contain missing or masked values.
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
- **Proxy placeholder**: minimal end-to-end path that represents a proxy without implementing the full evaluation engine.
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
| **Spatial honesty** | Retain native resolution information and describe any resampling or spatial aggregation; do not imply artificial precision. |
| **Temporal honesty** | Make observation gaps, cloud masking, period definitions and incomplete coverage explicit. |
| **Modularity** | A new scientific product should not require modifying unrelated presentation and service logic. |
| **Request-state reliability** | REST-accessible request statuses and results must remain recoverable after interruption. Notifications improve responsiveness but must not become the sole source of state. |
| **Pragmatism** | Work on bounded AOIs and periods; increase processing complexity only when a real limitation is encountered. |
| **Data use** | Prefer openly accessible datasets and open-source software, while respecting provider access, attribution and redistribution conditions. |

---

## 7. Development Roadmap

The roadmap describes **learning-enabled capabilities**, not mandated scientific domains or deadlines. The order may evolve as technical discoveries and personal research interests change. Scientific understanding matters more than completing a predefined feature list.

| Stage | Main objective | Tangible deliverable |
|---|---|---|
| **0 — Scientific feasibility** | Demonstrate access to one EO dataset and calculation or extraction of one meaningful value. | Small reproducible scientific experiment. |
| **1 — First end-to-end exploration (M0)** | Connect product selection, one AOI, request submission with cost visibility, automatic request-status updates, final and intermediate downloads, a Requests tab, **Display on map** for successful requests, a basic SAU/AOI time series with missing-data handling, multi-account-capable authentication, a real credit ledger, and a minimal proxy placeholder. | A usable authenticated request-driven, single-product exploration flow with automatic status updates, credit accounting, downloadable provenance, and a minimal proxy placeholder. |
| **2 — Reusable Product Engine** | Introduce a small catalogue, reusable scientific products, explicit dependencies and repeatable results. Replace the proxy placeholder with a first configurable proxy engine. | A second product can be introduced with limited impact on the rest of the platform; a first proxy can be configured and evaluated. |
| **3 — Richer spatial and temporal analysis** | Improve spatial aggregation, temporal comparison and compatibility with an additional EO source or product family. | A demonstrated multi-source or multi-product analytical capability. |
| **4 — Advanced Proxy Engine** | Extend proxy rules, temporal conditions and monitoring outputs. | One or more understandable proxies using already developed products. |
| **5 — Optional advanced capabilities** | Add sophisticated scientific methods or execution features as interest and needs justify. | Individually documented experiments or platform improvements. |

Advanced scientific products, including LST, **can be explored at any suitable point once their prerequisites exist**. They are not contingent on completing the Proxy Engine, and no specific one is required to finish the roadmap.

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
| **Changing personal interests** | A rigid use-case roadmap would make the project feel like an obligation. | Keep scientific investigations optional and interchangeable. |

## 10. Future Directions and Success Criteria

**Possible future directions** include advanced product families, improved aggregation and uncertainty handling, cross-sensor fusion, richer proxy rules and alerts, more capable execution infrastructure, or controlled LLM/MCP access to the existing REST services. Extending access to an external agent is not part of the initial MVP, even though the REST interface itself is an early requirement.

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

- Ermida, S. L., et al. (2020). *Google Earth Engine Open-Source Code for Land Surface Temperature Estimation from the Landsat Series*. Remote Sensing, 12(9), 1471. https://doi.org/10.3390/rs12091471

---

**End of proposal — v0.7.**
