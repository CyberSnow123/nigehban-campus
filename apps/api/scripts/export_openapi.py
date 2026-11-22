"""Write the API's OpenAPI schema for the web type generator (``bun run gen:api``).

No server and no database are needed. Dummy settings are used when the environment has none,
since the schema does not depend on their values.
"""

import json
import os
import sys

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg://x:x@localhost/x")
os.environ.setdefault("JWT_SECRET", "x" * 32)
os.environ.setdefault("WORKER_KEY", "x" * 32)

from app.core.settings import REPO_ROOT  # noqa: E402
from app.main import create_app  # noqa: E402

OPENAPI_PATH = REPO_ROOT / "apps" / "web" / "src" / "lib" / "api" / "openapi.json"


def render_schema() -> str:
    return json.dumps(create_app().openapi(), indent=2, ensure_ascii=False) + "\n"


def main() -> None:
    OPENAPI_PATH.parent.mkdir(parents=True, exist_ok=True)
    OPENAPI_PATH.write_text(render_schema(), encoding="utf-8", newline="\n")
    print(f"Wrote {OPENAPI_PATH.relative_to(REPO_ROOT)}", file=sys.stderr)


if __name__ == "__main__":
    main()
