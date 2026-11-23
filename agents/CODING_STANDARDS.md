# Coding Standards

## Scope
This document defines coding rules and best practices for this repository. It complements
`agents/SOFTWARE_VALIDATION_PLAN.md` (testing policy) and `agents/UNIT_TEST_GUIDE.md`
(unit-test techniques).

## Goals
- Improve readability and consistency across modules.
- Reduce bugs by favoring typed, explicit structures.
- Make behavior configurable and avoid hidden "magic values".

## Naming conventions

### Module and file names
Python module and file names must be a **single word** (no underscores as word separators).

**Rule:** choose a concise, descriptive single word. If you feel you need two words, reconsider the scope of the
module — it may be doing too much, or a simpler name may already exist.

| Bad | Good |
|---|---|
| `od_service.py` | `service.py` |
| `ground_track.py` | `groundtrack.py` |
| `orbit_fit.py` | `fit.py` |

## General rules

### 1) Avoid hard-coded strings inside functions
Hard-coded strings inside function bodies create duplication and make changes error-prone.

**Rule:** when a string is reused, has meaning (identifier, key, status, event name, error code/message template),
or may evolve, define it once at class/module level and reference it.

- Prefer class constants for class-specific concerns.
- Prefer module constants for cross-class shared concerns.
- Use **UPPERCASE** names for constants.

**Example (class constant):**
```python
from dataclasses import dataclass

@dataclass(frozen=True)
class Downloader:
    STATUS_READY: str = 'READY'
    STATUS_FAILED: str = 'FAILED'

    def is_ready(self, status: str) -> bool:
        return status == self.STATUS_READY
```

### 2) Keep implementations minimal
Favor the simplest structure that clearly solves the problem.

**Rule:** avoid unnecessary annotations, `field()` wrappers, type aliases, and boilerplate. Use plain annotations
(`x: int`) unless a `field()` option is actually needed. Add comments, docstrings, and type hints only when they
provide value beyond what the code already makes clear.

### 3) Use postponed evaluation of annotations when needed
Use `from __future__ import annotations` when a module contains forward references and you want to avoid quoting
types (for example, references to classes defined later in the file, self-referential types, or circular type
dependencies). If no forward references exist (or all are already quoted), do not add the import. When used, it
must appear at the top of the module, immediately after the module docstring and before any other imports.

### 4) Inline comments for readability
Inline comments are expected roughly every ~5 lines of code to help readers follow intent.

**Rule:** use a short inline comment to summarize each logical block of lines (not every single line).

### 5) Docstring format and expectations
Docstrings must follow the format used across the codebase.

**Rule:** use the Args/Returns sections with dashed separators as shown below.

**Example:**
```python
def get_closest_tle_s3(date: datetime, fs: fsspec.AbstractFileSystem | None = None) -> TLEParameters:
    """Retrieve the closest TLE to a given date.

    Args:
    ----
        date(datetime): date for which we want the closest TLE.
        fs(fsspec.AbstractFileSystem | None): filesystem to read TLEs from.

    Returns:
    -------
        latest_tle_fetched(TLEParameters): closest TLE parameters to the given date.

    """
    ...
```

**Tests:** when coding a test, add a docstring that clearly explains the scope, what it tests, and how.

### 6) Thread safety is mandatory
Thread safety is a default requirement in this repository. Do not introduce code whose correctness depends on
shared mutable state, mutation of reusable configuration objects, or helper patterns with unclear concurrency
guarantees.

**Rule:** prefer fresh object construction, explicit local state, and immutable-style data flow. If the only viable
implementation is not thread safe for a specific reason, stop and ask the user for explicit confirmation before
writing it.

## Testing structure and naming

### Python
Every Python test module MUST declare at least one pytest tag through `pytestmark` (`unit`, `contract`, ...).
The shared plugin `meogap.test_utilities.pytest_plugin` fails collection when a test has no tag. See
`agents/UNIT_TEST_GUIDE.md` §19.

Every Python module under a project's `src/` must have a matching test module under `tests/unit` with the same
relative path and a `test_` prefix (for example, `src/product/ndvi.py` -> `tests/unit/product/test_ndvi.py` when
the project layout mirrors it). Keep source and test trees aligned where practical so it is immediately obvious
where each behavior is tested. `__init__.py` modules do not require a dedicated test.

