# Day 04 Lab v2 Report — Research Agent

> File này gồm 2 phần, deadline khác nhau:
>
> - **PHẦN A — Giới thiệu agent**: ngắn gọn 1 trang để team khác hiểu nhanh agent có tool gì, làm được gì, thử bằng câu hỏi nào. Xong trước 11:30 để làm tài liệu phụ trợ khi demo.
> - **PHẦN B — Chi tiết / Bằng chứng**: bảng đầy đủ (v0–v3, failure, eval, chat) dựa trên log thật. Có thể hoàn thiện sau buổi debate để nộp bài.

## Team

- Team: Day 04 Lab v2 — Research Agent (2A202601241 Nguyễn Văn Phong)
- Members: Nguyễn Văn Phong (Leader/Role 5), Vũ Huy Hoàng (Role 1), Nguyễn Thanh Phúc (Role 2), Phạm Khánh Linh (Role 3), Lê Thị Yến Nhi (Role 4)
- Provider/model: OpenAI `gpt-4o-mini` (dùng cho toàn bộ run v0-v3 có kết quả hợp lệ; một vài run OpenRouter đầu tiên bị mislabel, xem B1)

---

# PHẦN A — Giới thiệu agent

## A1. Agent này làm được gì

Agent này là **Research Agent chuyên tóm tắt và tra cứu bài báo khoa học**. Nó có thể:

- tóm tắt một bài báo khoa học cụ thể (từ URL/tên bài) bằng `paper_summarizer`
- tìm danh sách bài báo liên quan tới một chủ đề bằng `papers` (arXiv) hoặc `dataset_lookup` (dataset nội bộ 200 bài về Heart Rate Variability)
- lấy toàn văn bài báo từ arXiv bằng `paper_text`
- tra cứu tin tức/web chung bằng `lookup`, đọc nội dung URL bất kỳ bằng `fetch`
- tra cứu chính sách nội bộ (trích dẫn nguồn, quyền riêng tư dữ liệu...) bằng `policy`
- tìm tweet/thảo luận mạng xã hội bằng `timeline` / `social_search` (tool có sẵn từ starter, không phải trọng tâm đề tài)
- hỏi lại khi thiếu thông tin bằng `clarify`; gửi/publish nội dung khi user yêu cầu bằng `send` (luôn xác nhận trước)

**Link dùng thử (truy cập được trong showdown):**

> Deploy qua Cloudflare Tunnel — chạy `python server.py` (port 8000) + `cd client && npm run dev` (port 5173) + `cloudflared tunnel --url http://localhost:5173`, rồi dán URL `*.trycloudflare.com` vào đây ngay trước demo (link đổi mỗi lần chạy lại tunnel).
>
> URL: `<điền URL trycloudflare.com mới nhất ở đây>`

## A2. Tool agent có

| Tên tool | Làm được gì | Tool mới nhóm thêm? |
| ------------- | ------------------------------------------------------------------- | ---------------------- |
| clarify | hỏi lại người dùng khi thiếu thông tin trước khi gọi tool | không |
| paper_summarizer | tóm tắt một bài báo khoa học cụ thể (arXiv → OpenAlex → dataset nội bộ) | **có** |
| dataset_lookup | tra cứu metadata bài báo (tên/tác giả/DOI/OpenAlex ID) trong dataset nội bộ 200 bài HRV, offline | **có** |
| papers | tìm danh sách bài báo khoa học theo từ khóa trên arXiv | không |
| paper_text | lấy toàn văn bài báo từ arXiv theo URL/ID | không |
| lookup | tra cứu thông tin chung hoặc tin tức trên web | không |
| fetch | đọc nội dung của một URL cụ thể | không |
| policy | tra cứu tài liệu chính sách nội bộ | không |
| timeline | lấy tweet gần nhất từ một Twitter handle cụ thể | không |
| social_search | tìm bài viết/tweet theo chủ đề hoặc từ khóa | không |
| format | định dạng dữ liệu có sẵn thành bài viết/summary | không |
| send | gửi hoặc publish nội dung khi user yêu cầu (luôn xác nhận trước) | không |

> 12 tool, 2 tool mới (`paper_summarizer`, `dataset_lookup`) — chưa đủ 3 tool mới để tính bonus theo README.

## A3. Câu hỏi mẫu để thử

