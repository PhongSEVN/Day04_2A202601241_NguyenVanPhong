# Handoff từ Role 4 — Lê Thị Yến Nhi

Kết quả rà soát đồng bộ sau khi pull `origin/main` (`074cde6`).
Phần 1 là những gì đã sửa xong. Phần 2 là việc **không thuộc quyền Role 4**, cần từng người xử lý.

---

## PHẦN 1 — Đã sửa và đã verify

### 1.1 `artifacts/tools.yaml` — thêm declaration `dataset_lookup`

**Lỗi:** `dataset_lookup` đã được đăng ký trong `tools/__init__.py` và có đủ `tool.py` + `TOOL.md`,
nhưng **không hề được khai báo trong `tools.yaml`**. Grep chuỗi `dataset_lookup` cho kết quả **0 lần**
trong `tools.yaml`, `system_prompt.md`, `eval_base.json`.

**Hậu quả:** model không nhìn thấy tool → không bao giờ gọi được → yêu cầu "≥1 tool mới" chỉ đạt trên giấy.

**Đã sửa:** thêm declaration với `query` (required), `publication_year`, `max_results`.
Description nêu rõ khi nào dùng (user nhắc tên paper/tác giả/DOI cụ thể) và giới hạn (chỉ metadata, không có abstract).

> ⚠️ **Việc này làm `tools_hash` thay đổi.** Đã ghi thành dòng `v2-pending` riêng trong `version_log.csv`
> để không bị quy nhầm cho giả thuyết của Role 1.

### 1.2 `data/eval_group.json` — viết lại 10 case

**Lỗi của bộ cũ:**

- Cả 10 case chỉ expect `fetch` và `lookup`. **Không case nào test `dataset_lookup`** — tool duy nhất
  nhóm tự viết. Cũng không case nào chạm `papers` / `paper_text`, trong khi đề tài là tóm tắt nghiên cứu khoa học.
- Nhãn sai: `MG01` gắn `missing_info` nhưng expect `lookup` (phải là `clarify`);
  `MG05` gắn `wrong_boundary` nhưng expect `fetch` (boundary phải dính `send` / `clarify` yes_no).
- Thiếu 2 loại: `unnecessary_tool`, `out_of_scope`.

**Sửa được an toàn vì:** cả 9 run trong `runs/` đều là `suite=base`, **chưa ai chạy suite group lần nào**
→ thay case không phá vỡ so sánh version nào.

**Bộ mới — 10 case, phủ đủ 6 failure_type:**

| ID                                           | Loại            | Kiểu  | Test gì                                                        |
| -------------------------------------------- | ---------------- | ------ | --------------------------------------------------------------- |
| `SG01_dataset_lookup_by_doi`               | wrong_tool       | single | DOI + "dataset nội bộ" →`dataset_lookup`, không `fetch` |
| `SG02_dataset_lookup_year_filter`          | wrong_arg_value  | single | Phải truyền`publication_year=1996` để lọc trùng tên    |
| `SG03_lookup_news_timeframe`               | wrong_arg_value  | single | `topic=news` + `timeframe=week`                             |
| `SG04_no_tool_general_knowledge`           | unnecessary_tool | single | "HRV viết tắt của gì" → không gọi tool                   |
| `SG05_out_of_scope_medical_advice`         | out_of_scope     | single | Từ chối chẩn đoán y tế cá nhân                          |
| `MG01_multi_missing_info_clarify`          | missing_info     | multi  | 3 lượt vẫn thiếu tên paper →`clarify`                   |
| `MG02_multi_dataset_lookup_author`         | wrong_tool       | multi  | Ghép ngữ cảnh ra "Fred Shaffer" →`dataset_lookup`         |
| `MG03_multi_boundary_confirm_before_send`  | wrong_boundary   | multi  | Gửi Telegram →`clarify(response_type=yes_no)` trước       |
| `MG04_multi_paper_text_from_arxiv_url`     | wrong_tool       | multi  | arXiv URL + đọc nội dung →`paper_text`                    |
| `MG05_multi_unnecessary_tool_from_context` | unnecessary_tool | multi  | Đã có trong ngữ cảnh → không tra lại                    |

