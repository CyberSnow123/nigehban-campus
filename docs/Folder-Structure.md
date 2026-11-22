# Folder Structure

> Where things live. If a new file doesn't fit here, update this doc in the same change.

```
nigehban-campus/
├─ CLAUDE.md                 agent entry point (read first)
├─ README.md                 human quick start
├─ docker-compose.yml        postgres:16 (volume pgdata)
├─ .env.example              API env template (never commit .env)
├─ pyproject.toml            uv workspace root (+ uv.lock, .python-version)
├─ .gitattributes            LF line endings
├─ .gitignore                data/, .env, node_modules, .venv, *.pt, dataset clips
│
├─ apps/
│  ├─ web/                   React app → docs/Frontend.md
│  │  ├─ src/{app,components,layout,features,lib,styles}   (tokens.css arrives in Phase 5)
│  │  ├─ package.json  vite.config.ts  tsconfig.json  eslint.config.js
│  └─ api/                   FastAPI → docs/Backend.md
│     ├─ app/{core,db,models,schemas,routers,services,seed}   (seed/assets: demo placeholder JPEG)
│     ├─ alembic.ini  alembic/versions/  scripts/seed.py  tests/
│     └─ pyproject.toml
│
├─ services/
│  └─ cv/                    CV worker → docs/CV-Pipeline.md
│     ├─ nigehban_cv/{stages,real,mock,sinks}
│     ├─ scenarios/  config.json  tests/
│     └─ pyproject.toml
│
├─ packages/
│  └─ contracts/             shared Pydantic models → docs/Data-Contracts.md
│     ├─ nigehban_contracts/{base,ids,enums,transitions,events,alerts,runs,common,config}.py
│     ├─ tests/ (+ fixtures/examples.json: one example per Data-Contracts shape)
│     └─ pyproject.toml
│
├─ dataset/                  → docs/Dataset.md (metadata only in git)
│  ├─ manifest.csv
│  └─ tools/                 manifest check, coverage report, frame sampler (FYP-2)
│
├─ data/                     GIT-IGNORED runtime data (DATA_DIR)
│  ├─ videos/                input videos for runs
│  ├─ snapshots/{run_id}/    alert snapshots (API-owned)
│  ├─ frames/{run_id}.jpg    latest live frame
│  └─ outputs/{run_id}/      annotated.mp4, events.csv, fps.json
│
├─ prototype/dashboard.html  approved UI reference (read-only)
├─ diagrams/uml/             UML and DFD images
└─ docs/
   ├─ Context.md  Decisions.md  Architecture.md  Data-Contracts.md
   ├─ Backend.md  Frontend.md  CV-Pipeline.md  Dataset.md  Folder-Structure.md
   ├─ master-roadMap-plan.md
   └─ phases/                phase-XX.md, one per phase, written when the phase starts
```

## Rules
- Python packages (`apps/api`, `services/cv`, `packages/contracts`) form a **uv workspace** from a root `pyproject.toml`. api and cv depend on `nigehban-contracts` as a workspace member.
- `apps/web` is standalone (`bun`). It never imports Python code, only the generated `schema.d.ts`.
- Raw clips and model weights (`*.pt`) never go into git. Keep clips in a shared drive and track them in `dataset/manifest.csv`.
- Tests sit next to the code they test (`apps/api/tests`, `services/cv/tests`, `apps/web/src/**/*.test.tsx`).
- File names: Python `snake_case.py`, React components `PascalCase.tsx`, hooks `useX.ts`.
