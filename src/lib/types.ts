// Types khớp schema trong docs/DATA.md (= hợp đồng API Vòng 2).
// Ô chưa có số liệu được giữ nguyên là "TODO" và hiển thị "—" trên UI.

export type Todo<T> = T | "TODO";

export type Ticker = string;

export interface Company {
  ticker: Ticker;
  name: string;
  exchange: Todo<string>;
  subsector: string;
  listed: boolean;
  beta: number;
  /** CAPM Ri tính từ dữ liệu năm dataYear. */
  expectedReturn: number;
  /** Lợi suất giá điều chỉnh trong năm forecastYear (lịch sử, không phải dự báo). */
  realizedReturn: number;
  dataYear: number;
  forecastYear: number;
}

export type AltmanZone = "safe" | "grey" | "distress";

export interface ZScore {
  model: "Z" | "Z'";
  x1: Todo<number>;
  x2: Todo<number>;
  x3: Todo<number>;
  x4: Todo<number>;
  x5: Todo<number>;
  z: number;
  zone: AltmanZone;
  rfinBase: number;
  fiscalYear: number;
}

export type GreenwashingRisk = "low" | "medium" | "high";

export interface EsgEvidence {
  claim: string;
  claimSource: string;
  counter: string;
  counterSource: string;
  counterUrl: string;
  contradiction: number;
  taxonomyRef: string;
}

export interface Esg {
  esgScore: number;
  pillars: {
    E: Todo<number>;
    S: Todo<number>;
    G: Todo<number>;
    transparency: Todo<number>;
    compliance: Todo<number>;
  };
  greenwashingRisk: Todo<GreenwashingRisk>;
  evidence: EsgEvidence[];
}

export type OsintType = "tax" | "environment" | "securities" | "media" | "other";
export type OsintSeverity = 1 | 2 | 3;

export interface OsintEvent {
  id: string;
  ticker: Ticker;
  /** Năm ra quyết định (YYYY). */
  date: string;
  dateNote?: string | null;
  decisionYear?: number;
  /** Năm dự báo bị tính phạt (= decisionYear + 1). */
  forecastYear?: number;
  type: OsintType;
  severity: OsintSeverity;
  penalty: number;
  title: string;
  source: string;
  url: string;
  active: boolean;
}

/** Kết quả Cổng 2 (POST /api/v1/private/analyze) – dạng Cổng 1 + deletedAt. */
export interface PrivateAnalysis {
  company: { name: string; subsector: Todo<string>; listed: false; fiscalYear: Todo<number> };
  zscore: Omit<ZScore, "z" | "zone" | "rfinBase" | "fiscalYear"> & {
    z: Todo<number>;
    zone: Todo<AltmanZone>;
    rfinBase: Todo<number>;
  };
  esg: Omit<Esg, "esgScore"> & { esgScore: Todo<number> };
  events: OsintEvent[];
  posint: Todo<number>;
  /** "document" = số liệu trích từ tệp tải lên. */
  source: "document";
  /** Chi tiết trích xuất – chỉ có khi source = "document". */
  extraction?: DocumentExtraction;
  /** ISO timestamp lúc tệp gốc bị xoá (Zero-Retention). */
  deletedAt: string;
}

/** 9 chỉ tiêu BCTC dùng cho Z': TSNH, TTS, Nợ NH, Nợ phải trả, VCSH, LNST chưa PP, DT thuần, LNTT, CP lãi vay. */
export type FinKey = "CA" | "TA" | "CL" | "TL" | "EQ" | "RE" | "Revenue" | "PBT" | "Interest";

export interface ExtractedField {
  key: FinKey;
  label: string;
  /** Mã số chỉ tiêu trên mẫu BCTC (Thông tư 200). */
  code: string;
  value: number | null;
  page?: number;
  source?: "text" | "ocr";
  /** Dòng gốc chứa số liệu – để người dùng đối chiếu. */
  line?: string;
  method?: "rules" | "llm";
  confidence?: number;
  rulesValue?: number | null;
}

export interface DocumentExtraction {
  fileType: "pdf";
  pages: number;
  processedPages: number;
  /** Các trang phải OCR (trang ảnh scan). */
  ocrPages: number[];
  unit?: string;
  fields: ExtractedField[];
  warnings: string[];
  ai?: { mode: "live" | "unavailable" | "skipped"; provider?: string; model?: string; validatedCount?: number; proposalCount?: number; workflow?: string[]; warning?: string };
}

export type PrivateStage = "ocr" | "normalize" | "ai" | "zscore" | "osint";

/** Tham số chung – sheet Params của workbook (docs/DATA.md). */
export interface Methodology {
  dataYear: number;
  forecastYear: number;
  riskFree: { value: number; source: string };
  equityRiskPremium: { value: number; source: string };
  capm: string;
  altman: string;
  altmanZones: string;
  posintTiers: string;
  /** Params: mức vi phạm 0–3 → P_OSINT. */
  penaltyTable: Record<string, number>;
  dataSource: string;
}

/** Chỉ tiêu ESG công bố – sheet ESG_ChiTieu (docs/DATA.md §5). */
export type EsgPillar = "E" | "S" | "G";

export interface EsgIndicator {
  code: string;
  pillar: EsgPillar;
  name: string;
  /** "bool": có / không thực hành; "number": số liệu định lượng. */
  type: "bool" | "number";
  /** 1: cao hơn là tốt; -1: thấp hơn là tốt. */
  polarity: 1 | -1;
  /** false: chỉ tiêu bị loại khỏi chấm điểm (thiên vị quy mô) – chỉ để tham khảo. */
  use: boolean;
  /** Số tuyệt đối phụ thuộc quy mô (tổng nước, năng lượng, ngân sách…) → không xếp hạng trực tiếp. */
  sizeDependent: boolean;
  unit?: string;
}

export interface EsgIndicatorSet {
  year: number;
  source: string;
  indicators: EsgIndicator[];
  /** values[ticker][code]: số (bool = 0/1) hoặc null nếu chưa công bố. */
  values: Record<Ticker, Record<string, number | null>>;
}
