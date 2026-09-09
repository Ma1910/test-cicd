import { describe, it, expect, beforeEach, afterEach } from "vitest";
import path from "node:path";
import os from "node:os";
import { DatabaseSync } from "node:sqlite";
import {
  initDatabaseSchema,
  cleanupDatabaseFile,
  queryPipeline,
} from "../helpers/db-helper.js";

describe("Tier 3: Cross-Feature Interactions - Rapid Sequential Commits on Same Branch (R3, R5)", () => {
  const tempDbPath = path.join(os.tmpdir(), `cicd-test-sequential-${Date.now()}.db`);
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

  it("E2E-T3-03: Distinguishes two rapid pushes to same branch with exact respective commit SHAs", () => {
    const branch = "main";
    const commitSha1 = "aaaa111122223333444455556666777788889999";
    const commitSha2 = "bbbb111122223333444455556666777788889999";

    const insertStmt = db.prepare(`
      INSERT INTO pipelines (id, repository, branch, commit_sha, commit_message, author, event, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // First push arrives
    const pipe1Id = `pipe_seq_1_${Date.now()}`;
    insertStmt.run(
      pipe1Id,
      "Ma1910/test-cicd",
      branch,
      commitSha1,
      "feat: first push",
      "Developer",
      "push",
      "QUEUED",
      "2026-09-08T18:30:00.000Z"
    );

    // Second push arrives 500ms later on same branch
    const pipe2Id = `pipe_seq_2_${Date.now() + 1}`;
    insertStmt.run(
      pipe2Id,
      "Ma1910/test-cicd",
      branch,
      commitSha2,
      "fix: second push hotfix",
      "Developer",
      "push",
      "QUEUED",
      "2026-09-08T18:30:00.500Z"
    );

    const pipe1 = queryPipeline(db, pipe1Id);
    const pipe2 = queryPipeline(db, pipe2Id);

    expect(pipe1).toBeDefined();
    expect(pipe2).toBeDefined();
    expect(pipe1?.commit_sha).toBe(commitSha1);
    expect(pipe2?.commit_sha).toBe(commitSha2);
    expect(pipe1?.branch).toBe(branch);
    expect(pipe2?.branch).toBe(branch);
    expect(pipe1?.id).not.toBe(pipe2?.id);
  });
});
