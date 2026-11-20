# MEOGAP — Interface & Contract Inventory

**Document status:** Revised working proposal — pending branch/source reconciliation  
**Scope:** Conceptual contracts for the logical interactions inventoried for M0  
**Target branch:** `38-m0-e02-t04-identify-m0-interface-and-contract-boundaries`  
**Purpose:** Define interface responsibilities and conceptual information exchanged, organized by the component that provides/owns each interface.

> **Status note:** This revision incorporates the decisions explicitly confirmed during the review: request submission prepares a proposal and estimates its cost; confirmation checks the balance, debits credits and launches computation; product-definition versions are traceability metadata rather than mandatory functional inputs; CAT stores and returns asset/product metadata while SCI remains authoritative for scientific definitions; and delivery orchestration is performed by CON using references supplied by CAT. The target GitHub branch could not be read or updated during this revision, so the interaction inventory must still be reconciled against the current branch matrix before commit.

---

## 1. Purpose and reading rules

This document complements the Component Interaction Matrix. The matrix identifies the logical interactions and their directions. This document groups those interactions by **interface owner/provider**, identifies their consumers, and describes the conceptual contract.

It does not define:
- REST routes, HTTP methods or status codes;
- JSON, Pydantic or database schemas;
- NATS subjects, worker messages or implementation protocols;
- physical storage formats, bucket layouts or object naming;
- deployment topology.

### 1.1 What “owner” means here

The **interface owner** is the component responsible for providing the capability and defining the semantics of the information it exposes. The consumer invokes or uses that capability.

This is distinct from:
- the producer of an individual message;
- the direction of a request or response;
- the component that physically stores a copy of metadata;
- the authority that defines the meaning of scientific information.

For request/response interactions, both directions are shown in the same row or family. The owner is not inferred from the arrow direction alone.

### 1.2 Status vocabulary

- **Baseline:** responsibility or interaction already established by the architecture material used for the earlier draft.
- **Confirmed decision:** clarified explicitly by the project owner during this review.
- **Contract proposal:** conceptual detail proposed to make the interface implementable.
- **Open:** detail that remains intentionally undecided.

### 1.3 Logical components

| Component | Responsibility |
|---|---|
| UI | User interaction and presentation. Consumes the public GAT interface; does not call internal components directly. |
| GAT | Sole public REST boundary. Authenticates/validates the caller context and exposes public operations. |
| CON | Request lifecycle, proposal preparation, access decisions, credit policy/accounting coordination, execution orchestration, cancellation and delivery orchestration. |
| SCI | Scientific product definitions, scientific feasibility, abstract input requirements, scientific methods, complexity estimates, computation and harmonization. |
| CAT | Concrete asset discovery, source acquisition/ingestion, asset and representation registration, metadata persistence/retrieval, canonical asset references and actual lineage. |

Workers, NATS, object storage and EO providers are mechanisms or infrastructure, not logical interface-owning components in this inventory.

---

## 2. Cross-cutting contract rules

### 2.1 Identity and authorization context

- UI does not provide an authoritative owner identifier.
- GAT validates the public authentication proof and derives trusted caller identity/origin context.
- GAT passes trusted context to CON.
- CON owns user-facing authorization and binds ownership/actor context to persisted requests and results.
- CON propagates the relevant trusted context to SCI and CAT for attribution, audit and tracing.
- SCI and CAT do not independently redefine user ownership or user-facing authorization.
- Raw credentials are not propagated by default and must not be logged.

M0 may use a deterministic demo identity. This is not production authentication or proof of multi-account isolation.

### 2.2 Identifiers and product identity

Keep distinct:
- product identifier;
- product-definition version metadata;
- request identifier;
- execution/processing-run identifier;
- result identifier;
- logical asset identifier;
- representation identifier;
- delivery identifier;
- correlation/trace identifier.

A product identifier identifies the scientific product known by SCI (for example, `NDVI-01`). SCI knows what that product computes. A version is metadata describing the definition/method revision used; it is not a mandatory functional parameter in every request.

**Confirmed decision:** CS-01 and CS-03 identify the product by its stable product identifier. SCI resolves the applicable definition/version internally. The version actually used is recorded in result metadata/provenance. CS-05 must execute the definition associated with the accepted request context and the product identity; it must not silently switch to a different scientific meaning.

**Contract safeguard:** if the meaning of a product identifier changes incompatibly, that is not merely a metadata version increment. It requires a new product identity or an explicit migration decision. Compatible method revisions may retain the product identifier and increment version metadata.

### 2.3 Spatial and temporal context

For analysis operations, carry the spatial and temporal scope required by that operation:
- AOI/POI/LOI geometry or stable spatial reference;
- explicit buffer parameters where applicable;
- UTC start/end;
- product parameters and relevant inclusion semantics.

Keep native resolution distinct from display resolution, resampling and spatial aggregation. A requested period does not imply every date has a valid observation.

### 2.4 Distinct state and quality dimensions

Do not conflate:
- request lifecycle state;
- proposal-preparation state;
- execution/task state;
- acquisition/ingestion state;
- asset registration;
- representation registration/availability;
- scientific product validation status;
- quality of one concrete result.

