# Component Interaction Matrix

**Status:** Validated logical interaction inventory — design baseline  
**Companion design note:** [Component Interaction Design](./component-interaction-design.md)  
**Last updated:** 20 November 2026

> This document records the logical interactions validated during the component architecture design discussion. It is an interaction inventory, not an API specification: routes, payload schemas, authentication mechanisms, protocols and implementation details remain outside its scope.

## 1. Reading the matrix

- **Producer → consumer** indicates the direction in which the interaction is initiated or information is supplied.
- A response in the reverse direction is shown as a separate row when it is a meaningful interaction.
- Synchronization is classified as **Sync** or **Async** in §1.2 at the interaction-family level. The classification is a logical contract decision; it does not prescribe internal transport, worker topology or messaging mechanisms.
- A component boundary represents a logical responsibility boundary. It does not imply a separate process, service, package or deployment.
- Where an interaction crosses several components, the end-to-end route is stated explicitly. An indirect route does not create a direct interface between non-adjacent components.
- Identity and correlation context are cross-cutting metadata propagated with applicable interactions, as defined in §1.1; they are not additional logical components or business interactions.

The component names used here are **UI**, **GAT**, **CON**, **SCI** and **CAT**. GAT is the working name used in this design discussion; the repository's older component drafts use **GTW**. Naming must be reconciled before contracts are formalized.

### 1.1 Cross-cutting identity and caller context (ENG-15)

Identity context accompanies interactions; it is not modelled as a standalone business operation.

- An authenticated public REST request carries proof of caller authentication. GAT validates it through the configured trust mechanism and derives a trusted caller identity and origin context. Explicitly unauthenticated bootstrap and health/readiness operations are exceptions.
- UI may provide request data, but it cannot establish the authoritative owner by sending an owner ID or identity header. GAT derives the caller identity from validated authentication proof.
- GAT passes the trusted context to CON for request, access and delivery operations. Direct GAT → SCI catalogue calls carry sufficient caller/trace context for correlation and audit, but remain limited to public scientific catalogue information.
- CON binds the authenticated subject/owner, initiating actor if distinct, calling client/origin and correlation identifiers to the persisted request. It propagates the context to SCI and CAT for the internal operations associated with that request.
- The context remains associated with deferred ingestion/computation tasks. Workers restore it when executing so asynchronous work and resulting events remain traceable to the originating request and owner.
- CON owns user-facing request/result/delivery authorization decisions. SCI and CAT use context for correlation, audit and operation attribution; they do not independently redefine ownership or make CON's access decisions.
- The validated context, not the raw external credential, is propagated by default. Credentials and secrets must not appear in logs or traces.
- Authentication provider, credential format (including whether to use a Bearer token), claims and internal context format remain open for interface/security contract design. This behavior is required by ENG-15 and supports SYS-17/SYS-18.

### 1.2 Synchronization classification

Every interaction family is classified as **Sync** or **Async**. No conditional mode is used.

- **Sync:** the interaction completes as a request/response exchange. This describes the logical contract, not a guarantee about physical latency.
- **Async:** the initiating interaction starts or submits persistent work; its business outcome is produced later and correlated with the original request/operation. The caller holds a persistent identifier and retrieves the current state/outcome through REST where the user-facing flow is involved.
- The selected mode does not prescribe REST routes, internal RPC, NATS, a worker system or another transport. Those implementation mechanisms remain open.

