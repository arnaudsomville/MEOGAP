# AGENTS.md — MEOGAP Agent Dispatcher

## Purpose

This file routes coding agents to the appropriate role and authoritative project documentation. **It is a dispatcher, not a reference manual.** Keep detailed rules, design decisions, and validation procedures in the referenced documents rather than duplicating them here.

**MEOGAP** (Modular Earth Observation & Geospatial Analytics Platform) is a personal project primarily intended to **learn Earth observation and remote sensing through scientific experimentation**. The **Product Engine** is its central capability: it progressively transforms Earth observation inputs into reusable scientific products (internal levels L0–LN). A configurable **Indicator Engine** is a planned extension, not a prerequisite for computing products. Use cases are illustrative and may change.

Do not treat proposed features as implemented features, or exploratory scientific ideas as mandatory deliverables.

## Required context and authority

Read the documents relevant to the task before acting:

| Source | Purpose |
| --- | --- |
| `README.md` | Project overview, intended workflow, setup, and supported repository commands. |
| `agents/REPOSITORY_RULES.md` | Repository-wide language, planning hierarchy, epic and ticket authoring rules. |
| `documentation/project_definition.md` | Project vision, scientific processing levels, scope, component responsibilities, requirements, and roadmap. |
| `agents/CODING_STANDARDS.md` | Authoritative coding conventions, engineering practices, and CVE management policy. |
| `agents/UNIT_TEST_GUIDE.md` | Authoritative rules for writing and organizing unit tests. |
| `agents/SOFTWARE_VALIDATION_PLAN.md` | Validation strategies, acceptance criteria, and scientific/software verification. |

When project assumptions conflict with the authoritative documentation, **follow the documentation**. If a required reference is absent or contradictory, report the gap rather than inventing a policy. Keep this file concise and direct detailed changes to the appropriate document.

## Role selection — mandatory

**Before proceeding with each request, explicitly state the primary role you have selected.** For cross-cutting tasks, identify supporting roles as needed; one role remains responsible for the outcome.

| Primary role | Use when working on… | Consult first |
| --- | --- | --- |
| **Research Expert** | Scientific literature, Earth observation methods, standards, alternative solutions, and technical best practices. | `documentation/project_definition.md`; `agents/SOFTWARE_VALIDATION_PLAN.md` |
| **Scientific Product Engineer** | Adding or evolving scientific products, processing dependencies, algorithms, and product metadata. | `documentation/project_definition.md`; `agents/CODING_STANDARDS.md`; `agents/SOFTWARE_VALIDATION_PLAN.md` |
| **Geospatial & Temporal Data Specialist** | Raster/vector data, coordinate systems, spatial aggregation, resampling, grids, time series, and missing observations. | `documentation/project_definition.md`; `agents/SOFTWARE_VALIDATION_PLAN.md` |
| **Scientific Validation Agent** | Verifying physical meaning, comparing reference products, evaluating bias/uncertainty, and documenting scientific limitations. | `agents/SOFTWARE_VALIDATION_PLAN.md`; `documentation/project_definition.md` |
| **Backend & API Engineer** | REST capabilities, analysis requests, statuses, result discovery, orchestration, and external integrations. | `documentation/project_definition.md`; `agents/CODING_STANDARDS.md` |
| **Frontend & Visualization Engineer** | Maps, AOIs, request-status views, results on maps, plots, and spatial/temporal exploration. | `documentation/project_definition.md`; `agents/CODING_STANDARDS.md` |
| **Indicator & Monitoring Engineer** | Configurable monitoring indicators, product combinations, monitoring rules, and potential alerts. | `documentation/project_definition.md`; `agents/CODING_STANDARDS.md` |
| **Execution & Infrastructure Engineer** | Background processing, execution reliability, resource usage, deployment, and optional event notifications. | `README.md`; `documentation/project_definition.md`; `agents/CODING_STANDARDS.md` |
| **Design Engineer** | Feature design, module boundaries, architectural consistency, performance, and maintainability. | `documentation/project_definition.md`; `agents/CODING_STANDARDS.md` |
| **Software Validation Agent** | Unit/integration test strategy, regressions, acceptance checks, and consistency defects. | `agents/UNIT_TEST_GUIDE.md`; `agents/SOFTWARE_VALIDATION_PLAN.md` |
| **Debug Agent** | Reproduction, root-cause analysis, focused fixes, and observability improvements. | `agents/CODING_STANDARDS.md`; `agents/UNIT_TEST_GUIDE.md` |
| **Quality Agent** | Code review, readability, naming, documentation consistency, and standards compliance. | `agents/CODING_STANDARDS.md` |
| **Security Agent** | Dependency vulnerabilities, CVE triage, credentials, and security-related changes. | `agents/CODING_STANDARDS.md`, especially **“CVE fragility management”** |

**Research Expert:** Use web search to check current practices when the task requires research. Prioritize peer-reviewed papers, official space-agency/provider documentation, standards bodies, and reproducible scientific references for scientific claims. For software questions, prioritize official documentation and credible engineering sources. Distinguish evidence from inference and record relevant sources.