### TypeScript / React
Every Vitest test MUST pass a `{ tags: [...] }` option (`unit`, `contract`, ...), and tags must be declared in
`vite.config.ts` with `strictTags`. See `agents/UNIT_TEST_GUIDE.md` §19.

Component and module tests live under `tests/` and mirror `src/` (`src/App.tsx` -> `tests/App.test.tsx`,
`src/api/client.ts` -> `tests/api/client.test.ts`). Bootstrap (`main.tsx`), declaration files and barrel modules
are exempt. See `agents/UNIT_TEST_GUIDE.md` §18.

### Interface contracts
- REST contracts live in `projects/meogap_interfaces/rest/` as language-neutral OpenAPI JSON. They are reference
  documents, not importable packages.
- Do not generate Python or TypeScript models from the contracts. Define the objects locally in the component and
  compare them with the reference in `tests/contract/`.
- Shared REST models, routers and bearer authentication belong in `projects/meogap_core` and are imported by
  services. Do not duplicate them per service.
- Contract tests MUST cover the operation set, the `401` unauthenticated response, the `501` authenticated
  response, shared-schema field parity and a negative drift case.
- A contract change is incomplete until the reference document, the implementation and the contract tests agree.
  See `agents/REPOSITORY_RULES.md` § **“Interface contracts and generated code”**.

### Service project structure
- Every project that exposes a service process (`meogap_gat`, `meogap_con`, `meogap_sci`, `meogap_cat`,
  `meogap_worker`) MUST organize its package into three main modules:
  - `core/`: business logic and domain models;
  - `infrastructure/`: concrete outbound interfaces and adapters;
  - `application/`: application layer, lifecycle subclass and inbound interfaces.
- The package-root `main.py` stays a thin process entrypoint. It MUST NOT contain business logic or infrastructure
  wiring.
- Reusable building blocks stay in `meogap_core`: `meogap.app` for application lifecycle and `meogap.rest` for HTTP
  contracts, factory, middleware and the REST interface.
- Tests SHOULD mirror these layers under `tests/unit/application/`, `tests/unit/core/` and
  `tests/unit/infrastructure/` where practical.
- Projects without a service process (`meogap_core`, `meogap_interfaces`, `meogap_ui`) are not required to use
  this three-module layout.

### Application management
- `meogap.app.base.BaseApplication` is the abstract service application. Subclasses implement `startup` and
  `shutdown` and provide a sequence of `BaseInterface` objects.
- `BaseApplication` starts every interface in its own daemon thread, handles SIGINT/SIGTERM when running in the
  main thread, and stops interfaces before running `shutdown`.
- The REST interface lives in `meogap.rest.interface.RestInterface`. Its middleware lives in
  `meogap.rest.middleware`, its factory in `meogap.rest.factory`, and its shared contracts in
  `meogap.rest.contracts`. The REST interface runs FastAPI through uvicorn in its own thread.
- Do not duplicate thread lifecycle, signal handling, `uvicorn` wiring or exception-handler registration in a
  service module. Compose a `BaseApplication` subclass from reusable interfaces instead.

## Service pattern: Params, Inputs, Response
Services are the core unit of computation. A service is the smallest independent unit of computation: it
encapsulates one algorithm or operation and exposes a clear execution entrypoint (for example, `run(...)`,
`compute(...)`). Services are intended to be testable in isolation and composable by orchestration layers.

### Strict rules for when to create dataclasses
- **Params:** introduce a `*Params` dataclass when the service has **2 or more** configuration fields. Params are
  typically provided at service instantiation time.
- **Inputs:** introduce a `*Inputs` dataclass (or `*Context`) when the service call requires **4 or more** input
  fields. Inputs are passed per execution (`run(inputs=...)`). If there are fewer than 4 inputs, prefer plain
  function arguments unless readability clearly benefits from an inputs object.
- **Response:** introduce a `*Result` / `*Response` dataclass when the service returns **2 or more** output
  elements. Avoid returning tuples or dicts as structured outputs; prefer an explicit response dataclass. If there
  is exactly one output value, returning it directly is acceptable.

**Do / Don't**
- **Do:** use a response dataclass for multiple outputs.
- **Don't:** return tuples or dicts when the output is structured.

### Params base class and validation
- All Params dataclasses **must** inherit from a shared abstract base (for example, `ParamsBase`) that defines
  `check()`.
- `ParamsBase` is responsible for validation. The goal is to fail early on invalid configuration and keep
  validation logic close to the parameter definition.
