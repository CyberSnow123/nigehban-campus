"""Dev seed content: users, cameras (prototype names) and demo alerts. Pure data, no DB access.

Every alert here is demo data (D-06). Times are offsets before the first seed run.
"""

from dataclasses import dataclass
from datetime import timedelta

from nigehban_contracts import AlertStatus, BagClass, EventType, UserRole


@dataclass(frozen=True)
class SeedUser:
    username: str
    password: str  # dev only, never use in production
    display_name: str
    role: UserRole


@dataclass(frozen=True)
class SeedCamera:
    name: str
    location: str


@dataclass(frozen=True)
class SeedAlert:
    key: str  # stable key: the event and alert IDs are derived from it
    type: EventType
    camera: str
    ago: timedelta  # occurred this long before the first seed run
    video_ts_s: float
    bag_track_id: int
    bag_class: BagClass
    bag_bbox: tuple[float, float, float, float]
    owner_track_id: int | None
    confidence: float
    owner_distance_m: float | None
    # Status path after "active", e.g. (ACKNOWLEDGED, RESOLVED). Empty = still active.
    path: tuple[AlertStatus, ...] = ()
    close_note: str | None = None
    separation_s: float | None = None  # abandoned only
    carrier_track_id: int | None = None  # theft only
    owner_away_s: float | None = None  # theft only
    owner_match: float | None = None  # theft only


USERS = (
    SeedUser("operator", "operator123", "Duty Operator", UserRole.OPERATOR),
    SeedUser("admin", "admin123", "Security Admin", UserRole.ADMIN),
)

CAMERAS = (
    SeedCamera("CAM 01", "Main Gate Corridor"),
    SeedCamera("CAM 02", "Library Entrance"),
    SeedCamera("CAM 03", "Cafeteria Hall"),
    SeedCamera("CAM 04", "Admin Block Lobby"),
)

ACK, RESOLVED, FALSE_ALARM = (
    AlertStatus.ACKNOWLEDGED,
    AlertStatus.RESOLVED,
    AlertStatus.FALSE_ALARM,
)
ABANDONED, THEFT = EventType.ABANDONED_BAG, EventType.POSSIBLE_THEFT
H = timedelta(hours=1)
M = timedelta(minutes=1)

# Positional order: key, type, camera, ago, video_ts_s, bag_track_id, bag_class, bag_bbox,
# owner_track_id, confidence, owner_distance_m, path, close_note. Modelled on the prototype.
ALERTS = (
    SeedAlert(
        "demo-01", ABANDONED, "CAM 02", 50 * H, 212.0, 14, BagClass.BACKPACK,
        (402, 388, 470, 470), 4, 0.87, 3.4, (ACK, RESOLVED), "Owner returned",
        separation_s=71.0,
    ),
    SeedAlert(
        "demo-02", THEFT, "CAM 04", 46 * H, 98.5, 6, BagClass.HANDBAG,
        (610, 300, 690, 395), 5, 0.92, 4.0, (ACK, AlertStatus.CONFIRMED_THEFT),
        "Confirmed theft, reported", carrier_track_id=8, owner_away_s=41.0, owner_match=0.12,
    ),
    SeedAlert(
        "demo-03", ABANDONED, "CAM 02", 30 * H, 45.2, 3, BagClass.HANDBAG,
        (300, 420, 352, 488), 9, 0.71, 2.2, (FALSE_ALARM,), "False alarm",
        separation_s=63.0,
    ),
    SeedAlert(
        "demo-04", THEFT, "CAM 01", 26 * H, 301.7, 19, BagClass.BACKPACK,
        (520, 350, 600, 450), 3, 0.78, 2.9, (FALSE_ALARM,), "Owner's colleague",
        carrier_track_id=11, owner_away_s=25.0, owner_match=0.55,
    ),
    SeedAlert(
        "demo-05", THEFT, "CAM 04", 4 * H, 156.0, 9, BagClass.BACKPACK,
        (700, 410, 790, 520), 5, 0.90, 2.8, (ACK, AlertStatus.AUTHORISED_PICKUP),
        "Authorised pickup (friend)", carrier_track_id=6, owner_away_s=22.0, owner_match=0.91,
    ),
    SeedAlert(
        "demo-06", ABANDONED, "CAM 02", 2 * H, 88.0, 22, BagClass.BACKPACK,
        (360, 370, 430, 460), 4, 0.89, 2.1, (ACK,), separation_s=75.0,
    ),
    SeedAlert(
        "demo-07", ABANDONED, "CAM 01", 30 * M, 132.4, 31, BagClass.BACKPACK,
        (512, 342, 568, 428), 7, 0.91, 4.2, separation_s=68.0,
    ),
    SeedAlert(
        "demo-08", THEFT, "CAM 03", 15 * M, 125.4, 18, BagClass.HANDBAG,
        (812, 440, 905, 560), 2, 0.94, 3.1, carrier_track_id=12, owner_away_s=35.0,
        owner_match=0.18,
    ),
)  # fmt: skip

DEMO_VIDEO = "demo_{camera}.mp4"  # e.g. demo_cam_01.mp4, relative to DATA_DIR/videos
ACK_DELAY = 2 * M  # acknowledge this long after the alert
CLOSE_DELAY = 10 * M  # close this long after the alert