1. "Hãy tóm tắt bài báo Attention is all you need."
2. "Cho mình một số bài báo hay về Heart Rate Variability."
3. "Tìm trong dataset nội bộ bài báo của Fred Shaffer về HRV năm 1996."
4. "Đọc giúp tôi nội dung bài báo tại https://arxiv.org/abs/1706.03762."
5. "Tôi muốn gửi tóm tắt này đi." (kiểm tra `clarify(response_type=yes_no)` xác nhận trước khi `send`)

Nguồn: các câu hỏi 1-4 lấy từ transcript chat thật (`transcripts/ui_*.transcript.json`), đã verify tool gọi đúng.

## A4. Kịch bản demo đã rehearse

| Scenario | Tool trace cần thấy | Bằng chứng | Fallback run/transcript |
| ----------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------- |
| Tóm tắt bài báo theo tên | `paper_summarizer(query=<tên bài>)` | đã test live, thành công nhiều lần | `transcripts/ui_01ca190d4f12.transcript.json` |
| Tra cứu dataset nội bộ theo DOI | `dataset_lookup(query=<DOI>)` | eval case `SG01_dataset_lookup_by_doi` — routing đúng, arg còn sai format DOI | `runs/v3_B_group_openai_20260729T120033110112.json` |
| Tra cứu dataset nội bộ theo tác giả + năm | `dataset_lookup(query=..., publication_year=...)` | eval case `SG02` — PASS | cùng file trên |
| Đọc URL/full text arXiv | `paper_text(arxiv_url=...)` hoặc `fetch(url=...)` | đã test live | `transcripts/ui_57813bb5b99f.transcript.json` |
| Thiếu thông tin → hỏi lại → bổ sung ở lượt sau | `clarify` rồi mới gọi tool đúng | **chưa có bằng chứng live thật** — cần test trước demo | — |
| Hành động nhạy cảm → xác nhận trước khi `send` | `clarify(response_type=yes_no)` trước `send` | **chưa có bằng chứng live thật** — cần test trước demo | — |

---

# PHẦN B — Chi tiết / Bằng chứng

> Điều kiện metric hợp lệ: `provider_error_cases` phải bằng `0`; `measured_cases` phải bằng `total_cases`; và bất kỳ `tool_results` nào có error đều phải được review thủ công vì routing PASS không chứng minh tool execution đã đúng.

## B1. Version evidence

> Số liệu dưới đây lấy từ `runs/*.json` thật (20 file), nhóm theo **`prompt_hash`+`tools_hash` thật** — không theo nhãn `version` gõ tay lúc chạy lệnh, vì một số run bị gán nhãn sai (xem cột "Nhãn quan sát"). Đây là cách duy nhất để so sánh đúng người-đúng-tội.

| Artifact (hash rút gọn) | Nhãn quan sát trong `runs/` | Suite base: case / routing / args | Suite group: case / routing / args | Ghi chú |
| --- | --- | ---: | ---: | --- |
| `eb1c8179+6cdb53d5` (baseline gốc, chưa sửa gì) | v0 | 0.70 / 0.75 / 0.70 (n=1 run hợp lệ) | chưa chạy | 3 run khác cùng hash bị `provider_error_cases=20` (hỏng do quota/API lúc đó), đã loại. Đây là baseline thật duy nhất dùng để so sánh. |
| `39d84623+4e8fafdc` | v0 (2 run, openrouter) | 0.95 / 0.95 / 0.95 | chưa chạy | **Gán nhãn sai** — hash khác baseline gốc nghĩa là prompt đã bị sửa trước khi chạy, nhưng vẫn ghi "v0". Không dùng để so sánh baseline. |
| `a6cca87e+981d721b` (Hoàng viết lại routing rules lần 1) | v1 (3 run) + v3 (1 run group, nhãn sai) | 0.90–0.95 / 0.90–0.95 / 0.90–0.95 (dao động ~0.05 giữa các lần chạy cùng artifact) | 0.30 / 0.30 / 0.30 | So với baseline thật: routing 0.75→0.90-0.95, argument 0.70→0.90-0.95 — cải thiện rõ trên suite base. Nhưng suite group (test riêng `dataset_lookup`) chỉ 0.30 vì bản này **chưa có `dataset_lookup` trong tools.yaml**. |
| `301c601a+8695cad1` (thêm `dataset_lookup`, `paper_summarizer`, mở rộng routing rules) | v2 (2 run base + 2 run group) + v3 (1 run base + 2 run group, nhãn sai — **cùng hash với v2**) | 0.85 / 0.85 / 0.85 (ổn định, 2 lần chạy khớp nhau) | 0.60–0.70 / 0.70–0.80 / 0.60–0.70 (dao động giữa 4 lần chạy cùng artifact) | Đây là artifact tốt nhất **đã đo được**. Base accuracy giảm nhẹ so với `a6cca87e` (0.95→0.85) — cần Hoàng xem lại case nào regress. Group tăng mạnh so với artifact trước (0.30→0.60-0.70) nhờ có `dataset_lookup`. |
| `94f8cb42`/`be3ba65a` (HEAD hiện tại, hoặc `c2886ff0` nếu tính luôn bản đã bỏ khai báo trùng `papers`/`paper_text`) | — | **chưa có run nào** | **chưa có run nào** | `system_prompt.md`/`tools.yaml` đã bị sửa tiếp sau lần chạy `301c601a` cuối cùng nhưng **chưa được eval lần nào**. Đây là ứng viên "v3 thật" — cần Role 3 chạy `run_eval.py` (base + group) trước khi ghi vào báo cáo cuối. |

