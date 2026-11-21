# MEOGAP — Interface & Contract Inventory

**Document status:** Reviewed conceptual interface inventory — aligned with the validated interaction matrix; detailed contract definitions are scheduled for M1  
**Scope:** Conceptual contracts for the logical interactions inventoried for M0  
**Target branch:** `38-m0-e02-t04-identify-m0-interface-and-contract-boundaries`  
**Purpose:** Define interface responsibilities and conceptual information exchanged, organized by the component that provides/owns each interface.

> **Status note:** This document uses the branch's Component Interaction Matrix as the authority for interaction IDs, producers/consumers, logical routes and Sync/Async classifications. Proposal preparation is fully asynchronous from submission through CS-01/02, CS-03/04 and CC-01/06; confirmation rechecks the balance, debits credits and launches execution; product-definition version is traceability metadata; CAT stores/retrieves registered asset metadata without becoming the scientific authority; CON retrieves objects from storage and orchestrates delivery. Final-product and dependency-archive delivery are asynchronous. GC-10 through GC-13 are removed; delivery state and access belong to the resource created by GC-08/GC-09 and exposed through UI-21.

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

The **interface owner** is the component that provides/owns the logical capability. The consumer invokes or uses that capability. The owner is not necessarily the producer of every message: CAT owns its catalogue interface but emits responses to CON queries. For request/response families, both directions are shown together. Interface ownership is distinct from the scientific or business authority for individual metadata fields.

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

### 1.4 Interaction style versus synchronization mode

Two independent axes are used throughout the architecture:

- **Interaction style** describes the logical form of the boundary.
- **Sync/Async** describes when the business outcome is produced relative to initiation.

The interaction styles currently established are:

| Boundary | Logical interaction style | Sync/Async classification | Physical transport |
|---|---|---|---|
| UI ↔ GAT | Public REST API | Fixed per UI operation as listed in §3.3 | HTTP REST |
| GAT ↔ CON | Internal component operation / request-response boundary | Fixed per GC interaction in the matrix; proposal and delivery initiation are Async | Unresolved |
| GAT ↔ SCI (GS-01/02 only) | Internal component operation / request-response boundary for catalogue access | Sync | Unresolved |
| CON ↔ SCI | Internal operation with deferred outcome for evaluation, estimation, computation and harmonization | Async | Unresolved |
| CON ↔ CAT | Internal operation with deferred outcome for dependency resolution, acquisition-cost estimation and ingestion; direct query/response for reference/lineage/availability | Fixed per CC interaction in the matrix | Unresolved |
| SCI ↔ CAT | Internal registration operation and confirmation | Sync | Unresolved |

The physical style/transport of internal boundaries is not selected by this inventory. In particular, Async does not automatically mean NATS or a message broker, and Sync does not automatically mean in-process calls or RPC. Workers, NATS and storage remain mechanisms/infrastructure, not logical components. Any choice that constrains implementation is recorded separately through an ADR.

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

CAT is responsible for storing and retrieving metadata associated with registered assets/results and their representations. This does not make CAT the scientific authority for every field it stores. This follows catalogue-responsibilities.md §6 and the SCI → CAT registration handoff.

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

**Consumer of GAT:** UI.  
**Internal dependency:** SCI for the public scientific product catalogue (GS-01/02). GAT does not own the scientific definition.

GAT is the only public REST boundary. UI does not call CON, SCI, CAT, object storage or NATS directly. The tables below preserve the matrix's interaction IDs and distinguish user-initiated requests from response interactions.

## 3.1 UI-consumed GAT interface

