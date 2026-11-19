"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowUpRight, Check, LoaderCircle, Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardCard } from "@/components/dashboard/DashboardCard";
import { formatNumber, formatPct } from "@/lib/format";
import type { CompanyOverview } from "@/lib/overview";
import { usePortfolioStore } from "@/store/portfolio";

const DEMO_TICKERS = ["VNM", "SAB", "MCM", "SBT"];

export function StockUniverse({ items }: { items: CompanyOverview[] }) {
  const [query, setQuery] = useState("");
  const [newTicker, setNewTicker] = useState("");
  const [sourceReference, setSourceReference] = useState("");
  const [pendingTickers, setPendingTickers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState("");
  const [selected, setSelected] = useState<string[]>(DEMO_TICKERS.filter((ticker) => items.some((item) => item.company.ticker === ticker)));
  const setSelectedTickers = usePortfolioStore((state) => state.setSelectedTickers);

  useEffect(() => {
    fetch("/api/universe?limit=200")
      .then(async (response) => response.ok ? response.json() : null)
      .then((page) => {
        if (page?.items) setPendingTickers(page.items.filter((entry: { availability: string }) => entry.availability === "pending_data").map((entry: { ticker: string }) => entry.ticker));
      })
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(() => items.filter(({ company }) =>
    `${company.ticker} ${company.name} ${company.subsector} ${company.exchange}`.toLowerCase().includes(query.trim().toLowerCase())
  ), [items, query]);

  function updateSelection(next: string[]) {
    setSelected(next);
    setSelectedTickers(next);
  }

  function toggle(ticker: string) {
    updateSelection(selected.includes(ticker) ? selected.filter((item) => item !== ticker) : [...selected, ticker]);
  }

  async function registerTicker(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setFormMessage("");
    try {
      const response = await fetch("/api/universe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ticker: newTicker.trim().toUpperCase(), source_reference: sourceReference.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail ?? "Không thể thêm mã cổ phiếu.");
      setPendingTickers((current) => current.includes(result.ticker) ? current : [...current, result.ticker].sort());
      setNewTicker("");
      setSourceReference("");
      setFormMessage(`${result.ticker} đã được thêm vào danh mục chờ dữ liệu. Mã chưa có chỉ số để tra cứu hoặc phân bổ.`);
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Không thể thêm mã. Hãy kiểm tra kết nối backend.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const allSelected = items.length > 0 && items.every((item) => selected.includes(item.company.ticker));

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Danh sách cổ phiếu</h2>
          <p className="text-sm text-muted-foreground">Tìm trong universe đã cấu hình, mở hồ sơ doanh nghiệp hoặc chọn mã cho danh mục.</p>
        </div>
        <Badge variant="outline">{items.length} mã có dữ liệu · {pendingTickers.length} mã chờ dữ liệu</Badge>
      </header>

      <DashboardCard title="Thêm mã cổ phiếu" description="Đăng ký mã ngoài bộ demo. Cần nguồn tham chiếu; mã mới sẽ ở trạng thái chờ cho tới khi bổ sung và kiểm tra dữ liệu tài chính, thị trường và ESG.">
        <form onSubmit={registerTicker} className="grid gap-3 sm:grid-cols-[minmax(120px,0.4fr)_minmax(220px,1fr)_auto] sm:items-end">
          <label className="space-y-1 text-xs font-medium">Mã cổ phiếu
            <Input required maxLength={12} pattern="[A-Za-z0-9.\\-]+" value={newTicker} onChange={(event) => setNewTicker(event.target.value.toUpperCase())} placeholder="Ví dụ: QNS" />
          </label>
          <label className="space-y-1 text-xs font-medium">Nguồn tham chiếu
            <Input required maxLength={500} value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} placeholder="URL báo cáo, trang doanh nghiệp hoặc mã nguồn workbook" />
          </label>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? <LoaderCircle className="mr-1 size-4 animate-spin" /> : <Plus className="mr-1 size-4" />}Thêm mã</Button>
        </form>
        {formMessage && <p role="status" className="mt-3 text-xs text-muted-foreground">{formMessage}</p>}
        {pendingTickers.length > 0 && <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3 text-xs"><span className="text-muted-foreground">Đang chờ dữ liệu:</span>{pendingTickers.map((ticker) => <Badge key={ticker} variant="outline">{ticker} · Chờ dữ liệu</Badge>)}</div>}
      </DashboardCard>

      <DashboardCard title="Universe cổ phiếu" description="Danh sách được sinh từ nguồn dữ liệu cấu hình. Thêm mã mới bằng cách bổ sung dữ liệu và metadata vào universe; không tạo số liệu còn thiếu.">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-56 flex-1">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm mã, tên doanh nghiệp, ngành hoặc sàn" className="pl-9" aria-label="Tìm trong danh sách cổ phiếu" />
            </div>
            <Button size="sm" variant="secondary" onClick={() => updateSelection(DEMO_TICKERS.filter((ticker) => items.some((item) => item.company.ticker === ticker)))}>Nạp bộ demo 4 mã</Button>
            <Button size="sm" variant="outline" onClick={() => updateSelection(allSelected ? [] : items.map((item) => item.company.ticker))}>{allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả đang có"}</Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
            <p className="text-xs"><span className="font-semibold">{selected.length} mã được chọn</span><span className="text-muted-foreground"> · chuyển sang Portfolio Optimizer</span></p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => updateSelection([])} disabled={selected.length === 0}><X className="mr-1 size-3.5" />Bỏ chọn</Button>
              <Link href="/portfolio" onClick={() => setSelectedTickers(selected)} className="inline-flex h-7 items-center gap-1 rounded-lg bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/80">Mở danh mục <ArrowUpRight className="size-3.5" /></Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-xs">
              <thead><tr className="border-b text-muted-foreground"><th className="w-10 p-2">Chọn</th><th className="p-2">Mã / doanh nghiệp</th><th className="p-2">Ngành</th><th className="p-2">Sàn</th><th className="p-2">Ri kỳ vọng</th><th className="p-2">ESGi</th><th className="p-2">Altman Z</th><th className="p-2">Vùng</th><th className="p-2">RFin total</th><th className="p-2">OSINT</th></tr></thead>
              <tbody>{filtered.map((item) => {
                const { company, zscore, esg, events, rfinTotal } = item;
                const checked = selected.includes(company.ticker);
                return <tr key={company.ticker} className={`border-b last:border-0 ${checked ? "bg-primary/[0.035]" : ""}`}>
                  <td className="p-2"><button type="button" role="checkbox" aria-checked={checked} aria-label={`Chọn ${company.ticker}`} onClick={() => toggle(company.ticker)} className={`flex size-5 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}>{checked && <Check className="size-3.5" />}</button></td>
                  <td className="p-2"><Link href={`/company/${company.ticker}`} className="font-semibold text-primary hover:underline">{company.ticker}</Link><div className="max-w-64 truncate text-muted-foreground">{company.name}</div></td>
                  <td className="p-2">{company.subsector}</td><td className="p-2">{company.exchange === "TODO" ? "—" : company.exchange}</td>
                  <td className="p-2 font-mono">{formatPct(company.expectedReturn)}</td><td className="p-2 font-mono">{formatNumber(esg.esgScore)}</td><td className="p-2 font-mono">{formatNumber(zscore.z)}</td>
                  <td className="p-2"><Badge variant="outline" className="capitalize">{zscore.zone}</Badge></td><td className="p-2 font-mono">{formatNumber(rfinTotal)}</td><td className="p-2">{events.length ? <Badge variant="secondary">{events.length} tín hiệu</Badge> : <span className="text-muted-foreground">Không có</span>}</td>
                </tr>;
              })}</tbody>
            </table>
            {filtered.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Không tìm thấy mã phù hợp.</p>}
          </div>
        </div>
      </DashboardCard>

      <p className="text-xs text-muted-foreground">Hiện workbook đang nạp {items.length} mã có dữ liệu. Các mã được nhắc trong tài liệu mở rộng nhưng chưa có bộ trường hoàn chỉnh sẽ không xuất hiện cho tới khi được bổ sung vào nguồn dữ liệu.</p>
    </div>
  );
}
