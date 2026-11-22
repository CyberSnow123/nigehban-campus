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
    services/          alert_service (new alert from an event; transitions in Phase 7), ingest_service (event checks, idempotency), run_service (worker runs and status), ref_codes, run_launcher (subprocess, Phase 12), storage (snapshots/frames under DATA_DIR)
    db/locks.py        PostgreSQL advisory locks (event_id, ref_code year)
  alembic/             migrations
  scripts/seed.py      users, cameras, demo alerts (is_demo=true)
  tests/
```
Rule: routers stay thin, and the business rules (transitions, idempotency) live in `services/`.

## 3. Endpoints
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | none | `{username,password}` → `{access_token, token_type:"bearer", expires_at, user}`; wrong credentials → `401`; more than 10 attempts a minute from one address → `429 RATE_LIMITED` with `Retry-After` |
| GET | `/api/auth/me` | user | current user (`UserMe`) |
| POST | `/api/auth/forgot-password` | none | `{email}` → always `202 {message}`; emails a reset link if the address is registered |
| POST | `/api/auth/reset-password` | none | `{token, new_password}` → `200 {message}`; bad or used link → `422` |
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
| POST | `/api/ingest/runs` | worker | `IngestRunCreate {camera (name), source, video_path}` → `201 Run` (`running`). Unknown camera `404`, inactive `422` |
| POST | `/api/ingest/runs/{id}/status` | worker | `RunStatusUpdate` → `200 Run`. A move `RUN_TRANSITIONS` refuses → `409 RUN_NOT_RUNNING` |
| POST | `/api/ingest/runs/{id}/frame` | worker | multipart `frame` (JPEG ≤ 2 MB) → `204`, overwrites `frames/{run_id}.jpg`. Run not running → `409` |
| POST | `/api/ingest/events` | worker | multipart `event` (JSON) + `snapshot` (JPEG ≤ 2 MB) → `201 {alert_id, duplicate:false}`; resent `event_id` → `200 {duplicate:true}` |
| GET | `/api/health` | none | `200 {"status":"ok","database":"connected"}`, or `503 {"status":"degraded","database":"disconnected"}` when `SELECT 1` fails. No error details. API-only shape (`app/schemas/health.py`) |

Auth: `Authorization: Bearer <jwt>` (12 h expiry) for users, and `X-Worker-Key` for the `ingest` routes (compared in constant time; a missing or wrong key is `401` without `WWW-Authenticate`, and a user token is not accepted there). Logout happens on the client (token dropped); there is no server-side revocation, so a copied token stays valid until it expires (a password reset signs it out).

## 4. Database tables
| Table | Columns |
|---|---|
| `users` | `id` pk, `username` unique (lowercase), `display_name`, `email` unique null (lowercase), `password_hash`, `password_changed_at` null, `role`, `created_at` |
| `cameras` | `id`, `name` unique, `location`, `is_active`, `created_at` |
| `runs` | `id`, `camera_id` fk, `source`, `video_path`, `status`, `is_demo`, `pid` null, `frames_processed`, `fps`, `message`, `started_at`, `ended_at`, `created_at` |
| `alerts` | `id`, `ref_code` unique, `event_id` **unique**, `type`, `status`, `is_demo`, `camera_id` fk, `run_id` fk, `occurred_at`, `video_ts_s`, `bag_track_id`, `bag_class`, `bag_bbox` jsonb, `owner_track_id`, `carrier_track_id`, `separation_s`, `owner_distance_m`, `owner_away_s`, `confidence`, `owner_match`, `snapshot_path`, `acknowledged_by` fk, `acknowledged_at`, `closed_at`, `created_at` |
| `alert_actions` | `id`, `alert_id` fk, `action`, `from_status`, `to_status`, `user_id` fk, `note`, `at` |
| `password_reset_tokens` | `token_hash` pk (SHA-256 hex of the emailed token), `user_id` fk (cascade), `expires_at`, `used_at` null, `created_at` |

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

`ref_code` sequence: per year, counting both types (`SEC-2026-001-A`, `SEC-2026-002-T`, …). `app/services/ref_codes.py` takes a per-year advisory transaction lock, then the highest number used that year + 1, so parallel ingests get distinct numbers; the unique key is the safety net.

## 5. Behaviour rules
- **Transitions** are enforced in `alert_service` only, following the table in Data-Contracts §2. Every change writes an `alert_actions` row in the same transaction.
- **Ingest idempotency:** the event service takes an advisory lock on the `event_id`, then looks it up: a known one returns `200 {duplicate:true}` with the first alert's ID, even after the run has ended. Parallel retries run one after the other. A unique-violation on `event_id` (safety net) is also answered as a duplicate, and the file is kept because it belongs to the first alert.
- **Ingest validation** (Data-Contracts §4, in order): `event` parses as a `DetectionEvent`; duplicate check; the run exists (`404`) and is `running` (`409 RUN_NOT_RUNNING`); `camera_id` and `source` equal the run's (`422`: a mock run can never produce a real alert); the snapshot starts with `FF D8 FF` and is at most 2 MB (read in chunks, stops early). `is_demo` is copied from the run. The snapshot is written first (temp file + `os.replace`) to `snapshots/{run_id}/{event_id}.jpg`; if the insert or commit fails, the file is deleted.
- **Run status:** `run_service.apply_status` locks the run row, checks `can_update_run`, overwrites `frames_processed`, `fps` (kept when sent as `null`) and `message`, sets `started_at` on the first `running` and `ended_at` on a terminal status.
- **Frames:** `frames/{run_id}.jpg`, replaced atomically, so a reader never sees half a file. The API does not limit the rate; the worker pushes about once a second.
- **run_launcher:** `subprocess.Popen([... "nigehban-cv", "run", "--run-id", id, "--source", src, "--video", path])` with the env passing `NIGEHBAN_WORKER_KEY`. The PID is stored. On API startup, any `running` run whose PID is dead is marked `failed`.
- **Paths:** `video_path` must resolve inside `DATA_DIR/videos` (reject `..`). File paths are never returned to the client.
- **Errors:** every exception is mapped to the error shape (Data-Contracts §6) by `core/errors.py`. HTTP errors map by status (401 `UNAUTHORIZED` with `WWW-Authenticate: Bearer`, 403 `FORBIDDEN`, 404 and 405 `NOT_FOUND`). FastAPI's default `{"detail": [...]}` 422 becomes `422 VALIDATION_ERROR` with one `field: reason` per error, and the request body is **not** echoed. Anything unexpected is `500 INTERNAL_ERROR`; the traceback is logged, never returned. Services raise `ApiError(status, code, message)`. OpenAPI documents these shapes (`ERROR_RESPONSES`), so the generated web types match what the API really sends.
- **Login and tokens:** HS256 JWT with claims `sub` (user ID), `iat`, `exp` (12 h) and **no role**: `get_current_user` loads the user from the DB on every request, so a deleted user or a changed role takes effect at once. A wrong password and an unknown username return the same `401` body, and a password check still runs for an unknown username (same response time). Usernames are matched case-insensitively.
- **Login rate limit:** `slowapi` (on the `limits` library), `app/core/rate_limit.py`. Every login attempt, right or wrong, counts per client IP address: `LOGIN_RATE_LIMIT` (default `10/minute`; a list such as `10/minute;50/hour` works). Over the limit the answer is `429 RATE_LIMITED` in the standard error shape with a `Retry-After` header (the window length, in seconds, as an upper bound). Requests that fail validation (422) do not count. Counters are kept **in memory**: they reset when the server restarts and are separate for each server process. Behind a reverse proxy every request would carry the proxy's address, so a trusted-proxy setting must be added before deploying that way (the Vite dev proxy also shows every browser as `127.0.0.1`). `RATE_LIMIT_ENABLED=false` switches it off (the test suite does this, and turns it on in `tests/test_rate_limit.py`).
- **Forgot password:** `POST /api/auth/forgot-password {email}` always returns `202` with one neutral message, whether or not the email exists, and the email is sent in a background task so timing does not reveal it. The link token is `secrets.token_urlsafe(32)`, valid 30 minutes, single use; only its SHA-256 hash is stored. A new request voids older links, and at most one email per user per 60 s is sent. `POST /api/auth/reset-password {token, new_password}` needs 8-128 characters, not equal to the username; a bad, used or expired link is `422 VALIDATION_ERROR`. A successful reset sets `users.password_changed_at`, and any token issued before it is rejected (signs out every device).
- **Mail:** `MAIL_BACKEND=console` (default) logs the message, including the reset link, so it is for dev only. `smtp` uses STARTTLS; for Gmail use `smtp.gmail.com:587`, `SMTP_USER` and a Google **App Password** (2-step verification must be on; the normal password does not work). Send failures are logged and never shown to the caller.

## 6. Setup and tests
- `.env.example`: `DATABASE_URL=postgresql+psycopg://nigehban:nigehban@localhost:5432/nigehban`, `JWT_SECRET` and `WORKER_KEY` (**each at least 32 characters**, left empty in the example; generate with `python -c "import secrets; print(secrets.token_urlsafe(48))"`), `DATA_DIR=../../data`, `CV_CONFIG=../../services/cv/config.json`, and the mail settings `MAIL_BACKEND`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_STARTTLS`, `WEB_BASE_URL`, and the login limiter settings `RATE_LIMIT_ENABLED`, `LOGIN_RATE_LIMIT`. Credentials live only in `.env`.
- Settings (`app/core/settings.py`) read the repo-root `.env`; real environment variables win. Relative `DATA_DIR`/`CV_CONFIG` resolve against `apps/api`, whatever the working directory. `DATABASE_URL` must come from `.env` or the environment: tests never fall back to a default port.
- `apps/api/scripts/set_user_email.py <username> <email>` sets the address a user receives reset links at (the seed uses placeholder `@nigehban.local` addresses). `scripts/export_openapi.py` writes the OpenAPI schema for `bun run gen:api`; a test fails if the committed `apps/web/src/lib/api/openapi.json` is stale.
- `uv run alembic upgrade head` then `uv run python scripts/seed.py` (users `operator/operator123` and `admin/admin123` are for **dev only**). The seed is idempotent: it finds users by username, cameras by name, and demo runs/alerts by stable IDs, and never overwrites a row. It adds CAM 01-04 (prototype names), one completed `mock` run per camera, 8 demo alerts (`is_demo=true`) in several statuses with matching `alert_actions`, and copies a "DEMO DATA" placeholder JPEG to each snapshot path.
- Tests use a separate `nigehban_test` DB (`TEST_DATABASE_URL`, or `DATABASE_URL` with the name swapped; created if missing). The schema comes from the real migration; tables are emptied after each test; DB tests skip if Postgres is down. They cover the schema, constraints, migration round trip, seed and health, and later transitions, ingest idempotency, auth guards and path checks.
