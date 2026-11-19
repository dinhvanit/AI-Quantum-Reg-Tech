# Hướng dẫn sử dụng QuantumRegTech

## 1. Khởi động ứng dụng

Ở thư mục gốc repo, sinh dữ liệu workbook và chạy hai service ở hai terminal:

```bash
npm run data
backend/.venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload --reload-dir backend/app
```

Nếu đây là lần chạy đầu và chưa có môi trường Python: `python3 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements.txt`.

```bash
npm run dev
```

Mở `http://localhost:3000`. Kiểm tra FastAPI tại `http://127.0.0.1:8000/health`, universe qua `http://localhost:3000/api/universe?limit=200`, Neo4j qua `http://127.0.0.1:8000/api/v1/graph/status`. `ready_empty` nghĩa là DB đang kết nối nhưng chưa có node.

## 2. Tra cứu và chọn cổ phiếu

1. Mở **Danh sách cổ phiếu** (`/stocks`), tìm theo ticker/tên/ngành và chọn các mã có trạng thái `analysis_ready`.
2. Preset VNM, SAB, MCM, SBT giúp tái hiện bộ demo hiện tại. Nó không phải giới hạn kiến trúc; workbook mới có dữ liệu phân tích đầy đủ cho bốn mã này.
3. Thử đăng ký một ticker ngoài bộ hiện tại bằng nguồn tham chiếu. Ticker mới xuất hiện là `pending_data`; cần nhập và kiểm tra dữ liệu nguồn trước khi dùng hồ sơ hoặc danh mục.
4. Mở một mã, ví dụ `/company/VNM`, để xem CAPM, lợi nhuận giá trong workbook, Altman Z, ESG và rủi ro OSINT. Ô `—` có nghĩa là chưa có đầu vào được chấp nhận.

## 3. Chạy OSINT và đọc kết quả

1. Trong trang công ty, nhấn **Run OSINT scan**.
2. Theo dõi trạng thái provider và luồng LangGraph: `discover → graph_enrichment → extract → classify → validate`.
3. Mở URL nguồn, đọc trích đoạn, rồi xem đề xuất AI và quote. Quote chỉ được chấp nhận nếu khớp đoạn nguồn; đề xuất vẫn là candidate chờ người đọc.
4. Nút duyệt chỉ preview POSINT/RFin trong phiên trình duyệt. Nó chưa ghi chính thức vào hồ sơ hoặc audit log.
5. Neo4j trạng thái `ready_empty` không phải lỗi: DB đang rỗng, do đó chưa có company/event node để ghép. Dữ liệu workbook được đưa vào graph chỉ khi operator chủ động chạy lệnh write-gated ở [backend README](../backend/README.md).

## 4. Dùng trang Danh mục

1. Chọn mã ở `/stocks`; mở **Danh mục** (`/portfolio`).
2. Preset bốn mã đang thỏa `15% ≤ wᵢ ≤ 55%` và tổng trọng số bằng 100%. Tổng vốn thay đổi số tiền phân bổ, không đổi tỷ trọng.
3. Mặc định α=β=γ=δ=1 chọn scenario ESG-aware trong workbook. Đưa γ=δ về 0, giữ α=β=1, để chọn scenario Baseline. β ở panel này là trọng số rủi ro của hàm mục tiêu, khác β CAPM riêng của từng cổ phiếu. Workbook hiện có đúng hai scenario; giá trị slider trung gian chọn scenario gần nhất, không tạo nghiệm liên tục.
4. Đọc bảng tỷ trọng và hai KPI cho scenario đang chọn. **Lợi nhuận kỳ vọng** là tổng có trọng số từ CAPM. **Return lịch sử** là tổng có trọng số của `(giá cuối / giá đầu) - 1` lấy từ workbook.
5. Bảng so sánh dùng trọng số từ workbook; build script tính lại return có trọng số rồi đối chiếu với summary Excel. COBYLA được ghi trong dữ liệu nhưng giao diện không gọi solver. QAOA chưa chạy; tab **Lõi Lượng tử** hiện là phần trình bày trạng thái/matrix TODO.

