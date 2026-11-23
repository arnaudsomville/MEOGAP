# MEOGAP Interfaces

Language-neutral reference contracts for the MEOGAP REST components.

This project contains data only. It deliberately has no Python package, no JavaScript package, no generated clients, and no executable code. The committed OpenAPI documents are the authoritative description of the HTTP surface. Each component implements that surface locally and proves it with contract tests.

## Layout

```text
projects/meogap_interfaces/
├── contracts.json  # provider -> contract manifest
└── rest/
    ├── gateway.openapi.json  # public gateway (GAT)
    ├── contract.openapi.json  # contract and orchestration (CON)
    ├── scientific_processing.openapi.json  # scientific processing (SCI)
    └── catalog.openapi.json  # data and asset catalogue (CAT)
```

## Naming map

| Logical component | Provider / project | Contract |
| --- | --- | --- |
| GAT | `gateway` | `rest/gateway.openapi.json` |
| CON | `contract` | `rest/contract.openapi.json` |
| SCI | `scientific_processing` | `rest/scientific_processing.openapi.json` |
| CAT | `catalog` | `rest/catalog.openapi.json` |

## Rules

- The committed JSON is the source of truth for paths, methods, operation identifiers, response codes, and shared schemas.
- Do not generate Python or TypeScript models from these documents. Components define their own objects and compare them with the reference in contract tests.
- Do not move shared Python behaviour into this project. Reusable REST and authentication helpers live in `projects/meogap_core`.
- Every business operation requires a bearer token. Missing or malformed credentials produce `401` with the shared `ErrorResponse` schema.
- Health is public and returns `200`. Every other business operation returns `501` until it is implemented.
- A contract change requires updating the JSON, the implementing component, and the component's contract tests in the same change.
- Keep the shared `ErrorResponse` and `HealthResponse` schemas identical across the four documents.
- Resolve contracts through `contracts.json`; do not hard-code relative paths in tests.
- Request and success response schemas that are not yet approved are explicitly marked open and MUST NOT be invented.

## Validation

From the repository root:

```bash
make test-contract-all
make test-parity-contracts
```

`make test-contract-all` validates the OpenAPI documents and runs each component's contract tests. `make test-parity-contracts` checks that the shared schemas stay aligned across services. The manifest `contracts.json` is the single provider-to-contract map; tests resolve it without assuming a working directory.

The UI validates its local payload types against `gateway.openapi.json` with:

```bash
cd projects/meogap_ui
npm run test:contract
```