True zero, missing observation, quality-masked value, unknown quality and processing failure are distinct.

### 2.5 Metadata authority versus metadata storage

CAT is responsible for storing and retrieving metadata associated with registered assets/results and their representations. This does not make CAT the scientific authority for every field it stores.

- SCI defines scientific product meaning, method, units, assumptions, scientific validation and scientific limitations.
- CAT registers and returns metadata attached to concrete assets/results, including scientific metadata supplied by SCI and asset/representation metadata managed by CAT.
- CON assembles the request/execution context and coordinates retrieval.
- GAT exposes the authorized public view.

The contract must preserve metadata provenance/ownership where necessary: **stored by CAT** does not mean **defined by CAT**.

### 2.6 Scientific validation versus result quality

Scientific validation is part of the product design/development lifecycle. For example, a new NDVI product may be compared with external reference sources during a validation campaign. This is not a validation campaign repeated for every user request.

At runtime, a particular result still has its own quality/coverage information. A scientifically validated product can produce a poor or incomplete result because of clouds, missing inputs, insufficient coverage or processing issues.

---

# 3. GAT — Public interface owner

**Primary consumer:** UI.  
**Other internal dependency:** GAT consumes SCI's public scientific catalogue interface (GS-01/02); it does not own that scientific capability.

GAT is the only public REST boundary. UI does not call CON, SCI, CAT, object storage or NATS directly. Public REST state remains authoritative; notifications are optional.

## 3.1 Public UI interface table

| Interaction ID | Operation / purpose | Consumer | Direction | Conceptual request information | Conceptual response information | Contract invariants / notes |
|---|---|---|---|---|---|---|
| UI-01 / UI-16 | Browse product catalogue | UI | UI → GAT; response GAT → UI | Optional filters/pagination. Caller identity is derived by GAT. | Product identifiers, names, descriptions, requestability and catalogue metadata. | Catalogue presence means a scientific product is exposed; it does not mean data/result assets already exist. |
| UI-02 / UI-16 | Retrieve product definition | UI | UI → GAT; response GAT → UI | Product identifier. | Scientific purpose/description, supported parameters and constraints, expected outputs, units, spatial/temporal characteristics, limitations, validation/documentation status where available. | SCI is authority for definition; GAT returns the authorized public representation. |
| UI-11 / UI-16 | Retrieve theoretical input requirements | UI | UI → GAT; response GAT → UI | Product identifier. | Abstract bands/variables, spatial/spectral resolution, acquisition-period constraints, quality requirements and compatibility criteria. | These are theoretical scientific requirements, not concrete acquisitions or asset references. |
| UI-05 / UI-17 / UI-18 | Submit analysis request and prepare proposal | UI | UI → GAT; response GAT → UI | Product identifier, spatial scope, optional buffer parameters, UTC temporal scope and product-specific parameters. | Persistent request ID, current proposal-preparation state, then feasibility/conditions, dependency summary and estimated cost when ready. | Submission creates the request and starts proposal preparation. It does not launch scientific computation and does not debit credits. |
| UI-06 / UI-17 / UI-18 | Confirm proposed request | UI | UI → GAT; response GAT → UI | Request ID and explicit confirmation. | Accepted/rejected confirmation, updated request state and launch outcome. | Confirmation is the point where CON rechecks balance, debits credits and launches the computation if accepted. |
| UI-07 / UI-18 | List requests | UI | UI → GAT; response GAT → UI | Optional filters, sorting and pagination. | Requests visible to the authenticated caller: IDs, product/scope summaries, timestamps, states, proposal/cost summary and result availability. | UI cannot select another owner by sending an owner ID. |
| UI-08 / UI-18 | Retrieve request status | UI | UI → GAT; response GAT → UI | Request ID. | Authoritative current request/proposal/execution state, result reference/availability and user-visible failure/cancellation information. | REST is source of truth even if notifications are missed. |
| UI-23 / UI-24 | Request cancellation | UI | UI → GAT; response GAT → UI | Request ID and cancellation intent. | Cancellation accepted/rejected/processed, current request state and limitations. | CON owns cancellation. Requesting cancellation does not guarantee instantaneous termination of already-running work. |
| UI-09 / UI-19 | Retrieve map representation | UI | UI → GAT; response GAT → UI | Result ID and supported map/display selection (e.g. band, slice, display options). | Map payload or retrievable representation reference, extent, CRS/display metadata and nodata/validity information. | GAT obtains authorization through CON; CON coordinates metadata/reference retrieval and SCI representation generation/serving. |
| UI-10 / UI-19 | Retrieve analytical representation / time series | UI | UI → GAT; response GAT → UI | Result ID, spatial selection (point, SAU, AOI summary), temporal window and representation options. | Values or representation reference, time coordinates, units, spatial support/aggregation, quality/coverage and missing/masked distinctions. | Point, SAU and AOI summary are not interchangeable. State the support and aggregation semantics. |
| UI-12 / UI-20 | Retrieve actual result lineage and metadata | UI | UI → GAT; response GAT → UI | Result ID. | Actual source/intermediate assets consumed; dependency relationships; product/method/version metadata, parameters, scope, quality and limitations where recorded. | CON coordinates retrieval. CAT returns registered asset metadata and actual lineage; scientific metadata may have been defined by SCI and stored by CAT. Do not present CAT as scientific authority. |
| UI-13 / UI-21 | Download final product only | UI | UI → GAT; response GAT → UI | Result ID and optional supported format/representation selection. | Delivery ID/state; secure, time-bounded access when ready. | Distinct from dependency archive. Physical storage paths are never public contract data. |
| UI-14 / UI-21 | Request dependency archive | UI | UI → GAT; response GAT → UI | Result ID and optional archive options if supported. | Delivery ID/state; secure, time-bounded access when ready. | Archive is generated on demand from actual lineage, not merely the planned dependency graph. |
| UI-15 / UI-22 | Retrieve credit balance | UI | UI → GAT; response GAT → UI | Authenticated caller context only. | Current credit balance and relevant timestamp/consistency information. | CON owns credit policy/accounting. No client-supplied owner identity. |

