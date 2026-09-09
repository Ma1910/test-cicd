import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import http from "node:http";
import { app } from "../../src/app.js";
import { getDatabaseService, resetDatabaseInstances } from "../../src/db/database.service.js";
import { getRunnerService } from "../../src/runner/runner.service.js";

describe("Pipelines API Unit & Route Tests", () => {
  const tempDbPath = path.join(os.tmpdir(), `cicd-api-unit-${Date.now()}.db`);

  beforeEach(() => {
    process.env.DATABASE_PATH = tempDbPath;
    resetDatabaseInstances();
    const db = getDatabaseService(tempDbPath);

    db.createPipeline({
      id: "pipe_api_unit_1",
      repository: "Ma1910/test-cicd",
      branch: "main",
      commit_sha: "abc1234",
      status: "PASSED",
      started_at: "2026-09-08T18:00:00.000Z",
      finished_at: "2026-09-08T18:00:05.000Z",
      duration: 5.0,
    });

    db.createStep({
      pipeline_id: "pipe_api_unit_1",
      name: "lint",
      status: "PASSED",
      exit_code: 0,
      stdout: "Clean\n",
    });
  });

  afterEach(() => {
    delete process.env.DATABASE_PATH;
    resetDatabaseInstances();
    try {
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    } catch {}
  });

  it("GET /api/pipelines lists pipelines with pagination", async () => {
    const res = await request(app).get("/api/pipelines?limit=10&offset=0");
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(res.body.pipelines)).toBe(true);
  });

  it("GET /api/pipelines/:id returns single pipeline with steps or 404", async () => {
    const resFound = await request(app).get("/api/pipelines/pipe_api_unit_1");
    expect(resFound.status).toBe(200);
    expect(resFound.body.id).toBe("pipe_api_unit_1");
    expect(resFound.body.steps.length).toBe(1);

    const resMissing = await request(app).get("/api/pipelines/missing_id");
    expect(resMissing.status).toBe(404);
  });

  it("GET /api/pipelines/:id/logs returns logs or 404", async () => {
    const resFound = await request(app).get("/api/pipelines/pipe_api_unit_1/logs");
    expect(resFound.status).toBe(200);
    expect(resFound.body.logs.length).toBe(1);
    expect(resFound.body.logs[0].step).toBe("lint");

    const resMissing = await request(app).get("/api/pipelines/missing_id/logs");
    expect(resMissing.status).toBe(404);
  });

  it("POST /api/pipelines/run queues a pipeline run with custom payload", async () => {
    const res = await request(app)
      .post("/api/pipelines/run")
      .send({
        repository: "Ma1910/test-cicd",
        branch: "feature/test",
        commit_sha: "def5678",
      });

    expect(res.status).toBe(202);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe("QUEUED");
  });

  it("POST /api/pipelines/run falls back to git defaults when body is empty", async () => {
    const res = await request(app).post("/api/pipelines/run").send({});
    expect(res.status).toBe(202);
    expect(res.body.pipeline.repository).toBeDefined();
    expect(res.body.pipeline.branch).toBeDefined();
  });

  it("GET /api/pipelines/:id/stream handles failed pipeline done immediately", async () => {
    const db = getDatabaseService(tempDbPath);
    db.createPipeline({
      id: "pipe_failed_stream",
      repository: "owner/repo",
      branch: "main",
      commit_sha: "fail111",
      status: "FAILED",
    });

    const res = await request(app)
      .get("/api/pipelines/pipe_failed_stream/stream")
      .set("Accept", "text/event-stream");

    expect(res.status).toBe(200);
    expect(res.text).toContain("event: pipeline:done");
    expect(res.text).toContain('"status":"FAILED"');
  });

  it("GET /api/pipelines/:id/stream sends init and done for finished pipeline", async () => {
    const res = await request(app)
      .get("/api/pipelines/pipe_api_unit_1/stream")
      .set("Accept", "text/event-stream");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
    expect(res.text).toContain("event: pipeline:init");
    expect(res.text).toContain("event: pipeline:done");
  });

  it("GET /api/pipelines/:id/stream handles active streaming events and client close", async () => {
    const db = getDatabaseService(tempDbPath);
    db.createPipeline({
      id: "pipe_running_stream",
      repository: "owner/repo",
      branch: "main",
      commit_sha: "abc111",
      status: "RUNNING",
    });

    const runner = getRunnerService();
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;

    const req = http.get(`http://127.0.0.1:${port}/api/pipelines/pipe_running_stream/stream`);
    await new Promise((r) => setTimeout(r, 50));

    runner.emit("step:status", { pipelineId: "pipe_running_stream", stepName: "lint", status: "RUNNING", exitCode: null });
    runner.emit("step:log", { pipelineId: "pipe_running_stream", stepName: "lint", type: "stdout", chunk: "log1" });
    runner.emit("pipeline:status", { pipelineId: "pipe_running_stream", status: "PASSED", duration: 2.5 });

    await new Promise((r) => setTimeout(r, 50));
    req.destroy();
    server.close();
  });
});
