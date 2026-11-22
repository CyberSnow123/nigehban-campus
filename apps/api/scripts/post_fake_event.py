"""Post one fake detection event through the real ingest API (dev only).

From apps/api, with the API running:
    uv run python scripts/post_fake_event.py --camera "CAM 01" --type possible_theft --finish

It registers a run, posts one event with the "DEMO DATA" placeholder snapshot and prints the new
alert. Events are ``source: mock`` (shown as Demo data, D-06) unless ``--source real`` is given,
which is only for testing the API: no real detection happened.
"""

import argparse
import json
import os
import sys
from datetime import UTC, datetime
from pathlib import Path

import httpx
from nigehban_contracts import EventType, IdPrefix, new_id

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.core.settings import get_settings  # noqa: E402

SNAPSHOT = (
    Path(__file__).resolve().parents[1] / "app" / "seed" / "assets" / "placeholder_snapshot.jpg"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--camera", default="CAM 01", help='camera name, e.g. "CAM 01"')
    parser.add_argument("--type", choices=[t.value for t in EventType], default="abandoned_bag")
    parser.add_argument("--source", choices=["mock", "real"], default="mock")
    parser.add_argument("--video", default="fake_event.mp4", help="video_path to record")
    parser.add_argument(
        "--api-url", default=os.environ.get("NIGEHBAN_API_URL", "http://localhost:8000")
    )
    parser.add_argument("--finish", action="store_true", help="mark the run completed afterwards")
    return parser.parse_args()


def build_event(run: dict, event_type: str) -> dict:
    theft = event_type == EventType.POSSIBLE_THEFT
    return {
        "schema_version": 1,
        "event_id": new_id(IdPrefix.EVENT),
        "type": event_type,
        "run_id": run["id"],
        "camera_id": run["camera_id"],
        "source": run["source"],
        "occurred_at": datetime.now(UTC).isoformat(),
        "video_ts_s": 42.0,
        "bag": {"track_id": 18, "class": "handbag", "bbox": [812, 440, 905, 560]},
        "owner_track_id": 2,
        "carrier_track_id": 12 if theft else None,
        "separation_s": None if theft else 65.0,
        "owner_distance_m": 3.1,
        "owner_away_s": 35.0 if theft else None,
        "confidence": 0.9,
        "owner_match": 0.18 if theft else None,
    }


def check(response: httpx.Response, step: str) -> dict:
    if response.is_error:
        sys.exit(f"{step} failed ({response.status_code}): {response.text}")
    return response.json() if response.content else {}


def main() -> None:
    args = parse_args()
    headers = {"X-Worker-Key": get_settings().worker_key.get_secret_value()}
    with httpx.Client(base_url=args.api_url, headers=headers, timeout=10) as api:
        body = {"camera": args.camera, "source": args.source, "video_path": args.video}
        run = check(api.post("/api/ingest/runs", json=body), "Register run")
        event = build_event(run, args.type)
        files = {"snapshot": ("snapshot.jpg", SNAPSHOT.read_bytes(), "image/jpeg")}
        result = check(
            api.post("/api/ingest/events", data={"event": json.dumps(event)}, files=files),
            "Post event",
        )
        if args.finish:
            status = {"status": "completed", "frames_processed": 1, "fps": 0}
            check(api.post(f"/api/ingest/runs/{run['id']}/status", json=status), "Finish run")

    print(f"run    {run['id']} ({run['source']}{', finished' if args.finish else ', running'})")
    print(f"event  {event['event_id']} ({args.type})")
    print(f"alert  {result['alert_id']}")


if __name__ == "__main__":
    main()
