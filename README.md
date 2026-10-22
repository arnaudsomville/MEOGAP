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

A future **Proxy Engine** will use existing products to define configurable indicators, time-based conditions, and monitoring rules. **Scientific products are valuable on their own and do not require a proxy.**

### High-level repository responsibilities

The repository is intended to support the following **logical components**. Their physical organization and implementation are defined by the repository template and future design work, not by this README.

| Component | Responsibility |
| --- | --- |
| **Core / Product Engine** | Discover and use source observations; compute scientific products; manage dependencies, quality information, and spatial/temporal analysis. |
| **Backend / API** | Manage analysis requests, their status and results, and expose stable REST access for the UI and external consumers. |
| **Frontend** | Provide an interactive map, product/AOI selection, a Requests view, and spatial and temporal exploration of results. |
| **Execution layer** | Run potentially long calculations and report their progress; dedicated workers can be introduced as needed. |
| **Proxy Engine (future)** | Combine existing products into user-configured monitoring indicators and rules. |

Scientific calculations should remain independent of the user interface. Spatial harmonization may use a common **Spatial Analysis Unit (SAU)**, such as a pixel or grid cell; H3 is a possible approach, not a fixed requirement. Aggregation for analysis must not be confused with the native resolution of the underlying observations.

### Intended analysis workflow

1. Select a scientific product, an area of interest (AOI), and a time range.
2. Submit an **analysis request**. The system reuses an available result or performs the necessary processing.
3. Follow the request in the **Requests** view, where its current status and available results are visible.
4. Select a successful request and choose **Display on map**.
5. Explore the result geographically and over time, including values or time series for an AOI or a selectable spatial unit.

Missing observations, cloud-masked measurements, and valid zero values must remain distinguishable. **REST is the stable interface** for requesting and retrieving the current state. Automatic UI notifications are a possible later enhancement; NATS is a candidate technology, not a prerequisite for the first MVP.

### Boundaries and direction

Potential areas of exploration include nighttime lights, vegetation dynamics, land surface temperature, water conditions, and combinations of environmental indicators. **No single use case is a mandatory destination.** The Product Engine comes first; configurable proxies and more advanced integrations can follow when useful.

MEOGAP is **not intended initially** to be a commercial SaaS, a planetary-scale processing service, or a validated operational monitoring system. Scientific results should retain their assumptions, provenance, quality limitations, and validation status.

For more detailed context, see `documentation/project_definition.md`. Agent-specific guidance belongs in `AGENTS.md` and the documentation under `agents/`.

### Implemented projects

| Project | Role | Runtime |
| --- | --- | --- |
| `meogap_core` | Scientific core library (products, dependencies, quality, spatial/temporal analysis). No Docker image. | Python 3.11 |
| `meogap_api` | REST backend, request lifecycle and result access. | Python 3.11 / FastAPI |
| `meogap_worker` | Background execution worker depending on the core. | Python 3.11 |
| `meogap_ui` | React frontend (map, AOI selection, Requests view). | Node.js / React / Vite |

`meogap_api` and `meogap_worker` depend on `meogap_core` through a local `uv` path source. Python projects keep their unit tests under `tests/unit/`; the UI keeps its tests under `tests/`.

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

Run tests for all projects, one by one:

```bash
make tests-all
```

Run tests only for modified projects:

```bash
make test-modified-projects
```

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

Run code quality hooks only for modified projects:

```bash
make code-quality-modified-projects
```

### Development shell

Open a shell with the project's virtual environment activated:

```bash
make shell <project>
```

### Modified-project helpers

List projects modified compared with the base branch:

```bash
make list-modified-projects
```

Override the comparison base branch when needed:

```bash
make list-modified-projects TARGET_BASE_BRANCH=origin/main
```

The same override is supported by other modified-project helpers:

```bash
make install-modified-projects TARGET_BASE_BRANCH=origin/main
make test-modified-projects TARGET_BASE_BRANCH=origin/main
make code-quality-modified-projects TARGET_BASE_BRANCH=origin/main
```

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

Build all images and run the full stack (API, worker and UI):

```bash
make run-meogap
```

This decrypts the build secrets, builds all images, starts the stack and prints the service URLs:

- UI: `http://localhost:8080` (proxies `/api` to the API container)
- API: `http://localhost:8000`
- API documentation: `http://localhost:8000/docs`
- API health: `http://localhost:8000/api/v1/health`

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
