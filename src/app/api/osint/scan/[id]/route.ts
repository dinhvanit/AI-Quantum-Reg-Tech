import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_URL = process.env.QUANTUM_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

/** Poll proxy for a running OSINT scan job. The id is validated so it cannot rewrite the backend path. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{32}$/.test(id)) return NextResponse.json({ error: "Mã lượt quét không hợp lệ." }, { status: 400 });

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/osint/scans/${id}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
  } catch {
    return NextResponse.json({ error: `Mất kết nối backend OSINT tại ${API_URL} khi đang chờ kết quả.` }, { status: 503 });
  }
  const payload = await response.json().catch(() => null) as { detail?: unknown } | null;
  if (response.ok && payload) return NextResponse.json(payload);
  const detail = typeof payload?.detail === "string" ? payload.detail : `Backend OSINT lỗi HTTP ${response.status}.`;
  return NextResponse.json({ error: detail }, { status: response.status });
}
