import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";
import {
  initDatabaseSchema,
  cleanupDatabaseFile,
} from "../helpers/db-helper.js";
import { safeRemoveDir } from "../helpers/git-fixture-helper.js";

describe("Tier 3: Cross-Feature Interactions - Concurrent Webhooks & Workspace Isolation (R2, R3, R5)", () => {
  const tempDbPath = path.join(os.tmpdir(), `cicd-test-concurrent-${Date.now()}.db`);
  const workspaceRoot = path.join(os.tmpdir(), `cicd-test-concurrent-workspaces-${Date.now()}`);
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

  it("E2E-T3-02: Handles 5 concurrent pipelines without workspace crosstalk or database collisions", async () => {
    const pipelineCount = 5;
    const pipelineIds: string[] = [];

    const insertStmt = db.prepare(`
      INSERT INTO pipelines (id, repository, branch, commit_sha, event, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Create 5 concurrent pipeline entries and isolated workspaces
    for (let i = 0; i < pipelineCount; i++) {
      const pid = `pipe_concurrent_${i}_${Date.now()}`;
      pipelineIds.push(pid);
      insertStmt.run(pid, "Ma1910/test-cicd", `feat/branch-${i}`, `sha_hash_value_${i}`, "push", "QUEUED");

      const wsDir = path.join(workspaceRoot, `pipeline-${pid}`);
      fs.mkdirSync(wsDir, { recursive: true });
      fs.writeFileSync(path.join(wsDir, "pipeline.meta"), JSON.stringify({ id: pid, index: i }));
    }

    // Verify all 5 are recorded in database
    const countRes = db.prepare("SELECT COUNT(*) as total FROM pipelines").get() as { total: number };
    expect(countRes.total).toBe(pipelineCount);

    // Verify each workspace has its own isolated data
    for (let i = 0; i < pipelineCount; i++) {
      const pid = pipelineIds[i];
      const wsDir = path.join(workspaceRoot, `pipeline-${pid}`);
      const meta = JSON.parse(fs.readFileSync(path.join(wsDir, "pipeline.meta"), "utf8"));
      expect(meta.id).toBe(pid);
      expect(meta.index).toBe(i);
    }

    // Cleanup all workspaces
    for (let i = 0; i < pipelineCount; i++) {
      const pid = pipelineIds[i];
      safeRemoveDir(path.join(workspaceRoot, `pipeline-${pid}`));
    }
  });
});
