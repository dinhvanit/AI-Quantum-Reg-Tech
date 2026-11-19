"""OSINT agent tests. External services (Firecrawl, Jina, Neo4j, LLM) are replaced with fakes; nothing hits the network."""

from __future__ import annotations

import asyncio
import json

import httpx
import pytest

from app.agents import osint_graph as og

ARTICLE = (
    "# Tin doanh nghiệp\n\n"
    "Thị trường sữa tăng trưởng ổn định trong năm.\n\n"
    "Cục Thuế đã ban hành **quyết định xử phạt** CTCP Sữa Việt Nam (VNM) số tiền 1,2 tỷ đồng do kê khai sai.\n\n"
    "[Xem thêm](https://example.vn/khac)"
)


def test_search_name_strips_company_prefix():
    assert og.search_name({"name": "CTCP Sữa Việt Nam"}) == "Sữa Việt Nam"
    assert og.search_name({"name": "Tổng CTCP Bia - Rượu - Nước giải khát Sài Gòn"}) == "Bia - Rượu - Nước giải khát Sài Gòn"


def test_build_excerpt_keeps_penalty_paragraph_and_strips_markdown():
    excerpt = og.build_excerpt(ARTICLE, "", "VNM", "Sữa Việt Nam")
    assert "quyết định xử phạt CTCP Sữa Việt Nam" in excerpt
    assert "**" not in excerpt and "https://" not in excerpt


def test_quote_supported_ignores_case_and_whitespace():
    excerpt = "Cục Thuế đã ban hành quyết định\n xử phạt   CTCP Sữa Việt Nam"
    assert og.quote_supported("QUYẾT ĐỊNH XỬ PHẠT ctcp sữa việt nam", excerpt)
    assert not og.quote_supported("bị khởi tố", excerpt)
    assert not og.quote_supported("", excerpt)


def test_external_url_blocks_private_hosts():
    assert og._external_url("https://vnexpress.net/a") == "https://vnexpress.net/a"
    for url in ("http://vnexpress.net/a", "https://localhost/a", "https://10.0.0.1/a", "https://user:pw@site.vn/a", "https://intranet/a"):
        assert og._external_url(url) is None


def test_lookback_tbs_uses_custom_range(monkeypatch):
    monkeypatch.setenv("OSINT_LOOKBACK_YEARS", "2")
    assert og._lookback_tbs().startswith("cdr:1,cd_min:")


def test_discover_without_key_falls_back_to_workbook(monkeypatch):
    monkeypatch.delenv("FIRECRAWL_API_KEY", raising=False)
    monkeypatch.setattr(og, "_read_json", lambda name: [{"ticker": "VNM", "name": "CTCP Sữa Việt Nam"}] if name == "companies.json" else [
        {"ticker": "VNM", "title": "Sự kiện mẫu", "source": "Workbook", "url": "https://example.vn/a", "active": True, "penalty": 0.1, "date": "2022-TODO"},
    ])
    result = asyncio.run(og.discover({"tickers": ["VNM"]}))
    assert result["mode"] == "demo"
    assert result["findings"][0]["demo"] is True
    assert any("FIRECRAWL_API_KEY" in warning for warning in result["warnings"])


class _FakeStructured:
    def __init__(self, items):
        self.items = items
        self.messages = None

    async def ainvoke(self, messages):
        self.messages = messages
        return og.ProposalBatch(items=self.items)


class _FakeModel:
    def __init__(self, items):
        self.structured = _FakeStructured(items)

    def with_structured_output(self, *_args, **_kwargs):
        return self.structured


class _FakeNeo4j:
    def company_context(self, ticker):
        return {"available": True, "matched": False, "company": None, "events": []}


