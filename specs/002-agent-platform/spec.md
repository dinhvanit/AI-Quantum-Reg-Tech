# Feature Specification: Agent Platform and Knowledge Graph

**Status:** In progress
**Created:** 2026-11-19
**Parent:** [Investor Due Diligence Demo](../001-investor-due-diligence-demo/spec.md)

## Goal

Evolve the demo into a deployable, auditable agent platform. Agents may search public sources and read a company relationship graph, but deterministic financial services own calculations and a reviewer owns every decision that changes an assessment.

## User stories

### P1 — Inspect an OSINT investigation

An analyst can run an OSINT scan and see the graph nodes/relations checked, search providers called, extracted article evidence, LLM proposals, validation result, and failures in one trace.

**Acceptance criteria**

- The workflow has typed, bounded LangGraph nodes for company resolution, source discovery, graph enrichment, extraction, LLM proposal, deterministic evidence validation, and reviewer decision.
- Public text and graph properties are treated as untrusted input. LLM output cannot create source URLs, publication dates, or confirmed legal findings.
- Every proposed severity must include a quote present in a live source excerpt. Graph data can help match an entity but cannot substitute for article evidence.
- Provider/model, latency, status, source URLs, workflow version, and validation outcome are recorded without logging credentials or private PDF text.
- A provider failure leaves usable search candidates and a clear status; it does not fabricate a successful AI result.

### P1 — Use Neo4j as a sourced relationship graph

An analyst can inspect a company and its reported relationships to events, articles, people, or related entities, with provenance and demo/live state visible.

**Acceptance criteria**

- The runtime agent uses a read-only Neo4j adapter and allow-listed parameterized queries; it never executes model-generated Cypher.
- Graph records include stable IDs, source reference, source date when known, provenance, confidence, and review status.
- Workbook demo imports are explicitly tagged `workbook_demo` and `demo=true`; ingestion is a deliberate command, never app startup behavior.
- The initial app returns an empty graph gracefully and indicates connected-but-unseeded separately from disconnected.
- Any future graph write requires a reviewed ingestion path and a separately enabled write credential.

### P1 — Deploy frontend, API, and data services independently

An operator can release the UI without rebuilding the API or moving database credentials into browser code.

**Acceptance criteria**

- Next.js uses a server-side API URL. The browser never receives model, search, Neo4j, Aura API, or database secrets.
- FastAPI is stateless aside from external stores and can scale horizontally; long scans/documents move to an asynchronous worker queue.
- Runtime configuration is documented separately for local development and each deployed service.
- `/health` reports app liveness; a dependency readiness check is separately visible and does not expose graph contents.

### P2 — Add private-document agents with consent

An analyst can extract claims from PDFs with page citations, resolve conflicts, and approve fields before applying them to an assessment.

**Acceptance criteria**

- PDF text remains local unless the user explicitly chooses hosted LLM processing.
- Every extraction points to file hash, page, and text span; LLM output stays a proposal until reviewed.
- Only approved normalized values enter the deterministic financial engine.

## Constraints and non-goals

- AI agents do not make investment recommendations or certify legal compliance.
- No arbitrary web scraping or unrestricted Cypher execution.
- Neo4j is the relationship store; Qdrant remains optional until semantic retrieval acceptance criteria are agreed.
- A multi-agent swarm is not a goal. Use one orchestrated graph with bounded specialist nodes and explicit tool permissions.
