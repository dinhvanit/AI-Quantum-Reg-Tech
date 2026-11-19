import { ShieldCheck } from "lucide-react";
import { formatBytes, formatTime } from "@/lib/format";

/** Local session cleanup notice. Does not imply infrastructure-wide zero retention. */
export function RetentionBanner({ deletedAt, fileName, fileSize }: { deletedAt: string; fileName: string; fileSize: number }) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border border-risk-safe/30 bg-risk-safe/10 p-4">
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-risk-safe" />
      <div className="space-y-1 text-sm">
        <p className="font-semibold">
          Tệp gốc đã được gỡ khỏi phiên lúc <span className="font-mono">{formatTime(deletedAt)}</span>
        </p>
        <p className="text-xs text-muted-foreground">
          {fileName} ({formatBytes(fileSize)}) · Trình duyệt bỏ tham chiếu tệp sau khi xử lý. Bản demo không xác nhận việc xóa khỏi log, bộ nhớ đệm hoặc hạ tầng ngoài trình duyệt.
        </p>
      </div>
    </div>
  );
}
