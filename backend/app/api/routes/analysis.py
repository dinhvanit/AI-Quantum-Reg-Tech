from __future__ import annotations

from fastapi import APIRouter

from app.repositories.workbook import load_data_file


router = APIRouter(tags=["analysis"])


@router.get("/api/v1/esg/indicators")
def esg_indicators() -> dict:
    return load_data_file("esg_indicators.json")


@router.get("/api/v1/methodology")
def methodology() -> dict:
    return load_data_file("methodology.json")


@router.get("/api/v1/graph/status")
def graph_status() -> dict:
    from app.services.neo4j import get_neo4j_service

    status = get_neo4j_service().status()
    if not status.get("configured"):
        state = "disabled"
    elif not status.get("connected"):
        state = "unavailable"
    else:
        state = "ready_empty" if status.get("node_count", 0) == 0 else "ready"
    return {"state": state, "configured": status.get("configured", False), "connected": status.get("connected", False)}
