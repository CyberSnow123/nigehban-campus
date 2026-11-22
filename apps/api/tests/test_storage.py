"""File storage under DATA_DIR (no database needed)."""

import io

import pytest

from app.core.errors import ApiError
from app.services.storage import MAX_JPEG_BYTES, Storage, read_jpeg

RUN = "run_01JD2W0000000000000000000A"
EVT = "evt_01JD2X0000000000000000000A"
JPEG = b"\xff\xd8\xff\xe0" + b"x" * 100


def test_snapshot_path_is_relative_and_posix(tmp_path):
    storage = Storage(tmp_path)
    relative = storage.save_snapshot(RUN, EVT, JPEG)
    assert relative == f"snapshots/{RUN}/{EVT}.jpg"
    assert (tmp_path / relative).read_bytes() == JPEG


def test_write_leaves_no_temp_files(tmp_path):
    storage = Storage(tmp_path)
    storage.save_frame(RUN, JPEG)
    storage.save_frame(RUN, JPEG + b"2")
    assert [p.name for p in (tmp_path / "frames").iterdir()] == [f"{RUN}.jpg"]


@pytest.mark.parametrize("relative", ["../outside.jpg", "snapshots/../../x.jpg", "/etc/passwd"])
def test_paths_outside_data_dir_are_refused(tmp_path, relative):
    with pytest.raises(ValueError):
        Storage(tmp_path / "data").path_of(relative)


def test_delete_is_quiet_for_missing_files(tmp_path):
    storage = Storage(tmp_path)
    relative = storage.save_snapshot(RUN, EVT, JPEG)
    storage.delete(relative)
    storage.delete(relative)
    assert not (tmp_path / relative).exists()


def test_read_jpeg_accepts_up_to_the_limit():
    data = JPEG[:3] + b"x" * (MAX_JPEG_BYTES - 3)
    assert read_jpeg(io.BytesIO(data), "frame") == data


@pytest.mark.parametrize(
    ("data", "reason"),
    [
        (JPEG[:3] + b"x" * MAX_JPEG_BYTES, "2 MB"),
        (b"\x89PNG\r\n", "JPEG"),
        (b"", "JPEG"),
    ],
)
def test_read_jpeg_rejects(data, reason):
    with pytest.raises(ApiError) as caught:
        read_jpeg(io.BytesIO(data), "snapshot")
    assert caught.value.status_code == 422
    assert reason in caught.value.message
    assert caught.value.message.startswith("snapshot:")
