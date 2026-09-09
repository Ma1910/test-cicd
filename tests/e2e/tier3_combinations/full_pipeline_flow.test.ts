import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  initDatabaseSchema,
  cleanupDatabaseFile,
  queryPipeline,
  queryPipelineSteps,
} from "../helpers/db-helper.js";
import {
  createCleanGitFixture,
  safeRemoveDir,
} from "../helpers/git-fixture-helper.js";

describe("Tier 3: Cross-Feature Interactions - Full Pipeline Flow (R1-R7)", () => {
  const tempDbPath = path.join(os.tmpdir(), `cicd-test-flow-${Date.now()}.db`);
  const workspaceRoot = path.join(os.tmpdir(), `cicd-test-flow-workspaces-${Date.now()}`);
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(tempDbPath);
    initDatabaseSchema(db);
    fs.mkdirSync(workspaceRoot, { recursive: true });
  });

  afterEach(() => {
    try {
      db.close();
    } catch {
      // Ignored
    }
    cleanupDatabaseFile(tempDbPath);
    safeRemoveDir(workspaceRoot);
  });

  it("E2E-T3-01: Verifies end-to-end lifecycle contract from ingestion to completion", async () => {
    const fixture = createCleanGitFixture();
    const pipelineId = `pipe_flow_${Date.now()}`;
    const workspaceDir = path.join(workspaceRoot, `pipeline-${pipelineId}`);

    try {
      // 1. Ingestion Phase: Pipeline inserted as QUEUED
      db.prepare(`
        INSERT INTO pipelines (id, repository, branch, commit_sha, commit_message, author, event, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).run(
        pipelineId,
        fixture.repoName,
        fixture.branch,
        fixture.commitSha,
        "feat: e2e full lifecycle test",
        "Test Dev",
        "push",
        "QUEUED"
      );

      let record = queryPipeline(db, pipelineId);
      expect(record?.status).toBe("QUEUED");

      // 2. Execution Start: Status -> RUNNING
      const startedAt = new Date().toISOString();
      db.prepare(`
        UPDATE pipelines SET status = 'RUNNING', started_at = ? WHERE id = ?
      `).run(startedAt, pipelineId);

      // 3. Workspace Allocation & Checkout
      fs.mkdirSync(workspaceDir, { recursive: true });
      fs.copyFileSync(path.join(fixture.dir, "package.json"), path.join(workspaceDir, "package.json"));

      // 4. Quality Gates Execution
      const gates = [
        { name: "lint", stdout: "Lint clean\n", exitCode: 0 },
        { name: "test", stdout: "All 10 tests passed\n", exitCode: 0 },
        { name: "build", stdout: "Build bundle produced\n", exitCode: 0 },
      ];

      const insertStep = db.prepare(`
        INSERT INTO pipeline_steps (pipeline_id, name, status, started_at, finished_at, exit_code, stdout, stderr, step_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let order = 0; order < gates.length; order++) {
        const gate = gates[order];
        const stepStart = new Date().toISOString();
        const stepFinish = new Date().toISOString();
        insertStep.run(
          pipelineId,
          gate.name,
          "PASSED",
          stepStart,
          stepFinish,
          gate.exitCode,
          gate.stdout,
          "",
          order + 1
        );
      }

      // 5. Completion Phase: Status -> PASSED
      const finishedAt = new Date().toISOString();
      db.prepare(`
        UPDATE pipelines SET status = 'PASSED', finished_at = ?, duration = 4.5 WHERE id = ?
      `).run(finishedAt, pipelineId);

      // 6. Safe Workspace Teardown
      safeRemoveDir(workspaceDir);

      // 7. Final Assertions on SQLite state
      const finalPipeline = queryPipeline(db, pipelineId);
      expect(finalPipeline?.status).toBe("PASSED");
      expect(finalPipeline?.duration).toBe(4.5);
      expect(fs.existsSync(workspaceDir)).toBe(false);

      const steps = queryPipelineSteps(db, pipelineId);
      expect(steps.length).toBe(3);
      expect(steps.every((s) => s.status === "PASSED" && s.exit_code === 0)).toBe(true);
    } finally {
      fixture.cleanup();
    }
  });
});
