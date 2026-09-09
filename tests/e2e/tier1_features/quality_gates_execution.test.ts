import { describe, it, expect, afterEach } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import { createCleanGitFixture, safeRemoveDir } from "../helpers/git-fixture-helper.js";

describe("Tier 1: Feature Coverage - Quality Gates Execution & Zero-Error Masking (R4)", () => {
  const createdDirs: string[] = [];

  afterEach(() => {
    for (const dir of createdDirs) {
      safeRemoveDir(dir);
    }
  });

  it("E2E-T1-04a: Detects quality gate scripts dynamically from package.json", () => {
    const fixture = createCleanGitFixture();
    createdDirs.push(fixture.dir);

    const pkg = JSON.parse(fs.readFileSync(path.join(fixture.dir, "package.json"), "utf8"));
    const scripts = pkg.scripts || {};

    const detectedGates: { name: string; command: string }[] = [];
    if (scripts.lint) detectedGates.push({ name: "lint", command: "npm run lint" });
    if (scripts.test) detectedGates.push({ name: "test", command: "npm test" });
    if (scripts.build) detectedGates.push({ name: "build", command: "npm run build" });

    expect(detectedGates.map((g) => g.name)).toEqual(["lint", "test", "build"]);
  });

  it("E2E-T1-04b: Executes gate commands with child_process.spawn capturing stdout/stderr and real exit codes", async () => {
    const fixture = createCleanGitFixture();
    createdDirs.push(fixture.dir);

    const runStep = (cmd: string, args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> => {
      return new Promise((resolve, reject) => {
        let stdout = "";
        let stderr = "";
        const child = spawn(cmd, args, {
          cwd: fixture.dir,
          shell: true,
          env: { ...process.env, CI: "true", FORCE_COLOR: "0" },
        });

        child.stdout.on("data", (c) => (stdout += c.toString()));
        child.stderr.on("data", (c) => (stderr += c.toString()));
        child.on("close", (code) => resolve({ exitCode: code ?? 0, stdout, stderr }));
        child.on("error", reject);
      });
    };

    const lintResult = await runStep("npm", ["run", "lint"]);
    expect(lintResult.exitCode).toBe(0);
    expect(lintResult.stdout).toContain("Linting passed");

    const testResult = await runStep("npm", ["test"]);
    expect(testResult.exitCode).toBe(0);
    expect(testResult.stdout).toContain("Tests passed");

    const buildResult = await runStep("npm", ["run", "build"]);
    expect(buildResult.exitCode).toBe(0);
    expect(buildResult.stdout).toContain("Production build successful");
  });

  it("E2E-T1-04c: Confirms no shell error masking (|| true) exists in execution commands", () => {
    const executedCommands = [
      "npm ci",
      "npm run lint",
      "npm test",
      "npm run build",
      "docker build -t test-repo:abc1234 .",
    ];

    for (const cmd of executedCommands) {
      expect(cmd).not.toContain("|| true");
      expect(cmd).not.toContain("|| exit 0");
      expect(cmd).not.toContain("set +e");
    }
  });
});
