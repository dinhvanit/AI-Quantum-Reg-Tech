import type { Metadata } from "next";
import { StockUniverse } from "@/components/stocks/StockUniverse";
import { getOverviews } from "@/lib/overview";
import { getFinancialEngineData } from "@/lib/financial-engine";
import type { CompanyOverview } from "@/lib/overview";
import type { Company, Esg, OsintEvent, ZScore } from "@/lib/types";

export const metadata: Metadata = { title: "Danh sách mã & thêm cổ phiếu | QuantumRegTech" };

export default async function StocksPage() {
  const [legacyItems, engine] = await Promise.all([getOverviews(), getFinancialEngineData(2024)]);
  const legacyByTicker = new Map(legacyItems.map((item) => [item.company.ticker, item]));
  const names: Record<string, { name: string; subsector: string; exchange: string }> = {
    MCH: { name: "Công ty Cổ phần Hàng tiêu dùng Masan", subsector: "Hàng tiêu dùng", exchange: "HOSE" },
    QNS: { name: "Công ty Cổ phần Đường Quảng Ngãi", subsector: "Đường · sữa đậu nành", exchange: "UPCoM" },
    KDC: { name: "Công ty Cổ phần Tập đoàn KIDO", subsector: "Thực phẩm · dầu ăn", exchange: "HOSE" },
    PAN: { name: "Công ty Cổ phần Tập đoàn PAN", subsector: "Nông nghiệp · thực phẩm", exchange: "HOSE" },
    IDP: { name: "Công ty Cổ phần Sữa Quốc tế LOF", subsector: "Sữa · đồ uống", exchange: "UPCoM" },
  };
  const items: CompanyOverview[] = engine.records.map((record) => {
    const legacy = legacyByTicker.get(record.ticker);
    const identity = names[record.ticker] ?? { name: legacy?.company.name ?? record.ticker, subsector: legacy?.company.subsector ?? "Thực phẩm và đồ uống", exchange: legacy?.company.exchange === "TODO" ? "—" : legacy?.company.exchange ?? "—" };
    const { altman, esg: calculatedEsg, osint, returns } = record.calculated;
    const company: Company = {
      ...(legacy?.company ?? { ticker: record.ticker, name: identity.name, exchange: identity.exchange, subsector: identity.subsector, listed: true, beta: returns.beta, expectedReturn: returns.capmExpected, realizedReturn: returns.adjustedPricePeriod }),
      beta: returns.beta,
      expectedReturn: returns.capmExpected,
      realizedReturn: returns.adjustedPricePeriod,
    };
    const zscore: ZScore = {
      model: "Z", x1: altman.x1, x2: altman.x2, x3: altman.x3, x4: altman.x4, x5: altman.x5,
      z: altman.zScore,
      zone: altman.zone === "SAFE" ? "safe" : altman.zone === "GREY" ? "grey" : "distress",
      rfinBase: altman.rFinBase,
      fiscalYear: record.dataYear,
    };
    const esg: Esg = {
      esgScore: calculatedEsg.total,
      pillars: { E: calculatedEsg.pillars.E, S: calculatedEsg.pillars.S, G: calculatedEsg.pillars.G, transparency: "TODO", compliance: "TODO" },
      greenwashingRisk: "TODO",
      evidence: [],
    };
    const events: OsintEvent[] = osint.events.map((event, index) => ({
      id: `${record.ticker}-${record.forecastYear}-${index}`,
      ticker: record.ticker,
      date: `${event.decisionYear}-12-31`,
      type: "media",
      severity: event.level as 1 | 2 | 3,
      penalty: osint.penalty,
      title: event.summary ?? "Sự kiện công khai cần rà soát",
      source: event.entity,
      url: event.sourceUrl ?? "",
      active: true,
    }));
    const item: CompanyOverview = { company, zscore, esg, allEvents: events, events, posint: osint.penalty, rfinTotal: altman.rFinTotal };
    return item;
  });
  return <StockUniverse items={items} />;
}