Đã verify: `validate_expected_tools` PASS, 5 single + 5 multi, mọi multi-turn kết thúc bằng user turn,
mọi case đủ `id` / `phase` / `failure_type` / `expect` / `metadata.what_it_tests`.
Dữ liệu lấy thật từ `data/dataset.json` (200 paper OpenAlex, đã kiểm tra Fred Shaffer có 3 paper, HRV 1996 có trong dataset).

### 1.3 `artifacts/version_log.csv` — điền 11 dòng

Trước đó **chỉ có dòng header** dù đã có run v0 và v1. Đã sinh từ 5 run hợp lệ
(2 metric mỗi run) + 1 dòng `v2-pending` cho thay đổi `tools.yaml` ở mục 1.1.

4 run bị loại vì `provider_error_cases = 20` (hỏng hoàn toàn): `v0_baseline.json` và 3 run lúc 10:31–10:38.

### 1.4 `client/src/components/AgentTrace.tsx` — 2 lỗi UI

- **Thiếu `round` / `status` trong trace.** README dòng 45 yêu cầu trace phải có
  *"tên tool, args, round/status, result/error"*. Đã thêm `enrich_tool_events()` trong `server.py`
  và hiển thị header `ROUND n`, badge `round n`, chip `OK` / `LỖI` / `CHỜ USER`.
- **Tô đỏ kết quả thành công.** `dataset_lookup` trả `"error": null` khi thành công, nhưng
  `isErrorResult()` chỉ kiểm tra key có tồn tại → mọi lần gọi thành công đều bị đánh dấu lỗi. Đã sửa thành xét giá trị.

### 1.5 Môi trường — cài `pypdf`

`paper_text` trước đó trả `RuntimeError: Install pypdf first`. `requirements.txt` đã ghi `pypdf>=4.0.0`
nhưng chưa ai cài. Đã cài `pypdf 6.14.2`, test lại: đọc được `arxiv.org/abs/1706.03762`, 15 trang, 7118 ký tự.

### Kiểm tra tổng thể sau khi sửa

```
tools.yaml: 11  |  TOOL_FUNCTIONS: 11  |  lệch: không
eval_base.json            OK  20 cases
eval_group.json           OK  10 cases
eval_research_extension   OK  10 cases
version_log.csv: 11 dòng  |  versions: v0, v1, v2-pending
tsc --noEmit: PASS  |  console browser: sạch
```

Chat test thật: hỏi *"Tim trong dataset noi bo bai bao ten Heart Rate Variability nam 1996"*
→ agent gọi `dataset_lookup` với `{query: "Heart Rate Variability", publication_year: 1996}`,
`round: 1`, `status: ok`, trả lời đúng từ dataset local.

---

## PHẦN 2 — Không sửa được, cần từng người xử lý

### 2.1 → Vũ Huy Hoàng (Role 1): thêm routing rule vào `system_prompt.md`

Không tự sửa vì đây là vùng tối ưu prompt của Role 1, sửa vào sẽ làm hỏng quy kết metric v1→v2→v3.

Declaration đã đủ để model gọi được `dataset_lookup`, nhưng thêm rule sẽ tăng độ chính xác định tuyến.
Chèn vào danh sách routing rule:

```
- `dataset_lookup`: use when the user names a specific paper title, author, DOI,
  or OpenAlex ID. Prefer it over `lookup` for known papers — it is offline and
  returns exact metadata. It has no abstract or full text; use `paper_text` for those.
```

### 2.2 → Nguyễn Thanh Phúc (Role 2): `TAVILY_API_KEY` đang rỗng

`lookup` trả `RuntimeError: Missing TAVILY_API_KEY env var` mỗi lần gọi.
Cần điền key vào `starter_v0/.env`. Xem `TOOL-SETUP.md`.

Ảnh hưởng: metric eval **vẫn tính được** (grader chỉ chấm tên tool + args, không chấm kết quả),
nhưng **demo trực tiếp sẽ hiện lỗi đỏ** mỗi lần agent gọi `lookup`.

