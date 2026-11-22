"""Alert rows. Phase 6: build a new alert from a detection event. Phase 7 adds the operator
transitions (acknowledge, close) here."""

from nigehban_contracts import AlertStatus, DetectionEvent

from app.models import Alert, Run


def alert_from_event(event: DetectionEvent, run: Run, snapshot_path: str, ref_code: str) -> Alert:
    """A new ``active`` alert. ``is_demo`` comes from the run (D-06), never from the event."""
    return Alert(
        ref_code=ref_code,
        event_id=event.event_id,
        type=event.type.value,
        status=AlertStatus.ACTIVE.value,
        is_demo=run.is_demo,
        camera_id=run.camera_id,
        run_id=run.id,
        occurred_at=event.occurred_at,
        video_ts_s=event.video_ts_s,
        bag_track_id=event.bag.track_id,
        bag_class=event.bag.class_.value,
        bag_bbox=list(event.bag.bbox),
        owner_track_id=event.owner_track_id,
        carrier_track_id=event.carrier_track_id,
        separation_s=event.separation_s,
        owner_distance_m=event.owner_distance_m,
        owner_away_s=event.owner_away_s,
        confidence=event.confidence,
        owner_match=event.owner_match,
        snapshot_path=snapshot_path,
    )
