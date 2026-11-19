"use client";

import { useRef, useState } from "react";
import { ArrowRight, FileDown, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { analyzePrivate } from "@/lib/api";
import type { PrivateAnalysis, PrivateStage } from "@/lib/types";
import { Dropzone } from "./Dropzone";
import { PrivateResult } from "./PrivateResult";
import { ProcessingPanel } from "./ProcessingPanel";
import { RetentionBanner } from "./RetentionBanner";
import { StepperHeader } from "./StepperHeader";

type Status = "idle" | "processing" | "done" | "deleted";
const STEP_INDEX: Record<Status, number> = { idle: 0, processing: 1, done: 2, deleted: 4 };

/** Luồng Cổng 2: idle → processing → done → deleted. */
export function UploadStepper() {
  const [status, setStatus] = useState<Status>("idle");
  const [files, setFiles] = useState<File[]>([]);
  const [consent, setConsent] = useState(false);
  const [llmConsent, setLlmConsent] = useState(false);
  const [stage, setStage] = useState<PrivateStage | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [results, setResults] = useState<PrivateAnalysis[]>([]);
  // Chỉ giữ metadata để hiển thị nhật ký xoá – nội dung tệp bị bỏ ngay sau khi xử lý.
  const [fileMeta, setFileMeta] = useState<Array<{ name: string; size: number }> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function start() {
    if (!files.length || !consent) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setFileMeta(files.map((file) => ({ name: file.name, size: file.size })));
    setStatus("processing");
    try {
      const extracted: PrivateAnalysis[] = [];
      for (const file of files) {
        setProgress(`Đang xử lý ${file.name} (${extracted.length + 1}/${files.length})`);
        const res = await analyzePrivate(file, { onStage: setStage, onProgress: setProgress, signal: controller.signal, useLlm: llmConsent });
        extracted.push(res);
      }
      setResults(extracted);
      setFiles([]); // Bỏ tham chiếu tới file gốc sau khi hoàn tất.
      setStatus("done");
    } catch (err) {
      setFiles([]);
      setStatus("idle");
      const name = (err as Error).name;
      if (name === "AbortError") toast.info("Đã huỷ phân tích và xoá tệp khỏi phiên.");
      else if (name === "PasswordException") toast.error("PDF có mật khẩu – hãy gỡ mật khẩu rồi tải lên lại.");
      else if (name === "InvalidPDFException") toast.error("Tệp PDF bị hỏng hoặc không hợp lệ.");
      else toast.error("Phân tích thất bại. Vui lòng thử lại.");
    } finally {
      setStage(null);
      setProgress(null);
      abortRef.current = null;
    }
  }

  function reset() {
    setStatus("idle");
    setFiles([]);
    setConsent(false);
    setLlmConsent(false);
    setResults([]);
    setFileMeta(null);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-5 shadow-sm print:hidden">
        <StepperHeader current={STEP_INDEX[status]} />
      </div>

      {status === "idle" && (
        <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div>
            <h3 className="text-sm font-semibold">1. Tải lên hồ sơ</h3>
            <p className="text-xs text-muted-foreground">
              Không bắt buộc PDF đúng một mẫu cố định. Hệ thống OCR/đọc chữ, parser đối chiếu mã chỉ tiêu phổ biến; có thể bật LLM để nhận diện cách ghi nhãn khác và trả kèm trích dẫn nguồn.
            </p>
          </div>
          <Dropzone file={files} onChange={setFiles} />
          <div className="flex items-start gap-2.5 rounded-lg bg-muted/40 p-3">
            <Checkbox id="consent" checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
            <Label htmlFor="consent" className="text-xs leading-relaxed font-normal">
              Tôi cam kết có quyền cung cấp hồ sơ này và đồng ý xử lý các PDF ngay trong trình duyệt. Sau khi hoàn tất,
              ứng dụng bỏ tham chiếu tới tệp trong phiên; kết quả trích xuất vẫn hiển thị để tôi rà soát.
            </Label>
          </div>
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <Checkbox id="llm-consent" checked={llmConsent} onCheckedChange={(v) => setLlmConsent(v === true)} className="mt-0.5" />
            <Label htmlFor="llm-consent" className="text-xs leading-relaxed font-normal">
              Bật AI Agent cho buổi demo: tôi cho phép gửi phần văn bản OCR/trích xuất (không gửi file PDF gốc) tới nhà cung cấp LLM đang cấu hình để nhận diện chỉ tiêu. Chỉ dùng tài liệu mẫu hoặc tài liệu tôi được phép chia sẻ; kết quả phải có quote/trang nguồn để đối chiếu.
            </Label>
          </div>
          <div className="flex justify-end">
            <Button disabled={!files.length || !consent} onClick={start}>
              Phân tích {files.length || ""} hồ sơ <ArrowRight />
            </Button>
          </div>
        </section>
      )}

      {status === "processing" && fileMeta && (
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold">2. Xử lý</h3>
          <ProcessingPanel stage={stage} fileName={fileMeta.find((f) => progress?.includes(f.name))?.name ?? fileMeta[0].name} message={progress} aiEnabled={llmConsent} onCancel={() => abortRef.current?.abort()} />
        </section>
      )}

      {(status === "done" || status === "deleted") && results.length > 0 && fileMeta && (
        <>
          {status === "deleted" && fileMeta.map((f, i) => <RetentionBanner key={f.name + i} deletedAt={results[i]?.deletedAt ?? new Date().toISOString()} fileName={f.name} fileSize={f.size} />)}

          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-4 shadow-sm print:hidden">
            <p className="text-sm">
              <span className="font-semibold">{status === "done" ? "3. Kết quả" : "4. Hoàn tất"}</span>
              <span className="text-muted-foreground">
                {status === "done"
                  ? " · Xem kết quả, sau đó xác nhận kết thúc phiên."
                  : " · Có thể tải báo cáo hoặc phân tích hồ sơ khác."}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {status === "done" ? (
                <Button onClick={() => setStatus("deleted")}>
                  <Trash2 /> Kết thúc xử lý file trong phiên
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={reset}>
                    <RotateCcw /> Phân tích hồ sơ khác
                  </Button>
                  <Button onClick={() => window.print()}>
                    <FileDown /> Tải báo cáo (PDF)
                  </Button>
                </>
              )}
            </div>
          </section>

          <div className="space-y-5">{results.map((result, i) => <section key={`${fileMeta[i]?.name}-${i}`} className="space-y-2"><h3 className="text-sm font-semibold">{fileMeta[i]?.name}</h3><p className="text-xs text-amber-700">Dữ liệu trích xuất từ tài liệu nội bộ · chờ người thẩm định xác nhận trước khi áp dụng.</p><PrivateResult result={result} /></section>)}</div>
        </>
      )}
    </div>
  );
}