def test_full_graph_firecrawl_search_mode(monkeypatch):
    """discover → graph_enrichment → extract → classify → validate with fake providers."""
    calls: list[dict] = []

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "api.firecrawl.dev":
            body = json.loads(request.content)
            calls.append(body)
            assert "OR" not in body["query"].split()  # Firecrawl has no OR operator
            assert body["sources"] == [{"type": "web"}]
            web = [{"url": "https://baomoi.vn/vnm-bi-phat", "title": "VNM bị phạt thuế", "description": "", "markdown": ARTICLE}]
            if "môi trường" in body["query"]:
                web.append({"url": "https://tin.vn/khong-noi-dung", "title": "Tin chỉ có tiêu đề", "description": "", "markdown": ""})
            return httpx.Response(200, json={"success": True, "data": {"web": web}})
        if request.url.host == "r.jina.ai":
            return httpx.Response(200, text="Bài viết về chương trình sữa học đường, không có nội dung xử phạt nào cả.", headers={"content-type": "text/plain"})
        raise AssertionError(f"unexpected request {request.url}")

    real_client = httpx.AsyncClient
    monkeypatch.setattr(og.httpx, "AsyncClient", lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **{k: v for k, v in kwargs.items() if k != "transport"}))
    monkeypatch.setenv("FIRECRAWL_API_KEY", "test-key")
    monkeypatch.setenv("OSINT_DISCOVERY", "search")
    monkeypatch.setenv("AI_PROVIDER", "groq")
    monkeypatch.setattr(og, "_read_json", lambda name: [{"ticker": "VNM", "name": "CTCP Sữa Việt Nam"}])
    import app.services.neo4j as neo4j_module
    monkeypatch.setattr(neo4j_module, "get_neo4j_service", lambda: _FakeNeo4j())

    model = _FakeModel([
        og.Proposal(index=0, related=True, event_type="tax", severity=2, confidence=0.8,
                    evidence_quote="quyết định xử phạt CTCP Sữa Việt Nam (VNM) số tiền 1,2 tỷ đồng"),
        og.Proposal(index=1, related=True, event_type="environment", severity=3, confidence=0.9,
                    evidence_quote="câu bịa không có trong bài"),
    ])
    monkeypatch.setattr(og, "_chat_model", lambda provider: ("fake-model", model))

    result = asyncio.run(og.run_osint_graph(["VNM"]))

    assert len(calls) == len(og.PENALTY_QUERIES)
    assert result["mode"] == "live"
    assert result["providers"] == ["firecrawl", "jina-reader"]
    assert result["search"]["queries"] == 4
    assert len(result["findings"]) == 2  # same URL from 4 queries is deduplicated
    grounded, ungrounded = result["findings"]
    assert grounded["aiProposal"]["severity"] == 2 and grounded["proposedPenalty"] == 0.1
    assert ungrounded["readerProvider"] == "jina-reader"
    assert ungrounded["aiProposal"]["severity"] is None and ungrounded["proposedPenalty"] is None
    assert result["ai"]["validated_quote_count"] == 1


@pytest.mark.parametrize("mode", ["demo"])
def test_classify_skips_workbook_fallback(mode):
    result = asyncio.run(og.classify({"mode": mode, "findings": [{"title": "x", "demo": True}]}))
    assert result["ai"]["mode"] == "skipped"


JOB_ID = "123e4567-e89b-12d3-a456-426614174000"


def _agent_env(monkeypatch, handler):
    real_client = httpx.AsyncClient
    monkeypatch.setattr(og.httpx, "AsyncClient", lambda **kwargs: real_client(transport=httpx.MockTransport(handler), **{k: v for k, v in kwargs.items() if k != "transport"}))
    monkeypatch.setattr(og, "AGENT_POLL_SECONDS", 0)
    monkeypatch.setenv("FIRECRAWL_API_KEY", "test-key")
    monkeypatch.delenv("OSINT_DISCOVERY", raising=False)  # agent is the default
    monkeypatch.setenv("AI_PROVIDER", "groq")
    monkeypatch.setattr(og, "_read_json", lambda name: [{"ticker": "VNM", "name": "CTCP Sữa Việt Nam"}])
    import app.services.neo4j as neo4j_module
    monkeypatch.setattr(neo4j_module, "get_neo4j_service", lambda: _FakeNeo4j())