| Interaction ID | Operation / purpose | Interface owner | Consumer | Direction | Conceptual request information | Conceptual response information | Contract invariants / notes  | Interaction mode |
|---|---|---|---|---|---|---|--- | --- |
| UI-01 | Browse product catalogue | GAT | UI | UI → GAT; catalogue data from SCI via GS-01/02 | Optional catalogue filters/pagination. Caller/trace context is derived by GAT. | Product identifiers, names, descriptions and requestability/catalogue information. | SCI is scientific authority for Product Definitions; GAT exposes the public catalogue. Catalogue availability does not imply asset/result availability.  | Sync |
| UI-02 | Retrieve product definition | GAT | UI | UI → GAT; catalogue data from SCI via GS-01/02 | Product identifier. | Scientific purpose, method description, supported parameters, outputs, units, spatial/temporal characteristics, assumptions, limitations, documentation and validation status where available. | SCI owns the definition. CAT may store/index metadata snapshots attached to concrete assets but does not define the product.  | Sync |
| UI-05 | Submit analysis request | GAT | UI | UI → GAT → CON; response GAT → UI | Product identifier, original spatial input (AOI/POI/LOI), buffer parameters where applicable, UTC temporal scope and product-specific parameters. | Persistent request reference and current state; feasibility, conditions, execution proposal and estimated cost when proposal preparation completes. | Submission creates/persists the request and starts feasibility evaluation, dependency resolution and cost estimation. There is no separate pre-submission feasibility/cost call. No debit and no scientific computation launch at submission.  | Async |
| UI-06 | Confirm proposed request | GAT | UI | UI → GAT → CON; response GAT → UI | Request identifier and explicit confirmation. | Confirmation/admission outcome and current request state. | CON rechecks the balance at confirmation. If accepted, CON debits credits and launches execution; insufficient balance means no launch.  | Sync |
| UI-07 | List analysis requests | GAT | UI | UI → GAT → CON; response GAT → UI | Optional filters, sorting and pagination. | Requests visible to authenticated caller, including identifiers, summary, timestamps and lifecycle state. | CON enforces caller ownership. UI cannot select another owner by supplying an owner ID.  | Sync |
| UI-08 | Retrieve request status | GAT | UI | UI → GAT → CON; response GAT → UI | Request identifier. | Authoritative current request/proposal/execution state and user-visible status details. | REST is source of truth even if notifications are missed.  | Sync |
| UI-09 | Request map visualization | GAT | UI | UI → GAT → CON (authorization) → SCI; response via CON → GAT → UI | Result identifier and supported map/display selection (e.g. variable, slice, display options). | SCI-generated map representation or access reference, with extent/CRS/display and validity metadata. | Specific-result visualization is not a direct GAT ↔ SCI catalogue call. CON checks access before asking SCI for the representation.  | Sync |
| UI-10 | Request analytical representation | GAT | UI | UI → GAT → CON (authorization) → SCI; response via CON → GAT → UI | Result identifier, spatial selection (point or zonal/AOI summary), temporal window and supported representation options. | Values/representation, time coordinates, units, spatial support/aggregation, quality and missing/masked distinctions. | Specific-result analytical representation passes through CON. Point selection, SAU and AOI summary are distinct concepts; SYS-06 defines point and zonal analysis.  | Sync |
| UI-11 | Inspect scientific input requirements | GAT | UI | UI → GAT; GAT ↔ SCI through GS-01/02; response GAT → UI | Product identifier. | Abstract bands/variables, spatial/spectral resolution, acquisition-period constraints, quality requirements and compatibility criteria. | These are theoretical scientific requirements, not concrete acquisitions or asset references.  | Sync |
| UI-12 | Inspect actual result lineage | GAT | UI | UI → GAT → CON → CAT; response via CON → GAT → UI | Result identifier. | Actual source/intermediate assets, concrete product/acquisition instances and versions used, registered lineage and associated asset metadata. | CAT owns actual lineage and stores/retrieves asset metadata. SCI remains authority for scientific meaning/method metadata.  | Sync |
| UI-13 | Download final product | GAT | UI | UI → GAT → CON; CON → CAT for canonical reference/location; CON → object storage | Result identifier and supported format/representation selection, if applicable. | Delivery identifier and initial state. | **Async.** Final product only; no dependency archive. UI-21 exposes the later state and secure access through this same delivery resource. CAT supplies canonical references; CON retrieves the object and orchestrates delivery. | Async |
| UI-14 | Request dependency archive | GAT | UI | UI → GAT → CON; CON → CAT for actual lineage/references; CON → object storage | Result identifier and supported archive options, if applicable. | Delivery identifier and initial state. | **Async.** Archive is generated on demand and follows actual lineage, not merely CON's planned dependency graph. UI-21 exposes the later state and secure access through this same delivery resource. CON assembles it. | Async |
| UI-15 | Retrieve credit balance | GAT | UI | UI → GAT → CON; response GAT → UI | Authenticated caller context only. | Current balance. | CON owns credit policy/accounting. No client-supplied owner identity.  | Sync |
| UI-23 | Request analysis cancellation | GAT | UI | UI → GAT → CON; response GAT → UI | Request identifier and cancellation intent. | Cancellation outcome and current request state. | Cancellation may be requested in any request state except `COMPLETED`. CON coordinates interruption/reconciliation of work already running.  | Sync |

## 3.2 GAT-produced response interactions

These are response interactions in the matrix, not additional UI-initiated operations.

