"use client";

import { useMemo, useState } from "react";
import { Calculator, Check, Leaf, RotateCcw, ShieldCheck, TrendingUp } from "lucide-react";
import { OsintScanner } from "@/components/company/OsintScanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { formatNumber, formatPct } from "@/lib/format";
import type { FinancialEngineRecord } from "@/lib/financial-engine";
import { usePortfolioStore } from "@/store/portfolio";

type Preferences = { return: number; esg: number; safety: number };
type Scenario = { id: string; name: string; detail: string; tickers: string[]; capital: number; preferences: Preferences };

const SCENARIOS: Scenario[] = [
  {
    id: "balanced", name: "Cân bằng tăng trưởng và ESG",
    detail: "Vốn 2 tỷ · chọn VNM, PAN, QNS, SBT · giới hạn 35% mỗi mã",
    tickers: ["VNM", "PAN", "QNS", "SBT"], capital: 2_000_000_000,
    preferences: { return: 40, esg: 35, safety: 25 },
  },
  {
    id: "growth", name: "Ưu tiên tăng trưởng",
    detail: "Vốn 1 tỷ · tăng trọng số lợi suất kỳ vọng",
    tickers: ["MCH", "VNM", "SAB", "IDP"], capital: 1_000_000_000,
    preferences: { return: 65, esg: 20, safety: 15 },
  },
  {
    id: "safety", name: "Ưu tiên an toàn tài chính",
    detail: "Vốn 3 tỷ · giảm tỷ trọng doanh nghiệp rủi ro cao",
    tickers: ["VNM", "MCH", "MCM", "QNS", "SAB"], capital: 3_000_000_000,
    preferences: { return: 20, esg: 20, safety: 60 },
  },
];

const STOCK_INFO: Record<string, { name: string; sector: string }> = {
  IDP: { name: "Sữa Quốc tế LOF", sector: "Sữa · đồ uống" },
  KDC: { name: "Tập đoàn KIDO", sector: "Thực phẩm · dầu ăn" },
  MCH: { name: "Hàng tiêu dùng Masan", sector: "Hàng tiêu dùng" },
  MCM: { name: "Sữa Mộc Châu", sector: "Sữa" },
  PAN: { name: "Tập đoàn PAN", sector: "Nông nghiệp · thực phẩm" },
  QNS: { name: "Đường Quảng Ngãi", sector: "Đường · sữa đậu nành" },
  SAB: { name: "Bia Sài Gòn", sector: "Bia · nước giải khát" },
  SBT: { name: "TTC AgriS", sector: "Đường" },
  VNM: { name: "Sữa Việt Nam", sector: "Sữa" },
};

const formatMoney = (amount: number) => new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(amount);
const preferencesTotal = (p: Preferences) => p.return + p.esg + p.safety;

function relativeScores(values: number[], higherIsBetter = true) {
  if (values.length <= 1) return values.map(() => 1);
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (high === low) return values.map(() => 0.5);
  return values.map((value) => {
    const score = (value - low) / (high - low);
    return higherIsBetter ? score : 1 - score;
  });
}

function constrainedWeights(records: FinancialEngineRecord[], preferences: Preferences) {
  const count = records.length;
  if (!count) return new Map<string, number>();
  if (count === 1) return new Map([[records[0].ticker, 1]]);

  const returns = relativeScores(records.map((r) => r.calculated.returns.capmExpected));
  const esg = relativeScores(records.map((r) => r.calculated.esg.total));
  const safety = relativeScores(records.map((r) => r.calculated.altman.rFinTotal), false);
  const total = preferencesTotal(preferences) || 1;
  const importance = [preferences.return / total, preferences.esg / total, preferences.safety / total];
  const utility = records.map((_, i) => importance[0] * returns[i] + importance[1] * esg[i] + importance[2] * safety[i]);
  const maximum = count === 2 ? 0.55 : 0.35;
  const scores = utility.map((value) => Math.exp((value - Math.max(...utility)) * 4));
  const weights = new Array<number>(count).fill(0);
  let available = records.map((_, i) => i);
  let remaining = 1;

  while (available.length) {
    const scoreTotal = available.reduce((sum, i) => sum + scores[i], 0);
    const capped = available.filter((i) => remaining * scores[i] / scoreTotal > maximum);
    if (!capped.length) {
      for (const i of available) weights[i] = remaining * scores[i] / scoreTotal;
      break;
    }
    for (const i of capped) weights[i] = maximum;
    remaining -= maximum * capped.length;
    available = available.filter((i) => !capped.includes(i));
  }

  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  return new Map(records.map((record, i) => [record.ticker, weights[i] / weightTotal]));
}