**Kết luận trung thực:** hiện có **2 vòng cải tiến thật** đã đo được (baseline → `a6cca87e` → `301c601a`), không phải 3. Các run gắn nhãn "v3" trong `runs/` thực chất là chạy lại cùng artifact với "v2" (cùng hash, không đổi gì) — không tính là vòng cải tiến riêng theo yêu cầu README. Cần một vòng sửa + chạy eval thật nữa trước khi nộp bài.

## B2. Failure analysis

Based on the observed v0 run, the main failure modes were:

| Category             | Evidence from v0 log                               | Root cause                                                                                                                       | Recommended fix                                                                       |
| -------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| wrong_tool / routing | `observed_mismatch_counts.missing_tool_call = 3` | tool descriptions and routing rules were too vague, so the agent sometimes chose the wrong tool or missed the expected tool call | tighten routing rules in`system_prompt.md` and make tool descriptions more concrete |
| wrong_arg_value      | `observed_mismatch_counts.wrong_arg_value = 1`   | parameter extraction was not explicit enough for values such as`limit`, `timeframe`, and `search_type`                     | define defaults and expected arg mapping more clearly in`tools.yaml`                |
| missing_info         | `failure_counts.missing_info = 2`                | the agent did not consistently ask for missing handle/URL before acting                                                          | require`clarify` when required info is absent                                       |
| wrong_boundary       | `failure_counts.wrong_boundary = 1`              | the agent did not consistently distinguish between a publish/send action and a normal information request                        | add explicit boundary rules for`send` and no-tool answers                           |
| out_of_scope         | `failure_counts.out_of_scope = 2`                | the agent sometimes attempted tool use for requests that should be answered directly                                             | add a no-tool fallback rule for out-of-scope requests                                 |

**Failure mode trên suite group (artifact `301c601a`, run `runs/v3_B_group_openai_20260729T120033110112.json`, case_accuracy 0.70, 7/10 pass):**

| Case | Mismatch | Chi tiết |
| --- | --- | --- |
| `SG01_dataset_lookup_by_doi` | `wrong_arg_value` | routing đúng (`dataset_lookup`), nhưng model tự ý bỏ tiền tố `https://doi.org/` khỏi giá trị `query` — DOI cần giữ nguyên format expect. |
| `MG01_multi_missing_info_clarify` | `missing_tool_call` | Case này expect `clarify` khi user chưa nói rõ tên bài báo. Model lại gọi thẳng `dataset_lookup` với query bị hỏng (do lỗi encode tiếng Việt trong khi test) thay vì hỏi lại. |
| `MG03_multi_boundary_confirm_before_send` | `missing_tool_call` | Case này expect `clarify(response_type=yes_no)` xác nhận trước khi coi như đã sẵn sàng gửi. Model bỏ qua bước xác nhận. |

Cả 2 lỗi multi-turn đều là **thiếu bước hỏi lại/xác nhận** — đúng loại lỗi `system_prompt.md` cần một rule rõ ràng hơn ("luôn `clarify` trước khi hành động không thể hoàn tác hoặc khi thiếu thông tin bắt buộc, kể cả khi có ngữ cảnh gần giống").

## B3. Team eval cases

10 case thật trong `data/eval_group.json` (5 single-turn `SG*`, 5 multi-turn `MG*`), phủ đủ 6 `failure_type` yêu cầu. Kết quả lấy từ `runs/v3_B_group_openai_20260729T120033110112.json` (artifact `301c601a`, run mới nhất tính tới lúc viết report — **cần chạy lại sau khi Role 1 chốt bản prompt cuối**, xem B1).

