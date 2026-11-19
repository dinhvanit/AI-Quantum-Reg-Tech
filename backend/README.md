# QuantumRegTech API (deep-demo foundation)

Run from the repository root after generating workbook JSON:

```bash
npm run data
python3 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt
uvicorn app.main:app --app-dir backend --reload --reload-dir backend/app --port 8000
```

Open `http://localhost:8000/docs`; health check: `http://localhost:8000/health`; Neo4j readiness: `http://localhost:8000/api/v1/graph/status` (`ready_empty` means connected but not seeded).

In a second terminal, start the UI with `npm run dev`, then use:

- `http://localhost:3000/company/VNM` for the original lookup/detail screen and quick ticker navigation.
- `http://localhost:3000/stocks` to browse the four fully populated demo companies or register another symbol with a source reference.

Implemented: paginated/searchable company directory, provenance/version envelope, SQLite registry for newly proposed tickers, duplicate checks, and truthful `pending_data` status. The API does not create financial metrics for registered symbols. Data and methodology version labels are configurable; `as_of_date` remains null because this workbook combines periods. The registry database is local demo state and should not be committed.

The backend is separated into `api/routes`, `domain/contracts`, `repositories`, `services`, and `agents`. `app.main` is only the composition root; HTTP route modules preserve the existing `/api/v1/...` paths.

Set `NEXT_PUBLIC_USE_MOCK=false` so public company/ESG/OSINT/methodology/scenario reads go through this API. Private PDFs remain browser-local. Portfolio reads still return workbook scenarios; the current solver endpoint does not run a covariance optimizer.

The OSINT endpoint runs a bounded LangGraph (`discover → graph_enrichment → extract → classify → validate`). Scans are background jobs: `POST /api/v1/osint/scans` returns `202 {scan_id, status: "running"}`; poll `GET /api/v1/osint/scans/{scan_id}` until `completed` (with `result`) or `failed`. Jobs live in process memory (single worker; lost on restart; at most 3 running). Discovery uses Firecrawl only (`OSINT_DISCOVERY`): `agent` (default) runs one Firecrawl Agent job per ticker that returns events with URL and verbatim quote, then re-reads every source page (Firecrawl scrape, Jina fallback) and marks the agent quote verified only if it appears there; `search` runs four penalty-category queries per ticker with article scraping. Without `FIRECRAWL_API_KEY` the scan returns workbook events labelled demo. LangChain calls Groq or Gemini for structured proposals. Neo4j enrichment uses read-only, parameterized lookups; the model never supplies Cypher. Search findings stay unverified and reviewer actions remain session-local; there is no persistent audit/checkpoint store yet.

## Configuration

Copy `backend/.env.example` to `backend/.env` (ignored by Git). Load order: real process env → `backend/.env` → root `.env.local` (legacy fallback for machines that still keep one shared file); an existing value is never overwritten. Locally, `NEO4J_CREDENTIALS_FILE` can point to the Aura connection file outside the repo so the password is not copied. In production, configure `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, and `NEO4J_DATABASE` in the FastAPI host's secret manager. Never put them in `NEXT_PUBLIC_*` variables.

## Deploy (separate from the frontend)

```bash
npm run data                                            # data/generated/*.json is copied into the image
docker build -f backend/Dockerfile -t quantumregtech-api .   # context = repo root, filtered by /.dockerignore
docker run --env-file backend/.env -p 8000:8000 quantumregtech-api
```

- Inject variables from `backend/.env.example` through the host's env/secret manager; the image contains no `.env`. The container listens on `$PORT` (default 8000).
- Set `CORS_ORIGINS` to the frontend origin(s), e.g. `https://<app>.vercel.app`.
- The SQLite registry (`UNIVERSE_DB_PATH`) is lost on redeploy unless it points to a mounted volume.
- Workbook changes require `npm run data` and a new image.
- Health check: `GET /health`. Full checklist: [`docs/DEPLOY.md`](../docs/DEPLOY.md).

The connected Aura database currently contains no nodes. To deliberately load the four workbook companies and the workbook OSINT event as `demo=true`, run:

```bash
npm run data
NEO4J_ALLOW_DEMO_WRITE=true PYTHONPATH=backend backend/.venv/bin/python -m app.seed_graph
```

This is an external database write and is intentionally not run automatically. The seed command does not import live crawler results. For hosted Aura MCP setup, IDE instructions, and the difference between database credentials and Aura API client credentials, see [Neo4j MCP setup](../docs/NEO4J_MCP.md).

## Tests

```bash
backend/.venv/bin/pip install -r backend/requirements-dev.txt
cd backend && .venv/bin/python -m pytest
```

Tests replace Firecrawl, Jina, Neo4j and the LLM with fakes; no network calls or credits are used.
