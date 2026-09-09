import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as childProcess from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getRealGitCommits, getRepositoryInfo, gitExecutor } from "../../src/git.service.js";
import { renderDashboardHtml } from "../../src/dashboard.template.js";

describe("Empirical Challenge Suite: Mock Purge, Git Service & Dashboard Template", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Git Service: Environment Variable Overrides
  // =========================================================================
  describe("1. Git Service: Environment Variable Overrides", () => {
    it("CHAL-GIT-001: GITHUB_REPOSITORY environment variable overrides git remote", () => {
      process.env.GITHUB_REPOSITORY = "enterprise-ci/real-production-repo";
      const info = getRepositoryInfo();

      expect(info.repository).toBe("enterprise-ci/real-production-repo");
      if (info.commits.length > 0) {
        expect(info.commits[0].url).toContain("https://github.com/enterprise-ci/real-production-repo/commit/");
      }
    });

    it("CHAL-GIT-002: GIT_BRANCH environment variable overrides git HEAD branch", () => {
      process.env.GIT_BRANCH = "feature/quality-gates-v2";
      const info = getRepositoryInfo();

      expect(info.branch).toBe("feature/quality-gates-v2");
    });

    it("CHAL-GIT-003: Empty string environment variables gracefully fall back to dynamic git detection", () => {
      process.env.GITHUB_REPOSITORY = "";
      process.env.GIT_BRANCH = "";

      const info = getRepositoryInfo();
      // Should not return empty string
      expect(info.repository.length).toBeGreaterThan(0);
      expect(info.branch.length).toBeGreaterThan(0);
      expect(info.repository).not.toBe("");
      expect(info.branch).not.toBe("");
    });

    it("CHAL-GIT-004: Special characters and nested names in GITHUB_REPOSITORY are preserved safely", () => {
      process.env.GITHUB_REPOSITORY = "my-org/ci-cd.tool_2026";
      const info = getRepositoryInfo();

      expect(info.repository).toBe("my-org/ci-cd.tool_2026");
      if (info.commits.length > 0) {
        expect(info.commits[0].url).toBe(`https://github.com/my-org/ci-cd.tool_2026/commit/${info.commits[0].hash}`);
      }
    });
  });

  // =========================================================================
  // 2. Git Service: Commit Queries & Edge Cases
  // =========================================================================
  describe("2. Git Service: Commit Queries & Edge Cases", () => {
    it("CHAL-GIT-005: getRealGitCommits extracts real commit properties adhering to GitCommitRecord schema", () => {
      const commits = getRealGitCommits(5);
      expect(Array.isArray(commits)).toBe(true);

      for (const c of commits) {
        expect(typeof c.hash).toBe("string");
        expect(c.hash.length).toBeGreaterThan(0);
        expect(typeof c.message).toBe("string");
        expect(c.message.length).toBeGreaterThan(0);
        expect(typeof c.author).toBe("string");
        expect(c.author.length).toBeGreaterThan(0);
        expect(typeof c.relativeTime).toBe("string");
        expect(typeof c.url).toBe("string");
      }
    });

    it("CHAL-GIT-006: getRealGitCommits(0) returns an empty array cleanly without crashing", () => {
      const commits = getRealGitCommits(0);
      expect(commits).toEqual([]);
    });

    it("CHAL-GIT-007: getRealGitCommits handles negative maxCount by catching git error and returning empty array", () => {
      const commits = getRealGitCommits(-1);
      expect(Array.isArray(commits)).toBe(true);
      expect(commits).toEqual([]);
    });

    it("CHAL-GIT-008: getRealGitCommits with large maxCount returns available commits without overflow", () => {
      const commits = getRealGitCommits(500);
      expect(Array.isArray(commits)).toBe(true);
      expect(commits.length).toBeGreaterThan(0);
      expect(commits.length).toBeLessThanOrEqual(500);
    });

    it("CHAL-GIT-009: Commits have valid URLs (either local hash route or GitHub commit URL)", () => {
      const commits = getRealGitCommits(3);
      for (const c of commits) {
        const isGithubUrl = c.url.startsWith("https://github.com/") && c.url.includes("/commit/");
        const isLocalUrl = c.url.startsWith("#/commit/");
        expect(isGithubUrl || isLocalUrl).toBe(true);
      }
    });
  });

  // =========================================================================
  // 3. Git Service: Dirty Worktree & Failure Resiliency
  // =========================================================================
  describe("3. Git Service: Dirty Worktree & Failure Resiliency", () => {
    it("CHAL-GIT-010: Dirty worktree (uncommitted/untracked files) does not break commit extraction", () => {
      const dirtyFilePath = path.join(process.cwd(), "temp_dirty_worktree_test.txt");
      try {
        fs.writeFileSync(dirtyFilePath, "temporary uncommitted modification for stress test");

        const info = getRepositoryInfo();
        expect(info).toBeDefined();
        expect(info.commits.length).toBeGreaterThan(0);
        expect(typeof info.branch).toBe("string");
        expect(info.totalCommits).toBe(info.commits.length);
      } finally {
        if (fs.existsSync(dirtyFilePath)) {
          fs.unlinkSync(dirtyFilePath);
        }
      }
    });

    it("CHAL-GIT-011: Complete git command failure returns fallback defaults without throwing", () => {
      // Mock git execution to throw
      const execSpy = vi.spyOn(gitExecutor, "exec").mockImplementation(() => {
        throw new Error("fatal: not a git repository (or any of the parent directories): .git");
      });

      delete process.env.GITHUB_REPOSITORY;
      delete process.env.GIT_BRANCH;

      const info = getRepositoryInfo();
      expect(info).toBeDefined();
      expect(info.repository).toBe("local/ci-cd-quicktest");
      expect(info.branch).toBe("main");
      expect(info.totalCommits).toBe(0);
      expect(info.commits).toEqual([]);

      execSpy.mockRestore();
    });

    it("CHAL-GIT-012: Empty git log output returns empty array cleanly", () => {
      const execSpy = vi.spyOn(gitExecutor, "exec").mockReturnValue("");

      const commits = getRealGitCommits(10);
      expect(commits).toEqual([]);

      execSpy.mockRestore();
    });
  });

  // =========================================================================
  // 4. Dashboard Template: Zero-Mock & Absence of Simulation Loops
  // =========================================================================
  describe("4. Dashboard Template: Zero-Mock & Absence of Simulation Loops", () => {
    const html = renderDashboardHtml();

    it("CHAL-UI-001: Renders valid non-empty HTML containing standard doctype and structure", () => {
      expect(typeof html).toBe("string");
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
      expect(html).toContain("<title>CI/CD Automation Platform</title>");
    });

    it("CHAL-UI-002: Complete absence of wait(ms) function or simulation delays", () => {
      expect(html).not.toMatch(/function\s+wait\s*\(/);
      expect(html).not.toMatch(/await\s+wait\s*\(/);
      expect(html).not.toMatch(/wait\s*\(\s*\d+\s*\)/);
    });

    it("CHAL-UI-003: Complete absence of #scenario-select dropdown and fake simulation options", () => {
      expect(html).not.toContain("scenario-select");
      expect(html).not.toContain("<select");
      expect(html).not.toMatch(/scenario\s*===\s*['"]typecheck['"]/);
      expect(html).not.toMatch(/scenario\s*===\s*['"]secret['"]/);
      expect(html).not.toMatch(/scenario\s*===\s*['"]test['"]/);
      expect(html).not.toMatch(/scenario\s*===\s*['"]build['"]/);
    });

    it("CHAL-UI-004: Complete absence of synthetic SIMULATE_FAIL or hardcoded pass metrics", () => {
      expect(html).not.toContain("SIMULATE_FAIL");
      expect(html).not.toContain("Pass 100%");
      expect(html).not.toMatch(/REAL_GIT_COMMITS/);
    });

    it("CHAL-UI-005: Zero setTimeout simulation loops in triggerPipeline or pipeline flow", () => {
      // Extract triggerPipeline function body
      const triggerFnMatch = html.match(/async function triggerPipeline\(\)\s*\{([\s\S]*?)\n\s{4}\}/);
      expect(triggerFnMatch).not.toBeNull();
      const triggerFnBody = triggerFnMatch![1];

      expect(triggerFnBody).not.toContain("setTimeout");
      expect(triggerFnBody).not.toContain("wait(");
      expect(triggerFnBody).not.toContain("setInterval");
    });

    it("CHAL-UI-006: triggerPipeline is wired to genuine POST /api/pipelines/run", () => {
      expect(html).toContain("fetch('/api/pipelines/run'");
      expect(html).toContain("method: 'POST'");
    });

    it("CHAL-UI-007: loadRealCommits is wired to genuine GET /api/v1/git/commits", () => {
      expect(html).toContain("fetch('/api/v1/git/commits')");
    });

    it("CHAL-UI-008: updateSystemMetrics is wired to genuine /healthz?format=json", () => {
      expect(html).toContain("fetch('/healthz?format=json')");
    });

    it("CHAL-UI-009: Quality Gate DOM nodes exist for all 5 stages", () => {
      expect(html).toContain('id="node-code"');
      expect(html).toContain('id="node-build"');
      expect(html).toContain('id="node-test"');
      expect(html).toContain('id="node-docker"');
      expect(html).toContain('id="node-prod"');
    });

    it("CHAL-UI-010: Dynamic SVG Laser Lines connector layer exists for realtime animation", () => {
      expect(html).toContain('id="connection-layer"');
      expect(html).toContain('class="laser-line"');
      expect(html).toContain('class="laser-error"');
    });
  });

  // =========================================================================
  // 5. Global Mock / Retained Fallback Audit
  // =========================================================================
  describe("5. Global Mock / Retained Fallback Audit", () => {
    it("CHAL-SEC-001: src/git.service.ts contains no static commit arrays", () => {
      const gitServiceSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src", "git.service.ts"),
        "utf8"
      );
      expect(gitServiceSrc).not.toContain("REAL_GIT_COMMITS");
      expect(gitServiceSrc).not.toMatch(/const\s+COMMITS\s*=/);
      expect(gitServiceSrc).not.toMatch(/const\s+commits\s*=\s*\[/);
    });

    it("CHAL-SEC-002: src/app.ts contains no SIMULATE_FAIL or fake status toggles", () => {
      const appSrc = fs.readFileSync(
        path.resolve(process.cwd(), "src", "app.ts"),
        "utf8"
      );
      expect(appSrc).not.toContain("SIMULATE_FAIL");
      expect(appSrc).not.toContain("scenario");
    });

    it("CHAL-SEC-003: docs/index.html contains no wait(ms) or #scenario-select dropdown", () => {
      const docsHtml = fs.readFileSync(
        path.resolve(process.cwd(), "docs", "index.html"),
        "utf8"
      );
      expect(docsHtml).not.toMatch(/function\s+wait\s*\(/);
      expect(docsHtml).not.toContain("scenario-select");
      expect(docsHtml).not.toContain("<select");
    });

    it("CHAL-SEC-004: scripts/open-cicd.js points to local server dashboard by default", () => {
      const launcherSrc = fs.readFileSync(
        path.resolve(process.cwd(), "scripts", "open-cicd.js"),
        "utf8"
      );
      expect(launcherSrc).toContain("/dashboard");
      expect(launcherSrc).not.toContain("https://ma1910.github.io/test-cicd/");
    });
  });
});
