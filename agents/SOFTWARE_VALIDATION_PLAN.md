# Software Validation Plan (SVALP)

## Purpose and authority
This document defines the test architecture and execution policies. It is authoritative and uses
MUST/MUST NOT language for compliance.

## Test categories and rules

### 1) Unit tests
- **Purpose:** validate logic correctness, exceptions, numerical edge cases, and corner cases.
- **Constraints:** MUST be lightweight and fast.
- **Performance rule:** a single unit test case MUST NOT exceed 250 ms. If it does, it MUST be redesigned.
- **Coverage:** unit tests are the main driver of coverage. Target very high coverage (ideally 100% when feasible),
  but do not chase unreachable branches, defensive asserts, or impractical paths for medium-criticality code.
- **Coverage tracking:** use the existing pytest-generated coverage report file already present in the repository
  (for example, `coverage.xml`) as the single source of truth. Coverage quality MUST be preserved and MUST NOT be
  degraded without explicit approval.

### 2) Non-regression tests
- **Purpose:** act as a behavioral freeze ("code freeze") ensuring identical behavior across refactors when
  regressions are not expected.
- **Mechanism:** run a computation and compare the result against a stored reference file located in a test data
  folder.
- **Policy:**
  - If work explicitly expects **no regression**, reference files MUST NEVER be updated.
  - If regressions are explicitly expected, reference files MAY be intentionally updated.

### 3) Validation tests (external validation)
- **Definition:** run a computation and assert the result matches external reference data stored in files.
- **External data rule:** external reference files are absolute truth validated elsewhere; they MUST NEVER be
  modified or questioned.
- **Failure handling:** if a validation test fails, investigate code or assumptions; MUST NOT "fix" by editing the
  external reference file.
- **File requirement:** a validation test MUST always load external reference file(s). If there is no file, the
  validation test is invalid by design.
- **Runtime:** validation tests are allowed to be heavier than unit tests. Acceptable up to 20 seconds per test
  case; this threshold MUST be documented as configurable later.
- **Execution:** NOT part of the daily workflow; skipped by default. Can be enabled explicitly via an environment
  variable (default false): `ENABLE_VALIDATION_TESTS`.

### 4) Benchmark / performance tests
- **Definition:** run heavy computations to measure speed; verify runtime is within a threshold.
- **Runtime check only:** no reference comparisons.
- **Execution:** skipped by default; intended primarily for CI. Can be enabled locally via an environment variable
  (default false): `ENABLE_BENCHMARK_TESTS`.

## Execution defaults
- **Daily workflow:** unit + non-regression tests.
- **Skipped by default:** validation + benchmark tests (enabled only when requested via env vars).

## Reference files and taxonomy
- **Reference location:** store reference files in a test data folder (for example, `tests/data/`).
- **Markers/categories:** use clear, generic markers such as `unit`, `regression`, `validation`, `benchmark`.
- **Interpreting expectations:**
  - **No regression expected:** references MUST NOT change.
  - **Regressions expected:** references MAY be updated intentionally.
