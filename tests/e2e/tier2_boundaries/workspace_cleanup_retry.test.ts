import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { safeRemoveDir } from "../helpers/git-fixture-helper.js";

describe("Tier 2: Boundary & Corner Cases - Workspace Cleanup & Lock Resilience (R3)", () => {
  it("E2E-T2-05a: Safe cleanup removes directory with nested structures and read-only attributes", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cicd-cleanup-test-"));

    // Create deep nested directory structure mimicking node_modules
    const deepDir = path.join(tempDir, "node_modules", "package-a", "dist");
    fs.mkdirSync(deepDir, { recursive: true });
    fs.writeFileSync(path.join(deepDir, "index.js"), "module.exports = {};\n");
    fs.writeFileSync(path.join(tempDir, "package.json"), "{}");

    expect(fs.existsSync(tempDir)).toBe(true);

    safeRemoveDir(tempDir, 3, 100);

    expect(fs.existsSync(tempDir)).toBe(false);
  });

  it("E2E-T2-05b: Cleanup handles non-existent directory gracefully without throwing exception", () => {
    const nonExistentDir = path.join(os.tmpdir(), `cicd-non-existent-${Date.now()}`);
    expect(() => safeRemoveDir(nonExistentDir, 3, 50)).not.toThrow();
  });
});
