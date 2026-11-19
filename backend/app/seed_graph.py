"""Explicitly import workbook demo companies/events into Neo4j."""

from __future__ import annotations

import json
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env.local", override=False)

from app.services.neo4j import Neo4jService  # noqa: E402


def main() -> None:
    companies = json.loads((ROOT / "src/data/companies.json").read_text(encoding="utf-8"))
    events = json.loads((ROOT / "src/data/osint_events.json").read_text(encoding="utf-8"))
    service = Neo4jService()
    try:
        status = service.status()
        if not status.get("connected"):
            raise SystemExit(f"Neo4j unavailable ({status.get('reason', 'not configured')}); no data was written.")
        result = service.seed_demo_data(companies, events)
        print(f"Imported workbook demo graph rows: {result['companies']} companies, {result['events']} events.")
        print("All imported nodes are tagged provenance=workbook_demo and demo=true.")
    finally:
        service.close()


if __name__ == "__main__":
    main()