### 3.2 Public asynchronous behavior

The public interface must not keep a REST request open for long-running work. Submission and delivery operations return a persistent reference and current state when they cannot complete promptly. The user retrieves the latest state through REST.

The earlier draft used a five-second threshold. **This threshold must be checked against the authoritative engineering requirements before it is treated as a fixed project rule.** The invariant is asynchronous handling for long-running operations; the exact threshold is not confirmed by the decisions in this review.

### 3.3 Public response semantics

- UI-16: catalogue/product-definition/input-requirement information.
- UI-17: feasibility and cost proposal.
- UI-18: request references and lifecycle information.
- UI-19: map or analytical representation.
- UI-20: actual lineage and result metadata.
- UI-21: delivery status/access information.
- UI-22: credit balance.
- UI-24: cancellation outcome.

Exact response envelopes, status vocabulary, pagination, error model and representation encoding remain implementation-level decisions.

---

# 4. CON — Request, authorization, credit and delivery interface owner

**Primary consumer:** GAT.  
**Internal consumers of CON orchestration:** SCI and CAT are invoked by CON; they are not consumers of CON's public-facing user API.

CON owns the business lifecycle. It coordinates SCI and CAT but does not take over their scientific or asset-catalogue responsibilities.

## 4.1 GAT-consumed CON interface table

| Interaction ID | Operation / purpose | Consumer | Direction | Conceptual request information | Conceptual response information | Contract invariants / notes |
|---|---|---|---|---|---|---|
| GC-02 / GC-02-R | Create request and prepare proposal | GAT | GAT → CON; response CON → GAT | Product ID, spatial/temporal scope, product parameters, trusted caller context, correlation context. | Request ID, preparation state; when ready, feasibility, conditions, dependency summary and estimated cost. | Submission starts proposal preparation only. No debit and no computation launch at this stage. |
| GC-03 | Confirm proposal and launch computation | GAT | GAT → CON; response CON → GAT | Request ID, explicit confirmation, trusted caller context. | Confirmation accepted/rejected, current state and execution-start outcome. | At confirmation CON rechecks balance and performs debit plus admission/launch decision as one atomic business operation. |
| GC-04 / GC-04-R | List requests | GAT | GAT → CON; response CON → GAT | Trusted caller context and optional filters/pagination. | Requests owned/visible to that caller, with summaries and current states. | CON enforces ownership scope; GAT does not implement a parallel ownership model. |
| GC-05 / GC-05-R | Retrieve request status | GAT | GAT → CON; response CON → GAT | Request ID and trusted caller context. | Authoritative request/proposal/execution/cancellation state. | Access to another user's request is denied. |
| GC-06 / GC-06-R | Retrieve credit balance | GAT | GAT → CON; response CON → GAT | Trusted caller context. | Current balance and relevant accounting/consistency information. | CON owns credit policy and accounting. |
| GC-07 / GC-07-R | Decide access to result/resource | GAT | GAT → CON; response CON → GAT | Trusted caller context, target result/resource ID and requested action (map, series, lineage, download, etc.). | Allow/deny and a reason/category where needed. | CON is authority for user-facing authorization. |
| GC-14 / GC-14-R | Request cancellation | GAT | GAT → CON; response CON → GAT | Request ID and trusted caller context. | Cancellation outcome and current state. | CON stops further orchestration and coordinates already-running work; exact interruption/reconciliation behavior remains to be specified. |
| GC-08 | Request final-product delivery | GAT | GAT → CON | Result ID, optional format selection, trusted caller context. | Delivery ID and initial state. | CON authorizes, obtains canonical asset reference/location from CAT, then retrieves the object from storage and coordinates delivery. |
| GC-09 | Request dependency archive | GAT | GAT → CON | Result ID, optional archive options, trusted caller context. | Delivery ID and initial state. | CON obtains actual lineage and canonical references from CAT, retrieves objects from storage and assembles the archive. |
| GC-10 / GC-11 | Retrieve delivery status | GAT | GAT → CON; response CON → GAT | Delivery ID and trusted caller context. | Current delivery state and failure details suitable for the caller. | CON owns delivery lifecycle. |
| GC-12 / GC-13 | Retrieve delivery access | GAT | GAT → CON; response CON → GAT | Delivery ID and trusted caller context. | Secure time-bounded access information when ready. | No internal physical storage path is exposed. |

