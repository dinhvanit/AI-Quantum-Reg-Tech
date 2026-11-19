# Data Model and Evidence Contracts

## Common provenance fields

Every metric/evidence record should carry `id`, `ticker` or `assessment_id`, `source_type` (`workbook`, `public_web`, `private_document`, `model_calculated`, `user_override`), `source_reference`, `as_of_date` or `period`, `retrieved_at`, `methodology_version`, `status`, and optional `reviewer_id`/`reviewed_at`.

## Universe registry

```text
StockUniverse
  id, name, version, sector_scope, source_reference, updated_at

UniverseEntry
  universe_id, ticker, company_name?, exchange?, subsector?
  availability: pending_data | partial | analysis_ready | inactive
  missing_required_fields[], source_reference, added_at
```

The universe can grow independently of a portfolio. The current demo workbook contains four complete records; the other five AQ_Input candidates are not assumed to be present in generated JSON. Newly registered tickers remain `pending_data` until required inputs and sources have been checked. UI components consume the universe API/data source rather than embedding ticker arrays; only the named demo preset is a fixed ticker list.

## Company metric view

```text
CompanyAssessment
  ticker, company_name, universe_version
  expected_return: MetricValue
  esg_total: MetricValue
  esg_pillars: {E,S,G}: MetricValue | missing
  altman: {model, x1..x5, score, zone, fiscal_year}
  rfin_base: MetricValue
  osint_findings: [OsintFinding]
  posint: MetricValue
  rfin_total: MetricValue
```

`MetricValue = { value, unit, period, source, source_reference, status, methodology_version }`. Keep unknown values null/missing; do not map missing to zero.

## OSINT finding

Neo4j graph context for this prototype uses `(:Company {ticker, name, exchange, subsector, provenance, demo})-[:HAS_REPORTED_EVENT]->(:Event {id, title, type, severity, event_date, source, url, provenance, demo, already_in_assessment})`. Workbook imports must set `provenance='workbook_demo'` and `demo=true`; a reported event is not a verified violation. Production graph entities additionally require stable source references, ingestion time, confidence, review status, and tenant scope.

```text
OsintFinding
  id, ticker, title, canonical_url, publisher, source_adapter
  published_at?, event_date?, fetched_at
  excerpt, evidence_quote?, event_type?, proposed_severity?, confidence?
  proposed_penalty?, status: unverified | needs_review | verified | rejected
  reviewer_id?, reviewed_at?, review_reason?
```

Approval and score recalculation are separate append-only `ReviewEvent` records. A reviewer-adjusted severity must retain both proposed and approved values.

## Private document extraction

```text
DocumentRecord
  id, assessment_id, file_name, mime_type, size_bytes, page_count
  processing_mode: browser_local | server_consented
  cleanup_status, processed_at

ExtractedMetric
  id, document_id, target_ticker?, metric_key, reported_value, unit, period
  page, quote, extraction_method: parser | OCR | LLM_proposal
  confidence?, validation_status, reviewer_status
```

`reported_value`, `calculated_value`, and `model_estimate` MUST be separate fields/record types. Each numeric extraction needs a document/page/quote pointer before it can be approved.

## Portfolio scenario

```text
PortfolioScenario
  id, session_id, tickers, capital_vnd, params: {alpha,beta,gamma,delta}
  constraints, exclusions, solver_id, solver_version, status
  weights, expected_return?, realized_return?, volatility?, weighted_esg?
  weighted_rfin?, objective_value?, input_data_version, created_at
```

## Audit event

Append-only record of scan start/result, reviewer decision, severity adjustment, POSINT change, PDF field approval, scenario run/save, and report export. Do not store raw private PDF contents in audit payloads.
