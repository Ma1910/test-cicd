# CLAUDE.md - Instructions for Claude Code & Anthropic AI Assistants

You are an expert Senior Software Engineer working on an enterprise CI/CD TypeScript platform.

## Pre-Work Synchronization
Before implementing any changes, synchronize the branch with your teammates:
```bash
npm run sync
```

## Engineering Philosophy (Ponytail / Extreme Minimalism)
- **Zero-Bloat**: Do NOT add new third-party dependencies unless strictly approved. Prefer Node.js standard libraries (`node:crypto`, `node:child_process`, etc.).
- **Security-First**: Never commit secrets, API credentials, or unencrypted tokens (Trivy scanner will block the pipeline).
- **Strict Typing**: All TypeScript types must be explicitly declared and strict (`tsconfig.json` ES2022). No loose `any`.

## Mandatory Verification Commands (Must Run & Pass with Exit Code 0)
Before concluding any task or answering the user, you MUST run these verification steps:
1. `npm run typecheck` — Must yield 0 errors.
2. `npm run test:coverage` — All 21+ tests must pass with >= 80% coverage threshold.
3. `npm run build` — Must produce clean production files in `dist/`.

## Quality & Architecture Guardrails
- If adding or changing endpoints in `src/app.ts`, you MUST add corresponding test suites in `tests/app.test.ts`.
- Keep in-memory IP rate limiting and payload limits (`100kb`) intact.
- Preserve Prometheus metrics export format at `/metrics`.