Kiểm tra luôn `FIRECRAWL_API_KEY` (tool `fetch`) — 5/10 case eval_group cũ dùng `fetch`.

### 2.3 → Phạm Khánh Linh (Role 3): chạy lại eval

Hai lý do bắt buộc chạy lại:

1. `tools.yaml` giờ có 11 tool thay vì 10 → kết quả trên `suite=base` có thể đổi.
2. `eval_group.json` đã thay toàn bộ 10 case → chưa có số liệu nào cho suite group.

```bash
python run_eval.py --provider openai --version v2 --suite base --eval-cases data/eval_base.json
python run_eval.py --provider openai --version v2 --suite group --eval-cases data/eval_group.json
```

> **Khóa một provider duy nhất từ giờ.** Lý do ở mục 2.4.

### 2.4 → Nguyễn Văn Phong (Role 5): hai cảnh báo cho REPORT.md

**(a) Các run đang trộn provider — dễ kết luận sai.**

| Run        | Provider         | prompt_hash | routing | args |
| ---------- | ---------------- | ----------- | ------- | ---- |
| v0 (09:30) | **openai** | `eb1c81`  | 0.75    | 0.70 |
| v0 (11:00) | openrouter       | `39d846`  | 0.95    | 0.95 |
| v0 (11:01) | openrouter       | `39d846`  | 0.95    | 0.95 |
| v1 (11:02) | **openai** | `a6cca8`  | 0.90    | 0.90 |
| v1 (11:03) | **openai** | `a6cca8`  | 0.95    | 0.95 |

Nếu lấy v0 openrouter (0.95) so với v1 openai (0.95) → báo cáo sẽ kết luận **"không cải thiện"**, sai.
So đúng cùng provider `openai`: **v0 → v1 là 0.75 → 0.95 routing, 0.70 → 0.95 args**.

Dùng cặp `v0_B_base_openai_20260729T093024057807.json` → `v1_B_base_openai_20260729T110319950283.json`.

**(b) Hai run "v0" lúc 11:00–11:01 bị gán nhãn sai.**
`prompt_hash` của chúng là `39d846`, khác baseline thật `eb1c81` — nghĩa là prompt đã bị sửa rồi
nhưng vẫn gắn nhãn v0. **Không dùng làm baseline.** Baseline thật là run openai lúc 09:30.

**(c) Có variance giữa các lần chạy.** Hai run v1 cùng `prompt_hash`, cùng `tools_hash`, cùng provider
nhưng cho 0.90 và 0.95. Chênh ~0.05 là nhiễu, không phải cải thiện — cần nói rõ trong phần reflection.

### 2.5 → Cả nhóm: `PROJECT_PLAN.md` và `TEAMMATE.md` ghi sai công nghệ UI

Cả hai file ghi Role 4 làm `app.py` bằng Streamlit. Thực tế UI là **Flask (`server.py`) + React/Vite (`client/`)**.
README dòng 28 và 31 cho phép mọi framework nên không sai yêu cầu, nhưng người chấm đọc plan xong
đi tìm `app.py` sẽ không thấy. Phong cập nhật lại giúp.

### 2.6 Còn thiếu để nộp bài

- [ ] `version_log.csv` cần thêm dòng cho v2 và v3 (hiện có v0, v1, v2-pending)
- [ ] `REPORT.md` Phần A + Phần B
- [ ] `transcripts/` mới có 2 file; README dòng 253 yêu cầu **3 kịch bản live turn cụ thể**:
  (1) research bình thường ✓ đã có — (2) thiếu thông tin rồi bổ sung ở lượt sau ✗ — (3) hành động nhạy cảm kiểm tra boundary ✗
- [ ] URL Cloudflare Tunnel dán vào REPORT Phần A: `https://theory-slide-incidents-automobiles.trycloudflare.com`
  (đã test HTTP 200 — **đừng tắt `cloudflared`**, chạy lại sẽ sinh URL ngẫu nhiên mới)
