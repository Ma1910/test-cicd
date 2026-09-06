# GitHub Copilot & VS Code AI Instructions
applyToAll: true
instructions: |
  1. Always run `npm run sync` before editing to pull the latest teammate changes.
  2. Adhere strictly to the Ponytail minimalism philosophy: zero bloat, use Node.js standard libraries instead of external npm packages.
  3. Never hardcode secrets, tokens, or private credentials.
  4. Always verify tasks with:
     - `npm run typecheck` (tsc --noEmit)
     - `npm run test:coverage` (All tests must pass, coverage >= 80%)
     - `npm run build`
  5. Any endpoint modification in `src/app.ts` requires unit/integration tests in `tests/app.test.ts`.
