import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { createCleanGitFixture, safeRemoveDir } from "../helpers/git-fixture-helper.js";

describe("Tier 2: Boundary & Corner Cases - Commit SHA Boundaries (R3)", () => {
  it("E2E-T2-03a: Validates 40-character hexadecimal SHA regex pattern", () => {
    const validSha40 = "c81fb39a17387d853b0bc87fcf39a3f25608da3b";
    const validShaShort = "c81fb39";
    const invalidShaNonHex = "c81fb39a17387d853b0bc87fcf39a3f25608dazz";
    const invalidShaWithSymbols = "c81fb39a17387d853b0bc87fcf39a3f25608da!!";

    const shaRegex = /^[0-9a-f]{7,40}$/i;

    expect(shaRegex.test(validSha40)).toBe(true);
    expect(shaRegex.test(validShaShort)).toBe(true);
    expect(shaRegex.test(invalidShaNonHex)).toBe(false);
    expect(shaRegex.test(invalidShaWithSymbols)).toBe(false);
  });

  it("E2E-T2-03b: Non-existent commit SHA causes git checkout to fail with non-zero exit code", () => {
    const fixture = createCleanGitFixture();

    try {
      const nonExistentSha = "0000000000000000000000000000000000000000";
      expect(() => {
        execSync(`git -C "${fixture.dir}" checkout --quiet ${nonExistentSha}`, {
          stdio: "pipe",
        });
      }).toThrow();
    } finally {
      safeRemoveDir(fixture.dir);
    }
  });
});
