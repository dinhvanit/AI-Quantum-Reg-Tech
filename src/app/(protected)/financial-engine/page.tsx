import type { Metadata } from "next";
import { AlertTriangle, Database, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getFinancialEngineData } from "@/lib/financial-engine";

export const metadata: Metadata = { title: "Bộ máy tài chính | QuantumRegTech" };

const formatNumber = (value: number, digits = 2) => new Intl.NumberFormat("vi-VN", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const formatPct = (value: number) => `${formatNumber(value * 100, 2)}%`;
const zoneLabel: Record<string, string> = { SAFE: "An toàn", GREY: "Vùng xám", DISTRESS: "Nguy cơ" };

export default async function FinancialEnginePage() {
  let payload: Awaited<ReturnType<typeof getFinancialEngineData>>;
  try {
    payload = await getFinancialEngineData(2024);
  } catch (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Chưa tải được bộ máy tài chính</CardTitle><CardDescription>{error instanceof Error ? error.message : "Không kết nối được dịch vụ dữ liệu."}</CardDescription></CardHeader>
        <CardContent className="text-sm text-muted-foreground">Khởi động FastAPI rồi tải lại trang này.</CardContent>
      </Card>
    );
  }

  const records = [...payload.records].sort((a, b) => a.ticker.localeCompare(b.ticker));
  const meanEsg = records.reduce((sum, item) => sum + item.calculated.esg.total, 0) / Math.max(records.length, 1);
  const optimizationGaps = [
    "Cần chuỗi giá đã điều chỉnh theo tháng hoặc ngày cho từng mã để ước lượng ma trận hiệp phương sai.",
    "Cần chốt hệ số của mô hình tối ưu và các giới hạn đầu tư áp dụng cho danh mục.",
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-10">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Database className="size-4" /> Phân tích dữ liệu tài chính và thị trường</div>
        <h1 className="text-2xl font-semibold tracking-tight">Bộ máy tài chính · dữ liệu năm 2024</h1>
        <p className="text-sm text-muted-foreground">Các chỉ số tài chính, lợi suất và điểm ESG được hệ thống tính theo phương pháp đã cấu hình.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader><CardDescription>Doanh nghiệp</CardDescription><CardTitle>{records.length} mã</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Bộ dữ liệu 2021–{Math.max(...payload.periods)}</CardContent></Card>
        <Card><CardHeader><CardDescription>Đối chiếu công thức</CardDescription><CardTitle className="text-emerald-700">{payload.reconciliation.status === "passed" ? "Đạt" : "Cần rà soát"}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">{payload.reconciliation.metricsPerRecord} chỉ số / mỗi dòng</CardContent></Card>
        <Card><CardHeader><CardDescription>ESG trung bình</CardDescription><CardTitle>{formatNumber(meanEsg, 4)} / 1</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Phân vị tương đối trong nhóm {records.length} doanh nghiệp</CardContent></Card>
        <Card><CardHeader><CardDescription>Tối ưu danh mục</CardDescription><CardTitle>{payload.optimizerReadiness.ready ? "Sẵn sàng" : "Chưa đủ dữ liệu"}</CardTitle></CardHeader><CardContent className="text-xs text-muted-foreground">Chưa tính tỷ trọng cuối cùng</CardContent></Card>
      </section>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader className="flex flex-row items-start gap-3">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div className="space-y-1"><CardTitle className="text-base">Chưa công bố tỷ trọng tối ưu</CardTitle><CardDescription>Giá đầu và cuối năm chỉ dùng để đối chiếu lợi suất lịch sử, chưa đủ ước lượng ma trận hiệp phương sai tin cậy cho {records.length} mã.</CardDescription></div>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          {optimizationGaps.map((item) => <p key={item}>• {item}</p>)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kết quả tính từ dữ liệu gốc</CardTitle>
          <CardDescription>Đầu vào năm 2024 · đối chiếu với lợi suất giá lịch sử năm 2025.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Mã</TableHead><TableHead>Điểm Altman Z</TableHead><TableHead>Vùng rủi ro</TableHead><TableHead>Rủi ro tài chính tổng</TableHead>
              <TableHead>Lợi suất kỳ vọng theo CAPM</TableHead><TableHead>Điểm ESG</TableHead><TableHead>Môi trường / Xã hội / Quản trị</TableHead><TableHead>Lợi suất giá lịch sử 2025</TableHead>
            </TableRow></TableHeader>
            <TableBody>{records.map((record) => {
              const { altman, returns, esg } = record.calculated;
              return <TableRow id={record.ticker} key={record.ticker} className="scroll-mt-4">
                <TableCell className="font-semibold">{record.ticker}</TableCell>
                <TableCell>{formatNumber(altman.zScore)}</TableCell>
                <TableCell><Badge variant={altman.zone === "DISTRESS" ? "destructive" : "secondary"}>{zoneLabel[altman.zone] ?? altman.zone}</Badge></TableCell>
                <TableCell>{formatPct(altman.rFinTotal)}</TableCell>
                <TableCell>{formatPct(returns.capmExpected)}</TableCell>
                <TableCell className="font-medium">{formatNumber(esg.total, 4)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatNumber(esg.pillars.E, 2)} / {formatNumber(esg.pillars.S, 2)} / {formatNumber(esg.pillars.G, 2)}</TableCell>
                <TableCell className={returns.adjustedPricePeriod >= 0 ? "text-emerald-700" : "text-destructive"}>{formatPct(returns.adjustedPricePeriod)}</TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0" />
        <p>CAPM là mô hình định giá tài sản vốn; ESG là môi trường, xã hội và quản trị. Điểm ESG là phân vị trong nhóm hiện tại; rủi ro tài chính là thang điểm do nhóm quy ước. Mỗi thay đổi cần được duyệt nghiệp vụ trước khi dùng để ra quyết định đầu tư. Dữ liệu được tạo lúc {new Date(payload.generatedAt).toLocaleString("vi-VN")}.</p>
      </div>
    </div>
  );
}
