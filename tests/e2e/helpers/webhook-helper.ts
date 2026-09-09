import crypto from "node:crypto";

export interface PushPayloadOptions {
  repository?: string;
  branch?: string;
  commitSha?: string;
  commitMessage?: string;
  authorName?: string;
  authorEmail?: string;
  deleted?: boolean;
}

export interface PrPayloadOptions {
  repository?: string;
  branch?: string;
  commitSha?: string;
  title?: string;
  authorLogin?: string;
  action?: "opened" | "synchronize" | "reopened" | "closed";
}

/**
 * Computes standard GitHub HMAC-SHA256 signature formatted as sha256=<hex>
 */
export function computeGithubSignature(payload: string | Buffer | object, secret: string): string {
  const payloadString = Buffer.isBuffer(payload)
    ? payload
    : typeof payload === "string"
    ? payload
    : JSON.stringify(payload);

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payloadString);
  return `sha256=${hmac.digest("hex")}`;
}

/**
 * Creates realistic GitHub push event payload
 */
export function createPushPayload(options: PushPayloadOptions = {}) {
  const repoFullName = options.repository || "Ma1910/test-cicd";
  const [owner, repoName] = repoFullName.split("/");
  const branch = options.branch || "main";
  const commitSha = options.commitSha || "c81fb39a17387d853b0bc87fcf39a3f25608da3b";
  const commitMessage = options.commitMessage || "feat: implement quality gates automation";
  const authorName = options.authorName || "Test Developer";
  const authorEmail = options.authorEmail || "developer@example.com";
  const deleted = options.deleted ?? false;

  return {
    ref: `refs/heads/${branch}`,
    before: "0000000000000000000000000000000000000000",
    after: deleted ? "0000000000000000000000000000000000000000" : commitSha,
    deleted,
    repository: {
      id: 123456789,
      name: repoName || "test-cicd",
      full_name: repoFullName,
      owner: {
        name: owner || "Ma1910",
        login: owner || "Ma1910",
      },
      html_url: `https://github.com/${repoFullName}`,
      clone_url: `https://github.com/${repoFullName}.git`,
    },
    pusher: {
      name: authorName,
      email: authorEmail,
    },
    sender: {
      login: authorName.toLowerCase().replace(/\s+/g, ""),
    },
    head_commit: deleted
      ? null
      : {
          id: commitSha,
          tree_id: "4b825dc642cb6eb9a060e54bf8d69288fbee4904",
          distinct: true,
          message: commitMessage,
          timestamp: new Date().toISOString(),
          url: `https://github.com/${repoFullName}/commit/${commitSha}`,
          author: {
            name: authorName,
            email: authorEmail,
            username: authorName.toLowerCase().replace(/\s+/g, ""),
          },
          committer: {
            name: authorName,
            email: authorEmail,
            username: authorName.toLowerCase().replace(/\s+/g, ""),
          },
          added: ["src/index.ts"],
          removed: [],
          modified: [],
        },
  };
}

/**
 * Creates realistic GitHub pull_request event payload
 */
export function createPullRequestPayload(options: PrPayloadOptions = {}) {
  const repoFullName = options.repository || "Ma1910/test-cicd";
  const branch = options.branch || "feat/gate-pipeline";
  const commitSha = options.commitSha || "d14fb39a17387d853b0bc87fcf39a3f25608beef";
  const title = options.title || "feat: add real quality gates";
  const authorLogin = options.authorLogin || "developer";
  const action = options.action || "opened";

  return {
    action,
    number: 42,
    pull_request: {
      id: 987654321,
      number: 42,
      state: "open",
      title,
      user: {
        login: authorLogin,
      },
      head: {
        ref: branch,
        sha: commitSha,
        repo: {
          full_name: repoFullName,
        },
      },
      base: {
        ref: "main",
        sha: "a11fb39a17387d853b0bc87fcf39a3f25608cafe",
        repo: {
          full_name: repoFullName,
        },
      },
    },
    repository: {
      full_name: repoFullName,
    },
    sender: {
      login: authorLogin,
    },
  };
}

/**
 * Creates GitHub ping payload
 */
export function createPingPayload(zen = "Practicality beats purity.") {
  return {
    zen,
    hook_id: 1234567,
    hook: {
      type: "Repository",
      id: 1234567,
      name: "web",
      active: true,
      events: ["push", "pull_request"],
    },
  };
}
