# Feature Specification: Investor Due Diligence Demo

**Status:** Draft for product/design review
**Date:** 2026-11-19
**Source of truth:** `data/QuantumRegTech_Data.xlsx`, `docs/DATA.md`, and documented decisions below. The coding-agent packet informs future behavior but does not override workbook decisions.

**Review/demo aids:** [User flows](../../docs/USER_FLOWS.md) · [Demo runbook](../../docs/DEMO_RUNBOOK.md)

## User problem

Fund managers need one reviewable workflow to screen F&B companies, inspect financial/ESG/public-risk evidence, test portfolio assumptions, and analyze internal documents. They need to see why a result exists and whether it is demo, live, reported, calculated, AI-proposed, or reviewer-approved.

## Primary user

An investment analyst or fund manager screening Vietnamese listed F&B companies and preparing an internal due-diligence view.

## User journey

`Dashboard → browse searchable stock universe → open a company profile / add symbols to a portfolio watchlist → scan OSINT on the company profile → adjust portfolio scenario → upload private PDFs → review extracted metrics → produce/export assessment`

## User stories

### P1 — Select and compare companies

As a fund manager, I can browse and search a configured stock universe, open any company profile, and add symbols to a portfolio selection without a four-symbol product limit. The four-company set is a demo preset only.

**Acceptance criteria**
- A named, versioned universe is used. The default demo preset is VNM, SAB, MCM, SBT, but it does not constrain the universe or future portfolio size.
- The stock directory supports search/filter and a portfolio selection/watchlist whose limit comes from the active solver policy, not a hard-coded four-symbol UI limit.
- Current workbook has four fully loaded company records. Other symbols mentioned in alternate workbooks are not exposed as complete companies until their source fields are validated and imported.
- The directory shows available identifiers and selected summary fields; company-level charts and detailed risk/ESG evidence live on `/company/[ticker]`.
- Pagination/filtering is server-side once the configured universe is larger than the local workbook-sized demo.
- Price history is rendered only when a valid price series is available. No synthetic/random series is allowed.
- E/S/G radar is rendered only for supplied pillar values. Total ESG or disclosure counts are not redistributed into E/S/G.
- Company ticker links open the company detail page; portfolio actions preserve the current selection.

### P2 — Maintain and extend the stock universe

As an authorized data maintainer, I can register/import a ticker with its source references and see which required inputs are missing, so that the universe can grow without pretending an incomplete company is fully analyzed.

**Acceptance criteria**
- Ticker records are unique within a universe/version and have an explicit source reference.
- A new ticker with incomplete fields is marked `pending_data` or `partial`; the directory shows that state and does not calculate or invent missing metrics.
- A ticker becomes `analysis_ready` only after required company/financial/methodology inputs validate.
- Portfolio universe size and portfolio asset count are separate; active solver policy and feasible constraints govern optimization selection.
- Large-universe browsing uses server-side search/filter and cursor pagination rather than loading every full assessment into one page request.

### P1 — Discover and review OSINT evidence

As an analyst, I can scan public sources from a company profile and review candidate events before a penalty affects risk results.

**Acceptance criteria**
- Each candidate carries ticker, title, URL, publisher/domain, fetched time, publication/event date when available, excerpt, source adapter, and review status.
- No-key/error/quota fallback is deterministic, visibly labelled `DEMO DATA`, and never described as a live scan.
- Search results default to `Needs review`; a mention alone does not count as a confirmed violation.
- Reviewer can approve, reject, or adjust a proposed event and record a reason. Only approved events contribute to the proposed POSINT recalculation.
- Before/after POSINT and RFin total can be traced to approved event IDs. Current workbook values that are contested remain annotated until a data owner decides.
- Re-running a scan deduplicates by canonical URL + normalized title + company + event date.

### P1 — Adjust and compare portfolio scenarios

As a fund manager, I can adjust capital, risk/ESG preferences, and weight limits, then see a reproducible allocation and the assumptions behind it.

**Acceptance criteria**
- UI exposes α, β, γ, δ, capital, min/max per-asset weights, and exclusions.
- Solver name/status, objective inputs, run time, constraint validation, and missing-data limitations are visible.
- Total weights equal 100% within the stated tolerance and each weight respects active constraints; infeasible input explains why.
- Expected return, realized return, portfolio risk, weighted ESG, and weighted financial/OSINT risk are displayed only when their inputs exist.
- Classical, QUBO-classical, and QAOA are distinct solver labels. An existing scenario lookup is not presented as a fresh optimization run.
- User can save and compare at least two named scenarios within the session.

### P1 — Analyze internal PDF evidence

As a reviewer, I can select a target company, upload one or more internal PDFs, and inspect extracted values with page-level evidence before applying them.

**Acceptance criteria**
- PDFs are processed locally by default; upload count, size/page limits, file status, and target company are visible.
- Supported text PDFs and scans produce extracted fields with document ID/name, page, quote/line, units, period, extraction method, and confidence where available.
- Structured financial ratios are calculated only from approved, validated inputs. Reported, calculated, and model-estimated values are separate.
- Conflicting documents are shown as conflicts; missing values are not guessed.
- Reviewer can approve/reject individual extracted fields. Private evidence never changes public company facts or another company/session.
- UI accurately states local cleanup behavior and does not claim infrastructure-wide zero retention.

### P1 — Produce a traceable report

As an analyst, I can export an assessment containing its scope, as-of dates, sources, formulas, approved evidence, scenario, data gaps, assumptions, and limitations.

**Acceptance criteria**
- Report distinguishes public verified facts, unverified public signals, private evidence, AI summaries, calculated metrics, and reviewer overrides.
- Every material claim links to an evidence record or formula/methodology version.
- Report contains no unsupported facts and marks missing values.

## Cross-cutting requirements

- Guest/demo mode is supported; demo status is always visible.
- Data universe and methodology are explicitly versioned; do not blend workbook revisions silently.
- The LLM is an evidence assistant, not the source of truth for arithmetic or external facts.
- External provider errors are user-visible and do not silently turn into live-looking demo output.
- Private content is not written to application logs.

## Out of scope for first deep demo

- Production authentication/workspaces and multi-tenant authorization.
- Automatic confirmation of regulatory violations.
- Live market-price feeds unless a licensed/approved provider is selected.
- Quantum hardware, quantum advantage claims, and QAOA until implemented and independently validated.
- Automatic ESG pillar scoring where approved methodology/data is absent.
