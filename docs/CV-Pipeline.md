# CV Pipeline (services/cv)

> The Python worker that turns a video into events. Event and config shapes are in [Data-Contracts.md](Data-Contracts.md) §3, §4, §7 and §8. It talks to the API only (D-11).

## 1. Stack
Python 3.11 · `ultralytics` (YOLO26n + built-in ByteTrack) · OpenCV · numpy · httpx · `nigehban_contracts`. Later: `open_clip` or a ReID model (FYP-2). Run with `uv run nigehban-cv …`.

## 2. Layout
```
services/cv/
  nigehban_cv/
    cli.py            `run`, `baseline`, `validate-config`
    config.py         loads + validates config.json (contracts model)
    pipeline.py       composes stages, owns the frame loop and video clock
    stages/           interfaces (Protocols): FrameSource, Detector, Tracker, Associator, AbandonMonitor, OwnerMatcher, TheftMonitor, EventSink
    real/             file_source.py, yolo_detector.py, bytetrack_tracker.py, geometry.py, associator.py, abandon_monitor.py
    mock/             scenario_player.py, mock_owner_matcher.py, mock_theft_monitor.py
    sinks/            api_sink.py (event + snapshot, retries), csv_sink.py, frame_pusher.py
    draw.py           annotation overlay (boxes, IDs, owner lines, timers)
  scenarios/          scripted demo events (*.json)
  config.json
  tests/
```

## 3. Frame loop (real)
```
for frame, video_ts_s in FrameSource:
    dets   = Detector(frame)                     # person / handbag / backpack boxes
    tracks = Tracker(dets)                       # stable track_ids
    links  = Associator.update(tracks, video_ts_s)      # bag → owner state per bag
    events = AbandonMonitor.update(links, video_ts_s)
           + TheftMonitor.update(links, tracks, OwnerMatcher, video_ts_s)
    for e in events: snapshot = crop/annotate(frame); EventSink.emit(e, snapshot)
    draw + write annotated.mp4; FramePusher.maybe_push(frame)   # about once a second
```
- `video_ts_s = frame_index / source_fps`. All timers use this, never wall-clock time.
- Per-bag state: `CANDIDATE → ASSOCIATED → SEPARATING → ALERTED` (matches the activity diagram).
- One alert per bag per separation. Reset when the owner comes back within `near_ratio`.

## 4. FYP-1 rules (simple and explainable)
- **Distance:** measured from the person's foot point (bottom centre of the box) to the bag's centre, divided by the person's box height, which gives a scale-free ratio.
- **Association:** the nearest person with `ratio ≤ association.near_ratio` for `min_frames` consecutive frames becomes the owner.
- **Abandoned:** the owner's ratio is above `abandon.away_ratio`, or the owner's track is lost, for at least `abandon.threshold_s` seconds, then emit `abandoned_bag` with `separation_s`.
- **Bag lost briefly:** keep its state for `tracker.track_buffer` frames before dropping it.

## 5. Mock source (`--source mock`)
`ScenarioPlayer` reads `scenarios/<name>.json` and plays the video while emitting scripted events at given `video_ts_s`:
```json
{ "video": "demo_cafeteria.mp4", "camera": "CAM 03",
  "events": [ { "at_s": 42.0, "type": "possible_theft", "bag": {"track_id": 18, "class": "handbag", "bbox": [812,440,905,560]},
                "owner_track_id": 2, "carrier_track_id": 12, "owner_away_s": 35, "confidence": 0.94, "owner_match": 0.18 } ] }
```
The snapshot is the real frame at `at_s` with the scripted box drawn. Events go out with `source: "mock"`, so the API sets `is_demo = true`.
In **real** runs during FYP-1, `MockTheftMonitor` emits nothing by default. Theft only appears in mock scenarios. It is never presented as real.

## 6. CLI
```
nigehban-cv run --run-id run_… --video data/videos/x.mp4 --source real|mock [--scenario name] [--config config.json]
nigehban-cv run --camera "CAM 01" --video …          # standalone: registers its own run via /api/ingest/runs
nigehban-cv baseline --video … [--no-api]            # detect+track only → annotated.mp4, fps.json (Phase 10 evidence)
nigehban-cv validate-config config.json
```
Env: `NIGEHBAN_WORKER_KEY`, `NIGEHBAN_API_URL` (overrides `config.api.base_url`), `DATA_DIR`.

## 7. Robustness
- `ApiSink` retries 3 times with backoff. On failure the event is still written to `events.csv` and logged. The same `event_id` makes retries safe.
- On SIGTERM: flush the video writer, post `status: stopped`, exit 0. On an exception: post `status: failed` with a short message.
- No GPU: `device: auto` falls back to CPU, and `fps.json` records which device was used.

## 8. Real vs mock by phase
| Phase | Real | Mock |
|---|---|---|
| 9 | — | everything (ScenarioPlayer) |
| 10 | detect + track (pretrained) | events |
| 11 | + association + abandoned alerts | theft |
| 16 | fine-tuned detector | theft |
| 17 | + OwnerMatcher + TheftMonitor | none |

## 9. Tests
Unit tests for geometry ratios, association state machine and abandon timer on synthetic track sequences (no model). One smoke test runs `baseline` on a 5 s clip when weights are available.