| Interaction ID | Interface owner | Consumer | Direction | Information returned | Notes  | Interaction mode |
|---|---|---|---|---|--- | --- |
| UI-16 | GAT | UI | GAT → UI | Product catalogue information and definitions. | Includes public scientific metadata obtained from SCI through GS-01/02.  | Sync |
| UI-17 | GAT | UI | GAT → UI | Feasibility decision, conditions/limitations and estimated cost proposal. | Returned when proposal preparation completes.  | Async |
| UI-18 | GAT | UI | GAT → UI | Request identifiers, request-list entries and current status. | REST state remains authoritative.  | Sync |
| UI-19 | GAT | UI | GAT → UI | Requested map or analytical representation. | Result representation is obtained through CON → SCI after authorization.  | Sync |
| UI-20 | GAT | UI | GAT → UI | Actual lineage of a computed result. | Obtained through CON → CAT.  | Sync |
| UI-21 | GAT | UI | GAT → UI | Current delivery state and secure access information when ready. | **Async outcome** associated with the delivery identifier created by UI-13 or UI-14. It is not a separate delivery request; status and access belong to the same persistent delivery resource. | Async |
| UI-22 | GAT | UI | GAT → UI | Current credit balance. | CON is accounting authority.  | Sync |
| UI-24 | GAT | UI | GAT → UI | Cancellation outcome and current request state. | CON is lifecycle authority.  | Sync |

## 3.3 Synchronization classification

The interaction mode is explicit and is never conditional:

- **Async:** UI-05, UI-13, UI-14, UI-17 and UI-21; GC-02, GC-08 and GC-09; all CON↔SCI interactions CS-01 through CS-08; and CON↔CAT interactions CC-01 through CC-08.
- **Sync:** the remaining UI↔GAT and GAT↔CON interactions; GAT↔SCI catalogue interactions GS-01/GS-02; CON↔CAT interactions CC-09 through CC-14; and SCI↔CAT registration interactions SC-01 through SC-04.

Async means the initiating operation has a persistent identity and its business outcome is produced later. This includes feasibility, complexity estimation, dependency resolution, acquisition-cost estimation, L0 ingestion, harmonization, scientific computation and both delivery types. The user-facing REST resource remains the source of truth for request and delivery state.

GC-08 and GC-09 create delivery resources. UI-21 represents the asynchronous delivery state/access outcome associated with that same delivery identifier. GC-10 through GC-13 are deliberately absent as separate logical interfaces. A REST read of an existing delivery resource is how its current state is retrieved; it does not create a new logical interaction family.

The classification does not prescribe internal worker, RPC, NATS, message acknowledgement or deployment mechanisms. Exact response envelopes, status vocabulary, pagination, error model and representation encoding remain implementation-level decisions.

# 4. CON — Request, authorization, credit and delivery interface owner

**Primary consumer:** GAT.  
**Internal consumers of CON orchestration:** SCI and CAT are invoked by CON; they are not consumers of CON's public-facing user API.

CON owns the business lifecycle. It coordinates SCI and CAT but does not take over their scientific or asset-catalogue responsibilities.

## 4.1 CON-owned interface consumed by GAT

| Interaction ID | Operation / purpose | Interface owner | Consumer | Direction | Conceptual request information | Conceptual response information | Contract invariants / notes  | Interaction mode |
|---|---|---|---|---|---|---|--- | --- |
| GC-02 / GC-02-R | Create request and prepare proposal | CON | GAT | GAT → CON; response CON → GAT | Product ID, spatial/temporal scope, product parameters, trusted caller context, correlation context. | Request ID, preparation state; when ready, feasibility, conditions, dependency summary and estimated cost. | Submission starts proposal preparation only. No debit and no computation launch at this stage.  | Async |
| GC-03 | Confirm proposal and launch computation | CON | GAT | GAT → CON; response CON → GAT | Request ID, explicit confirmation, trusted caller context. | Confirmation accepted/rejected, current state and execution-start outcome. | At confirmation CON rechecks balance and performs debit plus admission/launch decision as one atomic business operation.  | Sync |
| GC-04 / GC-04-R | List requests | CON | GAT | GAT → CON; response CON → GAT | Trusted caller context and optional filters/pagination. | Requests owned/visible to that caller, with summaries and current states. | CON enforces ownership scope; GAT does not implement a parallel ownership model.  | Sync |
| GC-05 / GC-05-R | Retrieve request status | CON | GAT | GAT → CON; response CON → GAT | Request ID and trusted caller context. | Authoritative request/proposal/execution/cancellation state. | Access to another user's request is denied.  | Sync |
| GC-06 / GC-06-R | Retrieve credit balance | CON | GAT | GAT → CON; response CON → GAT | Trusted caller context. | Current balance and relevant accounting/consistency information. | CON owns credit policy and accounting.  | Sync |
| GC-07 / GC-07-R | Decide access to result/resource | CON | GAT | GAT → CON; response CON → GAT | Trusted caller context, target result/resource ID and requested action (map, series, lineage, download, etc.). | Allow/deny and a reason/category where needed. | CON is authority for user-facing authorization.  | Sync |
| GC-14 / GC-14-R | Request cancellation | CON | GAT | GAT → CON; response CON → GAT | Request ID and trusted caller context. | Cancellation outcome and current state. | CON stops further orchestration and coordinates already-running work; exact interruption/reconciliation behavior remains to be specified.  | Sync |
| GC-08 | Request final-product delivery | CON | GAT | GAT → CON | Result ID, optional format selection, trusted caller context. | Delivery ID and initial state. | CON authorizes, obtains the canonical asset reference/location from CAT, retrieves the object from storage and coordinates delivery. The delivery resource later exposes its state and secure access through UI-21. | Async |
| GC-09 | Request dependency archive | CON | GAT | GAT → CON | Result ID, optional archive options, trusted caller context. | Delivery ID and initial state. | CON obtains actual lineage and canonical references from CAT, retrieves objects from storage and assembles the archive. The delivery resource later exposes its state and secure access through UI-21. | Async |

