# QuantumRegTech – MVP Prototype

> Nền tảng RegTech ứng dụng AI & Điện toán Lượng tử trong Đánh giá Tín nhiệm ESG và Tối ưu Danh mục Đầu tư ngành F&B Việt Nam.
> Đội thi: **QuantumRegTech (AQ2026-205)** – AI-Quantum Challenge 2026.

## Mục tiêu của MVP

Hoàn thiện giao diện thẩm định và danh mục đầu tư bằng dữ liệu tài chính có nguồn. Danh sách cổ phiếu và trang tạo danh mục dùng bộ máy tính tài chính cho 9 mã; một số màn hình hồ sơ cũ vẫn giữ nguồn dữ liệu hiện hữu:

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
| Bộ máy tài chính dữ liệu lịch sử | `/financial-engine` | ✅ tính lại 9 mã 2021–2024, đối chiếu workbook |
| Báo cáo thẩm định (in PDF) | `/report/[ticker]` | ✅ |

Số liệu còn thiếu (hiển thị "—") và các điểm cần nhóm tài chính quyết định: [`docs/DATA.md` mục 6](docs/DATA.md).

## Dữ liệu

Danh sách và trang tạo danh mục dùng bộ dữ liệu 9 doanh nghiệp giai đoạn 2021–2024. `npm run data` tính và đối chiếu chỉ số, sau đó API `/api/v1/financial-engine` cung cấp cho giao diện. Trang danh mục tự tính tỷ trọng đề xuất theo lợi suất kỳ vọng, ESG, mức an toàn tài chính và giới hạn tập trung. Chưa có chuỗi giá đủ dày để tính ma trận hiệp phương sai và chạy Markowitz. Các file `data/generated/*.json` được sinh tự động và không commit. Chi tiết: [`docs/DATA.md`](docs/DATA.md) và [`docs/FINANCIAL_ENGINE.md`](docs/FINANCIAL_ENGINE.md).

**Thử Cổng 2:** mở `/private`, tải `tests/fixtures/bctc-mau-qrt-2024-scan.pdf` (bản scan → OCR) hoặc `tests/fixtures/bctc-mau-qrt-2024.pdf` (có lớp chữ). Đây là BCTC của doanh nghiệp **giả định**; đáp án ở `tests/fixtures/bctc-mau-qrt-2024.expected.json`. Tạo lại bằng `node scripts/make-sample-pdf.mjs`.

## Chạy dự án

Yêu cầu: Node.js 22.

```bash
npm install
npm run data
npm run dev        # http://localhost:3000; dùng UI-only mode nếu chưa bật FastAPI
npm run build      # kiểm tra build trước khi deploy
npm run lint
npm run data       # Excel → data/generated/*.json (tự chạy trước dev/build/test)
npm run assets     # tài nguyên OCR → public/vendor (tự chạy trước dev/build)
npm test           # unit test (Vitest)
npx playwright install chromium   # một lần, trước khi chạy e2e
npm run test:e2e   # e2e (Playwright) – tự build và chạy server
```

Để bật deep-demo gồm API dữ liệu và OSINT LangGraph/LangChain, chạy FastAPI ở terminal khác bằng hướng dẫn trong [`docs/DEMO_RUNBOOK.md`](docs/DEMO_RUNBOOK.md). Frontend và backend deploy riêng nên có **hai file mẫu**:

- `.env.example` → `.env.local` ở gốc repo: chỉ biến của Next.js.
- `backend/.env.example` → `backend/.env`: key dịch vụ và cấu hình FastAPI.

### Đăng nhập Google và Neon PostgreSQL

Frontend sử dụng Auth.js với Google OAuth và đăng nhập email/mật khẩu; các user và tài khoản OAuth lưu trong Neon, còn session Auth.js dùng JWT cookie. Layout protected kiểm tra session ở server, Proxy chuyển request chưa đăng nhập về `/login`, và login không render sidebar/header. `.env.local` là file máy cá nhân, không commit; cấu hình `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` và `DATABASE_URL` ở Vercel trước khi deploy.

Trong Google Cloud Console, thêm `http://localhost:3000/api/auth/callback/google` làm Authorized redirect URI; khi deploy thêm `https://<domain>/api/auth/callback/google`. Tạo schema trên Neon bằng [`database/migrations/001_auth.sql`](database/migrations/001_auth.sql). Đặt `DEMO_AUTH_EMAIL` và `DEMO_AUTH_PASSWORD` trong `.env.local`, rồi chạy `npm run db:seed-demo` để upsert user demo (mật khẩu được lưu dưới dạng bcrypt hash). Tên project Neon là `ai-quantum-reg-tech`; connection string xác định database thực tế.

