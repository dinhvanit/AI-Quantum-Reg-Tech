# Runbook demo QuantumRegTech

Runbook này giúp người trình bày chạy đúng luồng và tránh mô tả nhầm dữ liệu demo thành dữ liệu live. Luồng chi tiết và tiêu chí kiểm duyệt nằm ở [USER_FLOWS.md](USER_FLOWS.md).

## 1. Trước buổi demo

### Chuẩn bị môi trường

Chạy từ thư mục gốc repo (cùng cấp `package.json`):

```bash
npm run data
backend/.venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload --reload-dir backend/app
```

Lệnh trên chạy FastAPI ở cổng 8000. Nếu chưa cài dependency, tạo môi trường một lần bằng `python3 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements.txt`.

Ở terminal thứ hai chạy `npm run dev`, rồi mở `http://localhost:3000`. Lệnh `predev` tự sinh JSON và chép tài nguyên OCR. Dùng Node.js 22 theo hướng dẫn repo.

`/api/universe` phải trả 200. Nếu trả 503, kiểm tra `http://127.0.0.1:8000/health`, `QUANTUM_API_URL` hoặc `NEXT_PUBLIC_API_URL`, sau đó khởi động lại Next.js nếu vừa sửa `.env.local`. Kiểm tra Neo4j tại `http://127.0.0.1:8000/api/v1/graph/status`; `ready_empty` nghĩa là DB kết nối được nhưng chưa có node.

### Chọn chế độ OSINT

- App thử GDELT cho một mã; chọn Firecrawl (`OSINT_SEARCH_PROVIDER=firecrawl`) hoặc Tavily (`OSINT_SEARCH_PROVIDER=tavily`) làm tìm kiếm mục tiêu.
- Jina Reader chỉ được gọi cho tối đa một kết quả headline chưa có trích đoạn. Gemini/Groq có thể đề xuất loại/mức sự kiện; đây không phải xác nhận vi phạm.
- `OSINT_SEARCH_PROVIDER=auto` ưu tiên Firecrawl nếu có key, nếu không sẽ dùng Tavily nếu có key; GDELT vẫn được thử cho tra cứu một mã.
- Để demo Tavily: thêm `TAVILY_API_KEY` vào `.env.local`, đặt `OSINT_SEARCH_PROVIDER=tavily`, rồi khởi động lại `npm run dev`.
- Để bật AI: chọn `AI_PROVIDER=groq` hoặc `gemini` và điền key/model tương ứng. Chỉ excerpt bài báo công khai được gửi cho model; PDF riêng tư vẫn xử lý cục bộ.

## Kiểm chứng AI Agent trong demo

1. Mở `/company/VNM` và bấm **Run OSINT scan**. Một lượt live thành công phải hiện `mode=live`, provider tìm kiếm như Firecrawl/Tavily, LLM `live` cùng tên model, và đủ 5 bước `discover → graph_enrichment → extract → classify → validate`.
2. Đọc dòng chẩn đoán ngay dưới nút: số kết quả, số đề xuất LLM và số quote khớp chính xác với excerpt. Mở nguồn từng kết quả để tự đối chiếu. Số đề xuất lớn hơn 0 chứng minh model đã trả structured output; quote khớp bằng 0 vẫn là kết quả hợp lệ nhưng không có căn cứ để preview penalty.
3. Neo4j `đã kết nối, chưa có node công ty` chứng minh kết nối sống nhưng graph chưa có dữ liệu; `chưa kết nối` là cấu hình/kết nối cần xử lý. Không cần ghi dữ liệu demo vào graph để chạy luồng OSINT.
4. Nếu có kết quả workbook, UI ghi rõ `DEMO DATA` và AI bị skip. Nếu tìm kiếm sống không có bài, đây không phải lỗi LLM: không có nguồn để phân loại.
5. Mở Developer Tools → Network, chọn request `POST /api/osint/scan` để kiểm tra HTTP `200`, workflow, metadata provider/AI và findings. Không chụp/paste request environment hoặc API key vào log demo.

Lượt kiểm chứng gần nhất trên máy dev: HTTP 200, Firecrawl + Jina Reader, Groq `openai/gpt-oss-120b`, 9 kết quả, 9 structured proposals, graph connected nhưng chưa match VNM. Lượt đó có 0 quote khớp chính xác, nên không có penalty AI nào được xác nhận cho preview. Kết quả tìm kiếm và nội dung LLM thay đổi theo thời điểm.

