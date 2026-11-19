# QuantumRegTech – MVP Prototype

> Nền tảng RegTech ứng dụng AI & Điện toán Lượng tử trong Đánh giá Tín nhiệm ESG và Tối ưu Danh mục Đầu tư ngành F&B Việt Nam.
> Đội thi: **QuantumRegTech (AQ2026-205)** – AI-Quantum Challenge 2026.

## Mục tiêu của MVP

Hoàn thiện **giao diện sản phẩm** chạy trên **dữ liệu mẫu** trong file Excel `data/QuantumRegTech_Data.xlsx` (Phụ lục B hồ sơ Vòng 1 + BCTC/giá từ file nhập liệu của nhóm tài chính), để demo trọn luồng người dùng:

`Danh sách cổ phiếu → Hồ sơ & OSINT → Tối ưu danh mục → Upload PDF nội bộ → Xuất báo cáo thẩm định`

### Trong phạm vi (In scope)
- UI demo gồm Dashboard, danh sách cổ phiếu, Cổng 1, Cổng 2, Portfolio, Report
- `/stocks` là danh sách universe có thể mở rộng; preset VNM/SAB/MCM/SBT chỉ là lựa chọn demo ban đầu
- Nạp nhiều PDF và trích BCTC/OCR riêng từng tài liệu ngay trên trình duyệt
- Dữ liệu mẫu trong file Excel, chuyển sang JSON theo đúng schema API tương lai
- Deploy link demo công khai (Vercel)

### Ngoài phạm vi (tạm thời bỏ qua)
- Chạy Lõi Lượng tử thật (QAOA/VQE trên IBM Qiskit)
- RAG/tìm kiếm qua nhiều PDF và lưu trữ hồ sơ riêng tư (đã có lựa chọn LLM trích xuất text theo opt-in; PDF gốc vẫn xử lý trong trình duyệt)
- Cập nhật POSINT chính thức và lưu audit bền vững sau khi reviewer duyệt (hiện chỉ preview trong phiên)

## Bộ tài liệu

| Tài liệu | Nội dung |
|---|---|
| [`docs/README.md`](docs/README.md) | Mục lục toàn bộ docs và thứ tự nguồn sự thật |
| [Spec Kit Constitution](.specify/memory/constitution.md) | Nguyên tắc bằng chứng, tài chính, human review, riêng tư và AI |
| [Feature Spec](specs/001-investor-due-diligence-demo/spec.md) | User stories và acceptance criteria B1–B4 + báo cáo |
| [Luồng người dùng](docs/USER_FLOWS.md) | Hành động, phản hồi UI, trạng thái dữ liệu và checklist kiểm duyệt |
| [Hướng dẫn sử dụng](docs/USER_GUIDE.md) | Các màn hình, cách demo và cách diễn giải lợi nhuận danh mục |
| [Runbook demo](docs/DEMO_RUNBOOK.md) | Cách chạy app, kịch bản trình bày 5–7 phút và cách xử lý sự cố |
| [Plan / Architecture](specs/001-investor-due-diligence-demo/plan.md) | Kiến trúc hiện tại/đích, agent workflow, backend phases và quyết định mở |
| [Tasks](specs/001-investor-due-diligence-demo/tasks.md) | Backlog triển khai theo từng lớp |
| [Financial Engine](docs/FINANCIAL_ENGINE.md) | Công thức Altman Z/Z′, CAPM, RFin, POSINT, ESG và portfolio objective |
| [External Services](docs/EXTERNAL_SERVICES.md) | So sánh công cụ, chi phí/quota, đề xuất stack và quy tắc bảo mật |
| [Agent Platform spec](specs/002-agent-platform/spec.md) | Phạm vi agent, evidence, Neo4j, deploy và human review |
| [Neo4j MCP guide](docs/NEO4J_MCP.md) | Kết nối Aura, cấu hình MCP cho VS Code/Claude Code, vị trí secret |

