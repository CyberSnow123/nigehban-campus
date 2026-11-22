import copy
import json
from pathlib import Path
from typing import Any

import pytest

EXAMPLES_PATH = Path(__file__).parent / "fixtures" / "examples.json"


@pytest.fixture
def example():
    """Return a fresh deep copy of a named example from the fixtures file."""
    data = json.loads(EXAMPLES_PATH.read_text(encoding="utf-8"))

    def get(name: str) -> dict[str, Any]:
        return copy.deepcopy(data[name])

    return get
