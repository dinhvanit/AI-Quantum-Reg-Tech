from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query

from app.repositories.workbook import load_data_file


router = APIRouter(prefix="/api/v1/financial-engine", tags=["financial-engine"])


@router.get("")
def financial_engine_records(
    data_year: Annotated[int | None, Query(ge=1900, le=2100)] = None,
    ticker: Annotated[str | None, Query(min_length=1, max_length=12)] = None,
) -> dict:
    """Return transparent, workbook-backed recalculations with source-row provenance."""
    payload = load_data_file("financial_engine.json")
    records = payload["records"]
    if data_year is not None:
        records = [record for record in records if record["dataYear"] == data_year]
    if ticker:
        records = [record for record in records if record["ticker"] == ticker.upper()]
    return {**{key: value for key, value in payload.items() if key != "records"}, "records": records}
