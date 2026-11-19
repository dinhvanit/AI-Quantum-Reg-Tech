# Lộ trình triển khai QuantumRegTech

## Trạng thái hiện tại

Prototype có tra cứu bốn hồ sơ đầy đủ từ workbook, tính lại CAPM/Altman/RFin base, OSINT live với LangGraph/LangChain, Neo4j read-only, OCR/Rules PDF và PDF LLM extraction opt-in có kiểm tra quote/trang/giá trị. Giá thị trường và ESG vẫn lấy từ workbook. Danh mục dùng hai scenario dựng sẵn; duyệt OSINT và extraction chưa lưu bền vững.

## Ưu tiên theo thứ tự

### P0 — Ổn định demo AI end-to-end

- Hiện provider, lỗi HTTP/quota, thời gian và context-limit rõ; thêm retry/backoff có giới hạn.
- Cấu hình provider riêng cho OSINT và Document Agent để quota một luồng không ảnh hưởng luồng kia.
- Tạo bộ PDF giả định: template chuẩn, đổi layout/nhãn, scan/OCR lỗi, thiếu kỳ, nhiều cột năm và số âm. Đo field coverage, evidence match, sai số với đáp án chuẩn và fallback.
- UI phân biệt `AI live`, `AI skipped`, `AI unavailable` và Rules fallback; không nhập nhằng warning Rules với lỗi model.

**Hoàn tất khi:** có thể demo file chuẩn và file đổi layout nhiều lần; mỗi số truy được tới nguồn; khi provider lỗi vẫn giữ baseline và báo đúng nguyên nhân.

### P1 — Reviewer workflow và audit tối thiểu

- SQLite trước, sau đó Postgres khi triển khai: lưu assessment, field candidate, evidence reference, reviewer correction/approval, model/prompt/data version.
- Cho người dùng chấp nhận/sửa/từ chối từng field; không tự áp dụng proposal vào hồ sơ public.
- Chính sách retention rõ; không lưu API key hoặc raw private document text trong log.

**Hoàn tất khi:** mở lại assessment biết ai duyệt/sửa trường nào và dựa trên tài liệu/version nào.

### P2 — Portfolio và financial engine có thể nghiên cứu

- Nạp chuỗi giá có ngày, nguồn và xử lý corporate action; không chỉ một cặp giá.
- SSI FastConnect V3 read-only client/CLI đã được tạo làm adapter; chưa gọi vì workspace chưa có credentials/entitlement. Chuỗi raw chưa được điều chỉnh dividend/split nên chưa dùng cho returns.
- Tối ưu từ expected returns/covariance với constraints; so Baseline và ESG-aware trên cùng dữ liệu.
- Walk-forward/out-of-sample, phí/slippage, turnover, drawdown, benchmark và sensitivity; workbook scenario giữ vai trò benchmark demo.

**Hoàn tất khi:** đổi dữ liệu/constraints chạy nghiệm mới tái lập được, có backtest tách giai đoạn và báo cáo so sánh.

### P3 — Mở rộng dữ liệu mã cổ phiếu

- Chọn market/financial/ESG sources; ETL có provenance/as-of/fiscal period và kiểm tra chất lượng.
- Chỉ chuyển ticker sang `analysis_ready` khi đầu vào bắt buộc đầy đủ.
- Theo dõi freshness, lỗi cập nhật và quyền sử dụng nguồn.

### P4 — Graph và retrieval khi corpus đủ lớn

- Neo4j: import entity/event/article có provenance, dedupe và review; agent chỉ dùng allow-listed graph queries.
- Bắt đầu với SQLite/full-text; thêm Qdrant khi thật sự cần semantic retrieval qua nhiều báo cáo dài.
- RAG phải trả lời kèm citation page/chunk/source; đo retrieval trước khi dùng cho quyết định tín nhiệm.

## Nên làm ngay

Ưu tiên P0 rồi P1. Chưa cần thêm Qdrant hoặc Scrapy cho demo hiện tại. Chỉ seed Neo4j khi cần minh họa graph; không trình bày graph rỗng như dữ liệu quan hệ thật. Chưa gọi danh mục là optimizer/backtest nghiên cứu cho tới khi hoàn thành P2.
