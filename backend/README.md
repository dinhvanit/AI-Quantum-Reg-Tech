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

The OSINT endpoint runs a bounded LangGraph (`discover → graph_enrichment → extract → classify → validate`). LangChain calls Groq or Gemini for structured proposals. Neo4j enrichment uses read-only, parameterized lookups; the model never supplies Cypher. Search findings stay unverified and reviewer actions remain session-local; there is no persistent audit/checkpoint store yet.

Local service secrets are loaded from the repository root `.env.local` (outside `src/`), which is ignored by Git. The app reads the supplied DB connection file through `NEO4J_CREDENTIALS_FILE`; the database password is not copied into the repo. In production, configure `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, and `NEO4J_DATABASE` in the FastAPI host's secret manager. Never put them in `NEXT_PUBLIC_*` variables.

The connected Aura database currently contains no nodes. To deliberately load the four workbook companies and the workbook OSINT event as `demo=true`, run:

```bash
npm run data
NEO4J_ALLOW_DEMO_WRITE=true PYTHONPATH=backend backend/.venv/bin/python -m app.seed_graph
```

This is an external database write and is intentionally not run automatically. The seed command does not import live crawler results. For hosted Aura MCP setup, IDE instructions, and the difference between database credentials and Aura API client credentials, see [Neo4j MCP setup](../docs/NEO4J_MCP.md).