**Frontend** (`.env.local` / Vercel):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCK` | `false` trong `.env.example` | `true` → dữ liệu fixture trực tiếp; `false` → đọc qua FastAPI |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | URL công khai của FastAPI (trang server render) |
| `QUANTUM_API_URL` | = `NEXT_PUBLIC_API_URL` | URL backend cho các route proxy `/api/*`; chỉ cần khi khác URL công khai |
| `UNIVERSE_ID` | `demo-v1` | Universe gửi kèm khi đăng ký mã mới |

**Backend** (`backend/.env` / secret manager của host FastAPI):

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `CORS_ORIGINS` | `http://localhost:3000,…` | Origin frontend được phép gọi; production thêm domain Vercel |
| `FIRECRAWL_API_KEY` | *(không có)* | **Nguồn OSINT duy nhất – chỉ Firecrawl Agent API** (1 job/mã/năm, vài phút, tới `OSINT_AGENT_MAX_CREDITS`=500 credit, chờ tối đa `OSINT_AGENT_TIMEOUT_SECONDS`=300 s). Thiếu key → chỉ hiện sự kiện đã duyệt trong workbook |
| `OSINT_VERIFY_SOURCES` | `false` | `true`: đọc lại trang nguồn (Firecrawl scrape, 1 credit/trang) để kiểm quote của agent và cho LLM gợi ý mức |
| `OSINT_JINA_FALLBACK` / `JINA_API_KEY` | `false` / *(không dùng)* | Giữ trong code, không dùng |
| `AI_PROVIDER` (+ `OSINT_AI_PROVIDER`) + provider key | *(không có)* | `groq`/`gemini`: trích xuất PDF opt-in (Cổng 2) và gợi ý mức OSINT khi bật `OSINT_VERIFY_SOURCES`; key giữ ở server |
| `NEO4J_CREDENTIALS_FILE` hoặc `NEO4J_URI` + `NEO4J_USERNAME` + `NEO4J_PASSWORD` | *(không có)* | Kết nối read-only graph context cho agent OSINT |

Nguồn dữ liệu duy nhất là `data/QuantumRegTech_Input_Data_final.xlsx` (9 mã, năm dữ liệu 2021–2024 → dự báo 2022–2025). CAPM, lợi suất thực tế, Altman Z/X1–X5, R_fin, P_OSINT và ESG được tính lại từ ô số gốc và đối chiếu với kết quả công thức của workbook. OSINT chạy qua LangGraph (FastAPI) và chỉ dùng Firecrawl Agent với prompt một câu theo năm dữ liệu; sự kiện đã duyệt trong workbook dùng thẳng, sự kiện mới phải được người dùng chấp nhận và chọn mức (chỉ trong phiên). Cổng PDF dùng OCR/parser cục bộ làm baseline; nếu người dùng opt-in, LangGraph + LangChain LLM trích xuất ngữ nghĩa và chỉ chấp nhận số có quote/trang nguồn khớp. PDF gốc không gửi lên LLM. Chưa có RAG, xử lý xuyên nhiều tài liệu hoặc lưu trường đã duyệt. Trang danh mục phân bổ theo mức ưu tiên cho năm dữ liệu đã chọn và đối chiếu với lợi suất thực tế năm sau; chưa có optimizer covariance hoặc QAOA.

Sao chép `.env.example` → `.env.local` và `backend/.env.example` → `backend/.env`. Không thay toàn bộ file hiện có nếu trong đó đã có key; chỉ thêm các dòng còn thiếu và khởi động lại Next.js/FastAPI sau khi sửa. Máy đang để mọi key trong `.env.local` ở root vẫn chạy (FastAPI đọc file này làm fallback), nhưng nên chuyển key dịch vụ sang `backend/.env`.

### Cấu hình môi trường và deploy

Local: `.env.local` ở **gốc repo** (cùng cấp `package.json`, không đặt trong `src/`) cho Next.js; `backend/.env` cho FastAPI. Cả hai đã được ignore; không commit giá trị thật. Khi deploy, không upload file env: cấu hình từng service trong secret manager của host.

Deploy tách: Next.js lên Vercel; FastAPI lên một container host; Neo4j Aura giữ riêng làm database. Vercel chỉ nhận URL backend và cờ mock; FastAPI nhận model/search/Neo4j credentials và `CORS_ORIGINS` chứa domain Vercel. Checklist đầy đủ (thứ tự deploy, biến từng nơi, kiểm tra sau deploy): [`docs/DEPLOY.md`](docs/DEPLOY.md).

Build và chạy thử image FastAPI từ repo root sau khi sinh dữ liệu demo:

```bash
npm run data
docker build -f backend/Dockerfile -t quantumregtech-api .
docker run --env-file backend/.env -p 8000:8000 quantumregtech-api
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
