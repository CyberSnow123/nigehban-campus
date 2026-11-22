# Phase 06: Ingestion API
Branch: `feature/phase-06-ingestion` (from `main`, which now contains Phase 5) · Status: done (awaiting owner review/merge; decisions 1-4 approved 2026-11-23) · Owner: Farooq khan

## Goal
The CV worker can register a run, post status heartbeats, push the latest frame and send detection events with a snapshot, all through `/api/ingest/*` with the `X-Worker-Key` header (D-11). Each new event becomes an `active` alert with a `ref_code` and a stored snapshot. A resent event creates nothing, and a failed insert leaves no orphan file.

## Build and merge order (approved 2026-11-23)
Phases 6 and 7 are built one after the other, each committed on its own branch:
`main` → `feature/phase-06-ingestion` → `feature/phase-07-alerts` (branched from the Phase 6 branch, because Phase 7 needs the ingest routes to test with real alerts). Nothing is merged until the owner has reviewed both. Then Phase 6 is merged into `main` first and Phase 7 second. If the review changes Phase 6, the Phase 7 branch is rebased on it before its own merge.

## Decisions taken while planning
| # | Unclear point | Decision |
|---|---|---|
| 1 | Ingest-run body (left open in Phase 2) **(approved)** | New contract `IngestRunCreate {camera, source, video_path}`, where `camera` is the camera **name** (`"CAM 01"`). The standalone CLI only knows `--camera "CAM 01"`, and the worker cannot call the user-only `GET /api/cameras`. Names are unique (Backend §4). Response `201 Run`. An unknown name is `404 NOT_FOUND` and an inactive camera is `422 VALIDATION_ERROR`. |
| 2 | Status of a run created by the worker **(approved)** | Created as `running` with `started_at = now`, because the worker is already running when it registers. Runs created by the API in Phase 12 start as `queued`, and the worker then posts `running`. `is_demo = (source == "mock")`, as the DB check requires. |
| 3 | Run status rules **(approved)** | A new table in contracts, `RUN_TRANSITIONS` and `can_update_run(from, to)`: `queued → running, stopped, failed`, and `running → running (heartbeat), completed, stopped, failed`. `completed`, `stopped` and `failed` are terminal. Any post to a terminal run is `409 RUN_NOT_RUNNING`. The first `running` sets `started_at` if it is empty, and a terminal status sets `ended_at`. `frames_processed` and `fps` are overwritten on every post (they are totals, not deltas). |
| 4 | `video_path` rules **(approved)** | Checked for shape only: relative, no `..`, no drive letter or leading slash, stored with `/`, at most 255 characters. Otherwise `422`. The file's **existence** is not checked here, because a standalone worker may read a clip that is not in `DATA_DIR/videos`. Phase 12 checks existence for runs started from the UI. |
| 5 | Worker key | `require_worker` dependency in `routers/deps.py`. It compares `X-Worker-Key` against `WORKER_KEY` with `hmac.compare_digest`. A missing or wrong key is `401 UNAUTHORIZED` without the `WWW-Authenticate: Bearer` header, because that header is for user tokens. Ingest routes have no user auth and no rate limit. |
| 6 | Order of checks in `POST /api/ingest/events` | (1) worker key, (2) `event` field parsed with `DetectionEvent.model_validate_json` (`422`, field messages only, no input echoed), (3) **duplicate check on `event_id` first**, returning `200 {alert_id, duplicate: true}`. This way a retry that arrives after the run has ended is still answered as a duplicate rather than a 409. Then (4) the run exists (`404`), (5) the run is `running` (`409 RUN_NOT_RUNNING`), (6) `camera_id` equals the run's camera and `source` equals the run's source (`422`; a mock run can never produce a real alert, D-06), and (7) the snapshot is valid. |
| 7 | Snapshot checks | Required. Must start with the JPEG magic bytes `FF D8 FF` and be at most 2 MB. The upload is read in chunks and stops once 2 MB is passed. A bad snapshot is `422 VALIDATION_ERROR`, so no new error code is needed. No image decoding (no Pillow dependency). |
| 8 | Idempotency under concurrency | Inside the insert transaction: `pg_advisory_xact_lock` on a hash of `event_id`, then the duplicate check. Two identical requests are processed one after the other, so the second one can never delete the first one's file. A unique-violation on `event_id` is still caught as a safety net and answered as a duplicate. |
| 9 | `ref_code` under concurrent ingest (carried from Phase 3) | `next_ref_code` takes `pg_advisory_xact_lock` on a fixed per-year key before reading the highest number, so two events in parallel get different numbers. The unique key stays as the safety net. |
| 10 | Snapshot write and rollback | `storage.save_snapshot` writes `DATA_DIR/snapshots/{run_id}/{event_id}.jpg` through a temp file and `os.replace`. The alert row is inserted and committed after that. If the insert or commit fails, the file is deleted and the error is re-raised (500, logged). `snapshot_path` is stored relative to `DATA_DIR`. File paths never appear in responses. |
| 11 | Frame push | `POST /api/ingest/runs/{id}/frame`, multipart `frame`, same JPEG checks with a 2 MB limit. Saved to `DATA_DIR/frames/{run_id}.jpg` by temp file and `os.replace`, so a reader in Phase 12 never sees half a file. Allowed only while the run is `running` (`409` otherwise). Answer `204`. The API does not enforce "1 per second": that is the worker's job (`frame_push_interval_s`). |
| 12 | Status response | `POST /api/ingest/runs/{id}/status` returns `200 Run`. An unknown run is `404`. |
| 13 | Layout | Thin `routers/ingest.py`. The logic sits in `services/run_service.py` (create, status update), `services/ingest_service.py` (event orchestration: idempotency, checks, rollback), `services/alert_service.py` (build the `Alert` row from a `DetectionEvent`; Phase 7 adds the transitions here) and `services/storage.py` (all file I/O under `DATA_DIR`, temp-and-replace, safe delete). |
| 14 | Dev script | `apps/api/scripts/post_fake_event.py --camera "CAM 01" --type abandoned_bag\|possible_theft [--source mock] [--api-url http://localhost:8000] [--finish]`. It goes through the real API: register a run, post one event with the seed's "DEMO DATA" placeholder JPEG, and with `--finish` post `completed`. It always sends `source: mock` unless `--source real` is passed, and it prints the alert ID and `ref_code`. It reads `WORKER_KEY` from `.env` and uses `httpx`, which stays in the root dev group: `uv sync` installs that group, and the script is a dev tool. |

