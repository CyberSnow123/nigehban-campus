# Nigehban Campus

Campus video-analytics FYP (FAST-NUCES). It watches recorded camera footage and alerts security operators to **abandoned bags** and **possible theft**, with snapshots, in a web dashboard. A human always decides.

start: [CLAUDE.md](CLAUDE.md) and the [docs](docs/).

## Prerequisites

[Git](https://git-scm.com), [Docker](https://www.docker.com) (Docker Desktop on Windows), [uv](https://docs.astral.sh/uv/) and [bun](https://bun.sh). uv installs Python 3.11 by itself (see `.python-version`).

## Quick start

Run these once, from the repository root:

```bash
cp .env.example .env            # dev defaults, never commit .env
python -c "import secrets; print(secrets.token_urlsafe(48))"   # run twice; paste into JWT_SECRET and WORKER_KEY in .env
docker compose up -d            # PostgreSQL 16 on localhost:5432
uv sync                         # Python workspace (api, cv, contracts)
(cd apps/web && bun install)    # web dependencies
(cd apps/api && uv run alembic upgrade head && uv run python scripts/seed.py)   # tables + dev users, CAM 01-04, demo alerts
```

Then start the services, each in its own terminal, from the repository root:

```bash
uv run poe dev:api              # API on http://localhost:8000 (check: /api/health, docs: /docs)
uv run poe dev:web              # web on http://localhost:5173
uv run poe dev:ml               # CV worker; extra args pass through, e.g. --version
```

Open http://localhost:5173 and sign in with `operator` / `operator123` (or `admin` / `admin123`).
The CV worker has no `run` command until Phase 9, so for now `dev:ml` only prints help.
Stop a service with Ctrl+C; stop the database with `docker compose down`.

More setup notes:

- `JWT_SECRET` and `WORKER_KEY` in `.env` must be at least 32 characters, or the API will not start.
- Password reset email: by default the link is written to the API log (`MAIL_BACKEND=console`). To receive it, run `cd apps/api && uv run python scripts/set_user_email.py operator you@example.com`. For Gmail set `MAIL_BACKEND=smtp`, `SMTP_USER` and a Google **App Password** in `SMTP_PASSWORD` (2-step verification required; `.env.example` explains).
- Regenerate web types after API changes: `cd apps/web && bun run gen:api`.
- Python tests use a separate `nigehban_test` database, created automatically on the same server.
- Post a fake detection event through the ingest API (API running, seeded cameras): `cd apps/api && uv run python scripts/post_fake_event.py --camera "CAM 01" --type possible_theft --finish`. It is sent as `source: mock`, so the alert is demo data.

Dev logins are for local use only. Seeded alerts are demo data.

Checks:

```bash
uv run pytest                   # all Python tests
uv run ruff check .             # Python lint
uv run nigehban-cv --version    # CV worker stub
cd apps/web && bun run lint && bun run typecheck && bun run test && bun run build
```

Available in later phases: `nigehban-cv run` (Phase 9+).

**Port 5432 already in use?** Set `DB_PORT=5433` in `.env` (and in `DATABASE_URL`), then `docker compose up -d`.

## Repository layout

See [docs/Folder-Structure.md](docs/Folder-Structure.md). In short: `apps/api` (FastAPI), `apps/web` (React), `services/cv` (CV worker), `packages/contracts` (shared Pydantic models), `data/` (git-ignored runtime data), `prototype/` (UI reference).

## Workflow

One phase at a time, on branch `feature/phase-XX-<slug>`, following [docs/master-roadMap-plan.md](docs/master-roadMap-plan.md). Each phase has a file in `docs/phases/`. Nothing is merged into `main` without team approval.