| Interaction family | Mode | Interactions covered | Contract behavior | Still open |
|---|---|---|---|---|
| UI ↔ GAT | Mixed, fixed per interaction | **Async:** UI-05, UI-13, UI-14 and UI-21. **Sync:** UI-01, UI-02, UI-06, UI-07, UI-08, UI-09, UI-10, UI-11, UI-12, UI-15, UI-16, UI-18, UI-19, UI-20, UI-22, UI-23 and UI-24. | UI-05 always starts asynchronous proposal preparation. Final-product delivery and dependency-archive creation are asynchronous. UI-21 represents the later delivery state/access outcome. Other listed operations are synchronous. | REST resource shape, endpoint details and status vocabulary. |
| GAT ↔ CON | Mixed, fixed per interaction | **Async:** GC-02/GC-02-R, GC-08 and GC-09. **Sync:** GC-03, GC-04/GC-04-R, GC-05/GC-05-R, GC-06/GC-06-R, GC-07/GC-07-R and GC-14/GC-14-R. | Proposal preparation and both delivery types are asynchronous. Confirmation, list/status/balance/access/cancellation operations are synchronous. Delivery state and access belong to the GC-08/GC-09 delivery resource; GC-10 through GC-13 are not separate interactions. | Internal GAT–CON transport and delivery-resource retrieval details. |
| GAT ↔ SCI | Sync | GS-01/GS-02 | Scientific catalogue and theoretical input requirements are returned in the same request/response interaction. | Internal transport, caching and catalogue freshness. |
| CON ↔ SCI | Async | CS-01/CS-02, CS-03/CS-04, CS-05/CS-06 and CS-07/CS-08 | Feasibility/input evaluation, complexity estimation, computation and harmonization all produce outcomes asynchronously. CS-01/02 and CS-03/04 are part of asynchronous proposal preparation, not synchronous internal subcalls. | Dispatch/outcome transport, acknowledgement, durability, correlation, idempotency and recovery. |
| CON ↔ CAT | Mixed, fixed per interaction | **Async:** CC-01/CC-02 (including CC-03/CC-04 details), CC-05/CC-06 and CC-07/CC-08. **Sync:** CC-09/CC-10, CC-11/CC-12, CC-13 and CC-14. | Dependency resolution, missing-acquisition cost estimation and L0 ingestion are asynchronous. Canonical-reference lookup, actual-lineage lookup, original-representation lookup and harmonized-representation availability checks are synchronous. | Dispatch/outcome mechanisms for asynchronous operations, selection semantics and recovery guarantees. |
| SCI ↔ CAT | Sync | SC-01/SC-02 and SC-03/SC-04 | Registration requests and confirmations are one synchronous logical exchange. | Idempotency, retry guarantees and physical mechanism. |

UI-21 is classified **Async** because it represents the deferred delivery-state/access outcome tied to the delivery identifier returned by GC-08 or GC-09. The current status and eventual secure access are properties of that same delivery resource; they do not create GC-10 through GC-13 interactions. A REST read of the persisted delivery resource is a synchronous retrieval mechanism, not a separate logical delivery interaction.

The classification is a logical contract decision. It does not prescribe implementation protocols, workers, messaging subjects or deployment topology.

## 2. UI ↔ GAT — User-facing REST interface

GAT is the single public REST entry point for UI. UI does not access CON, SCI, CAT or object storage directly.

| ID | Producer → Consumer | Interaction | Purpose / information |
|---|---|---|---|
| UI-01 | UI → GAT | Browse the product catalogue | Retrieve the list of products that can be requested. |
| UI-02 | UI → GAT | Retrieve a product definition | Retrieve descriptive metadata and supported parameters for a product. |
| UI-05 | UI → GAT | Submit an analysis request | Create and persist the request, then start scientific feasibility evaluation, dependency resolution and cost estimation. There is no separate pre-submission feasibility/cost operation. |
| UI-06 | UI → GAT | Confirm a proposed request | Explicitly accept the proposal and authorize execution. This is distinct from submitting the request. |
| UI-07 | UI → GAT | List analysis requests | Retrieve the requests visible to the authenticated user. |
| UI-08 | UI → GAT | Retrieve request status | Retrieve the authoritative current state of a request. |
| UI-09 | UI → GAT | Request map visualization | Request a map representation of a specific computed result. The internal route passes through CON for access control before SCI is asked for the representation. |
| UI-10 | UI → GAT | Request analytical representation | Request plots, charts or time-series representations of a specific computed result. The internal route passes through CON for access control before SCI is asked for the representation. |
| UI-11 | UI → GAT | Inspect scientific input requirements | Retrieve the theoretical input requirements associated with a product definition. This is not the same as the concrete assets selected for a particular computation. |
| UI-12 | UI → GAT | Inspect actual result lineage | Retrieve the actual dependencies used by a specific computed result. The internal route passes through CON to CAT. |
| UI-13 | UI → GAT | Download the final product | Request the final product file alone, without packaging its dependencies. |
| UI-14 | UI → GAT | Request a dependency archive | Request an on-demand archive containing the requested result and the assets in its actual lineage, including relevant intermediate products and source acquisitions. |
| UI-15 | UI → GAT | Retrieve credit balance | Retrieve the user's current credit balance. |
| UI-23 | UI → GAT | Request analysis cancellation | Ask to cancel a request in any state except `COMPLETED`. The request can be cancelled while proposal preparation is pending, while awaiting user confirmation, or during execution. |