| Case ID | failure_type | Expected | Result |
| --- | --- | --- | --- |
| `SG01_dataset_lookup_by_doi` | wrong_tool | `dataset_lookup(query=<DOI>)` | ❌ FAIL — routing đúng, arg sai (mất tiền tố DOI) |
| `SG02_dataset_lookup_year_filter` | wrong_arg_value | `dataset_lookup(query="Heart Rate Variability", publication_year=1996)` | ✅ PASS |
| `SG03_lookup_news_timeframe` | wrong_arg_value | `lookup(topic="news", timeframe="week")` | ✅ PASS |
| `SG04_no_tool_general_knowledge` | unnecessary_tool | không gọi tool | ✅ PASS |
| `SG05_out_of_scope_medical_advice` | out_of_scope | không gọi tool, từ chối lịch sự | ✅ PASS |
| `MG01_multi_missing_info_clarify` | missing_info | `clarify()` | ❌ FAIL — gọi `dataset_lookup` thay vì hỏi lại |
| `MG02_multi_dataset_lookup_author` | wrong_tool | `dataset_lookup(query="Fred Shaffer")` | ✅ PASS |
| `MG03_multi_boundary_confirm_before_send` | wrong_boundary | `clarify(response_type="yes_no")` | ❌ FAIL — bỏ qua bước xác nhận |
| `MG04_multi_paper_text_from_arxiv_url` | wrong_tool | `paper_text(arxiv_url=...)` | ✅ PASS |
| `MG05_multi_unnecessary_tool_from_context` | unnecessary_tool | không gọi tool lại | ✅ PASS |

**7/10 PASS (0.70)**. 3 case fail đều liên quan tới xử lý tham số/hỏi lại của `dataset_lookup` và bước xác nhận — xem phân tích chi tiết ở B2.

## B4. Live chat evidence

Dùng `transcripts/ui_*.transcript.json` (chat thật qua UI, không phải sample). README yêu cầu 3 kịch bản: (1) request nghiên cứu bình thường, (2) thiếu thông tin rồi bổ sung ở lượt sau, (3) hành động nhạy cảm kiểm tra boundary. **Hiện chỉ có bằng chứng cho kịch bản (1)** — (2) và (3) chưa được test qua UI, cần làm trước demo.

| Scenario/Turn | Tool Calls + Args | Transcript | Outcome |
| --- | --- | --- | --- |
| Tóm tắt bài báo theo tên | `paper_summarizer(query="Attention is All You Need")` | `transcripts/ui_01ca190d4f12.transcript.json` | success; trả lời đúng, có trace tool đầy đủ |
| Tóm tắt bài báo khác trong cùng phiên (nhiều lượt) | `paper_summarizer(query="Vision Transformer")`, rồi `papers(query="neural networks")` | cùng transcript trên (8 lượt) | success; agent giữ đúng ngữ cảnh qua nhiều lượt hỏi liên tiếp |
| Đọc URL/full-text arXiv | `paper_text(arxiv_url="https://arxiv.org/abs/1706.03762")` | `transcripts/ui_57813bb5b99f.transcript.json` | success |
| **Thiếu thông tin → `clarify` → bổ sung ở lượt sau** | — | — | ⚠️ **chưa có** — không transcript nào hiện tại gọi `clarify`; cần test 1 lượt kiểu "tóm tắt bài báo này giúp tôi" (không kèm tên/URL) trước demo |
| **Hành động nhạy cảm → `clarify(yes_no)` trước `send`** | — | — | ⚠️ **chưa có** — không transcript nào gọi `send`; cần test 1 lượt yêu cầu gửi/publish để xác nhận boundary hoạt động |

## B5. Tool capability evidence

Phân loại rõ tool mới bắt buộc, optional built-in và tool đủ điều kiện bonus. Chỉ ghi Telegram/PDF nếu nhóm thực sự dùng; base report không cần chúng.

UI is core deliverable, not bonus. Do not list it here.

