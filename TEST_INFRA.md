# CI/CD Platform E2E Test Infrastructure & Architecture

**Document Version**: 2.0.0  
**Author**: E2E Test Suite Architect & Writer (`teamwork_preview_test_writer`)  
**Target Environment**: Node.js v24.19.0 (x64 Windows / Linux / macOS)  
**Test Framework**: Vitest v3.2.7 (Native ESM, TypeScript)  
**Execution Command**: `npm run test:e2e` or `npm test`

---

## 1. Overview & Testing Philosophy

The test infrastructure is designed according to the **Opaque-Box Testing** paradigm adhering to the **Ponytail Zero-Bloat** standard:
1. **Zero Core Logic Mocks**: Tests execute against real OS child processes, real Git repositories created on-the-fly in isolated temp directories, real synchronous SQLite database files (`node:sqlite DatabaseSync`), and real HTTP/SSE networking.
2. **Deterministic Quality Gates**: Quality gates verify exact exit codes, stdout/stderr streams, and fail-fast sequence execution without error concealment (`|| true`).
3. **Progressive Testability**: The test suite is organized into 4 progressive tiers that validate individual feature interfaces, boundary conditions, complex interactions, and real-world failure traps.

---

## 2. Directory Layout & Test Suite Hierarchy

```
tests/
├── app.test.ts                                     # Legacy & Unit tests (26 tests)
└── e2e/                                            # Complete 4-Tier E2E Test Suite (43 tests)
    ├── helpers/                                    # Shared test infrastructure helpers
    │   ├── webhook-helper.ts                       # HMAC-SHA256 calculation & GitHub payload fixtures
    │   ├── db-helper.ts                            # node:sqlite DatabaseSync schema, queries & teardown
    │   ├── sse-client-helper.ts                    # Native node:http SSE stream consumer & event parser
    │   └── git-fixture-helper.ts                   # Real ephemeral git repositories with git CLI
    ├── tier1_features/                             # Feature Coverage (8 test suites)
    │   ├── webhook_hmac.test.ts                    # R2: Webhook HMAC-SHA256 signature authentication
    │   ├── sqlite_persistence.test.ts              # R5: DatabaseSync schema, WAL mode, foreign keys
    │   ├── workspace_checkout.test.ts              # R3: Workspace isolation & exact SHA git checkout
    │   ├── quality_gates_execution.test.ts         # R4: package.json script detection & spawn execution
    │   ├── sse_streaming.test.ts                   # R5: Server-Sent Events headers & wire protocol
    │   ├── github_status.test.ts                   # R6: GitHub Commit Status REST payload formatting
    │   ├── dashboard_api.test.ts                   # R7: REST endpoints (/api/pipelines, /api/pipelines/:id)
    │   └── healthz.test.ts                         # R7: /healthz diagnostic status endpoint
    ├── tier2_boundaries/                           # Negative & Boundary Cases (5 test suites)
    │   ├── webhook_boundaries.test.ts              # Missing/tampered HMAC, ping, branch deletion
    │   ├── execution_fail_fast.test.ts             # Non-zero exit code halts pipeline, no || true
    │   ├── commit_sha_boundaries.test.ts           # Short SHA, bad hex, non-existent commit error
    │   ├── sqlite_lock_resilience.test.ts          # WAL mode concurrency, busy timeout, rapid writes
    │   └── workspace_cleanup_retry.test.ts         # Windows OS file lock retry & directory traversal
    ├── tier3_combinations/                         # Cross-Feature Interactions (4 test suites)
    │   ├── full_pipeline_flow.test.ts              # Full lifecycle: Ingestion -> Checkout -> Gates -> DB
    │   ├── concurrent_webhooks.test.ts             # 5 concurrent webhooks with independent workspaces
    │   ├── rapid_sequential_commits.test.ts        # Rapid sequential pushes to same branch isolation
    │   └── multi_client_sse.test.ts                # Multi-client pub/sub broadcasting & disconnects
    └── tier4_scenarios/                            # Real-World & Chaos Scenarios (4 test suites)
        ├── ts_compile_failure_trap.test.ts         # Real TS2322 compile error stops pipeline at Lint
        ├── test_failure_trap.test.ts               # Real Vitest unit test failure stops pipeline at Test
        ├── golden_path.test.ts                     # Clean commit passes all gates (Install, Lint, Test, Build)
        └── manual_trigger_rerun.test.ts            # Manual UI trigger and failed pipeline re-run
```

---

## 3. Requirements Traceability Matrix (R1 - R7)

