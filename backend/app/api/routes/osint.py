from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException

from app.domain.contracts import OsintScanRequest
from app.repositories.workbook import workbook_companies
from app.services import osint_jobs


router = APIRouter(tags=["osint"])
TICKER_RE = re.compile(r"^[A-Z0-9.\-]{1,12}$")
SCAN_ID_RE = re.compile(r"^[0-9a-f]{32}$")
MAX_RUNNING_SCANS = 3  # each scan can spend Firecrawl credits; bound concurrent spend


@router.post("/api/v1/osint/scans", status_code=202)
async def create_osint_scan(body: OsintScanRequest) -> dict:
    """Start a scan in the background; poll GET /api/v1/osint/scans/{scan_id} for the result."""
    available = {item["ticker"].upper() for item in workbook_companies()}
    tickers = list(dict.fromkeys(ticker.strip().upper() for ticker in body.tickers))
    if any(not TICKER_RE.fullmatch(ticker) for ticker in tickers):
        raise HTTPException(status_code=422, detail="Ticker may contain A-Z, 0-9, dot, or hyphen")
    unknown = [ticker for ticker in tickers if ticker not in available]
    if unknown:
        raise HTTPException(status_code=422, detail=f"Not analysis-ready: {', '.join(unknown)}")
    if osint_jobs.running_count() >= MAX_RUNNING_SCANS:
        raise HTTPException(status_code=429, detail="Đang có quá nhiều lượt quét OSINT chạy; thử lại sau.")
    from app.agents.osint_graph import run_osint_graph

    return osint_jobs.start_job(tickers, run_osint_graph)


@router.get("/api/v1/osint/scans/{scan_id}")
async def get_osint_scan(scan_id: str) -> dict:
    if not SCAN_ID_RE.fullmatch(scan_id):
        raise HTTPException(status_code=422, detail="Invalid scan id")
    job = osint_jobs.get_job(scan_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy lượt quét (đã hết hạn hoặc backend vừa khởi động lại).")
    return job
