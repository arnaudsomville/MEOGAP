# Component Interaction Matrix

**Status:** Validated logical interaction inventory — design baseline  
**Companion design note:** [Component Interaction Design](./component-interaction-design.md)  
**Last updated:** 12 November 2026

> This document records the logical interactions validated during the component architecture design discussion. It is an interaction inventory, not an API specification: routes, payload schemas, authentication mechanisms, protocols and implementation details remain outside its scope.

## 1. Reading the matrix

- **Producer → consumer** indicates the direction in which the interaction is initiated or information is supplied.
- A response in the reverse direction is shown as a separate row when it is a meaningful interaction.
- Synchronization mode and transport are deliberately not assigned to individual rows in this matrix. Those decisions belong to interface and contract design, because API response behavior, worker execution and internal messaging are distinct concerns.
- A component boundary represents a logical responsibility boundary. It does not imply a separate process, service, package or deployment.
- Where an interaction crosses several components, the end-to-end route is stated explicitly. An indirect route does not create a direct interface between non-adjacent components.

The component names used here are **UI**, **GAT**, **CON**, **SCI** and **CAT**. GAT is the working name used in this design discussion; the repository's older component drafts use **GTW**. Naming must be reconciled before contracts are formalized.

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

CON is authoritative for request lifecycle, proposal preparation and cost coordination, access decisions, cancellation and delivery orchestration. GAT routes public REST operations to CON.

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

GC-08 to GC-13 form a distinct **Delivery Management** family. CON orchestrates deliveries; it retrieves asset references and actual lineage from CAT and does not expose physical storage paths as public UI contracts.

| ID | Producer → Consumer | Interaction | Purpose / information |
|---|---|---|---|
| GC-08 | GAT → CON | Request final-product delivery | Request delivery of the final product file only. |
| GC-09 | GAT → CON | Request dependency-archive delivery | Request on-demand assembly of an archive containing the result and assets in its actual lineage. |
| GC-10 | GAT → CON | Retrieve delivery status | Retrieve the current state of a previously requested delivery. |
| GC-11 | CON → GAT | Return delivery status | Return whether the delivery is pending, being prepared, ready or failed. Exact status vocabulary remains to be defined. |
| GC-12 | GAT → CON | Retrieve delivery access | Request access information for a completed delivery. |
| GC-13 | CON → GAT | Provide delivery access | Return secure, time-bounded download access when the delivery is ready. |

**Validated delivery rules**

- CON owns the delivery lifecycle and coordinates ZIP creation.
- For an archive, CON asks CAT for the actual lineage and the references to the associated assets.
- CON uses the references returned by CAT to retrieve objects from the object-storage infrastructure and assemble the temporary archive.
- The archive is created on demand rather than pre-generated.
- Temporary storage, access security, expiration and cleanup policy remain to be designed.

## 4. CON ↔ SCI — Scientific evaluation and computation

SCI owns scientific product definitions and methods, scientific feasibility, input requirements and computation. It does not know which concrete product instances or acquisitions are currently available in CAT. CON coordinates dependency resolution and execution.

| ID | Producer → Consumer | Interaction | Purpose / information |
|---|---|---|---|
| CS-01 | CON → SCI | Request scientific evaluation | Request both feasibility assessment and the scientific input requirements for the requested product and parameters. |
| CS-02 | SCI → CON | Return scientific evaluation | Return feasibility, conditions or limitations, and input requirements (for example spectral bands, spatial/spectral resolution, acquisition period and quality constraints). SCI describes requirements; it does not select concrete assets. |
| CS-03 | CON → SCI | Request computation-complexity estimate | Request information about the computational effort/resources required for a product computation. |
| CS-04 | SCI → CON | Return computation-complexity estimate | Return technical complexity/resource information. CON applies its pricing policy and calculates the user-facing computation cost. |
| CS-05 | CON → SCI | Request product computation | Dispatch a computation with the product definition/version, parameters and concrete input references already resolved by CON through CAT. |
| CS-06 | SCI → CON | Return computation outcome | Report success or failure, distinguishing scientific computation failure from asset-registration failure. A successful outcome confirms that CAT registration completed; CON queries CAT separately when it needs the canonical asset reference or storage location. |

**Validated rules**

- CS-01 / CS-02 combine scientific feasibility and scientific input requirements into one logical request/response interaction. It is triggered by the submitted analysis request, not by a separate pre-submission evaluation call.
- CS-05 / CS-06 represent execution and its outcome; completion progress is not a required business notification.
- Computation progress belongs to technical observability (for example traces or a workflow visualizer), not to a mandatory SCI → CON business interaction.
- CON remains responsible for request state and cost policy.
- For a missing intermediate product, CON repeats the scientific evaluation and CAT resolution process recursively, then orchestrates its computation in dependency order.
- A computation is not considered a successfully available product until CAT has registered it and SCI has received registration confirmation. SCI reports the outcome to CON; CON does not receive or persist a duplicate canonical asset-to-location mapping.

