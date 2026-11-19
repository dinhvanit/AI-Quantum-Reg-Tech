# Deploy tách frontend và backend

Frontend (Next.js) và backend (FastAPI) deploy ở hai nơi riêng, mỗi nơi có file biến mẫu riêng:

| Service | Host gợi ý | File mẫu | Local |
|---|---|---|---|
| Frontend – Next.js | Vercel | [`.env.example`](../.env.example) | `.env.local` ở gốc repo |
| Backend – FastAPI + LangGraph | Container host (Render, Railway, Fly.io, Cloud Run…) | [`backend/.env.example`](../backend/.env.example) | `backend/.env` |
| Neo4j | Neo4j Aura | (biến nằm trong file backend) | — |

Không upload file `.env*`, không đưa key vào image hay biến `NEXT_PUBLIC_*`. Backend đọc theo thứ tự: env thật của host → `backend/.env` → `.env.local` ở root (fallback cho máy cũ dùng một file chung); biến đã có không bị ghi đè.

## 1. Thứ tự deploy

**Backend trước, frontend sau.** Các trang Next.js được prerender lúc `next build`. Khi `NEXT_PUBLIC_USE_MOCK=false`, build gọi `NEXT_PUBLIC_API_URL` để lấy dữ liệu; backend không truy cập được thì build fail (`TypeError: fetch failed … Failed to collect page data for /report/[ticker]`). Hệ quả thêm: số liệu trên các trang là bản chụp lúc build – đổi dữ liệu backend thì redeploy frontend.

1. `npm run data` – sinh `data/generated/*.json` (image backend copy thư mục này).
2. Build và deploy backend, cấu hình biến ở mục 2, kiểm tra `GET /health`.
3. Đặt biến frontend ở mục 3 trên Vercel, deploy.
4. Cập nhật `CORS_ORIGINS` của backend bằng domain Vercel thật, restart backend.
5. Kiểm tra theo mục 4.

## 2. Backend

```bash
npm run data
docker build -f backend/Dockerfile -t quantumregtech-api .     # context = gốc repo, lọc bởi /.dockerignore
docker run --env-file backend/.env -p 8000:8000 quantumregtech-api   # chạy thử local
```

Container lắng nghe `$PORT` (mặc định 8000); đa số host tự cấp biến này. Job OSINT lưu trong bộ nhớ tiến trình: chạy **1 instance, 1 worker**; restart/redeploy làm mất job đang chạy (job phía Firecrawl vẫn tính credit).

