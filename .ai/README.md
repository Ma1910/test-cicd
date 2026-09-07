# 🤖 AI Coding Assistants & Agent Guidelines

This directory contains configuration, quality control standards, and development guidelines for all **AI Coding Assistants**:

---

## 📁 Directory Structure (`.ai/`):

| File | Applied AI Tool | Description |
| :--- | :--- | :--- |
| [`CLAUDE.md`](./CLAUDE.md) | **Claude Code CLI & Anthropic AI** | Mandatory workflow: `npm run sync`, `typecheck`, `test:coverage`, and Ponytail minimalism. |
| [`.cursorrules`](./.cursorrules) | **Cursor IDE & VS Code** | Context injection rules for Cursor Agent. |
| [`.windsurfrules`](./.windsurfrules) | **Windsurf Cascade** | Cascade Agent verification rules before task conclusion. |
| [`AGENTS.md`](./AGENTS.md) | **Antigravity & General Agents** | Universal AI Agent guidelines. |
| [`.github/copilot-instructions.md`](../.github/copilot-instructions.md) | **GitHub Copilot** | Official GitHub Copilot instruction rules. |

---

## 📌 Golden Rules for Every AI Agent:
1. Always run `npm run sync` before editing to ensure the working tree is up to date with teammates.
2. Adhere to Ponytail minimalism: Zero unnecessary dependencies, zero secret leaks.
3. Before concluding any task, verify that all three commands pass with exit code 0:
   - `npm run typecheck` (Zero TypeScript errors)
   - `npm run test:coverage` (21+ tests passing with $\ge 80\%$ coverage)
   - `npm run build` (Clean production output)
