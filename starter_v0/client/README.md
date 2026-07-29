# Research Agent — Web Client

Giao diện chat cho Research Agent (Day 04 Lab v2). Xây dựng bằng React 19 + Vite + TailwindCSS 4.

## Chạy local

Cần 2 terminal, mở tại `starter_v0/`:

```bash
# Terminal 1 — backend (đọc artifacts/system_prompt.md, tools.yaml, gọi provider thật)
python server.py

# Terminal 2 — frontend
cd client
npm install
npm run dev
```

Truy cập: `http://localhost:5173`. Vite proxy sẵn `/api` → `http://localhost:8000` (xem `vite.config.ts`), nên không cần cấu hình gì thêm và API key không lọt xuống trình duyệt.

## Build production

```bash
npm run build
npm run preview
```

## Cấu trúc

```
src/
├── pages/
│   └── ChatPage.tsx        Khung chat chính: sidebar (lịch sử, memories, tools) + hội thoại
├── components/
│   ├── AgentTrace.tsx       Hiển thị trace từng round: tool gọi, tham số, kết quả/lỗi
│   └── Markdown.tsx         Render Markdown nhẹ cho câu trả lời của agent
└── lib/
    ├── api.ts               Gọi backend Flask (server.py)
    └── utils.ts             Helper class name (cn)
```

## Tính năng UI

- Chat với Research Agent, hiển thị trace tool call (tên tool, tham số, kết quả/lỗi) từng round.
- **Lịch sử trò chuyện**: mỗi phiên chat được backend lưu thành `transcripts/ui_<id>.transcript.json`; sidebar liệt kê để mở lại hoặc xoá.
- **Memories**: các fact được agent ghi nhớ xuyên suốt phiên (câu hỏi đã hỏi lại, bài báo đã tra cứu...), trích từ tool call thật, không phải mock.
- Badge version đang chạy (đọc từ `artifacts/version_log.csv` + hash của `system_prompt.md`/`tools.yaml`).

## Deploy public (Cloudflare Tunnel)

Xem hướng dẫn ở `README.md` gốc của repo và `TOOL-SETUP.md`. Tóm tắt:

```bash
# Terminal 3, sau khi cả server.py và npm run dev đã chạy
cloudflared tunnel --url http://localhost:5173
```
