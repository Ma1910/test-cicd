# 🤖 AI Coding Assistants & Agent Guidelines

Thư mục này chứa toàn bộ tài liệu hướng dẫn, quy chuẩn kiểm soát chất lượng và triết lý lập trình dành cho các hệ thống **AI Coding Assistant**:

---

## 📁 Cấu Trúc Thư Mục `.ai/`:

| Tên File | Công Cụ AI Áp Dụng | Mô Tả |
| :--- | :--- | :--- |
| [`CLAUDE.md`](./CLAUDE.md) | **Claude Code CLI & Anthropic** | Chỉ thị bắt buộc chạy `npm run sync`, `typecheck`, `test:coverage` và quy tắc Ponytail. |
| [`.cursorrules`](./.cursorrules) | **Cursor IDE & VS Code** | Bộ quy tắc nạp ngữ cảnh cho Cursor Agent. |
| [`.windsurfrules`](./.windsurfrules) | **Windsurf Cascade** | Quy tắc Cascade Agent kiểm thử trước khi kết thúc task. |
| [`AGENTS.md`](./AGENTS.md) | **Antigravity & AI Khác** | Hướng dẫn tổng quát đa Agent. |
| [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) | **GitHub Copilot** | Quy chuẩn chính thức của GitHub Copilot. |

---

## 📌 Quy Tắc Vàng Dành Cho Mọi AI Khi Làm Việc:
1. Luôn chạy `npm run sync` trước khi bắt đầu để không ghi đè code của đồng đội.
2. Tuân thủ phong cách Ponytail tối giản (0 dependency thừa, 0 secret leak).
3. Trước khi kết thúc task phải chạy và pass 100%:
   - `npm run typecheck`
   - `npm run test:coverage` (21+ tests, coverage $\ge 80\%$)
   - `npm run build`
