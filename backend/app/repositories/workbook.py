from __future__ import annotations

import json

from fastapi import HTTPException

from app.core.config import COMPANIES_PATH, DATA_DIR, DATA_VERSION, PENDING_DATA_PATH
from app.domain.contracts import Provenance


def load_data_file(filename: str):
    path = DATA_DIR / filename
    if not path.exists():
        raise HTTPException(status_code=503, detail=f"Generated data is missing: {filename}. Run npm run data.")
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail=f"Could not read generated data: {filename}") from exc


def workbook_companies() -> list[dict]:
    if not COMPANIES_PATH.exists():
        raise HTTPException(status_code=503, detail="Workbook data is missing. Run npm run data from the repository root.")
    try:
        return json.loads(COMPANIES_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="Workbook company data could not be loaded.") from exc


def workbook_pending() -> list[dict]:
    if not PENDING_DATA_PATH.exists():
        return []
    try:
        return json.loads(PENDING_DATA_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=503, detail="Workbook pending-company data could not be loaded.") from exc


def company_data(filename: str, ticker: str) -> dict:
    record = load_data_file(filename).get(ticker.upper())
    if record is None:
        raise HTTPException(status_code=404, detail=f"No {filename} record for {ticker.upper()}")
    return record


def company_events(ticker: str) -> list[dict]:
    return [event for event in load_data_file("osint_events.json") if event.get("ticker", "").upper() == ticker.upper()]


def provenance(status: str, source: str) -> Provenance:
    return Provenance(
        source_type="workbook" if status == "demo" else "user_registry",
        source_reference=source,
        data_version=DATA_VERSION,
        as_of_date=None,
        status=status,
    )