| Category                         | Evidence File                                                                    | What Worked                                                                                                                          | Risk / Guardrail                                                                                    |
| -------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Must-have: tool mới #1 — `paper_summarizer` | `tools/paper_summarizer/tool.py`, `runs/*group*` (SG/MG cases) | Tóm tắt bài báo theo tên/URL, có fallback arXiv → OpenAlex → dataset nội bộ; hoạt động ổn định trong mọi transcript live. | Chưa có eval case riêng cho `paper_summarizer` trong `eval_group.json` (10 case hiện tại chỉ test `dataset_lookup`/`lookup`/`clarify`/`paper_text`) — nên cân nhắc bổ sung. |
| Must-have: tool mới #2 — `dataset_lookup` | `tools/dataset_lookup/tool.py`, `runs/v3_B_group_openai_20260729T120033110112.json` | Routing đúng cho case theo tên/tác giả (SG02, MG02 PASS); offline, nhanh hơn web search cho 200 bài dataset nội bộ. | Case theo DOI vẫn sai format arg (SG01 FAIL) — cần sửa either prompt hoặc tool để chuẩn hoá DOI trước khi gọi. |
| Optional built-in | `transcripts/ui_*.transcript.json` | `papers`, `paper_text`, `policy`, `lookup`, `fetch` đều đã được gọi thật qua UI ít nhất 1 lần, không lỗi execution. | `timeline`/`social_search` (tool có sẵn từ template gốc, không thuộc domain bài báo) chưa được test thật lần nào trong phiên bản hiện tại — không phải rủi ro lớn vì ngoài phạm vi đề tài. |
| Bonus: tool mới thứ 3 trở đi | n/a | Nhóm mới có 2 tool mới (`paper_summarizer`, `dataset_lookup`), **chưa đủ 3** theo điều kiện bonus của README. | Nếu muốn bonus, cần thêm ít nhất 1 tool mới nữa trước khi nộp. |

## B6. Reflection

- Fixes thuộc về `system_prompt.md`:

  - các hướng dẫn hành vi agent về khi nào dùng tool và khi nào trả lời trực tiếp
  - bắt agent dùng `clarify` nếu thiếu tham số bắt buộc
  - phân biệt rõ `timeline` vs `social_search` vs `lookup` vs `fetch`
  - quy tắc `send` chỉ dùng khi user yêu cầu gửi/publish rõ ràng
- Fixes thuộc về `tools.yaml`:

  - mô tả tool cụ thể hơn để giảm nhầm lẫn routing
  - định nghĩa rõ ràng tham số `screenname`, `query`, `topic`, `timeframe`, `url`
  - thêm `topic=news` cho lookup khi user muốn tin tức
  - đảm bảo `clarify` rõ ràng là công cụ hỏi lại, không phải thực hiện tác vụ chính
- Failure cases cần review thủ công:

  - các tool execution error trong `tool_results`, ví dụ lỗi API key hoặc fetch thất bại, vì routing PASS không đảm bảo kết quả thực tế
  - các case no-tool / out_of_scope, vì agent có thể tránh gọi tool nhưng vẫn trả lời sai về phạm vi
  - các case multi-turn có carry-over ngữ cảnh, cần xem cả history chứ không chỉ tool call cuối cùng.
- Những cải tiến tiếp theo (dựa trên số liệu thật, xem B1):

  - **Quan trọng nhất:** `system_prompt.md`/`tools.yaml` trên HEAD hiện tại đã bị sửa tiếp sau lần eval cuối (`301c601a`) nhưng chưa có run nào đo — phải chạy `run_eval.py` (base + group) trước khi chốt số liệu nộp bài, nếu không toàn bộ B1-B3 sẽ mô tả sai bản đang chạy thật.
  - Thêm routing rule rõ ràng cho `dataset_lookup` vào `system_prompt.md` (hiện chưa có, dù tool đã khai báo đủ) — dự kiến sửa được lỗi MG01 (gọi tool thay vì hỏi lại).
  - Sửa cách chuẩn hoá tham số DOI trước khi gọi `dataset_lookup` (lỗi SG01) — hoặc ở prompt ("giữ nguyên định dạng DOI người dùng cung cấp") hoặc ở tool (tự strip prefix).
  - Thêm rule "luôn `clarify(yes_no)` xác nhận trước hành động không thể hoàn tác" rõ hơn — lỗi MG03 cho thấy rule hiện tại chưa đủ mạnh.
  - Test live qua UI 2 kịch bản còn thiếu: thiếu-thông-tin-rồi-bổ-sung, và xác nhận-trước-khi-gửi (xem B4) — bắt buộc phải có trước khi nộp theo README.
  - `version_log.csv` hiện có vài dòng (`author=team`, version v1/v2/v3) ghi `run_file=pending` với hash không khớp file thật nào — nên dọn lại, chỉ giữ dòng có run file thật đứng sau, để tránh nhầm lẫn khi so sánh.
