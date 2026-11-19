"""Read-only Neo4j adapter for company and OSINT graph context."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

from neo4j import GraphDatabase, READ_ACCESS
from neo4j.exceptions import Neo4jError, ServiceUnavailable


def _parse_credentials_file(path: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in Path(path).expanduser().read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        separator = "=" if "=" in line else ":" if ":" in line else None
        if not separator:
            continue
        key, value = line.split(separator, 1)
        values[key.strip()] = value.strip().strip("\"'")
    return values


class Neo4jService:
    """Small allow-listed query surface; no LLM-supplied Cypher is executed."""

    def __init__(self) -> None:
        uri = os.getenv("NEO4J_URI", "")
        username = os.getenv("NEO4J_USERNAME", os.getenv("NEO4J_USER", ""))
        password = os.getenv("NEO4J_PASSWORD", "")
        database = os.getenv("NEO4J_DATABASE", "neo4j")
        credentials_file = os.getenv("NEO4J_CREDENTIALS_FILE", "")
        if credentials_file and (not uri or not username or not password):
            credentials = _parse_credentials_file(credentials_file)
            uri = uri or credentials.get("NEO4J_URI", "")
            username = username or credentials.get("NEO4J_USERNAME", "")
            password = password or credentials.get("NEO4J_PASSWORD", "")
            database = os.getenv("NEO4J_DATABASE", credentials.get("NEO4J_DATABASE", database))

        self.database = database
        self.enabled = bool(uri and username and password and os.getenv("NEO4J_ENABLED", "true").lower() == "true")
        self.write_enabled = os.getenv("NEO4J_ALLOW_DEMO_WRITE", "false").lower() == "true"
        self.driver = GraphDatabase.driver(uri, auth=(username, password), connection_timeout=8) if self.enabled else None

    def close(self) -> None:
        if self.driver:
            self.driver.close()

    def status(self) -> dict[str, Any]:
        if not self.driver:
            return {"configured": False, "connected": False, "reason": "Neo4j is not configured."}
        try:
            self.driver.verify_connectivity()
            with self.driver.session(database=self.database, default_access_mode=READ_ACCESS) as session:
                labels = session.run("CALL db.labels() YIELD label RETURN label ORDER BY label").value()
                relationships = session.run("CALL db.relationshipTypes() YIELD relationshipType RETURN relationshipType ORDER BY relationshipType").value()
                counts = session.run("MATCH (n) OPTIONAL MATCH (n)-[r]->() RETURN count(DISTINCT n) AS nodes, count(r) AS relationships").single()
            return {
                "configured": True,
                "connected": True,
                "database": self.database,
                "labels": labels,
                "relationship_types": relationships,
                "node_count": counts["nodes"] if counts else 0,
                "relationship_count": counts["relationships"] if counts else 0,
            }
        except (ServiceUnavailable, Neo4jError, OSError) as exc:
            return {"configured": True, "connected": False, "reason": type(exc).__name__}

    def company_context(self, ticker: str) -> dict[str, Any]:
        if not self.driver:
            return {"available": False, "reason": "not_configured", "company": None, "events": []}
        query = """
        MATCH (company:Company {ticker: $ticker})
        OPTIONAL MATCH (company)-[:HAS_REPORTED_EVENT]->(event:Event)
        RETURN company {
          .ticker, .name, .exchange, .subsector, .provenance, .demo
        } AS company,
        collect(event {
          .id, .title, .type, .severity, .event_date, .source, .url, .provenance, .demo
        })[0..10] AS events
        """
        try:
            with self.driver.session(database=self.database, default_access_mode=READ_ACCESS) as session:
                labels = session.execute_read(lambda tx: tx.run("CALL db.labels() YIELD label RETURN label").value())
                if "Company" not in labels:
                    return {"available": True, "matched": False, "company": None, "events": []}
                record = session.execute_read(lambda tx: tx.run(query, ticker=ticker.upper()).single())
            if not record or not record["company"]:
                return {"available": True, "matched": False, "company": None, "events": []}
            events = [item for item in record["events"] if item]
            return {"available": True, "matched": True, "company": dict(record["company"]), "events": events}
        except (ServiceUnavailable, Neo4jError, OSError) as exc:
            return {"available": False, "reason": type(exc).__name__, "company": None, "events": []}

    def seed_demo_data(self, companies: list[dict], events: list[dict]) -> dict[str, int]:
        """Explicit development-only import. Never called during app startup."""
        if not self.driver:
            raise RuntimeError("Neo4j is not configured")
        if not self.write_enabled:
            raise RuntimeError("Writes are disabled; set NEO4J_ALLOW_DEMO_WRITE=true for the explicit demo seed command")

        def write(tx):
            company_result = tx.run("""
                UNWIND $rows AS row
                MERGE (c:Company {ticker: row.ticker})
                SET c.name = row.name, c.exchange = row.exchange,
                    c.subsector = row.subsector, c.provenance = 'workbook_demo', c.demo = true
                RETURN count(c) AS count
            """, rows=companies).single()
            event_result = tx.run("""
                UNWIND $rows AS row
                MATCH (c:Company {ticker: row.ticker})
                MERGE (e:Event {id: row.id})
                SET e.title = row.title, e.type = row.type, e.severity = row.severity,
                    e.event_date = row.date, e.source = row.source, e.url = row.url,
                    e.provenance = 'workbook_demo', e.demo = true,
                    e.already_in_assessment = row.active
                MERGE (c)-[:HAS_REPORTED_EVENT]->(e)
                RETURN count(e) AS count
            """, rows=events).single()
            return {"companies": company_result["count"], "events": event_result["count"]}

        with self.driver.session(database=self.database) as session:
            return session.execute_write(write)


@lru_cache(maxsize=1)
def get_neo4j_service() -> Neo4jService:
    return Neo4jService()


def close_neo4j_service() -> None:
    if get_neo4j_service.cache_info().currsize:
        get_neo4j_service().close()
        get_neo4j_service.cache_clear()