## 4.2 Proposal preparation and confirmation lifecycle

**Confirmed workflow:**

1. UI submits an analysis request through GAT.
2. GAT passes the request and trusted caller context to CON.
3. CON persists the request and starts proposal preparation.
4. CON asks SCI to evaluate scientific feasibility and estimate technical complexity.
5. CON asks CAT to resolve concrete dependencies and, where relevant, estimate missing source-acquisition costs.
6. CON applies its own credit/pricing policy and returns the proposal with estimated cost.
7. The user explicitly confirms through GAT.
8. At confirmation, CON rechecks the current credit balance.
9. If sufficient, CON debits the credits and admits/launches execution. If insufficient, confirmation is rejected and execution does not start.

Submission is not financial commitment and does not start the scientific computation. The estimate is not a debit.

### 4.3 Credit accounting invariant

**Confirmed decision:** debit occurs at confirmation, not at submission/proposal preparation.

**Required technical guarantee:** the balance check and debit must be atomic with the confirmation/admission decision. Concurrent confirmations must not spend the same available balance twice. A rejected confirmation due to insufficient balance must not launch execution or leave a partial debit.

Whether a debit is later refunded for cancellation/failure, and the exact ledger model, remain separate financial-policy decisions not defined here.

### 4.4 Delivery flow — corrected ownership

For final-product download:

1. GAT asks CON to deliver a result.
2. CON asks CAT for the canonical asset reference and current location.
3. CAT returns the canonical reference/location and associated asset metadata.
4. CON retrieves the object from object storage and coordinates secure delivery.
5. GAT returns delivery state/access information to UI.

For dependency archive:

1. CON asks CAT for actual lineage and references for the required assets.
2. CAT returns the actual lineage and canonical references/locations.
3. CON retrieves the corresponding objects from storage.
4. CON assembles the on-demand archive and coordinates its temporary availability.
5. GAT exposes delivery state/access information.

**CAT does not retrieve or serve the files for CON.** CAT resolves metadata, lineage and references. CON performs delivery orchestration and object retrieval.

---

# 5. SCI — Scientific product and computation interface owner

**Consumers:** CON for evaluation, estimation, computation and harmonization; GAT for the public scientific product catalogue.

SCI owns the meaning and behavior of scientific products. SCI does not resolve abstract input requirements to concrete available assets. That resolution is performed by CAT under CON orchestration.

## 5.1 CON-consumed scientific interface table

| Interaction ID | Operation / purpose | Consumer | Direction | Conceptual request information | Conceptual response information | Contract invariants / notes |
|---|---|---|---|---|---|---|
| CS-01 / CS-02 | Scientific feasibility evaluation and abstract input requirements | CON | CON → SCI; response SCI → CON | Product ID, product parameters, spatial scope, temporal scope and correlation/request context. | Feasibility, conditions/limitations, reasons for infeasibility and abstract input requirements (bands/variables, resolution, period and quality criteria). | Product ID is sufficient to identify the SCI-defined product. SCI selects its applicable definition/version internally and records it as metadata. No concrete asset references in this exchange. |
| CS-03 / CS-04 | Technical computation-complexity estimate | CON | CON → SCI; response SCI → CON | Self-contained product ID, parameters, spatial/temporal scope, computation options affecting resource use and correlation context. | Complexity/resource estimate, expected data volume or effort, indicative duration if available, assumptions and limitations. | CS-03 must be independently understandable; it does not depend on a prior CS-01/02 call. SCI estimates technical effort; CON calculates user-facing credits. |
| CS-05 / CS-06 | Execute scientific product computation | CON | CON → SCI; response SCI → CON | Product ID, parameters, spatial/temporal scope, concrete input asset/representation references and execution context. | Execution outcome, result metadata, method/version metadata, actual inputs consumed, quality/coverage/limitations, diagnostics and registration outcome. | CON resolves inputs through CAT. SCI performs computation and writes output; SCI registers the resulting Derived Asset with CAT. Successful computation and successful CAT registration are distinct. |
| CS-07 / CS-08 | Harmonize original L0 Source Asset representation | CON | CON → SCI; response SCI → CON | Existing Source Asset ID, original representation reference/location from CAT, harmonization options/requirements and processing context. | Harmonization outcome, generated representation metadata, method/version/provenance, quality/coverage and CAT registration status. | Original provider representation is already registered/preserved by CAT. SCI creates harmonized representations against that Source Asset; this does not create a Derived Asset. CON checks availability through CC-14. |

### 5.2 Product identity and version metadata

**Confirmed decision:** product-definition version is metadata, not a mandatory functional argument on CS-01 or CS-03. SCI knows the definition associated with the product identifier (e.g. `NDVI-01`).

