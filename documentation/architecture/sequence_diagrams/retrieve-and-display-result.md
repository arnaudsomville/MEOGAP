# Retrieve and Display a Result

**Status:** Validated sequence diagrams — design baseline  
**Companion documents:** [Component Interaction Design](../system-interactions/component-interaction-design.md) · [Component Interaction Matrix](../system-interactions/component-interaction-matrix.md) · [Submit Analysis Request](./submit-analysis-request.md) · [Execute Analysis](./execute-analysis.md)  
**Last updated:** 12 November 2026

## Purpose

Describe the result-retrieval paths after a product has been generated and registered in CAT:

1. Generate and display a map or analytical representation.
2. Inspect the actual lineage of a result.
3. Download the final product alone.
4. Download an on-demand archive containing the result and its actual dependencies.

These are separate user-facing operations. They share authorization and asset-discovery responsibilities but have different delivery behavior.

## 1. Visualize a result

The request is routed through CON for authorization. CON then asks CAT for the canonical product reference and current storage location, and passes the information to SCI. CON does not keep a duplicate mapping. SCI reads the stored product directly and generates the requested representation.

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant GAT
    participant CON
    participant CAT
    participant SCI
    participant S3 as Object Storage

    User->>UI: Request map or analytical representation
    UI->>GAT: Request result representation with authentication proof
    GAT->>GAT: Validate caller and derive trusted identity context
    GAT->>CON: Request access authorization with trusted identity context
    CON->>CON: Verify user permissions against trusted owner identity
    CON->>CAT: Request canonical product reference and location with request context
    CAT-->>CON: Return product reference and storage location
    CON->>SCI: Request representation with product reference, location and trusted context
    SCI->>S3: Read product object
    S3-->>SCI: Return product data
    SCI->>SCI: Generate requested representation
    SCI-->>CON: Return map or analytical representation
    CON-->>GAT: Return representation
    GAT-->>UI: Provide representation
    UI-->>User: Display result
```

## 2. Inspect actual result lineage

The displayed lineage is the actual provenance recorded by CAT for the selected result. It is not the planned execution graph held by CON.

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant GAT
    participant CON
    participant CAT

    User->>UI: Inspect result dependencies
    UI->>GAT: Request actual result lineage with authentication proof
    GAT->>GAT: Validate caller and derive trusted identity context
    GAT->>CON: Request lineage and access check with trusted identity context
    CON->>CON: Verify user permissions against trusted owner identity
    CON->>CAT: Retrieve actual result lineage with request context
    CAT-->>CON: Return actual dependency tree and asset references
    CON-->>GAT: Return lineage information
    GAT-->>UI: Provide lineage information
    UI-->>User: Display dependencies and provenance
```

Physical storage locations are not part of the user-facing lineage representation unless a separate authorized use case explicitly requires them.

## 3. Download the final product only

This operation delivers only the requested product. It does not package dependencies.

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant GAT
    participant CON
    participant CAT
    participant S3 as Object Storage

    User->>UI: Download final product
    UI->>GAT: Request final product delivery with authentication proof
    GAT->>GAT: Validate caller and derive trusted identity context
    GAT->>CON: Request final product delivery with trusted identity context
    CON->>CON: Verify user permissions against trusted owner identity
    CON->>CAT: Request canonical product reference and location with request context
    CAT-->>CON: Return product reference and storage location
    CON->>S3: Retrieve final product object
    S3-->>CON: Return product object
    CON-->>GAT: Return product delivery
    GAT-->>UI: Provide final product download
    UI-->>User: Download final product
```

The exact transfer mechanism (for example streaming through the API or secure temporary access) is not fixed by this logical sequence and belongs to interface/contract design. The physical storage location must not be exposed directly to UI.

## 4. Download the complete dependency archive

The archive is generated on demand from CAT's actual lineage and the corresponding canonical asset references and current locations. CON owns the delivery orchestration and ZIP assembly, but does not maintain a duplicate asset catalogue or storage mapping.

```mermaid
sequenceDiagram
    actor User
    participant UI
    participant GAT
    participant CON
    participant CAT
    participant S3 as Object Storage

    User->>UI: Download complete dependency archive
    UI->>GAT: Request dependency archive with authentication proof
    GAT->>GAT: Validate caller and derive trusted identity context
    GAT->>CON: Request archive delivery with trusted identity context
    CON->>CON: Verify user permissions against trusted owner identity
    CON->>CAT: Retrieve actual result lineage with request context
    CAT-->>CON: Return actual dependency tree
    CON->>CAT: Request canonical references and locations for lineage assets with request context
    CAT-->>CON: Return asset references and locations
    CON->>S3: Retrieve all required result and dependency objects
    S3-->>CON: Return requested objects
    CON->>CON: Assemble temporary ZIP archive
    CON->>S3: Store temporary archive
    S3-->>CON: Return temporary archive location
    CON-->>GAT: Return archive delivery
    GAT-->>UI: Provide archive download
    UI-->>User: Download dependency archive
```

## Validated responsibility rules

1. **CON does not maintain a duplicate product/asset catalogue.** CAT remains the single source of truth for canonical asset references, storage locations and actual lineage.
2. When CON needs a result, it queries CAT for the canonical product reference and its current storage location. This applies to visualization, final-product download and dependency-archive generation.
3. For visualization, CON performs the access check using the trusted owner identity, obtains the canonical reference and location from CAT, then passes them and the required trusted context to SCI. SCI reads the object directly from storage and generates the requested representation.
4. For lineage inspection, CON asks CAT for the actual lineage and returns the relevant provenance information through GAT. The planned execution graph is not substituted for actual lineage.
5. For final-product download, CON retrieves the reference and location from CAT and orchestrates delivery of that product alone.
6. For a dependency archive, CON requests actual lineage and the references/locations for all required assets, retrieves the objects from storage and assembles the ZIP on demand.
7. GAT is the only public REST entry point. UI does not access CAT or object storage directly.
8. Physical storage locations are internal information and are not exposed as part of the public UI contract.
9. Authenticated retrieval calls carry caller proof to GAT. GAT derives trusted identity context; CON uses the owner identity for authorization and propagates the context to CAT/SCI for audit and correlation. Credentials are not copied into logs or indiscriminately forwarded.

## Notes and boundaries

- The archive is temporary and must be subject to an expiration and cleanup policy. Exact TTL, storage and access-security details remain open.
- The sequence does not prescribe a worker topology, NATS subjects, REST routes, HTTP status codes, streaming protocol or secure-link mechanism.
- CAT may reorganize stored objects. CON must ask CAT for the current canonical location when it needs to access an asset; it must not rely on a copied storage mapping.
- The four diagrams describe separate operations. The exact user-facing endpoints and shared implementation mechanisms are deferred to interface and contract design.
