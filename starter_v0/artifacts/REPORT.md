# Day 04 Lab v2 Report — Research Agent

> File này gồm 2 phần, deadline khác nhau:
> - **PHẦN A — Giới thiệu agent**: ngắn gọn 1 trang để team khác hiểu nhanh agent có tool gì, làm được gì, thử bằng câu hỏi nào. Xong trước 11:30 để làm tài liệu phụ trợ khi demo.
> - **PHẦN B — Chi tiết / Bằng chứng**: bảng đầy đủ (v0–v3, failure, eval, chat) dựa trên log thật. Có thể hoàn thiện sau buổi debate để nộp bài.

## Team

- Team:
- Members:
- Provider/model:

---

# PHẦN A — Giới thiệu agent

## A1. Agent này làm được gì

Agent này là một research assistant chuyên tìm và tổng hợp thông tin. Nó có thể:
- truy vấn tweet của một tài khoản cụ thể bằng `timeline`
- tìm thảo luận về chủ đề trên mạng xã hội bằng `social_search`
- tra cứu tin tức/web chung bằng `lookup`
- đọc nội dung từ một URL cụ thể bằng `fetch`
- hỏi lại khi thiếu thông tin bằng `clarify`
- gửi/publish nội dung khi user yêu cầu bằng `send`

**Link dùng thử (truy cập được trong showdown):**

> Nếu demo trực tiếp, dùng `localhost`; nếu share được, dán public URL ở đây.
>
> URL: `https://example-demo-url.local`

## A2. Tool agent có

| Tên tool | Làm được gì | Tool mới nhóm thêm? |
|---|---|---|
| clarify | hỏi lại người dùng khi thiếu thông tin trước khi gọi tool | không |
| timeline | lấy tweet gần nhất từ một Twitter handle cụ thể | không |
| social_search | tìm bài viết/tweet theo chủ đề hoặc từ khóa | không |
| lookup | tra cứu thông tin chung hoặc tin tức trên web | không |
| fetch | đọc nội dung của một URL cụ thể | không |
| format | định dạng dữ liệu có sẵn thành bài viết/summary | không |
| send | gửi hoặc publish nội dung khi user yêu cầu | không |

## A3. Câu hỏi mẫu để thử

1. "Hãy cho tôi tweet mới nhất của Sam Altman."
2. "Mọi người đang nói gì về GPT-5 trên Twitter?"
3. "Tin tức AI hôm nay có gì nổi bật?"
4. "Đọc giúp tôi nội dung bài này: https://example.com/article"
5. "Tôi đã sẵn sàng, hãy gửi thông báo này đi."

## A4. Kịch bản demo đã rehearse

| Scenario | Tool trace cần thấy | Câu chuyện cải thiện version | Fallback run/transcript |
|---|---|---|---|
| Tìm tweet của người nổi tiếng | `clarify` nếu thiếu handle, sau đó `timeline(screenname=...)` | v1: đúng tool `timeline` thay vì `social_search` | R01/R10 |
| Tìm thảo luận theo chủ đề | `social_search(query=..., search_type=Latest)` | v1: phân biệt `social_search` và `timeline` | R02/R07 |
| Tìm tin tức hôm nay | `lookup(query=..., topic=news, timeframe=day)` | v2: gán timeframe chính xác cho "hôm nay" | R03/R06 |
| Đọc URL cụ thể | `clarify` nếu thiếu url, sau đó `fetch(url=...)` | v2: clarify khi thiếu tham số bắt buộc | R04/R11 |
| Trả lời không cần tool | không gọi tool nếu user chỉ hỏi nội dung chung | v3: boundary no-tool đúng | R08/R14 |

---

# PHẦN B — Chi tiết / Bằng chứng

> Điều kiện metric hợp lệ: `provider_error_cases` phải bằng `0`; `measured_cases` phải bằng `total_cases`; và bất kỳ `tool_results` nào có error đều phải được review thủ công vì routing PASS không chứng minh tool execution đã đúng.

## B1. Version evidence

Fill from `artifacts/version_log.csv` and `runs/*.json`.

