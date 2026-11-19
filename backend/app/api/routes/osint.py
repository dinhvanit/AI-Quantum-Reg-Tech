from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException

from app.domain.contracts import OsintScanRequest
from app.repositories.workbook import workbook_companies


router = APIRouter(tags=["osint"])
TICKER_RE = re.compile(r"^[A-Z0-9.\-]{1,12}$")


@router.post("/api/v1/osint/scans")
async def create_osint_scan(body: OsintScanRequest) -> dict:
    available = {item["ticker"].upper() for item in workbook_companies()}
    tickers = list(dict.fromkeys(ticker.strip().upper() for ticker in body.tickers))
    if any(not TICKER_RE.fullmatch(ticker) for ticker in tickers):
        raise HTTPException(status_code=422, detail="Ticker may contain A-Z, 0-9, dot, or hyphen")
    unknown = [ticker for ticker in tickers if ticker not in available]
    if unknown:
        raise HTTPException(status_code=422, detail=f"Not analysis-ready: {', '.join(unknown)}")
    from app.agents.osint_graph import run_osint_graph

    return await run_osint_graph(tickers)
