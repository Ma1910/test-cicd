export interface GitCommitRecord {
  hash: string;
  message: string;
  author: string;
  relativeTime: string;
  url: string;
}

export const REAL_GIT_COMMITS: GitCommitRecord[] = [
  {
    hash: "8a03474",
    message: "feat(ui): add user-friendly health status dashboard for /healthz and /health",
    author: "Ma",
    relativeTime: "Vừa xong",
    url: "https://github.com/Ma1910/test-cicd/commit/8a03474"
  },
  {
    hash: "127ebb2",
    message: "feat(ui): add interactive web dashboard for localhost:3000",
    author: "Ma",
    relativeTime: "10 phút trước",
    url: "https://github.com/Ma1910/test-cicd/commit/127ebb2"
  },
  {
    hash: "c51406b",
    message: "feat(ponytail): add native IDE rule adapters (.cursor, .windsurf, .clinerules)",
    author: "Ma",
    relativeTime: "Hôm qua",
    url: "https://github.com/Ma1910/test-cicd/commit/c51406b"
  },
  {
    hash: "65e181d",
    message: "feat(ai): integrate Ponytail lazy senior dev ruleset and Claude Code plugin commands",
    author: "Ma",
    relativeTime: "Hôm qua",
    url: "https://github.com/Ma1910/test-cicd/commit/65e181d"
  },
  {
    hash: "27b0826",
    message: "feat(installer): add native PowerShell (setup.ps1) and Linux/macOS Bash (setup.sh) bootstrap scripts",
    author: "Ma",
    relativeTime: "Hôm qua",
    url: "https://github.com/Ma1910/test-cicd/commit/27b0826"
  }
];

export function getRepositoryInfo() {
  return {
    repository: "Ma1910/test-cicd",
    branch: "main",
    totalCommits: REAL_GIT_COMMITS.length,
    commits: REAL_GIT_COMMITS
  };
}
