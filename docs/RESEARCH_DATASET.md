# Bộ dữ liệu nghiên cứu tài chính — contract đề xuất

## 1. Mục tiêu và điều kiện để gọi là dữ liệu nghiên cứu

Mỗi dữ liệu đầu vào phải trả lời được: **mã nào, giá trị nào, kỳ nào, đơn vị nào, nguồn nào, tải lúc nào, báo cáo gốc nào, phiên bản nào, được kiểm tra ra sao**. Không thể cam kết “mọi con số tuyệt đối chính xác”; mục tiêu là truy xuất nguồn, phát hiện mâu thuẫn, giữ lịch sử sửa đổi và chỉ công bố dữ liệu qua quality gate.

Không dùng LLM làm nguồn sự thật hay tính phép toán danh mục. LLM chỉ đề xuất trích xuất/chuẩn hóa từ nguồn; code xác thực schema, đơn vị, kỳ, phép đối chiếu kế toán và tính chỉ số.

## 2. Nguồn dữ liệu theo mức ưu tiên

### Báo cáo tài chính và sự kiện doanh nghiệp

1. SSC disclosure portal: lấy thông báo và tệp đính kèm theo mã, loại báo cáo, kỳ và ngày công bố ([cổng công bố thông tin SSC](https://congbothongtin.ssc.gov.vn/)).
2. HOSE/HNX và website quan hệ nhà đầu tư của chính doanh nghiệp: dùng bản báo cáo gốc, ưu tiên báo cáo hợp nhất đã kiểm toán cho năm và đã soát xét cho kỳ giữa niên độ. HOSE hướng dẫn nghĩa vụ công bố báo cáo năm, bán niên và quý cho tổ chức niêm yết ([tài liệu HOSE](https://staticfile.hsx.vn/Uploads/UploadDocuments/2453338/NY_Gioi%20thieu%20ve%20CKNY%20va%20quy%20dinh%20ve%20NY%20CBTT_T2.2026.pdf)); quy định công bố thông tin cần được kiểm tra theo văn bản đang có hiệu lực ([Thông tư 96/2020/TT-BTC](https://vanban.chinhphu.vn/default.aspx?docid=201902&pageid=27160)).
3. Trang tổng hợp tin/báo chí chỉ dùng discovery cho OSINT; không ghi nhận số BCTC là fact chính thức nếu chưa đối chiếu báo cáo gốc.

### Giá và corporate actions

- Ưu tiên market-data API có quyền sử dụng. SSI FastConnect công bố các API REST/WebSocket cho dữ liệu thị trường và lịch sử OHLC; truy vấn daily history bắt đầu từ ngày giao dịch đầu của chứng khoán theo mô tả dịch vụ ([SSI Market Data](https://developers.ssi.com.vn/en/docs/faq/market-data), [SSI API overview](https://developers.ssi.com.vn/en/docs/api-reference)). Trước khi tích hợp cần đăng ký/được cấp quyền; hướng dẫn yêu cầu API key, secret và tuân thủ quota/terms ([đăng ký](https://developers.ssi.com.vn/en/docs/getting-started/registration), [terms/rate limit](https://developers.ssi.com.vn/en/docs/getting-started/terms-and-environments)). Tình trạng phí/điều kiện có thể thay đổi; kiểm tra trực tiếp tại ngày tích hợp.
- Nếu lấy giá từ HOSE/HNX hoặc đơn vị dữ liệu khác, xác nhận quyền tải/lưu/trình chiếu/redistribute. Không coi việc trang web xem được là quyền crawl hàng loạt.
- Thu thập corporate actions (cổ tức tiền/cổ phiếu, chia tách, thưởng, phát hành quyền mua, delisting) riêng. Nếu nguồn không cung cấp adjusted close đáng tin cậy, tính total-return series trong code từ close + corporate actions và kiểm tra bằng ví dụ thủ công.

## 3. Storage layers

Giữ workbook hiện tại làm `demo-v1` snapshot, không ghi đè dữ liệu nghiên cứu tự động. Pipeline mới tách ba lớp:

1. **Raw:** nguyên bản PDF/CSV/JSON đã thu thập, source URL, fetched_at, HTTP metadata, content hash, terms/permission note. PDF private chỉ lưu theo consent/policy riêng.
2. **Normalized:** dữ liệu đã ánh xạ schema, nhưng vẫn giữ raw value, original unit/label, page/row, report period, consolidation, audit status, restatement và reviewer state.
3. **Derived:** returns, ratios, covariance, optimized weights, backtest metrics; mỗi record giữ input IDs/hash, code/methodology version, parameters và run timestamp.

Prototype: `data/research/raw/` và `data/research/normalized/` dạng Parquet/JSONL theo version; DuckDB phù hợp cho phân tích local. Khi có user/auth/approval nhiều người, chuyển authoritative records sang Postgres; object storage giữ raw docs theo retention. Không commit khóa hay báo cáo nội bộ.

### SSI daily OHLCV adapter (first ingestion slice)

Backend đã có client read-only SSI FastConnect V3 (`backend/app/services/market_data/ssi.py`) và CLI ghi raw JSONL (`backend/app/ingestion/ssi_history.py`). Nó yêu cầu `SSI_API_KEY`/`SSI_API_SECRET`, gọi token + paginated `/api/v3/data/ohlc`, giữ giá trị nguồn và nhãn raw/unadjusted. Chưa được gọi bằng tài khoản của bạn hoặc dùng để backtest cho tới khi quyền API, đơn vị và corporate actions được xác nhận.

```bash
# Đưa credentials SSI Market Data vào backend/.env ở máy bạn; không gửi key qua chat/Git.
PYTHONPATH=backend backend/.venv/bin/python -m app.ingestion.ssi_history \
  --symbols VNM SAB MCM SBT --from-date 2021-01-01 --to-date 2026-11-19
```

SSI V3 có daily OHLCV và corporate-action API, nhưng adapter hiện mới lấy OHLCV; adjustment/total return là quality gate kế tiếp.

## 4. Dataset schema

### `instrument_master`

`instrument_id`, `ticker`, `isin`, `exchange`, `company_name`, `sector_code`, `currency`, `listed_from`, `listed_to`, `source_id`, `valid_from`, `valid_to`.

### `daily_prices`

Một row cho một mã/một phiên:

`instrument_id`, `trade_date`, `open`, `high`, `low`, `close`, `volume`, `value_vnd`, `adjustment_factor`, `total_return_close`, `currency`, `source_id`, `fetched_at`, `quality_status`.

Unique key: (`instrument_id`, `trade_date`, `source_id`, `vendor_revision`). Không trộn close chưa điều chỉnh với adjusted close; ghi rõ đơn vị giá API (đồng/nghìn đồng) và volume (cổ phiếu/lô).

### `corporate_actions`

`instrument_id`, `ex_date`, `record_date`, `action_type`, `cash_per_share`, `share_ratio`, `subscription_price`, `source_id`, `evidence_url`, `status`.

### `financial_facts` (long-form, không ép một layout Excel)

`instrument_id`, `fiscal_year`, `fiscal_period`, `period_start`, `period_end`, `statement_type` (`balance_sheet|income|cash_flow|note`), `consolidation` (`consolidated|separate`), `metric_code`, `reported_label`, `raw_value`, `normalized_value`, `unit`, `currency`, `is_audited`, `audit_opinion`, `is_restatement`, `published_at`, `source_id`, `document_hash`, `page`, `evidence_quote`, `extraction_method`, `review_status`, `reviewer_id`.

`normalized_value` chỉ tạo khi đổi đơn vị minh bạch được; raw value luôn giữ. Cùng kỳ nhưng khác bản công bố/restatement thì giữ cả hai phiên bản; không ghi đè.

### `source_registry` và `ingestion_runs`

`source_id`, `publisher`, `source_type`, `officiality`, `terms_url`, `license_note`, `url`, `retrieved_at`, `content_hash`, `parser_version`, `model_id`, `run_status`, `error`, `rows_seen`, `rows_accepted`, `rows_rejected`.

### `derived_metric_runs`

`run_id`, `instrument_id`, `metric_code`, `period_end`, `value`, `unit`, `formula_version`, `input_fact_ids`, `input_price_range`, `source_ids`, `quality_flags`, `created_at`.

## 5. Quality gates trước khi dữ liệu vào UI/optimizer

- Ticker, sàn, đơn vị, ngày giao dịch và kỳ báo cáo phải hợp lệ; không tự suy ra năm tài chính từ ngày upload nếu báo cáo ghi kỳ khác.
- Financials: tổng tài sản ≈ nợ phải trả + vốn chủ sở hữu trong tolerance có cấu hình; tổng dòng tiền có đối chiếu; kiểm tra riêng consolidated/separate, audited/reviewed, restatement.
- Price series: unique trading dates, no unexplained gaps/duplicates, OHLC bounds hợp lệ, currency/scale nhất quán, corporate actions đã áp dụng đúng.
- Cross-check: so dữ liệu lấy từ API với một số ngày/mã ở nguồn chính thức; so BCTC trích xuất với PDF gốc. Mâu thuẫn chuyển `needs_review`, không chọn “giá trị có vẻ hợp lý”.
- LLM: không được đặt source URL, trang, kỳ hoặc unit. Chỉ lấy extraction khi literal quote tồn tại trong page text và numeric value parse từ quote khớp candidate; OCR confidence thấp/chênh cột thì cần reviewer.
- `analysis_ready` chỉ khi fields bắt buộc vượt quality gates. Thiếu dữ liệu thì trạng thái/coverage rõ, không bù mock.

## 6. Nghiên cứu danh mục

### Chuẩn hóa return

Từ total-return adjusted daily close:

```text
r(i,t) = P_adj(i,t) / P_adj(i,t-1) - 1
R_p(t) = Σ_i w(i,t-1) × r(i,t)
```

Giữ ngày giao dịch chung cho các mã; công bố cách xử lý missing/illiquid sessions. Không tính một cặp giá thành “backtest”.

### Estimation và tối ưu

```text
μ = annualized expected-return vector (forecast inputs/versioned)
Σ = annualized covariance matrix from aligned training returns
Portfolio variance = wᵀΣw
Portfolio volatility = √(wᵀΣw)
Sharpe = (R_p - R_f) / σ_p
```

Baseline phải có ít nhất equal-weight và constrained minimum-variance/Markowitz. ESG-aware dùng cùng μ, Σ, data window và constraints; chỉ thêm ESG term khi ESG score/coverage/version comparable giữa các mã. Risk penalty POSINT chỉ lấy sự kiện đã được duyệt, không dùng bài báo thô.

Constraints: `Σw=1`, long-only theo chính sách, max/min position, turnover/liquidity limits, optional sector caps; kiểm tra feasibility trước solve và constraints sau solve độc lập.

### Backtest không nhìn trước

- Ví dụ cấu hình khởi đầu cần người dùng phê duyệt: 5 năm dữ liệu daily, rolling 252 phiên estimate, quarterly rebalance, trade ở phiên kế tiếp, benchmark VN-Index, phí/slippage cấu hình rõ. Không fit và đánh giá cùng một giai đoạn.
- Tại mỗi rebalance `t`, dùng chỉ dữ liệu có timestamp ≤ t; áp weights trong kỳ kế tiếp. Báo khoảng nghiên cứu, số lần rebalance, turnover, fee model và missing data.
- Báo cáo tối thiểu: CAGR, annual volatility, Sharpe/Sortino với Rf cùng kỳ, max drawdown, turnover, cumulative return, tracking error/benchmark, worst period. Giữ chart giá trị danh mục và drawdown.
- Dùng walk-forward/out-of-sample; kiểm tra survivorship, delisting, look-ahead, revised statements, parameter search bias. Tách backtest strategy khỏi CAPM expected return.

## 7. Workbook hiện tại đang ở bước nào?

`data/QuantumRegTech_Data.xlsx` hiện có 4 mã (VNM/SAB/MCM/SBT). README của workbook ghi rõ nó là **nguồn đầu vào thủ công**, không phải crawler. Financials có BCTC hợp nhất 2024 từ file AQ_Input v3 (file gốc không nằm trong repo); Market chỉ có beta và hai mức giá đầu/cuối không có timestamp; ESG score, weights, OSINT events và summary là dữ liệu được nhập từ Phụ lục B/AQ_Input. Excel giữ một số formula như CAPM, Z, weighted summary.

`npm run data` đọc workbook rồi `scripts/build-data.mjs` tái tính CAPM, one-period price return, listed Altman Z/X1–X5/RFin base và weighted summary, đối chiếu với cached workbook formula, rồi sinh `data/generated/*.json`. Nó tự chạy trước `dev/build/test`. Đây là **automation từ workbook → validation/formula → JSON/UI**, chưa tự động từ internet → source filing → cleaned financial dataset.

## 8. Tự động hóa ingestion mục tiêu

```text
Scheduler
  → discover official filing/API updates
  → download + hash + immutable raw archive
  → parse statements/market bars
  → LLM propose fields (financial docs only after consent/policy)
  → deterministic quote/unit/period/accounting checks
  → reviewer queue for conflicts/low confidence
  → publish versioned normalized facts
  → recalculate ratios/portfolio/backtest
  → freshness/quality dashboard
```

Lịch chạy có thể tự động hóa; “tự động đúng” không thể đảm bảo chỉ bằng crawl/LLM. Tài liệu lỗi, báo cáo điều chỉnh, trang web đổi cấu trúc và corporate actions cần retry, monitoring, provenance và người duyệt ở các trường bất thường.
