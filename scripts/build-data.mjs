// Chuyển data/QuantumRegTech_Data.xlsx → data/generated/*.json (schema = hợp đồng API, xem docs/DATA.md).
// Chạy: npm run data (tự chạy trước dev / build / test). File JSON sinh ra không commit.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = process.argv[2] ?? join(ROOT, "data", "QuantumRegTech_Data.xlsx");
const OUT = join(ROOT, "data", "generated");
const TODO = "TODO";

/** Giá trị ô: công thức → kết quả đã lưu; rich text / hyperlink → chuỗi; rỗng → null. */
function cellValue(cell, where) {
  const v = cell.value;
  if (v === null || v === undefined || v === "") return null;
  if (typeof v !== "object" || v instanceof Date) return typeof v === "string" ? v.trim() : v;
  if ("formula" in v || "sharedFormula" in v) {
    if (v.result === undefined || (typeof v.result === "object" && v.result?.error)) {
      throw new Error(`${where}: công thức chưa có kết quả – mở file bằng Excel/LibreOffice rồi lưu lại.`);
    }
    return v.result;
  }
  if ("richText" in v) return v.richText.map((t) => t.text).join("").trim();
  if ("hyperlink" in v) return String(v.text ?? v.hyperlink).trim();
  return v;
}

/** Đọc sheet dạng bảng (dòng 1 = key) thành mảng object. */
function readTable(wb, name) {
  const ws = wb.getWorksheet(name);
  if (!ws) throw new Error(`Thiếu sheet "${name}" trong ${SRC}`);
  const keys = [];
  ws.getRow(1).eachCell((c, i) => (keys[i] = String(c.value).trim()));
  const rows = [];
  ws.eachRow((row, r) => {
    if (r === 1) return;
    const o = {};
    keys.forEach((k, i) => k && (o[k] = cellValue(row.getCell(i), `${name}!${row.getCell(i).address}`)));
    if (Object.values(o).some((v) => v !== null)) rows.push(o);
  });
  return rows;
}

const kv = (rows) => Object.fromEntries(rows.map((r) => [r.key, r.value]));
const todo = (v) => (v === null || v === undefined ? TODO : v);
const num = (v, where) => {
  if (v === TODO || v === null) return TODO;
  if (typeof v !== "number") throw new Error(`${where}: cần số, nhận "${v}"`);
  return v;
};
const vi = (n) => String(n).replace(".", ",");

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(SRC);

const params = kv(readTable(wb, "Params"));
const market = Object.fromEntries(readTable(wb, "Market").map((r) => [r.ticker, r]));
const financials = Object.fromEntries(readTable(wb, "Financials").map((r) => [r.ticker, r]));
const referenceZ = Object.fromEntries(readTable(wb, "ZScore").map((r) => [r.ticker, r]));
const esgRows = readTable(wb, "ESG");
const esgByTicker = Object.fromEntries(esgRows.map((r) => [r.ticker, r]));

