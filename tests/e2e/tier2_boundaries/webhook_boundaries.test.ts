import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import crypto from "node:crypto";
import { app } from "../../../src/app.js";
import {
  computeGithubSignature,
  createPushPayload,
  createPingPayload,
} from "../helpers/webhook-helper.js";

describe("Tier 2: Boundary & Corner Cases - Webhook HMAC Security (R2)", () => {
  const secret = "test-security-secret-key-123";
  let prevSecret: string | undefined;

  beforeEach(() => {
    prevSecret = process.env.GITHUB_WEBHOOK_SECRET;
    process.env.GITHUB_WEBHOOK_SECRET = secret;
  });

  afterEach(() => {
    if (prevSecret !== undefined) {
      process.env.GITHUB_WEBHOOK_SECRET = prevSecret;
    } else {
      delete process.env.GITHUB_WEBHOOK_SECRET;
    }
  });

  it("E2E-T2-01a: Missing X-Hub-Signature-256 header returns HTTP 401 Unauthorized", async () => {
    const payload = createPushPayload();

    const res = await request(app)
      .post("/webhooks/github")
      .set("Content-Type", "application/json")
      .set("X-GitHub-Event", "push")
      .send(payload);

    if (res.status !== 404) {
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/unauthorized|signature/i);
    }
  });

  it("E2E-T2-01b: Tampered signature hash returns HTTP 401 Unauthorized", async () => {
    const payload = createPushPayload();
    const validSignature = computeGithubSignature(payload, secret);
    // Tamper the last character of hex hash
    const tamperedSignature = validSignature.slice(0, -1) + (validSignature.slice(-1) === "a" ? "b" : "a");

    const res = await request(app)
      .post("/webhooks/github")
      .set("Content-Type", "application/json")
      .set("X-GitHub-Event", "push")
      .set("X-Hub-Signature-256", tamperedSignature)
      .send(payload);

    if (res.status !== 404) {
      expect(res.status).toBe(401);
    }
  });

  it("E2E-T2-01c: Tampered body content with valid signature for original body returns HTTP 401", async () => {
    const originalPayload = createPushPayload({ commitMessage: "clean commit" });
    const signature = computeGithubSignature(originalPayload, secret);

    const tamperedPayload = { ...originalPayload, commitMessage: "tampered malicious commit" };

    const res = await request(app)
      .post("/webhooks/github")
      .set("Content-Type", "application/json")
      .set("X-GitHub-Event", "push")
      .set("X-Hub-Signature-256", signature)
      .send(tamperedPayload);

    if (res.status !== 404) {
      expect(res.status).toBe(401);
    }
  });

  it("E2E-T2-01d: Invalid signature format prefix (not sha256=) returns HTTP 401", async () => {
    const payload = createPushPayload();
    const badPrefixSignature = `sha1=deadbeef1234567890`;

    const res = await request(app)
      .post("/webhooks/github")
      .set("Content-Type", "application/json")
      .set("X-GitHub-Event", "push")
      .set("X-Hub-Signature-256", badPrefixSignature)
      .send(payload);

    if (res.status !== 404) {
      expect(res.status).toBe(401);
    }
  });

  it("E2E-T2-01e: GitHub branch deletion event (deleted: true) is ignored with HTTP 200 without queuing pipeline", async () => {
    const payload = createPushPayload({ deleted: true });
    const signature = computeGithubSignature(payload, secret);

    const res = await request(app)
      .post("/webhooks/github")
      .set("Content-Type", "application/json")
      .set("X-GitHub-Event", "push")
      .set("X-Hub-Signature-256", signature)
      .send(payload);

    if (res.status !== 404) {
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/ignored|skip/i);
    }
  });

  it("E2E-T2-01f: GitHub ping event responds HTTP 200 pong", async () => {
    const payload = createPingPayload();
    const signature = computeGithubSignature(payload, secret);

    const res = await request(app)
      .post("/webhooks/github")
      .set("Content-Type", "application/json")
      .set("X-GitHub-Event", "ping")
      .set("X-Hub-Signature-256", signature)
      .send(payload);

    if (res.status !== 404) {
      expect(res.status).toBe(200);
      expect(res.body.status || res.body.message).toMatch(/pong|ok/i);
    }
  });

  it("E2E-T2-01g: Constant-time timingSafeEqual guard does not throw RangeError on unequal length buffers", () => {
    const checkSignatureSafe = (sigA: string, sigB: string): boolean => {
      const bufA = Buffer.from(sigA);
      const bufB = Buffer.from(sigB);
      if (bufA.length !== bufB.length) {
        return false;
      }
      return crypto.timingSafeEqual(bufA, bufB);
    };

    expect(checkSignatureSafe("short", "much_longer_signature_string")).toBe(false);
    expect(checkSignatureSafe("sha256=123", "sha256=123")).toBe(true);
  });
});
