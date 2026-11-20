"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Play } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

type Status = "Needs review" | "Verified" | "Rejected" | "Already in assessment";
type Finding = {
  ticker: string; title: string; source: string; url: string; sourceProvider?: string; searchCategory?: string; readerProvider?: string;
  status: Status; reviewed?: boolean; penaltyLevel?: number; acceptedLevel?: number; excerpt?: string; publishedAt?: string; eventDate?: string;
  alreadyInAssessment?: boolean;
  agentClaim?: { quote: string; authority: string; amountText: string; quoteVerified: boolean };
  aiProposal?: { related: boolean; eventType: string; severity: number | null; confidence: number; evidenceQuote: string; rationale: string };
};
type ScanPayload = {
  mode?: string;
  year?: number;
  warnings?: string[];
  findings?: Finding[];
  workflow?: string[];
  providers?: string[];
  duration_ms?: number;
  graph?: { available?: boolean; matched_tickers?: string[] };
  search?: { runs?: Array<{ status?: string }>; credits_used?: number; pages_read?: number; agent_quotes_verified?: number; prompts?: Record<string, string> };
  ai?: { mode?: string; provider?: string; model?: string; proposal_count?: number; validated_quote_count?: number; warning?: string };
};

const CATEGORY: Record<string, string> = { tax: "Thuế", environment: "Môi trường", securities: "Chứng khoán", administrative: "Hành chính", other: "Khác" };
const LEVELS = [1, 2, 3] as const;
const POLL_MS = 3000;
const MAX_WAIT_MS = 10 * 60 * 1000; // Firecrawl Agent thường mất vài phút; dừng chờ ở phía trình duyệt sau 10 phút.

/** Mức người duyệt đã chấp nhận cao nhất (0 nếu không có). */
export function acceptedLevel(findings: { status: string; acceptedLevel?: number }[]) {
  return findings.reduce((max, f) => (f.status === "Verified" ? Math.max(max, f.acceptedLevel ?? 0) : max), 0);
}

/**
 * Quét OSINT cho một mã trong năm dữ liệu `year` bằng Firecrawl Agent. Sự kiện mới chỉ là ứng viên: người dùng mở
 * nguồn, chọn mức 1–3 rồi chấp nhận. P_OSINT = bảng Params theo mức cao nhất (sự kiện đã duyệt trong bộ dữ liệu
 * và sự kiện vừa chấp nhận), không cộng dồn. Kết quả chỉ dùng trong phiên, chưa ghi vào hồ sơ.
 */
