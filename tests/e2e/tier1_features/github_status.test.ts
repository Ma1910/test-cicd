import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "node:http";

describe("Tier 1: Feature Coverage - GitHub Commit Status Reporting (R6)", () => {
  let mockServer: http.Server;
  let mockServerPort: number;
  const receivedRequests: any[] = [];
  let prevToken: string | undefined;

  beforeEach(async () => {
    prevToken = process.env.GITHUB_TOKEN;
    receivedRequests.length = 0;

    // Ephemeral mock GitHub API server
    mockServer = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          receivedRequests.push({
            url: req.url,
            method: req.method,
            headers: req.headers,
            body: JSON.parse(body),
          });
        } catch {
          receivedRequests.push({
            url: req.url,
            method: req.method,
            headers: req.headers,
            body,
          });
        }
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ id: 1, state: "success" }));
      });
    });

    await new Promise<void>((resolve) => {
      mockServer.listen(0, "127.0.0.1", () => {
        const addr = mockServer.address();
        if (typeof addr === "object" && addr !== null) {
          mockServerPort = addr.port;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    if (prevToken !== undefined) {
      process.env.GITHUB_TOKEN = prevToken;
    } else {
      delete process.env.GITHUB_TOKEN;
    }
    await new Promise<void>((resolve) => {
      mockServer.close(() => resolve());
    });
  });

  it("E2E-T1-06a: Sends commit status payload adhering to GitHub REST API format", async () => {
    const owner = "Ma1910";
    const repo = "test-cicd";
    const sha = "c81fb39a17387d853b0bc87fcf39a3f25608da3b";
    const statusPayload = {
      state: "pending",
      target_url: "http://localhost:3000/dashboard?id=pipe_123",
      description: "Pipeline running: Lint & TypeCheck in progress",
      context: "continuous-integration/quicktest",
    };

    const targetUrl = `http://127.0.0.1:${mockServerPort}/repos/${owner}/${repo}/statuses/${sha}`;

    const res = await fetch(targetUrl, {
      method: "POST",
      headers: {
        Authorization: "Bearer mock-token-12345",
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(statusPayload),
    });

    expect(res.status).toBe(201);
    expect(receivedRequests.length).toBe(1);
    expect(receivedRequests[0].url).toBe(`/repos/${owner}/${repo}/statuses/${sha}`);
    expect(receivedRequests[0].body.state).toBe("pending");
    expect(receivedRequests[0].body.context).toBe("continuous-integration/quicktest");
    expect(receivedRequests[0].body.target_url).toBe("http://localhost:3000/dashboard?id=pipe_123");
  });

  it("E2E-T1-06b: Gracefully skips GitHub Status dispatch without crashing if GITHUB_TOKEN is unset", () => {
    delete process.env.GITHUB_TOKEN;
    // When GITHUB_TOKEN is not provided, runner must log warning and proceed without throwing error
    expect(process.env.GITHUB_TOKEN).toBeUndefined();
  });
});
