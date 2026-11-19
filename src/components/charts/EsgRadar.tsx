"use client";

import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { RadarChart } from "echarts/charts";
import { RadarComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { formatNumber } from "@/lib/format";
import type { Esg } from "@/lib/types";
import { useCssVars } from "@/lib/use-css-vars";
import { EmptyChart } from "./EmptyChart";
import { TOOLTIP_VARS, escapeHtml, tooltipBase } from "./echarts-base";

echarts.use([RadarChart, RadarComponent, TooltipComponent, CanvasRenderer]);

const AXES = [
  { key: "E", label: "Môi trường (E)" },
  { key: "S", label: "Xã hội (S)" },
  { key: "G", label: "Quản trị (G)" },
  { key: "transparency", label: "Minh bạch" },
  { key: "compliance", label: "Tuân thủ" },
] as const;
const VARS = [...TOOLTIP_VARS, "--primary", "--muted-foreground"] as const;

/** Radar 5 trụ cột ESG. Trụ cột còn TODO → trạng thái rỗng (không tự điền số). */
export function EsgRadar({ pillars, height = 240 }: { pillars: Esg["pillars"]; height?: number }) {
  const c = useCssVars(VARS);
  const values = AXES.map(({ key }) => pillars[key]);
  if (values.some((v) => typeof v !== "number")) {
    return (
      <EmptyChart
        title="Chưa có điểm trụ cột E / S / G"
        hint="Điểm con sẽ hiển thị khi nhóm tài chính cập nhật từ file Excel."
        className="h-full min-h-48"
      />
    );
  }
  if (!c) return <div style={{ height }} />;

  const option = {
    tooltip: {
      ...tooltipBase(c),
      trigger: "item",
      formatter: () => AXES.map(({ label }, i) => `${escapeHtml(label)}: <b>${formatNumber(values[i] as number)}</b>`).join("<br/>"),
    },
    radar: {
      radius: "68%",
      indicator: AXES.map(({ label }) => ({ name: label, min: 0, max: 1 })),
      axisName: { color: c["--muted-foreground"], fontSize: 10 },
      splitLine: { lineStyle: { color: c["--border"] } },
      splitArea: { show: false },
      axisLine: { lineStyle: { color: c["--border"] } },
    },
    series: [{
      type: "radar",
      symbolSize: 4,
      lineStyle: { color: c["--primary"], width: 2 },
      itemStyle: { color: c["--primary"] },
      areaStyle: { color: c["--primary"], opacity: 0.18 },
      data: [{ value: values as number[], name: "ESG" }],
    }],
  };

  return (
    <ReactEChartsCore
      echarts={echarts}
      option={option}
      notMerge
      style={{ height, width: "100%" }}
      opts={{ renderer: "canvas" }}
      aria-label={`Radar ESG: ${AXES.map(({ label }, i) => `${label} ${formatNumber(values[i] as number)}`).join(", ")}`}
    />
  );
}
