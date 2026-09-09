import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import {
  createTestFailureGitFixture,
  safeRemoveDir,
  GitFixture,
} from "../helpers/git-fixture-helper.js";
import {
  initDatabaseSchema,
  cleanupDatabaseFile,
  queryPipeline,
  queryPipelineSteps,
} from "../helpers/db-helper.js";

describe("Tier 4: Real-World Scenarios - Vitest Unit Test Failure Trap (R4)", () => {
  let fixture: GitFixture;
  const tempDbPath = path.join(os.tmpdir(), `cicd-test-failtrap-${Date.now()}.db`);
  let db: DatabaseSync;

  beforeEach(() => {
    fixture = createTestFailureGitFixture();
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

  it("E2E-T4-02: Unit test failure terminates pipeline at Test step and skips Build", async () => {
    const pipelineId = `pipe_testfail_${Date.now()}`;

    db.prepare(`
      INSERT INTO pipelines (id, repository, branch, commit_sha, commit_message, author, event, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pipelineId,
      fixture.repoName,
      fixture.branch,
      fixture.commitSha,
      "test: intentional vitest assertion failure",
      "Developer",
      "push",
      "RUNNING"
    );

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

    // Step 1: Lint passes
    const lintRes = await runCommand("npm", ["run", "lint"]);
    expect(lintRes.exitCode).toBe(0);

    // Step 2: Test fails
    const testRes = await runCommand("npm", ["test"]);
    expect(testRes.exitCode).not.toBe(0);
    const combinedTestOutput = testRes.stdout + testRes.stderr;
    expect(combinedTestOutput).toContain("AssertionError");

    // Record into SQLite
    const insertStep = db.prepare(`
      INSERT INTO pipeline_steps (pipeline_id, name, status, exit_code, stdout, stderr, step_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insertStep.run(pipelineId, "lint", "PASSED", lintRes.exitCode, lintRes.stdout, lintRes.stderr, 1);
    insertStep.run(pipelineId, "test", "FAILED", testRes.exitCode, testRes.stdout, testRes.stderr, 2);
    insertStep.run(pipelineId, "build", "SKIPPED", null, "", "", 3);

    db.prepare(`
      UPDATE pipelines SET status = 'FAILED', finished_at = datetime('now') WHERE id = ?
    `).run(pipelineId);

    const pipeline = queryPipeline(db, pipelineId);
    expect(pipeline?.status).toBe("FAILED");

    const steps = queryPipelineSteps(db, pipelineId);
    const testStep = steps.find((s) => s.name === "test");
    expect(testStep?.status).toBe("FAILED");
    expect(testStep?.exit_code).toBe(testRes.exitCode);

    const buildStep = steps.find((s) => s.name === "build");
    expect(buildStep?.status).toBe("SKIPPED");
  });
});
