import { describe, expect, it } from "vitest";
import engine from "@data/financial_engine.json";
import { getCompanies, getMethodology, getOsintEvents, getZScore } from "@/lib/api";
import { assess } from "@/lib/assessment";
import { getOverview, getOverviews } from "@/lib/overview";
import { altmanZone } from "@/lib/risk";

// Nguồn duy nhất: data/QuantumRegTech_Input_Data_final.xlsx. scripts/build-financial-engine-data.mjs đã tính lại
// toàn bộ 36 dòng từ sheet GOC_* và đối chiếu với TINH_TONG_HOP / ESG_Scores (lệch là build fail).
// Các số dưới đây chép từ TINH_TONG_HOP năm dữ liệu 2024 (dự báo 2025).
const WORKBOOK_2024 = {
  VNM: { z: 6.55, zone: "safe", ri: 0.0800, real: 0.0514, rfinTotal: 0.1 },
  PAN: { z: 1.41, zone: "distress", ri: 0.1340, real: 0.1639, rfinTotal: 0.8 },
  KDC: { z: 2.56, zone: "grey", ri: 0.0499, real: -0.1172, rfinTotal: 0.32 },
  SBT: { z: 1.60, zone: "distress", ri: 0.0942, real: 1.1488, rfinTotal: 0.7 },
} as const;

describe("dữ liệu màn hình sinh từ workbook 9 mã", () => {
  it("9 mã, năm dữ liệu mới nhất, 36 dòng đã đối chiếu", async () => {
    const companies = await getCompanies();
    expect(companies.map((c) => c.ticker).sort()).toEqual(["IDP", "KDC", "MCH", "MCM", "PAN", "QNS", "SAB", "SBT", "VNM"]);
    expect(engine.recordCount).toBe(36);
    expect(engine.reconciliation.status).toBe("passed");
    const method = await getMethodology();
    expect([method.dataYear, method.forecastYear]).toEqual([2024, 2025]);
    for (const c of companies) expect([c.dataYear, c.forecastYear], c.ticker).toEqual([2024, 2025]);
  });

  it("Z gốc Altman tính lại từ X1–X5, vùng theo ngưỡng 1,81 / 2,99", async () => {
    for (const company of await getCompanies()) {
      const z = await getZScore(company.ticker);
      const [x1, x2, x3, x4, x5] = [z.x1, z.x2, z.x3, z.x4, z.x5] as number[];
      expect(1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + x5, company.ticker).toBeCloseTo(z.z, 9);
      expect(z.zone, company.ticker).toBe(altmanZone(z.z));
    }
  });

  it("Ri = Rf + β × MRP của năm dữ liệu", async () => {
    const method = await getMethodology();
    for (const c of await getCompanies()) {
      expect(c.expectedReturn, c.ticker).toBeCloseTo(method.riskFree.value + c.beta * method.equityRiskPremium.value, 9);
    }
  });

  it("khớp TINH_TONG_HOP 2024", async () => {
    const overviews = Object.fromEntries((await getOverviews()).map((o) => [o.company.ticker, o]));
    for (const [ticker, expected] of Object.entries(WORKBOOK_2024)) {
      const o = overviews[ticker];
      expect(o.zscore.z, ticker).toBeCloseTo(expected.z, 2);
      expect(o.zscore.zone, ticker).toBe(expected.zone);
      expect(o.company.expectedReturn, ticker).toBeCloseTo(expected.ri, 3);
      expect(o.company.realizedReturn, ticker).toBeCloseTo(expected.real, 3);
      expect(o.rfinTotal, ticker).toBeCloseTo(expected.rfinTotal, 2);
    }
  });

  it("P_OSINT lấy mức cao nhất của sự kiện năm t, khớp engine", async () => {
    const overviews = await getOverviews();
    for (const o of overviews) {
      const record = engine.records.find((r) => r.dataYear === 2024 && r.ticker === o.company.ticker)!;
      expect(o.posint, o.company.ticker).toBeCloseTo(record.calculated.osint.penalty, 9);
      expect(o.rfinTotal, o.company.ticker).toBeCloseTo(record.calculated.altman.rFinTotal, 9);
    }
    const pan = await getOsintEvents("PAN");
    expect(pan.filter((e) => e.active).map((e) => e.decisionYear)).toEqual([2024]);
    // Sự kiện các năm trước chỉ là lịch sử, không tính vào năm 2024.
    expect((await getOsintEvents("KDC")).every((e) => !e.active)).toBe(true);
  });

  it("kết luận báo cáo", async () => {
    expect(assess((await getOverview("PAN"))!).label).toBe("Rủi ro cao");
    expect(assess((await getOverview("SBT"))!).label).toBe("Rủi ro cao");
    expect(assess((await getOverview("KDC"))!).label).toBe("Cần theo dõi");
    expect(assess((await getOverview("VNM"))!).label).toBe("Đạt");
  });
});