| File | Nội dung |
|---|---|
| [`docs/TECH_STACK.md`](docs/TECH_STACK.md) | Công nghệ sử dụng, cấu trúc thư mục, lệnh khởi tạo, lộ trình nâng cấp Vòng 2 |
| [`docs/UI_DESIGN.md`](docs/UI_DESIGN.md) | Design system, đặc tả từng màn hình, user journey, quy trình Figma → code (kết nối Figma MCP) |
| [`docs/DATA.md`](docs/DATA.md) | File Excel dữ liệu, luồng Excel → JSON, schema (= hợp đồng API), số liệu chuẩn, việc cần xác nhận |
| [`CLAUDE.md`](CLAUDE.md) | Ngữ cảnh & quy tắc cho Claude Code khi làm việc trong repo |

## Trạng thái hiện tại

| Màn hình | Route | Trạng thái |
|---|---|---|
| Dashboard | `/` | ✅ |
| Cổng 1 – Tra cứu công khai | `/company/[ticker]` | ✅ |
| Danh sách cổ phiếu | `/stocks` | ✅ hiển thị universe có dữ liệu; preset demo 4 mã |
| Cổng 2 – Nạp dữ liệu bảo mật | `/private` | ✅ đọc PDF + OCR BCTC ngay trên trình duyệt → Z' (ESG, OSINT của DN tải lên: Vòng 2) |
| Tối ưu danh mục + Lõi Lượng tử | `/portfolio` | ✅ |
| Báo cáo thẩm định (in PDF) | `/report/[ticker]` | ✅ |

Số liệu còn thiếu (hiển thị "—") và các điểm cần nhóm tài chính quyết định: [`docs/DATA.md` mục 6](docs/DATA.md).

## Dữ liệu

Nguồn dữ liệu duy nhất: **`data/QuantumRegTech_Data.xlsx`**. Sửa số liệu trong file này → lưu → `npm run data && npm test`. Các file `src/data/*.json` được sinh tự động (trước `dev` / `build` / `test`) và không commit. Chi tiết: [`docs/DATA.md`](docs/DATA.md).

**Thử Cổng 2:** mở `/private`, tải `tests/fixtures/bctc-mau-qrt-2024-scan.pdf` (bản scan → OCR) hoặc `tests/fixtures/bctc-mau-qrt-2024.pdf` (có lớp chữ). Đây là BCTC của doanh nghiệp **giả định**; đáp án ở `tests/fixtures/bctc-mau-qrt-2024.expected.json`. Bộ demo đầy đủ hơn (3 DN Safe / Grey / Distress × PDF chữ, scan sạch, scan xấu) ở [`demo/pdf/`](demo/pdf/README.md) – tạo lại bằng `node scripts/make-sample-pdf.mjs --demo`.

## Chạy dự án

Yêu cầu: Node.js 22.

```bash
npm install
npm run data
npm run dev        # http://localhost:3000; dùng UI-only mode nếu chưa bật FastAPI
npm run build      # kiểm tra build trước khi deploy
npm run lint
npm run data       # Excel → src/data/*.json (tự chạy trước dev/build/test)
npm run assets     # tài nguyên OCR → public/vendor (tự chạy trước dev/build)
npm test           # unit test (Vitest)
npx playwright install chromium   # một lần, trước khi chạy e2e
npm run test:e2e   # e2e (Playwright) – tự build và chạy server
```

