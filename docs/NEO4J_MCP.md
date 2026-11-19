# Neo4j Aura và MCP

## Kết nối ứng dụng

Ứng dụng FastAPI dùng Neo4j Python driver với truy vấn read-only được viết sẵn. LLM không tự sinh Cypher. Trong local demo, `backend/.env` trỏ đến file thông tin DB nằm ngoài repo; khi deploy, đặt `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` và `NEO4J_DATABASE` trong secret manager của backend.

Kết quả kiểm tra ngày 19-11-2026: kết nối Aura thành công, database `neo4j` đang rỗng. Khi cần tạo dữ liệu demo từ workbook, chạy lệnh seed được ghi trong [backend README](../backend/README.md). Lệnh ghi yêu cầu bật `NEO4J_ALLOW_DEMO_WRITE=true` cho đúng lần chạy đó; API không seed lúc startup.

## MCP cho IDE/client

Aura có hosted MCP riêng. Bật **Tool authentication** trong Aura Console, lấy MCP URL trong trang Inspect instance, rồi cấu hình client. Với instance được cung cấp, URL theo mẫu `https://<instance-id>.mcp-instances.neo4j.io`; không dùng password DB hay Aura API client secret trong cấu hình hosted MCP. Lần kết nối đầu tiên client sẽ mở trình duyệt để đăng nhập OAuth.

Ví dụ cấu hình VS Code (`.vscode/mcp.json`):

```json
{
  "servers": {
    "neo4j-aura": {
      "type": "http",
      "url": "https://71839178.mcp-instances.neo4j.io"
    }
  }
}
```

Hoặc Claude Code:

```bash
claude mcp add --transport http neo4j-aura https://71839178.mcp-instances.neo4j.io
```

Codex CLI đã được đăng ký server `neo4j-aura` trong cấu hình người dùng. Hoàn tất OAuth một lần bằng lệnh dưới đây rồi xác nhận trạng thái:

```bash
codex mcp login neo4j-aura
codex mcp list
```

Aura MCP có các công cụ đọc và một công cụ đọc/ghi riêng; với database dùng chung, chỉ dùng công cụ đọc. Codex hiện chưa xác thực cho đến khi chủ tài khoản hoàn tất bước OAuth trên máy của mình.

MCP server cho phép client đọc schema và truy vấn graph theo tool được cấp. Bắt đầu bằng read-only; không bật công cụ ghi cho graph đang dùng chung. Xem [Neo4j Aura MCP quickstart](https://neo4j.com/docs/mcp/current/quickstart/) và [Neo4j MCP tools](https://neo4j.com/docs/mcp/current/tools/).

## Phân biệt các thông tin trong ba file

- File `Neo4j-...Created...` có Bolt URI, database username/password; ứng dụng driver dùng loại credential này.
- Hai file `Neo4j-credentials-test...` chứa Aura API client credentials. Chúng dùng cho Aura management API, không thay thế Bolt login và không cần cho hosted MCP browser OAuth. Không chuyển chúng vào file env của app.

## Secret locations

- Local: `backend/.env` (FastAPI, chứa thông tin Neo4j); `.env.local` ở root chỉ cho Next.js. Cả hai đang được ignore.
- Example committed to Git: `backend/.env.example` (biến Neo4j) và `.env.example` (frontend), chỉ tên biến và giá trị giả.
- Production: secret manager của từng runtime. Frontend host nhận API URL; FastAPI host nhận provider keys và Neo4j connection secrets. Không đưa secret vào `NEXT_PUBLIC_*` hoặc image build args.
