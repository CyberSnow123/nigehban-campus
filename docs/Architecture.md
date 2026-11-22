# Architecture

> How the system is split and how data moves. Shapes are in [Data-Contracts.md](Data-Contracts.md). Product scope is in [Context.md](Context.md). Reasons are in [Decisions.md](Decisions.md).

## 1. Components
| Part | Path | Tech | Owns | Must not |
|---|---|---|---|---|
| Web app | `apps/web` | React, Vite, TS, Tailwind, TanStack Query | Screens, polling, operator actions | Contain detection logic or call cv directly |
| API | `apps/api` | FastAPI, SQLAlchemy 2, Alembic | Auth, alerts, runs, cameras, ingestion, snapshot files, launching cv runs | Run ML models |
| CV worker | `services/cv` | Python, Ultralytics YOLO26n, ByteTrack, OpenCV | Reading video, detection, tracking, association, event decisions, run outputs | Write to the DB (only POST to the API) |
| Contracts | `packages/contracts` | Pydantic v2 | Shared models and enums for api and cv | Contain logic |
| Database | docker `postgres:16` | PostgreSQL | Users, cameras, runs, alerts, alert_actions | Store images or video |

Ports: web `5173`, api `8000`, postgres `5432`.

## 2. Runtime flow
```
 Operator ──(browser)──▶ apps/web ──poll 3s──▶ apps/api ◀──▶ PostgreSQL
                                                 │  ▲
                              spawn worker (run) │  │ POST /api/ingest/events (+snapshot)
                                                 ▼  │ POST /api/ingest/runs/{id}/status|frame
                                             services/cv
                                     video ▶ detect ▶ track ▶ geometry ▶ associate
                                                 ▶ abandon / theft monitors ▶ EventSink
                                                 ▶ data/outputs/{run_id}/ (mp4, events.csv, fps.json)
```
1. An operator starts a run (camera + video file + source `mock|real`). The API creates a `run` (`queued`) and spawns `nigehban-cv run --run-id …` as a subprocess.
2. The worker posts `status: running`, processes frames, pushes the latest annotated frame about once a second, and POSTs a `DetectionEvent` plus snapshot for each alert.
3. The API validates the event, saves the snapshot to `data/snapshots/{run_id}/{event_id}.jpg`, and creates an `alert` (`active`).
4. The web app polls `/api/alerts`, `/api/stats` and `/api/runs/{id}` every 3 s, and shows new alerts.
5. The operator acknowledges, then closes the alert with an outcome. Each step is written to `alert_actions`.
6. Stop: the API terminates the subprocess and marks the run `stopped`. When the video ends, the worker posts `completed`.

The worker can also run standalone from the CLI (for experiments). It then creates its own run with `POST /api/ingest/runs`.

## 3. CV worker internals
Each stage sits behind an interface (`services/cv/nigehban_cv/stages/`). A run composes either the mock or the real implementation:

| Stage | Interface | FYP-1 | FYP-2 |
|---|---|---|---|
| Video input | `FrameSource` | file (OpenCV) | + RTSP |
| Detection | `Detector` | **real**, pretrained YOLO26n | fine-tuned YOLO26n |
| Tracking | `Tracker` | **real**, ByteTrack | tuned |
| Geometry and association | `Associator` | **real**, simple | robust |
| Abandoned-bag logic | `AbandonMonitor` | **real**, simple timer | tuned |
| Owner fingerprint | `OwnerMatcher` | **mock** | CLIP / ReID |
| Theft logic | `TheftMonitor` | **mock** (scripted) | real |
| Output | `EventSink` | `ApiSink` + `CsvSink` | same |

`--source mock` replaces the whole pipeline with a `ScenarioPlayer` that replays scripted events from `services/cv/scenarios/*.json` against a video. Its events are `source: mock`, so the API stores them with `is_demo = true` and the UI shows a **Demo data** badge (D-06). Details are in [CV-Pipeline.md](CV-Pipeline.md).

## 4. Cross-cutting rules
- **Contracts first:** change `Data-Contracts.md`, then `packages/contracts`, then regenerate the web types.
- **One write path:** only the API writes to PostgreSQL (D-11).
- **Auth:** humans use a JWT bearer token (login). The worker uses an `X-Worker-Key` header. Snapshots and frames need a logged-in user.
- **Config:** API settings come from `.env` (`DATABASE_URL`, `JWT_SECRET`, `WORKER_KEY`, `DATA_DIR`). CV behaviour comes from `services/cv/config.json` only.
- **Storage:** `DATA_DIR` (default `./data`) holds `videos/`, `snapshots/`, `outputs/`, `frames/` and is git-ignored. No video archive: only snapshots and outputs.
- **Time:** detection logic uses `video_ts_s`. Stored timestamps are UTC.
- **Privacy:** no names or face recognition. Track IDs are per-run integers.

## 5. Deployment (FYP scope)
Everything runs on one machine: `docker compose up -d` (Postgres), `uv run` for api and cv, `bun dev` for web. A GPU is optional (YOLO falls back to CPU). No cloud deployment is planned.
