import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import './webhook.types.js';

/**
 * Cryptographically verifies GitHub HMAC-SHA256 signature using constant-time comparison.
 * Prevents timing side-channel attacks and guards against RangeError on unequal buffer lengths.
 */
export function verifyGithubSignature(
  secret: string,
  signatureHeader: string | undefined,
  payloadBuffer: Buffer | string | undefined | null
): boolean {
  if (!secret || !signatureHeader || payloadBuffer === undefined || payloadBuffer === null) {
    return false;
  }

  // Enforce sha256= prefix requirement (rejects sha1= or plain hex)
  if (!signatureHeader.startsWith('sha256=')) {
    return false;
  }

  const buf = Buffer.isBuffer(payloadBuffer)
    ? payloadBuffer
    : Buffer.from(typeof payloadBuffer === 'string' ? payloadBuffer : JSON.stringify(payloadBuffer), 'utf8');

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(buf);
  const expectedHeader = `sha256=${hmac.digest('hex')}`;

  const expectedBuf = Buffer.from(expectedHeader, 'utf8');
  const sigBuf = Buffer.from(signatureHeader, 'utf8');

  // Constant-time length guard: timingSafeEqual throws RangeError if buffer lengths differ
  if (sigBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(sigBuf, expectedBuf);
}

/**
 * Express middleware to verify GitHub webhook HMAC-SHA256 signature.
 * Rejects unauthenticated or tampered requests with HTTP 401 Unauthorized.
 */
export function githubWebhookMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const signature = req.headers['x-hub-signature-256'];
  const signatureHeader = Array.isArray(signature) ? signature[0] : signature;

  if (!signatureHeader || !signatureHeader.trim()) {
    res.status(401).json({
      error: 'Unauthorized: Missing X-Hub-Signature-256 header',
    });
    return;
  }

  const rawBody = req.rawBody ?? (req.body !== undefined ? Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body), 'utf8') : undefined);

  if (rawBody === undefined) {
    res.status(401).json({
      error: 'Unauthorized: Missing request body for signature verification',
    });
    return;
  }

  // Resolve secret dynamically per request (honors per-test runtime environment overrides)
  const secret = process.env.GITHUB_WEBHOOK_SECRET || 'dev-webhook-secret';
  const isValid = verifyGithubSignature(secret, signatureHeader.trim(), rawBody);

  if (!isValid) {
    res.status(401).json({
      error: 'Unauthorized: Invalid or malformed HMAC signature',
    });
    return;
  }

  next();
}

export const verifyGithubSignatureMiddleware = githubWebhookMiddleware;
