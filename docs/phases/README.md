# Phase Files

One file per phase from [master-roadMap-plan.md](../master-roadMap-plan.md), written **when the phase starts**, named `phase-XX.md` (e.g. `phase-07.md`). Keep it short: it says *how* this phase is built and what changed. Product scope and contracts stay in the baseline docs.

## Template
```markdown
# Phase XX: <title>
Branch: `feature/phase-XX-<slug>` · Status: planned | in progress | done · Owner: <name>

## Goal
One or two lines, copied or refined from the roadmap.

## Plan
Ordered steps, each small enough to verify. Name the files to create or change.

## Contract / doc changes
Which baseline docs change (Data-Contracts, Backend, …) and how. "None" is fine.

## Verification
Commands to run and what to check in the browser.

## What changed (filled at the end)
- Files added or changed
- Decisions taken (also add them to Decisions.md if they affect later phases)
- Known gaps carried to a later phase
```
