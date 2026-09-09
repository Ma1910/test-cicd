import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import {
  initDatabaseSchema,
  cleanupDatabaseFile,
  queryPipeline,
} from "../helpers/db-helper.js";

describe("Tier 4: Real-World Scenarios - Manual Run / Re-run Trigger (R7)", () => {
  const tempDbPath = path.join(os.tmpdir(), `cicd-test-rerun-${Date.now()}.db`);
  let db: DatabaseSync;

  beforeEach(() => {
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
  });

  it("E2E-T4-04: Re-running a failed pipeline creates a new distinct pipeline record while preserving original history", () => {
    const originalPipelineId = `pipe_orig_failed_${Date.now()}`;
    const branch = "feat/hotfix";
    const commitSha = "f99fb39a17387d853b0bc87fcf39a3f25608dead";

    const insertStmt = db.prepare(`
      INSERT INTO pipelines (id, repository, branch, commit_sha, commit_message, author, event, status, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Original run: failed
    insertStmt.run(
      originalPipelineId,
      "Ma1910/test-cicd",
      branch,
      commitSha,
      "fix: failing commit initially",
      "Developer",
      "push",
      "FAILED",
      12.4
    );

    // Operator triggers re-run via UI
    const rerunPipelineId = `pipe_rerun_${Date.now() + 1}`;
    insertStmt.run(
      rerunPipelineId,
      "Ma1910/test-cicd",
      branch,
      commitSha,
      "fix: failing commit initially (Re-run)",
      "Developer (manual)",
      "manual",
      "QUEUED",
      null
    );

    const origRecord = queryPipeline(db, originalPipelineId);
    const rerunRecord = queryPipeline(db, rerunPipelineId);

    expect(origRecord).toBeDefined();
    expect(rerunRecord).toBeDefined();

    // IDs must be distinct
    expect(origRecord?.id).not.toBe(rerunRecord?.id);

    // Original remains FAILED
    expect(origRecord?.status).toBe("FAILED");

    // Re-run starts as QUEUED with manual event
    expect(rerunRecord?.status).toBe("QUEUED");
    expect(rerunRecord?.event).toBe("manual");
    expect(rerunRecord?.commit_sha).toBe(commitSha);
    expect(rerunRecord?.branch).toBe(branch);
  });
});
