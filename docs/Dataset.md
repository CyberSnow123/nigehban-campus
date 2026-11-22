# Dataset

> The custom campus dataset. FYP-1 target **~150 clips**. FYP-2 target **~500** (D-02). Training is deferred to FYP-2 (D-01), so in FYP-1 the dataset is recorded, organised and documented, not labelled.

## 1. Recording protocol
- **Device:** iPhone 13 Pro Max, 1080p, 30 fps, landscape, stabilisation on.
- **Mount:** tripod or shelf, **raised and angled down** where possible (similar to CCTV). Record about 20% at eye level for variety.
- **Length:** 20–90 s per clip. Start recording ≥ 5 s before the action and keep going ≥ 10 s after it.
- **Scene:** the whole action stays in frame. Vary the room area, background and lighting (day, evening, lights off near the window).
- **People:** rotate actors and clothing. Log actor IDs (A01…) only, no names.
- **Consent:** every actor signs a consent form before recording. Forms are stored offline, not in git.

## 2. Scenario coverage (target share of clips)
| Code | Scenario | Share |
|---|---|---|
| `ABN` | Owner leaves the bag and walks away (out of frame or far) | 25% |
| `THF` | Non-owner picks up the bag while the owner is away and walks off | 25% |
| `NRM-SIT` | Owner puts the bag down and stays near it | 10% |
| `NRM-RET` | Owner leaves briefly and returns before the threshold | 10% |
| `NRM-OWN` | Owner picks up their own bag and leaves | 10% |
| `NRM-HND` | Owner hands the bag to a friend (owner present) | 5% |
| `NRM-PASS` | People walk past or stand near a bag | 10% |
| `HARD` | Crowding, occlusion, two bags, similar clothing | 5% |

Normal (`NRM-*`) clips are about 45% of the total. These measure false alarms, so don't skip them.
Bag mix: roughly half `handbag` and half `backpack`, across ≥ 8 distinct bags.

## 3. Naming and layout
Clip name: `<SCENARIO>_<LOC>_<YYYYMMDD>_<NNN>.mp4`, e.g. `THF_OFF1_20261123_007.mp4`.
```
<shared drive>/nigehban-dataset/raw/<SCENARIO>/<clip>.mp4      raw clips (never in git)
dataset/manifest.csv                                            in git
```

## 4. `dataset/manifest.csv`
`clip_id,file,scenario,location,date,duration_s,actors,bags,bag_classes,camera_height,lighting,event_start_s,event_end_s,owner_actor,taker_actor,split,notes`
- `event_start_s` and `event_end_s` give the ground-truth moment of abandonment or pickup. They are used for event-level evaluation (Phase 18).
- `split` is empty in FYP-1. In FYP-2 it is filled with `train|val|test`.

## 5. Rules
- **Split by clip, never by frame.** Also keep at least one location and some actors only in `test`.
- Frames for YOLO labelling (FYP-2) are sampled at 1–2 fps per clip, near-duplicates are removed, and labels cover `person, handbag, backpack` only.
- `dataset/tools/check_manifest.py` checks names, missing files and scenario counts. `coverage.py` prints the table in §2 against actual counts (used as report evidence).
