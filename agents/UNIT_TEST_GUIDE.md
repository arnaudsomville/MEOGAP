# Unit Test Guide for CLI Agent

*(Scientific / Industrial Python Code)*

## 1) Purpose
A unit test validates a **single logical unit** (function or service behavior) in isolation.

## 2) Authority and scope
- For test categories, execution defaults, and hard thresholds, follow `agents/SOFTWARE_VALIDATION_PLAN.md`.
- This guide focuses on **test design techniques** and unit-test quality standards.

## 3) Non-negotiable properties
A unit test MUST:
- Be deterministic.
- Be fast.
- Assert behavior (not implementation).
- Avoid real infrastructure (DB, network, filesystem, time, randomness).
- Be minimal but sufficient.

A unit test MUST NOT:
- Simulate full system behavior.
- Depend on real services or heavy numerical models.
- Exist only for coverage.

## 4) Performance expectations
- **Target:** < 50 ms per test case.
- **Preferred upper bound:** < 200 ms when feasible.
- **If > 200 ms:** reassess whether the test should be unit-level; reduce input size or inject fakes.
- **Hard limit:** the authoritative upper bound is defined in the SVALP (currently 250 ms).

## 5) Dependency injection via `_deps`

### Principle
All complex internal computations MUST be injectable.

### Pattern
```python
@dataclass
class _VisibilityDeps:
    compute_elevation_angle_fn: Callable = compute_elevation_angle
    min_elevation_deg_fn: Callable = min_elevation_deg
```

```python
@dataclass
class TargetsAccessComputer:
    params: TargetsAccessComputerParams
    _deps: _VisibilityDeps = field(factory=_VisibilityDeps, init=False, repr=False)

    @classmethod
    def _for_test(cls, params, deps):
        obj = cls(params=params)
        obj._deps = deps
        return obj
```

### Test example
```python
def test_access_simple_case():
    def fake_elevation(_, __):
        return [30.0]

    def fake_min(_, __):
        return 10.0

    deps = _VisibilityDeps(
        compute_elevation_angle_fn=fake_elevation,
        min_elevation_deg_fn=fake_min,
    )

    computer = TargetsAccessComputer._for_test(params=..., deps=deps)

    result = computer.compute(...)

    assert len(result) == 1
```

### Rules
- NEVER mock internal methods.
- Prefer real dependencies when the unit test remains lightweight and predictable (for example, a short
  NumericalPropagator run with a handful of dates).
- Inject dependencies only when needed to simplify the internal service, make results predictable, or reduce test
  runtime.
- Fakes must be deterministic and trivial.
- NEVER use patching/monkeypatching. If you cannot test without patching, stop and ask the user for instructions.
- If you are unsure how to inject a dependency or how to keep a unit test lightweight, stop and ask the user for
  guidance. Present the options you are considering and wait for explicit approval before proceeding.

## 6) Closed-form requirement (critical)
You MUST construct **closed-form test cases**.

Steps:
1. Simplify inputs.
2. Inject fake internal functions when needed to make the case closed-form.
3. Reduce the problem to trivial math.
4. Compute expected output analytically.

Examples:
- Angles: 0 deg, 90 deg, 180 deg.
- Identity transforms.
- Constant outputs from injected functions.
- Minimal numeric case: pick small numbers that yield an exact, non-trivial result (for example, a=2, b=3, c=5
  -> expected=7) and assert against the closed-form formula.

Only after closed-form tests: add invariant tests if needed.

## 7) Edge case selection
You MUST:
1. Identify all control-flow branches.
2. Identify domain boundaries and singularities.
3. For each **meaningful category**, write ONE test.

### Meaningful edge categories
- Threshold equality
- Empty inputs
- Sign changes
- First/last element
- Singular matrices
- Boundary crossing

**Rule:** if two edge cases trigger the same branch, test only one.

## 8) Minimal behavioral partitioning
Each unit must have:
- 1 nominal test.
- 1 test per meaningful branch.
- 1 error test (if applicable).

Before adding a test, verify:
- New branch?
- New invariant?
- Bug reproduction?

If NO, do not add.

## 9) Parametrized tests
When two or more tests share the same structure with only inputs and expected outputs changing, use a parametrized
test instead of separate functions. Example: `test_decode_without_cd` and `test_decode_with_cd` are the same shape
with different inputs; parametrize them to reduce duplication. When parametrizing, always add a short descriptive
label for each case using pytest `ids=...` so each case is self-explanatory in test output.

## 10) Test class usage
Unless explicitly requested, define tests as module-level functions. Do not add a test class wrapper (for example,
`TestOrbitFitStateVector`) unless the user asks for it.

## 11) Assertions

### Discrete values
Use `==` for:
- bool
- int
- enum

### Floating point
Use:
```python
np.testing.assert_allclose(...)
```
Never use `==` for floats.

