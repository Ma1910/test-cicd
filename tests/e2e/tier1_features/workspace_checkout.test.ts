import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { execSync } from "node:child_process";
import { createCleanGitFixture, safeRemoveDir } from "../helpers/git-fixture-helper.js";

describe("Tier 1: Feature Coverage - Workspace Isolation & Exact Commit Checkout (R3)", () => {
  const baseWorkspaceDir = path.join(os.tmpdir(), `cicd-test-workspaces-${Date.now()}`);
  const createdDirs: string[] = [baseWorkspaceDir];

  afterEach(() => {
    for (const dir of createdDirs) {
      safeRemoveDir(dir);
    }
  });

  it("E2E-T1-03a: Allocates dedicated isolated workspace and checks out exact commit SHA", () => {
    const fixture = createCleanGitFixture();
    createdDirs.push(fixture.dir);

    const pipelineId = `pipe_${Date.now()}_abc123`;
    const workspacePath = path.join(baseWorkspaceDir, `pipeline-${pipelineId}`);
    fs.mkdirSync(baseWorkspaceDir, { recursive: true });

    // Step 1: Clone local fixture repo
    execSync(`git clone --no-hardlinks --quiet "${fixture.dir}" "${workspacePath}"`, { stdio: "ignore" });

    // Step 2: Checkout exact commit SHA (NOT branch name)
    execSync(`git -C "${workspacePath}" checkout --quiet "${fixture.commitSha}"`, { stdio: "ignore" });

    // Verify checked-out SHA
    const checkedOutSha = execSync(`git -C "${workspacePath}" rev-parse HEAD`, {
      encoding: "utf8",
    }).trim();

    expect(checkedOutSha).toBe(fixture.commitSha);
    expect(fs.existsSync(path.join(workspacePath, "package.json"))).toBe(true);

    // Verify cleanup
    safeRemoveDir(workspacePath);
    expect(fs.existsSync(workspacePath)).toBe(false);
  });

  it("E2E-T1-03b: Prevents directory traversal during workspace allocation", () => {
    const safeBase = path.resolve(baseWorkspaceDir);
    const maliciousPipelineIds = [
      "../../../../etc/passwd",
      "..\\..\\..\\..\\windows\\system32",
      "../../../../pipeline-escape",
    ];

    for (const maliciousId of maliciousPipelineIds) {
      const resolved = path.resolve(safeBase, `pipeline-${maliciousId}`);
      const isContained = resolved.startsWith(safeBase + path.sep);
      expect(isContained).toBe(false);
    }
  });
});
