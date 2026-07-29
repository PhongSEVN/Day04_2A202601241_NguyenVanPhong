# Bảng Phân Công Nhiệm Vụ Thành Viên Nhóm (Day 04 Lab v2)

## 📊 Bảng Danh Sách Thành Viên

| STT | Họ và Tên | Mã Sinh Viên | Vai Trò (Role) | Chức Vụ | File / Phụ Trách Chính |
|:---:|---|:---:|---|:---:|---|
| 1 | **Nguyễn Văn Phong** | 2A202601241 | Role 5 — Product Lead & Demo Presenter | **Leader** | `artifacts/REPORT.md`, `artifacts/version_log.csv`, Rehearse Demo |
| 2 | **Vũ Huy Hoàng** | 2A202601057 | Role 1 — Prompt & Agent Architect | Member | `artifacts/system_prompt.md`, `artifacts/tools.yaml` |
| 3 | **Nguyễn Thanh Phúc** | 2A202601345 | Role 2 — Tool Developer | Member | `tools/<tool_moi>/`, `tools/__init__.py`, `.env` & API setup |
| 4 | **Phạm Khánh Linh** | 2A202601507 | Role 3 — Eval & QA Specialist | Member | `data/eval_group.json`, `run_eval.py`, `analysis/*.csv` |
| 5 | **Lê Thị Yến Nhi** | 2A202601031 | Role 4 — UI & Cloud Deployer | Member | `app.py`, `requirements.txt`, Cloudflare Tunnel |

---

## 📝 Phân Công Công Việc Chi Tiết

### 1. Nguyễn Văn Phong (MSV: 2A202601241) — **Leader / Role 5: Product Lead & Demo Presenter**
- **Nhiệm vụ chính**:
  - Điều phối chung tiến độ làm bài của các thành viên trong nhóm.
  - Phụ trách chính nội dung file [artifacts/REPORT.md](file:///c:/Users/THIS%20PC/Desktop/IT/AI%20THUC%20CHIEN/Lesson/Lesson5/lab/Day04_2A202601241_NguyenVanPhong/starter_v0/artifacts/REPORT.md):
    - **Phần A** (Giới thiệu agent, link public demo, 3-5 câu hỏi thử nghiệm, kịch bản demo): Hoàn thành trước 11:30.
    - **Phần B** (Bảng so sánh metric v0–v3, phân tích chi tiết case thất bại, bằng chứng log thật): Hoàn thiện sau khi chạy xong eval.
  - Ghi nhật ký cải tiến vào [artifacts/version_log.csv](file:///c:/Users/THIS%20PC/Desktop/IT/AI%20THUC%20CHIEN/Lesson/Lesson5/lab/Day04_2A202601241_NguyenVanPhong/starter_v0/artifacts/version_log.csv).
  - Chuẩn bị 3–5 kịch bản demo đã rehearse và làm người trình bày chính khi demo/giao lưu với các nhóm khác.

---

### 2. Vũ Huy Hoàng (MSV: 2A202601057) — **Role 1: Prompt & Agent Architect**
- **Nhiệm vụ chính**:
  - Đọc và phân tích các log JSON bị lỗi ở phiên bản `v0` (xác định nguyên nhân Agent gọi sai tool, sai tham số, hoặc không hỏi lại khi thiếu thông tin).
  - Trực tiếp chỉnh sửa và tối ưu file lệnh hướng dẫn [artifacts/system_prompt.md](file:///c:/Users/THIS%20PC/Desktop/IT/AI%20THUC%20CHIEN/Lesson/Lesson5/lab/Day04_2A202601241_NguyenVanPhong/starter_v0/artifacts/system_prompt.md).
  - Tinh chỉnh mô tả description và các tham số của tool trong [artifacts/tools.yaml](file:///c:/Users/THIS%20PC/Desktop/IT/AI%20THUC%20CHIEN/Lesson/Lesson5/lab/Day04_2A202601241_NguyenVanPhong/starter_v0/artifacts/tools.yaml).
  - Đặt giả thuyết cải tiến và chịu trách nhiệm nâng tỉ lệ chính xác qua 3 lượt tối ưu `v1`, `v2`, `v3`.

---

### 3. Nguyễn Thanh Phúc (MSV: 2A202601345) — **Role 2: Tool Developer**
- **Nhiệm vụ chính**:
  - Lập trình **1 Tool mới bắt buộc** tự thiết kế cho nhóm:
    - Tạo thư mục `tools/<tên_tool>/` chứa code `tool.py` và file mô tả `TOOL.md`.
    - Đăng ký hàm xử lý vào registry [tools/\_\_init\_\_.py](file:///c:/Users/THIS%20PC/Desktop/IT/AI%20THUC%20CHIEN/Lesson/Lesson5/lab/Day04_2A202601241_NguyenVanPhong/starter_v0/tools/__init__.py).
    - Cập nhật schema JSON trong [artifacts/tools.yaml](file:///c:/Users/THIS%20PC/Desktop/IT/AI%20THUC%20CHIEN/Lesson/Lesson5/lab/Day04_2A202601241_NguyenVanPhong/starter_v0/artifacts/tools.yaml).
  - Quản lý cấu hình API Keys trong file `.env` và chạy smoke test đảm bảo tool mới hoạt động chuẩn xác (`error: None`).

---

### 4. Phạm Khánh Linh (MSV: 2A202601507) — **Role 3: Eval & QA Specialist**
- **Nhiệm vụ chính**:
  - Thiết kế đúng **10 test cases** kiểm thử riêng của nhóm trong [data/eval_group.json](file:///c:/Users/THIS%20PC/Desktop/IT/AI%20THUC%20CHIEN/Lesson/Lesson5/lab/Day04_2A202601241_NguyenVanPhong/starter_v0/data/eval_group.json) (5 single-turn + 5 multi-turn).
  - Chạy lệnh eval kiểm thử cho từng phiên bản (`python run_eval.py ...`).
  - Kiểm tra tính hợp lệ của kết quả metric (`provider_error_cases == 0`, `measured_cases == total_cases`).
  - Trích xuất dữ liệu log JSON ra file CSV (`analysis/`) để phân tích và cung cấp số liệu cho Leader viết báo cáo.

---

### 5. Lê Thị Yến Nhi (MSV: 2A202601031) — **Role 4: UI & Cloud Deployer**
- **Nhiệm vụ chính**:
  - Lập trình ứng dụng Web Chat tương tác cho Agent bằng Streamlit (`app.py`).
  - Đảm bảo giao diện hiển thị: Khung chat, Trace chi tiết lịch sử gọi tool (tên tool, tham số, kết quả/lỗi), và Version Agent đang chạy.
  - Cập nhật file `requirements.txt` (thêm `streamlit>=1.30.0`).
  - Thực thi Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:8501`) để cung cấp Public URL kết nối ứng dụng cho nhóm khác test.