| ID | Producer → Consumer | Interaction | Purpose / information |
|---|---|---|---|
| UI-16 | GAT → UI | Return catalogue information | Return the list and definitions of available products. |
| UI-17 | GAT → UI | Return feasibility and cost proposal | Return the feasibility decision, conditions or limitations, and cost estimate. |
| UI-18 | GAT → UI | Return request information | Return request identifiers, list data and current status. |
| UI-19 | GAT → UI | Return map or analytical representation | Return the requested representation for display. |
| UI-20 | GAT → UI | Return actual lineage | Return the concrete provenance of a computed result. |
| UI-21 | GAT → UI | Return download information | Return delivery status and, when ready, secure access to the final product or generated archive. |
| UI-22 | GAT → UI | Return credit balance | Return the current balance. |
| UI-24 | GAT → UI | Return cancellation outcome | Return whether cancellation was accepted/processed and the current request state. |

**Validated UI requirements and rules**

1. The catalogue exposes calculable product definitions and, for each definition, its scientific input requirements.
2. The UI can inspect both theoretical requirements and the actual lineage of a specific computed result. These are different views and follow different internal routes.
3. Final-product download and dependency-archive download are two distinct UI capabilities and two distinct requests.
4. The dependency archive is generated on demand. Its content is based on actual lineage, not only on the planned execution graph.
5. Submitting an analysis request starts its complete proposal-preparation path; feasibility and cost estimation are not separate pre-submission operations.
6. The user can request cancellation from any request state except `COMPLETED`. If the request is already being processed, CON coordinates stopping further work; interruption or reconciliation of already-running operations is defined in the execution flows and interface contracts.
7. REST remains the source of truth for request state. Notifications may refresh the UI, but the UI must remain functional if no notification is received.
8. The UI may overlay multiple layers. Overlay alone does not imply that the products are scientifically harmonized or directly comparable.

## 3. GAT ↔ CON — Request, access and delivery coordination

CON is authoritative for request lifecycle, proposal preparation and cost coordination, access decisions, cancellation and delivery orchestration. GAT routes public REST operations to CON with the trusted caller context established at the public boundary.

### 3.1 Request and access management

| ID | Producer → Consumer | Interaction | Purpose / information |
|---|---|---|---|
| GC-02 | GAT → CON | Submit an analysis request and start proposal preparation | Create and persist the request, then initiate scientific feasibility evaluation, dependency resolution and cost estimation. This is the start of the user journey, not a follow-up to a separate evaluation operation. |
| GC-02-R | CON → GAT | Return request/proposal information | Return the request reference and current state. Once proposal preparation is complete, return feasibility, conditions, execution proposal and estimated cost. For operations expected to exceed 5 seconds, the initial response returns the reference/state and the result is retrieved through REST. |
| GC-03 | GAT → CON | Confirm a proposed request | Record explicit user acceptance and trigger the transition to execution. This is separate from GC-02. |
| GC-04 | GAT → CON | List analysis requests | Retrieve the authenticated user's request list. |
| GC-04-R | CON → GAT | Return request list | Return the relevant request summaries. |
| GC-05 | GAT → CON | Retrieve request status | Retrieve the current authoritative state of a request. |
| GC-05-R | CON → GAT | Return request status | Return the current state and user-visible status information. |
| GC-06 | GAT → CON | Retrieve credit balance | Request the authenticated user's balance. |
| GC-06-R | CON → GAT | Return credit balance | Return the current balance. |
| GC-07 | GAT → CON | Check result-access authorization | Ask CON whether the current user may access a particular result or its representations. |
| GC-07-R | CON → GAT | Return access decision | Return the authorization outcome needed by GAT to serve or reject the request. |
| GC-14 | GAT → CON | Request analysis cancellation | Transmit the user's request to cancel an analysis request. CON owns the request lifecycle and decides/coordinates the cancellation outcome. |
| GC-14-R | CON → GAT | Return cancellation outcome | Return the cancellation result and current request state. CON must stop further orchestration; interruption or reconciliation of already-running work is specified in the execution flow and contracts. |

