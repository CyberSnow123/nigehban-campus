# Phase 02: Shared contracts and type generation
Branch: `feature/phase-02-contracts` · Status: done · Owner: Farooq khan

## Goal
Implement [Data-Contracts.md](../Data-Contracts.md) as Pydantic v2 models in `packages/contracts/nigehban_contracts`, so api and cv share one source of truth (D-05). Contracts only: no API routes, no DB, no CV logic.

## Decisions taken while planning (also written into Data-Contracts.md, step 1)
| # | Unclear point | Decision |
|---|---|---|
| 1 | `bag.class` is a Python keyword | Field `class_` with `alias="class"`, `populate_by_name=True`. JSON and OpenAPI keep `class`. |
| 2 | Which fields are required per event type | `abandoned_bag`: `separation_s` required, `carrier_track_id`, `owner_away_s`, `owner_match` must be null. `possible_theft`: `carrier_track_id`, `owner_away_s`, `owner_match` required, `separation_s` must be null. |
| 3 | ID format | `<prefix>_<26-char Crockford ULID>`, uppercase. Generation uses `python-ulid`. Each field checks its own prefix (`event_id` → `evt_`, `run_id` → `run_`, …). |
| 4 | `bbox` rules | 4 numbers, `x1 >= 0`, `y1 >= 0`, `x2 > x1`, `y2 > y1`. |
| 5 | Timestamps | `occurred_at` must be timezone-aware and is normalised to UTC. `video_ts_s >= 0`. Extra keys are rejected (`extra="forbid"`) on every contract model. |
| 6 | Run status a worker may post | `running`, `completed`, `stopped`, `failed` only (never `queued`). `fps >= 0`, `frames_processed >= 0`. |
| 7 | `Run.video_path` vs "file paths are never returned" (Backend §5) | Keep the field name. Its value is the file name relative to `DATA_DIR/videos` (e.g. `office_01.mp4`), never an absolute path. |
| 8 | `ErrorBody` code list | Add a `ErrorCode` enum with the 8 codes from §6. |
| 9 | Close outcomes | `CloseRequest.outcome` is limited to the 4 closed statuses. `note` max 500 chars. `possible_theft`-only outcomes are checked by `can_transition` (service layer), not by the request model. |
| 10 | "Type generation" in the phase title | TS types come from the API's OpenAPI (`bun run gen:api`, Phase 4). Phase 2 only guarantees every public model builds a valid JSON Schema (tested). No web changes here. |
| 11 | Models not in Data-Contracts (login, create run, camera create/update, settings PATCH, `POST /api/ingest/runs` body) | Out of scope. API-only ones go to `apps/api/app/schemas` in their phase. Shared ones (ingest run body, settings subset) are added contracts-first in Phases 6 and 12. |

## Plan
1. **Doc first.** Update `docs/Data-Contracts.md` with decisions 1-9 (short notes under §1, §3, §4, §5, §6). Then code.
2. **Dependency.** Add `python-ulid` to `packages/contracts/pyproject.toml`; `uv sync`.
3. **Files in `packages/contracts/nigehban_contracts/`** (each small and single-purpose):
   - `base.py`: `ContractModel` (`extra="forbid"`, `populate_by_name=True`) and shared strict number types `Unit` (0-1), `FiniteFloat`, `NonNegFloat`, `PositiveFloat`, `NonNegInt`, `PositiveInt`, plus `UtcDatetime`.
   - `ids.py`: `IdPrefix` enum, `new_id(prefix)`, `validate_id(value, prefix)`, typed aliases `EventId`, `AlertId`, `ActionId`, `RunId`, `CameraId`, `UserId`; `format_ref_code(year, seq, type)` and a `RefCode` pattern type (`SEC-YYYY-NNN-A|T`).
   - `enums.py`: `StrEnum`s `EventType`, `BagClass`, `EventSource`, `AlertStatus`, `RunStatus`, `UserRole`, `ActionType`, `ErrorCode`, plus `OPEN_STATUSES`, `CLOSED_STATUSES`, `WORKER_RUN_STATUSES`.
   - `transitions.py`: `ALLOWED_TRANSITIONS` and `can_transition(type, from_status, to_status)`, `allowed_outcomes(type)`.
   - `events.py`: `BBox`, `BagInfo`, `DetectionEvent` (model validator for type-conditional rules), `IngestEventResponse`.
   - `runs.py`: `RunStatusUpdate`, `Run`, `Camera`.
   - `alerts.py`: `CameraRef`, `Alert`, `AlertAction`, `CloseRequest`, `Stats`.
   - `common.py`: `Page[T]`, `ErrorBody` (+ `ErrorDetail`), `UserMe`, `UserRef`.
   - `config.py`: `CvConfig` and its sections (`DetectorConfig`, `TrackerConfig`, `AssociationConfig`, `AbandonConfig`, `TheftConfig`, `OutputConfig`, `ApiConfig`), defaults exactly as Data-Contracts §7, `extra="forbid"`, range checks (ratios > 0, frames >= 1, `conf` in 0-1, `device` in `auto|cpu|mps|cuda|cuda:N`).
   - `__init__.py`: re-export the public models (keep `__version__`).
