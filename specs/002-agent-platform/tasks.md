# Tasks: Agent Platform

## Completed in this slice

- [x] A001 Read the supplied Aura database connection file without echoing secrets; verify direct read connectivity.
- [x] A002 Add a Neo4j service adapter with read-only, parameterized company/event lookup and safe status output.
- [x] A003 Add graph enrichment to the OSINT LangGraph and make graph context explicitly non-evidence for severity.
- [x] A004 Add an explicit, write-gated workbook demo seed command; never seed at API startup.
- [x] A005 Display the workflow stages and graph connection/match state in the company OSINT panel.
- [x] A006 Document local/deployed environment separation, Aura MCP setup, and independent deployment boundaries.
- [x] A010 Split FastAPI composition root, versioned routers, domain contracts, workbook repository, and SQLite universe repository while preserving existing API paths.

## Next implementation slices

- [ ] A011 Add authentication, user/tenant scope, per-route authorization, and rate limits before any public deployment.
- [ ] A012 Replace session-local reviewer actions with Postgres-backed finding, decision, and append-only audit repositories.
- [ ] A013 Add LangGraph Postgres checkpointer, cancellation, retry budgets, and workflow-version metadata.
- [ ] A014 Add async scan/document jobs, queue, idempotency keys, and progress polling.
- [ ] A015 Implement sourced graph ingestion for issuer aliases, people, subsidiaries, events, and articles with dedupe and reviewer approval.
- [ ] A016 Add provider telemetry, redacted structured logs, traces, and usage/cost budgets.
- [ ] A017 Add a typed financial-engine service and independently validated portfolio optimizer.
- [ ] A018 Add private PDF chunking/citation schema and explicit hosted-LLM consent gate.
- [ ] A019 Add production configuration validation and deployment manifests for web/API/worker.
- [ ] A020 Define migration/backfill, backup/restore, retention, and incident response procedures.