### 3.2 Delivery Management

GC-08 and GC-09 are the two asynchronous delivery operations. CON orchestrates delivery; it retrieves asset references and actual lineage from CAT and does not expose physical storage paths as public UI contracts. The delivery identifier returned by either operation identifies a persistent delivery resource whose state and eventual access information are exposed through UI-21. GC-10 through GC-13 are deliberately removed as separate logical interactions.

| ID | Producer → Consumer | Interaction | Purpose / information |
|---|---|---|---|
| GC-08 | GAT → CON | Request final-product delivery | Asynchronously request the final product file alone. The response provides a delivery identifier and initial state. |
| GC-09 | GAT → CON | Request dependency-archive delivery | Asynchronously request an on-demand archive containing the result and assets in its actual lineage. The response provides a delivery identifier and initial state. |

**Validated delivery rules**

- GC-08 (final product) and GC-09 (dependency archive) are asynchronous from the start and return a persistent delivery identifier plus its initial state.
- CON owns the delivery lifecycle and coordinates final-object retrieval or ZIP creation.
- For an archive, CON asks CAT for the actual lineage and the references to the associated assets.
- CON uses the references returned by CAT to retrieve objects from object storage and assemble the temporary archive.
- The archive is created on demand rather than pre-generated.
- UI-21 exposes the asynchronous delivery outcome, current state and secure access when ready through the delivery resource identified by GC-08/GC-09. GC-10 through GC-13 are not separate interactions.
- Temporary storage, access security, expiration and cleanup policy remain to be designed.

## 4. CON ↔ SCI — Scientific evaluation and computation

SCI owns scientific product definitions and methods, scientific feasibility, input requirements and computation. It does not know which concrete product instances or acquisitions are currently available in CAT. CON coordinates dependency resolution and execution. CON supplies the trusted request/caller context needed for attribution, audit and tracing; SCI does not use it to make user access-policy decisions.

| ID | Producer → Consumer | Interaction | Purpose / information |
|---|---|---|---|
| CS-01 | CON → SCI | Request scientific evaluation | Request both feasibility assessment and the scientific input requirements for the requested product and parameters. |
| CS-02 | SCI → CON | Return scientific evaluation | Return feasibility, conditions or limitations, and input requirements (for example spectral bands, spatial/spectral resolution, acquisition period and quality constraints). SCI describes requirements; it does not select concrete assets. |
| CS-03 | CON → SCI | Request computation-complexity estimate | Request information about the computational effort/resources required for a product computation. |
| CS-04 | SCI → CON | Return computation-complexity estimate | Return technical complexity/resource information. CON applies its pricing policy and calculates the user-facing computation cost. |
| CS-05 | CON → SCI | Request product computation | Dispatch a derived-product computation with the product definition/version, parameters and concrete input references already resolved by CON through CAT. |
| CS-06 | SCI → CON | Return computation outcome | Report success or failure, distinguishing scientific computation failure from asset-registration failure. A successful outcome confirms that CAT registration completed; CON queries CAT separately when it needs the canonical asset reference or storage location. |
| CS-07 | CON → SCI | Request L0 source harmonization | Request harmonization of a registered Source Asset's original provider representation. CON supplies the original representation reference and the required request/correlation context. |
| CS-08 | SCI → CON | Return L0 harmonization outcome | Report harmonization success/failure and identify the logical Source Asset and processing run. Successful completion means SCI has generated the harmonized representations and submitted them to CAT for registration; CON must verify required representation availability through CAT before unblocking dependent computations. |

**Validated rules**

- CS-01 / CS-02 combine scientific feasibility and scientific input requirements into one asynchronous interaction. It is triggered by the submitted analysis request, not by a separate pre-submission evaluation call.
- CS-01/02, CS-03/04, CS-05/06 and CS-07/08 are asynchronous interactions. Completion progress is not a required business notification.
- CS-07 / CS-08 represent source harmonization as a distinct SCI processing operation after CAT has acquired, preserved and registered the original L0 representation. CON orchestrates this operation.
- Computation progress belongs to technical observability (for example traces or a workflow visualizer), not to a mandatory SCI → CON business interaction.
- CON remains responsible for request state and cost policy.
- For a missing intermediate product, CON repeats the scientific evaluation and CAT resolution process recursively, then orchestrates its computation in dependency order.
- A computation is not considered a successfully available product until CAT has registered it and SCI has received registration confirmation. SCI reports the outcome to CON; CON does not receive or persist a duplicate canonical asset-to-location mapping.

