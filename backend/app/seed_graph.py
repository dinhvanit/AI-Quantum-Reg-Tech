"""Explicitly import workbook demo companies/events into Neo4j."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env.local", override=False)

from app.repositories.workbook import load_data_file  # noqa: E402
from app.services.neo4j import Neo4jService  # noqa: E402


def main() -> None:
    companies = load_data_file("companies.json")
    events = load_data_file("osint_events.json")
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