## 4.2 Proposal preparation and confirmation lifecycle

**Confirmed workflow:**

1. UI submits an analysis request through GAT.
2. GAT passes the request and trusted caller context to CON.
3. CON persists the request and starts proposal preparation.
4. CON asks SCI to evaluate scientific feasibility and estimate technical complexity.
5. CON asks CAT to resolve concrete dependencies and, where relevant, estimate missing source-acquisition costs.
6. CON calculates the proposal cost from SCI's technical complexity/resource estimate and CAT's itemized missing-L0 acquisition costs, applies its own credit/pricing policy and returns the estimated cost.
7. The user explicitly confirms through GAT.
8. At confirmation, CON rechecks the current credit balance.
9. If sufficient, CON debits the credits and admits/launches execution. If insufficient, confirmation is rejected and execution does not start.

Submission is not financial commitment and does not start the scientific computation. The estimate is not a debit. The current balance may change while the proposal is awaiting confirmation; only the confirmation-time balance check determines whether the request is admitted.

### 4.3 Credit accounting invariant

**Confirmed decision:** debit occurs at confirmation, not at submission/proposal preparation.

**Required technical guarantee:** the balance check and debit must be atomic with the confirmation/admission decision. Concurrent confirmations must not spend the same available balance twice. A rejected confirmation due to insufficient balance must not launch execution or leave a partial debit. This is a concurrency safeguard for the confirmation contract; it does not imply a production-grade ledger is already implemented.

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

**CAT does not retrieve or serve the files for CON.** CAT resolves metadata, actual lineage and canonical references/current locations. CON performs delivery orchestration, object retrieval and archive assembly.

---

# 5. SCI — Scientific product and computation interface owner

**Consumers:** CON for evaluation, estimation, computation and harmonization; GAT for the public scientific product catalogue.

SCI owns the meaning and behavior of scientific products. SCI does not resolve abstract input requirements to concrete available assets. That resolution is performed by CAT under CON orchestration.

## 5.1 SCI-owned interfaces consumed by CON

| Interaction ID | Operation / purpose | Interface owner | Consumer | Direction | Conceptual request information | Conceptual response information | Contract invariants / notes  | Interaction mode |
|---|---|---|---|---|---|---|--- | --- |
| CS-01 / CS-02 | Scientific feasibility evaluation and abstract input requirements | SCI | CON | CON → SCI; response SCI → CON | Product ID, product parameters, spatial scope, temporal scope and correlation/request context. | Feasibility, conditions/limitations, reasons for infeasibility and abstract input requirements (bands/variables, resolution, period and quality criteria). | Product ID is sufficient to identify the SCI-defined product. SCI selects its applicable definition/version internally and records it as metadata. No concrete asset references in this exchange.  | Async |
| CS-03 / CS-04 | Technical computation-complexity estimate | SCI | CON | CON → SCI; response SCI → CON | Self-contained product ID, parameters, spatial/temporal scope, computation options affecting resource use and correlation context. | Complexity/resource estimate, expected data volume or effort, indicative duration if available, assumptions and limitations. | CS-03 must be independently understandable; it does not depend on a prior CS-01/02 call. SCI estimates technical effort; CON calculates user-facing credits.  | Async |
| CS-05 / CS-06 | Execute scientific product computation | SCI | CON | CON → SCI; response SCI → CON | Product ID, product parameters, spatial/temporal scope, concrete input asset/representation references resolved through CAT, and execution/correlation context. | Execution outcome, result metadata, method/version metadata, actual inputs consumed, quality/coverage/limitations, diagnostics and registration outcome. | Product ID identifies the requested scientific product. SCI resolves or pins the applicable definition internally; the version actually used is recorded as provenance. CON resolves concrete inputs through CAT. SCI computes, writes output and registers the Derived Asset with CAT. | Async |
| CS-07 / CS-08 | Harmonize original L0 Source Asset representation | SCI | CON | CON → SCI; response SCI → CON | Existing Source Asset ID, original representation reference/location from CAT, harmonization options/requirements and processing context. | Harmonization outcome, generated representation metadata, method/version/provenance, quality/coverage and CAT registration status. | Original provider representation is already registered/preserved by CAT. SCI creates harmonized representations against that Source Asset; this does not create a Derived Asset. CON checks availability through CC-14.  | Async |

