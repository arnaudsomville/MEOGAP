"""Export the live Gateway OpenAPI document to the shared reference contract.

Usage:
    cd projects/gateway
    .venv/bin/python ../../tools/export_gateway_contract.py

The exporter preserves the repository convention of a global bearer security
declaration, an explicit public health operation, and schema objects without
JSON-Schema ``title`` keywords. It must be run after any Gateway route or
Pydantic schema change.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
GATEWAY_SOURCE = REPOSITORY_ROOT / "projects" / "gateway" / "src"
OUTPUT = (
    REPOSITORY_ROOT / "projects" / "meogap_interfaces" / "rest" / "gateway.openapi.json"
)


def _strip_schema_titles(value: object) -> None:
    """Remove JSON-Schema title keywords without deleting data fields named title."""
    if isinstance(value, dict):
        if isinstance(value.get("title"), str):
            value.pop("title")
        for child in value.values():
            _strip_schema_titles(child)
    elif isinstance(value, list):
        for child in value:
            _strip_schema_titles(child)


def main() -> None:
    """Generate and write the reference contract."""
    sys.path.insert(0, str(GATEWAY_SOURCE))
    from gateway.application.app import app

    document = app.openapi()
    document["security"] = [{"bearerAuth": []}]
    document["paths"]["/api/v1/health"]["get"]["security"] = []
    title = document["info"]["title"]
    _strip_schema_titles(document)
    document["info"]["title"] = title
    OUTPUT.write_text(
        json.dumps(document, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(f"Wrote {OUTPUT.relative_to(REPOSITORY_ROOT)}")


if __name__ == "__main__":
    main()
