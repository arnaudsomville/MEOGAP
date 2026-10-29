# CAT — Data Catalog Component Specification

**Status:** Proposed first draft  
**Responsibility:** Discovery, registration and availability of source and derived data assets.

## Purpose
CAT makes source observations and generated assets discoverable through stable references and metadata. It owns catalog records and asset registration/availability, while scientific meaning and calculation remain with SCI. CAT may initially be a module/library; a separate service is not assumed.

## In scope
- Cataloguing available source observations and derived assets.
- Maintaining asset identifiers, metadata, availability and storage-location references.
- Lookup of assets for a requested source/product, spatial scope and time window, subject to criteria supplied by the responsible logic.
- Registering generated assets and linking them to scientific result/provenance identifiers.
- Distinguishing registered asset availability from request status and scientific validity.
- Maintaining persistence metadata; physical object store and layout remain implementation decisions unless approved.

## Boundaries
- CAT does not calculate scientific products or define their methods.
- CAT is not a second analysis-request orchestrator.
- CAT does not decide product-level scientific validation.
- CAT does not own the public REST API. CON owns resource ownership and access-rights decisions; CAT provides asset metadata/references and applies any required access mechanism through a defined contract, without becoming the policy owner.
- Whether CAT owns physical-file lifecycle as well as catalog metadata remains open. PostgreSQL catalog metadata and S3-compatible storage (RustFS) have been proposed, but are not yet an approved implementation decision.

## Component requirements

| ID | Priority | Requirement | Target milestone | Parent SYS | Status |
|---|---|---|---|---|---|
| CAT-001 | P0 | CAT shall expose a catalog contract to discover supported source and derived assets using stable identifiers and metadata, independently of physical storage paths. | M0 deterministic fixture/demo catalog; persistence choice open | SYS-01, SYS-26, SYS-31 | Proposed |
| CAT-002 | P0 | CAT shall distinguish asset registration/availability from product support, request status and scientific validation. | M0 synthetic states; real acquisition states M1 | SYS-01, SYS-04, SYS-10, SYS-20 | Proposed |
| CAT-003 | P0 | CAT shall register a generated asset with a stable reference and link it to associated result/request identifiers without owning scientific method semantics. | M0 synthetic asset reference; real assets M1–M2 | SYS-10, SYS-26, SYS-27 | Proposed |
| CAT-004 | P1 | CAT shall maintain source/derived asset metadata, including provider/source identifiers, spatial and temporal coverage, representation references, availability and quality metadata when supplied. | M1–M2 | SYS-01, SYS-10, SYS-20, SYS-27 | Proposed |
| CAT-005 | P1 | CAT shall support lookup by source/product identity, spatial/temporal coverage and access eligibility, returning explicit availability rather than implying processing succeeded. | M1–M2 | SYS-04, SYS-12, SYS-20 | Proposed |
| CAT-006 | P1 | CAT shall maintain storage-location references and support retrieval through a storage-independent interface without exposing physical paths in the public API. | M1–M2; storage decision requires ADR | SYS-26, SYS-27, SYS-28 | Proposed |
| CAT-007 | P1 | CAT shall preserve registered asset references and metadata across application restarts once persistent catalog behavior is delivered. | M3 unless M0 architecture decision requires earlier persistence | SYS-10, SYS-12, SYS-17 | Open |
| CAT-008 | P1 | CAT shall report acquisition/asset outcomes distinctly from request lifecycle and scientific result quality. | M1–M3 | SYS-04, SYS-07, SYS-10, SYS-20 | Proposed |

## Interfaces
- Input: source/derived asset metadata and registration requests; lookup criteria from request/processing logic.
- Output: stable asset references, metadata, availability and retrieval references.
- Dependencies: SCI supplies scientific result identity/provenance links; acquisition and scientific workers register produced assets through a defined contract.
- Not specified yet: catalog schema, asset ID format, source adapter contract, storage backend, retention/deletion policy and result-to-asset association.

## Open questions
1. Does CAT own only catalog metadata, or also physical-file creation, deletion, retention and orphan cleanup?
2. Is PostgreSQL plus RustFS intended for M0, or is persistence a logical requirement pending an ADR?
3. How does CAT enforce or facilitate access to stored assets after CON has decided whether a caller is authorized?
4. Who decides that an existing asset/result is compatible with a new request?
5. How are partial acquisition, expired assets, missing objects and failed registration represented?