### 5.2 Product identity and version metadata

**Confirmed decision:** product-definition version is metadata, not a mandatory functional argument on CS-01 or CS-03. SCI knows the definition associated with the product identifier (e.g. `NDVI-01`).

SCI records the definition/method version actually used in the result metadata and provenance. The execution must remain traceable to the selected definition. A compatible method revision may increment version metadata. **Contract proposal:** a change that alters the scientific meaning incompatibly should not silently reuse the same product identity.

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

### 5.7 SCI-owned scientific catalogue interface consumed by GAT

| Interaction ID | Operation / purpose | Interface owner | Consumer | Direction | Conceptual request information | Conceptual response information | Contract invariants / notes  | Interaction mode |
|---|---|---|---|---|---|---|--- | --- |
| GS-01 / GS-02 | Query and return scientific product catalogue/definition information | SCI | GAT | GAT → SCI; response SCI → GAT | Product ID or catalogue filters/pagination as supported. | Product identifiers, definitions, supported parameters, scientific characteristics, input requirements and scientific documentation/validation metadata. | SCI is the scientific authority. GAT exposes the public view; CAT may store metadata associated with concrete assets but does not define the scientific product.  | Sync |

Scientific product validation status belongs to the product design/development lifecycle (for example, an NDVI comparison campaign against external reference data). SYS-14a/14b require a product-level validation record with its reference, metric, tolerance, observed result and validated/unvalidated status. Result-specific quality and coverage belong to each computed result. The catalogue must not imply that every result from a validated product is itself high quality.

---

# 6. CAT — Asset catalogue and data interface owner

**Consumers:** CON for dependency resolution, acquisition, references, lineage and representation availability; SCI for registration of derived assets and harmonized representations.

CAT owns concrete asset discovery, source acquisition/ingestion, asset and representation registration, metadata persistence/retrieval, canonical asset references and actual lineage. CAT does not define scientific product semantics, perform scientific computation or make user-facing authorization decisions.

## 6.1 CAT-owned interfaces consumed by CON

