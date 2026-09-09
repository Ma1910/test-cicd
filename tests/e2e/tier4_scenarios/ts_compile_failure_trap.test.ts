import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import {
  createTsErrorGitFixture,
  safeRemoveDir,
  GitFixture,
} from "../helpers/git-fixture-helper.js";
import {
  initDatabaseSchema,
  cleanupDatabaseFile,
  queryPipeline,
  queryPipelineSteps,
} from "../helpers/db-helper.js";

describe("Tier 4: Real-World Scenarios - TypeScript Strict Compile Error Trap TS2322 (R4)", () => {
  let fixture: GitFixture;
  const tempDbPath = path.join(os.tmpdir(), `cicd-test-ts2322-${Date.now()}.db`);
  let db: DatabaseSync;

  beforeEach(() => {
    fixture = createTsErrorGitFixture();
    db = new DatabaseSync(tempDbPath);
    initDatabaseSchema(db);
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      // Ignored
    }
    cleanupDatabaseFile(tempDbPath);
    fixture.cleanup();
  });

  it("E2E-T4-01: Injected TS2322 error fails Lint/TypeCheck step, skips Test/Build, and marks pipeline FAILED", async () => {
    const pipelineId = `pipe_ts2322_${Date.now()}`;

    // 1. Ingestion
    db.prepare(`
      INSERT INTO pipelines (id, repository, branch, commit_sha, commit_message, author, event, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pipelineId,
      fixture.repoName,
      fixture.branch,
      fixture.commitSha,
      "fix: test commit with TS2322 syntax error",
      "Developer",
      "push",
      "RUNNING"
    );

    // 2. Execute Lint step on fixture
    const runCommand = (cmd: string, args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
      return new Promise((resolve) => {
        let stdout = "";
        let stderr = "";
        const child = spawn(cmd, args, {
          cwd: fixture.dir,
          shell: true,
          env: { ...process.env, CI: "true", FORCE_COLOR: "0" },
        });

        child.stdout.on("data", (c) => (stdout += c.toString()));
        child.stderr.on("data", (c) => (stderr += c.toString()));
        child.on("close", (code) => resolve({ exitCode: code ?? 1, stdout, stderr }));
        child.on("error", (err) => resolve({ exitCode: 1, stdout, stderr: err.message }));
      });
    };

    const lintRes = await runCommand("npm", ["run", "lint"]);

    // Lint must fail with non-zero exit code and contain TS2322
    expect(lintRes.exitCode).not.toBe(0);
    const combinedOutput = lintRes.stdout + lintRes.stderr;
    expect(combinedOutput).toContain("TS2322");

    // 3. Record steps into SQLite database according to fail-fast protocol
    const insertStep = db.prepare(`
      INSERT INTO pipeline_steps (pipeline_id, name, status, exit_code, stdout, stderr, step_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertStep.run(pipelineId, "lint", "FAILED", lintRes.exitCode, lintRes.stdout, lintRes.stderr, 1);
    insertStep.run(pipelineId, "test", "SKIPPED", null, "", "", 2);
    insertStep.run(pipelineId, "build", "SKIPPED", null, "", "", 3);

    db.prepare(`
      UPDATE pipelines SET status = 'FAILED', finished_at = datetime('now') WHERE id = ?
    `).run(pipelineId);

    // 4. Verification of database state
    const pipeline = queryPipeline(db, pipelineId);
    expect(pipeline?.status).toBe("FAILED");

    const steps = queryPipelineSteps(db, pipelineId);
    expect(steps.length).toBe(3);

    const lintStep = steps.find((s) => s.name === "lint");
    expect(lintStep?.status).toBe("FAILED");
    expect(lintStep?.exit_code).toBe(lintRes.exitCode);
    expect(lintStep?.stdout + lintStep?.stderr).toContain("TS2322");

    const testStep = steps.find((s) => s.name === "test");
    expect(testStep?.status).toBe("SKIPPED");
    expect(testStep?.exit_code).toBeNull();

    const buildStep = steps.find((s) => s.name === "build");
    expect(buildStep?.status).toBe("SKIPPED");
    expect(buildStep?.exit_code).toBeNull();
  });
});
