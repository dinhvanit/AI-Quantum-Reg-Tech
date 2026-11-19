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


def test_full_graph_firecrawl_only(monkeypatch):
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