## 5. Cách diễn giải số Baseline và ESG-aware hiện tại

| Chỉ số | Baseline | ESG-aware | Chênh lệch |
|---|---:|---:|---:|
| CAPM kỳ vọng | 9,31% | 8,50% | Baseline cao hơn 0,81 điểm % |
| Return lịch sử trong workbook | 11,86% | 15,96% | ESG-aware cao hơn 4,11 điểm % |

Hai hàng trả lời hai câu hỏi khác nhau: CAPM là mức kỳ vọng theo β và premium; return lịch sử là kết quả giữa hai mức giá được nhập trong workbook. Vì input hiện không có ngày cho hai mức giá, chưa xác định được chính xác độ dài kỳ và chưa thể kiểm tra annualization hay đồng bộ kỳ đo với CAPM.

Phần tăng 4,11 điểm % trong bộ số hiện tại đến đúng từ việc chuyển 35,9 điểm % tỷ trọng từ SAB sang VNM; MCM và SBT giữ nguyên tỷ trọng. SBT tăng 114,9% trong kỳ được ghi nhận, đóng góp khoảng 17,23 điểm % vào cả hai danh mục. Đây là mô tả phép tính trên sample hiện có, chưa chứng minh ESG-aware sẽ thắng trong các kỳ khác.

Kết quả không làm nghiên cứu “vô giá trị”. Nó gợi ý một giả thuyết để kiểm định tiếp. Nhưng hiện chưa đủ cơ sở gọi là bằng chứng hiệu quả: chưa có chuỗi thời gian nhiều kỳ, ngày giá, walk-forward/out-of-sample, benchmark, phí/slippage, rebalancing, drawdown hoặc sai số thống kê. Việc thử nhiều tham số rồi chọn kết quả đẹp cũng có thể gây backtest overfitting; xem [Bailey et al., The Probability of Backtest Overfitting](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2326253).

## 6. Nạp PDF thẩm định nội bộ

1. Mở `/private`, chọn PDF mẫu `tests/fixtures/bctc-mau-qrt-2024.pdf` (bản scan: `-scan.pdf`) hoặc BCTC bạn được phép sử dụng.
2. PDF không cần đúng pixel/layout của một template. OCR/đọc lớp chữ chạy trên trình duyệt; parser quy tắc nhận diện mã phổ biến để làm baseline.
3. Muốn demo AI Agent, bật checkbox đồng ý gửi **text OCR/trích xuất** tới LLM provider. PDF gốc không gửi. LangGraph chạy `llm_extract → validate_evidence`; mỗi giá trị AI chỉ được dùng khi quote khớp văn bản và trang nguồn tồn tại. Bảng kết quả chỉ rõ `LLM` hay `Rules`, và cảnh báo nếu khác parser.
4. Chỉ dùng file giả định hoặc file bạn được phép chia sẻ với nhà cung cấp LLM. Kết quả chỉ là trích xuất cần review; chưa tự nhập vào hồ sơ niêm yết và chưa lưu bền vững.

## 7. Xem và xuất báo cáo

Mở `/report/VNM` hoặc thay ticker bằng mã analysis-ready. Kiểm tra nguồn, kỳ dữ liệu, chỉ số và các ô thiếu; chọn **In / Lưu PDF** để xuất bản báo cáo trình duyệt.

## 8. Những điểm cần nói rõ trong buổi demo

- Giá và báo cáo tài chính là dữ liệu workbook; không phải feed thị trường realtime.
- Portfolio hiện trình diễn hai scenario đã nạp sẵn, không chạy Markowitz/COBYLA mới theo slider.
- Return lịch sử là phép tính trên một cặp giá, không phải backtest rolling/out-of-sample.
- OSINT và LLM tạo candidate có nguồn; không xác nhận vi phạm và chưa ghi POSINT chính thức.
- PDF OCR/parser mặc định chạy cục bộ; có thể opt-in gửi text đã trích xuất tới LangGraph/LLM để đọc nhãn không theo một template cứng. PDF gốc không gửi; kết quả cần quote/trang khớp và người dùng rà soát. RAG chưa có.
