# Repository Rules

## Purpose

This document defines repository-wide rules for language, planning hierarchy and GitHub issue authoring. It complements, and does not replace, `../AGENTS.md` (agent roles and routing), `../documentation/project_definition.md` (intended behavior), `../ROADMAP.md` (milestone, epic and ticket direction), `CODING_STANDARDS.md` (code conventions), `UNIT_TEST_GUIDE.md` (unit tests) and `SOFTWARE_VALIDATION_PLAN.md` (validation).

When rules conflict, report the conflict rather than silently inventing a policy.

## Language

All repository artifacts are written in English:

- GitHub milestones, epics and tickets, including titles and bodies;
- pull requests, commit messages and code-facing documentation;
- this document and agent-facing rules.

This consolidates the convention already stated in `../ROADMAP.md` section 3.4. Scientific references and quoted source titles retain their original language.

## Planning hierarchy

**Milestone** — A major scientific or technical capability to achieve, with demonstrable exit criteria. Milestones have no fixed deadlines. Epic and ticket counts are indicative, not commitments.

**Rolling backlog** — An open-ended container for secondary ideas. It is not a delivery milestone, has no exit criteria or due date, and carries no delivery commitment. Items may be promoted to a milestone, deferred, merged or dropped. M6 is the current instance (Minfinite).

**Epic** — A coherent workstream contributing to a milestone, grouping related development objectives. Each epic has a stable ID and title, a milestone, an objective, scope and out-of-scope boundaries, and either acceptance/exit signals (detailed epics) or non-binding candidate directions (outline epics). Epics are not implementation instructions.

**Ticket** — A bounded research, design, implementation or validation step. Tickets are indicative guidelines, not mandatory implementation instructions. Each ticket has a stable ID, a parent epic, a milestone and a planning state.

Identifiers are stable planning keys. Preserve existing milestone, epic and ticket identifiers and native GitHub relationships (milestone, parent/sub-issue, dependencies). Never renumber silently; retire removed identifiers instead.

## Ticket philosophy

Tickets guide the maintainer's personal research and supervised development. They describe what must be achieved, investigated and verified without prematurely prescribing how to implement it.

The maintainer conducts research, evaluates alternatives and makes architectural decisions together with the agent before agreeing on an implementation and testing plan.

Creating or selecting a ticket never authorizes autonomous implementation. Tickets can evolve, be split, merged, reordered or removed as the project progresses.

## Ticket format

New and refined tickets use the following sections, concisely:

1. **Context & Objective** — Why the work matters and the expected outcome.
2. **Scope / Out of Scope** — Boundaries and deferred capabilities.
3. **Research Questions** — Topics to investigate, candidate approaches and trade-offs.
4. **Open Decisions** — Choices requiring discussion and approval.
5. **Expected Deliverables** — Concrete outcomes.
6. **Acceptance Criteria & Verification** — How success will be demonstrated and tested.
7. **Dependencies & References** — Related issues and applicable requirements.
8. **Implementation Plan** — Initially `TBD`; refined together after research and approval.

Never pre-fill research findings, decisions or implementation plans as if they were already agreed. Keep uncertainty and open questions visible.

## Epic format

Detailed epics state:

- stable ID and title, milestone and objective;
- intended capability and acceptance/exit signals;
- scope and out-of-scope boundaries;
- dependencies, prerequisites and references;
- source link and planning state.

Outline epics state:

- stable ID and title, milestone and intended capability;
- non-binding candidate directions;
- prerequisites and scientific or technical guardrails;
- an explicit note that tickets are deferred.

## Milestone format

A milestone states its objective and exit demonstration, contains no fixed due date, and treats epic and ticket counts as indicative. A milestone is not complete until its exit criteria are demonstrated.

## Workflow and guardrails

The roadmap provides direction; research determines the approach; implementation requires explicit approval; tests demonstrate completion.

- Do not make arbitrary technical decisions or prematurely prescribe files, classes, libraries or architectures.
- Do not decompose work artificially to fill a ticket count.
- Do not infer scientific validation from a passing software test.
- Do not start implementation from a ticket alone.
- **Never close, reopen or change the status of a milestone, epic, ticket or issue unless the maintainer explicitly
  instructs it for the current session.** Issue closure and status transitions are produced by merging the
  corresponding pull request (for example through `Closes #...` in the PR body), not by the agent. Creating a pull
  request and linking issues does not authorize closing them or changing their planning state.
- Record assumptions, provenance, quality and limitations explicitly.

## Interface contracts and generated code

The interface contracts are language-neutral reference documents, not executable code.

- `projects/meogap_interfaces` contains only OpenAPI JSON (and future XML) documents under `rest/`. It MUST NOT
  contain Python packages, JavaScript packages, generated clients, or executable code.
- The committed OpenAPI documents are authoritative for paths, methods, operation identifiers, response codes and
  shared schemas.
- Do not generate Python or TypeScript models from these documents. Each component defines its own objects locally
  and proves they match the reference in contract tests.
- Shared Python REST, authentication and process-lifecycle behaviour belongs in `projects/meogap_core`, not in
  the contracts project. Services use `BaseApplication` and `RestInterface` for app management.
- Every service project MUST organize its package into `core/`, `infrastructure/` and `application/`, with a thin
  package-root `main.py` entrypoint.
- A contract change MUST update the reference document, the implementing component and its contract tests in the
  same change. Divergence between the implementation and the reference MUST fail CI.
- Keep the shared `ErrorResponse` and `HealthResponse` schemas identical across the service contracts.
- Business operations require a bearer token and return `501` until implemented. Health is public and returns
  `200`.
- The `Makefile` treats a project with a `rest/` directory as a `contracts` project and exposes
  `make test-contract <project>`, `make test-contract-all` and `make test-contract-modified-projects`.

See `../projects/meogap_interfaces/README.md` for the layout and validation commands.

## Applicability and migration

This format applies to all new milestones, epics and tickets, and to tickets when they are refined. The existing M0–M4 ticket bodies are preserved; migrate them opportunistically when a ticket is refined, unless the maintainer explicitly requests a bulk migration. Existing identifiers and native relationships are never changed by a format migration.

## Reference papers and copyright

Do not commit PDFs or full-text copyrighted papers to the repository.

Every cited paper must have an entry in a topic reference document under `documentation/papers/`, organised by subject (for example `documentation/papers/products/land.md`, `documentation/papers/products/water.md`, or future `indicators/` and `methods/` documents). Each entry must include:

- title, authors and year;
- journal or venue;
- DOI or canonical URL;
- a short description of relevance;
- limitations and notes.

Local copies of papers must be kept in `documentation/papers/local_ref/`, which is gitignored and never committed. The directory mirrors the subject structure.

Documentation must link to the reference entry or DOI, never to a local PDF.

## References

- `../AGENTS.md` — agent roles, routing and execution policy.
- `../ROADMAP.md` — milestone, epic and ticket direction and identifiers.
- `../documentation/project_definition.md` — intended scientific behavior and requirements.
- `CODING_STANDARDS.md` — coding conventions.
- `UNIT_TEST_GUIDE.md` — unit-test rules.
- `SOFTWARE_VALIDATION_PLAN.md` — scientific and software validation.
- `../projects/meogap_interfaces/README.md` — reference contract layout and validation.