## Plan
**Contracts first (packages/contracts)**
1. `docs/Data-Contracts.md` §4: `IngestRunCreate`, the run status table, the status and frame responses, and the 2 MB frame limit. §6: list the codes ingest uses.
2. `nigehban_contracts/runs.py`: `IngestRunCreate` (with the `video_path` shape check). `transitions.py`: `RUN_TRANSITIONS`, `can_update_run`. Export both. Tests: valid and invalid paths (`..`, `/abs`, `C:\x`, empty, too long), and every allowed and rejected run move.

**API (apps/api)**
3. `services/storage.py`: `save_snapshot(run_id, event_id, data) -> relative path`, `save_frame(run_id, data)`, `delete(relative path)` (never outside `DATA_DIR`), and `read_jpeg_upload(upload, max_bytes)` (chunked size limit plus magic bytes).
4. `services/ref_codes.py`: the advisory lock (decision 9). Update its docstring and Backend §4.
5. `services/run_service.py`: `create_run(db, body) -> Run`, `apply_status(db, run_id, update) -> Run`.
6. `services/alert_service.py`: `alert_from_event(event, run, snapshot_path, ref_code) -> Alert`, and a `to_read_model` stub only if needed.
7. `services/ingest_service.py`: `ingest_event(db, event, snapshot) -> IngestEventResponse` with the order of decision 6 and the rollback of decision 10.
8. `routers/deps.py`: `require_worker`. `routers/ingest.py`: the four routes, with `ERROR_RESPONSES` (plus 404 and 409) for OpenAPI. Wire it into `main.py`.
9. `scripts/post_fake_event.py`.
10. Tests (`tests/test_ingest_*.py`, with `DATA_DIR` pointed at `tmp_path` through an env override and a `get_settings` cache clear):
    - **auth:** missing or wrong key gives 401 on all four routes, and a user JWT is not accepted.
    - **runs:** create gives 201 and `running` with `is_demo` from the source; an unknown camera gives 404; an inactive camera gives 422; a bad `video_path` gives 422; every status move from decision 3 (allowed gives 200, terminal gives 409); `started_at` and `ended_at` are set.
    - **events:** a valid abandoned and a valid theft event give 201, an `active` alert, the right `ref_code` suffix, `is_demo` matching the source, and the file on disk; a resend gives 200 `duplicate: true` with the same `alert_id` and no second row or file; a resend after the run completed is still 200 duplicate; an unknown run gives 404; a run that is not running gives 409; a camera or source mismatch gives 422; a theft field on an abandoned event gives 422 without the input echoed; bad JSON in `event` gives 422; a missing, non-JPEG or over-2 MB snapshot gives 422; a forced DB failure (monkeypatched) leaves no file behind.
    - **concurrency:** two threads posting the same `event_id` end with one alert and one file; N parallel different events get N distinct, consecutive `ref_code`s.
    - **frame:** 204 with the file replaced; not running gives 409; non-JPEG gives 422.

**Web**
11. `bun run gen:api` to regenerate `openapi.json` and `schema.d.ts` (the freshness test requires it). No UI work: alerts appear in the UI in Phase 7.

## Contract / doc changes
- `Data-Contracts.md` §4 (decisions 1, 2, 3, 11, 12) and §6 (which codes ingest returns).
- `packages/contracts`: `IngestRunCreate`, `RUN_TRANSITIONS`, `can_update_run`, plus tests.
- `Backend.md` §3 (request and response of each ingest route), §4 (`ref_code` locking is done), §5 (the check order, idempotency lock, snapshot and frame rules, worker-key 401).
- `Folder-Structure.md`: `services/{run_service,ingest_service,alert_service,storage}.py`, `scripts/post_fake_event.py`.
- README: how to post a fake event.
- No migration: the Phase 3 schema already has every column.

