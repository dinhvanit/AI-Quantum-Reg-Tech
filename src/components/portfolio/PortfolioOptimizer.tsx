"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye, Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AllocationDonut } from "@/components/charts/AllocationDonut";
import { BacktestChart } from "@/components/charts/BacktestChart";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatBillion, formatNumber, formatPct } from "@/lib/format";
import type { CompanyOverview } from "@/lib/overview";
import { nearestScenario, portfolioReturn } from "@/lib/portfolio";
import type { PortfolioResult, Scenario } from "@/lib/types";
import { usePortfolioStore } from "@/store/portfolio";
import { CompareTable } from "./CompareTable";
import { QuantumCore } from "./QuantumCore";
import { WeightSliders } from "./WeightSliders";
import { WeightTable } from "./WeightTable";

export function PortfolioOptimizer({
  items,
  portfolio,
  scenarios,
}: {
  items: CompanyOverview[];
  portfolio: PortfolioResult;
  scenarios: Scenario[];
}) {
  const params = usePortfolioStore((s) => s.params);
  const watchlist = usePortfolioStore((s) => s.watchlist);
  const selectedTickers = usePortfolioStore((s) => s.selectedTickers);
  const [capital, setCapital] = useState(portfolio.capital);
  const activeItems = useMemo(
    () => selectedTickers.length ? items.filter((i) => selectedTickers.includes(i.company.ticker)) : items,
    [items, selectedTickers],
  );
  const companies = useMemo(() => activeItems.map((i) => i.company), [activeItems]);

  const scenario = useMemo(() => nearestScenario(scenarios, params), [scenarios, params]);
  const rawWeights = scenario?.weights ?? portfolio.esgAware.weights;
  const weights = useMemo(() => {
    const activeTotal = activeItems.reduce((sum, i) => sum + Math.max(0, rawWeights[i.company.ticker] ?? 0), 0);
    return activeTotal > 0
      ? Object.fromEntries(activeItems.map((i) => [i.company.ticker, Math.max(0, rawWeights[i.company.ticker] ?? 0) / activeTotal]))
      : Object.fromEntries(activeItems.map((i) => [i.company.ticker, 1 / Math.max(1, activeItems.length)]));
  }, [activeItems, rawWeights]);

  // Skeleton 600ms mỗi khi kịch bản thay đổi (UI_DESIGN §4.4).
  const [shown, setShown] = useState(weights);
  const loading = shown !== weights;
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setShown(weights), 600);
    return () => clearTimeout(t);
  }, [weights, loading]);

  const expected = portfolioReturn(shown, companies, "expectedReturn");
  const realized = portfolioReturn(shown, companies, "realizedReturn");
  const { minWeight, maxWeight } = portfolio.constraints;
  const scenarioGaps = activeItems.filter((item) => !(item.company.ticker in rawWeights)).map((item) => item.company.ticker);
  const infeasibleSelection = activeItems.length > 0 && (activeItems.length * minWeight > 1 || activeItems.length * maxWeight < 1);

  return (
    <Tabs defaultValue="classic" className="gap-4">
      <TabsList>
        <TabsTrigger value="classic">Tối ưu danh mục</TabsTrigger>
        <TabsTrigger value="quantum">Lõi Lượng tử</TabsTrigger>
      </TabsList>

      <TabsContent value="classic" className="space-y-4">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_1fr]">
          <DashboardCard title="Tham số mô hình" description="Chọn kịch bản workbook gần nhất; hiện có 2 kịch bản, chưa chạy optimizer mới">
            <WeightSliders />
          </DashboardCard>

          <div className="space-y-4">
            {/* Ràng buộc */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground">Ràng buộc:</span>
              {[
                `${formatPct(minWeight, 0)} ≤ wᵢ ≤ ${formatPct(maxWeight, 0)}`,
                "Σwᵢ = 100%",
                `Vốn: ${formatBillion(capital, 0)} VNĐ`,
              ].map((c) => (
                <Badge key={c} variant="outline" className="h-auto px-2.5 py-1 font-mono text-[11px]">
                  {c}
                </Badge>
              ))}
              {scenario && (
                <span className="ml-auto text-[11px] text-muted-foreground">
                  Kịch bản gần nhất: α={formatNumber(scenario.params.alpha, 0)} β={formatNumber(scenario.params.beta, 0)} γ=
                  {formatNumber(scenario.params.gamma, 0)} δ={formatNumber(scenario.params.delta, 0)}
                </span>
              )}
            </div>

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">Bộ mã trong kịch bản: {activeItems.map((i) => i.company.ticker).join(", ")}</p>
            {scenarioGaps.length > 0 && <Alert><AlertDescription>Chưa có trọng số/kịch bản cho {scenarioGaps.join(", ")}. Các mã này chưa thể tham gia phân bổ từ dữ liệu hiện tại.</AlertDescription></Alert>}
            {infeasibleSelection && <Alert variant="destructive"><AlertDescription>Số mã đã chọn không khả thi với ràng buộc hiện tại {formatPct(minWeight, 0)}–{formatPct(maxWeight, 0)} mỗi mã. Cần cấu hình giới hạn phù hợp trước khi chạy solver.</AlertDescription></Alert>}
            {watchlist.length > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Eye className="size-3.5" /> Đang theo dõi từ Cổng 1: {watchlist.join(", ")}
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <StatCard label="Lợi nhuận kỳ vọng" value={loading ? "…" : formatPct(expected)} icon={Target} hint="Σ wᵢ × Rᵢ (CAPM)" />
              <StatCard
                label="Lợi nhuận lịch sử (một kỳ)"
                value={loading ? "…" : formatPct(realized)}
                icon={TrendingUp}
                tone="safe"
                hint="Σ wᵢ × (P cuối / P đầu − 1); workbook chưa kèm ngày giá"
              />
            </div>

            <label className="flex max-w-sm items-center gap-3 text-xs"><span className="shrink-0 text-muted-foreground">Tổng vốn (tỷ VNĐ)</span><input type="number" min={1} step={10} value={capital / 1_000_000_000} onChange={(event) => setCapital(Math.max(1, Number(event.target.value) || 1) * 1_000_000_000)} className="h-8 w-36 rounded-md border bg-background px-2 font-mono"/></label>

            <DashboardCard title="Kết quả phân bổ" description="Tỷ trọng kịch bản đang chọn và số tiền phân bổ">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-40" />
                  <Skeleton className="h-32" />
                </div>
              ) : (
                <div className="space-y-4">
                  <AllocationDonut
                    data={activeItems.map(({ company: { ticker } }) => ({
                      ticker,
                      weight: shown[ticker] ?? 0,
                      baselineWeight: portfolio.baseline.weights[ticker],
                    }))}
                    capital={capital}
                  />
                  <WeightTable items={activeItems} weights={shown} capital={capital} />
                </div>
              )}
            </DashboardCard>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DashboardCard title="So sánh Baseline vs ESG-aware" description="Trọng số lấy từ workbook; return lịch sử là một kỳ giá">
            <CompareTable portfolio={portfolio} tickers={companies.map((c) => c.ticker)} />
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              Trọng số Baseline và ESG-aware lấy từ workbook; build script tính lại return có trọng số và đối chiếu với summary workbook. Giao diện không chạy lại Markowitz/COBYLA. Return lịch sử tính bằng P cuối / P đầu − 1, nhưng dữ liệu đang thiếu ngày đầu/cuối nên chưa xác nhận được độ dài kỳ và chưa phải backtest rolling/out-of-sample. Chưa tính phí giao dịch hoặc benchmark thị trường.
            </p>
          </DashboardCard>
          <DashboardCard title="Đối chiếu lợi nhuận" description="CAPM kỳ vọng và return lịch sử một kỳ của hai bộ trọng số">
            <BacktestChart portfolio={portfolio} />
          </DashboardCard>
        </div>
      </TabsContent>

      <TabsContent value="quantum">
        <QuantumCore qubo={portfolio.qubo} />
      </TabsContent>
    </Tabs>
  );
}
