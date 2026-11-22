"""Every file the API writes or reads under ``DATA_DIR`` (Architecture.md "Storage").

Layout: ``snapshots/{run_id}/{event_id}.jpg`` (one per alert) and ``frames/{run_id}.jpg``
(latest live frame). Writes go to a temp file first and are moved into place with
``os.replace``, so a reader never sees half a file. Paths outside ``DATA_DIR`` are refused.
"""

import logging
import os
import uuid
from pathlib import Path, PurePosixPath
from typing import Annotated, BinaryIO

from fastapi import Depends

from app.core.errors import validation_error
from app.core.settings import Settings, get_settings

logger = logging.getLogger("nigehban.api.storage")

MAX_JPEG_BYTES = 2 * 1024 * 1024  # Data-Contracts §3 (snapshot) and §4 (frame)
JPEG_MAGIC = b"\xff\xd8\xff"
_CHUNK = 64 * 1024


def read_jpeg(file: BinaryIO, field: str, max_bytes: int = MAX_JPEG_BYTES) -> bytes:
    """Read an uploaded JPEG, stopping as soon as it is too big. Raises a 422 ``ApiError``."""
    chunks: list[bytes] = []
    total = 0
    while chunk := file.read(_CHUNK):
        total += len(chunk)
        if total > max_bytes:
            raise validation_error(f"{field}: must be at most {max_bytes // (1024 * 1024)} MB")
        chunks.append(chunk)
    data = b"".join(chunks)
    if not data.startswith(JPEG_MAGIC):
        raise validation_error(f"{field}: must be a JPEG image")
    return data


class Storage:
    def __init__(self, data_dir: Path):
        self.root = data_dir.resolve()

    def path_of(self, relative: str) -> Path:
        """Absolute path of a stored file. Refuses anything that would leave ``DATA_DIR``."""
        target = (self.root / relative).resolve()
        if not target.is_relative_to(self.root):
            raise ValueError("path is outside DATA_DIR")
        return target

    def save_snapshot(self, run_id: str, event_id: str, data: bytes) -> str:
        """Store an alert snapshot. Returns its path relative to ``DATA_DIR`` (for the DB)."""
        relative = PurePosixPath("snapshots", run_id, f"{event_id}.jpg").as_posix()
        self._write(self.path_of(relative), data)
        return relative

    def save_frame(self, run_id: str, data: bytes) -> str:
        relative = PurePosixPath("frames", f"{run_id}.jpg").as_posix()
        self._write(self.path_of(relative), data)
        return relative

    def delete(self, relative: str) -> None:
        """Remove a stored file. A missing file is fine; other errors are logged, not raised,
        because this runs while another error is already being handled."""
        try:
            self.path_of(relative).unlink(missing_ok=True)
        except OSError:
            logger.exception("Could not delete %s", relative)

    @staticmethod
    def _write(target: Path, data: bytes) -> None:
        target.parent.mkdir(parents=True, exist_ok=True)
        temp = target.with_name(f".{target.name}.{uuid.uuid4().hex}.tmp")
        try:
            temp.write_bytes(data)
            os.replace(temp, target)
        finally:
            temp.unlink(missing_ok=True)


def get_storage(settings: Annotated[Settings, Depends(get_settings)]) -> Storage:
    return Storage(settings.data_dir)


StorageDep = Annotated[Storage, Depends(get_storage)]
