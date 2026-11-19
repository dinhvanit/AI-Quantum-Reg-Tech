"use client";

import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart } from "echarts/charts";
import { GridComponent, LegendComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { formatPct } from "@/lib/format";
import type { PortfolioResult } from "@/lib/types";
import { useCssVars } from "@/lib/use-css-vars";
import { TOOLTIP_VARS, escapeHtml, tooltipBase } from "./echarts-base";

echarts.use([BarChart, GridComponent, LegendComponent, MarkLineComponent, TooltipComponent, CanvasRenderer]);

const VARS = [...TOOLTIP_VARS, "--chart-5", "--primary", "--foreground", "--muted-foreground", "--muted"] as const;
const CATEGORIES = ["Lợi nhuận kỳ vọng", "Return lịch sử (1 kỳ)"];

/** So sánh CAPM expectation và một kỳ giá lịch sử; không đại diện rolling/out-of-sample backtest. */
export function BacktestChart({ portfolio }: { portfolio: Pick<PortfolioResult, "baseline" | "esgAware"> }) {
  const c = useCssVars(VARS);
  if (!c) return <div className="h-60" />;

  const series = [
    { name: "Baseline · workbook", data: [portfolio.baseline.expectedReturn, portfolio.baseline.realizedReturn], color: c["--chart-5"], label: c["--muted-foreground"] },
    { name: "ESG-aware · workbook", data: [portfolio.esgAware.expectedReturn, portfolio.esgAware.realizedReturn], color: c["--primary"], label: c["--foreground"] },
  ];

  const option = {
    grid: { top: 28, right: 8, bottom: 48, left: 48 },
    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, icon: "rect", textStyle: { fontSize: 11, color: c["--muted-foreground"] } },
    tooltip: {
      ...tooltipBase(c),
      trigger: "axis",
      axisPointer: { type: "shadow", shadowStyle: { color: c["--muted"], opacity: 0.5 } },
      formatter: (items: Array<{ axisValue: string; seriesName: string; value: number }>) =>
        `<b>${escapeHtml(items[0]?.axisValue ?? "")}</b><br/>` +
        items.map((p) => `${escapeHtml(p.seriesName)}: <b>${formatPct(p.value)}</b>`).join("<br/>"),
    },
    xAxis: {
      type: "category",
      data: CATEGORIES,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: c["--muted-foreground"] },
    },
    yAxis: {
      type: "value",
      axisLabel: { fontSize: 10, color: c["--muted-foreground"], formatter: (v: number) => formatPct(v, 0) },
      splitLine: { lineStyle: { color: c["--border"] } },
    },
    series: series.map((s, i) => ({
      type: "bar",
      name: s.name,
      data: s.data,
      barMaxWidth: 48,
      barGap: "4%",
      itemStyle: { color: s.color, borderRadius: [4, 4, 0, 0] },
      label: { show: true, position: "top", fontSize: 10, color: s.label, formatter: (p: { value: number }) => formatPct(p.value) },
      // Đường 0 để thấy rõ lợi nhuận âm.
      ...(i === 0 ? { markLine: { silent: true, symbol: "none", label: { show: false }, lineStyle: { color: c["--muted-foreground"], type: "solid" }, data: [{ yAxis: 0 }] } } : {}),
    })),
  };

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge
      style={{ height: 240, width: "100%" }}
      opts={{ renderer: "canvas" }}
      aria-label={`So sánh lợi nhuận: ${series.map((s) => `${s.name} ${CATEGORIES.map((cat, i) => `${cat} ${formatPct(s.data[i])}`).join(", ")}`).join("; ")}`}
    />
  );
}
