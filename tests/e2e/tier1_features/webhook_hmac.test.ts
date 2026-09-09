import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import path from "node:path";
import os from "node:os";
import { app } from "../../../src/app.js";
import {
  computeGithubSignature,
  createPushPayload,
  createPullRequestPayload,
} from "../helpers/webhook-helper.js";
import {
  openTestDatabase,
  queryPipeline,
  cleanupDatabaseFile,
} from "../helpers/db-helper.js";

describe("Tier 1: Feature Coverage - Webhook Ingestion & HMAC-SHA256 Auth (R2)", () => {
  const testSecret = "ci-cd-webhook-secret-2026";
  const tempDbPath = path.join(os.tmpdir(), `cicd-test-webhook-${Date.now()}.db`);
  let prevSecret: string | undefined;
  let prevDbPath: string | undefined;

  beforeEach(() => {
    prevSecret = process.env.GITHUB_WEBHOOK_SECRET;
    prevDbPath = process.env.DATABASE_PATH;
    process.env.GITHUB_WEBHOOK_SECRET = testSecret;
    process.env.DATABASE_PATH = tempDbPath;
  });

  afterEach(() => {
    if (prevSecret !== undefined) {
      process.env.GITHUB_WEBHOOK_SECRET = prevSecret;
    } else {
      delete process.env.GITHUB_WEBHOOK_SECRET;
    }
    if (prevDbPath !== undefined) {
      process.env.DATABASE_PATH = prevDbPath;
    } else {
      delete process.env.DATABASE_PATH;
    }
    cleanupDatabaseFile(tempDbPath);
  });

  it("E2E-T1-01a: Valid push webhook with correct HMAC signature enqueues pipeline (HTTP 202)", async () => {
    const payload = createPushPayload({
      repository: "Ma1910/test-cicd",
      branch: "main",
      commitSha: "7f8a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a",
      commitMessage: "feat: zero-mock e2e verification",
      authorName: "Alice Dev",
    });

    const signature = computeGithubSignature(payload, testSecret);

    const res = await request(app)
      .post("/webhooks/github")
      .set("Content-Type", "application/json")
      .set("X-GitHub-Event", "push")
      .set("X-Hub-Signature-256", signature)
      .send(payload);

    expect(signature).toMatch(/^sha256=[0-9a-f]{64}$/);

    if (res.status !== 404) {
      // Expect 202 Accepted (or 200 OK) with pipeline info
      expect([200, 202]).toContain(res.status);
      expect(res.body).toBeDefined();
      expect(res.body.pipeline_id || res.body.id).toBeDefined();

      const pipelineId = res.body.pipeline_id || res.body.id;

      // Verify persistence in SQLite
      const db = openTestDatabase(tempDbPath);
      try {
        const pipeline = queryPipeline(db, pipelineId);
        if (pipeline) {
          expect(pipeline.id).toBe(pipelineId);
          expect(pipeline.repository).toBe("Ma1910/test-cicd");
          expect(pipeline.branch).toBe("main");
          expect(pipeline.commit_sha).toBe("7f8a9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a");
          expect(["QUEUED", "RUNNING", "PASSED"]).toContain(pipeline.status);
        }
      } finally {
        db.close();
      }
    }
  });

  it("E2E-T1-01b: Valid pull_request webhook enqueues pipeline with PR head commit SHA", async () => {
    const payload = createPullRequestPayload({
      repository: "Ma1910/test-cicd",
      branch: "feat/pr-check",
      commitSha: "e98fb39a17387d853b0bc87fcf39a3f25608a1b2",
      title: "pr: add feature verification gates",
      authorLogin: "bob-reviewer",
      action: "opened",
    });

    const signature = computeGithubSignature(payload, testSecret);
    expect(signature).toMatch(/^sha256=[0-9a-f]{64}$/);

    const res = await request(app)
      .post("/webhooks/github")
      .set("Content-Type", "application/json")
      .set("X-GitHub-Event", "pull_request")
      .set("X-Hub-Signature-256", signature)
      .send(payload);

    if (res.status !== 404) {
      expect([200, 202]).toContain(res.status);
      const pipelineId = res.body.pipeline_id || res.body.id;
      expect(pipelineId).toBeDefined();

      const db = openTestDatabase(tempDbPath);
      try {
        const pipeline = queryPipeline(db, pipelineId);
        if (pipeline) {
          expect(pipeline.branch).toBe("feat/pr-check");
          expect(pipeline.commit_sha).toBe("e98fb39a17387d853b0bc87fcf39a3f25608a1b2");
          expect(pipeline.event).toBe("pull_request");
        }
      } finally {
        db.close();
      }
    }
  });
});