const requiredNumber = (value, where) => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${where}: thiếu đầu vào số hợp lệ`);
  return value;
};
const ratio = (numerator, denominator, where) => {
  const d = requiredNumber(denominator, `${where}.denominator`);
  if (d === 0) throw new Error(`${where}: mẫu số bằng 0`);
  return requiredNumber(numerator, `${where}.numerator`) / d;
};
const assertMatchesWorkbook = (actual, expected, where, tolerance = 0.0002) => {
  if (typeof expected !== "number" || Math.abs(actual - expected) > tolerance) {
    throw new Error(`${where}: công thức trong financial engine (${actual}) lệch giá trị đối chiếu workbook (${expected})`);
  }
};
const zZone = (z) => z > params.z_safe ? "safe" : z >= params.z_distress ? "grey" : "distress";
const rfinBaseFromZ = (z) => {
  if (z > params.z_safe) return 0.1;
  if (z < params.z_distress) return 0.7;
  return 0.7 - (z - params.z_distress) * (0.6 / (params.z_safe - params.z_distress));
};

const requiredFinanceKeys = ["CA", "TA", "CL", "TL", "RE", "Revenue", "PBT", "Interest", "MktCap"];
const companiesSource = readTable(wb, "Companies");
const pendingUniverse = [];
const analysisReady = companiesSource.filter((company) => {
  const marketRow = market[company.ticker];
  const financialRow = financials[company.ticker];
  const esgRow = esgByTicker[company.ticker];
  const missing = [];
  if (!company.name) missing.push("company_name");
  if (!marketRow || typeof marketRow.beta !== "number") missing.push("market_beta");
  if (!marketRow || typeof marketRow.price_start_next !== "number" || typeof marketRow.price_end_next !== "number") missing.push("market_prices");
  if (!financialRow) missing.push("financials");
  else for (const key of requiredFinanceKeys) if (typeof financialRow[key] !== "number") missing.push(`financials.${key}`);
  if (!referenceZ[company.ticker]) missing.push("altman_methodology_inputs");
  if (!esgRow || typeof esgRow.esg_score !== "number") missing.push("esg_score");
  if (missing.length) {
    pendingUniverse.push({
      ticker: company.ticker,
      name: company.name ?? null,
      exchange: todo(company.exchange),
      subsector: company.subsector ?? null,
      availability: "pending_data",
      missing_required_fields: missing,
      source_reference: financialRow?.source ?? `workbook:${SRC.replace(ROOT + "/", "")}`,
    });
    return false;
  }
  return true;
});

const companies = analysisReady.map((c) => {
  const m = market[c.ticker];
  const f = financials[c.ticker];
  if (!m || !f) throw new Error(`Thiếu đầu vào Market hoặc Financials cho ${c.ticker}`);
  const beta = requiredNumber(m.beta, `Market ${c.ticker}.beta`);
  const expectedReturn = requiredNumber(params.rf, "Params.rf") + beta * requiredNumber(params.erp, "Params.erp");
  const realizedReturn = ratio(m.price_end_next, m.price_start_next, `Market ${c.ticker}.realizedReturn`) - 1;
  assertMatchesWorkbook(expectedReturn, m.expected_return, `Market.${c.ticker}.expected_return`, 1e-8);
  assertMatchesWorkbook(realizedReturn, m.realized_return, `Market.${c.ticker}.realized_return`, 1e-8);
  return {
    ticker: c.ticker,
    name: c.name,
    exchange: todo(c.exchange),
    subsector: c.subsector,
    listed: c.listed === 1,
    beta,
    expectedReturn,
    realizedReturn,
  };
});

const zscore = Object.fromEntries(
  Object.entries(financials).filter(([ticker]) => analysisReady.some((company) => company.ticker === ticker)).map(([ticker, f]) => {
    const x = {
      x1: ratio(requiredNumber(f.CA, `${ticker}.CA`) - requiredNumber(f.CL, `${ticker}.CL`), f.TA, `${ticker}.X1`),
      x2: ratio(f.RE, f.TA, `${ticker}.X2`),
      // Workbook proxy: EBT + interest expense is used because EBIT is not provided.
      x3: ratio(requiredNumber(f.PBT, `${ticker}.PBT`) + requiredNumber(f.Interest, `${ticker}.Interest`), f.TA, `${ticker}.X3`),
      x4: ratio(f.MktCap, f.TL, `${ticker}.X4`),
      x5: ratio(f.Revenue, f.TA, `${ticker}.X5`),
    };
    const z = 1.2 * x.x1 + 1.4 * x.x2 + 3.3 * x.x3 + 0.6 * x.x4 + x.x5;
    const ref = referenceZ[ticker];
    for (const key of Object.keys(x)) assertMatchesWorkbook(x[key], ref?.[key], `ZScore.${ticker}.${key}`);
    assertMatchesWorkbook(z, ref?.z, `ZScore.${ticker}.z`);
    const zone = zZone(z);
    assertMatchesWorkbook(rfinBaseFromZ(z), ref?.rfin_base, `ZScore.${ticker}.rfin_base`);
    return [ticker, { model: "Z", ...x, z, zone, rfinBase: rfinBaseFromZ(z), fiscalYear: f.fiscal_year, source: f.source }];
  })
);

const evidence = readTable(wb, "ESG_Evidence");
const esg = Object.fromEntries(
  esgRows.filter((e) => analysisReady.some((company) => company.ticker === e.ticker)).map((e) => [
    e.ticker,
    {
      esgScore: num(e.esg_score, `ESG ${e.ticker}.esg_score`),
      pillars: { E: todo(e.E), S: todo(e.S), G: todo(e.G), transparency: todo(e.transparency), compliance: todo(e.compliance) },
      greenwashingRisk: todo(e.greenwashing_risk),
      evidence: evidence
        .filter((v) => v.ticker === e.ticker)
        .map((v) => ({
          claim: todo(v.claim),
          claimSource: todo(v.claim_source),
          counter: todo(v.counter),
          counterSource: todo(v.counter_source),
          counterUrl: v.counter_url ?? "",
          contradiction: num(v.contradiction, `ESG_Evidence ${v.ticker}.contradiction`),
          taxonomyRef: todo(v.taxonomy_ref),
        })),
    },
  ])
);

const osint = readTable(wb, "OSINT").map((e) => ({
  id: e.id,
  ticker: e.ticker,
  date: `${e.year}-${typeof e.month === "number" ? String(e.month).padStart(2, "0") : TODO}`,
  type: e.type,
  severity: e.severity,
  penalty: e.penalty,
  title: e.title,
  source: e.source,
  url: e.url ?? "",
  active: e.active === 1,
}));

const weights = readTable(wb, "Portfolio");
const summary = Object.fromEntries(readTable(wb, "Portfolio_Summary").map((s) => [s.scenario, s]));
const pick = (col) => Object.fromEntries(weights.map((w) => [w.ticker, w[col]]));
const companyByTicker = Object.fromEntries(companies.map((company) => [company.ticker, company]));
const calculatePortfolioSummary = (scenario, weightColumn) => {
  const scenarioWeights = weights.map((row) => ({
    ticker: row.ticker,
    weight: requiredNumber(row[weightColumn], `Portfolio.${row.ticker}.${weightColumn}`),
  }));
  const weightTotal = scenarioWeights.reduce((sum, row) => sum + row.weight, 0);
  assertMatchesWorkbook(weightTotal, 1, `Portfolio.${scenario}.weight_total`, 1e-8);
  for (const row of scenarioWeights) {
    if (row.weight < params.min_weight - 1e-9 || row.weight > params.max_weight + 1e-9) {
      throw new Error(`Portfolio.${scenario}.${row.ticker}: tỷ trọng ngoài giới hạn min/max`);
    }
  }
  const expectedReturn = scenarioWeights.reduce((sum, row) => sum + row.weight * companyByTicker[row.ticker].expectedReturn, 0);
  const realizedReturn = scenarioWeights.reduce((sum, row) => sum + row.weight * companyByTicker[row.ticker].realizedReturn, 0);
  assertMatchesWorkbook(expectedReturn, summary[scenario]?.expected_return, `Portfolio_Summary.${scenario}.expected_return`);
  assertMatchesWorkbook(realizedReturn, summary[scenario]?.realized_return, `Portfolio_Summary.${scenario}.realized_return`);
  return { expectedReturn, realizedReturn };
};
const baselineSummary = calculatePortfolioSummary("baseline", "w_baseline");
const esgAwareSummary = calculatePortfolioSummary("esg_aware", "w_esg_aware");

// Ma trận QUBO: vùng B3:Q18 – đủ số thì dùng, còn lại "TODO".
const qws = wb.getWorksheet("QUBO_Matrix");
const n = params.qubo_num_qubits;
const matrix = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => cellValue(qws.getCell(i + 3, j + 2), "QUBO_Matrix")));
const hasMatrix = matrix.every((r) => r.every((v) => typeof v === "number"));

const portfolio = {
  capital: params.capital_vnd,
  constraints: { minWeight: params.min_weight, maxWeight: params.max_weight },
  params: { alpha: todo(params.alpha), beta: todo(params.beta), gamma: todo(params.gamma), delta: todo(params.delta) },
  solver: params.solver,
  esgAware: { weights: pick("w_esg_aware"), ...esgAwareSummary },
  baseline: { weights: pick("w_baseline"), ...baselineSummary },
  qubo: { bitsPerAsset: params.qubo_bits_per_asset, numQubits: n, matrix: hasMatrix ? matrix : `${TODO} – ${n}×${n}, dán vào sheet QUBO_Matrix` },
};

const tickers = weights.map((w) => w.ticker);
const scenarios = readTable(wb, "Scenarios").map((s) => ({
  params: { alpha: s.alpha, beta: s.beta, gamma: s.gamma, delta: s.delta },
  weights: Object.fromEntries(tickers.map((t) => [t, s[t]])),
}));

const ps = kv(readTable(wb, "Private_Sample"));
const privateSample = {
  company: { name: ps.company_name, subsector: todo(ps.subsector), listed: false, fiscalYear: todo(ps.fiscal_year) },
  zscore: {
    model: ps.z_model,
    x1: todo(ps.x1), x2: todo(ps.x2), x3: todo(ps.x3), x4: todo(ps.x4), x5: todo(ps.x5),
    z: todo(ps.z), zone: todo(ps.zone), rfinBase: todo(ps.rfin_base),
  },
  esg: {
    esgScore: todo(ps.esg_score),
    pillars: { E: todo(ps.E), S: todo(ps.S), G: todo(ps.G), transparency: todo(ps.transparency), compliance: todo(ps.compliance) },
    greenwashingRisk: todo(ps.greenwashing_risk),
    evidence: [],
  },
  events: [],
  posint: todo(ps.posint),
};

const methodology = {
  financialEngineVersion: "1.0.0",
  calculatedMetrics: ["CAPM expected return", "price-period realized return", "Altman Z X1-X5", "Altman zone", "RFin base"],
  inputSource: "Financials and Market sheets in the configured workbook",
  realizedReturnPeriod: "price_start_next to price_end_next; use only as the workbook's stated period, not a full historical series",
  riskFree: { value: params.rf, source: readTable(wb, "Params").find((r) => r.key === "rf").source },
  equityRiskPremium: { value: params.erp, source: readTable(wb, "Params").find((r) => r.key === "erp").source },
  capm: params.capm_formula,
  altman: params.altman_formula,
  altmanZones: `Safe > ${vi(params.z_safe)} · Grey ${vi(params.z_distress)}–${vi(params.z_safe)} · Distress < ${vi(params.z_distress)}`,
  posintTiers: `Mức 1 = +${vi(params.posint_l1.toFixed(2))} · Mức 2 = +${vi(params.posint_l2.toFixed(2))} · Mức 3 ≥ +${vi(params.posint_l3.toFixed(2))}`,
  dataSource: params.data_source,
};

// Chỉ tiêu ESG công bố (sheet ESG_ChiTieu): Bool = có / không thực hành, Num = số liệu định lượng; ô trống = chưa công bố.
const esgRowsRaw = readTable(wb, "ESG_ChiTieu");
const esgTickers = Object.keys(esgRowsRaw[0] ?? {}).filter((k) => /^[A-Z]{2,4}$/.test(k));
const esgIndicators = {
  year: 2024,
  source: "Báo cáo phát triển bền vững / thường niên 2024 – AQ_Input.xlsx (sheet ESG)",
  indicators: esgRowsRaw.map((r) => ({
    code: r.code,
    pillar: r.code.slice(0, 1),
    name: r.name,
    type: r.type === "Bool" ? "bool" : "number",
    // (+) cao hơn là tốt, (-) thấp hơn là tốt.
    polarity: String(r.pol).includes("-") ? -1 : 1,
    // use = 0: chỉ tiêu bị loại khỏi chấm điểm (thiên vị quy mô) – chỉ để tham khảo.
    use: r.use === 1,
    // Số tuyệt đối phụ thuộc quy mô DN (rule "Chia DT" hoặc bị loại) → không xếp hạng trực tiếp giữa các DN.
    sizeDependent: r.rule === "Chia DT" || r.use !== 1,
    ...(r.unit ? { unit: r.unit } : {}),
  })),
  values: Object.fromEntries(
    esgTickers.map((t) => [t, Object.fromEntries(esgRowsRaw.map((r) => [r.code, typeof r[t] === "number" ? r[t] : null]))])
  ),
};

const files = {
  "companies.json": companies,
  "zscore.json": zscore,
  "esg.json": esg,
  "osint_events.json": osint,
  "portfolio.json": portfolio,
  "scenarios.json": scenarios,
  "private_sample.json": privateSample,
  "methodology.json": methodology,
  "esg_indicators.json": esgIndicators,
  "universe_pending.json": pendingUniverse,
};
mkdirSync(OUT, { recursive: true });
for (const [name, data] of Object.entries(files)) writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + "\n");
console.log(`✓ ${Object.keys(files).length} file JSON ← ${SRC.replace(ROOT + "/", "")}`);
