# MEOGAP Component Specifications — First Draft

Status: Working draft for review  
Scope: UI, GTW, SCI, CAT, and CON as a candidate responsibility.

These documents establish the system baseline and initial component boundaries. They are not implementation authorization and do not settle every architecture decision. The system requirements are summarized in [sys.md](../sys.md), which points back to the authoritative requirements in `documentation/project_definition.md`.

## Documents
- [UI](ui.md) — user interaction and presentation.
- [GTW](gtw.md) — public REST gateway.
- [SCI](sci.md) — scientific product definitions and processing.
- [CAT](cat.md) — data and asset catalog.
- [CON](con.md) — candidate contract/request management responsibility; not yet approved as a distinct logical component.

## Requirement conventions
Each component has its own requirement table. IDs are newly proposed and may change before approval. Requirements are derived from current SYS requirements; multiple parent SYS requirements are allowed when justified.

- P0: essential to represent in the M0 journey; full target behavior need not be implemented in M0.
- P1: important target capability expected after M0, generally M1–M3.
- P2: later or optional capability.
- Target milestone means intended delivery of the complete stated behavior.
- M0 treatment belongs in the separate M0 journey/acceptance definition, not in each requirement row.
- Status is a drafting aid: Proposed, Open, or Needs decision.

Detailed REST/JSON schemas, message contracts and E2E test cases will be defined in follow-up work.

## Current assumptions
1. UI, GTW, CAT and SCI are the confirmed starting decomposition. Workers are an execution mechanism; NATS is internal software infrastructure, not a system-level component.
2. GTW is the preferred name for the public Gateway.
3. CON may own request lifecycle, execution tracking, reuse/admission decisions and possibly authorization policy. This is an open question, not a confirmed separate service or package.
4. Logical responsibilities do not imply separate processes, packages, containers or services.
5. M0 should provide broad, deterministic end-to-end foundations: real UI and interface contracts, with selected scientific and contract behavior mocked.
6. SYS requirements remain the system baseline. Any SYS change is a maintainer decision and must be discussed and traced.
7. GitHub issues are the work-tracking authority. These documents describe intended behavior, not implementation tickets.

## Open decisions
- Is CON a distinct logical responsibility, or should its initial behavior belong to GTW and be extracted only if justified?
- Who owns authoritative analysis-request lifecycle and persisted request state?
- Who decides whether an existing result satisfies a new request?
- Who decides and enforces access to an asset, and how is caller identity propagated?
- How are acquisition status, request status, task status and scientific result quality distinguished?
- Which cross-cutting constraints should be specified outside component tables?
- Are SYS priorities and target milestones consistent with the desired M0 scope?

## Review rule
Review each component with the user before treating its requirements as agreed. Resolve responsibility boundaries first. Create implementation tickets only after the relevant design is accepted.