## 5. CON ↔ CAT — Concrete dependency resolution, acquisition and asset references

CAT knows concrete source acquisitions and product assets, resolves scientific input requirements against its inventory, identifies missing data, acquires and preserves original L0 provider representations, registers Source Assets and representation references, and records actual lineage. SCI generates harmonized representations; CON owns orchestration of acquisition, harmonization and missing scientific-product generation. CON supplies trusted request/caller context for attribution, audit and tracing; CAT does not make user access-policy decisions.

| ID | Producer → Consumer | Interaction | Purpose / information |
|---|---|---|---|
| CC-01 | CON → CAT | Resolve scientific input requirements | Send the criteria returned by SCI and ask CAT to identify concrete product/acquisition instances that satisfy them. |
| CC-02 | CAT → CON | Return resolved dependencies | Return the exact available assets/products that satisfy the criteria. |
| CC-03 | CAT → CON | Report missing intermediate products | Identify required intermediate scientific products that are not available and must be generated by CON orchestration. |
| CC-04 | CAT → CON | Report missing L0 acquisitions | Identify source acquisitions that are not available and would need to be acquired/ingested. |
| CC-05 | CON → CAT | Request detailed L0 acquisition costs | Request pricing for each missing source acquisition. |
| CC-06 | CAT → CON | Return itemized L0 acquisition costs | Return a cost per missing acquisition, not only an aggregate. CON may choose how to consolidate or apply its own pricing policy. |
| CC-07 | CON → CAT | Request L0 ingestion | Ask CAT to acquire and ingest the missing source acquisitions. |
| CC-08 | CAT → CON | Return L0 ingestion outcome | Report success/failure and identify which logical L0 acquisition assets were registered. CON queries CAT separately for canonical asset references and current locations when it needs to use those assets. |
| CC-09 | CON → CAT | Resolve asset references and locations | Given a logical product/asset identifier from the request or execution plan, ask CAT for its canonical asset reference and current storage location. |
| CC-10 | CAT → CON | Return canonical asset references and locations | Return the canonical asset reference and current storage location for each requested asset. CAT remains the source of truth; CON uses the returned information for the immediate operation and does not maintain a duplicate asset catalogue or storage mapping. |
| CC-11 | CON → CAT | Request actual result lineage | Ask for the actual dependencies used by a specific generated result. |
| CC-12 | CAT → CON | Return actual result lineage | Return the exact product/acquisition instances and versions used to generate the result. |
| CC-13 | CON → CAT | Resolve original Source Asset representation | Request the canonical reference/location of the original provider representation for a Source Asset, before SCI harmonization. |
| CC-14 | CON → CAT | Check harmonized representation availability | Check whether the required harmonized product and quality representations for a Source Asset have been registered and are currently available. |

**Validated rules**

1. CAT resolves scientific criteria into concrete available product/acquisition instances. SCI does not perform this matching.
2. CAT identifies missing intermediate products but does not trigger or orchestrate their generation. CON recursively plans and dispatches those computations.
3. CAT acquires, preserves and registers the original L0 provider representation. SCI, not CAT, generates the MEOGAP-harmonized product and quality representations.
4. CON orchestrates harmonization after original Source Asset registration. CAT registers the harmonized representation references against that existing Source Asset and reports their availability.
3. CAT provides the acquisition cost separately for each missing L0 acquisition. CON consolidates these costs with computation costs.
4. CAT is the source of truth for the mapping from a logical asset to its canonical storage reference/location.
5. The planned execution graph owned by CON is distinct from the actual lineage recorded by CAT.
6. For archive creation, CON requests actual lineage and asset references from CAT, then retrieves the objects from storage and assembles the temporary ZIP.

## 6. SCI ↔ CAT — Registration of generated products and harmonized representations

