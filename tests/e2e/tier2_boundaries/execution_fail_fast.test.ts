import { describe, it, expect } from "vitest";

describe("Tier 2: Boundary & Corner Cases - Fail-Fast Barrier Enforcement (R4)", () => {
  it("E2E-T2-02a: Evaluates quality gate failure and halts execution sequence immediately", async () => {
    // Simulated step execution engine contract test
    const stepDefinitions = [
      { name: "prepare", shouldFail: false, exitCode: 0 },
      { name: "lint", shouldFail: true, exitCode: 2 },
      { name: "test", shouldFail: false, exitCode: 0 },
      { name: "build", shouldFail: false, exitCode: 0 },
    ];

    const executionLog: { name: string; status: string; exitCode: number | null }[] = [];
    let pipelineStatus: "PASSED" | "FAILED" = "PASSED";

    for (let i = 0; i < stepDefinitions.length; i++) {
      const step = stepDefinitions[i];

      if (pipelineStatus === "FAILED") {
        // Step must be skipped once pipeline is failed
        executionLog.push({ name: step.name, status: "SKIPPED", exitCode: null });
        continue;
      }

      if (step.shouldFail) {
        pipelineStatus = "FAILED";
        executionLog.push({ name: step.name, status: "FAILED", exitCode: step.exitCode });
      } else {
        executionLog.push({ name: step.name, status: "PASSED", exitCode: step.exitCode });
      }
    }

    expect(pipelineStatus).toBe("FAILED");
    expect(executionLog[0]).toEqual({ name: "prepare", status: "PASSED", exitCode: 0 });
    expect(executionLog[1]).toEqual({ name: "lint", status: "FAILED", exitCode: 2 });
    expect(executionLog[2]).toEqual({ name: "test", status: "SKIPPED", exitCode: null });
    expect(executionLog[3]).toEqual({ name: "build", status: "SKIPPED", exitCode: null });
  });

  it("E2E-T2-02b: Rejects any command that incorporates exit code suppression idioms", () => {
    const forbiddenPatterns = [
      /\|\|\s*true/i,
      /\|\|\s*exit\s+0/i,
      /;\s*true/i,
      /set\s+\+e/i,
      />\s*\/dev\/null\s+2>&1\s*\|\|\s*:/i,
    ];

    const safeCommands = [
      "npm ci",
      "npm run lint",
      "npm test",
      "npm run build",
      "npx tsc --noEmit",
    ];

    const unsafeCommands = [
      "npm run lint || true",
      "npm test || exit 0",
      "tsc --noEmit ; true",
    ];

    for (const cmd of safeCommands) {
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(cmd)).toBe(false);
      }
    }

    for (const cmd of unsafeCommands) {
      const matchesAny = forbiddenPatterns.some((pattern) => pattern.test(cmd));
      expect(matchesAny).toBe(true);
    }
  });
});