| Nhóm | Biến | Bắt buộc? | Ghi chú |
|---|---|---|---|
| CORS | `CORS_ORIGINS` | **Có** | Domain frontend, ngăn cách bằng dấu phẩy, không có `/` cuối, vd. `https://<app>.vercel.app`. Preview Vercel có domain khác – thêm nếu cần |
| OSINT | `FIRECRAWL_API_KEY` | Có (cho OSINT live) | Thiếu → trả sự kiện workbook `DEMO DATA`. Chế độ agent: tới `OSINT_AGENT_MAX_CREDITS` + ≤ 20 trang scrape mỗi mã |
| OSINT | `OSINT_DISCOVERY` | Không | `agent` (mặc định, Firecrawl Agent) hoặc `search` (4 truy vấn/mã, rẻ hơn) |
| OSINT | `OSINT_AGENT_MAX_CREDITS`, `OSINT_AGENT_TIMEOUT_SECONDS` | Không | Trần credit mỗi mã (mặc định 500) và thời gian chờ tối đa (300 s) |
| OSINT | `OSINT_FIRECRAWL_LIMIT`, `OSINT_LOOKBACK_YEARS` | Không | Mặc định 5 và 3 |
| OSINT | `OSINT_JINA_FALLBACK`, `JINA_API_KEY` | Không | Jina dự phòng; key chỉ tăng hạn mức |
| AI | `AI_PROVIDER` + `GROQ_API_KEY` **hoặc** `GEMINI_API_KEY` | Có (cho đề xuất AI) | Thiếu → không có đề xuất, kết quả tìm kiếm vẫn hiện |
| AI | `OSINT_AI_PROVIDER`, `GROQ_MODEL`, `GEMINI_MODEL` | Không | |
| Neo4j | `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `NEO4J_DATABASE` | Không | Production dùng 4 biến này (không dùng `NEO4J_CREDENTIALS_FILE`). Giữ `NEO4J_ALLOW_DEMO_WRITE=false` |
| Registry | `UNIVERSE_DB_PATH` | Không | SQLite mã `pending_data`. Không có volume → mất khi redeploy; muốn giữ thì mount volume và trỏ vào, vd. `/data/universe.sqlite3` |
| Registry | `DATA_VERSION`, `METHODOLOGY_VERSION`, `GENERATED_DATA_DIR` | Không | Để mặc định |
| SSI | `SSI_API_KEY`, `SSI_API_SECRET`, `SSI_API_BASE_URL` | Chưa | Adapter chưa kích hoạt |

Đổi file Excel → `npm run data` → build lại image (dữ liệu nằm trong image).

## 3. Frontend (Vercel)

Framework preset Next.js, giữ lệnh build mặc định (`prebuild` tự chạy `npm run data` và `npm run assets`).

| Biến | Giá trị production | Ghi chú |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCK` | `false` | `true` → chạy chỉ với JSON, không cần backend |
| `NEXT_PUBLIC_API_URL` | `https://<backend-domain>` | Không có `/` cuối. Nhúng vào bundle lúc build → đổi thì redeploy |
| `QUANTUM_API_URL` | (bỏ trống) | Route proxy `/api/*` mặc định dùng `NEXT_PUBLIC_API_URL`; chỉ đặt khi server Vercel gọi backend qua địa chỉ khác |
| `UNIVERSE_ID` | `demo-v1` | Không bắt buộc |

Không đặt key Firecrawl/Groq/Gemini/Jina/Neo4j/SSI trên Vercel – frontend không dùng tới.

OSINT chạy dạng job: `POST /api/v1/osint/scans` trả `scan_id` ngay (202), trình duyệt hỏi `GET /api/v1/osint/scans/{id}` mỗi 3 giây qua route proxy – không có request nào giữ kết nối nhiều phút, nên không cần tăng timeout function trên Vercel.

## 4. Kiểm tra sau deploy

1. `https://<backend-domain>/health` → `{"status":"ok"}`.
2. `https://<backend-domain>/api/v1/graph/status` → `state`: `ready`/`ready_empty` nếu kết nối được Neo4j, `unavailable` nếu cấu hình nhưng không kết nối được, `disabled` nếu không cấu hình.
3. Trang chủ Vercel hiện 4 công ty; `/stocks` gọi `/api/universe` trả 200.
4. `/company/VNM` → **Run OSINT scan**: `mode=live`, nguồn `firecrawl`. Nếu thấy cảnh báo "Không kết nối được backend OSINT" → sai URL backend hoặc backend đang ngủ.
5. Browser console không có lỗi CORS.

## 5. Lỗi thường gặp

| Triệu chứng | Nguyên nhân | Xử lý |
|---|---|---|
| Vercel build fail `fetch failed` | Backend chưa chạy/URL sai lúc build | Deploy backend trước, kiểm tra `NEXT_PUBLIC_API_URL`, redeploy |
| OSINT trả `DEMO DATA` | Thiếu `FIRECRAWL_API_KEY` ở backend | Thêm vào secret manager backend, restart |
| Lỗi CORS trong console | `CORS_ORIGINS` thiếu domain frontend | Thêm đúng origin (có `https://`, không `/` cuối) |
| Mã mới đăng ký biến mất | SQLite không nằm trên volume | Mount volume, đặt `UNIVERSE_DB_PATH` |
| Số liệu trang cũ sau khi cập nhật backend | Trang prerender lúc build | Redeploy frontend |
