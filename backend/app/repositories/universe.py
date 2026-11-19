from __future__ import annotations

import sqlite3
import re
from contextlib import closing
from datetime import datetime, timezone

from fastapi import HTTPException

from app.core.config import DATA_VERSION, UNIVERSE_DB_PATH
from app.domain.contracts import RegisterCompany, UniverseEntry
from app.repositories.workbook import provenance, workbook_companies, workbook_pending


def _connect() -> sqlite3.Connection:
    UNIVERSE_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(UNIVERSE_DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("""CREATE TABLE IF NOT EXISTS universe_entries (
        universe_id TEXT NOT NULL, ticker TEXT NOT NULL, source_reference TEXT NOT NULL,
        source_version TEXT, added_at TEXT NOT NULL,
        PRIMARY KEY (universe_id, ticker)
    )""")
    db.commit()
    return db


def registry_entries(universe_id: str) -> list[sqlite3.Row]:
    with closing(_connect()) as db:
        return db.execute("SELECT * FROM universe_entries WHERE universe_id = ? ORDER BY ticker", (universe_id,)).fetchall()


def register_company(universe_id: str, body: RegisterCompany) -> UniverseEntry:
    if universe_id != DATA_VERSION:
        raise HTTPException(status_code=404, detail=f"Unknown demo universe: {universe_id}")
    ticker = body.ticker.strip().upper()
    if not re.fullmatch(r"[A-Z0-9.\-]{1,12}", ticker):
        raise HTTPException(status_code=422, detail="Ticker may contain A-Z, 0-9, dot, or hyphen")
    workbook_tickers = {str(item.get("ticker", "")).upper() for item in workbook_companies()}
    pending_tickers = {str(item.get("ticker", "")).upper() for item in workbook_pending()}
    if ticker in workbook_tickers or ticker in pending_tickers:
        raise HTTPException(status_code=409, detail="Ticker already exists in the workbook universe")
    with closing(_connect()) as db:
        try:
            db.execute(
                "INSERT INTO universe_entries VALUES (?, ?, ?, ?, ?)",
                (universe_id, ticker, body.source_reference.strip(), body.source_version, datetime.now(timezone.utc).isoformat()),
            )
            db.commit()
        except sqlite3.IntegrityError as exc:
            raise HTTPException(status_code=409, detail="Ticker already exists in this universe") from exc
    return UniverseEntry(
        ticker=ticker,
        availability="pending_data",
        missing_required_fields=["company_name", "financial_metrics", "market_data", "esg_inputs"],
        source_reference=body.source_reference.strip(),
        provenance=provenance("pending_data", body.source_reference.strip()),
    )