| Interaction ID | Operation / purpose | Interface owner | Consumer | Direction | Conceptual request information | Conceptual response information | Contract invariants / notes  | Interaction mode |
|---|---|---|---|---|---|---|--- | --- |
| CC-01 / CC-02 | Resolve abstract requirements to concrete dependencies | CAT | CON | CON → CAT; response CAT → CON | SCI abstract input criteria, requested spatial/temporal scope, compatibility/quality constraints and correlation context. | Matching concrete Source/Derived Asset instances, IDs, acquisition/product identity, spatial/temporal support, quality/coverage metadata and representation availability. | CAT resolves concrete candidates against explicit criteria. SCI owns scientific thresholds; CON orchestrates selection/dependencies.  | Async |
| CC-03 | Report missing intermediate products | CAT | CON | CAT → CON | N/A as a separate request; CAT reports this condition in the dependency-resolution outcome. | Missing intermediate product identity, required scope/parameters and dependency context. | CAT reports missing products; CON asks SCI for requirements and orchestrates their generation. CAT does not compute them.  | Async |
| CC-04 | Report missing L0 acquisitions | CAT | CON | CAT → CON | N/A as a separate request; CAT reports this condition in the dependency-resolution outcome. | Missing acquisition identity/provider/mission, tile or acquisition context, spatial/temporal support and constraints. | CAT identifies missing source acquisitions; CON orchestrates acquisition/ingestion.  | Async |
| CC-05 / CC-06 | Obtain itemized L0 acquisition costs | CAT | CON | CON → CAT; response CAT → CON | List of missing source acquisitions and provider context. | Cost per acquisition, cost unit and assumptions/limitations. | CAT reports source/provider acquisition cost. CON applies its own user-facing credit/pricing policy.  | Async |
| CC-07 / CC-08 | Request and report L0 ingestion | CAT | CON | CON → CAT; response CAT → CON | Acquisition identifiers, provider references and ingestion context. | Ingestion outcome, registered Source Asset identifiers, original representation metadata/references and diagnostics. | CAT preserves/registers original provider data. Acquisition/ingestion state is distinct from harmonization and scientific quality.  | Async |
| CC-09 / CC-10 | Resolve canonical asset references and locations | CAT | CON | CON → CAT; response CAT → CON | Logical asset/representation IDs. | Canonical asset and representation references, current locations, metadata needed for authorized processing/delivery. | Logical IDs are not physical paths. CAT is authority for canonical asset/representation references and current location.  | Sync |
| CC-11 / CC-12 | Retrieve actual result lineage | CAT | CON | CON → CAT; response CAT → CON | Result/Derived Asset identifier. | Exact source and intermediate assets actually consumed, relationships and relevant registered metadata. | Actual lineage is distinct from CON's planned dependency graph.  | Sync |
| CC-13 | Resolve original Source Asset representation | CAT | CON | CON → CAT | Source Asset ID and original-provider representation selection/context. | Original representation reference/location and associated metadata. | Used before SCI harmonization. Original provider representation remains preserved and distinguishable.  | Sync |
| CC-14 | Check harmonized representation availability | CAT | CON | CON → CAT | Source Asset ID and required representation characteristics/identifiers. | Availability state for each required representation, plus metadata/location where available. | Registration and availability are separate. CON only unblocks dependent work when the required representation is actually available.  | Sync |

**Matrix baseline:** CC-02 returns the exact available assets/products that satisfy the criteria. catalogue-responsibilities.md §3 states that CAT matches concrete metadata against SCI's compatibility constraints and returns the exact source/product instances satisfying them. CON owns recursive dependency planning/orchestration; CAT does not orchestrate missing product generation.

## 6.2 CAT-owned registration interface consumed by SCI

| Interaction ID | Operation / purpose | Interface owner | Consumer | Direction | Conceptual request information | Conceptual response information | Contract invariants / notes  | Interaction mode |
|---|---|---|---|---|---|---|--- | --- |
| SC-01 / SC-02 | Register a Derived Asset and confirm registration | CAT | SCI | SCI → CAT; response CAT → SCI | New output metadata, initial object reference/location, product identity, method/version metadata, parameters/scope/period, quality metadata and exact input asset references actually consumed. | Registration outcome, canonical logical asset ID and registration diagnostics. | CAT registers the Derived Asset and actual lineage. SCI remains owner of scientific meaning/method; CAT owns registration and canonical asset identity.  | Sync |
| SC-03 / SC-04 | Register harmonized representations against an existing Source Asset and confirm | CAT | SCI | SCI → CAT; response CAT → SCI | Existing Source Asset ID, generated representation metadata, object reference/location, harmonization method/version and quality/coverage metadata. | Registration outcome and representation identifiers/registration diagnostics. | This adds representations to an existing Source Asset. It does not create a Derived Asset.  | Sync |

### 6.3 Metadata responsibilities

CAT stores and returns metadata associated with concrete registered assets and representations. This includes scientific metadata supplied by SCI when registering a computed product or harmonized representation. Product Definitions themselves remain owned by SCI and are exposed to GAT through GS-01/GS-02.

Responsibility is split as follows:

| Metadata category | Semantic authority / producer | Storage and retrieval responsibility |
|---|---|---|
| Product definition and scientific meaning | SCI | SCI Product Catalogue; CAT may store/index a metadata snapshot when attached to a concrete asset. |
| Method and product-definition version actually used | SCI / computation provenance | SCI supplies it; CAT stores it with the registered result asset; CON retrieves/assembles it for request/result views. |
| Scientific parameters, assumptions and limitations | SCI | SCI supplies; CAT stores with the asset/result metadata where applicable. |
| Scientific validation status/reference for the product | SCI product lifecycle | SCI defines; public catalogue exposes it through GS-01/GS-02. CAT may retain/index associated metadata with an asset snapshot. |
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
| CON | GAT | GC-02..GC-09; GC-14 | Request/proposal lifecycle, confirmation, authorization, credits, cancellation and delivery orchestration. |
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