def test_full_graph_agent_mode_verifies_quotes_against_source(monkeypatch):
    calls = {"start": [], "polls": 0, "scrape": []}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.host == "api.firecrawl.dev" and request.url.path == "/v2/agent":
            body = json.loads(request.content)
            calls["start"].append(body)
            return httpx.Response(200, json={"success": True, "id": JOB_ID})
        if request.url.host == "api.firecrawl.dev" and request.url.path == f"/v2/agent/{JOB_ID}":
            calls["polls"] += 1
            if calls["polls"] == 1:
                return httpx.Response(200, json={"success": True, "status": "processing"})
            return httpx.Response(200, json={"success": True, "status": "completed", "creditsUsed": 180, "data": {"events": [
                {"title": "VNM bị phạt thuế", "url": "https://baomoi.vn/vnm-bi-phat", "category": "tax", "published_date": "2024-05-02",
                 "authority": "Cục Thuế", "amount_text": "1,2 tỷ đồng",
                 "quote": "Cục Thuế đã ban hành quyết định xử phạt CTCP Sữa Việt Nam (VNM) số tiền 1,2 tỷ đồng do kê khai sai."},
                {"title": "Tin bịa", "url": "https://tin.vn/bia", "category": "environment", "quote": "VNM bị phạt 50 tỷ vì xả thải"},
                {"title": "URL nội bộ", "url": "http://10.0.0.1/x", "category": "tax", "quote": "x"},
            ]}})
        if request.url.host == "api.firecrawl.dev" and request.url.path == "/v2/scrape":
            url = json.loads(request.content)["url"]
            calls["scrape"].append(url)
            if url.endswith("/bia"):
                return httpx.Response(200, json={"success": True, "data": {"markdown": "Bài viết về chương trình sữa học đường, không có xử phạt."}})
            return httpx.Response(200, json={"success": True, "data": {"markdown": ARTICLE}})
        raise AssertionError(f"unexpected request {request.url}")

    _agent_env(monkeypatch, handler)
    model = _FakeModel([
        og.Proposal(index=0, related=True, event_type="tax", severity=2, confidence=0.8,
                    evidence_quote="quyết định xử phạt CTCP Sữa Việt Nam (VNM) số tiền 1,2 tỷ đồng"),
        og.Proposal(index=1, related=True, event_type="environment", severity=3, confidence=0.9,
                    evidence_quote="VNM bị phạt 50 tỷ vì xả thải"),
    ])
    monkeypatch.setattr(og, "_chat_model", lambda provider: ("fake-model", model))

    result = asyncio.run(og.run_osint_graph(["VNM"]))

    start = calls["start"][0]
    assert start["schema"]["properties"]["events"]["items"]["required"] == ["title", "url", "category", "quote"]
    assert start["location"] == {"country": "VN"} and start["maxCredits"] == 500
    assert "VNM" in start["prompt"] and "Sữa Việt Nam" in start["prompt"]
    assert result["mode"] == "live" and result["discovery"] == "agent"
    assert result["providers"] == ["firecrawl-agent", "firecrawl-scrape"]
    assert result["search"]["credits_used"] == 180 and result["search"]["agent_quotes_verified"] == 1
    assert len(result["findings"]) == 2  # private URL dropped
    real, fabricated = result["findings"]
    assert real["agentClaim"]["quoteVerified"] is True and real["publishedAt"] == "2024-05-02"
    assert real["aiProposal"]["severity"] == 2 and real["proposedPenalty"] == 0.1
    assert fabricated["agentClaim"]["quoteVerified"] is False
    assert fabricated["aiProposal"]["severity"] is None and fabricated["proposedPenalty"] is None


def test_agent_credit_stop_uses_partial(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v2/agent":
            return httpx.Response(200, json={"success": True, "id": JOB_ID})
        if request.url.path == f"/v2/agent/{JOB_ID}":
            return httpx.Response(200, json={"success": True, "status": "failed", "stopReason": "credit_limit_reached", "creditsUsed": 500, "partial": {"events": []}})
        raise AssertionError(f"unexpected request {request.url}")

    _agent_env(monkeypatch, handler)
    monkeypatch.setattr(og, "_read_json", lambda name: [{"ticker": "VNM", "name": "CTCP Sữa Việt Nam"}] if name == "companies.json" else [])
    result = asyncio.run(og.discover({"tickers": ["VNM"]}))
    assert result["search"]["runs"][0]["status"] == "partial"
    assert any("OSINT_AGENT_MAX_CREDITS" in w for w in result["warnings"])
    # partial run is not "completed" and found nothing → honest workbook fallback with label
    assert result["mode"] == "demo"


def test_agent_failure_reports_warning(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(402, json={"error": "Payment required"})

    _agent_env(monkeypatch, handler)
    monkeypatch.setattr(og, "_read_json", lambda name: [{"ticker": "VNM", "name": "CTCP Sữa Việt Nam"}] if name == "companies.json" else [])
    result = asyncio.run(og.discover({"tickers": ["VNM"]}))
    assert result["mode"] == "demo"
    assert any("402" in w and "hết credit" in w for w in result["warnings"])


def test_scan_jobs_run_in_background():
    from app.services import osint_jobs

    async def scenario():
        async def runner(tickers):
            await asyncio.sleep(0)
            return {"tickers": tickers, "findings": []}

        started = osint_jobs.start_job(["VNM"], runner)
        assert started["status"] == "running" and len(started["scan_id"]) == 32
        await asyncio.sleep(0.01)
        done = osint_jobs.get_job(started["scan_id"])
        assert done["status"] == "completed" and done["result"]["tickers"] == ["VNM"]

        async def broken(_tickers):
            raise RuntimeError("boom")

        failed = osint_jobs.start_job(["VNM"], broken)
        await asyncio.sleep(0.01)
        job = osint_jobs.get_job(failed["scan_id"])
        assert job["status"] == "failed" and "RuntimeError" in job["error"] and "boom" not in job["error"]
        assert osint_jobs.get_job("0" * 32) is None

    asyncio.run(scenario())


def test_agent_completed_without_events_is_honest_empty_live(monkeypatch):
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v2/agent":
            return httpx.Response(200, json={"success": True, "id": JOB_ID})
        return httpx.Response(200, json={"success": True, "status": "completed", "creditsUsed": 90, "data": {"events": []}})

    _agent_env(monkeypatch, handler)
    result = asyncio.run(og.discover({"tickers": ["VNM"]}))
    assert result["mode"] == "live" and result["findings"] == []
    assert any("không tìm thấy" in w for w in result["warnings"])
