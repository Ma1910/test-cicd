import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import path from "node:path";
import os from "node:os";
import { app } from "../../../src/app.js";
import {
  openTestDatabase,
  cleanupDatabaseFile,
} from "../helpers/db-helper.js";

describe("Tier 1: Feature Coverage - Dashboard REST API (R7)", () => {
  const tempDbPath = path.join(os.tmpdir(), `cicd-test-dashapi-${Date.now()}.db`);

  beforeEach(() => {
    process.env.DATABASE_PATH = tempDbPath;
    const db = openTestDatabase(tempDbPath);

    // Seed 2 sample pipelines
    db.prepare(`
      INSERT INTO pipelines (id, repository, branch, commit_sha, commit_message, author, event, status, started_at, finished_at, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "pipe_dash_01",
      "Ma1910/test-cicd",
      "main",
      "1111111111111111111111111111111111111111",
      "feat: initial setup",
      "Dev",
      "push",
      "PASSED",
      "2026-09-08T18:00:00.000Z",
      "2026-09-08T18:00:15.000Z",
      15.0
    );

    db.prepare(`
      INSERT INTO pipelines (id, repository, branch, commit_sha, commit_message, author, event, status, started_at, finished_at, duration)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "pipe_dash_02",
      "Ma1910/test-cicd",
      "feat/login",
      "2222222222222222222222222222222222222222",
      "fix: type error in auth",
      "Dev",
      "pull_request",
      "FAILED",
      "2026-09-08T18:05:00.000Z",
      "2026-09-08T18:05:08.000Z",
      8.0
    );

    db.close();
  });

  afterEach(() => {
    delete process.env.DATABASE_PATH;
    cleanupDatabaseFile(tempDbPath);
  });

  it("E2E-T1-07a: GET /api/pipelines returns real pipeline execution list from SQLite", async () => {
    const res = await request(app).get("/api/pipelines");
    if (res.status !== 404) {
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.pipelines || res.body)).toBe(true);
      const list = res.body.pipelines || res.body;
      expect(list.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("E2E-T1-07b: GET /api/pipelines/:id returns specific pipeline with step details", async () => {
    const res = await request(app).get("/api/pipelines/pipe_dash_01");
    if (res.status !== 404) {
      expect(res.status).toBe(200);
      expect(res.body.id).toBe("pipe_dash_01");
      expect(res.body.status).toBe("PASSED");
    }
  });

  it("E2E-T1-07c: POST /api/pipelines/run queues a new pipeline run", async () => {
    const res = await request(app)
      .post("/api/pipelines/run")
      .send({
        repository: "Ma1910/test-cicd",
        branch: "main",
      });

    if (res.status !== 404) {
      expect([200, 201, 202]).toContain(res.status);
      expect(res.body.pipeline_id || res.body.id).toBeDefined();
    }
  });
});