### Vector3D equality
Use the dedicated helper for comparing `Vector3D` instances:
```python
def assert_equals(
    v1: Vector3D,
    v2: Vector3D,
    rtol: float | None = None,
    atol: float | None = None,
) -> None:
```
Import it from `tests.toolbox.assertions` and prefer it over manual component checks.
Do not use `np.allclose` on Vector3D components (even inside helper utilities); always call `assert_equals`.
If you need to compare lists of `PVT` or other structures containing Vector3D, iterate and call `assert_equals`
for each vector field.

### Invariants
Use when relevant:
- Norm preservation
- Monotonicity
- Non-negativity
- Shape/dtype

Invariants do not replace closed-form tests.

## 12) Determinism rules
Tests must NOT depend on:
- Time
- Randomness
- Filesystem
- Database
- Network

Use injected fakes.

## 13) Numerical testing strategy
Mandatory process:
1. Simplify geometry.
2. Inject fake dependencies.
3. Compute expected analytically.
4. Assert result.
5. Add invariants if useful.

## 14) Test structure
Use Arrange-Act-Assert:

```python
# Arrange
deps = ...
computer = ...

# Act
result = ...

# Assert
assert ...
```

Keep inputs small, naming clear, and assertions minimal.

## 15) When NOT to write a unit test
Do NOT write a unit test if it:
- Requires real propagation.
- Needs heavy computation.
- Uses real infrastructure.
- Focuses primarily on performance.

Use integration, validation, or benchmark tests instead.

## 16) Final quality standard
A valid unit test is:
- Deterministic
- Fast (per SVALP limits)
- Minimal
- Closed-form predictable
- Behavior-focused
- Dependency-injected
- Numerically sound

Stop when all meaningful behaviors are covered. Do not over-test.

## 17) Test helpers and dummies

### Motivation
When the same class is instantiated with many keyword arguments across multiple test functions or files,
every constructor signature change forces mass edits. Centralising construction in helpers and dummies:
- reduces noise in individual tests — only the parameter under test is visible;
- makes intent explicit: an unspecified parameter means "I don't care about this value";
- limits blast radius when a signature changes to a single edit in one file.

### Where to put them: the `tests/toolbox/` tree
All helpers and dummies live under `tests/toolbox/`, **mirroring `src/fds/` exactly**. Given any class in
`src/fds/`, the corresponding toolbox module is found by replacing the prefix:

```
src/fds/orbit/propagation/numerical.py
→ tests/toolbox/orbit/propagation/numerical.py
```

This makes it trivial to check whether a helper already exists before writing a new one.

### Fresh objects, not shared test globals
Do not store reusable constructed test objects in module-level globals such as `_BASE_PARAMS`, even when the object
looks immutable today. If another test starts reusing that global later, it creates hidden coupling between tests
and makes failures harder to debug.

**Rule:** prefer a small helper such as `make_orbit_determination_params()` that returns a fresh object on each
call. Apply the same rule to any non-trivial test input, params object, or service dependency.

---

### Rule A — Factory helpers (`make_*`)

Use for plain dataclasses, `*Params` objects, and other value types that have no overridable behaviour.

**Naming:** `make_<snake_class_name>` (e.g. `make_numerical_propagator_params`).

**Signature:** all parameters are keyword-only with sensible defaults. The caller overrides only what matters.

```python
# tests/toolbox/orbit/propagation/numerical.py
def make_numerical_propagator_params(
    *,
    gravity_order: int = 8,
    atol: float = 1e-9,
    rtol: float = 1e-9,
    cd: float = 2.2,
    cr: float = 1.5,
    cross_section: float = 1.0,
    mass: float = 100.0,
) -> NumericalPropagatorParams:
    return NumericalPropagatorParams(
        gravity_order=gravity_order, atol=atol, rtol=rtol,
        cd=cd, cr=cr, cross_section=cross_section, mass=mass,
    )
```

In the test, only the relevant parameter appears — intent is immediately clear:

```python
def test_higher_gravity_order_improves_accuracy():
    params = make_numerical_propagator_params(gravity_order=20)
    ...
```

---

### Rule B — Parametrised dummies (`Dummy*`)

Use when the class has behaviour (methods) that tests want to stub or simplify.

**Naming:** `Dummy<ClassName>` (e.g. `DummyNumericalPropagator`).

**Design constraints:**
- `DummyNumericalPropagator()` — zero arguments, always works, always fast and deterministic.
- Behaviour variants are keyword arguments with defaults.
- Never read external files or call real compute kernels.
- Two tests that need the same class to behave differently use the same dummy with different arguments — do
  not create multiple dummy classes for the same base class.

