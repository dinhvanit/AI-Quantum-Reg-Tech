import { Activity, AlertTriangle, Building2, TrendingUp } from "lucide-react";
import Link from "next/link";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { EsgCard } from "@/components/dashboard/EsgCard";
import { FinancialHealthCard } from "@/components/dashboard/FinancialHealthCard";
import { OsintCard } from "@/components/dashboard/OsintCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { getOverviews } from "@/lib/overview";
import { getMethodology } from "@/lib/api";
import { formatPct } from "@/lib/format";

export default async function DashboardPage() {
  const [items, method] = await Promise.all([getOverviews(), getMethodology()]);

  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <Building2 className="size-8 text-muted-foreground" />
        <p className="text-sm font-semibold">Chưa có doanh nghiệp nào được giám sát</p>
        <p className="text-xs text-muted-foreground">Thêm doanh nghiệp qua Cổng 1 hoặc Cổng 2 để bắt đầu.</p>
      </div>
    );
  }

  const osintAlerts = items.reduce((n, i) => n + i.events.length, 0);
  const osintTickers = items.filter((i) => i.events.length > 0).map((i) => i.company.ticker);
  const distress = items.filter((i) => i.zscore.zone === "distress").map((i) => i.company.ticker);
  const returns = [...items].sort((a, b) => b.company.expectedReturn - a.company.expectedReturn);

  return (
    <div className="space-y-5">
      {/* Hàng KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Doanh nghiệp theo dõi" value={String(items.length)} hint="Ngành thực phẩm và đồ uống" icon={Building2} />
        <StatCard
          label="Sự kiện cần lưu ý"
          value={String(osintAlerts)}
          hint={osintTickers.length ? osintTickers.join(", ") : "Không có"}
          icon={AlertTriangle}
          tone={osintAlerts > 0 ? "grey" : "safe"}
        />
        <StatCard
          label="Doanh nghiệp rủi ro cao"
          value={String(distress.length)}
          hint={distress.length ? distress.join(", ") : "Không có"}
          icon={Activity}
          tone={distress.length > 0 ? "distress" : "safe"}
        />
        <StatCard
          label="Năm dữ liệu → năm dự báo"
          value={`${method.dataYear} → ${method.forecastYear}`}
          hint="Chỉ số năm trước dùng để dự báo năm sau"
          icon={TrendingUp}
        />
      </div>

      {/* Lưới 2×2 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardCard
          title={`Lợi suất kỳ vọng (CAPM ${method.dataYear}) và thực tế ${method.forecastYear}`}
          description="Thực tế là lợi suất giá điều chỉnh trong năm dự báo – kết quả lịch sử, không phải dự báo"
          action={
            <Link href="/portfolio" className="text-xs font-semibold text-primary hover:underline">
              Tạo danh mục
            </Link>
          }
        >
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr><th className="py-1 text-left font-medium">Mã</th><th className="py-1 text-right font-medium">Rᵢ (CAPM)</th><th className="py-1 text-right font-medium">Thực tế {method.forecastYear}</th></tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {returns.map(({ company }) => (
                <tr key={company.ticker} className="border-t">
                  <td className="py-1 font-sans font-semibold">{company.ticker}</td>
                  <td className="py-1 text-right">{formatPct(company.expectedReturn)}</td>
                  <td className="py-1 text-right">{formatPct(company.realizedReturn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DashboardCard>

        <EsgCard items={items} />
        <FinancialHealthCard items={items} />
        <OsintCard items={items} />
      </div>
    </div>
  );
}
