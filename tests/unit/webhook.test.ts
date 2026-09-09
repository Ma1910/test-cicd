import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { app } from '../../src/app.js';
import { verifyGithubSignature, webhookService } from '../../src/webhook/webhook.service.js';
import { getDatabaseService, resetDatabaseInstances } from '../../src/db/database.service.js';
import {
  computeGithubSignature,
  createPushPayload,
  createPullRequestPayload,
  createPingPayload,
} from '../e2e/helpers/webhook-helper.js';
import {
  openTestDatabase,
  queryPipeline,
  cleanupDatabaseFile,
} from '../e2e/helpers/db-helper.js';

describe('Unit & Integration Test Suite: HMAC Webhook Receiver & Ingestion (M2)', () => {
  const testSecret = 'unit-test-secret-key-2026';
  const tempDbPath = path.join(os.tmpdir(), `cicd-unit-webhook-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  let prevSecret: string | undefined;
  let prevDbPath: string | undefined;

  beforeEach(() => {
    prevSecret = process.env.GITHUB_WEBHOOK_SECRET;
    prevDbPath = process.env.DATABASE_PATH;
    process.env.GITHUB_WEBHOOK_SECRET = testSecret;
    process.env.DATABASE_PATH = tempDbPath;
  });

  afterEach(() => {
    if (prevSecret !== undefined) {
      process.env.GITHUB_WEBHOOK_SECRET = prevSecret;
    } else {
      delete process.env.GITHUB_WEBHOOK_SECRET;
    }
    if (prevDbPath !== undefined) {
      process.env.DATABASE_PATH = prevDbPath;
    } else {
      delete process.env.DATABASE_PATH;
    }
    resetDatabaseInstances();
    cleanupDatabaseFile(tempDbPath);
  });

  afterAll(() => {
    resetDatabaseInstances();
    cleanupDatabaseFile(tempDbPath);
  });

  // ==========================================
  // Suite 1: Cryptographic HMAC-SHA256 Verification (SEC)
  // ==========================================
  describe('Cryptographic Verification (verifyGithubSignature)', () => {
    it('TC-WH-SEC-001: Correct HMAC-SHA256 signature returns true', () => {
      const payload = Buffer.from(JSON.stringify({ ref: 'refs/heads/main', action: 'push' }));
      const signature = computeGithubSignature(payload, testSecret);

      const isValid = verifyGithubSignature(testSecret, signature, payload);
      expect(isValid).toBe(true);
    });

    it('TC-WH-SEC-002: Missing or undefined signature header returns false', () => {
      const payload = Buffer.from('{}');
      expect(verifyGithubSignature(testSecret, undefined, payload)).toBe(false);
      expect(verifyGithubSignature(testSecret, '', payload)).toBe(false);
    });

    it('TC-WH-SEC-003: Invalid prefix (sha1=, md5=, naked hex) returns false', () => {
      const payload = Buffer.from('{}');
      const nakedHex = crypto.createHmac('sha256', testSecret).update(payload).digest('hex');
      expect(verifyGithubSignature(testSecret, nakedHex, payload)).toBe(false);
      expect(verifyGithubSignature(testSecret, `sha1=${nakedHex}`, payload)).toBe(false);
      expect(verifyGithubSignature(testSecret, `md5=${nakedHex}`, payload)).toBe(false);
    });

    it('TC-WH-SEC-004: Tampered signature hash (1 character flipped) returns false', () => {
      const payload = Buffer.from(JSON.stringify({ commit: 'clean' }));
      const validSig = computeGithubSignature(payload, testSecret);
      const tamperedSig = validSig.slice(0, -1) + (validSig.slice(-1) === 'a' ? 'b' : 'a');

      expect(verifyGithubSignature(testSecret, tamperedSig, payload)).toBe(false);
    });

    it('TC-WH-SEC-005: Tampered payload body with original signature returns false', () => {
      const originalPayload = Buffer.from(JSON.stringify({ message: 'original code' }));
      const tamperedPayload = Buffer.from(JSON.stringify({ message: 'malicious payload' }));
      const validSig = computeGithubSignature(originalPayload, testSecret);

      expect(verifyGithubSignature(testSecret, validSig, tamperedPayload)).toBe(false);
    });

    it('TC-WH-SEC-006: Timing-safe length guard prevents RangeError on unequal length buffers', () => {
      const payload = Buffer.from('{}');
      expect(() => {
        const result = verifyGithubSignature(testSecret, 'sha256=short', payload);
        expect(result).toBe(false);
      }).not.toThrow();

      expect(() => {
        const result = verifyGithubSignature(testSecret, 'sha256=way_too_long_super_extended_hash_string_exceeding_64_bytes', payload);
        expect(result).toBe(false);
      }).not.toThrow();
    });

    it('TC-WH-SEC-007: Wrong secret returns false', () => {
      const payload = Buffer.from(JSON.stringify({ hello: 'world' }));
      const validSig = computeGithubSignature(payload, 'correct-secret');
      expect(verifyGithubSignature('wrong-secret', validSig, payload)).toBe(false);
    });

    it('TC-WH-SEC-008: Missing secret returns false', () => {
      const payload = Buffer.from(JSON.stringify({ hello: 'world' }));
      const validSig = computeGithubSignature(payload, testSecret);
      expect(verifyGithubSignature('', validSig, payload)).toBe(false);
    });

    it('TC-WH-SEC-009: Accepts string and object payloads properly', () => {
      const payloadStr = JSON.stringify({ event: 'test' });
      const validSig = computeGithubSignature(payloadStr, testSecret);
      expect(verifyGithubSignature(testSecret, validSig, payloadStr)).toBe(true);
    });
  });

  // ==========================================
  // Suite 2: Webhook Payload Validation & Parsing (VAL)
  // ==========================================
  describe('Payload Parsing & Validation (WebhookService)', () => {
    it('TC-WH-VAL-001: Missing or empty X-GitHub-Event header returns 400', () => {
      const res1 = webhookService.parseAndValidate(undefined, {});
      expect(res1.success).toBe(false);
      if (!res1.success) {
        expect(res1.statusCode).toBe(400);
        expect(res1.error).toMatch(/Missing or empty X-GitHub-Event header/i);
      }

      const res2 = webhookService.parseAndValidate('   ', {});
      expect(res2.success).toBe(false);
    });

    it('TC-WH-VAL-002: Non-object or array payload returns 400', () => {
      const res1 = webhookService.parseAndValidate('push', null);
      expect(res1.success).toBe(false);

      const res2 = webhookService.parseAndValidate('push', 'primitive string');
      expect(res2.success).toBe(false);

      const res3 = webhookService.parseAndValidate('push', [1, 2, 3]);
      expect(res3.success).toBe(false);
    });

    it('TC-WH-VAL-003: Push event missing repository returns 400', () => {
      const payload = createPushPayload();
      delete (payload as any).repository;

      const res = webhookService.parseAndValidate('push', payload);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.statusCode).toBe(400);
        expect(res.details).toContain('Missing repository full_name or name');
      }
    });

    it('TC-WH-VAL-004: Push event missing ref returns 400', () => {
      const payload = createPushPayload();
      delete (payload as any).ref;

      const res = webhookService.parseAndValidate('push', payload);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.statusCode).toBe(400);
        expect(res.details).toContain('Missing or invalid ref');
      }
    });

    it('TC-WH-VAL-005: Push event with invalid commit SHA returns 400', () => {
      const payload = createPushPayload({ commitSha: 'not-a-valid-sha' });
      (payload as any).after = 'invalid_sha!';
      if (payload.head_commit) payload.head_commit.id = 'invalid_sha!';

      const res = webhookService.parseAndValidate('push', payload);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.statusCode).toBe(400);
        expect(res.details).toContain('Invalid or missing commit SHA');
      }
    });

    it('TC-WH-VAL-006: Push event with deleted=true returns ignored type with 200', () => {
      const payload = createPushPayload({ deleted: true });
      const res = webhookService.parseAndValidate('push', payload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.result.type).toBe('ignored');
        expect((res.result as any).reason).toMatch(/Branch deletion event ignored/i);
      }
    });

    it('TC-WH-VAL-007: Push event with 40 zeros as after SHA returns ignored', () => {
      const payload = createPushPayload();
      payload.after = '0000000000000000000000000000000000000000';
      const res = webhookService.parseAndValidate('push', payload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.result.type).toBe('ignored');
      }
    });

    it('TC-WH-VAL-008: Valid push event extracts branch, repo, author, commit_message, sha', () => {
      const payload = createPushPayload({
        repository: 'Org/Repo',
        branch: 'feat/test-runner',
        commitSha: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
        commitMessage: 'feat: add real quality gates',
        authorName: 'Bob Developer',
      });

      const res = webhookService.parseAndValidate('push', payload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.result.type).toBe('pipeline');
        const data = (res.result as any).data;
        expect(data.repository).toBe('Org/Repo');
        expect(data.branch).toBe('feat/test-runner');
        expect(data.commit_sha).toBe('a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');
        expect(data.commit_message).toBe('feat: add real quality gates');
        expect(data.author).toBe('Bob Developer');
        expect(data.event).toBe('push');
      }
    });

    it('TC-WH-VAL-009: Pull request non-actionable action (closed) returns ignored', () => {
      const payload = createPullRequestPayload({ action: 'closed' });
      const res = webhookService.parseAndValidate('pull_request', payload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.result.type).toBe('ignored');
      }
    });

    it('TC-WH-VAL-010: Pull request missing head.sha returns 400', () => {
      const payload = createPullRequestPayload({ action: 'opened' });
      delete (payload.pull_request.head as any).sha;

      const res = webhookService.parseAndValidate('pull_request', payload);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.statusCode).toBe(400);
      }
    });

    it('TC-WH-VAL-011: Valid pull request event extracts head commit SHA and head ref', () => {
      const payload = createPullRequestPayload({
        repository: 'Org/Repo',
        branch: 'feat/pr-branch',
        commitSha: 'f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2',
        title: 'pr: add integration tests',
        authorLogin: 'pr-author',
        action: 'opened',
      });

      const res = webhookService.parseAndValidate('pull_request', payload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.result.type).toBe('pipeline');
        const data = (res.result as any).data;
        expect(data.repository).toBe('Org/Repo');
        expect(data.branch).toBe('feat/pr-branch');
        expect(data.commit_sha).toBe('f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2');
        expect(data.commit_message).toBe('pr: add integration tests');
        expect(data.author).toBe('pr-author');
        expect(data.event).toBe('pull_request');
      }
    });

    it('TC-WH-VAL-012: Ping event returns ping type with zen quote', () => {
      const payload = createPingPayload('Keep it simple and genuine.');
      const res = webhookService.parseAndValidate('ping', payload);
      expect(res.success).toBe(true);
      if (res.success) {
        expect(res.result.type).toBe('ping');
        expect((res.result as any).zen).toBe('Keep it simple and genuine.');
        expect((res.result as any).hook_id).toBe(1234567);
      }
    });

    it('TC-WH-VAL-013: Unsupported GitHub events are gracefully ignored with HTTP 200', () => {
      const res1 = webhookService.parseAndValidate('issues', { action: 'opened' });
      expect(res1.success).toBe(true);
      if (res1.success) {
        expect(res1.result.type).toBe('ignored');
      }

      const res2 = webhookService.parseAndValidate('star', { action: 'created' });
      expect(res2.success).toBe(true);
    });
  });

  // ==========================================
  // Suite 3: End-to-End HTTP Endpoint & Ingestion (POST /webhooks/github)
  // ==========================================
  describe('HTTP Endpoint Ingestion & Database Persistence', () => {
    it('TC-WH-INT-001: Missing X-Hub-Signature-256 header rejects with 401 Unauthorized', async () => {
      const payload = createPushPayload();

      const res = await request(app)
        .post('/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'push')
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/unauthorized|signature/i);

      // Verify ZERO records created in SQLite
      const db = openTestDatabase(tempDbPath);
      try {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM pipelines');
        const count = (stmt.get() as any).count;
        expect(count).toBe(0);
      } finally {
        db.close();
      }
    });

    it('TC-WH-INT-002: Tampered HMAC signature rejects with 401 Unauthorized', async () => {
      const payload = createPushPayload();
      const validSig = computeGithubSignature(payload, testSecret);
      const tamperedSig = validSig.slice(0, -2) + '99';

      const res = await request(app)
        .post('/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'push')
        .set('X-Hub-Signature-256', tamperedSig)
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/unauthorized|signature/i);

      // Verify ZERO records created in SQLite
      const db = openTestDatabase(tempDbPath);
      try {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM pipelines');
        const count = (stmt.get() as any).count;
        expect(count).toBe(0);
      } finally {
        db.close();
      }
    });

    it('TC-WH-INT-003: Tampered body with original signature rejects with 401', async () => {
      const originalPayload = createPushPayload({ commitMessage: 'authentic code' });
      const validSig = computeGithubSignature(originalPayload, testSecret);

      const tamperedPayload = { ...originalPayload, commitMessage: 'injected code' };

      const res = await request(app)
        .post('/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'push')
        .set('X-Hub-Signature-256', validSig)
        .send(tamperedPayload);

      expect(res.status).toBe(401);
    });

    it('TC-WH-INT-004: Valid push event creates pipeline with status QUEUED and returns 202 Accepted', async () => {
      const payload = createPushPayload({
        repository: 'TestOrg/PlatformCore',
        branch: 'release/2.0.0',
        commitSha: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
        commitMessage: 'feat: zero-mock implementation',
        authorName: 'Senior Engineer',
      });

      const signature = computeGithubSignature(payload, testSecret);

      const res = await request(app)
        .post('/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'push')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      expect(res.status).toBe(202);
      expect(res.body.success).toBe(true);
      expect(res.body.pipeline_id || res.body.id).toBeDefined();

      const pipelineId = res.body.pipeline_id || res.body.id;
      expect(res.body.pipeline).toBeDefined();
      expect(res.body.pipeline.id).toBe(pipelineId);
      expect(res.body.pipeline.repository).toBe('TestOrg/PlatformCore');
      expect(res.body.pipeline.branch).toBe('release/2.0.0');
      expect(res.body.pipeline.commit_sha).toBe('b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3');
      expect(res.body.pipeline.status).toBe('QUEUED');

      // Verify persistence in SQLite
      const db = openTestDatabase(tempDbPath);
      try {
        const pipeline = queryPipeline(db, pipelineId);
        expect(pipeline).not.toBeNull();
        if (pipeline) {
          expect(pipeline.id).toBe(pipelineId);
          expect(pipeline.repository).toBe('TestOrg/PlatformCore');
          expect(pipeline.branch).toBe('release/2.0.0');
          expect(pipeline.commit_sha).toBe('b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3');
          expect(pipeline.status).toBe('QUEUED');
          expect(pipeline.started_at).toBeNull();
          expect(pipeline.finished_at).toBeNull();
          expect(pipeline.duration).toBeNull();
        }
      } finally {
        db.close();
      }
    });

    it('TC-WH-INT-005: Valid pull_request event enqueues pipeline with PR head commit SHA', async () => {
      const payload = createPullRequestPayload({
        repository: 'TestOrg/PlatformCore',
        branch: 'feature/pr-gates',
        commitSha: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
        title: 'pr: add gates verification',
        authorLogin: 'gate-keeper',
        action: 'opened',
      });

      const signature = computeGithubSignature(payload, testSecret);

      const res = await request(app)
        .post('/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'pull_request')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      expect(res.status).toBe(202);
      const pipelineId = res.body.pipeline_id || res.body.id;
      expect(pipelineId).toBeDefined();

      const db = openTestDatabase(tempDbPath);
      try {
        const pipeline = queryPipeline(db, pipelineId);
        expect(pipeline).not.toBeNull();
        if (pipeline) {
          expect(pipeline.branch).toBe('feature/pr-gates');
          expect(pipeline.commit_sha).toBe('c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4');
          expect(pipeline.event).toBe('pull_request');
          expect(pipeline.status).toBe('QUEUED');
        }
      } finally {
        db.close();
      }
    });

    it('TC-WH-INT-006: Branch deletion (deleted=true) returns 200 ignored without creating pipeline', async () => {
      const payload = createPushPayload({ deleted: true });
      const signature = computeGithubSignature(payload, testSecret);

      const res = await request(app)
        .post('/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'push')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/ignored|skip/i);

      // Verify ZERO records created in SQLite
      const db = openTestDatabase(tempDbPath);
      try {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM pipelines');
        const count = (stmt.get() as any).count;
        expect(count).toBe(0);
      } finally {
        db.close();
      }
    });

    it('TC-WH-INT-007: Ping event responds HTTP 200 pong without creating pipeline', async () => {
      const payload = createPingPayload('Pure Node.js speed.');
      const signature = computeGithubSignature(payload, testSecret);

      const res = await request(app)
        .post('/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'ping')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.status || res.body.message).toMatch(/pong|ok/i);
      expect(res.body.zen).toBe('Pure Node.js speed.');

      // Verify ZERO records created in SQLite
      const db = openTestDatabase(tempDbPath);
      try {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM pipelines');
        const count = (stmt.get() as any).count;
        expect(count).toBe(0);
      } finally {
        db.close();
      }
    });

    it('TC-WH-INT-008: Closed PR event returns 200 ignored without creating pipeline', async () => {
      const payload = createPullRequestPayload({ action: 'closed' });
      const signature = computeGithubSignature(payload, testSecret);

      const res = await request(app)
        .post('/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'pull_request')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/ignored/i);

      // Verify ZERO records created in SQLite
      const db = openTestDatabase(tempDbPath);
      try {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM pipelines');
        const count = (stmt.get() as any).count;
        expect(count).toBe(0);
      } finally {
        db.close();
      }
    });

    it('TC-WH-INT-009: Malformed JSON payload returns HTTP 400 Bad Request', async () => {
      const rawBody = '{ "ref": "broken json without closing brace"';
      const signature = computeGithubSignature(rawBody, testSecret);

      const res = await request(app)
        .post('/webhooks/github')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'push')
        .set('X-Hub-Signature-256', signature)
        .send(rawBody);

      expect(res.status).toBe(400);
    });

    it('TC-WH-INT-010: Trailing slash /webhooks/github/ works identically', async () => {
      const payload = createPushPayload({
        repository: 'Org/TrailingSlash',
        branch: 'main',
        commitSha: 'd4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
      });
      const signature = computeGithubSignature(payload, testSecret);

      const res = await request(app)
        .post('/webhooks/github/')
        .set('Content-Type', 'application/json')
        .set('X-GitHub-Event', 'push')
        .set('X-Hub-Signature-256', signature)
        .send(payload);

      expect(res.status).toBe(202);
      expect(res.body.pipeline_id || res.body.id).toBeDefined();
    });

    it('TC-WH-INT-011: Multi-request burst persistence test (10 rapid webhooks)', async () => {
      const burstCount = 10;
      const requests = Array.from({ length: burstCount }, (_, i) => {
        const sha = crypto.createHash('sha1').update(`commit_${i}`).digest('hex');
        const payload = createPushPayload({
          repository: 'Org/BurstRepo',
          branch: `branch-${i}`,
          commitSha: sha,
          commitMessage: `burst commit ${i}`,
        });
        const signature = computeGithubSignature(payload, testSecret);

        return request(app)
          .post('/webhooks/github')
          .set('Content-Type', 'application/json')
          .set('X-GitHub-Event', 'push')
          .set('X-Hub-Signature-256', signature)
          .send(payload);
      });

      const responses = await Promise.all(requests);
      for (const res of responses) {
        expect(res.status).toBe(202);
        expect(res.body.pipeline_id).toBeDefined();
      }

      // Verify all 10 are recorded in database
      const db = openTestDatabase(tempDbPath);
      try {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM pipelines WHERE repository = ?');
        const row = stmt.get('Org/BurstRepo') as { count: number };
        expect(row.count).toBe(burstCount);
      } finally {
        db.close();
      }
    });
  });
});