```python
# tests/toolbox/orbit/propagation/numerical.py
@dataclass
class DummyNumericalPropagator(NumericalPropagator):
    """Trivial propagator for tests.

    Args:
    ----
        frozen_pvt(PVT | None): when set, every propagate() call returns this PVT regardless of date.
            Defaults to None (returns a cheap analytic default PVT).
    """
    frozen_pvt: PVT | None = None

    def propagate(self, date: datetime) -> PVT:
        if self.frozen_pvt is not None:
            return self.frozen_pvt
        return _CHEAP_DEFAULT_PVT  # module-level constant, analytically defined
```

```python
# Test A — doesn't care what the propagator returns
prop = DummyNumericalPropagator()

# Test B — needs a frozen orbit
prop = DummyNumericalPropagator(frozen_pvt=FROZEN_ORBIT_PVT)
```

---

### When to create a helper vs a dummy

| Situation | Create |
|---|---|
| Plain dataclass / Params / value object | `make_*` factory helper |
| Class with methods tests want to stub | `Dummy*` subclass |
| Both apply | Both, in the same toolbox module |

---

## 18) Frontend unit and component tests (TypeScript/React)

### Scope
Frontend tests in this repository are **unit and component tests**. Browser end-to-end tests belong to a
separate validation activity and are not part of the default `make tests` workflow.

### Stack
- **Runner:** Vitest.
- **DOM:** jsdom.
- **Component testing:** React Testing Library, `@testing-library/user-event`.
- **Assertions:** Vitest `expect` extended by `@testing-library/jest-dom`.
- **Coverage:** V8 provider via `@vitest/coverage-v8`.

Do not introduce a second runner (for example Jest) without an explicit decision, because Vitest reuses the Vite
configuration (plugins, TypeScript, ESM) and keeps the template consistent.

### Location and naming
- Source modules live under `src/`.
- Test modules live under `tests/` and mirror the source area:
  - `src/App.tsx` -> `tests/App.test.tsx`
  - `src/api/client.ts` -> `tests/api/client.test.ts`
- The shared setup file is `tests/setup.ts` and is referenced from the test configuration.
- `src/main.tsx` (bootstrap), `*.d.ts` files and barrel modules (`index.ts`) do not require a dedicated test file.

`make code-quality-test-files <project>` checks this parity for every `src/**/*.ts(x)` module. Missing files are
reported as **non-blocking warnings**, mirroring the Python heuristic.

### Design rules
- Assert **observable behavior**, not component internals or hook implementation details.
- Query by role, accessible name, label or visible text; use `data-testid` only when no accessible query exists.
- Prefer `userEvent` over `fireEvent` to exercise realistic interactions.
- Keep tests deterministic: no real network, no real timers, no shared mutable module state.
- Mock **at the boundary**: stub `fetch` with `vi.stubGlobal` and always restore globals in `afterEach`
  (`vi.unstubAllGlobals()`). Do not mock internal components or hooks.
- A snapshot test must never be the only assertion for a behavior.
- Cover the nominal path, each meaningful branch (including error and unmount paths), and accessible states.

### Coverage and thresholds
- Run coverage with `npm run test:coverage` inside the project.
- `make tests <project>` runs `test:coverage` for Node projects and forwards `MIN_TEST_COVERAGE` (single threshold
  shared with Python; default `85` for lines, functions, branches and statements).
- The coverage artifact is written to `coverage/` (`cobertura-coverage.xml`, `lcov.info`).
- Do not degrade coverage without explicit approval, consistent with `agents/SOFTWARE_VALIDATION_PLAN.md`.

### Adding another language
`make tests` and `make code-quality-test-files` dispatch to `tests-<lang>` and `test-parity-<lang>` targets
detected from the project manifest. To introduce a language (for example Rust), add a detection branch and the
corresponding targets. Each language adapter is responsible for applying `MIN_TEST_COVERAGE` with its own
toolchain and producing a per-project coverage artifact.

## 19) Test tags

Every test MUST declare at least one tag. Tags make suites filterable and keep the category of each test
explicit. Allowed tags are:

| Tag | Meaning |
| --- | --- |
| `unit` | Isolated logic, exceptions and edge cases. |
| `contract` | Component boundaries against committed contracts. |
| `functional` | Complete user-visible behavior. |
| `integration` | Interactions with real infrastructure. |
| `validation` | Comparison with external reference data. |
| `benchmark` | Performance or resource measurements. |
| `regression` | Behavior frozen against stored references. |

### Python

Set the module-level marker once per test module:

```python
import pytest

pytestmark = pytest.mark.unit
```

Use `pytestmark = pytest.mark.contract` for contract tests. A module or test may declare several tags with a
list. The shared `meogap.test_utilities.pytest_plugin` plugin is enabled through `addopts` in every Python
project and fails collection when a test has no allowed tag.

### TypeScript / React

Pass the tag as test options:

```ts
it('returns the health payload', { tags: ['unit'] }, async () => {
  // ...
})
```

Tags are declared in `projects/meogap_ui/vite.config.ts`; `strictTags` rejects unknown tag names. Use
`{ tags: ['contract'] }` for tests that validate local objects against the reference contract.
