# External Services and Tool Selection

**Review date:** 2026-11-19. Free tiers, model availability, API limits, and terms change; verify before a public demo. See [implementation plan](../specs/001-investor-due-diligence-demo/plan.md).

## Recommended deep-demo stack

1. **LangGraph + LangChain** — explicit Python workflow and model/tool adapters. Use a bounded graph with narrow tool permissions, not a free-running multi-agent system. [Official overview](https://www.langchain.com/langgraph).
2. **GDELT + one targeted search provider** — implemented GDELT for one-ticker news discovery and Firecrawl for optional targeted queries. Results are deduplicated; GDELT is a lead generator, never proof of wrongdoing. [GDELT DOC API](https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/).
3. **One content extractor** — implemented Jina Reader as a bounded fallback for one headline-only result per scan; Firecrawl excerpts are used when available. Preserve canonical source URL and excerpts. [Jina Reader](https://jina.ai/reader/).
4. **One LLM provider adapter** — implemented server-side Gemini or Groq for OSINT candidate classification and opt-in private-document extraction. Document fields require page/quote and numeric grounding before use; deterministic code remains the comparison baseline. Durable approvals are not implemented.
5. **SQLite initially** — store analysis session, findings, reviewer decisions, audit trail, and scenarios. It is more valuable for a credible demo than adding a graph/vector DB prematurely.
6. **Qdrant later** — add when the demo needs semantic retrieval across many long reports and news articles. Local/self-hosting avoids managed-vector service fees, but still has infrastructure/operations cost. [Qdrant local quickstart](https://qdrant.tech/documentation/quickstart/).

## Tool-by-tool fit

| Tool | Cost/constraints | QuantumRegTech role | Recommendation |
|---|---|---|---|
| GDELT | Public DOC/event data; no per-request vendor key for DOC API, subject to service constraints | Broad news discovery (currently single-ticker scan, recent article window) | Implemented as a lead generator; require source review for material claims |
| Tavily | Vendor quotas/credit use depend on request settings | Targeted web/news search for company-specific evidence | Implemented as the selectable Firecrawl alternative; set `OSINT_SEARCH_PROVIDER=tavily` |
| Firecrawl | API key/usage quota; already has a server-side search adapter in this repo | Optional targeted search and excerpt retrieval | Implemented when a key is configured; do not interpret search result as a verified event |
| Jina Reader | Basic Reader available free with rate limits; API key changes limits/usage terms | Convert a known URL to LLM-readable text, including many PDFs | Use when current search adapter cannot return source text; do not use to process confidential internal PDFs by default |
| Gemini API | Model/account free-tier quotas and submitted-data terms vary | OSINT classification and optionally consented document extraction | Alternative provider; check current model availability and data controls before private text |
| Groq | Model/account rate limits vary; repeated document extraction can return `RateLimitError` | OSINT classification and optionally consented document extraction | Active provider in current local demo; use synthetic docs and watch quota. Review current data controls before private text |
| Scrapy | Open-source software; no API fee, but crawler maintenance, compute, and target-site policy cost remain | Scheduled spiders for permitted, stable sites | Defer until APIs/search miss an important source and a site-specific spider is justified |
| Playwright | Open-source browser automation; browser runtime/maintenance still cost time/compute | JS-heavy sites or end-to-end testing | Keep for E2E tests (already in repo); not the default search/crawl tool |
| Neo4j Aura | Managed database cost/limits depend on the selected Aura tier | Company/event/article relationship context for OSINT and MCP-compatible graph exploration | Backend driver is connected read-only; current database is empty. Aura MCP is a separate IDE connection, not called by the app. Seed/import is explicit and provenance-tagged |
| SSI FastConnect V3 | Market-data access requires activation/API credentials; quotas are exposed by response headers and provider terms apply | Daily OHLCV and corporate-action data for research returns | Read-only client/CLI is implemented; not activated or called in this workspace. No backtest may use the raw bars until units and actions are validated |
| Qdrant | Open-source self-hosting has no per-query cloud charge; Docker/CPU/RAM/backup/operations are not free | Semantic retrieval across many chunks | Defer for the four-company demo; page-indexed retrieval can start with SQLite/full-text search |
| LangGraph | Open-source library; self-hosted service and deployment are not automatically free | Stateful multi-step workflow, typed agent steps, and eventual human approval | In use for bounded OSINT workflow; durable checkpoints and review persistence remain open |

## Hiện trạng runtime trong repo

- **B1 tra cứu:** FastAPI đọc JSON sinh từ workbook; `scripts/build-data.mjs` tính lại một số chỉ số. Chưa kết nối market-data API realtime.
- **B2 OSINT:** route same-origin Next.js gọi FastAPI/LangGraph trước; có fallback Next.js live-provider path nếu FastAPI lỗi. GDELT không cần key; Firecrawl là provider tìm kiếm mục tiêu đang cấu hình; Tavily là lựa chọn thay thế cần key riêng. Jina Reader trích tối đa một bài thiếu excerpt. Groq đang là `AI_PROVIDER`; Gemini đã được cấu hình làm lựa chọn đổi provider. Kết quả vẫn là candidate chờ review.
- **Neo4j:** kết nối qua driver read-only nhưng graph chưa có node. Aura MCP cho IDE được cấu hình riêng, không phải app agent tool.
- **B3 danh mục:** đọc hai scenario workbook; chưa gọi solver hay quantum hardware.
- **B4 PDF:** PDF.js/Tesseract OCR và parser Rules chạy trên browser. Checkbox opt-in mới gửi text trích xuất tới FastAPI → LangGraph `llm_extract → validate_evidence` → LangChain Groq/Gemini; không gửi PDF gốc. Schema hiện có 9 chỉ tiêu, chưa phải RAG.
- **Qdrant/Scrapy:** chưa được cài hoặc gọi. **Playwright:** dependency/cấu hình E2E có trong repo, không chạy trong luồng sản phẩm.
- **Runtime local:** Next.js UI + FastAPI; SQLite dùng registry ticker `pending_data`, chưa dùng làm audit/session store.

Pricing/terms references: [Tavily pricing](https://www.tavily.com/pricing), [Jina Reader pricing](https://jina.ai/reader/), [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing), [Groq limits](https://console.groq.com/docs/rate-limits), [Groq data controls](https://console.groq.com/docs/your-data), [Neo4j Aura pricing](https://neo4j.com/pricing/), [Neo4j hosted MCP](https://neo4j.com/docs/mcp/current/quickstart/), [Scrapy docs](https://docs.scrapy.org/en/latest/), [Playwright docs](https://playwright.dev/docs/intro).

## Security and data rules

- Local mono-repo secrets live in root `.env.local` (outside `src/`, ignored by Git); Next.js and FastAPI load the server keys. Production values belong to each service's secret manager. Only non-secret API URL/config may be `NEXT_PUBLIC_*`.
- Retrieved pages and PDFs are untrusted input. Instruct extraction models to ignore embedded instructions; expose no arbitrary browser, shell, or file tools to the model.
- Validate URL scheme, host, response size, content type, and timeout. Restrict internal-address access to prevent SSRF if the service fetches arbitrary URLs.
- Require source URL and a supporting quote/snippet for every OSINT extraction. Do not let a model invent source metadata.
- No external LLM call for private PDF text without a separate consent action and clear provider/data-use notice.
- Implement per-provider rate limits, retries with backoff, timeout, cost/quota telemetry, and clear fallback labels.
- Provider outage falls back to deterministic demo records only with `DEMO DATA` visibly shown.
