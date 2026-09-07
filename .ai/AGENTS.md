# 🤖 AI Agent & Developer Guidelines (Enterprise Standards)

> **Mandatory guidelines for all AI Coding Agents (Antigravity, Cursor, Claude Code, Copilot, Windsurf) and Developers working on this repository.**

This repository is protected by an **Automated CI/CD Pipeline & Strict Quality Gates**. Any commit violating the rules below will be rejected by GitHub Actions or terminated immediately.

---

## 📋 1. Mandatory Workflow

Before implementing changes or concluding a task, AI MUST follow these 4 steps:

### Step 1: Pre-work Synchronization
Always pull the latest changes from teammates before writing new code:
```bash
npm run sync
```

### Step 2: Write Code with "Ponytail" Minimalism (Zero-Bloat)
* **YAGNI**: Do not add new external libraries if standard Node.js or Express built-ins can solve the requirement.
* **Security**: Never hardcode API credentials, private tokens, or passwords.
* **Strict Types**: Always explicitly declare strict TypeScript types without loose `any`.

### Step 3: Local Verification Before Push
Verify that all three checks pass with **Exit code 0**:
```bash
# 1. Verify strict TypeScript compilation (Zero errors)
npm run typecheck

# 2. Run all 21+ test suites and enforce coverage threshold (>= 80%)
npm run test:coverage

# 3. Compile production build
npm run build
```

### Step 4: Commit and Pull Request
* Write clear Conventional Commit messages (`feat: ...`, `fix: ...`, `test: ...`).
* If adding new endpoints or features, ensure corresponding unit/integration tests are added to maintain coverage above **80%**.

---

## 🛡️ 2. CI/CD Defense Gates Reference

| Defense Gate | Technical Requirement | Consequence on Failure |
| :--- | :--- | :--- |
| **Secret Scan (Trivy)** | Zero leaked AWS/GCP tokens or passwords in Git history | Pipeline halts immediately at Stage 1 |
| **TypeScript Strict** | `tsc --noEmit` must pass with 0 errors | Build blocked at Stage 2 |
| **Matrix Tests (Node 20 & 22)** | All suites must pass simultaneously on both runtimes | Fails with ❌ at Stage 3 |
| **Coverage Gate** | Code coverage must be $\ge 80\%$ (Currently >94%) | Merge button automatically locked |
| **Docker Hardening** | Must run as unprivileged user (`USER node`) | Image publishing to GHCR denied |
| **Smoke Tests** | `/healthz` must respond with HTTP 200 OK | Auto-rollback triggered |

---

## 💡 3. Quick Terminal Commands

```bash
# Launch interactive visual simulator in default browser:
npm run cicd

# Open live GitHub Actions Runs & DAG:
npm run cicd:actions

# Check if teammates pushed new commits:
npm run check:team

# Keep a background watcher open for instant push alerts:
npm run watch:team

# Pull and sync teammates' changes cleanly:
npm run sync
```
