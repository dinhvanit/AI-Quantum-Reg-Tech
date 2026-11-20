# Deploy tách frontend và backend

Frontend (Next.js) và backend (FastAPI) deploy ở hai nơi riêng, mỗi nơi có file biến mẫu riêng:

| Service | Host gợi ý | File mẫu | Local |
|---|---|---|---|
| Frontend – Next.js | Vercel | [`.env.example`](../.env.example) | `.env.local` ở gốc repo |
| Backend – FastAPI + LangGraph | Container host (Render, Railway, Fly.io, Cloud Run…) | [`backend/.env.example`](../backend/.env.example) | `backend/.env` |
| Auth DB – Postgres | Neon | (`DATABASE_URL` trong file frontend) | — |
| Neo4j | Neo4j Aura | (biến nằm trong file backend) | — |

Không upload file `.env*`, không đưa key vào image hay biến `NEXT_PUBLIC_*`. Backend đọc theo thứ tự: env thật của host → `backend/.env` → `.env.local` ở root (fallback cho máy cũ dùng một file chung); biến đã có không bị ghi đè.

## 1. Thứ tự deploy

**Backend trước, frontend sau.** Các trang Next.js được prerender lúc `next build`. Khi `NEXT_PUBLIC_USE_MOCK=false`, build gọi `NEXT_PUBLIC_API_URL` để lấy dữ liệu; backend không truy cập được thì build fail (`TypeError: fetch failed … Failed to collect page data for /report/[ticker]`). Hệ quả thêm: số liệu trên các trang là bản chụp lúc build – đổi dữ liệu backend thì redeploy frontend.

1. Neon: tạo database, chạy migration và seed user demo (mục 3a).
2. Build và deploy backend, cấu hình biến ở mục 2, kiểm tra `GET /health`.
3. Đặt biến frontend ở mục 3 trên Vercel, deploy.
4. Cập nhật `CORS_ORIGINS` của backend bằng domain Vercel thật, restart backend.
5. Kiểm tra theo mục 4.

## 2. Backend

```bash
docker build -f backend/Dockerfile -t quantumregtech-api .     # context = gốc repo, lọc bởi /.dockerignore
docker run --env-file backend/.env -p 8000:8000 quantumregtech-api   # chạy thử local
```

Dockerfile có 2 stage: stage Node chạy `scripts/build-financial-engine-data.mjs` + `scripts/build-data.mjs` trên `data/QuantumRegTech_Input_Data_final.xlsx` để sinh `data/generated/*.json` (thư mục này bị gitignore nên host build từ Git như Render không có sẵn), stage Python chỉ copy JSON đã sinh. Không cần chạy `npm run data` trước khi build.

**Render:** New → Blueprint → chọn repo (đọc [`render.yaml`](../render.yaml)), hoặc New → Web Service → Docker với *Dockerfile Path* `./backend/Dockerfile`, *Docker Build Context* `.`, *Health Check Path* `/health`. Nhập secret (`CORS_ORIGINS`, `FIRECRAWL_API_KEY`, `GROQ_API_KEY`/`GEMINI_API_KEY`, `NEO4J_*` nếu dùng) trong dashboard. Gói Free ngủ sau ~15 phút không có request: lần gọi đầu chờ ~1 phút, Vercel build có thể fail `fetch failed` nếu backend đang ngủ → gọi `/health` trước khi redeploy frontend, hoặc dùng gói trả phí. Gói Free không có persistent disk → registry SQLite và job OSINT mất khi restart.

Container lắng nghe `$PORT` (mặc định 8000); đa số host tự cấp biến này. Job OSINT lưu trong bộ nhớ tiến trình: chạy **1 instance, 1 worker**; restart/redeploy làm mất job đang chạy (job phía Firecrawl vẫn tính credit).

