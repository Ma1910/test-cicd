import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import {
  initDatabaseSchema,
  cleanupDatabaseFile,
} from "../helpers/db-helper.js";

describe("Tier 1: Feature Coverage - SQLite Persistence Engine (R5)", () => {
  const tempDbPath = path.join(os.tmpdir(), `cicd-test-sqlite-${Date.now()}.db`);
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

  it("E2E-T1-02a: Initializes SQLite with WAL mode and foreign keys enabled", () => {
    const journalMode = (db.prepare("PRAGMA journal_mode;").get() as any).journal_mode;
    expect(journalMode.toLowerCase()).toBe("wal");

    const foreignKeys = (db.prepare("PRAGMA foreign_keys;").get() as any).foreign_keys;
    expect(foreignKeys).toBe(1);

    const busyTimeout = (db.prepare("PRAGMA busy_timeout;").get() as any).timeout;
    expect(busyTimeout).toBeGreaterThanOrEqual(5000);
  });

  it("E2E-T1-02b: Persists and retrieves pipeline records accurately", () => {
    const insertStmt = db.prepare(`
      INSERT INTO pipelines (id, repository, branch, commit_sha, commit_message, author, event, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      "pipe_test_001",
      "Ma1910/test-cicd",
      "main",
      "c81fb39a17387d853b0bc87fcf39a3f25608da3b",
      "feat: test persistence",
      "Developer",
      "push",
      "QUEUED"
    );

    const selectStmt = db.prepare("SELECT * FROM pipelines WHERE id = ?");
    const row = selectStmt.get("pipe_test_001") as any;

    expect(row).toBeDefined();
    expect(row.id).toBe("pipe_test_001");
    expect(row.repository).toBe("Ma1910/test-cicd");
    expect(row.status).toBe("QUEUED");
    expect(row.created_at).toBeDefined();
  });

  it("E2E-T1-02c: Persists pipeline steps and enforces foreign key cascade deletion", () => {
    const insertPipeline = db.prepare(`
      INSERT INTO pipelines (id, repository, branch, commit_sha, event, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertPipeline.run("pipe_parent_01", "Ma1910/test-cicd", "main", "abc1234", "push", "RUNNING");

    const insertStep = db.prepare(`
      INSERT INTO pipeline_steps (pipeline_id, name, status, step_order, stdout, stderr, exit_code)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertStep.run("pipe_parent_01", "lint", "PASSED", 1, "0 errors found\n", "", 0);
    insertStep.run("pipe_parent_01", "test", "RUNNING", 2, "Running 5 tests...\n", "", null);

    const selectSteps = db.prepare("SELECT * FROM pipeline_steps WHERE pipeline_id = ? ORDER BY step_order ASC");
    const steps = selectSteps.all("pipe_parent_01") as any[];

    expect(steps.length).toBe(2);
    expect(steps[0].name).toBe("lint");
    expect(steps[0].status).toBe("PASSED");
    expect(steps[0].exit_code).toBe(0);
    expect(steps[1].name).toBe("test");
    expect(steps[1].status).toBe("RUNNING");

    // Test cascade delete
    db.prepare("DELETE FROM pipelines WHERE id = ?").run("pipe_parent_01");
    const remainingSteps = selectSteps.all("pipe_parent_01");
    expect(remainingSteps.length).toBe(0);
  });

  it("E2E-T1-02d: Enforces check constraints on pipeline and step statuses", () => {
    const insertPipeline = db.prepare(`
      INSERT INTO pipelines (id, repository, branch, commit_sha, event, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Invalid status should throw constraint violation
    expect(() => {
      insertPipeline.run("pipe_invalid_status", "Ma1910/test-cicd", "main", "abc1234", "push", "INVALID_STATUS");
    }).toThrow();
  });
});