export function OsintScanner({ ticker, year, rfinBase, workbookLevel, penaltyTable, existingUrls = [], onAcceptedLevel }: {
  ticker: string;
  year: number;
  rfinBase: number;
  /** Mức cao nhất của sự kiện đã duyệt trong workbook cho năm này. */
  workbookLevel: number;
  /** Params: mức → P_OSINT. */
  penaltyTable: Record<string, number>;
  existingUrls?: string[];
  onAcceptedLevel?: (ticker: string, level: number) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [meta, setMeta] = useState<ScanPayload>({});
  const [elapsed, setElapsed] = useState(0);
  const cancelled = useRef(false);
  // Đặt lại cờ khi mount: React StrictMode (dev) mount → unmount → mount, nếu không reset thì cờ kẹt ở true
  // và vòng poll thoát ngay với "Đã rời trang".
  useEffect(() => {
    cancelled.current = false;
    return () => { cancelled.current = true; };
  }, []);

  /** POST bắt đầu job; nếu backend trả scan_id thì hỏi trạng thái tới khi xong. Fallback workbook trả kết quả ngay. */
  async function runScan(): Promise<ScanPayload> {
    const response = await fetch("/api/osint/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tickers: [ticker], year }) });
    const started = await response.json();
    if (!response.ok) throw new Error(started.error ?? "OSINT scan thất bại");
    if (!started.scan_id) return started;
    const t0 = Date.now();
    while (!cancelled.current) {
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      setElapsed(Math.round((Date.now() - t0) / 1000));
      const poll = await fetch(`/api/osint/scan/${started.scan_id}`, { cache: "no-store" });
      const job = await poll.json();
      if (!poll.ok) throw new Error(job.error ?? "Không đọc được trạng thái lượt quét.");
      if (job.status === "completed") return job.result;
      if (job.status === "failed") throw new Error(job.error ?? "OSINT scan thất bại.");
      if (Date.now() - t0 > MAX_WAIT_MS) throw new Error("Lượt quét chạy quá 10 phút; dừng chờ. Kiểm tra log backend.");
    }
    throw new Error("Đã rời trang.");
  }

  async function scan() {
    setBusy(true);
    setMessage("");
    setElapsed(0);
    try {
      const payload = await runScan();
      const existing = new Set(existingUrls.map(canonicalUrl));
      const next = (payload.findings ?? []).map((f) => existing.has(canonicalUrl(f.url)) && f.status === "Needs review"
        ? { ...f, status: "Already in assessment" as const, alreadyInAssessment: true }
        : f);
      setFindings(next);
      setMeta(payload);
      onAcceptedLevel?.(ticker, 0);
      const warnings = payload.warnings?.length ? ` ${payload.warnings.join(" ")}` : "";
      setMessage(payload.mode === "live"
        ? `Firecrawl Agent – năm ${year}. Sự kiện mới là ứng viên: mở nguồn, chọn mức rồi chấp nhận hoặc bỏ.${payload.ai?.warning ? ` ${payload.ai.warning}` : ""}${warnings}`
        : `Chưa chạy được Firecrawl Agent; chỉ hiển thị sự kiện đã duyệt trong bộ dữ liệu năm ${year}.${warnings}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể chạy OSINT scan.");
    } finally {
      setBusy(false);
    }
  }

  function review(index: number, status: Status, level?: number) {
    const next = findings.map((f, i) => (i === index ? { ...f, status, acceptedLevel: status === "Verified" ? level : undefined } : f));
    setFindings(next);
    onAcceptedLevel?.(ticker, acceptedLevel(next));
  }

  const accepted = acceptedLevel(findings);
  const level = Math.max(workbookLevel, accepted);
  const posintBefore = penaltyTable[String(workbookLevel)] ?? 0;
  const posintAfter = penaltyTable[String(level)] ?? 0;
  const live = findings.filter((f) => f.sourceProvider !== "workbook");
  const reviewed = findings.filter((f) => f.sourceProvider === "workbook");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={scan} disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" /> : <Play />} {busy ? `Đang quét${elapsed ? ` · ${elapsed} giây` : ""}` : `Quét OSINT ${ticker} năm ${year}`}
        </Button>
        <span className="text-xs text-muted-foreground">{busy ? "Firecrawl Agent thường mất vài phút." : `Sự kiện năm ${year} tính vào dự báo năm ${year + 1}. Kết quả cần người dùng chấp nhận.`}</span>
      </div>
      {meta.search?.prompts?.[ticker] && <p className="text-[11px] text-muted-foreground">Prompt: “{meta.search.prompts[ticker]}”</p>}
      {message && <p className="rounded-lg bg-muted p-3 text-xs">{message}</p>}
      {meta.workflow?.length ? <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
        <span className="rounded border px-2 py-1">{meta.search?.runs?.length ?? 0} lượt agent · {formatNumber(meta.search?.credits_used ?? 0, 0)} credit{meta.search?.pages_read != null ? ` · ${meta.search.agent_quotes_verified ?? 0}/${meta.search.pages_read} quote có trong trang nguồn` : ""} · {live.length} ứng viên{meta.duration_ms != null ? ` · ${formatNumber(meta.duration_ms / 1000, 1)} giây` : ""}</span>
        <span className="rounded border px-2 py-1">LLM: {meta.ai?.mode === "live" ? `${meta.ai.provider}/${meta.ai.model} · ${meta.ai.validated_quote_count ?? 0} quote khớp nguồn` : meta.ai?.mode ?? "chưa rõ"}</span>
        <span className="rounded border px-2 py-1">Neo4j: {meta.graph?.available ? meta.graph.matched_tickers?.includes(ticker) ? "đã tìm thấy node công ty" : "đã kết nối, chưa có node công ty" : "chưa kết nối"}</span>
      </div> : null}

      {live.map((finding) => {
        const index = findings.indexOf(finding);
        return <div key={`${finding.url}-${index}`} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{finding.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{finding.source}{finding.searchCategory ? ` · ${CATEGORY[finding.searchCategory] ?? finding.searchCategory}` : ""}{finding.publishedAt ? ` · ${finding.publishedAt}` : ""} · {finding.status === "Verified" ? `Đã chấp nhận mức ${finding.acceptedLevel}` : finding.status === "Rejected" ? "Đã bỏ" : finding.alreadyInAssessment ? "Đã có trong bộ dữ liệu" : "Chờ người dùng xác nhận"}</p>
            {finding.agentClaim && <div className="mt-2 rounded-md border border-dashed p-2 text-xs">
              <p className="font-medium">Firecrawl Agent ghi nhận{finding.agentClaim.authority ? ` · ${finding.agentClaim.authority}` : ""}{finding.agentClaim.amountText ? ` · ${finding.agentClaim.amountText} (theo nguồn)` : ""} · {finding.readerProvider ? (finding.agentClaim.quoteVerified ? "quote có trong trang nguồn" : "quote KHÔNG tìm thấy trong trang nguồn") : "chưa đối chiếu trang nguồn – mở nguồn để kiểm tra"}</p>
              {finding.agentClaim.quote && <blockquote className="mt-1 border-l-2 pl-2 italic">“{finding.agentClaim.quote}”</blockquote>}
            </div>}
            {finding.aiProposal && <div className="mt-2 rounded-md bg-muted/60 p-2 text-xs">
              <p className="font-medium">Gợi ý AI · {finding.aiProposal.related ? `liên quan · mức ${finding.aiProposal.severity ?? "chưa đủ bằng chứng"}` : "có thể không liên quan"} · độ tin cậy AI tự đánh giá {formatNumber(finding.aiProposal.confidence * 100, 0)}%</p>
              {finding.aiProposal.evidenceQuote && <blockquote className="mt-1 border-l-2 pl-2 italic">“{finding.aiProposal.evidenceQuote}”</blockquote>}
            </div>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={finding.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Mở nguồn</a>
            {finding.status === "Needs review" && <>
              {LEVELS.map((value) => <Button key={value} size="sm" variant="outline" onClick={() => review(index, "Verified", value)} title={`P_OSINT +${formatNumber(penaltyTable[String(value)] ?? 0)}`}>Chấp nhận mức {value}</Button>)}
              <Button size="sm" variant="ghost" onClick={() => review(index, "Rejected")}>Bỏ</Button>
            </>}
            {(finding.status === "Verified" || finding.status === "Rejected") && <Button size="sm" variant="ghost" onClick={() => review(index, "Needs review")}>Hoàn tác</Button>}
          </div>
        </div>;
      })}

      {reviewed.length > 0 && <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Đã duyệt trong bộ dữ liệu (OSINT_Events, năm {year})</p>
        {reviewed.map((finding, index) => <div key={`wb-${index}`} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-dashed p-3 text-xs">
          <span className="min-w-0 flex-1">{finding.title} · {finding.source}{finding.eventDate ? ` · ${finding.eventDate}` : ""} · mức {finding.penaltyLevel}</span>
          {finding.url && <a href={finding.url} target="_blank" rel="noreferrer" className="text-primary underline">Mở nguồn</a>}
        </div>)}
      </div>}

      {(findings.length > 0 || workbookLevel > 0) && <Alert><AlertDescription>
        Năm {year}: mức đã duyệt trong bộ dữ liệu {workbookLevel || "0"}{accepted ? ` · mức vừa chấp nhận ${accepted}` : ""} → P_OSINT {formatNumber(posintBefore)} → {formatNumber(posintAfter)} (mức cao nhất, không cộng dồn); R_fin,total {formatNumber(rfinBase + posintBefore)} → {formatNumber(rfinBase + posintAfter)}. Chỉ áp dụng trong phiên, chưa lưu vào hồ sơ.
      </AlertDescription></Alert>}
    </div>
  );
}

function canonicalUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.hostname = url.hostname.replace(/^www\./, "").toLowerCase();
    url.pathname = url.pathname.replace(/\/$/, "");
    return url.toString();
  } catch {
    return value.trim().toLowerCase();
  }
}