SCI records the definition/method version actually used in the result metadata and provenance. The execution must remain traceable to the selected definition. A compatible method revision may increment version metadata. A change that alters the scientific meaning incompatibly should not silently reuse the same product identity.

The contract does not require the user or CON to provide a version string merely to ask SCI to evaluate or estimate a known product.

### 5.3 CS-01/02 — evaluation semantics

SCI returns:
- whether the product request is scientifically feasible;
- conditions, limitations or reason(s) for infeasibility;
- abstract input requirements;
- any scientific assumptions needed to interpret feasibility.

SCI does not:
- select actual Sentinel/Landsat/other acquisitions;
- choose concrete registered assets;
- decide user access;
- calculate user credit price.

### 5.4 CS-03/04 — estimation semantics

CS-03 is self-contained. It includes the context required to estimate the requested computation without relying on a previous evaluation call.

SCI returns technical complexity/resource information. CON converts this into a user-facing credit estimate using its own policy. Duration is indicative, not a service-level guarantee. Complexity estimation is not the same as scientific feasibility.

### 5.5 CS-05/06 — computation and registration semantics

SCI:
1. receives concrete input references/locations resolved by CON through CAT;
2. reads the input data using the supplied references;
3. computes the scientific output;
4. writes the output object;
5. submits metadata, initial object reference and actual consumed input references to CAT using SC-01;
6. waits for CAT registration confirmation (SC-02);
7. returns the computation and registration outcome to CON.

CON may query CAT separately for canonical references/current locations. SCI must not invent or duplicate CAT's canonical asset mapping.

Preserve these outcomes:

| Computation | CAT registration | Meaning |
|---|---|---|
| Successful | Successful | Derived Asset registered; availability and scientific quality remain separate checks. |
| Failed | Not completed | No successful scientific result. |
| Successful | Failed | Output may physically exist, but no registered Derived Asset is confirmed. |
| Partial | Successful or failed | Partial result/coverage must be explicitly characterized; not automatically equivalent to total failure. |

### 5.6 CS-07/08 — harmonization semantics

SCI harmonizes an already registered Source Asset's original provider representation. It submits generated representations to CAT for registration against that existing Source Asset (SC-03/04). It does not create a Derived Asset for this operation.

A Source Asset may remain registered and its original representation may remain available while harmonized representations are pending, unavailable or failed. Registration confirmation is not by itself proof that a representation is already available for consumption; CON checks required availability with CC-14.

### 5.7 GAT-consumed scientific catalogue table

| Interaction ID | Operation / purpose | Consumer | Direction | Conceptual request information | Conceptual response information | Contract invariants / notes |
|---|---|---|---|---|---|---|
| GS-01 / GS-02 | Query and return scientific product catalogue/definition information | GAT | GAT → SCI; response SCI → GAT | Product ID or catalogue filters/pagination as supported. | Product identifiers, definitions, supported parameters, scientific characteristics, input requirements and scientific documentation/validation metadata. | SCI is the scientific authority. GAT exposes the public view; CAT may store metadata associated with concrete assets but does not define the scientific product. |

Scientific product validation status belongs to the product design/development lifecycle. Result-specific quality and coverage belong to each computed result. The catalogue should not imply that every result from a validated product is itself high quality.

---

# 6. CAT — Asset catalogue and data interface owner

**Consumers:** CON for dependency resolution, acquisition, references, lineage and representation availability; SCI for registration of derived assets and harmonized representations.

CAT owns concrete asset discovery, source acquisition/ingestion, asset and representation registration, metadata persistence/retrieval, canonical asset references and actual lineage. CAT does not define scientific product semantics, perform scientific computation or make user-facing authorization decisions.

## 6.1 CON-consumed CAT interface table

