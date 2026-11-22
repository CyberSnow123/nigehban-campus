# Backend (apps/api)

> FastAPI service. Request and response shapes come from [Data-Contracts.md](Data-Contracts.md).

## 1. Stack
FastAPI · Pydantic v2 · SQLAlchemy 2 (sync, `psycopg`) · Alembic · `pyjwt` + `argon2-cffi` · `python-multipart` · pytest + httpx. Run with `uv run uvicorn app.main:app --reload --port 8000`.

## 2. Layout
```
apps/api/
  app/
    main.py            app factory, CORS (localhost:5173), error handlers, routers
    core/              settings.py (pydantic-settings, .env), security.py (JWT, hashing), errors.py
    db/                session.py, base.py
    models/            SQLAlchemy tables (one file per table)
    schemas/           API-only request models; shared shapes import nigehban_contracts
    routers/           auth, alerts, stats, runs, cameras, ingest, settings
    services/          alert_service (transitions, ref_code), run_launcher (subprocess), storage (snapshots/frames)
  alembic/             migrations
  scripts/seed.py      users, cameras, demo alerts (is_demo=true)
  tests/
```
Rule: routers stay thin, and the business rules (transitions, idempotency) live in `services/`.

## 3. Endpoints
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | none | `{username,password}` → `{access_token, user}` |
| GET | `/api/auth/me` | user | current user |
| GET | `/api/stats` | user | dashboard counters |
| GET | `/api/alerts` | user | filters: `status` (or `open`/`closed`), `type`, `camera_id`, `run_id`, `person` (track id, matches owner or carrier), `q`, `from`, `to`, `is_demo`, `page`, `page_size`. Newest first |
| GET | `/api/alerts/{id}` | user | alert detail |
| GET | `/api/alerts/{id}/snapshot` | user | JPEG |
| GET | `/api/alerts/{id}/actions` | user | audit trail |
| POST | `/api/alerts/{id}/acknowledge` | user | active → acknowledged |
| POST | `/api/alerts/{id}/close` | user | `{outcome, note}` → closed status |
| GET | `/api/cameras` | user | list |
| POST/PATCH | `/api/cameras[/{id}]` | admin | create or update |
| GET | `/api/runs` · `/api/runs/{id}` | user | list and detail |
| POST | `/api/runs` | user | `{camera_id, video_path, source}` → spawns worker |
| POST | `/api/runs/{id}/stop` | user | terminate worker → `stopped` |
| GET | `/api/runs/{id}/frame` | user | latest annotated JPEG (404 if none) |
| GET | `/api/videos` | user | files available under `DATA_DIR/videos` |
| GET | `/api/settings` | user | detection settings (subset of cv `config.json`) |
| PATCH | `/api/settings` | admin | update `association`, `abandon`, `theft` thresholds in `config.json`. Applies to the **next** run. Validated by the contracts model |
| POST | `/api/ingest/runs` | worker | create run (standalone CLI) |
| POST | `/api/ingest/runs/{id}/status` | worker | status and FPS heartbeat |
| POST | `/api/ingest/runs/{id}/frame` | worker | latest frame |
| POST | `/api/ingest/events` | worker | event + snapshot → alert (idempotent) |
| GET | `/api/health` | none | `{status, database}` |

Auth: `Authorization: Bearer <jwt>` (12 h expiry) for users, and `X-Worker-Key` for the `ingest` routes. Logout happens on the client (token dropped).

## 4. Database tables
| Table | Columns |
|---|---|
| `users` | `id` pk, `username` unique, `display_name`, `password_hash`, `role`, `created_at` |
| `cameras` | `id`, `name` unique, `location`, `is_active`, `created_at` |
| `runs` | `id`, `camera_id` fk, `source`, `video_path`, `status`, `is_demo`, `pid` null, `frames_processed`, `fps`, `message`, `started_at`, `ended_at`, `created_at` |
| `alerts` | `id`, `ref_code` unique, `event_id` **unique**, `type`, `status`, `is_demo`, `camera_id` fk, `run_id` fk, `occurred_at`, `video_ts_s`, `bag_track_id`, `bag_class`, `bag_bbox` jsonb, `owner_track_id`, `carrier_track_id`, `separation_s`, `owner_distance_m`, `owner_away_s`, `confidence`, `owner_match`, `snapshot_path`, `acknowledged_by` fk, `acknowledged_at`, `closed_at`, `created_at` |
| `alert_actions` | `id`, `alert_id` fk, `action`, `from_status`, `to_status`, `user_id` fk, `note`, `at` |

Indexes: `alerts(status, occurred_at desc)`, `alerts(run_id)`, `alerts(owner_track_id)`, `alerts(carrier_track_id)`.
Enums are stored as `varchar` with check constraints (simpler migrations).
`ref_code` sequence: per year, counting both types (`SEC-2026-001-A`, `SEC-2026-002-T`, …).

## 5. Behaviour rules
- **Transitions** are enforced in `alert_service` only, following the table in Data-Contracts §2. Every change writes an `alert_actions` row in the same transaction.
- **Ingest idempotency:** a unique `event_id` makes a duplicate return `200 {duplicate:true}`.
- **Ingest validation:** the run must exist and be `running`, and the camera must match the run. The snapshot is saved first; if the DB insert fails, the file is deleted.
- **run_launcher:** `subprocess.Popen([... "nigehban-cv", "run", "--run-id", id, "--source", src, "--video", path])` with the env passing `NIGEHBAN_WORKER_KEY`. The PID is stored. On API startup, any `running` run whose PID is dead is marked `failed`.
- **Paths:** `video_path` must resolve inside `DATA_DIR/videos` (reject `..`). File paths are never returned to the client.
- **Errors:** every exception is mapped to the error shape (Data-Contracts §6). Tracebacks are logged, never returned. Request validation errors (FastAPI's default `{"detail": [...]}` 422) are mapped to `422 VALIDATION_ERROR` with a short message per field, and the request body is **not** echoed back (Phase 4 adds the handler).

## 6. Setup and tests
- `.env.example`: `DATABASE_URL=postgresql+psycopg://nigehban:nigehban@localhost:5432/nigehban`, `JWT_SECRET`, `WORKER_KEY`, `DATA_DIR=../../data`, `CV_CONFIG=../../services/cv/config.json`.
- `uv run alembic upgrade head` then `uv run python scripts/seed.py` (users `operator/operator123` and `admin/admin123` are for **dev only**).
- Tests use a separate `nigehban_test` DB. They cover transitions, ingest idempotency, auth guards and path checks.