Để bật deep-demo gồm API dữ liệu và OSINT LangGraph/LangChain, chạy FastAPI ở terminal khác bằng hướng dẫn trong [`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md). Biến môi trường (mẫu tại `.env.example`):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCK` | `false` trong `.env.example` | `true` → dữ liệu fixture trực tiếp; `false` → đọc qua FastAPI |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | Địa chỉ FastAPI |
| `OSINT_SEARCH_PROVIDER` | `auto` | `auto`, `firecrawl` hoặc `tavily`; GDELT vẫn chạy cho một mã/lượt |
| `FIRECRAWL_API_KEY` | *(không có)* | Bật tìm kiếm OSINT mục tiêu qua Firecrawl |
| `TAVILY_API_KEY` | *(không có)* | Chọn Tavily làm targeted search bằng `OSINT_SEARCH_PROVIDER=tavily` |
| `AI_PROVIDER` + provider key | *(không có)* | Chọn `groq` hoặc `gemini` để tạo đề xuất phân loại OSINT; key giữ ở server |
| `JINA_API_KEY` | *(không bắt buộc)* | Tăng hạn mức khi Jina Reader trích một số bài chưa có excerpt |
| `NEO4J_CREDENTIALS_FILE` hoặc `NEO4J_URI` + `NEO4J_USERNAME` + `NEO4J_PASSWORD` | *(không có)* | Kết nối read-only graph context cho agent OSINT |

CAPM, price-period return, Altman Z/X1–X5 và RFin base được tính lại từ đầu vào workbook, có đối chiếu công thức Excel. OSINT chạy qua LangGraph, dùng GDELT/Firecrawl hoặc Tavily, Jina Reader tùy chọn và Gemini/Groq qua LangChain để đề xuất phân loại có bằng chứng; mọi finding vẫn cần reviewer, chưa có audit bền vững hay cập nhật POSINT chính thức. Cổng PDF dùng OCR/parser cục bộ làm baseline; nếu người dùng opt-in, LangGraph + LangChain LLM trích xuất ngữ nghĩa và chỉ chấp nhận số có quote/trang nguồn khớp. PDF gốc không gửi lên LLM. Chưa có RAG, xử lý xuyên nhiều tài liệu hoặc lưu trường đã duyệt. Portfolio slider vẫn chọn kịch bản dựng sẵn, chưa chạy optimizer covariance hoặc QAOA.

Sao chép cấu hình mẫu từ `.env.example` sang `.env.local` nếu cần. Không thay toàn bộ `.env.local` hiện có nếu trong đó đã có key; chỉ thêm các dòng còn thiếu và khởi động lại Next.js sau khi sửa.

### Cấu hình môi trường và deploy

Khi phát triển local, đặt `.env.local` ở **thư mục gốc repo**, cùng cấp `package.json`; không đặt trong `src/`. FastAPI hiện cũng đọc file gốc này. `.env.local` đã được ignore. Dùng `.env.example` làm danh sách biến; không commit giá trị thật. Khi deploy, không upload file `.env.local`: cấu hình từng service trong secret manager của host.

Khuyến nghị tách deploy: Next.js lên Vercel; FastAPI/worker lên một container host; Neo4j Aura giữ riêng làm database. Vercel nhận URL FastAPI (`NEXT_PUBLIC_API_URL` cho các trang server/client hiện có và `QUANTUM_API_URL` cho route server); FastAPI nhận model/search/Neo4j credentials. Aura API client credentials không cần cho driver hay hosted Aura MCP.

Build image FastAPI từ repo root sau khi sinh dữ liệu demo:

```bash
npm run data
docker build -f backend/Dockerfile -t quantumregtech-api .
```

Chiến lược deploy và rollout nhiều môi trường nằm trong [Agent Platform plan](specs/002-agent-platform/plan.md). Tách host giúp deploy/scale API độc lập và giữ bí mật DB phía backend; local vẫn chạy cùng repo bằng hai terminal.

Deploy: nối repo GitHub với Vercel (Framework preset: Next.js, giữ cấu hình mặc định). Push lên `main` → production; branch/PR → preview.

## Nhóm

| Thành viên | Vai trò MVP |
|---|---|
| Trịnh Minh Tâm (Trưởng nhóm) | Nội dung tài chính, kịch bản demo, rà soát số liệu |
| Nguyễn Thu Uyên | Dữ liệu ESG/OSINT, text giải thích trong UI |
| Đặng Đình Khang | Dev A – Dashboard + Cổng 1 |
| Trần Hữu Huy Hoàng | Dev B – Portfolio + tab QUBO |
| Nguyễn Đình Văn | Dev C – Cổng 2 + Report + deploy |

> Phân công dev là gợi ý – nhóm điều chỉnh theo thế mạnh từng người.
