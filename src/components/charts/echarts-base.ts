/** Thiết lập dùng chung cho mọi biểu đồ ECharts – màu lấy từ design token qua useCssVars(), không hard-code. */

export const TOOLTIP_VARS = ["--popover", "--popover-foreground", "--border"] as const;
export const SERIES_VARS = ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"] as const;

type Vars = Record<string, string>;

/** Khung tooltip giống popover của shadcn (bo góc, viền, cỡ chữ 12px). */
export function tooltipBase(c: Vars) {
  return {
    backgroundColor: c["--popover"],
    borderColor: c["--border"],
    borderWidth: 1,
    padding: [6, 10],
    textStyle: { color: c["--popover-foreground"], fontSize: 12 },
    extraCssText: "border-radius:8px;box-shadow:0 4px 12px rgb(0 0 0 / 0.08);",
  };
}

/** Escape nội dung đưa vào tooltip HTML của ECharts. */
export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}