/** R_fin,total sau khi tính mức OSINT người dùng vừa chấp nhận: mức cao nhất (workbook, chấp nhận) → bảng Params. */
function withAcceptedOsint(record: FinancialEngineRecord, accepted: number, penaltyTable: Record<string, number>): FinancialEngineRecord {
  const level = Math.max(record.calculated.osint.penaltyLevel, accepted);
  if (level === record.calculated.osint.penaltyLevel) return record;
  const penalty = penaltyTable[String(level)] ?? record.calculated.osint.penalty;
  return {
    ...record,
    calculated: {
      ...record.calculated,
      altman: { ...record.calculated.altman, rFinTotal: record.calculated.altman.rFinBase + penalty },
      osint: { ...record.calculated.osint, penaltyLevel: level, penalty },
    },
  };
}

export function PortfolioBuilder({ records, penaltyTable, osintPeriod }: { records: FinancialEngineRecord[]; penaltyTable: Record<string, number>; osintPeriod: { fromDate: string; toDate: string } }) {
  const years = useMemo(() => [...new Set(records.map((r) => r.dataYear))].sort((a, b) => a - b), [records]);
  const [dataYear, setDataYear] = useState(years[years.length - 1]);
  const forecastYear = dataYear + 1;
  // Mức OSINT người dùng chấp nhận trong phiên, theo `${năm}:${mã}`.
  const [acceptedLevels, setAcceptedLevels] = useState<Record<string, number>>({});
  const [osintTicker, setOsintTicker] = useState("");
  const sortedRecords = useMemo(() => records
    .filter((r) => r.dataYear === dataYear)
    .map((r) => withAcceptedOsint(r, acceptedLevels[`${dataYear}:${r.ticker}`] ?? 0, penaltyTable))
    .sort((a, b) => a.ticker.localeCompare(b.ticker)), [records, dataYear, acceptedLevels, penaltyTable]);
  const selectedTickers = usePortfolioStore((state) => state.selectedTickers);
  const setSelectedTickers = usePortfolioStore((state) => state.setSelectedTickers);
  const [preferences, setPreferences] = useState<Preferences>(SCENARIOS[0].preferences);
  const [capital, setCapital] = useState(SCENARIOS[0].capital);
  const [activeScenario, setActiveScenario] = useState(SCENARIOS[0].id);
  const selectedRecords = useMemo(() => sortedRecords.filter((record) => selectedTickers.includes(record.ticker)), [sortedRecords, selectedTickers]);
  const weights = useMemo(() => constrainedWeights(selectedRecords, preferences), [selectedRecords, preferences]);
  const cap = selectedRecords.length === 1 ? 1 : selectedRecords.length === 2 ? 0.55 : 0.35;

  const expected = selectedRecords.reduce((sum, record) => sum + (weights.get(record.ticker) ?? 0) * record.calculated.returns.capmExpected, 0);
  const historical = selectedRecords.reduce((sum, record) => sum + (weights.get(record.ticker) ?? 0) * record.calculated.returns.adjustedPricePeriod, 0);
  const historicalChange = capital * historical;
  const esgTotal = selectedRecords.reduce((sum, record) => sum + (weights.get(record.ticker) ?? 0) * record.calculated.esg.total, 0);
  const riskTotal = selectedRecords.reduce((sum, record) => sum + (weights.get(record.ticker) ?? 0) * record.calculated.altman.rFinTotal, 0);
  const allocations = useMemo(() => {
    const amounts = selectedRecords.map((record) => Math.round(capital * (weights.get(record.ticker) ?? 0)));
    if (amounts.length) amounts[amounts.length - 1] += capital - amounts.reduce((sum, amount) => sum + amount, 0);
    return new Map(selectedRecords.map((record, index) => [record.ticker, amounts[index]]));
  }, [capital, selectedRecords, weights]);

  function applyScenario(scenario: Scenario) {
    const available = new Set(sortedRecords.map((record) => record.ticker));
    setSelectedTickers(scenario.tickers.filter((ticker) => available.has(ticker)));
    setPreferences(scenario.preferences);
    setCapital(scenario.capital);
    setActiveScenario(scenario.id);
  }

  function toggleTicker(ticker: string) {
    setActiveScenario("");
    setSelectedTickers(selectedTickers.includes(ticker)
      ? selectedTickers.filter((item) => item !== ticker)
      : [...selectedTickers, ticker]);
  }

  function setPreference(key: keyof Preferences, value: number) {
    setActiveScenario("");
    setPreferences((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 pb-10">
      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">Phân bổ vốn theo lựa chọn và mục tiêu đầu tư của anh</p>
        <h2 className="text-2xl font-semibold tracking-tight">Tạo danh mục đầu tư</h2>
        <p className="max-w-3xl text-sm text-muted-foreground">Chọn năm dữ liệu, cổ phiếu, quy mô vốn và mức ưu tiên. Đối chiếu phân bổ với lợi suất giá lịch sử năm {forecastYear}.</p>
        <div className="flex flex-wrap items-center gap-2 pt-1" role="group" aria-label="Năm dữ liệu">
          <span className="text-sm text-muted-foreground">Năm dữ liệu:</span>
          {years.map((year) => <Button key={year} size="sm" variant={year === dataYear ? "default" : "outline"} onClick={() => setDataYear(year)}>{year} → {year + 1}</Button>)}
        </div>
      </header>

      <section className="space-y-3">
        <div><h3 className="font-semibold">Kịch bản tham khảo</h3><p className="text-sm text-muted-foreground">Chọn một kịch bản để nạp nhanh cổ phiếu, vốn và mức ưu tiên.</p></div>
        <div className="grid gap-3 md:grid-cols-3">
          {SCENARIOS.map((scenario) => <button key={scenario.id} type="button" onClick={() => applyScenario(scenario)} className={`rounded-xl border p-4 text-left transition hover:border-primary/60 hover:bg-primary/[0.025] ${activeScenario === scenario.id ? "border-primary bg-primary/[0.04] ring-1 ring-primary/20" : "bg-card"}`}>
            <span className="flex items-center justify-between gap-2 font-medium">{scenario.name}{activeScenario === scenario.id && <Check className="size-4 text-primary" />}</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{scenario.detail}</span>
          </button>)}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>Chọn cổ phiếu</CardTitle><CardDescription>{selectedRecords.length} mã đã chọn trong tổng số {sortedRecords.length} mã có dữ liệu</CardDescription></CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {sortedRecords.map((record) => {
                const selected = selectedTickers.includes(record.ticker);
                const info = STOCK_INFO[record.ticker];
                return <label key={record.ticker} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${selected ? "border-primary/50 bg-primary/[0.035]" : "hover:bg-muted/40"}`}>
                  <input type="checkbox" checked={selected} onChange={() => toggleTicker(record.ticker)} className="mt-1 size-4 accent-primary" />
                  <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="font-semibold">{record.ticker}</span><span className="font-mono text-xs text-muted-foreground">{formatPct(record.calculated.returns.capmExpected)}</span></span>
                    <span className="block truncate text-xs text-muted-foreground">{info?.name ?? record.ticker} · {info?.sector ?? "Thực phẩm và đồ uống"}</span>
                  </span>
                </label>;
              })}
            </CardContent>
            <div className="flex flex-wrap gap-2 px-6 pb-5">
              <Button size="sm" variant="outline" onClick={() => { setSelectedTickers(sortedRecords.map((r) => r.ticker)); setActiveScenario(""); }}>Chọn tất cả</Button>
              <Button size="sm" variant="ghost" onClick={() => { setSelectedTickers([]); setActiveScenario(""); }}>Bỏ chọn tất cả</Button>
            </div>
          </Card>

          <Card>
            <CardHeader><CardTitle>Quy mô vốn và mức ưu tiên</CardTitle><CardDescription>Các mức ưu tiên được chuẩn hóa theo tổng điểm rồi dùng để tính tỷ trọng.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
              <label className="flex max-w-md items-center gap-3 text-sm"><span className="shrink-0 text-muted-foreground">Tổng vốn (VNĐ)</span><input type="number" min={1_000_000} step={10_000_000} value={capital} onChange={(event) => { setCapital(Math.max(1_000_000, Number(event.target.value) || 1_000_000)); setActiveScenario(""); }} className="h-9 w-full rounded-md border bg-background px-3 font-mono" /></label>
              <PreferenceSlider icon={TrendingUp} label="Lợi suất kỳ vọng" value={preferences.return} onChange={(value) => setPreference("return", value)} />
              <PreferenceSlider icon={Leaf} label="Môi trường, xã hội và quản trị" value={preferences.esg} onChange={(value) => setPreference("esg", value)} />
              <PreferenceSlider icon={ShieldCheck} label="An toàn tài chính" value={preferences.safety} onChange={(value) => setPreference("safety", value)} />
              <div className="flex flex-wrap gap-2 border-t pt-4 text-xs text-muted-foreground">
                <Badge variant="outline">Tổng điểm ưu tiên: {preferencesTotal(preferences)}</Badge>
                <Badge variant="outline">Trần mỗi mã: {formatPct(cap, 0)}</Badge>
                <Badge variant="outline">Tổng tỷ trọng: 100%</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Calculator className="size-5 text-primary" /> Tỷ trọng đề xuất</CardTitle><CardDescription>Tỷ trọng do hệ thống tính từ cổ phiếu đã chọn và mức ưu tiên hiện tại.</CardDescription></CardHeader>
            <CardContent>
              {selectedRecords.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Chọn ít nhất một cổ phiếu để tính tỷ trọng.</p> : <div className="space-y-4">
                {selectedRecords.map((record) => {
                  const weight = weights.get(record.ticker) ?? 0;
                  const allocation = allocations.get(record.ticker) ?? 0;
                  return <div key={record.ticker} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{record.ticker}<span className="ml-2 font-normal text-muted-foreground">{STOCK_INFO[record.ticker]?.name}</span></span><span className="font-mono font-semibold tabular-nums">{formatPct(weight, 2)}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${weight * 100}%` }} /></div>
                    <p className="text-right text-xs text-muted-foreground">{formatMoney(allocation)} VNĐ</p>
                  </div>;
                })}
                <div className="flex justify-between border-t pt-3 text-sm font-semibold"><span>Tổng phân bổ</span><span>{formatMoney(capital)} VNĐ · 100%</span></div>
              </div>}
            </CardContent>
          </Card>

          {selectedRecords.length > 0 && <div className="grid gap-3 sm:grid-cols-2">
            <Metric label={`Lợi suất kỳ vọng CAPM · ${dataYear}`} value={formatPct(expected)} icon={TrendingUp} />
            <Metric label="Điểm ESG danh mục" value={formatNumber(esgTotal, 3)} icon={Leaf} />
            <Metric label="Rủi ro tài chính bình quân" value={formatPct(riskTotal)} icon={ShieldCheck} />
            <Metric label={`Lợi suất giá lịch sử · ${forecastYear}`} value={formatPct(historical)} icon={RotateCcw} />
          </div>}

          {selectedRecords.length > 0 && <div className="flex items-center justify-between gap-4 rounded-2xl border bg-primary/[0.035] px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Biến động tham chiếu · {forecastYear}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Vốn hiện tại theo tỷ trọng đã chọn</p>
            </div>
            <p className={`shrink-0 font-mono text-lg font-semibold tabular-nums ${historicalChange >= 0 ? "text-risk-safe" : "text-risk-distress"}`}>
              {historicalChange >= 0 ? "+" : "−"}{formatMoney(Math.abs(historicalChange))} ₫
            </p>
          </div>}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Theo dõi sự kiện xử phạt</CardTitle>
          <CardDescription>Chọn khoảng thời gian quét đến hôm nay. Chỉ sự kiện bạn chấp nhận mới cập nhật mức rủi ro trong phiên.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedRecords.length === 0 ? <p className="text-sm text-muted-foreground">Chọn cổ phiếu trước khi quét OSINT.</p> : <>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Mã cần quét OSINT">
              {selectedRecords.map((record) => {
                const accepted = acceptedLevels[`${dataYear}:${record.ticker}`] ?? 0;
                return <Button key={record.ticker} size="sm" variant={osintTicker === record.ticker ? "default" : "outline"} onClick={() => setOsintTicker(record.ticker)}>
                  {record.ticker} · mức {record.calculated.osint.penaltyLevel}{accepted > 0 ? " (đã chấp nhận)" : ""}
                </Button>;
              })}
            </div>
            {(() => {
              const record = records.find((r) => r.dataYear === dataYear && r.ticker === osintTicker && selectedTickers.includes(r.ticker));
              if (!record) return <p className="text-xs text-muted-foreground">Chọn một mã để quét. Mỗi lượt quét là một job Firecrawl Agent (tốn credit, thường vài phút).</p>;
              return <OsintScanner
                key={`${osintPeriod.fromDate}:${osintPeriod.toDate}:${record.ticker}`}
                ticker={record.ticker}
                fromDate={osintPeriod.fromDate}
                toDate={osintPeriod.toDate}
                rfinBase={record.calculated.altman.rFinBase}
                workbookLevel={record.calculated.osint.penaltyLevel}
                penaltyTable={penaltyTable}
                existingUrls={record.calculated.osint.events.map((event) => event.sourceUrl ?? "").filter(Boolean)}
                onAcceptedLevel={(ticker, level) => setAcceptedLevels((current) => ({ ...current, [`${dataYear}:${ticker}`]: level }))}
              />;
            })()}
          </>}
        </CardContent>
      </Card>
    </div>
  );
}

function PreferenceSlider({ icon: Icon, label, value, onChange }: { icon: typeof TrendingUp; label: string; value: number; onChange: (value: number) => void }) {
  return <div className="space-y-2">
    <div className="flex items-center justify-between gap-3"><Label className="flex items-center gap-2 text-sm"><Icon className="size-4 text-primary" />{label}</Label><span className="font-mono text-sm tabular-nums">{value}</span></div>
    <Slider value={[value]} min={0} max={100} step={5} getAriaLabel={() => label} onValueChange={(next) => onChange(Array.isArray(next) ? next[0] : next)} />
  </div>;
}

function Metric({ label, value, icon: Icon }: { label: string; value: string; icon: typeof TrendingUp }) {
  return <Card size="sm"><CardContent className="flex items-center gap-3 pt-3"><span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-4" /></span><span><span className="block text-xs text-muted-foreground">{label}</span><span className="font-semibold tabular-nums">{value}</span></span></CardContent></Card>;
}