| Interaction ID | Operation / purpose | Consumer | Direction | Conceptual request information | Conceptual response information | Contract invariants / notes |
|---|---|---|---|---|---|---|
| CC-01 / CC-02 | Resolve abstract requirements to concrete dependencies | CON | CON → CAT; response CAT → CON | SCI abstract input criteria, requested spatial/temporal scope, compatibility/quality constraints and correlation context. | Matching concrete Source/Derived Asset instances, IDs, acquisition/product identity, spatial/temporal support, quality/coverage metadata and representation availability. | CAT resolves concrete candidates against explicit criteria. SCI owns scientific thresholds; CON orchestrates selection/dependencies. |
| CC-03 | Report missing intermediate products | CON | CAT → CON | Not applicable as an independent request if returned as part of dependency resolution; exact triggering semantics remain to be confirmed against matrix. | Missing intermediate product identity, required scope/parameters and dependency context. | CAT reports missing products; CON asks SCI for requirements and orchestrates their generation. CAT does not compute them. |
| CC-04 | Report missing L0 acquisitions | CON | CAT → CON | Not applicable as an independent request if returned as part of dependency resolution; exact triggering semantics remain to be confirmed against matrix. | Missing acquisition identity/provider/mission, tile or acquisition context, spatial/temporal support and constraints. | CAT identifies missing source acquisitions; CON orchestrates acquisition/ingestion. |
| CC-05 / CC-06 | Obtain itemized L0 acquisition costs | CON | CON → CAT; response CAT → CON | List of missing source acquisitions and provider context. | Cost per acquisition, cost unit and assumptions/limitations. | CAT reports source/provider acquisition cost. CON applies its own user-facing credit/pricing policy. |
| CC-07 / CC-08 | Request and report L0 ingestion | CON | CON → CAT; response CAT → CON | Acquisition identifiers, provider references and ingestion context. | Ingestion outcome, registered Source Asset identifiers, original representation metadata/references and diagnostics. | CAT preserves/registers original provider data. Acquisition/ingestion state is distinct from harmonization and scientific quality. |
| CC-09 / CC-10 | Resolve canonical asset references and locations | CON | CON → CAT; response CAT → CON | Logical asset/representation IDs. | Canonical asset and representation references, current locations, metadata needed for authorized processing/delivery. | Logical IDs are not physical paths. CAT is authority for canonical asset/representation references and current location. |
| CC-11 / CC-12 | Retrieve actual result lineage | CON | CON → CAT; response CAT → CON | Result/Derived Asset identifier. | Exact source and intermediate assets actually consumed, relationships and relevant registered metadata. | Actual lineage is distinct from CON's planned dependency graph. |
| CC-13 | Resolve original Source Asset representation | CON | CON → CAT | Source Asset ID and original-provider representation selection/context. | Original representation reference/location and associated metadata. | Used before SCI harmonization. Original provider representation remains preserved and distinguishable. |
| CC-14 | Check harmonized representation availability | CON | CON → CAT | Source Asset ID and required representation characteristics/identifiers. | Availability state for each required representation, plus metadata/location where available. | Registration and availability are separate. CON only unblocks dependent work when the required representation is actually available. |

**Open point:** CC-02's exact selection semantics (one selected asset versus a candidate set) must follow the authoritative matrix and dependency-planning design. Do not silently assume CAT makes the final scientific selection if the matrix assigns that decision to CON.

## 6.2 SCI-consumed CAT registration interface table

| Interaction ID | Operation / purpose | Consumer | Direction | Conceptual request information | Conceptual response information | Contract invariants / notes |
|---|---|---|---|---|---|---|
| SC-01 / SC-02 | Register a Derived Asset and confirm registration | SCI | SCI → CAT; response CAT → SCI | New output metadata, initial object reference/location, product identity, method/version metadata, parameters/scope/period, quality metadata and exact input asset references actually consumed. | Registration outcome, canonical logical asset ID and registration diagnostics. | CAT registers the Derived Asset and actual lineage. SCI remains owner of scientific meaning/method; CAT owns registration and canonical asset identity. |
| SC-03 / SC-04 | Register harmonized representations against an existing Source Asset and confirm | SCI | SCI → CAT; response CAT → SCI | Existing Source Asset ID, generated representation metadata, object reference/location, harmonization method/version and quality/coverage metadata. | Registration outcome and representation identifiers/registration diagnostics. | This adds representations to an existing Source Asset. It does not create a Derived Asset. |

### 6.3 Metadata responsibilities

CAT stores and returns metadata associated with concrete registered assets and representations. This includes metadata supplied by SCI when registering a computed product or harmonized representation.

Responsibility is split as follows:

| Metadata category | Semantic authority / producer | Storage and retrieval responsibility |
|---|---|---|
| Product definition and scientific meaning | SCI | SCI catalogue; CAT may store a copy/snapshot when attached to an asset. |
| Method and product-definition version actually used | SCI / computation provenance | SCI supplies it; CAT stores it with the registered result asset; CON retrieves/assembles it for request/result views. |
| Scientific parameters, assumptions and limitations | SCI | SCI supplies; CAT stores with the asset/result metadata where applicable. |
| Scientific validation status/reference for the product | SCI product lifecycle | SCI defines; public catalogue exposes it. CAT may retain associated metadata with an asset snapshot. |
| Asset identity, representation identity and registration state | CAT | CAT |
| Native CRS, dimensions, resolution, format, size, actual extent and actual temporal coverage | Source metadata and processing metadata; CAT validates/records asset facts | CAT |
| Current object reference/location and representation availability | CAT | CAT |
| Actual input assets consumed and dependency lineage | SCI reports exact consumed inputs; CAT records registered lineage | CAT |

The fact that CAT stores a scientific metadata field does not transfer scientific authority from SCI to CAT.

---

# 7. Component-to-component interface ownership summary

| Interface owner/provider | Consumers | Interface families | Main capability exposed |
|---|---|---|---|
| GAT | UI | UI-01..UI-24 | Public REST catalogue, requests, representations, lineage, downloads and balance. |
| CON | GAT | GC-02..GC-14 | Request/proposal lifecycle, confirmation, authorization, credits, cancellation and delivery orchestration. |
| SCI | CON; GAT | CS-01..CS-08; GS-01/GS-02 | Scientific evaluation, complexity estimate, computation, harmonization and scientific product catalogue. |
| CAT | CON; SCI | CC-01..CC-14; SC-01..SC-04 | Concrete asset resolution, acquisition/ingestion, metadata, registration, references, availability and actual lineage. |
| UI | None (in this component model) | Consumes GAT public interface | User presentation and interaction; does not expose a backend service interface in this inventory. |