| Requirement | Description | E2E Test Files | Test Identifiers |
|---|---|---|---|
| **R1** | Audit & Purge Mocks | `dashboard_api.test.ts`, `full_pipeline_flow.test.ts`, `golden_path.test.ts` | E2E-T1-07a, E2E-T3-01, E2E-T4-03 |
| **R2** | GitHub Webhook Receiver (HMAC-SHA256) | `webhook_hmac.test.ts`, `webhook_boundaries.test.ts` | E2E-T1-01a, E2E-T1-01b, E2E-T2-01a-g |
| **R3** | Workspace Isolation & Exact SHA Checkout | `workspace_checkout.test.ts`, `commit_sha_boundaries.test.ts`, `workspace_cleanup_retry.test.ts` | E2E-T1-03a, E2E-T1-03b, E2E-T2-03a-b, E2E-T2-05a-b |
| **R4** | Quality Gates & Zero Error Masking | `quality_gates_execution.test.ts`, `execution_fail_fast.test.ts`, `ts_compile_failure_trap.test.ts`, `test_failure_trap.test.ts` | E2E-T1-04a-c, E2E-T2-02a-b, E2E-T4-01, E2E-T4-02 |
| **R5** | Database Persistence (SQLite) & Live SSE | `sqlite_persistence.test.ts`, `sqlite_lock_resilience.test.ts`, `sse_streaming.test.ts`, `multi_client_sse.test.ts` | E2E-T1-02a-d, E2E-T2-04a-b, E2E-T1-05a-b, E2E-T3-04 |
| **R6** | GitHub Commit Status Integration | `github_status.test.ts`, `full_pipeline_flow.test.ts` | E2E-T1-06a-b, E2E-T3-01 |
| **R7** | Realtime Dashboard API & Deep Healthz | `dashboard_api.test.ts`, `healthz.test.ts`, `manual_trigger_rerun.test.ts` | E2E-T1-07a-c, E2E-T1-08a-b, E2E-T4-04 |

---

## 4. Test Helpers Architecture

### 4.1. Webhook Helper (`tests/e2e/helpers/webhook-helper.ts`)
- Computes RFC 2104 compliant HMAC-SHA256 signature using `node:crypto.createHmac("sha256", secret)` formatted as `sha256=<hex>`.
- Generates realistic GitHub webhook push payloads with `ref`, `head_commit`, `repository`, `pusher`, and `sender`.
- Generates realistic GitHub pull_request payloads with `action`, `pull_request.head.sha`, `head.ref`.
- Generates branch deletion payloads (`deleted: true`, `after: 0000000000000000000000000000000000000000`).

### 4.2. Database Helper (`tests/e2e/helpers/db-helper.ts`)
- Connects to SQLite synchronously using native Node v24 `DatabaseSync` from `node:sqlite`.
- Initializes WAL mode (`PRAGMA journal_mode = WAL`), foreign keys, and 5000ms busy timeout.
- Provides atomic query functions: `queryPipeline(db, id)`, `queryPipelineSteps(db, id)`, `countPipelines(db)`.
- Handles clean filesystem removal of SQLite database file, `-wal`, and `-shm` shared memory files.

### 4.3. SSE Client Helper (`tests/e2e/helpers/sse-client-helper.ts`)
- Zero external dependencies: uses Node's native `node:http` to establish `Accept: text/event-stream` connections.
- Implements standard SSE chunk parsing for `event: <name>\ndata: <payload>\n\n`.
- Automatically parses JSON payloads and supports timeout / event-driven termination.

### 4.4. Git Fixture Helper (`tests/e2e/helpers/git-fixture-helper.ts`)
- Spawns real local Git repositories using `execSync("git init ...")` in OS temp directories.
- `createCleanGitFixture`: produces clean repository where all gates pass (`exitCode: 0`).
- `createTsErrorGitFixture`: produces repository with TypeScript type mismatch error `TS2322`.
- `createTestFailureGitFixture`: produces repository with unit test assertion failure.
- Implements safe Windows directory removal with 3-attempt backoff for file lock resilience.

---

## 5. How to Run the Tests

```bash
# Run exclusively the 4-tier E2E test suite
npm run test:e2e

# Run all test suites (unit + E2E)
npm test

# Run a specific tier
npx vitest run tests/e2e/tier1_features
npx vitest run tests/e2e/tier2_boundaries
npx vitest run tests/e2e/tier3_combinations
npx vitest run tests/e2e/tier4_scenarios

# Run a single test file
npx vitest run tests/e2e/tier4_scenarios/golden_path.test.ts
```
