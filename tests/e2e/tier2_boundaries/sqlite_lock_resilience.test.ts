import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import {
  initDatabaseSchema,
  cleanupDatabaseFile,
} from "../helpers/db-helper.js";

describe("Tier 2: Boundary & Corner Cases - SQLite Concurrency & WAL Resilience (R5)", () => {
  const tempDbPath = path.join(os.tmpdir(), `cicd-test-lock-${Date.now()}.db`);
  let dbWriter: DatabaseSync;
  let dbReader: DatabaseSync;

  beforeEach(() => {
    dbWriter = new DatabaseSync(tempDbPath);
    initDatabaseSchema(dbWriter);

    dbReader = new DatabaseSync(tempDbPath);
    dbReader.exec("PRAGMA busy_timeout = 5000;");
  });

  afterEach(() => {
    try {
      dbWriter.close();
      dbReader.close();
    } catch {
      // Ignored
    }
    cleanupDatabaseFile(tempDbPath);
  });

  it("E2E-T2-04a: Concurrent reader can query pipelines while writer is inserting records in WAL mode", () => {
    const insertStmt = dbWriter.prepare(`
      INSERT INTO pipelines (id, repository, branch, commit_sha, event, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Perform multiple writes
    for (let i = 0; i < 20; i++) {
      insertStmt.run(`pipe_conc_${i}`, "Ma1910/test-cicd", "main", `sha_${i}`, "push", "QUEUED");
    }

    // Reader reads concurrently
    const readStmt = dbReader.prepare("SELECT COUNT(*) as count FROM pipelines");
    const res = readStmt.get() as { count: number };

    expect(res.count).toBe(20);
  });

  it("E2E-T2-04b: Rapid step log chunk appending does not throw lock errors", () => {
    // Insert parent pipeline
    dbWriter.prepare(`
      INSERT INTO pipelines (id, repository, branch, commit_sha, event, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run("pipe_log_append", "Ma1910/test-cicd", "main", "sha123", "push", "RUNNING");

    // Insert step
    dbWriter.prepare(`
      INSERT INTO pipeline_steps (pipeline_id, name, status, step_order, stdout)
      VALUES (?, ?, ?, ?, ?)
    `).run("pipe_log_append", "test", "RUNNING", 1, "");

    const updateLogStmt = dbWriter.prepare(`
      UPDATE pipeline_steps
      SET stdout = stdout || ?
      WHERE pipeline_id = ? AND name = ?
    `);

    // Rapidly append 50 chunks
    for (let i = 0; i < 50; i++) {
      updateLogStmt.run(`log line ${i}\n`, "pipe_log_append", "test");
    }

    const selectStep = dbReader.prepare(`
      SELECT stdout FROM pipeline_steps WHERE pipeline_id = ? AND name = ?
    `);
    const step = selectStep.get("pipe_log_append", "test") as { stdout: string };

    expect(step.stdout).toContain("log line 0");
    expect(step.stdout).toContain("log line 49");
  });
});
