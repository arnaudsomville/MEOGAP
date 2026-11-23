# MEOGAP

**Modular Earth Observation & Geospatial Analytics Platform**

MEOGAP is a **personal learning and scientific exploration project**. Its primary goal is to deepen my understanding of **Earth observation and remote sensing** by working directly with open satellite data, reproducing scientific methods, and progressively developing reusable geospatial products.

The platform is a means to explore and learn, not a commercial product. Its direction is deliberately open: new scientific questions can lead to new products, data sources, and analysis capabilities over time.

> **Project status:** Exploratory and evolving. The capabilities described below represent the project's intended scope, not a claim that every feature is already implemented.

## Project scope

The central idea is to build a **modular Product Engine** that transforms Earth observation data into scientific products of increasing complexity. Each new product should be understandable, documented, reusable, and, when possible, compared against published methods or reference datasets.

### Scientific processing levels

MEOGAP uses an **internal** processing hierarchy to express how products build on one another:

| Level | Purpose | Examples |
| --- | --- | --- |
| **L0 — Source observations** | Input data from satellite collections and other relevant sources, including data already processed by their providers. | Spectral bands, nighttime radiance, thermal measurements, quality masks. |
| **L1 — Elementary products** | Direct transformations of source observations. | NDVI, defined NDWI variants, simple radiance changes. |
| **L2 — Intermediate products** | Products combining earlier results, additional inputs, or temporal analysis. | Vegetation fraction, seasonal anomalies, emissivity estimates. |
| **L3…LN — Advanced products** | More complex scientific processing chains, potentially involving multiple data sources. | Land surface temperature retrieval and other multi-input scientific models. |

These levels describe **MEOGAP's own processing depth**; they are not the same as satellite providers' processing levels (such as Sentinel-2 L2A). Products can depend on other products, and the hierarchy may evolve as the scientific catalogue grows.

A future **Indicator Engine** will use existing products to define configurable monitoring indicators, time-based conditions, and monitoring rules. **Scientific products are valuable on their own and do not require a monitoring indicator.**

### High-level repository responsibilities

The repository is intended to support the following **logical components**. Their physical organization and implementation are defined by the repository template and future design work, not by this README.

| Component | Responsibility |
| --- | --- |
| **Core / Product Engine** | Discover and use source observations; compute scientific products; manage dependencies, quality information, and spatial/temporal analysis. |
| **Backend / API** | Manage analysis requests, their status and results, and expose stable REST access for the UI and external consumers. |
| **Frontend** | Provide an interactive map, product/AOI selection, a Requests view, and spatial and temporal exploration of results. |
| **Execution layer** | Run potentially long calculations and report their progress; dedicated workers can be introduced as needed. |
| **Indicator Engine (future)** | Combine existing products into user-configured monitoring indicators and rules. |

Scientific calculations should remain independent of the user interface. Spatial harmonization may use a common **Spatial Analysis Unit (SAU)**, such as a pixel or grid cell; H3 is a possible approach, not a fixed requirement. Aggregation for analysis must not be confused with the native resolution of the underlying observations.

### Intended analysis workflow

1. Select a scientific product, an area of interest (AOI), and a time range.
2. Submit an **analysis request**. The system reuses an available result or performs the necessary processing.
3. Follow the request in the **Requests** view, where its current status and available results are visible.
4. Select a successful request and choose **Display on map**.
5. Explore the result geographically and over time, including values or time series for an AOI or a selectable spatial unit.

Missing observations, cloud-masked measurements, and valid zero values must remain distinguishable. **REST is the stable interface** for requesting and retrieving the current state. Automatic UI notifications are a possible later enhancement; NATS is a candidate technology, not a prerequisite for the first MVP.

### Boundaries and direction

Potential areas of exploration include nighttime lights, vegetation dynamics, land surface temperature, water conditions, and combinations of environmental indicators. **No single use case is a mandatory destination.** The Product Engine comes first; configurable monitoring indicators and more advanced integrations can follow when useful.

MEOGAP is **not intended initially** to be a commercial SaaS, a planetary-scale processing service, or a validated operational monitoring system. Scientific results should retain their assumptions, provenance, quality limitations, and validation status.

