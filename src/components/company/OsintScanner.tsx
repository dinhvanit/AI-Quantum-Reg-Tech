"use client";

import { useState } from "react";
import { LoaderCircle, Play } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";

type Finding = { ticker: string; title: string; source: string; url: string; sourceProvider?: string; searchCategory?: string; readerProvider?: string; status: "Needs review" | "Verified" | "Rejected" | "Already in assessment"; demo?: boolean; penalty?: number; proposedPenalty?: number | null; excerpt?: string; publishedAt?: string; eventDate?: string; alreadyInAssessment?: boolean; aiProposal?: { related: boolean; eventType: string; severity: number | null; confidence: number; evidenceQuote: string; rationale: string } };
type ScanMeta = {
  workflow?: string[];
  graph?: { available?: boolean; matched_tickers?: string[] };
  ai?: { mode?: string; provider?: string; model?: string; proposal_count?: number; validated_quote_count?: number };
  providers?: string[];
  search?: { queries?: number; limit_per_query?: number };
  duration_ms?: number;
  findings_count?: number;
};

const SEARCH_CATEGORY: Record<string, string> = { tax: "Thuế", environment: "Môi trường", securities: "Chứng khoán", administrative: "Hành chính" };

export function OsintScanner({ ticker, posint, rfinTotal, existingUrls }: { ticker: string; posint: number; rfinTotal: number; existingUrls: string[] }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [scanMeta, setScanMeta] = useState<ScanMeta>({});

  async function scan() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/osint/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tickers: [ticker] }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "OSINT scan thất bại");
      setScanMeta({
        workflow: payload.workflow,
        graph: payload.graph,
        ai: payload.ai,
        providers: payload.providers,
        search: payload.search,
        duration_ms: payload.duration_ms,
        findings_count: payload.findings?.length ?? 0,
      });
      const existing = new Set(existingUrls.map(canonicalUrl));
      setFindings((payload.findings ?? []).map((finding: Finding) => existing.has(canonicalUrl(finding.url))
        ? { ...finding, status: "Already in assessment" as const, alreadyInAssessment: true }
        : finding));
      setMessage(payload.mode === "demo"
        ? `Chưa kết nối nguồn quét trực tiếp; đang hiển thị sự kiện đã có trong hồ sơ.${payload.warnings?.length ? ` ${payload.warnings.join(" ")}` : ""}`
        : payload.ai?.mode === "live"
          ? `${payload.providers?.join(" + ") || "Search"} + đề xuất phân loại từ ${payload.ai.provider}/${payload.ai.model}. Đây là gợi ý AI, chưa phải kết luận; reviewer phải kiểm tra nguồn và trích dẫn.${payload.ai.warning ? ` ${payload.ai.warning}` : ""}${payload.warnings?.length ? ` ${payload.warnings.join(" ")}` : ""}`
          : `${payload.providers?.join(" + ") || "Search"}; AI chưa chạy. ${payload.ai?.warning ?? "Candidate cần reviewer tự kiểm tra nguồn."}${payload.warnings?.length ? ` ${payload.warnings.join(" ")}` : ""}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể chạy OSINT scan.");
    } finally {
      setBusy(false);
    }
  }

  function review(index: number, status: Finding["status"]) {
    setFindings((current) => current.map((finding, currentIndex) => currentIndex === index
      ? { ...finding, status, ...(status === "Verified" ? { penalty: finding.proposedPenalty ?? 0 } : {}) }
      : finding));
  }

  const approvedPenalty = findings.filter((finding) => finding.status === "Verified").reduce((sum, finding) => sum + (finding.penalty ?? 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={scan} disabled={busy}>
          {busy ? <LoaderCircle className="animate-spin" /> : <Play />} {busy ? "Đang quét" : "Run OSINT scan"}
        </Button>
        <span className="text-xs text-muted-foreground">Kết quả cần rà soát; scan không tự cập nhật POSINT.</span>
      </div>
      {message && <p className="rounded-lg bg-muted p-3 text-xs">{message}</p>}
      {scanMeta.workflow?.length ? <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
        <span className="rounded border px-2 py-1">Agent flow: {scanMeta.workflow.join(" → ")}</span>
        <span className="rounded border px-2 py-1">Nguồn chạy: {scanMeta.providers?.join(" + ") || "không có"} · {scanMeta.search?.queries ?? 0} truy vấn · {scanMeta.findings_count ?? 0} kết quả{scanMeta.duration_ms != null ? ` · ${formatNumber(scanMeta.duration_ms / 1000, 1)} giây` : ""}</span>
        <span className="rounded border px-2 py-1">LLM: {scanMeta.ai?.mode === "live" ? `${scanMeta.ai.provider}/${scanMeta.ai.model}` : scanMeta.ai?.mode ?? "chưa rõ"} · {scanMeta.ai?.proposal_count ?? 0} đề xuất · {scanMeta.ai?.validated_quote_count ?? 0} quote khớp nguồn</span>
        <span className="rounded border px-2 py-1">Neo4j: {scanMeta.graph?.available ? scanMeta.graph.matched_tickers?.includes(ticker) ? "đã tìm thấy node công ty" : "đã kết nối, chưa có node công ty" : "chưa kết nối"}</span>
      </div> : null}
      {findings.map((finding, index) => <div key={`${finding.url}-${index}`} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{finding.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{finding.source}{finding.sourceProvider ? ` · ${finding.sourceProvider}` : ""}{finding.searchCategory ? ` · truy vấn ${SEARCH_CATEGORY[finding.searchCategory] ?? finding.searchCategory}` : ""}{finding.readerProvider ? ` · nội dung qua ${finding.readerProvider}` : ""}{finding.publishedAt ? ` · ${finding.publishedAt}` : finding.eventDate ? ` · Sự kiện: ${finding.eventDate}` : ""} · {finding.status === "Verified" ? "Đã rà soát trong phiên" : finding.status}</p>
          {finding.excerpt && <p className="mt-2 line-clamp-3 text-xs">{finding.excerpt}</p>}
          {finding.aiProposal && <div className="mt-2 rounded-md bg-muted/60 p-2 text-xs">
            <p className="font-medium">Đề xuất AI · {finding.aiProposal.related ? `liên quan · ${finding.aiProposal.eventType} · mức ${finding.aiProposal.severity ?? "chưa đủ bằng chứng"}` : "có thể không liên quan"} · độ tin cậy AI tự đánh giá {formatNumber(finding.aiProposal.confidence * 100, 0)}%</p>
            {finding.aiProposal.rationale && <p className="mt-1 text-muted-foreground">{finding.aiProposal.rationale}</p>}
            {finding.aiProposal.evidenceQuote && <blockquote className="mt-1 border-l-2 pl-2 italic">“{finding.aiProposal.evidenceQuote}”</blockquote>}
            {finding.proposedPenalty != null && <p className="mt-1 text-muted-foreground">Penalty đề xuất +{formatNumber(finding.proposedPenalty)} · chỉ dùng trong preview nếu reviewer duyệt</p>}
          </div>}
        </div>
        <div className="flex items-center gap-2"><a href={finding.url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Mở nguồn</a>{finding.status === "Needs review" && <><Button size="sm" variant="outline" onClick={() => review(index, "Verified")}>Duyệt preview</Button><Button size="sm" variant="ghost" onClick={() => review(index, "Rejected")}>Bỏ</Button></>}</div>
      </div>)}
      {findings.some((finding) => finding.status === "Verified") && <Alert><AlertDescription>Preview trong phiên: POSINT {formatNumber(posint)} → {formatNumber(posint + approvedPenalty)}; RFin total {formatNumber(rfinTotal)} → {formatNumber(rfinTotal + approvedPenalty)}. Chưa lưu vào hồ sơ hoặc audit log.</AlertDescription></Alert>}
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