---

# 8. End-to-end routes

| User/system need | Logical route | Ownership note |
|---|---|---|
| Browse scientific products and theoretical requirements | UI → GAT → SCI → GAT → UI | SCI owns scientific definitions; GAT owns public exposure. |
| Submit request and prepare proposal | UI → GAT → CON; CON ↔ SCI; CON ↔ CAT; CON → GAT → UI | CON owns request/proposal lifecycle. No debit or computation launch yet. |
| Confirm and launch request | UI → GAT → CON; CON rechecks balance, debits and launches orchestration | Debit/admission must be atomic at confirmation. |
| Resolve missing intermediate product | CON ↔ SCI for abstract requirements; CON ↔ CAT for concrete dependency resolution; CON orchestrates recursive dependencies | SCI defines requirements; CAT resolves assets; CON orchestrates. |
| Acquire missing L0 data | CON → CAT → EO provider/storage; CAT registers original Source Asset; CAT → CON | CAT owns acquisition/ingestion and original registration. |
| Harmonize L0 data | CON → CAT for original representation; CON → SCI; SCI → CAT registration; CON → CAT availability check | SCI owns harmonization method; CAT owns registration/availability. |
| Execute derived product | CON → CAT for concrete input references; CON → SCI; SCI reads inputs and computes | SCI computes; CON orchestrates; CAT resolves/registers assets. |
| Register generated product | SCI → CAT (SC-01); CAT → SCI (SC-02); SCI → CON (CS-06) | CAT registers Derived Asset and actual lineage. |
| Display map/analytical result | UI → GAT → CON authorization; CON → CAT for canonical asset refs/metadata; CON → SCI for scientific representation; return through CON/GAT | CAT resolves references/metadata; SCI generates scientific representation; CON coordinates. |
| Retrieve result metadata/lineage | UI → GAT → CON → CAT; CON assembles request context and metadata provenance | CAT returns stored asset metadata and actual lineage; SCI remains scientific authority. |
| Download final product | UI → GAT → CON → CAT for canonical reference/location; CON → object storage | CAT does not retrieve/serve the object. CON handles delivery. |
| Download dependency archive | UI → GAT → CON → CAT for actual lineage/references; CON → object storage; CON assembles archive | Archive follows actual lineage. |
| Cancel request | UI → GAT → CON; CON stops future orchestration and reconciles running work | Cancellation outcome depends on operation already dispatched. |

---

# 9. Deliberately absent interfaces

These absences are architectural constraints, not missing implementation tasks.

### 9.1 GAT ↔ CAT

No direct interface. GAT is the public gateway; CON coordinates asset discovery, access, metadata retrieval and delivery.

### 9.2 UI ↔ CON / SCI / CAT

No direct UI interface outside GAT.

### 9.3 SCI ↔ CAT input resolution

No direct SCI request to CAT for matching/selection of input assets, and no direct CAT delivery of resolved inputs to SCI.

The route is:
1. SCI describes abstract requirements to CON.
2. CON sends requirements to CAT.
3. CAT returns concrete asset information to CON.
4. CON passes concrete references to SCI.
5. SCI reads the supplied references.

SCI ↔ CAT is used for registration/confirmation of generated Derived Assets and harmonized representations only.

---

# 10. Synchronization, reliability and failure semantics

## 10.1 Synchronization overview

| Interface family | Conceptual behavior | Open implementation detail |
|---|---|---|
| UI ↔ GAT | Public REST; long-running operations are asynchronous at the API boundary. | Routes, payloads, status vocabulary, error envelope and exact async threshold. |
| GAT ↔ CON | Request/proposal, confirmation, retrieval, access, credits, cancellation and delivery operations. | Internal transport and timeout/retry details. |
| GAT ↔ SCI | Scientific product catalogue and theoretical input requirements. | Internal transport and catalogue caching/version freshness. |
| CON ↔ SCI | Evaluation/estimate request-response; computation/harmonization dispatched and outcomes reported later. | Dispatch protocol, acknowledgements, durability, idempotency and recovery. |
| CON ↔ CAT | Dependency, acquisition-cost, references, lineage and availability; ingestion may be long-running. | Ingestion dispatch/outcome, candidate selection semantics and recovery. |
| SCI ↔ CAT | Registration request and confirmation. | Synchronous/asynchronous behavior, idempotency and retry. |

## 10.2 Reliability requirements

- Persist request and execution state so it can be recovered after interruption.
- State-changing operations must be idempotent; retries must not duplicate requests, result assets, registrations, credit debits or deliveries.
- Long-running work executes outside the public REST request/response cycle.
- Retries, if implemented, are bounded and preserve idempotency.
- Failed jobs must not corrupt request/credit/asset state.
- Correlation must link request, execution run, operation and outcome.
- Secrets and sensitive user data must not be logged.

**Additional financial invariant:** confirmation must not permit concurrent overdraw. The balance check and debit/admission decision are atomic.

## 10.3 Failure distinctions