### Demo AI đọc PDF

1. Vào `/private`, dùng tài liệu giả định `tests/fixtures/bctc-mau-qrt-2024.pdf`.
2. Chọn đồng ý xử lý cục bộ. Tick thêm checkbox AI Agent để cho phép gửi text OCR/trích xuất (không gửi PDF gốc) tới Groq/Gemini.
3. Trong Processing theo dõi `Đọc tài liệu/OCR → Chuẩn hoá → LLM Agent → Z'-Score`. Kết quả phải ghi provider/model, workflow `llm_extract → validate_evidence`, số proposal và số quote đã khớp.
4. Bảng đánh dấu phương pháp theo từng field (`LLM`/`Rules`), trang và quote. Nếu model không trả evidence khớp, field giữ giá trị của parser hoặc để trống; không lấy proposal chưa kiểm chứng để tính Z'. Nếu hai phương pháp lệch nhau, so sánh dòng gốc trước khi trình bày.
5. PDF scan `tests/fixtures/bctc-mau-qrt-2024-scan.pdf` minh hoạ OCR. Không gửi tài liệu thật/mật tới provider nếu chưa được phép.
- Khi không có kết quả live, app dùng sự kiện workbook và gắn nhãn `DEMO DATA`.
- Hồ sơ OSINT hiển thị các bước agent và trạng thái Neo4j. Hiện Aura đã kết nối nhưng graph rỗng; muốn nạp dữ liệu workbook demo thì chạy lệnh seed có cờ ghi chủ động trong [backend README](../backend/README.md).
- Cấu hình MCP cho IDE nằm trong `.vscode/mcp.json`. Bật Tool authentication trong Aura Console, mở VS Code và hoàn tất OAuth trong browser. Chỉ đọc graph khi demo.
- Mẫu đầy đủ nằm trong `.env.example`. Chỉ thêm các dòng còn thiếu vào `.env.local`, không ghi đè các key hiện có; sửa `.env.local` xong thì khởi động lại `npm run dev`.
- Nếu provider lỗi, giao diện giữ kết quả từ provider khác hoặc báo rõ fallback; không nói rằng app vừa xác minh vi phạm.

### Tệp PDF demo

- `tests/fixtures/bctc-mau-qrt-2024.pdf`: PDF chữ, công ty giả định, dùng để thấy trích xuất và vùng Grey.
- `tests/fixtures/bctc-mau-qrt-2024-scan.pdf`: PDF scan, dùng để minh họa OCR.
- Đáp án: `tests/fixtures/bctc-mau-qrt-2024.expected.json`. Đây cũng là fixture của e2e test – không sửa tay; tạo lại bằng `node scripts/make-sample-pdf.mjs`.

Đóng các tab/file cá nhân trước khi trình chiếu. Không dùng hồ sơ thẩm định thật nếu chưa được phép gửi/hiển thị trong buổi demo.

## 2. Kịch bản nói 5–7 phút

### 0:00–0:40 — Nêu bối cảnh

> “Đây là prototype trên bộ dữ liệu workbook của nhóm. Tôi sẽ đi từ universe cổ phiếu đến hồ sơ rủi ro, thử phân bổ, rồi minh họa OCR trên một BCTC giả định.”

Mở `/stocks`, nêu universe hiện tại có bốn hồ sơ đầy đủ. Bấm `Nạp bộ demo 4 mã` để tái lập cùng một bộ mã.

### 0:40–1:50 — Danh sách và hồ sơ doanh nghiệp

1. Tìm VNM hoặc MCM trong `/stocks`.
2. Mở hồ sơ và chỉ vào Altman, ESG, OSINT, RFin base/POSINT/RFin total.
3. Nhấn mạnh ô `—` là dữ liệu chưa có, không phải điểm 0.

### 1:50–2:50 — OSINT

1. Ở hồ sơ doanh nghiệp bấm `Run OSINT scan`.
2. Chế độ demo: nêu rõ sự kiện xuất phát từ workbook và có thể đã nằm trong assessment; hệ thống không cộng penalty lần hai.
3. Chế độ live: xem nguồn GDELT/Firecrawl, mở URL, đọc trích đoạn và đề xuất AI; bài viết chưa chứng minh vi phạm, cần reviewer.
4. AI chỉ phân loại excerpt và không ghi POSINT. Chưa có persistence/audit trail.