| Version | Prompt/tool change | Hypothesis | Metric name | Before | After | Run File |
|---|---|---|---|---:|---:|---|
| v0 | baseline prompt + vague tool descriptions | Baseline agent often chooses the wrong tool for social vs user tweet vs news requests, and does not clarify missing params. | tool_selection_accuracy; argument_accuracy; case_accuracy | tool_selection_accuracy ~0.75; argument_accuracy ~0.70; case_accuracy ~0.70 | baseline | `runs/v0_B_base_openai_20260729T093024057807.json` |
| v1 | clarify tool roles in `system_prompt.md` and `tools.yaml` | If routing guidance is explicit, the agent will choose the correct tool more consistently for tweets, social search, lookup, and fetch. | tool_selection_accuracy; wrong_tool_rate | 0.75 | target 0.90+ | pending |
| v2 | require `clarify` for missing required args and tighten parameter definitions | If the agent is forced to ask when required input is missing and tool args are described clearly, argument accuracy will improve and missing-info failures will drop. | parameter_extraction_accuracy; missing_info_rate; args_correct | 0.70 | target 0.90+ | pending |
| v3 | add no-tool boundary rules and explicit send-use guidance | If the agent only calls tools for explicit external information requests and only uses `send` for publishing requests, unnecessary tool calls and boundary failures will decline. | overall_task_success; no_tool_accuracy; unnecessary_tool_call_rate | 0.70 | target 0.95+ | pending |

## B2. Failure analysis

Use actual failures from `results[*].result.failures`.

| Case ID | Failure Type | Actual Tool Calls | What Failed | Fix |
|---|---|---|---|---|
| R05_limit_arg | wrong_arg_value | timeline | `limit` value or interpretation was wrong for a user tweet request. | tighten timeline argument guidance and require the agent to use default limit only when user asks for multiple tweets.
| R06_timeframe_arg | wrong_arg_value | lookup | `timeframe` not explicitly set for a news request. | mandate `timeframe=day` for "hôm nay"/"today" and add guidance in `system_prompt.md`.
| R07_search_type_arg | wrong_arg_value | social_search | `search_type` may have defaulted incorrectly for topic-based social search. | clarify `Latest` vs `Top` and choose `Latest` for current conversation trends.
| R10_missing_handle | missing_info | clarify then timeline | agent failed to ask for a missing Twitter handle before calling timeline. | require use of `clarify` if `screenname` is unspecified for timeline.
| R11_missing_url | missing_info | clarify then fetch | agent failed to ask for a missing URL before calling fetch. | require use of `clarify` if `url` is missing for fetch.
| R12_confirm_before_send | wrong_boundary | clarify then send | agent used `send` instead of clarifying a missing information request. | restrict `send` to explicit publish/send actions and use `clarify` first when required arguments are absent.

## B6. Reflection

- Fixes in `system_prompt.md`:
  - explicit routing rules for `timeline`, `social_search`, `lookup`, `fetch`, and `send`
  - the requirement that tools are only used when the user requests external data
  - the instruction to ask `clarify` when required tool arguments are missing
- Fixes in `tools.yaml`:
  - clearer tool descriptions and explicit role definitions
  - stronger parameter descriptions for `screenname`, `query`, `topic`, `timeframe`, and `url`
  - guidance that `lookup` uses `topic=news` for news-specific requests
- Failure cases needing manual review:
  - any tool execution error from `tool_results` is not enough to mark success; runtime failures such as missing API keys must be reviewed separately.
- Next improvements:
  - add a v1 run after the prompt/tool updates and compare actual run metrics
  - expand the eval set with more boundary cases for no-tool responses and publishing requests
  - add a short `artifacts/REPORT.md` summary section in PHẦN A so reviewers can see the three-version hypothesis quickly

## B3. Team eval cases

List the 10 cases added to `data/eval_group.json`:

- 5 single-turn
- 5 multi-turn

This section is for the mandatory team-authored eval set. Optional built-ins do
not belong here.

File template để trống có chủ đích; nhóm phải tự thiết kế đủ 10 case.

| Case ID | What It Tests | Expected Tool/Behavior | Result |
|---|---|---|---|
|  |  |  |  |

## B4. Live chat evidence

Use `transcripts/*.transcript.json`.

| Scenario/Turn | Version | Tool Calls + Args | Transcript/Run | Outcome |
|---|---|---|---|---|
|  |  |  |  |  |

## B5. Tool capability evidence

Phân loại rõ tool mới bắt buộc, optional built-in và tool đủ điều kiện bonus. Chỉ ghi Telegram/PDF nếu nhóm thực sự dùng; base report không cần chúng.

UI is core deliverable, not bonus. Do not list it here.

| Category | Evidence File | What Worked | Risk / Guardrail |
|---|---|---|---|
| Must-have: tool mới đầu tiên |  |  |  |
| Optional built-in |  |  |  |
| Bonus: tool mới thứ 4 trở đi |  |  |  |

## B6. Reflection

- Which fixes belonged in `system_prompt.md`?
- Which fixes belonged in `tools.yaml`?
- Which failure needed manual review instead of automatic grading?
- What would you improve next?
