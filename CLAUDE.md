# Nigehban Campus: Agent Guide

Campus video-analytics FYP (FAST-NUCES). It watches recorded camera footage and alerts security operators to **abandoned bags** and **possible theft**, with snapshots, in a web dashboard. Classes: person, handbag, backpack only.

## Read before working (in this order)
1. [docs/Context.md](docs/Context.md): what, why, scope, definition of done
2. [docs/Decisions.md](docs/Decisions.md): decisions D-01 onwards and why (scope cut, stack)
3. [docs/master-roadMap-plan.md](docs/master-roadMap-plan.md): the 19 phases. Find the current phase and its `docs/phases/phase-XX.md`
4. [docs/Architecture.md](docs/Architecture.md) and [docs/Data-Contracts.md](docs/Data-Contracts.md)
5. The area doc for your task: [Backend](docs/Backend.md) · [Frontend](docs/Frontend.md) · [CV-Pipeline](docs/CV-Pipeline.md) · [Dataset](docs/Dataset.md) · [Folder-Structure](docs/Folder-Structure.md)

UI reference: `prototype/dashboard.html` (`dashboard.html` at the root until Phase 1). UML and DFD diagrams: `diagrams/uml/`.

## Stack
FastAPI + SQLAlchemy 2 + Alembic (`apps/api`) · React + Vite + TS + Tailwind + TanStack Query (`apps/web`) · Python CV worker with Ultralytics YOLO26n + ByteTrack (`services/cv`) · shared Pydantic contracts (`packages/contracts`) · PostgreSQL 16 in Docker · `uv` for Python, `bun` for web · 3 s polling.

## Hard rules
- **Contracts first:** change `docs/Data-Contracts.md`, then `packages/contracts`, then regenerate web types (`bun run gen:api`), then the code.
- **Only the API writes to the DB.** The CV worker only POSTs to `/api/ingest/*` (D-11).
- **Mock output is always labelled:** `source: mock`, which becomes `is_demo = true` and a "Demo data" badge. Never present mock output as real (D-06).
- **No model training in FYP-1** (D-01). Detection uses pretrained YOLO26n (D-04).
- Detection timers use **video time** (`video_ts_s`), never wall-clock time.
- Wording: "Possible theft", never "Theft". The system flags and a human decides. No face recognition or identity.
- Thresholds live in `services/cv/config.json`, never hard-coded.
- Never commit `.env`, `data/`, raw clips or `*.pt` weights.
- If a change alters a contract, structure or decision, update the matching doc in the same change.

## Workflow
- Work one phase at a time on branch `feature/phase-XX-<slug>`. Write `docs/phases/phase-XX.md` from [the template](docs/phases/README.md) before coding.
- Don't commit to or merge into `main` without the team's approval.

## Commands (available from Phase 1)
```
docker compose up -d                                   # PostgreSQL
uv sync                                                # Python workspace
cd apps/api && uv run alembic upgrade head && uv run python scripts/seed.py
cd apps/api && uv run uvicorn app.main:app --reload --port 8000
cd apps/web && bun install && bun dev                  # http://localhost:5173
uv run nigehban-cv run --video data/videos/x.mp4 --camera "CAM 01" --source mock|real
uv run pytest                                          # all Python tests
cd apps/web && bun test
```
