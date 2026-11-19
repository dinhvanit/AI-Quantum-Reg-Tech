import type { Metadata } from "next";
import { EyeOff, FileLock2, Trash2 } from "lucide-react";
import { UploadStepper } from "@/components/private/UploadStepper";

export const metadata: Metadata = { title: "Cổng 2 – Nạp dữ liệu bảo mật | QuantumRegTech" };

const PRINCIPLES = [
  {
    icon: FileLock2,
    title: "Xử lý PDF trong trình duyệt",
    body: "Đọc lớp chữ và OCR chạy trên trình duyệt ở bản demo hiện tại.",
  },
  {
    icon: Trash2,
    title: "Dọn file phiên",
    body: "Ứng dụng bỏ tham chiếu tới file sau xử lý. Đây không phải cam kết xóa khỏi log, cache hoặc hạ tầng.",
  },
  {
    icon: EyeOff,
    title: "Không ghi vào hồ sơ công khai",
    body: "Tài liệu không tự nhập vào Cổng 1. Nếu bật AI Agent, phần văn bản trích xuất sẽ được gửi tới LLM provider sau khi bạn xác nhận riêng.",
  },
];

export default function PrivatePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm print:hidden">
        <h2 className="text-lg font-semibold">Nạp dữ liệu bảo mật</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Tải báo cáo PDF lên. OCR chạy trên trình duyệt; parser quy tắc và AI Agent có thể cùng trích xuất tối đa 9 chỉ tiêu. LLM chỉ chạy khi bạn bật đồng ý gửi văn bản trích xuất. Mỗi số AI dùng phải kèm quote và trang nguồn khớp nội dung gửi lên; luôn rà soát trước khi dùng.
        </p>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="flex gap-3 rounded-xl border bg-primary/5 p-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-xs font-semibold">{title}</p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <UploadStepper />
    </div>
  );
}