| Interface family | Logical mode | Included interactions / behavior | Open implementation detail |
|---|---|---|---|
| UI ↔ GAT | Mixed, fixed per interaction | **Async:** UI-05, UI-13, UI-14, UI-21. **Sync:** other UI↔GAT operations and responses. Proposal preparation and delivery are asynchronous from the start. | REST resource shape, routes, status vocabulary and error envelope. |
| GAT ↔ CON | Mixed, fixed per interaction | **Async:** GC-02/GC-02-R, GC-08, GC-09. **Sync:** GC-03, GC-04/04-R, GC-05/05-R, GC-06/06-R, GC-07/07-R and GC-14/14-R. | Internal transport, delivery resource read semantics and timeout/retry details. |
| GAT ↔ SCI | Sync | GS-01/GS-02 for scientific catalogue and theoretical input requirements. | Internal transport and catalogue caching/version freshness. |
| CON ↔ SCI | Async | CS-01/02 feasibility and input requirements; CS-03/04 complexity estimate; CS-05/06 computation; CS-07/08 harmonization. All return correlated outcomes later. | Dispatch protocol, acknowledgements, durability, idempotency and recovery. |
| CON ↔ CAT | Mixed, fixed per interaction | **Async:** CC-01/02 (including CC-03/04 outcome details), CC-05/06 acquisition-cost estimate, CC-07/08 L0 ingestion. **Sync:** CC-09/10 canonical references, CC-11/12 actual lineage, CC-13 original representation reference, CC-14 harmonized availability. | Dispatch/outcome mechanism for asynchronous operations, candidate selection semantics and recovery. |
| SCI ↔ CAT | Sync | SC-01/02 Derived Asset registration; SC-03/04 harmonized representation registration. | Idempotency and retry guarantees. |

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

## 11.1 M0 functional coverage — all interfaces are in scope

**Every logical interface family and interaction listed in the authoritative Component Interaction Matrix is in the M0 functional scope.** Every boundary must be exercised by functional tests as part of the reference journey and its failure/recovery cases. This does not require every underlying capability to use a real EO provider or scientific implementation in M0: a deterministic mock is acceptable when it preserves the interface behavior, ownership, state distinctions, error semantics and end-to-end route.

| Interface family | Interaction IDs | M0 functional expectation | Permitted M0 realization |
|---|---|---|---|
| UI ↔ GAT | UI-01, UI-02, UI-05…UI-15, UI-16…UI-24 (the IDs present in the matrix) | Public product, request, representation, lineage, credit, cancellation and delivery journeys are exercised through GAT REST. | Real UI/API boundary with deterministic synthetic data and mock-backed downstream behavior where needed. |
| GAT ↔ CON | GC-02…GC-09, GC-14 and response interactions | Request lifecycle, proposal preparation, confirmation, credit decision, access, cancellation and delivery initiation are exercised. | Deterministic CON implementation/mock with persistent demo state where required by M0. |
| GAT ↔ SCI | GS-01/GS-02 | Scientific catalogue and product descriptor lookup are exercised. | Small deterministic synthetic Product Catalogue. |
| CON ↔ SCI | CS-01…CS-08 | Feasibility, complexity estimate, computation, and harmonization boundaries and outcomes are exercised. | Deterministic SCI mock/product implementation; this is not real EO processing or scientific validation. |
| CON ↔ CAT | CC-01…CC-14 | Dependency resolution, missing-data conditions, acquisition-cost, ingestion, asset-reference, lineage and representation-availability boundaries are exercised. | Deterministic CAT mock/catalogue fixtures; provider acquisition may be simulated. |
| SCI ↔ CAT | SC-01…SC-04 | Derived Asset registration and harmonized Source Asset representation registration/confirmation are exercised. | Mock registration and metadata catalogue preserving the SCI/CAT ownership boundary. |

The M0 acceptance target is **functional coverage of each logical boundary**, not production infrastructure or real EO data for every family. Mocking a component must not remove its interface from test coverage.

At minimum, the functional scenarios exercise:
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

## 11.2 Detailed contract work scheduled for M1