4. **Tests in `packages/contracts/tests/`** with fixtures in `tests/fixtures/*.json` (every JSON example from Data-Contracts, with valid ULIDs instead of `…`):
   - `test_ids.py`: generated IDs match the format; wrong prefix, lowercase, bad length, bad ULID chars rejected; ref_code format and rejection.
   - `test_enums_transitions.py`: every cell of the transition table (6 statuses × 2 types × 6 targets), same-status moves rejected, outcomes by type, open/closed sets.
   - `test_events.py`: theft and abandoned examples parse; theft-only field on abandoned rejected; abandoned-only field on theft rejected; missing required field rejected; bad `schema_version`, bbox, confidence range, naive datetime, unknown key; `class` alias round-trips; JSON round-trip is lossless.
   - `test_runs_alerts_common.py`: Alert, AlertAction, Run, Camera, UserMe, Stats, Page, ErrorBody, CloseRequest, RunStatusUpdate examples parse; invalid status or outcome rejected.
   - `test_config.py`: §7 example parses; `CvConfig()` equals the example (defaults); unknown key rejected; missing keys fall back; out-of-range values rejected.
   - `test_json_schema.py`: `model_json_schema()` works for every exported model and `Page[Alert]` (OpenAPI-ready).
5. **Docs.** Update `docs/Folder-Structure.md` (new contract files `base.py`, `transitions.py`, `common.py`), `docs/Decisions.md` only if a decision affects later phases (none expected; D-14 candidate: ID format), fill "What changed" below.

## Contract / doc changes
`Data-Contracts.md` (clarifications only, no field renames), `Folder-Structure.md`, this file.

## Verification
```
uv sync
uv run pytest packages/contracts --cov=nigehban_contracts --cov-fail-under=95
uv run pytest                      # all Python tests still green
uv run ruff check . && uv run ruff format --check .
cd apps/web && bun run lint && bun run typecheck && bun run test   # unchanged, still green
```
Manual: `uv run python -c "from nigehban_contracts import *; print(new_id('alt'))"` prints a valid ID.

## Acceptance
- [x] Every JSON example in Data-Contracts.md has a fixture and a passing test.
- [x] Bad prefixes, theft-only fields on abandoned events, bad transitions and unknown config keys are rejected.
- [x] `uv run pytest packages/contracts` green, coverage >= 95%.
- [x] No imports from `apps/` or `services/` inside contracts; only `pydantic` and `python-ulid`.
- [x] Data-Contracts.md and the code agree (same field names, same rules).

## What changed (filled at the end)
- Files added or changed: `packages/contracts/nigehban_contracts/{base,ids,enums,transitions,events,alerts,runs,common,config}.py` and `__init__.py`; `packages/contracts/tests/*` with `fixtures/examples.json`; `python-ulid` dependency; `Data-Contracts.md` clarifications; `Folder-Structure.md`.
- Results: 267 contract tests pass, coverage 100%; whole repo 270 tests; ruff clean; web checks unchanged.
- Runtime verification (`/verify`, see `.claude/skills/verify`): contracts driven through the public import, a scratch FastAPI app (OpenAPI keeps `class`, `Page_Alert_`, fixed 4-item bbox; 201 on a valid event, 422 on a theft field in an abandoned event).
- Fixes from verification: numbers and flags made strict (bools, numeric strings, NaN and infinity rejected; `schema_version: true` rejected), covered by `tests/test_strictness.py`. Documented in Data-Contracts §1.
- Note: ULIDs created in the same millisecond differ only in their last characters (monotonic ULIDs). Valid and unique; expected.
- Decisions taken: the 11 in the table above. Extra: `Alert.acknowledged_by` is `{id, display_name}` or null (documented). `ActionType` enum added for `AlertAction.action`. Theft events require carrier, owner_away_s and owner_match (kept). ID format not added to Decisions.md (already in Data-Contracts).
- Known gaps carried to a later phase: settings-subset model (Phase 12), ingest-run body (Phase 6), TS type generation (Phase 4), and the 422 error handler mapping FastAPI's `{"detail": [...]}` to `VALIDATION_ERROR` without echoing input (Phase 4, written into Backend.md §5).
