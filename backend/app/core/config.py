from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / ".env.local", override=False)

DATA_DIR = ROOT / "src" / "data"
COMPANIES_PATH = DATA_DIR / "companies.json"
PENDING_DATA_PATH = DATA_DIR / "universe_pending.json"
UNIVERSE_DB_PATH = Path(os.getenv("UNIVERSE_DB_PATH", str(ROOT / "backend" / "universe.sqlite3")))
DATA_VERSION = os.getenv("DATA_VERSION", "demo-v1")
METHODOLOGY_VERSION = os.getenv("METHODOLOGY_VERSION", "workbook-methodology-unconfirmed")
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if origin.strip()]