For more detailed context, see `documentation/project_definition.md`. Agent-specific guidance belongs in `AGENTS.md`, `agents/REPOSITORY_RULES.md`, and the documentation under `agents/`.

### Implemented projects

| Project | Role | Runtime |
| --- | --- | --- |
| `meogap_core` | Scientific core library (products, dependencies, quality, spatial/temporal analysis). No Docker image. | Python 3.11 |
| `meogap_interfaces` | Language-neutral OpenAPI reference contracts. No executable code. | JSON |
| `gateway` | Public REST gateway (logical GAT), request lifecycle and result access. | Python 3.11 / FastAPI |
| `contract` | Internal contract, control and orchestration service (logical CON). | Python 3.11 / FastAPI |
| `scientific_processing` | Internal scientific processing service (logical SCI). | Python 3.11 / FastAPI |
| `catalog` | Internal data and asset catalogue service (logical CAT). | Python 3.11 / FastAPI |
| `meogap_worker` | Background execution worker depending on the core. | Python 3.11 |
| `meogap_ui` | React frontend (map, AOI selection, Requests view). | Node.js / React / Vite |

`gateway`, `contract`, `scientific_processing`, `catalog` and `meogap_worker` depend on `meogap_core` through a local `uv` path source. `meogap_interfaces` is data-only and is not installed. Python projects keep their unit tests under `tests/unit/` and contract tests under `tests/contract/`; the UI keeps unit tests under `tests/` and contract tests under `tests/contract/`.

Service projects (`gateway`, `contract`, `scientific_processing`, `catalog`, `meogap_worker`) follow the `core` / `infrastructure` / `application` layout, with a thin package-root `main.py` entrypoint. Shared application lifecycle and REST building blocks live in `meogap_core` (`meogap.app` and `meogap.rest`).

### Current M0 boundaries

- Business REST operations are contract-compliant `501 Not Implemented` stubs; only health is implemented.
- Internal REST contracts are provisional M0 scaffolding. The architecture leaves internal physical transports open; no NATS contracts are selected.

The transport decision is recorded as proposed, not approved, in `documentation/architecture/adr/ADR-0001-internal-transports.md`.
- Bearer authentication is an M0 presence/syntax check, not production authentication. It does not establish a verified business identity.
- The raw Bearer credential is a mock artefact only; it is not an owner identifier or an authorization decision.
- Shared REST/application infrastructure currently lives in `meogap_core` as a pragmatic M0 foundation. This is accepted for now; extracting it would require a concrete architectural benefit and a separate decision.
- A minimal Gateway catalogue response and the corresponding UI catalogue/map slice are deferred until the Product, Request and Result schemas are approved (M1-E07 contract tickets).

---

## Quick setup

Minimal commands to get started.

### 1. Install development tooling

Install `uv`, `sops`, `age`, `hadolint`, and the pre-commit hooks:

```bash
make install-dev-tooling
```

The frontend requires **Node.js ≥ 20** and **npm**. Once Node is available, `make install` installs the frontend dependencies through the dedicated `install-js` recipe.

**Important:** This step only installs the tools required to work with the repository. Decrypting secrets requires the appropriate SOPS age key, which must be added manually to:

```text
~/.config/sops/age/keys.txt
```

Never commit decrypted secrets or private keys to the repository.

### 2. Install project dependencies

List the available projects:

```bash
make list-projects
```

Install dependencies for a single project:

```bash
make install <project>
```

Install dependencies only for modified projects:

```bash
make install-modified-projects
```

Install dependencies for all projects:

```bash
make install
```

Contract projects are data-only; `make install meogap_interfaces` reports that there is nothing to install.

## Project commands

The following commands operate on a specific project unless otherwise noted.

### Dependency management

Sync `pyproject.toml` and `uv.lock`:

```bash
make sync <project>
```

### Tests

Run tests for one project:

```bash
make tests <project>
```

`make tests` always runs tests **with coverage** and fails below `MIN_TEST_COVERAGE` (default `85`). The threshold
is shared by every language and can be overridden per run:

```bash
make tests meogap_ui MIN_TEST_COVERAGE=90
```

The language is detected from the project manifest:

| Manifest | Language | Test command | Coverage artifact |
| --- | --- | --- | --- |
| `pyproject.toml` | Python | `pytest --cov=src --cov-fail-under` | `coverage.xml` |
| `package.json` | Node / React | `npm run test:coverage` | `coverage/cobertura-coverage.xml` |
| `rest/` directory | Contracts | `openapi-spec-validator` | none |

Node projects must expose a `test:coverage` script. The frontend stack is Vitest + React Testing Library + jsdom,
with V8 coverage; see `agents/UNIT_TEST_GUIDE.md` §18.

Run tests for all projects, one by one:

```bash
make tests-all
```

Run tests only for modified projects:

```bash
make test-modified-projects
```

Run contract tests for one project, every component, or the affected projects:

```bash
make test-contract <project>
make test-contract-all
make test-contract-modified-projects
```

Contract projects (`projects/meogap_interfaces`) are validated as OpenAPI documents. Service and UI contract tests compare their live surface with the committed reference. See `projects/meogap_interfaces/README.md`.

Contracts are resolved through `projects/meogap_interfaces/contracts.json`. Each service declares its provider in `[tool.meogap.contracts]`; the UI declares `meogapContracts.provider` in `package.json`. Tests resolve the same manifest without relying on the current working directory.

For the UI, `npm test` runs unit and contract tests, `npm run test:unit` runs only unit tests, and `npm run test:contract` runs only the contract-conformance suite.

### Code quality

Run all code quality hooks for one project:

```bash
make code-quality <project>
```

Run an individual quality hook:

```bash
make code-quality-format <project>
make code-quality-lint <project>
make code-quality-type <project>
make code-quality-dockerfile <project>
make code-quality-test-files <project>
```

Run code quality hooks only for affected projects:

```bash
make code-quality-modified-projects
```

### Development shell

Open a shell with the project's virtual environment activated:

```bash
make shell <project>
```

### Affected-project helpers

List projects modified compared with the base branch:

```bash
make list-modified-projects
```

List projects that must be validated, including dependents and root-change fan-out:

```bash
make list-affected-projects
```

Run the complete CI sequence (install, quality, tests) for affected projects, or for every project on a tag:

```bash
make ci-modified-projects
make ci-all
```

Override the comparison base branch when needed:

```bash
make list-affected-projects TARGET_BASE_BRANCH=origin/main
```

The same override is supported by the affected-project helpers:

```bash
make install-modified-projects TARGET_BASE_BRANCH=origin/main
make test-modified-projects TARGET_BASE_BRANCH=origin/main
make code-quality-modified-projects TARGET_BASE_BRANCH=origin/main
make ci-modified-projects TARGET_BASE_BRANCH=origin/main
```

## Project templates

Reference projects live in `project_templates/`:

| Template | Stack | Tests |
| --- | --- | --- |
| `dummy_project` | Python / FastAPI | pytest |
| `dummy_project_with_local_dependancy` | Python with a local dependency | pytest |
| `dummy_ui_project` | React / TypeScript / Vite | Vitest + React Testing Library |

To create a project, copy the relevant template into `projects/<name>`, update the manifest name, regenerate the
lock with `make sync <name>`, then install it with `make install <name>`. Service projects must then be organized
into the `core`, `infrastructure` and `application` modules described in `agents/CODING_STANDARDS.md`.

The Makefile detects the language from the manifest or from a `rest/` directory and dispatches `make tests` to
`tests-<lang>`. A project with `rest/` is treated as `contracts`; it has no install step and is validated with
`openapi-spec-validator`. Adding another language means adding a detection branch and the matching `tests-<lang>` /
`test-parity-<lang>` targets, each applying `MIN_TEST_COVERAGE` with its own toolchain.

## Continuous integration

CI runs on every branch push and on tags. Development branches install, quality-check and test the **affected
projects** through a single entry point:

```bash
make ci-modified-projects
```

Project selection is based on the changed files:

