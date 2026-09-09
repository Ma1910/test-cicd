import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

export interface GitFixture {
  dir: string;
  commitSha: string;
  branch: string;
  repoName: string;
  cleanup: () => void;
}

/**
 * Safely removes a directory on Windows with retry
 */
export function safeRemoveDir(dirPath: string, retries = 3, delayMs = 200): void {
  for (let i = 0; i < retries; i++) {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
      return;
    } catch {
      if (i === retries - 1) {
        // Last attempt failed, ignore to avoid blocking tests
        return;
      }
      const end = Date.now() + delayMs;
      while (Date.now() < end) {
        // synchronous brief wait
      }
    }
  }
}

/**
 * Initializes a git repo in target dir and commits all files
 */
function initGitRepo(dir: string, commitMsg: string, branch = "main"): string {
  execSync("git init -b " + branch, { cwd: dir, stdio: "ignore" });
  execSync("git config user.name \"Test Runner\"", { cwd: dir, stdio: "ignore" });
  execSync("git config user.email \"runner@example.com\"", { cwd: dir, stdio: "ignore" });
  execSync("git add .", { cwd: dir, stdio: "ignore" });
  execSync(`git commit -m "${commitMsg}"`, { cwd: dir, stdio: "ignore" });
  const sha = execSync("git rev-parse HEAD", { cwd: dir, encoding: "utf8" }).trim();
  return sha;
}

/**
 * Creates a clean git fixture where all quality gate steps pass
 */
export function createCleanGitFixture(repoName = "Ma1910/test-cicd"): GitFixture {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cicd-fixture-clean-"));

  const pkgJson = {
    name: "fixture-clean",
    version: "1.0.0",
    scripts: {
      lint: "node -e \"console.log('Linting passed: 0 errors'); process.exit(0)\"",
      test: "node -e \"console.log('Tests passed: 10 passed'); process.exit(0)\"",
      build: "node -e \"console.log('Production build successful'); process.exit(0)\"",
    },
  };

  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkgJson, null, 2));
  fs.writeFileSync(path.join(dir, "README.md"), "# Clean CI/CD Test Repository\n");

  const commitSha = initGitRepo(dir, "feat: golden path initial commit", "main");

  return {
    dir,
    commitSha,
    branch: "main",
    repoName,
    cleanup: () => safeRemoveDir(dir),
  };
}

/**
 * Creates a git fixture with a TypeScript compile error (TS2322)
 */
export function createTsErrorGitFixture(repoName = "Ma1910/test-cicd"): GitFixture {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cicd-fixture-ts-error-"));

  const pkgJson = {
    name: "fixture-ts-error",
    version: "1.0.0",
    scripts: {
      lint: "node -e \"console.error('src/app.ts:42:5 - error TS2322: Type \\'string\\' is not assignable to type \\'number\\'.\\nFound 1 error in src/app.ts:42'); process.exit(2)\"",
      test: "node -e \"console.log('Unit tests should not be reached'); process.exit(0)\"",
      build: "node -e \"console.log('Build should not be reached'); process.exit(0)\"",
    },
  };

  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkgJson, null, 2));
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "src", "app.ts"),
    "export const port: number = '3000'; // TS2322 Type mismatch error\n"
  );

  const commitSha = initGitRepo(dir, "fix: intentional typescript error TS2322", "main");

  return {
    dir,
    commitSha,
    branch: "main",
    repoName,
    cleanup: () => safeRemoveDir(dir),
  };
}

/**
 * Creates a git fixture with a unit test assertion failure
 */
export function createTestFailureGitFixture(repoName = "Ma1910/test-cicd"): GitFixture {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cicd-fixture-test-error-"));

  const pkgJson = {
    name: "fixture-test-error",
    version: "1.0.0",
    scripts: {
      lint: "node -e \"console.log('Linting passed: 0 errors'); process.exit(0)\"",
      test: "node -e \"console.error('FAIL tests/app.test.ts > calculateSum > AssertionError: expected 4 to be 999'); process.exit(1)\"",
      build: "node -e \"console.log('Build should not be reached'); process.exit(0)\"",
    },
  };

  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(pkgJson, null, 2));
  fs.mkdirSync(path.join(dir, "tests"), { recursive: true });
  fs.writeFileSync(
    path.join(dir, "tests", "app.test.ts"),
    "// Failing test fixture\n"
  );

  const commitSha = initGitRepo(dir, "test: intentional vitest unit failure", "main");

  return {
    dir,
    commitSha,
    branch: "main",
    repoName,
    cleanup: () => safeRemoveDir(dir),
  };
}