At minimum, preserve:
- request validation failure;
- scientific infeasibility;
- proposal preparation failure;
- insufficient balance at confirmation;
- missing source acquisition;
- acquisition/ingestion failure;
- harmonization failure;
- representation-registration failure;
- representation registered but unavailable;
- scientific computation failure;
- partial scientific coverage/result;
- Derived Asset registration failure;
- delivery/archive failure;
- authorization denial;
- cancellation accepted, rejected or only partially effective.

Missing observation is not a processing failure. A cloud/quality mask is not a zero measurement. A registered asset is not necessarily available, complete or scientifically valid.

---

# 11. M0 scope versus deferred detail

## 11.1 M0 behavior

M0 should exercise the logical boundaries with deterministic/mock behavior where necessary:
- UI uses GAT as the only public API.
- GAT derives and propagates deterministic demo identity context.
- Request submission persists a request and starts proposal preparation.
- Proposal includes deterministic feasibility and cost before explicit confirmation.
- Submission does not debit credits or launch computation.
- Confirmation rechecks balance and atomically debits/admits the request before execution.
- CON coordinates SCI and CAT through their logical interfaces.
- SCI exposes product definitions, evaluates requests, returns deterministic estimates and computes mock/deterministic results.
- CAT resolves/registers deterministic/mock assets and actual lineage.
- SCI → CAT registration is represented for Derived Assets and harmonized Source Asset representations.
- CAT stores and returns result/asset metadata, retaining the distinction between metadata storage and scientific authority.
- Request, result, asset, representation and quality states remain distinct.
- REST retrieves authoritative request state after reconnection.
- Synthetic map/time-series/download behavior follows the public route.
- Delivery uses CAT references and CON retrieval/assembly; storage paths are not exposed publicly.

M0 mock behavior must not be presented as real EO processing, validated scientific quality, production authentication or production-grade financial accounting.

## 11.2 Deferred

This conceptual inventory does not fix:
- exact JSON/Pydantic schemas and serialization;
- REST route names and HTTP status mapping;
- NATS subjects or worker protocols;
- queue/worker/workflow implementation;
- storage backend, object layout or Zarr schema;
- exact identifier formats;
- complete state enumerations;
- retry/backoff and dead-letter/reconciliation implementation;
- production authentication provider/token format;
- production credit ledger, refund policy and pricing formula;
- archive TTL, temporary storage and cleanup;
- quantitative product-specific quality thresholds;
- exact metadata schema and provenance serialization.

---

# 12. Review checklist

- [ ] Every interaction ID in the authoritative Component Interaction Matrix is represented.
- [ ] Each interface has one clearly identified owner/provider and explicit consumer(s).
- [ ] Request and response directions are explicit.
- [ ] Product identifiers are not confused with product-definition version metadata.
- [ ] SCI remains authority for scientific definitions and methods.
- [ ] CAT stores/retrieves registered asset metadata without becoming scientific authority.
- [ ] Submission prepares a proposal; confirmation checks balance, debits and launches execution.
- [ ] Credit balance check and debit/admission are atomic.
- [ ] SCI abstract input requirements and CAT concrete asset resolution remain distinct.
- [ ] Planned dependency graph and actual lineage remain distinct.
- [ ] Derived Asset registration and harmonized Source Asset representation registration remain distinct.
- [ ] Registration and representation availability remain distinct.
- [ ] Request state, task state, asset registration, representation availability and scientific quality remain distinct.
- [ ] Product scientific validation and individual result quality remain distinct.
- [ ] Public UI operations go through GAT; private result access is authorized through CON.
- [ ] Download flow correctly separates CAT reference resolution from CON object retrieval/delivery.
- [ ] Long-running public operations are asynchronous at the REST boundary.
- [ ] No route, payload schema or transport is frozen prematurely.
- [ ] M0 mock behavior is distinguished from planned real capabilities.

---

## 13. Source and reconciliation notes

The previous draft identified these branch sources as its basis:

- `documentation/architecture/system-interactions/component-interaction-matrix.md` — logical interaction inventory and routes.
- `documentation/architecture/system-interactions/component-interaction-design.md` — interaction design rationale and sequence flows.
- `documentation/architecture/catalogue-responsibilities.md` — Product Catalogue versus Data/Asset Catalogue, registration and lineage responsibilities.
- `documentation/specifications/components/gtw.md`, `con.md`, `sci.md`, `cat.md`, `ui.md` — component responsibilities and requirements; older component drafts may require reconciliation.
- `documentation/specifications/eng.md` — cross-cutting engineering requirements.
- `documentation/specifications/sys.md` — system-level behavior and M0 requirements.

The target branch could not be reopened during this revision because GitHub access returned `404` for the repository contents on both the target branch and `main`. Therefore:
- the interaction IDs and responsibility model are carried forward from the prior draft;
- this file is a revised proposal, not a verified replacement for the branch's current source documents;
- the five-second threshold and CC-02 candidate/selection semantics are explicitly left for source reconciliation;
- no repository file has been modified or committed by this operation.

The Component Interaction Matrix remains the authority for the set of validated logical interactions. This document defines conceptual contracts and must not silently override that matrix.