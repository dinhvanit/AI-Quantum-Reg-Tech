"use client";

import { useRef, useState } from "react";
import { FileSpreadsheet, FileText, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

export const ACCEPTED = [".pdf"];
export const MAX_BYTES = 20 * 1024 * 1024;

export function validateFile(file: File): string | null {
  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!ACCEPTED.includes(ext)) return `Định dạng ${ext || "không rõ"} không được hỗ trợ. Hiện chỉ nhận báo cáo tài chính PDF.`;
  if (file.size > MAX_BYTES) return `Tệp ${formatBytes(file.size)} vượt giới hạn ${formatBytes(MAX_BYTES)}.`;
  if (file.size === 0) return "Tệp rỗng.";
  return null;
}

export function Dropzone({ file, onChange }: { file: File[]; onChange: (file: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function pickMany(incoming: File[]) {
    const invalid = incoming.map((f) => ({ file: f, error: validateFile(f) })).find((item) => item.error);
    if (invalid?.error) { setError(invalid.error); return; }
    if (file.length + incoming.length > 10) { setError("Mỗi lượt hỗ trợ tối đa 10 tài liệu."); return; }
    setError(null);
    onChange([...file, ...incoming]);
  }

  if (file.length > 0) {
    return (
      <div className="space-y-2">{file.map((f, index) => { const Icon = f.name.toLowerCase().endsWith(".pdf") ? FileText : FileSpreadsheet; return <div key={`${f.name}-${index}`} className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3"><div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{f.name}</p><p className="text-xs text-muted-foreground">{formatBytes(f.size)} · sẵn sàng phân tích</p></div><Button variant="ghost" size="icon-sm" aria-label={`Bỏ ${f.name}`} onClick={() => onChange(file.filter((_, i) => i !== index))}><X /></Button></div>})}<Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>Thêm PDF</Button>{error && <p role="alert" className="text-xs text-risk-distress">{error}</p>}</div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickMany(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "hover:border-primary/50 hover:bg-muted/40",
          error && "border-risk-distress/50"
        )}
      >
        <UploadCloud className={cn("size-8", dragging ? "text-primary" : "text-muted-foreground")} />
        <p className="text-sm font-medium">Kéo thả hồ sơ vào đây hoặc bấm để chọn tệp</p>
        <p className="text-xs text-muted-foreground">
          Báo cáo tài chính PDF (có lớp chữ hoặc bản scan) · tối đa {formatBytes(MAX_BYTES)}
        </p>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED.join(",")}
        className="sr-only"
        aria-label="Chọn tệp hồ sơ"
        onChange={(e) => {
          pickMany(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      {error && (
        <p role="alert" className="mt-2 text-xs text-risk-distress">
          {error}
        </p>
      )}
    </div>
  );
}
