import { NextResponse } from "next/server";
import events from "@/data/osint_events.json";
import companies from "@/data/companies.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.QUANTUM_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const MAX_TICKERS = 4;

/**
 * Proxy to the FastAPI LangGraph OSINT workflow (Firecrawl search → Neo4j context → Jina fallback → LLM → quote validation).
 * There is deliberately no second search implementation here: when FastAPI is unreachable the route returns
 * workbook events labelled DEMO DATA. Neither search nor LLM writes official POSINT.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { tickers?: unknown };
  const tickers = Array.isArray(body.tickers) ? body.tickers.filter((t): t is string => typeof t === "string") : [];
  if (!tickers.length) return NextResponse.json({ error: "Chọn ít nhất một mã." }, { status: 400 });
  if (tickers.length > MAX_TICKERS) return NextResponse.json({ error: `Tối đa ${MAX_TICKERS} mã cho một lượt quét.` }, { status: 413 });

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/osint/scans`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tickers }),
      cache: "no-store",
      signal: AbortSignal.timeout(90_000),
    });
  } catch {
    return workbookFallback(tickers);
  }

  const payload = await response.json().catch(() => null) as { detail?: unknown } | null;
  if (response.ok && payload) return NextResponse.json(payload);
  const detail = typeof payload?.detail === "string" ? payload.detail : `Backend OSINT lỗi HTTP ${response.status}.`;
  return NextResponse.json({ error: detail }, { status: response.status });
}

function workbookFallback(tickers: string[]) {
  const valid = new Set(tickers.map((t) => t.toUpperCase()).filter((t) => companies.some((c) => c.ticker === t)));
  if (!valid.size) return NextResponse.json({ error: "Chọn ít nhất một mã hợp lệ." }, { status: 400 });
  const findings = (events as Array<{ ticker: string; title: string; source: string; url: string; active: boolean; penalty: number; date: string }>)
    .filter((e) => valid.has(e.ticker))
    .map((e) => ({ ticker: e.ticker, title: e.title, source: e.source, url: e.url, status: e.active ? "Already in assessment" : "Needs review", demo: true, penalty: e.penalty, eventDate: e.date, alreadyInAssessment: e.active }));
  return NextResponse.json({
    mode: "demo",
    backend: "unavailable",
    providers: [],
    warnings: [`Không kết nối được backend OSINT tại ${API_URL}; chưa tìm kiếm trực tiếp. Khởi động FastAPI rồi thử lại.`],
    findings,
  });
}