- a project change selects that project;
- a `meogap_core` change also selects `gateway`, `contract`, `scientific_processing`, `catalog` and `meogap_worker`;
- a `meogap_interfaces` change also selects `gateway`, `contract`, `scientific_processing`, `catalog` and `meogap_ui`;
- a root code or tooling change (`Makefile`, `docker-bake.hcl`, root `Dockerfile`, `compose.yaml`, workflows,
  pre-commit configuration, …) selects every project;
- documentation, `agents/`, `project_templates/`, `.sops.yaml`, `.trivyignore` and Markdown changes do not trigger
  CI.

CI also runs `make test-contract-modified-projects` on development branches and `make test-contract-all` on the
default branch and tags before the main CI step. The default branch (for example `main`) and tags run
`make ci-all`, so every project is validated. Docker image builds and `make docker-smoke` run on the default branch
and tags; development branches do not build images.

## Open decisions

- Product catalogue, analysis request, result and delivery schemas are not yet approved. They remain explicit open decisions in the M0 contracts and are tracked by the M1-E07 contract tickets (#118, #119, #124–#126).
- Internal component transports remain unresolved. The current internal REST surfaces are provisional M0 scaffolding; see `documentation/architecture/adr/ADR-0001-internal-transports.md`.
- The authentication provider, credential format, identity claims and trusted-context representation remain open. Bearer validation is an M0 mock only.
- A minimal Gateway catalogue response and the corresponding UI catalogue/map slice are deferred until the Product, Request and Result contracts are approved.

## Notebooks

All notebooks must live inside the `notebook/` directory of their respective project. Do not create notebooks at the repository root.

## Docker images

The repository provides a shared base image at its root. Building a project image builds the base image first, followed by the project image.

Build a single project image:

```bash
make build <project>
```

Build a project image with a specific tag:

```bash
make build <project> t=<tag>
```

Build and push a project image to the registry:

```bash
make build-and-push <project> t=<tag>
```

Push an existing image to the registry (without the `_local` suffix):

```bash
make docker-push IMAGE_NAME=<project> TAG_VERSION=<tag>
```

Build all project images:

```bash
make build-all-images
```

Build, start and smoke-test the Compose stack, including every declared REST route:

```bash
make docker-smoke
```

Build all images and run the full stack (`gateway`, `contract`, `scientific_processing`, `catalog`, worker and UI):

```bash
make run-meogap
```

This decrypts the build secrets, builds all images, starts the stack and prints the service URLs:

- UI: `http://localhost:8080` (proxies `/api` to the `gateway` container)
- Gateway: `http://localhost:8000`
- Gateway documentation: `http://localhost:8000/docs`
- Gateway health: `http://localhost:8000/api/v1/health`
- Internal services: `contract`, `scientific_processing` and `catalog` are reachable only inside the Compose network.

Stop the stack with:

```bash
make stop-meogap
```

If a previous build or container is stuck, free the ports or perform a full cleanup:

```bash
make free-ports
make kill-meogap
```

`free-ports` kills the processes listening on `8000`, `8080` and `5173`. `kill-meogap` stops the stack, removes the local images and the BuildKit builder, then frees those ports. The next `make run-meogap` will rebuild the images.

Build and push all project images with the same tag:

```bash
make build-and-push-all t=<tag>
```

## Secrets

Decrypt encrypted build secrets into `build_secrets_decrypted/`:

```bash
make sops-decrypt-all
```

Encrypt local decrypted secrets back into `build_secrets/`:

```bash
make sops-encrypt-all
```

The required SOPS age key must be configured locally, as described in **Quick setup**. Keep decrypted files and private keys out of version control.

`make sops-decrypt-all` is fail-fast: a missing or invalid key stops the command with a non-zero exit code. Python
project installation and post-install hooks also require a successful decryption before using the Git SSH key.

### CI secret

CI requires a repository secret named `SOPS_AGE_KEY` containing the complete content of the local
`~/.config/sops/age/keys.txt`. The workflow writes it to the runner when it is available, then validates the
encrypted secrets with `make sops-decrypt-all`. If the key is absent or does not match the age recipient in
`.sops.yaml`, the decryption itself fails and the CI job stops with a non-zero exit code.