## 5. CON ↔ CAT — Concrete dependency resolution, acquisition and asset references

CAT knows concrete source acquisitions and product assets, resolves scientific input requirements against its inventory, identifies missing data, manages L0 ingestion and records actual lineage. CON owns recursive planning and orchestration of missing scientific products.

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

**Validated rules**

1. CAT resolves scientific criteria into concrete available product/acquisition instances. SCI does not perform this matching.
2. CAT identifies missing intermediate products but does not trigger or orchestrate their generation. CON recursively plans and dispatches those computations.
3. CAT provides the acquisition cost separately for each missing L0 acquisition. CON consolidates these costs with computation costs.
4. CAT is the source of truth for the mapping from a logical asset to its canonical storage reference/location.
5. The planned execution graph owned by CON is distinct from the actual lineage recorded by CAT.
6. For archive creation, CON requests actual lineage and asset references from CAT, then retrieves the objects from storage and assembles the temporary ZIP.

## 6. SCI ↔ CAT — Registration of generated products

SCI writes computed output objects directly to the object-storage bucket. It then reports the generated asset and computation metadata to CAT. CAT registers the asset and may reorganize the stored object.

| ID | Producer → Consumer | Interaction | Purpose / information |
|---|---|---|---|
| SC-01 | SCI → CAT | Declare/register a generated product | Supply computation metadata, the initial object-storage location and the exact input asset references actually consumed. SCI has already written the result object to the bucket. |
| SC-02 | CAT → SCI | Confirm product registration | Confirm that the generated product and its actual lineage have been registered successfully. CAT remains the source of truth for the canonical asset reference and current location; CON queries CAT when those are needed. |

**Validated rules**

- SCI accesses input objects directly through references supplied to CON; there is no direct CAT → SCI input-reference exchange.
- The input references follow the route **CAT → CON → SCI**.
- SCI writes generated result objects to storage and sends metadata to CAT; CAT owns catalogue registration, actual lineage, canonical asset references and current storage locations.
- CAT may subsequently reorganize the asset in storage without changing the logical identity exposed to consumers. Consumers must ask CAT for the current location when they need to access it.
- CON must distinguish successful computation from successful asset registration. A failed registration means there is not yet a successfully registered product available for downstream execution or delivery.
- CON stores execution/task outcomes and the logical product/task identifiers from its execution plan, but does not duplicate CAT's canonical asset references or asset-to-location mapping.

## 7. GAT ↔ SCI — Public scientific catalogue only

The direct GAT ↔ SCI interface is deliberately limited to the scientific catalogue. Retrieval of private computed-result representations goes through CON for authorization.

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
| Submit an analysis request and obtain the feasibility/cost proposal | UI → GAT → CON; CON ↔ SCI; CON ↔ CAT; CON → GAT → UI (or later REST retrieval when preparation is asynchronous) |
| Submit then explicitly confirm a request | UI → GAT → CON (submission and proposal preparation); later UI → GAT → CON (confirmation) |
| Resolve a missing intermediate product | CON ↔ SCI for its requirements; CON ↔ CAT for concrete dependencies; CON recursively repeats as needed |
| Acquire missing L0 data | CON → CAT → external provider/storage; CAT → CON reports outcome |
| Execute a computation | CON → CAT for canonical input references/locations; CON → SCI with those references/locations; SCI reads object storage directly |
| Register a generated product | SCI writes result to object storage; SCI → CAT registers metadata/lineage; CAT → SCI confirms; SCI → CON reports computation/registration outcome; CON queries CAT later when it needs the canonical asset reference/location |
| View a computed result | UI → GAT → CON (authorization) → SCI (representation); result returns via CON → GAT → UI |
| Inspect actual lineage | UI → GAT → CON → CAT; lineage returns via CON → GAT → UI |
| Download final product only | UI → GAT → CON → CAT (canonical asset reference) → object storage; delivery access returns through CON → GAT → UI |
| Download result with dependency archive | UI → GAT → CON → CAT (actual lineage and asset references); CON retrieves assets from object storage and assembles a temporary archive; access returns through GAT to UI |
| Cancel a request | UI → GAT → CON; CON records cancellation and stops further orchestration, then returns the outcome through GAT to UI |

## 10. Supporting mechanisms and external infrastructure

The following elements may appear in later sequence diagrams, but are not peer logical components in this matrix:

- **Workers:** execution mechanisms for long-running ingestion, computation or archive assembly.
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

This matrix is the validated logical interaction inventory for the current component architecture design. Synchronization and communication mechanisms are deliberately not classified here; they belong to interface and contract design. The user-facing policy is that operations expected to take more than 5 seconds are exposed asynchronously, with REST remaining the source of truth for request state.
