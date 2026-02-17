# BankOnTap exam.json đang rỗng

- Trạng thái hiện tại: `BankOnTap/exam.json` có kích thước **0 bytes**.
- Vì vậy hệ thống chưa thể:
  - chia đề thành 4 section,
  - fill các câu có đáp án null,
  - sinh đầy đủ danh sách lỗi theo `q_id`.

## Cách xử lý

1. Lưu lại nội dung đầy đủ vào `BankOnTap/exam.json`.
2. Mở `BankOnTap/error-editor.html`.
3. Bấm **"Chia 4 section + fill null answers"**.
4. Mở các file:
   - `unresolved-answers.md`
   - `invalid-diagrams.md`
   để rà soát và chỉnh tay.
