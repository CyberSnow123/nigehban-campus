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
| GET | `/api/health` | none | `200 {"status":"ok","database":"connected"}`, or `503 {"status":"degraded","database":"disconnected"}` when `SELECT 1` fails. No error details. API-only shape (`app/schemas/health.py`) |

Auth: `Authorization: Bearer <jwt>` (12 h expiry) for users, and `X-Worker-Key` for the `ingest` routes. Logout happens on the client (token dropped).

## 4. Database tables
| Table | Columns |
|---|---|
| `users` | `id` pk, `username` unique, `display_name`, `password_hash`, `role`, `created_at` |
| `cameras` | `id`, `name` unique, `location`, `is_active`, `created_at` |
| `runs` | `id`, `camera_id` fk, `source`, `video_path`, `status`, `is_demo`, `pid` null, `frames_processed`, `fps`, `message`, `started_at`, `ended_at`, `created_at` |
| `alerts` | `id`, `ref_code` unique, `event_id` **unique**, `type`, `status`, `is_demo`, `camera_id` fk, `run_id` fk, `occurred_at`, `video_ts_s`, `bag_track_id`, `bag_class`, `bag_bbox` jsonb, `owner_track_id`, `carrier_track_id`, `separation_s`, `owner_distance_m`, `owner_away_s`, `confidence`, `owner_match`, `snapshot_path`, `acknowledged_by` fk, `acknowledged_at`, `closed_at`, `created_at` |
| `alert_actions` | `id`, `alert_id` fk, `action`, `from_status`, `to_status`, `user_id` fk, `note`, `at` |

Indexes: `alerts(status, occurred_at desc)`, `alerts(run_id)`, `alerts(owner_track_id)`, `alerts(carrier_track_id)`, plus foreign-key lookups `alerts(camera_id)`, `runs(camera_id)`, `alert_actions(alert_id, at)`.
Unique: `users.username`, `cameras.name`, `alerts.ref_code`, `alerts.event_id`.
Enums are stored as `varchar` with check constraints (simpler migrations). The value lists come from the contracts enums.

Column rules (Phase 3, enforced by named check constraints `ck_<table>_<rule>`):
- **Keys** are the contract IDs (`varchar(30)`, `usr_`/`cam_`/`run_`/`alt_`/`act_` + ULID), made in Python with `new_id`. Each table checks its own prefix; `alerts.event_id` checks `evt_`.
- **Not null:** `alerts.run_id` (every alert comes from a run), `alert_actions.user_id`. Nullable: `runs.pid`, `runs.message`, `runs.started_at/ended_at`, the type-conditional alert fields, `owner_track_id`, `owner_distance_m`, `acknowledged_*`, `closed_at`, `alert_actions.note` (max 500).
- **alerts:** the type-conditional fields of Data-Contracts §3; `authorised_pickup`/`confirmed_theft` only on `possible_theft`; `ref_code` format and its `A`/`T` suffix matching `type`; `confidence`, `owner_match` in 0-1; `video_ts_s`, distances and durations `>= 0`; `bag_bbox` a 4-item JSON array; `closed_at` set exactly when the status is closed; status `acknowledged` needs `acknowledged_at` and `acknowledged_by`.
- **runs:** `is_demo = (source = 'mock')` (D-06); `frames_processed`, `fps >= 0`; `ended_at >= started_at`. `alerts.is_demo` is copied from the run by the service.
- **alert_actions:** `from_status <> to_status`; `acknowledge` always goes to `acknowledged`. Whether a move is allowed at all is checked by `alert_service` with `can_transition`.
- **Foreign keys** are `ON DELETE RESTRICT`: alerts and their audit trail are never deleted.
- **Paths:** `alerts.snapshot_path` is relative to `DATA_DIR` (`snapshots/{run_id}/{event_id}.jpg`); `runs.video_path` is relative to `DATA_DIR/videos`.
- **Timestamps** are `timestamptz`; `created_at` and `alert_actions.at` default to `now()`.

`ref_code` sequence: per year, counting both types (`SEC-2026-001-A`, `SEC-2026-002-T`, …). `app/services/ref_codes.py` takes the highest number used that year + 1; the unique key is the safety net (locking for concurrent ingest arrives with Phase 6).

## 5. Behaviour rules
- **Transitions** are enforced in `alert_service` only, following the table in Data-Contracts §2. Every change writes an `alert_actions` row in the same transaction.
- **Ingest idempotency:** a unique `event_id` makes a duplicate return `200 {duplicate:true}`.
- **Ingest validation:** the run must exist and be `running`, and the camera must match the run. The snapshot is saved first; if the DB insert fails, the file is deleted.
- **run_launcher:** `subprocess.Popen([... "nigehban-cv", "run", "--run-id", id, "--source", src, "--video", path])` with the env passing `NIGEHBAN_WORKER_KEY`. The PID is stored. On API startup, any `running` run whose PID is dead is marked `failed`.
- **Paths:** `video_path` must resolve inside `DATA_DIR/videos` (reject `..`). File paths are never returned to the client.
- **Errors:** every exception is mapped to the error shape (Data-Contracts §6). Tracebacks are logged, never returned. Request validation errors (FastAPI's default `{"detail": [...]}` 422) are mapped to `422 VALIDATION_ERROR` with a short message per field, and the request body is **not** echoed back (Phase 4 adds the handler).

## 6. Setup and tests
- `.env.example`: `DATABASE_URL=postgresql+psycopg://nigehban:nigehban@localhost:5432/nigehban`, `JWT_SECRET`, `WORKER_KEY`, `DATA_DIR=../../data`, `CV_CONFIG=../../services/cv/config.json`.
- Settings (`app/core/settings.py`) read the repo-root `.env`; real environment variables win. Relative `DATA_DIR`/`CV_CONFIG` resolve against `apps/api`, whatever the working directory.
- `uv run alembic upgrade head` then `uv run python scripts/seed.py` (users `operator/operator123` and `admin/admin123` are for **dev only**). The seed is idempotent: it finds users by username, cameras by name, and demo runs/alerts by stable IDs, and never overwrites a row. It adds CAM 01-04 (prototype names), one completed `mock` run per camera, 8 demo alerts (`is_demo=true`) in several statuses with matching `alert_actions`, and copies a "DEMO DATA" placeholder JPEG to each snapshot path.
- Tests use a separate `nigehban_test` DB (`TEST_DATABASE_URL`, or `DATABASE_URL` with the name swapped; created if missing). The schema comes from the real migration; tables are emptied after each test; DB tests skip if Postgres is down. They cover the schema, constraints, migration round trip, seed and health, and later transitions, ingest idempotency, auth guards and path checks.
