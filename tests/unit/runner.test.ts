import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { RunnerService, getRunnerService } from "../../src/runner/runner.service.js";
import { getDatabaseService, resetDatabaseInstances } from "../../src/db/database.service.js";
import { createCleanGitFixture, createTsErrorGitFixture, safeRemoveDir } from "../e2e/helpers/git-fixture-helper.js";

describe("RunnerService Unit & Integration Tests", () => {
  const tempDbPath = path.join(os.tmpdir(), `cicd-runner-test-${Date.now()}.db`);
  const tempWorkspacesDir = path.join(os.tmpdir(), `cicd-runner-workspaces-${Date.now()}`);
  let runner: RunnerService;

  beforeEach(() => {
    process.env.DATABASE_PATH = tempDbPath;
    process.env.WORKSPACES_DIR = tempWorkspacesDir;
    resetDatabaseInstances();
    runner = new RunnerService(tempWorkspacesDir);
  });

  afterEach(() => {
    delete process.env.DATABASE_PATH;
    delete process.env.WORKSPACES_DIR;
    resetDatabaseInstances();
    safeRemoveDir(tempWorkspacesDir);
    try {
      if (fs.existsSync(tempDbPath)) fs.unlinkSync(tempDbPath);
    } catch {}
  });

  it("allocates workspace and detects directory traversal attempts", () => {
    const ws = runner.allocateWorkspace("valid-id-123");
    expect(ws).toContain("pipeline-valid-id-123");
    expect(fs.existsSync(ws)).toBe(true);

    expect(() => {
      runner.allocateWorkspace("../../../../escape");
    }).toThrow(/Directory traversal/);
  });

  it("handles getRunnerService singleton instance", () => {
    const instance1 = getRunnerService();
    const instance2 = getRunnerService();
    expect(instance1).toBe(instance2);
    expect(runner.getBaseWorkspaceDir()).toBe(tempWorkspacesDir);
  });

  it("gracefully handles dispatchGithubStatus when GITHUB_TOKEN is unset or set", async () => {
    // Unset token
    delete process.env.GITHUB_TOKEN;
    await expect(runner.dispatchGithubStatus("owner/repo", "sha123", "success", "p1", "desc")).resolves.toBeUndefined();

    // Set token with mock fetch
    process.env.GITHUB_TOKEN = "test-token";
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 201 }));
    await runner.dispatchGithubStatus("owner/repo", "sha123", "success", "p1", "desc");
    expect(fetchSpy).toHaveBeenCalled();
    fetchSpy.mockRestore();
    delete process.env.GITHUB_TOKEN;
  });

  it("executes a golden path pipeline to PASSED status", async () => {
    const fixture = createCleanGitFixture();
    const db = getDatabaseService(tempDbPath);

    const pipeline = db.createPipeline({
      id: "pipe_golden_unit",
      repository: fixture.repoName,
      branch: fixture.branch,
      commit_sha: fixture.commitSha,
      commit_message: "golden test",
      author: "Unit Tester",
      event: "push",
    });

    const statusEvents: string[] = [];
    runner.on("pipeline:status", (e) => statusEvents.push(e.status));

    await runner.executePipeline(pipeline.id, fixture.dir);

    const updated = db.getPipelineById(pipeline.id);
    expect(updated?.status).toBe("PASSED");
    expect(statusEvents).toContain("RUNNING");
    expect(statusEvents).toContain("PASSED");

    fixture.cleanup();
  });

  it("executes a pipeline with TypeScript errors to FAILED status", async () => {
    const fixture = createTsErrorGitFixture();
    const db = getDatabaseService(tempDbPath);

    const pipeline = db.createPipeline({
      id: "pipe_error_unit",
      repository: fixture.repoName,
      branch: fixture.branch,
      commit_sha: fixture.commitSha,
      commit_message: "ts error test",
      author: "Unit Tester",
      event: "push",
    });

    await runner.executePipeline(pipeline.id, fixture.dir);

    const updated = db.getPipelineById(pipeline.id);
    expect(updated?.status).toBe("FAILED");

    fixture.cleanup();
  });

  it("handles non-existent pipeline or invalid commit gracefully", async () => {
    await expect(runner.executePipeline("non_existent_id")).resolves.toBeUndefined();

    const db = getDatabaseService(tempDbPath);
    const pipeline = db.createPipeline({
      id: "pipe_invalid_commit",
      repository: "owner/repo",
      branch: "main",
      commit_sha: "invalid0000000000000000000000000000000",
      event: "push",
    });

    await runner.executePipeline(pipeline.id);
    const updated = db.getPipelineById(pipeline.id);
    expect(updated?.status).toBe("FAILED");
  });
});
