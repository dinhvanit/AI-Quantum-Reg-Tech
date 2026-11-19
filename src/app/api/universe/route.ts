import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_URL = process.env.QUANTUM_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const UNIVERSE_ID = process.env.UNIVERSE_ID ?? "demo-v1";

async function backendError(error: unknown) {
  const detail = error instanceof Error ? error.message : "Backend không phản hồi";
  return NextResponse.json(
    { detail: `Không kết nối được FastAPI tại ${API_URL}. Hãy khởi động backend rồi thử lại. (${detail})` },
    { status: 503 },
  );
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.toString();
  try {
    const response = await fetch(`${API_URL}/api/v1/companies${query ? `?${query}` : ""}`, { cache: "no-store" });
    return new NextResponse(response.body, { status: response.status, headers: { "content-type": "application/json" } });
  } catch (error) {
    return backendError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(`${API_URL}/api/v1/universes/${encodeURIComponent(UNIVERSE_ID)}/companies`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return new NextResponse(response.body, { status: response.status, headers: { "content-type": "application/json" } });
  } catch (error) {
    return backendError(error);
  }
}