M1 formalizes, versions and hardens the contracts already exercised functionally in M0. The work is grouped under [M1-E07 — Formalize Interface Contracts for Real EO Integration](https://github.com/arnaudsomville/MEOGAP/issues/123):

| Interface/contract scope | M1 ticket | Coverage |
|---|---|---|
| Product Catalogue / Product Definition and Analysis Request | [M1-E07-T01](https://github.com/arnaudsomville/MEOGAP/issues/118) | GS-01/02; public product/request input contract. |
| Result, Representation, Asset Reference and Delivery | [M1-E07-T02](https://github.com/arnaudsomville/MEOGAP/issues/119) | Result retrieval and visualization; UI-09…UI-14, UI-19…UI-21; delivery resource semantics. |
| CON–CAT source acquisition and ingestion | [M1-E07-T03](https://github.com/arnaudsomville/MEOGAP/issues/120) | CC-07/08; CON orchestrates, CAT owns acquisition/ingestion. |
| GAT–CON request lifecycle and user operations | [M1-E07-T04](https://github.com/arnaudsomville/MEOGAP/issues/124) | GC-02…GC-09 and GC-14; proposal, confirmation, credits, access, cancellation and delivery initiation. |
| CON–SCI evaluation and processing | [M1-E07-T05](https://github.com/arnaudsomville/MEOGAP/issues/125) | CS-01…CS-08 and required GS-01/02 interaction with T01. |
| CON–CAT dependency/assets and SCI–CAT registration | [M1-E07-T06](https://github.com/arnaudsomville/MEOGAP/issues/126) | CC-01…CC-06, CC-09…CC-14, SC-01…SC-04. |

These M1 tickets define contracts and their boundary tests as real EO processing is integrated. They do not defer M0 functional interface coverage.

## 11.3 Deferred implementation detail

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

- [x] Every interaction ID in the authoritative Component Interaction Matrix is represented in the inventory.
- [x] Each interface family has a clearly identified owner/provider and explicit consumer(s).
- [x] Request and response directions are explicit.
- [x] Product identifiers are not confused with product-definition version metadata; SCI resolves the version and records it as provenance.
- [x] SCI remains authority for scientific definitions and methods.
- [x] CAT stores/retrieves registered asset metadata without becoming scientific authority.
- [x] Submission prepares a proposal; confirmation checks balance, debits and launches execution.
- [x] Credit balance check and debit/admission are atomic.
- [x] SCI abstract input requirements and CAT concrete asset resolution remain distinct.
- [x] Planned dependency graph and actual lineage remain distinct.
- [x] Derived Asset registration and harmonized Source Asset representation registration remain distinct.
- [x] Registration and representation availability remain distinct.
- [x] Request state, task state, asset registration, representation availability and scientific quality remain distinct.
- [x] Product scientific validation and individual result quality remain distinct.
- [x] Public UI operations go through GAT; private result access is authorized through CON.
- [x] Download flow correctly separates CAT reference resolution from CON object retrieval/delivery.
- [x] Sync/Async classifications are fixed per interaction and separate from the unresolved internal physical transport.
- [x] Every interface family is in M0 functional-test scope; deterministic mocks are permitted without omitting boundary coverage.
- [x] Detailed contract formalization is mapped to M1-E07 child tickets #118–#120 and #124–#126.
- [x] No route, payload schema or transport is frozen prematurely.
- [x] M0 mock behavior is distinguished from planned real EO capabilities.

---

## 13. Source and reconciliation notes

The following branch documents were used as the authority and supporting context:

- `documentation/architecture/system-interactions/component-interaction-matrix.md` — logical interaction inventory and routes.
- `documentation/architecture/system-interactions/component-interaction-design.md` — interaction design rationale and sequence flows.
- `documentation/architecture/catalogue-responsibilities.md` — Product Catalogue versus Data/Asset Catalogue, registration and lineage responsibilities.
- `documentation/specifications/components/gtw.md`, `con.md`, `sci.md`, `cat.md`, `ui.md` — earlier component drafts; not authoritative where they conflict with the newer interaction design.
- `documentation/specifications/eng.md` — cross-cutting engineering requirements, including ENG-03 (five-second asynchronous API policy) and ENG-15 (trusted caller context).
- `documentation/specifications/sys.md` — system-level behavior and M0 requirements, including SYS-14a/14b (product validation record), SYS-19 (versioned definitions), SYS-24/25 (credit proposal/admission), SYS-31 (component boundaries).

The target branch sources were reopened for this revision. The Component Interaction Matrix is authoritative for interaction IDs, producers/consumers and logical routes. The Component Interaction Design note is authoritative for the refined responsibility model, request lifecycle, execution orchestration and delivery route. catalogue-responsibilities.md is authoritative for the Product Catalogue versus Data/Asset Catalogue distinction, scientific metadata storage, asset registration and actual lineage. Older component specifications are early drafts and may conflict with this refined architecture; those conflicts are not silently treated as validated decisions. This document does not prescribe routes, schemas, protocols or deployment topology.

The Component Interaction Matrix remains the authority for the set of validated logical interactions. This document defines conceptual contracts and must not silently override that matrix.
