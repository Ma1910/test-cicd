import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import {
  createCleanGitFixture,
  safeRemoveDir,
  GitFixture,
} from "../helpers/git-fixture-helper.js";
import {
  initDatabaseSchema,
  cleanupDatabaseFile,
  queryPipeline,
  queryPipelineSteps,
} from "../helpers/db-helper.js";

describe("Tier 4: Real-World Scenarios - Golden Path Clean Execution (R1-R7)", () => {
  let fixture: GitFixture;
  const tempDbPath = path.join(os.tmpdir(), `cicd-test-golden-${Date.now()}.db`);
  let db: DatabaseSync;

  beforeEach(() => {
    fixture = createCleanGitFixture();
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

  it("E2E-T4-03: Golden path commit executes all gates with exit code 0 and achieves PASSED status", async () => {
    const pipelineId = `pipe_golden_${Date.now()}`;
    const startTime = Date.now();

    db.prepare(`
      INSERT INTO pipelines (id, repository, branch, commit_sha, commit_message, author, event, status, started_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      pipelineId,
      fixture.repoName,
      fixture.branch,
      fixture.commitSha,
      "feat: golden path all checks pass",
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
        child.on("close", (code) => resolve({ exitCode: code ?? 0, stdout, stderr }));
        child.on("error", (err) => resolve({ exitCode: 1, stdout, stderr: err.message }));
      });
    };

    const insertStep = db.prepare(`
      INSERT INTO pipeline_steps (pipeline_id, name, status, exit_code, stdout, stderr, step_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    // Gate 1: Lint
    const lintRes = await runCommand("npm", ["run", "lint"]);
    expect(lintRes.exitCode).toBe(0);
    insertStep.run(pipelineId, "lint", "PASSED", 0, lintRes.stdout, lintRes.stderr, 1);

    // Gate 2: Test
    const testRes = await runCommand("npm", ["test"]);
    expect(testRes.exitCode).toBe(0);
    insertStep.run(pipelineId, "test", "PASSED", 0, testRes.stdout, testRes.stderr, 2);

    // Gate 3: Build
    const buildRes = await runCommand("npm", ["run", "build"]);
    expect(buildRes.exitCode).toBe(0);
    insertStep.run(pipelineId, "build", "PASSED", 0, buildRes.stdout, buildRes.stderr, 3);

    const durationSeconds = (Date.now() - startTime) / 1000;

    db.prepare(`
      UPDATE pipelines
      SET status = 'PASSED', finished_at = datetime('now'), duration = ?
      WHERE id = ?
    `).run(durationSeconds, pipelineId);

    // Assertions
    const pipeline = queryPipeline(db, pipelineId);
    expect(pipeline?.status).toBe("PASSED");
    expect(pipeline?.duration).toBeGreaterThan(0);

    const steps = queryPipelineSteps(db, pipelineId);
    expect(steps.length).toBe(3);
    for (const step of steps) {
      expect(step.status).toBe("PASSED");
      expect(step.exit_code).toBe(0);
    }
  });
});
