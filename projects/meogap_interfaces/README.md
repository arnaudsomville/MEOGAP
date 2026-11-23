# MEOGAP Interfaces

Language-neutral reference contracts for the MEOGAP REST components.

This project contains data only. It deliberately has no Python package, no JavaScript package, no generated clients, and no executable code. The committed OpenAPI documents are the authoritative description of the HTTP surface. Each component implements that surface locally and proves it with contract tests.

## Layout

```text
projects/meogap_interfaces/
└── rest/
    ├── gat.openapi.json  # public gateway
    ├── con.openapi.json  # control and orchestration
    ├── sci.openapi.json  # scientific processing
    └── cat.openapi.json  # data and asset catalogue
```

## Rules

- The committed JSON is the source of truth for paths, methods, operation identifiers, response codes, and shared schemas.
- Do not generate Python or TypeScript models from these documents. Components define their own objects and compare them with the reference in contract tests.
- Do not move shared Python behaviour into this project. Reusable REST and authentication helpers live in `projects/meogap_core`.
- Every business operation requires a bearer token. Missing or malformed credentials produce `401` with the shared `ErrorResponse` schema.
- Health is public and returns `200`. Every other business operation returns `501` until it is implemented.
- A contract change requires updating the JSON, the implementing component, and the component's contract tests in the same change.
- Keep the shared `ErrorResponse` and `HealthResponse` schemas identical across the four documents.

## Validation

From the repository root:

```bash
make test-contract-all
make test-parity-contracts
```

`make test-contract-all` validates the OpenAPI documents and runs each component's contract tests. `make test-parity-contracts` checks that the shared schemas stay aligned across services.

The UI validates its local payload types against `gat.openapi.json` with:

```bash
cd projects/meogap_ui
npm run test:contract
```