## Verification
```
uv run pytest && uv run ruff check . && uv run ruff format --check .
cd apps/web && bun run gen:api && git diff --exit-code src/lib/api   # types up to date
cd apps/web && bun run lint && bun run typecheck && bun run test && bun run build
```
Runtime (`/verify`): with uvicorn on :8000, use curl to (1) register a run with the worker key (201) and without it (401), (2) post a valid event with a JPEG (201), then the same one again (200 duplicate), (3) post a theft field on an abandoned event (422, shape checked, no echo), (4) post `completed`, then another event (409) and the first event again (200 duplicate), (5) push a frame (204, file replaced under `data/frames/`). Then run `uv run python scripts/post_fake_event.py --camera "CAM 01" --type possible_theft --finish` and check in psql that the alert is `active`, `is_demo = true`, and that `snapshot_path` exists under `data/`.

## Acceptance
- [x] A posted event appears as an `active` alert with its snapshot (tests, curl and `post_fake_event.py` against the dev DB; the snapshot file was checked on disk).
- [x] No duplicates under retry, including parallel retries (8 threads, one alert and one file).
- [x] 201 valid, 200 duplicate, 401 wrong key, 409 run not running, 422 theft field on an abandoned event.
- [x] A failed insert leaves no snapshot file.
- [x] Mock events always give `is_demo = true` (D-06), and a mock run cannot send a `real` event.

## What changed (filled at the end)
- **Contracts:** `IngestRunCreate` and `check_video_path` (`runs.py`), `RUN_TRANSITIONS` and `can_update_run` (`transitions.py`), the `ingest_run` example, and `tests/test_runs.py` (path rules, every run status cell). `Data-Contracts.md` §4 (ingest-run body, status table, responses, check order) and §6 (`DUPLICATE_EVENT` is reserved, `RUN_NOT_RUNNING` is 409).
- **API added:** `routers/ingest.py` (four routes behind `require_worker`), `services/{storage,run_service,ingest_service,alert_service}.py`, `db/locks.py` (advisory transaction locks), `scripts/post_fake_event.py`.
- **API changed:** `routers/deps.py` (`require_worker`, constant-time key check), `core/errors.py` (`not_found`, `run_not_running`, `worker_unauthorized`, `INGEST_ERROR_RESPONSES`, a 401 without `WWW-Authenticate` for the worker key, a shared `field_messages`), `services/ref_codes.py` (per-year lock), `main.py`.
- **Web:** regenerated `openapi.json` and `schema.d.ts`. No UI change.
- **Tests:** `test_ingest_runs.py`, `test_ingest_events.py`, `test_ingest_concurrency.py`, `test_storage.py`, a broken-JSON case in `test_errors.py`, and ingest fixtures in `conftest.py`. `pyproject.toml` lists `tests` as first-party for import sorting. Totals: 554 Python tests (was 425) and 105 web tests. ruff, eslint, `tsc` and `vite build` are clean.
- **Runtime check (dev DB on :5433, uvicorn :8000):** no key gave 401; register gave 201 `running` with `is_demo` true; event 201; resend 200 duplicate with the same `alert_id`; theft field on an abandoned event gave 422 without echoing the value; frame 204 with `data/frames/{run_id}.jpg` written; `completed` gave 200 with `ended_at` set; then a new event and a frame each gave 409, and the first event again gave 200 duplicate. `post_fake_event.py --type possible_theft --finish` made `SEC-2026-010-T`, numbered after the seed's 8 alerts. An unknown camera gave a clean 404 message. This left two demo runs and two demo alerts (both `is_demo = true`) in the dev DB; reseeding does not remove them.
- **Lock check:** with the advisory locks switched off for a moment, the parallel ref-code test failed (duplicate numbers), as it should. The parallel-retry test still passed, because the unique `event_id` key is answered as a duplicate.
- **Fixed while building:** a broken JSON body was reported as `55: JSON decode error` (a character offset shown as a field name, a Phase 4 leftover). It is now `body: JSON decode error`.
- **Decisions taken:** the 14 above. None change `Decisions.md`.
- **Known gaps carried forward:**
  - No API rate limit on ingest. The worker key is the only guard, and the worker paces frames itself.
  - On Windows, `os.replace` of a frame can fail while another process holds the old file open. Phase 12's frame reader should open, read and close quickly; a retry may be needed there.
  - A worker that dies without posting a final status leaves its run `running`. Phase 12 marks dead-PID runs `failed` on startup, but only for runs it started (standalone CLI runs have no PID).
  - Snapshots are checked by their magic bytes only, not decoded, so a corrupt JPEG with a valid header is accepted.
  - Alerts are not visible in the UI yet (Phase 7).