| Nhóm | Biến | Bắt buộc? | Ghi chú |
|---|---|---|---|
| CORS | `CORS_ORIGINS` | **Có** | Domain frontend, ngăn cách bằng dấu phẩy, không có `/` cuối, vd. `https://<app>.vercel.app`. Preview Vercel có domain khác – thêm nếu cần |
| OSINT | `FIRECRAWL_API_KEY` | Có (cho OSINT live) | Chỉ dùng Firecrawl Agent API. Thiếu → chỉ hiện sự kiện đã duyệt trong workbook. Mỗi lượt quét = 1 job agent/mã/năm, tối đa `OSINT_AGENT_MAX_CREDITS` |
| OSINT | `OSINT_AGENT_MAX_CREDITS`, `OSINT_AGENT_TIMEOUT_SECONDS` | Không | Trần credit mỗi mã (mặc định 500) và thời gian chờ tối đa (300 s) |
| OSINT | `OSINT_VERIFY_SOURCES` | Không | Mặc định `false`. `true` → đọc lại trang nguồn bằng Firecrawl scrape (1 credit/trang) để kiểm quote, LLM mới đề xuất mức |
| OSINT | `OSINT_JINA_FALLBACK`, `JINA_API_KEY` | Không | Giữ trong code nhưng không dùng (mặc định `false`) |
| AI | `AI_PROVIDER` + `GROQ_API_KEY` **hoặc** `GEMINI_API_KEY` | Không | LLM trích xuất PDF (Cổng 2, opt-in) và gợi ý mức OSINT khi `OSINT_VERIFY_SOURCES=true` |
| AI | `OSINT_AI_PROVIDER`, `GROQ_MODEL`, `GEMINI_MODEL` | Không | |
| Neo4j | `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `NEO4J_DATABASE` | Không | Production dùng 4 biến này (không dùng `NEO4J_CREDENTIALS_FILE`). Giữ `NEO4J_ALLOW_DEMO_WRITE=false` |
| Registry | `UNIVERSE_DB_PATH` | Không | SQLite mã `pending_data`. Không có volume → mất khi redeploy; muốn giữ thì mount volume và trỏ vào, vd. `/data/universe.sqlite3` |
| Registry | `DATA_VERSION`, `METHODOLOGY_VERSION`, `GENERATED_DATA_DIR` | Không | Để mặc định |
| SSI | `SSI_API_KEY`, `SSI_API_SECRET`, `SSI_API_BASE_URL` | Chưa | Adapter chưa kích hoạt |

Đổi `data/QuantumRegTech_Input_Data_final.xlsx` → commit/push → Render tự build lại image (dữ liệu nằm trong image) → redeploy frontend.

## 3a. Auth DB (Neon)

Chỉ frontend dùng Neon (Auth.js: bảng `users`, `accounts`, `sessions`, `verification_token`); backend không kết nối Postgres.

1. Tạo project Neon, lấy connection string **pooled** (`…-pooler…`, có `sslmode=require`).
2. Chạy [`database/migrations/001_auth.sql`](../database/migrations/001_auth.sql) trong Neon SQL Editor (hoặc `psql "$DATABASE_URL" -f database/migrations/001_auth.sql`). Script idempotent.
3. Seed tài khoản demo: đặt `DATABASE_URL`, `DEMO_AUTH_EMAIL`, `DEMO_AUTH_PASSWORD` trong `.env.local` rồi `npm run db:seed-demo`.
4. Đặt `DATABASE_URL` trên Vercel (mục 3). Đăng nhập Google: thêm `https://<domain>/api/auth/callback/google` vào Authorized redirect URI.

## 3. Frontend (Vercel)

Framework preset Next.js, giữ lệnh build mặc định (`prebuild` tự chạy `npm run data` và `npm run assets`).

| Biến | Giá trị production | Ghi chú |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCK` | `false` | `true` → chạy chỉ với JSON, không cần backend |
| `NEXT_PUBLIC_API_URL` | `https://<backend-domain>` | Không có `/` cuối. Nhúng vào bundle lúc build → đổi thì redeploy |
| `QUANTUM_API_URL` | (bỏ trống) | Route proxy `/api/*` mặc định dùng `NEXT_PUBLIC_API_URL`; chỉ đặt khi server Vercel gọi backend qua địa chỉ khác |
| `UNIVERSE_ID` | `demo-v1` | Không bắt buộc |
| `AUTH_SECRET` | chuỗi ngẫu nhiên | **Bắt buộc** (Auth.js) – mọi trang trừ `/login`, `/signup` cần đăng nhập |
| `DATABASE_URL` | Neon Postgres | **Bắt buộc** – thiếu thì `next build` fail ("DATABASE_URL must be configured") |
| `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` | OAuth Google | Không bắt buộc (đăng nhập Google) |

Không đặt key Firecrawl/Groq/Gemini/Jina/Neo4j/SSI trên Vercel – frontend không dùng tới.

OSINT chạy dạng job: `POST /api/v1/osint/scans` trả `scan_id` ngay (202), trình duyệt hỏi `GET /api/v1/osint/scans/{id}` mỗi 3 giây qua route proxy – không có request nào giữ kết nối nhiều phút, nên không cần tăng timeout function trên Vercel.

## 4. Kiểm tra sau deploy

1. `https://<backend-domain>/health` → `{"status":"ok"}`.
2. `https://<backend-domain>/api/v1/graph/status` → `state`: `ready`/`ready_empty` nếu kết nối được Neo4j, `unavailable` nếu cấu hình nhưng không kết nối được, `disabled` nếu không cấu hình.
3. Trang chủ Vercel hiện 9 công ty (năm dữ liệu 2024 → 2025); `/stocks` gọi `/api/universe` trả 200.
4. `/portfolio` → chọn mã → **Kiểm tra OSINT** → **Quét OSINT … năm …**: thông báo "Firecrawl Agent – năm …" (tốn credit). Nếu thấy cảnh báo "Không kết nối được backend OSINT" → sai URL backend hoặc backend đang ngủ.
5. Browser console không có lỗi CORS.

## 5. Lỗi thường gặp

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| Vercel build fail `fetch failed` | Backend chưa chạy/URL sai lúc build | Deploy backend trước, kiểm tra `NEXT_PUBLIC_API_URL`, redeploy |
| OSINT chỉ hiện sự kiện đã duyệt trong bộ dữ liệu | Thiếu `FIRECRAWL_API_KEY` ở backend hoặc agent lỗi (xem cảnh báo) | Thêm vào secret manager backend, restart |
| Lỗi CORS trong console | `CORS_ORIGINS` thiếu domain frontend | Thêm đúng origin (có `https://`, không `/` cuối) |
| Mã mới đăng ký biến mất | SQLite không nằm trên volume | Mount volume, đặt `UNIVERSE_DB_PATH` |
| Số liệu trang cũ sau khi cập nhật backend | Trang prerender lúc build | Redeploy frontend |
