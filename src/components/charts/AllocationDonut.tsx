"use client";

import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { PieChart } from "echarts/charts";
import { TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { formatBillion, formatPct } from "@/lib/format";
import { useCssVars } from "@/lib/use-css-vars";
import { SERIES_VARS, TOOLTIP_VARS, escapeHtml, tooltipBase } from "./echarts-base";

echarts.use([PieChart, TooltipComponent, CanvasRenderer]);

export interface AllocationSlice {
  ticker: string;
  weight: number;
  baselineWeight?: number;
}

const VARS = [...TOOLTIP_VARS, ...SERIES_VARS, "--card"] as const;
// Màu theo DN (thứ tự cố định, không theo hạng) – token --chart-1..5. Legend dùng CSS var trực tiếp.
const LEGEND = SERIES_VARS.map((v) => `var(${v})`);

export function AllocationDonut({ data, capital }: { data: AllocationSlice[]; capital: number }) {
  const c = useCssVars(VARS);

  const option = c && {
    tooltip: {
      ...tooltipBase(c),
      trigger: "item",
      formatter: (p: { dataIndex: number }) => {
        const d = data[p.dataIndex];
        return `<b>${escapeHtml(d.ticker)}</b><br/>${formatPct(d.weight, 1)} · ${formatBillion(d.weight * capital)}`;
      },
    },
    series: [{
      type: "pie",
      radius: [48, 72],
      padAngle: 2,
      animation: false,
      label: { show: false },
      emphasis: { scale: true, scaleSize: 4 },
      itemStyle: { borderColor: c["--card"], borderWidth: 2 },
      data: data.map((d, i) => ({ name: d.ticker, value: d.weight, itemStyle: { color: c[SERIES_VARS[i % SERIES_VARS.length]] } })),
    }],
  };

  return (
    <div className="flex flex-1 flex-col items-center gap-6 sm:flex-row">
      <div className="size-40 shrink-0">
        {option && (
          <ReactEChartsCore
            echarts={echarts}
            option={option}
            notMerge
            style={{ height: 160, width: 160 }}
            opts={{ renderer: "canvas" }}
            aria-label="Biểu đồ tròn tỷ trọng danh mục"
          />
        )}
      </div>

      {/* Legend + bảng số – nhận diện không dựa vào màu đơn thuần */}
      <table className="w-full flex-1 text-xs" aria-label="Tỷ trọng danh mục">
        <thead>
          <tr className="text-[10px] tracking-wider text-muted-foreground uppercase">
            <th className="pb-1.5 text-left font-semibold">Mã</th>
            <th className="pb-1.5 text-right font-semibold">w* ESG-aware</th>
            <th className="pb-1.5 text-right font-semibold">Baseline</th>
            <th className="pb-1.5 text-right font-semibold">Vốn</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={d.ticker}>
              <td className="py-1">
                <span className="flex items-center gap-2 font-medium">
                  <span className="size-2.5 rounded-sm" style={{ background: LEGEND[i % LEGEND.length] }} />
                  {d.ticker}
                </span>
              </td>
              <td className="py-1 text-right font-mono font-semibold tabular">{formatPct(d.weight, 1)}</td>
              <td className="py-1 text-right font-mono text-muted-foreground tabular">
                {formatPct(d.baselineWeight, 1)}
              </td>
              <td className="py-1 text-right font-mono text-muted-foreground tabular">
                {formatBillion(d.weight * capital)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