- In this codebase, `ParamsBase.__attrs_post_init__()` calls `check()` after initialization; services may also call
  `params.check()` at the start of `run()` when needed.

### Naming guidance (not overly strict)
- Prioritize clarity over rigid naming.
- Avoid redundant names when the class already provides context.
- Use `Params`, `Inputs` / `Context`, `Result` / `Response` suffixes when they add clarity; do not force them when
  unnecessary.
- Prefer consistent patterns across the codebase, but keep them proportional to complexity.

### Example A - Complex service with Params/Inputs/Result
OrbitDeterminationService orchestrates selection, fitting, tuning, and evaluation.

```python
from __future__ import annotations

from attr import dataclass, field

from fds.utils.params import ParamsBase


@dataclass
class OrbitDeterminationServiceParams(ParamsBase):
    """Params (2+ fields -> dataclass required)."""

    fit_params: OrbitFitServiceParams
    metrics_thresholds: dict[str, float] | None = None
    score_threshold: float | None = None
    tuner_params: OrbitFitTunerParams | None = None

    def check(self) -> None:
        ...


@dataclass
class OrbitDeterminationInputs:
    """Inputs (4+ fields -> dataclass required)."""

    candidate_pvt: list[PVT]
    validation_pvt: list[PVT]
    train_pvt_window: TimeInterval | None = None
    tune_params: bool = False


@dataclass
class OrbitDeterminationResult:
    """Result (multiple outputs -> dataclass required)."""

    status: OrbitDeterminationStatus
    fitted_state: OrbitFitStateVector | None = None
    params: OrbitFitServiceParams | None = None
    evaluation: OrbitFitMetricsReport | None = None
    best_initial_state: OrbitFitStateVector | None = None
    quality_reasons: list[str] = field(factory=list)
    reason: str | None = None


@dataclass
class OrbitDeterminationService:
    params: OrbitDeterminationServiceParams
    metrics_calculator: OrbitFitMetricsCalculator

    def run(self, inputs: OrbitDeterminationInputs) -> OrbitDeterminationResult:
        ...
```

### Example B - Simple service without Params/Inputs/Response dataclasses
GroundTrackComputer is simple: 2 inputs, 1 output.

```python
class GroundTrackComputer:
    def compute(self, pvt_prov: PVTProvider, dates: list[datetime]) -> GroundTrack:
        ...
```

Why no dataclasses here:
- Params: none.
- Inputs: only 2 fields (<4).
- Response: single value.

## Frontend conventions (TypeScript / React)

- **Stack:** Vite, React, TypeScript, Vitest, React Testing Library, ESLint, Prettier. Use the UI project template
  as the reference; do not introduce an alternative test runner without an explicit decision.
- **Quality entry points:** `make code-quality <project>` runs Prettier, ESLint, `tsc --noEmit`, hadolint and the
  source/test parity check.
- **Typing:** `strict` TypeScript is mandatory. Avoid `any`; prefer explicit types and `import type` for
  type-only imports.
- **Naming:** components and their files use `PascalCase` (`App.tsx`); hooks, modules and functions use
  `camelCase` (`api/client.ts`, `useHealth.ts`). Test files use `<Module>.test.ts(x)` under `tests/`.
- **Constants:** move reused identifiers, status values and user-facing strings out of JSX into module-level
  constants when they carry meaning or are reused.
- **Tests and coverage:** every Node project MUST expose a `test:coverage` script. `make tests <project>` runs it
  and forwards `MIN_TEST_COVERAGE`; coverage is written to `coverage/` (`cobertura-coverage.xml`, `lcov.info`).
- **Adding a language:** extend the `lang` detection in the `Makefile`, then implement `tests-<lang>`,
  `test-parity-<lang>` and the corresponding quality targets. Each adapter applies `MIN_TEST_COVERAGE` with its
  own toolchain.

## CVE fragility management
When addressing a vulnerability, follow this process:

0) Before starting a new case, read the current ignored vulnerabilities list and try to resolve them first (a fix
   may now be available).
1) For each vulnerability, run `uv pip tree --invert --package <my_dependency>` to inspect the dependency chain.
2) Try to upgrade **already-declared** libraries in `pyproject.toml` to resolve the vulnerability.
3) **Do not declare new dependencies** in `pyproject.toml` to fix CVEs.
4) If the vulnerability cannot be resolved:
   - Add a section to `security.md` describing the issue and rationale.
   - Ignore the vulnerability in `.github/workflows/python-app.yml`.