## Project-specific guardrails

Consult `documentation/project_definition.md` for the full rationale and requirements. In particular:

- **Scientific learning comes first.** Prefer understanding, documenting, and validating a method over adding features for their own sake.
- **The Product Engine comes first.** Products may be useful independently of monitoring indicators. Do not introduce the Indicator Engine as a dependency of scientific computation.
- **Internal L0–LN levels are not provider processing levels.** Respect distinctions between native measurements, derived products, and analytical aggregations.
- **Spatial representation is not fixed.** H3 is a candidate analytical grid, not a mandatory processing or storage format. Preserve distinctions between native resolution and spatial analysis units.
- **Quality matters.** Do not silently treat cloudy, missing, invalid, or unobserved data as measured zero. Record assumptions, provenance, and limits of scientific results.
- **Preserve the intended request workflow.** Requests and their status are retrievable through REST; successful results can be selected for map display. Live notifications (possibly using NATS) are optional later enhancements, not an initial MVP dependency.
- **Do not design ahead of the template.** The repository template governs physical organization and implementation details. This project definition specifies component responsibilities, not directory layouts or premature service contracts.
- **Repository language and planning rules.** Write milestones, epics, tickets, issue bodies, PRs and code-facing documentation in English. Follow `agents/REPOSITORY_RULES.md` for the planning hierarchy and ticket format.
- **Reference papers and copyright.** Never commit PDFs or full-text copyrighted papers. Every citation must have a metadata entry under `documentation/papers/`; local copies belong in `documentation/papers/local_ref/`. See `agents/REPOSITORY_RULES.md`.

## Coding and test policy

- **Before creating or editing milestones, epics or tickets:** Read and follow `agents/REPOSITORY_RULES.md`.
- **Before coding:** Read and follow `agents/CODING_STANDARDS.md`.
- **Before writing or modifying unit tests:** Read `agents/UNIT_TEST_GUIDE.md`.
- **For scientific changes:** Use `agents/SOFTWARE_VALIDATION_PLAN.md` to select appropriate scientific checks; comparison with an existing satellite product is informative but does not by itself establish scientific validity.
- **Always run targeted unit tests** covering tests you add or modify.
- During pytest discovery, if errors are **unrelated** to the class or module under test, treat the branch as work in progress and stop after targeted tests. If errors are **related**, fix them and run the full unit test suite.
- If discovery has **no errors**, run the full **unit test** suite. Exclude non-regression campaigns, scientific validation campaigns, and benchmarks unless specifically requested.
- Use the repository-managed Python environment (`./.venv` when applicable) and documented Make commands. Do not silently use an unrelated system Python installation.

## Security policy

For CVE triage and dependency vulnerability management, follow `agents/CODING_STANDARDS.md` § **“CVE fragility management”** exactly. Never expose or commit private keys, decrypted secrets, or credentials.

## Recording user-provided knowledge

When the user asks an agent to **remember** a rule or decision, persist it in the most relevant project document, not just in the chat:

| Topic | Destination |
| --- | --- |
| Project purpose, scope, scientific concepts, requirements, roadmap | `documentation/project_definition.md` |
| Coding conventions, software design patterns, CVE policy | `agents/CODING_STANDARDS.md` |
| Unit-test design and execution rules | `agents/UNIT_TEST_GUIDE.md` |
| Scientific validation, test scenarios, acceptance criteria | `agents/SOFTWARE_VALIDATION_PLAN.md` |
| Agent roles, routing, execution policy | `AGENTS.md` |
| Repository language, planning hierarchy, milestone/epic/ticket format | `agents/REPOSITORY_RULES.md` |
| Other operational knowledge | The most relevant document under `agents/` |

Add an appropriate section when none exists. Summarize user guidance into precise instructions and keep documents consistent.

## Long-running tasks — 10-minute cap

Do not run an individual execution task for more than **10 minutes**. Organize work into bounded steps. If it cannot be completed within that limit, stop safely and persist a handoff in `AGENT_NOTES.md` at the repository root, unless a task-specific log already exists. Record what changed, what was checked, blockers, and exact next steps. Assume the next agent has no conversational memory.

## Git policy — no autonomous changes to repository history

**Never run `git add`, `git commit`, `git push`, `gh pr merge`, or destructive Git operations without explicit instruction from the user for the current session.** Do not seek permission through an automatic plan-exit mechanism. When changes are ready, summarize them and, if useful, tell the user which Git commands to run.

**Never close, reopen or change the status of a milestone, epic, ticket or issue without explicit instruction from the user for the current session.** Issue closure and status transitions are driven by the merge of the corresponding pull request (for example through `Closes #...` in the PR body), not by the agent. Creating a pull request and linking issues does not authorize closing them or changing their planning state. See `agents/REPOSITORY_RULES.md`.

## Final response expectations

Report the selected primary role, files changed, important design decisions, and tests actually run (or why they could not be run). Separate completed work from proposals or deferred improvements. Do not claim validation or functionality that has not been verified.
