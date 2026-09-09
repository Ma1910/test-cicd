import { execSync } from "node:child_process";

export interface GitCommitRecord {
  hash: string;
  message: string;
  author: string;
  relativeTime: string;
  url: string;
}

export interface RepositoryInfo {
  repository: string;
  branch: string;
  totalCommits: number;
  commits: GitCommitRecord[];
}

export const gitExecutor = {
  exec(command: string, options: any): string {
    return execSync(command, options).toString();
  },
};

/**
 * Resolves repository name dynamically from environment variables or git remote URL.
 */
function resolveRepositoryName(): string {
  if (process.env.GITHUB_REPOSITORY) {
    return process.env.GITHUB_REPOSITORY;
  }
  try {
    const remoteUrl = gitExecutor.exec("git remote get-url origin", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    // Matches both HTTPS (https://github.com/owner/repo.git) and SSH (git@github.com:owner/repo.git)
    const match = remoteUrl.match(/[:/]([^/]+\/[^/.]+)(?:\.git)?$/);
    if (match && match[1]) {
      return match[1];
    }
  } catch {
    // Git remote not available
  }
  return "local/ci-cd-quicktest";
}

/**
 * Resolves current branch name dynamically from environment variables or git HEAD.
 */
function resolveCurrentBranch(): string {
  if (process.env.GIT_BRANCH) {
    return process.env.GIT_BRANCH;
  }
  try {
    return gitExecutor.exec("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "main";
  }
}

/**
 * Extracts real commit history from local git repository.
 */
export function getRealGitCommits(maxCount = 10): GitCommitRecord[] {
  if (maxCount <= 0) {
    return [];
  }
  try {
    const rawLog = gitExecutor.exec(
      `git log -n ${maxCount} --pretty=format:"%h%x09%s%x09%an%x09%cr%x09%H"`,
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      }
    ).trim();

    if (!rawLog) {
      return [];
    }

    const repo = resolveRepositoryName();

    return rawLog.split("\n").map((line) => {
      const [hash, message, author, relativeTime, fullHash] = line.split("\t");
      const commitSha = hash || fullHash || "";
      const url = repo.startsWith("local/")
        ? `#/commit/${commitSha}`
        : `https://github.com/${repo}/commit/${commitSha}`;

      return {
        hash: hash || "",
        message: message || "No commit message",
        author: author || "Unknown",
        relativeTime: relativeTime || "Recently",
        url,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Returns dynamic repository and commit metadata without mock values.
 */
export function getRepositoryInfo(): RepositoryInfo {
  const repository = resolveRepositoryName();
  const branch = resolveCurrentBranch();
  const commits = getRealGitCommits(10);

  return {
    repository,
    branch,
    totalCommits: commits.length,
    commits,
  };
}
