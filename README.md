# Nigehban Campus

Campus video-analytics FYP (FAST-NUCES). It watches recorded camera footage and alerts security operators to **abandoned bags** and **possible theft**, with snapshots, in a web dashboard. A human always decides.

Agents and contributors: start with [CLAUDE.md](CLAUDE.md) and the [docs](docs/).

## Prerequisites

[Git](https://git-scm.com), [Docker](https://www.docker.com) (Docker Desktop on Windows), [uv](https://docs.astral.sh/uv/) and [bun](https://bun.sh). uv installs Python 3.11 by itself (see `.python-version`).

## Quick start

```bash
cp .env.example .env            # dev defaults, never commit .env
docker compose up -d            # PostgreSQL 16 on localhost:5432
uv sync                         # Python workspace (api, cv, contracts)
cd apps/web && bun install      # web dependencies
bun dev                         # http://localhost:5173 (placeholder page in Phase 1)
```

Database and API (from `apps/api`):

```bash
uv run alembic upgrade head                      # create the tables
uv run python scripts/seed.py                    # dev users, CAM 01-04, demo alerts (safe to rerun)
uv run uvicorn app.main:app --reload --port 8000 # then: curl localhost:8000/api/health
```

Dev logins `operator/operator123` and `admin/admin123` are for local use only. Seeded alerts are demo data.
Python tests use a separate `nigehban_test` database, created automatically on the same server.

Checks:

```bash
uv run pytest                   # all Python tests
uv run ruff check .             # Python lint
uv run nigehban-cv --version    # CV worker stub
cd apps/web && bun run lint && bun run typecheck && bun run test && bun run build
```

Available in later phases: `nigehban-cv run` (Phase 9+), `bun run gen:api` (Phase 4).

**Port 5432 already in use?** Set `DB_PORT=5433` in `.env` (and in `DATABASE_URL`), then `docker compose up -d`.

## Repository layout

See [docs/Folder-Structure.md](docs/Folder-Structure.md). In short: `apps/api` (FastAPI), `apps/web` (React), `services/cv` (CV worker), `packages/contracts` (shared Pydantic models), `data/` (git-ignored runtime data), `prototype/` (UI reference).

## Workflow

One phase at a time, on branch `feature/phase-XX-<slug>`, following [docs/master-roadMap-plan.md](docs/master-roadMap-plan.md). Each phase has a file in `docs/phases/`. Nothing is merged into `main` without team approval.