SCI writes derived-product outputs and L0 harmonized representations directly to object storage. For a Derived Asset, SCI reports the generated asset, computation metadata and exact input references actually consumed to CAT. For L0 harmonization, SCI reports the generated representation references, harmonization method/version, quality-layer metadata and source representation reference. CAT registers Derived Assets with their actual lineage, or registers harmonized representations against the existing Source Asset; it does not reinterpret or generate the scientific data.

| ID | Producer → Consumer | Interaction | Purpose / information |
|---|---|---|---|
| SC-01 | SCI → CAT | Declare/register a Derived Asset | Supply computation metadata, the initial object-storage location and the exact input asset references actually consumed. SCI has already written the result object to the bucket. |
| SC-02 | CAT → SCI | Confirm Derived Asset registration | Confirm that the Derived Asset and its actual lineage have been registered successfully. CAT remains the source of truth for the canonical asset reference and current location; CON queries CAT when those are needed. |
| SC-03 | SCI → CAT | Register harmonized Source Asset representations | Supply the existing Source Asset identifier, original representation reference, harmonization method/version, generated product/quality representation references and relevant provenance/metadata. This updates the existing Source Asset; it does not create a Derived Asset. |
| SC-04 | CAT → SCI | Confirm harmonized representation registration | Confirm that the harmonized representations have been registered against the existing Source Asset and return their logical representation identifiers/status. CAT remains the source of truth for representation references and availability. |

**Validated rules**

- SCI accesses input objects directly through references and locations supplied by CON; there is no direct CAT → SCI input-reference exchange.
- For L0 harmonization, CON obtains the original Source Asset representation reference from CAT and supplies it to SCI. SCI then writes harmonized outputs and registers their references with CAT.
- Registration of harmonized representations updates the existing Source Asset and must not be modelled as creation of a Derived Asset.
- The input references follow the route **CAT → CON → SCI**.
- SCI writes generated result objects to storage and sends metadata to CAT; CAT owns catalogue registration, actual lineage, canonical asset references and current storage locations.
- CAT may subsequently reorganize the asset in storage without changing the logical identity exposed to consumers. Consumers must ask CAT for the current location when they need to access it.
- CON must distinguish successful computation from successful asset registration. A failed registration means there is not yet a successfully registered product available for downstream execution or delivery.
- CON stores execution/task outcomes and the logical product/task identifiers from its execution plan, but does not duplicate CAT's canonical asset references or asset-to-location mapping.

## 7. GAT ↔ SCI — Public scientific catalogue only

The direct GAT ↔ SCI interface is deliberately limited to the scientific catalogue. It carries caller/trace context for correlation and audit, but retrieval of private computed-result representations goes through CON for authorization.

| ID | Producer → Consumer | Interaction | Purpose / information |
|---|---|---|---|
| GS-01 | GAT → SCI | Query scientific product catalogue | Retrieve the definitions of products that are calculable and their scientific descriptive information. |
| GS-02 | SCI → GAT | Return scientific product catalogue | Return product descriptions, parameters and theoretical scientific input requirements. |

**Validated boundary**

- GAT may query SCI directly for product definitions and their theoretical requirements because this is catalogue information, not access to a user's private computed result.
- Map visualization, plots and time-series for a specific computed result do **not** use a direct GAT ↔ SCI call. They follow **GAT → CON → SCI**, then return through CON and GAT.
- Actual lineage for a specific result follows **GAT → CON → CAT**, then returns through CON and GAT.

## 8. Interfaces deliberately absent

### GAT ↔ CAT

There is no direct GAT ↔ CAT interface in the validated model. GAT is the public REST gateway; CON coordinates asset discovery for a request and delivery. UI must not receive physical storage locations or bypass CON to access CAT.

### Direct SCI ↔ CAT input resolution

There is no direct SCI → CAT interaction for transmitting scientific input criteria and no direct CAT → SCI interaction for resolving or supplying input references. The path is:

1. SCI returns scientific input requirements to CON.
2. CON submits those requirements to CAT.
3. CAT returns concrete references to CON.
4. CON passes the references to SCI as part of the computation request.
5. SCI reads the objects directly from storage.

The SCI ↔ CAT interface is limited to generated-product registration and confirmation (SC-01 / SC-02).

## 9. Cross-component routes confirmed by the matrix

