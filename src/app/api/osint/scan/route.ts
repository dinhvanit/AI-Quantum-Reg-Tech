import { NextResponse } from "next/server";
import events from "@data/osint_events.json";
import companies from "@data/companies.json";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.QUANTUM_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
const MAX_TICKERS = 4;

/**
 * Starts a FastAPI OSINT scan job (Firecrawl Agent for one data year → reviewer acceptance) and returns
 * `{ scan_id, status: "running" }`; the client polls GET /api/osint/scan/{id}.
 * There is deliberately no second search implementation here: when FastAPI is unreachable the route returns the
 * workbook events already reviewed for that year (no polling). Neither the agent nor an LLM writes official P_OSINT.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { tickers?: unknown; year?: unknown };
  const tickers = Array.isArray(body.tickers) ? body.tickers.filter((t): t is string => typeof t === "string") : [];
  const year = Number(body.year);
  if (!tickers.length) return NextResponse.json({ error: "Chọn ít nhất một mã." }, { status: 400 });
  if (!Number.isInteger(year) || year < 2000 || year > new Date().getFullYear()) return NextResponse.json({ error: "Năm quét không hợp lệ." }, { status: 400 });
  if (tickers.length > MAX_TICKERS) return NextResponse.json({ error: `Tối đa ${MAX_TICKERS} mã cho một lượt quét.` }, { status: 413 });

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/osint/scans`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tickers, year }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return workbookFallback(tickers, year);
  }

  const payload = await response.json().catch(() => null) as { detail?: unknown } | null;
  if (response.ok && payload) return NextResponse.json(payload);
  const detail = typeof payload?.detail === "string" ? payload.detail : `Backend OSINT lỗi HTTP ${response.status}.`;
  return NextResponse.json({ error: detail }, { status: response.status });
}

function workbookFallback(tickers: string[], year: number) {
  const valid = new Set(tickers.map((t) => t.toUpperCase()).filter((t) => companies.some((c) => c.ticker === t)));
  if (!valid.size) return NextResponse.json({ error: "Chọn ít nhất một mã hợp lệ." }, { status: 400 });
  const findings = (events as Array<{ ticker: string; title: string; source: string; url: string; severity: number; penalty: number; decisionYear: number; dateNote: string | null }>)
    .filter((e) => valid.has(e.ticker) && e.decisionYear === year)
    .map((e) => ({ ticker: e.ticker, title: e.title, source: e.source, url: e.url, sourceProvider: "workbook", status: "Already in assessment", reviewed: true, penaltyLevel: e.severity, penalty: e.penalty, eventDate: e.dateNote ?? String(e.decisionYear), decisionYear: e.decisionYear, alreadyInAssessment: true }));
  return NextResponse.json({
    mode: "workbook",
    backend: "unavailable",
    year,
    providers: [],
    warnings: [`Không kết nối được backend OSINT tại ${API_URL}; chưa chạy Firecrawl Agent. Chỉ hiển thị sự kiện đã duyệt trong bộ dữ liệu năm ${year}.`],
    findings,
  });
}