### 2:50–4:00 — Portfolio

1. Từ `/stocks`, chọn bộ demo và mở `/portfolio`.
2. Di chuyển một slider α/β/γ/δ, chỉ vào tên scenario/giới hạn weights và vốn.
3. Nêu rõ slider đang chọn scenario workbook gần nhất; đây chưa phải lần chạy solver mới, chưa có covariance thực và chưa chạy quantum hardware.

### 4:00–5:20 — PDF nội bộ

1. Mở `/private` và dùng `tests/fixtures/bctc-mau-qrt-2024.pdf`.
2. Kiểm tra extracted rows, trang/dòng, X1–X5 và Z′ nếu đủ inputs.
3. Nếu còn thời gian, dùng `tests/fixtures/bctc-mau-qrt-2024-scan.pdf` để cho thấy OCR.
4. Nêu rõ đây là BCTC giả định; OCR/parser chạy trong trình duyệt, LLM extraction chỉ bật khi có opt-in; kết quả chưa ghi vào hồ sơ cổ phiếu public và chưa có RAG.

### 5:20–6:00 — Báo cáo

Mở `/report/VNM`, lướt nguồn/phương pháp/data gap và dùng `In / Lưu PDF`.

## 3. Câu trả lời ngắn cho câu hỏi thường gặp

**“Đây có phải dữ liệu thị trường realtime?”**
Không. Bảng hiện tại lấy từ workbook demo (BCTC 2024, price inputs theo tài liệu dữ liệu). Không có feed giá live.

**“OSINT có xác nhận doanh nghiệp vi phạm không?”**
Không. Firecrawl search trả candidate và nguồn để reviewer đánh giá. Bài báo không đồng nghĩa quyết định xử phạt.

**“Thay đổi tham số có chạy optimizer mới không?”**
Hiện slider chọn scenario có sẵn. Solver/covariance đầy đủ là phần cần triển khai tiếp.

**“PDF có được AI đọc không?”**
OCR/parser chạy trên trình duyệt. Có thể bật LLM extraction riêng bằng checkbox đồng ý gửi text trích xuất; mỗi giá trị AI cần quote/trang nguồn khớp. Chưa có RAG hoặc xử lý chéo nhiều hồ sơ.

**“Có scale thêm cổ phiếu được không?”**
Thiết kế universe không giới hạn ở bốn mã. Để một mã có phân tích đầy đủ cần nhập dữ liệu có nguồn ở các sheet liên quan và cập nhật portfolio scenario/constraint; mã không đủ dữ liệu sẽ không được giả làm analysis-ready.

## 4. Nếu gặp sự cố

| Hiện tượng | Cách xử lý demo |
|---|---|
| `/api/universe` trả 503 | Khởi động FastAPI ở cổng 8000 trong cùng workspace, kiểm tra `/health` và URL backend trong `.env.local` |
| Search provider timeout/quota | Nêu rõ nguồn nào lỗi; nếu không còn kết quả live thì app dùng workbook fallback có nhãn `DEMO DATA` |
| Document Agent `RateLimitError` | Chờ quota provider hồi phục hoặc đổi `AI_PROVIDER` sang provider khác đã cấu hình; kết quả Rules vẫn hiển thị. Không gửi lại liên tục vì sẽ tăng rate limit |
| Document Agent báo 413 | Bản hiện tại giới hạn và lọc context trước khi gửi. Nếu provider vẫn từ chối request, dùng PDF ngắn hơn hoặc giảm số trang; parser Rules vẫn là fallback |
| OCR chưa tải worker | Chờ trang nạp tài nguyên hoặc tải lại; dùng PDF chữ làm đường dự phòng |
| Kết quả PDF thiếu một số ô | Dùng PDF chữ `tests/fixtures/bctc-mau-qrt-2024.pdf`; chỉ rõ parser giữ thiếu thay vì đoán |
| Portfolio báo scenario/constraint chưa hỗ trợ | Quay lại preset demo 4 mã; đây là giới hạn dữ liệu/scenario hiện có |
| Sửa workbook mà app vẫn giữ dữ liệu cũ | Dừng server, chạy `npm run data`, sau đó khởi động lại `npm run dev` |