| User/system need | Logical route |
|---|---|
| Browse calculable products and their theoretical input requirements | UI → GAT → SCI → GAT → UI |
| Submit an analysis request and obtain the feasibility/cost proposal | UI → GAT → CON; CON asynchronously coordinates SCI feasibility/complexity and CAT dependency/acquisition-cost operations; the proposal outcome is exposed later through the request resource and REST (UI-17). |
| Submit then explicitly confirm a request | UI → GAT → CON (submission and proposal preparation); later UI → GAT → CON (confirmation) |
| Resolve a missing intermediate product | CON ↔ SCI for its requirements; CON ↔ CAT for concrete dependencies; CON recursively repeats as needed |
| Acquire missing L0 data | CON → CAT → external provider/storage; CAT preserves and registers original Source Asset representation, then reports outcome |
| Harmonize missing L0 data | CON → CAT for original representation reference; CON → SCI for harmonization; SCI writes harmonized representations and SCI → CAT registers them against the existing Source Asset; CON checks representation availability |
| Execute a derived-product computation | CON → CAT for canonical harmonized input references/locations; CON → SCI with those references/locations; SCI reads object storage directly |
| Register a generated product | SCI writes result to object storage; SCI → CAT registers metadata/lineage; CAT → SCI confirms; SCI → CON reports computation/registration outcome; CON queries CAT later when it needs the canonical asset reference/location |
| View a computed result | UI → GAT → CON (authorization); CON → CAT for the canonical product reference and current location; CON → SCI for the representation; result returns through CON → GAT → UI |
| Inspect actual lineage | UI → GAT → CON → CAT; lineage returns via CON → GAT → UI |
| Download final product only | UI → GAT → CON (asynchronous GC-08 delivery); CON → CAT for canonical asset reference/location, then CON retrieves the object from storage. UI-21 later exposes the delivery state/access on the same delivery resource. |
| Download result with dependency archive | UI → GAT → CON (asynchronous GC-09 delivery); CON → CAT for actual lineage and canonical references/locations; CON retrieves objects and assembles a temporary archive. UI-21 later exposes state/access on the same delivery resource. |
| Cancel a request | UI → GAT → CON; CON records cancellation and stops further orchestration, then returns the outcome through GAT to UI |

## 10. Supporting mechanisms and external infrastructure

The following elements may appear in later sequence diagrams, but are not peer logical components in this matrix:

- **Workers:** execution mechanisms for long-running ingestion, computation, final-product delivery or archive assembly.
- **NATS:** candidate internal messaging infrastructure. It is not a logical component and is not part of the public UI interface.
- **Object storage (S3-compatible storage is a candidate):** external infrastructure used for input/output objects and temporary archives. No backend is selected by this matrix.
- **EO providers:** external systems queried/acquired by CAT for L0 source data.

REST remains the source of truth for request state. Notifications are optional UI refresh mechanisms. The transport, durability, acknowledgement, correlation, idempotency and recovery behavior of internal asynchronous outcomes still require contract and execution design.

## 11. Remaining design topics (not blockers for this interaction inventory)

- Exact request and delivery state vocabularies, including the proposal-preparation state and cancellation outcome semantics.
- Exact payload schemas, product/asset identifiers and stable canonical reference format.
- Computation pricing policy applied by CON to SCI complexity information.
- Reliability guarantees and transport for asynchronous computation/ingestion outcomes.
- Storage access strategy and permissions for SCI and CON.
- Temporary archive storage, access security, TTL and cleanup.
- Reconciliation of the GAT/GTW naming used by current discussion and existing drafts.
- Authentication/trust mechanism, credential format, identity claims and integrity-protected internal context format/propagation. ENG-15 defines the required behavior; concrete contract/security choices are deferred to M0-E02-T03 and any necessary ADR.

This matrix is the validated logical interaction inventory for the current component architecture design. Logical Sync/Async modes are explicitly classified in §1.2. Proposal preparation, final-product delivery, dependency-archive delivery and the identified CON↔SCI/CON↔CAT operations are asynchronous regardless of estimated duration. ENG-03's five-second threshold remains a general minimum rule for other user-facing operations. Physical transport, messaging durability, acknowledgement, correlation, idempotency and recovery remain for interface and contract design; REST remains the source of truth for request and delivery state.
