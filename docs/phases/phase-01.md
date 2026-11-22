# Phase 01: Repo foundation and tooling
Branch: `feature/phase-01-foundation` · Status: done · Owner: Farooq khan

## Goal
Create the monorepo skeleton so every later phase has a place to land: uv workspace, Vite React app, PostgreSQL in Docker, git-ignored `data/`, README quick start.

## Plan
1. Install uv, branch off `main`.
2. `.gitignore`, `.gitattributes`; untrack `prompt.md` (kept locally, ignored); `git mv dashboard.html prototype/`.
3. uv workspace: root `pyproject.toml`, `.python-version` (3.11), members `packages/contracts`, `apps/api`, `services/cv` with minimal packages, smoke tests and a `nigehban-cv --version` stub. No heavy CV deps (D-13).
4. `apps/web`: Vite + React + TS strict, Tailwind v4, React Router, TanStack Query, ESLint, Prettier, Vitest; folder skeleton from Frontend.md §2; `/api` dev proxy to :8000.
5. `docker-compose.yml` (postgres:16, `pgdata`, healthcheck, `DB_PORT` override), `.env.example`.
6. `data/` subfolders with `.gitkeep`, `dataset/tools/`, `services/cv/scenarios/`.
7. README quick start; sync docs.

## Contract / doc changes
- `CLAUDE.md`: prototype path, `bun run test`.
- `docs/Frontend.md`: React 19, Tailwind v4, TS 6, ESLint + Prettier; prototype path.
- `docs/Folder-Structure.md`: root files added, `eslint.config.js` instead of `tailwind.config.ts`.
- `docs/Decisions.md`: D-12 (latest React, Tailwind v4, TS pinned to 6.x), D-13 (heavy CV deps in Phase 10).
- No contract changes.

## Verification
`uv sync` · `uv run pytest` · `uv run ruff check .` · `uv run nigehban-cv --version` · `docker compose up -d` + `pg_isready` · `cd apps/web && bun install && bun run lint && bun run typecheck && bun run test && bun run build` · `bun dev` serves the placeholder.

## What changed (filled at the end)
- Files added or changed: see the branch diff. Verified from a fresh clone (uv sync, pytest, ruff, bun install, lint, typecheck, test, build) and Postgres health/volume persistence. Not exercised: `bun dev` /api proxy.
- Decisions taken: D-12, D-13. The Vite template now ships oxlint; replaced with ESLint + Prettier per the roadmap.
- Known gaps carried to a later phase: `tokens.css` and design system (Phase 5), `gen:api` script (Phase 4), `config.json` (Phase 9), `manifest.csv` (Phase 13). Host port 5432 can clash with other local Postgres containers; use `DB_PORT`.
