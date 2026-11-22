# Nigehban Campus — Decisions Log

> Records planning decisions, with the reason for each. Update this file when a decision changes. [Context.md](Context.md) holds the product definition; this file holds how and why the plan was shaped.

Last updated: 2026-11-22

---

## Why this revision

The FYP-1 progress check expects about 40% of the work to be shown this week. Dataset collection only started the day before, and ~500 clips cannot be recorded, cleaned and labelled in time. A half-finished dataset cannot be defended in front of the jury. The plan was reshaped so the work shown is real, honest and complete for what it claims to be.

---

## Decisions

### D-01: Defer model training to FYP-2
- **Decision:** No YOLO training in FYP-1.
- **Why:** A rushed model on an incomplete dataset would be weak and hard to defend. Training is better done once the dataset is finished.
- **Effect:** FYP-1 documents the training plan (model choice, augmentation, split strategy). FYP-2 executes it.

### D-02: Collect ~150 clips for FYP-1
- **Decision:** FYP-1 target is about 150 clips. The ~500 clip target moves to FYP-2.
- **Why:** 150 is achievable and enough to show a real, organised dataset.
- **How to apply:** Prioritise variety (people, bags, positions, lighting) over count. Include "normal" behaviour clips, not only theft and abandonment. Write down the recording protocol and a scenario coverage table.

### D-03: Build frontend, backend and database for real; mock part of the CV services
- **Decision:** The web dashboard (with mobile view), backend and database are built properly in FYP-1. CV/ML services that are not ready sit behind a mock.
- **Why:** This is where most of the visible FYP-1 progress can be made in the time available, and it leaves FYP-2 as "plug the ML in".

### D-04: Use pretrained YOLO for a real baseline (refinement of D-03)
- **Decision:** Detection and tracking are **not** mocked. Pretrained YOLO26n (COCO already has person, handbag, backpack) plus ByteTrack runs on the recorded clips.
- **Why:** An all-mock CV layer would leave the jury asking what the computer-vision work in FYP-1 was. The pretrained baseline needs no training and is quick to set up.
- **Bonus:** Its weakness on bags is a documented finding that justifies fine-tuning on the custom dataset in FYP-2.

### D-05: Single event contract and one CV interface
- **Decision:** Define one event contract (for example `type, timestamp, camera, bag_id, snapshot_path, duration`). The backend consumes only this contract. The CV side sits behind one interface with two interchangeable sources: a mock source and the real pipeline.
- **Why:** In FYP-2, swapping mock for real requires no backend or frontend changes.

### D-06: Mock output is always labelled
- **Decision:** Any alert coming from mock data is flagged as "Demo data" in the UI and stated as simulated in the presentation and report.
- **Why:** Presenting simulated alerts as real detections is dishonest and would hurt credibility if questioned.

### D-07: Backend is Python FastAPI
- **Decision:** The API (`apps/api`) uses FastAPI, SQLAlchemy 2 and Alembic. Python tooling uses `uv`.
- **Why:** It shares a language with the CV pipeline, so there is one toolchain and the Pydantic contracts are shared.

### D-08: Frontend is React + Vite + TypeScript + Tailwind
- **Decision:** `apps/web` is a componentised port of the approved prototype (`dashboard.html`). It uses TanStack Query for server data, `bun` for packages, and TS types generated from the API's OpenAPI schema.
- **Why:** The prototype is the visual reference. React keeps it maintainable as FYP-2 adds features.

### D-09: Dashboard updates by polling every 3 s
- **Decision:** The web app polls the API every 3 s for alerts and run status. No WebSockets or SSE.
- **Why:** This is the simplest reliable option for one or a few operators. It can be upgraded later without changing contracts.

### D-10: PostgreSQL via Docker
- **Decision:** PostgreSQL 16 runs in `docker-compose.yml`. It replaces the earlier SQLite plan.
- **Why:** This was the team's choice. It is closer to a real deployment and every teammate gets the same setup.

### D-11: CV worker posts events to the API; it never touches the DB
- **Decision:** `services/cv` sends each event plus its snapshot to `POST /api/ingest/events`, authenticated with a worker API key. Only the API writes to PostgreSQL.
- **Why:** This gives one write path, one validation point, and mock and real sources that are interchangeable (D-05).

---

## Status by module (FYP-1)

| Module | Status |
|---|---|
| Frontend, backend, database, login | Real |
| YOLO detection (pretrained) and ByteTrack | Real |
| Geometry and owner–bag association | Real, simple version if time allows |
| Abandoned-bag timer | Real, simple version if time allows |
| CLIP owner fingerprint and theft check | Mock (built in FYP-2) |
| Model fine-tuning | Deferred (FYP-2) |
| Dataset | ~150 clips in FYP-1, ~500 target in FYP-2 |

---

## Evidence to show for the 40% mark

1. Dataset progress: clip count, scenario coverage, folder structure, recording protocol.
2. Baseline run: pretrained YOLO and ByteTrack on 3–5 clips, with annotated video and FPS.
3. Working dashboard fed by the event contract.
4. Written justification of model selection and dataset sourcing.
5. Updated diagrams and these documents.

---

## Open items

- Confirm the FYP-1 final presentation date.
- Fix the "Nighban" spelling and diagram inconsistencies noted in review (deliberately postponed for now).
- ~~Choose the backend and frontend stack.~~ Resolved: D-07 to D-10.
- ~~Write the event contract schema.~~ Resolved: [Data-Contracts.md](Data-Contracts.md).
