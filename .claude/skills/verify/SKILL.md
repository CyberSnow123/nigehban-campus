---
name: verify
description: Runtime verification recipe for Nigehban Campus (CLI, Postgres, contracts library, web dev server + /api proxy). Use when verifying a phase or change by running the app.
---

# Verify Nigehban Campus at runtime

Windows host. `uv` may not be on the Bash PATH: in PowerShell refresh it with
`$env:Path = [Environment]::GetEnvironmentVariable("Path","User") + ";" + [Environment]::GetEnvironmentVariable("Path","Machine")`,
or call `.venv/Scripts/python.exe` directly.

## Surfaces and how to drive them
- **CV CLI:** `uv run nigehban-cv --version` / `--help`. Typos exit 2 with an argparse error.
- **Postgres:** `docker compose ps`; `docker compose exec db pg_isready -U nigehban -d nigehban`.
  Host port comes from `DB_PORT` in `.env` (5433 on the dev laptop; another project's `kaol-postgres` owns 5432, never touch it).
  Host connection check: psycopg with `DATABASE_URL` from `.env` (strip `+psycopg`), run via `uv run --package nigehban-api python script.py`.
- **Contracts library:** sample script that does `import nigehban_contracts as nc` (public import only), run with `uv run --package nigehban-cv python script.py`.
- **OpenAPI seam (until the real API exists):** a scratch FastAPI app with contracts as `response_model`/body, run with `.venv/Scripts/python.exe -m uvicorn mod:app --port 8765` (background task), then curl `/openapi.json` and POST payloads.
- **Web:** `cd apps/web && bun dev` (background task, port 5173). `curl localhost:5173/` (title "Nigehban Campus"); proxy check: run any uvicorn app on :8000 and `curl localhost:5173/api/x` - the request must show in uvicorn's log. With nothing on :8000 the proxy returns 502.
- **Screenshot:** `"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --window-size=1280,720 --virtual-time-budget=5000 --screenshot=<scratchpad>\shot.png http://localhost:5173/`

## Gotchas
- Stop background servers with TaskStop, never `taskkill /IM bun.exe` (blocked; kills other projects).
- Keep scratch scripts in the session scratchpad, not the repo.
