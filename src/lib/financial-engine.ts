export interface FinancialEngineRecord {
  dataYear: number;
  forecastYear: number;
  ticker: string;
  calculated: {
    altman: { x1: number; x2: number; x3: number; x4: number; x5: number; zScore: number; zone: string; rFinBase: number; rFinTotal: number };
    osint: { penaltyLevel: number; penalty: number; events: { decisionYear: number; forecastYear: number; level: number; entity: string; summary: string | null; sourceUrl: string | null }[] };
    returns: { beta: number; capmExpected: number; adjustedPricePeriod: number };
    esg: { pillars: { E: number; S: number; G: number }; total: number };
  };
}

export interface FinancialEnginePayload {
  generatedAt: string;
  sourceWorkbook: string;
  periods: number[];
  tickers: string[];
  recordCount: number;
  reconciliation: { status: string; metricsPerRecord: number };
  optimizerReadiness: { ready: boolean; missing: string[]; note: string };
  records: FinancialEngineRecord[];
}

export async function getFinancialEngineData(dataYear?: number): Promise<FinancialEnginePayload> {
  const api = process.env.QUANTUM_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
  const query = dataYear ? `?data_year=${dataYear}` : "";
  const response = await fetch(`${api}/api/v1/financial-engine${query}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`API bộ máy tài chính trả về HTTP ${response.status}`);
  return response.json();
}
