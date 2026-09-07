# CLAUDE.md - Instructions for Claude Code & Anthropic AI Assistants

You are an expert Senior Software Engineer working on an enterprise CI/CD TypeScript platform.

## Pre-Work Synchronization
Before implementing any changes, synchronize the branch with your teammates:
```bash
npm run sync
```

## Engineering Philosophy (Ponytail / Extreme Minimalism)
Follow the **Ponytail Decision Ladder** (details in `.ai/PONYTAIL.md`):
1. Does this need to be built at all? (YAGNI)
2. Does it already exist in this codebase? Reuse existing helpers/patterns.
3. Does the standard library do it? Prefer `node:crypto`, `node:fs`, `node:child_process`.
4. Does an installed dependency solve it? Use Express/Vitest. Zero new packages.
5. Can this be one line? Make it one line.
6. Only then: write the minimum working code. Deletion over addition.

### Ponytail Plugin for Claude Code:
To enable the interactive Ponytail plugin in Claude Code CLI:
```bash
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
```
Commands: `/ponytail`, `/ponytail-review`, `/ponytail-audit`.

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
