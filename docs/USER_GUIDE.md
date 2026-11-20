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
2. Bộ dữ liệu hiện có 9 mã analysis-ready: IDP, KDC, MCH, MCM, PAN, QNS, SAB, SBT, VNM. Mã đăng ký mới sẽ ở trạng thái `pending_data` tới khi bổ sung dữ liệu có nguồn.
3. Thử đăng ký một ticker ngoài bộ hiện tại bằng nguồn tham chiếu. Ticker mới xuất hiện là `pending_data`; cần nhập và kiểm tra dữ liệu nguồn trước khi dùng hồ sơ hoặc danh mục.
4. Mở một mã, ví dụ `/company/PAN`, để xem CAPM, lợi suất giá lịch sử, Altman Z, mức độ công bố ESG và rủi ro OSINT. Ô `—` có nghĩa là chưa có đầu vào được chấp nhận.

## 3. Chạy OSINT và đọc kết quả

1. Trong trang công ty hoặc danh mục, chọn khung 6/12/24/36/60 tháng rồi nhấn **Quét sự kiện**.
2. Theo dõi trạng thái provider và luồng LangGraph: `discover → graph_enrichment → extract → classify → validate`.
3. Mở URL nguồn, đọc trích đoạn, rồi xem đề xuất AI và quote. Quote chỉ được chấp nhận nếu khớp đoạn nguồn; đề xuất vẫn là candidate chờ người đọc.
4. Nút duyệt chỉ preview POSINT/RFin trong phiên trình duyệt. Nó chưa ghi chính thức vào hồ sơ hoặc audit log.
5. Neo4j trạng thái `ready_empty` không phải lỗi: DB đang rỗng, do đó chưa có company/event node để ghép. Dữ liệu workbook được đưa vào graph chỉ khi operator chủ động chạy lệnh write-gated ở [backend README](../backend/README.md).

## 4. Dùng trang Danh mục

1. Chọn mã ở `/stocks`; mở **Danh mục** (`/portfolio`).
2. Chọn mã, tổng vốn và mức ưu tiên. Giao diện tính tỷ trọng theo thứ hạng chuẩn hoá và giới hạn từng mã; đây là gợi ý phân bổ, không phải nghiệm Markowitz.
3. Đọc lợi suất kỳ vọng CAPM và lợi suất giá lịch sử riêng biệt. Con số biến động tham chiếu áp dụng lợi suất lịch sử vào tỷ trọng hiện tại; không phải lợi nhuận đảm bảo hay dự báo.
4. Chưa có chuỗi giá tháng/ngày để lập covariance; web chưa chạy COBYLA/QUBO/QAOA. Không trình bày tỷ trọng hiện tại là kết quả solver lượng tử.

## 5. Cách diễn giải lợi suất

CAPM là mức lợi suất kỳ vọng tính theo β và phần bù rủi ro; lợi suất giá lịch sử là kết quả của kỳ giá trong workbook. Con số biến động tham chiếu chỉ áp lợi suất lịch sử vào tỷ trọng hiện tại. Một kỳ dữ liệu không chứng minh mô hình sinh lời tốt hơn, và không nên gọi là backtest ngoài mẫu.

## 6. Nạp PDF thẩm định nội bộ

1. Mở `/private`, chọn PDF mẫu `tests/fixtures/bctc-mau-qrt-2024.pdf` (bản scan: `-scan.pdf`) hoặc BCTC bạn được phép sử dụng.
2. PDF không cần đúng pixel/layout của một template. OCR/đọc lớp chữ chạy trên trình duyệt; parser quy tắc nhận diện mã phổ biến để làm baseline.
3. Muốn demo AI Agent, bật checkbox đồng ý gửi **text OCR/trích xuất** tới LLM provider. PDF gốc không gửi. LangGraph chạy `llm_extract → validate_evidence`; mỗi giá trị AI chỉ được dùng khi quote khớp văn bản và trang nguồn tồn tại. Bảng kết quả chỉ rõ `LLM` hay `Rules`, và cảnh báo nếu khác parser.
4. Chỉ dùng file giả định hoặc file bạn được phép chia sẻ với nhà cung cấp LLM. Kết quả chỉ là trích xuất cần review; chưa tự nhập vào hồ sơ niêm yết và chưa lưu bền vững.

## 7. Xem và xuất báo cáo

Mở `/report/VNM` hoặc thay ticker bằng mã analysis-ready. Kiểm tra nguồn, kỳ dữ liệu, chỉ số và các ô thiếu; chọn **In / Lưu PDF** để xuất bản báo cáo trình duyệt.

## 8. Những điểm cần nói rõ trong buổi demo

- Giá và báo cáo tài chính là dữ liệu workbook; không phải feed thị trường realtime.
- Portfolio dùng phân bổ theo thứ hạng và mức ưu tiên; không chạy Markowitz/COBYLA/QUBO/QAOA.
- Return lịch sử là phép tính trên một cặp giá, không phải backtest rolling/out-of-sample.
- OSINT quét theo khung người dùng chọn đến hôm nay; kết quả mới là candidate cần người duyệt và chỉ áp dụng rủi ro trong phiên.
- ESGi là điểm phân vị công bố 32 chỉ tiêu trong nhóm hiện tại, không phải kết quả phát hiện tẩy xanh bằng NLP. Chưa có cặp bằng chứng đã kiểm chứng nên rủi ro tẩy xanh để "chưa đánh giá".
- PDF OCR/parser mặc định chạy cục bộ; có thể opt-in gửi text đã trích xuất tới LangGraph/LLM để đọc nhãn không theo một template cứng. PDF gốc không gửi; kết quả cần quote/trang khớp và người dùng rà soát. RAG chưa có.
