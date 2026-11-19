# Tasks: Investor Due Diligence Demo

Implementation backlog derived from [spec.md](spec.md) and [plan.md](plan.md). Tasks are intentionally not marked complete merely because a UI mock exists.

## 1. Product and data decisions

- [ ] T001 Confirm official company universe and workbook version for the demo.
- [x] T001a Add universe registry/import validation so new tickers can be registered with source references and `pending_data` completeness status; keep demo tickers as a preset only. Full financial data import/validation remains open.
- [ ] T002 Resolve open OSINT event descriptions/severity and document owner/date for each decision.
- [ ] T003 Confirm portfolio methodology version, covariance window/frequency, and feasible constraints.
- [ ] T004 Approve data handling notice for external LLM use and private PDF consent.

## 2. Data contracts and persistence

- [ ] T005 Add version/as-of/source/data-status metadata to company, metric, and portfolio responses.
- [x] T005a Add configurable data/methodology version and provenance/status metadata to FastAPI company directory and assessment response; workbook-wide as-of date remains intentionally unset.
- [ ] T006 Implement session, OSINT finding, reviewer decision, audit event, document, extracted metric, and scenario repositories.
- [ ] T007 Add canonical URL/title/company/date deduplication and repeat-scan idempotency.
- [ ] T008 Keep public company records separate from private assessment overrides.

## 3. Backend and workflow

- [ ] T009 Create FastAPI service and typed API contract matching `contracts/openapi.yaml`.
- [x] T009a Establish FastAPI service, health endpoint, paginated company listing, minimal assessment response, and SQLite pending-ticker registry. Remaining OpenAPI operations are not implemented.
- [ ] T010 Implement provider interfaces for GDELT and one selected targeted-search provider.
- [x] T010a Add bounded GDELT single-ticker discovery and selectable Firecrawl/Tavily targeted-search adapters to the OSINT route; retain workbook fallback when live providers return nothing.
- [x] T010b Connect the company profile OSINT button through Next.js to FastAPI and return live search findings to the UI.
- [ ] T011 Implement source extraction adapter and preserve source URL, fetch date, publication date, excerpt, and evidence quote.
- [x] T011a Add bounded Jina Reader fallback for a headline without excerpt; validate external HTTPS hosts and accept AI evidence quotes only when they literally occur in fetched text. Durable fetched-at evidence records remain open.
- [ ] T012 Implement LangGraph OSINT workflow with explicit state, bounded retries, validation, and reviewer interrupt.
- [x] T012a Implement bounded LangGraph `discover → graph_enrichment → extract → classify → validate` graph and route; persistent checkpointing and reviewer interrupt remain open.
- [ ] T013 Implement server-side LLM provider adapter for Gemini/Groq with structured-output schema validation and graceful rate-limit handling.
- [x] T013a Add server-side Gemini/Groq OSINT classifier using JSON output, domain validation, quote matching, timeout, and graceful provider failure. Durable provider audit/usage accounting and PDF extraction remain open.
- [ ] T014 Implement reviewer approve/reject/adjust and append-only audit trail.
- [ ] T015 Calculate proposed POSINT/RFin impact through deterministic financial engine after approval only.
- [ ] T016 Implement deterministic portfolio optimizer adapter and independent post-solver constraint validation.
- [x] T016a Add SSI FastConnect V3 daily OHLCV client and raw-ingestion CLI; account credentials, provider entitlement, unit/corporate-action validation, and optimizer remain open.
- [ ] T017 Implement report composition from approved records and versioned calculations.

## 4. Private document flow

- [ ] T018 Preserve local PDF text/OCR and add target-company selection plus per-file state.
- [ ] T019 Add page-indexed chunks and evidence pointers for every extracted metric.
- [ ] T020 Add optional external-LLM consent gate; do not send PDFs/text without consent.
- [ ] T021 Validate units, periods, duplicate/conflicting values, and require reviewer approval before apply.
- [ ] T022 Update retention notice to describe actual cleanup and persistence behavior.

## 5. Frontend and reporting

- [ ] T023 Connect stock selection to all comparison, OSINT, and portfolio views.
- [ ] T023a Build `/stocks` as the searchable, filterable universe directory; use server-side pagination when moving beyond the local workbook-sized dataset.
- [ ] T024 Show data provenance, as-of dates, demo/live state, and empty chart states consistently.
- [ ] T025 Build reviewer evidence panel with source links, proposed fields, status, impact preview, and audit history.
- [ ] T026 Add scenario save/compare and solver metadata views.
- [ ] T027 Add report sections for assumptions, data gaps, source evidence, methodology, and private-document citations.

## 6. Optional scale features

- [ ] T028 Add Qdrant only after acceptance of multi-document semantic retrieval requirements.
- [x] T029a Connect Neo4j Aura with a read-only, parameterized company/event context adapter; graph is currently empty and source-backed ingestion remains open.
- [ ] T030 Add Scrapy spiders only for specific permitted sites with stable structured-source APIs unavailable.
- [ ] T031 Use Playwright for browser-driven end-to-end workflows and only targeted JS-heavy source pages.
