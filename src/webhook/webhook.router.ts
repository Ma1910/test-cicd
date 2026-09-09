import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { githubWebhookMiddleware } from './webhook.middleware.js';
import { webhookService } from './webhook.service.js';
import { getDatabaseService } from '../db/database.service.js';
import { getRunnerService } from '../runner/runner.service.js';

export const webhookRouter = Router();

// Handle GitHub webhook POST ingestion
const handleGithubWebhook = (req: Request, res: Response): void => {
  const eventHeader = req.headers['x-github-event'] as string | undefined;
  const validation = webhookService.parseAndValidate(eventHeader, req.body);

  if (!validation.success) {
    res.status(validation.statusCode).json({
      error: validation.error,
      details: validation.details,
    });
    return;
  }

  const result = validation.result;

  // 1. Handle Ping Handshake
  if (result.type === 'ping') {
    res.status(200).json({
      status: 'ok',
      message: 'pong',
      zen: result.zen,
      hook_id: result.hook_id,
    });
    return;
  }

  // 2. Handle Ignored Events (branch deletion, non-CI actions, unsupported events)
  if (result.type === 'ignored') {
    res.status(200).json({
      success: true,
      status: 'ignored',
      message: result.reason,
    });
    return;
  }

  // 3. Handle Actionable Push / PR Pipeline Ingestion
  if (result.type === 'pipeline') {
    const db = getDatabaseService();
    const pipelineId = crypto.randomUUID();

    const pipeline = db.createPipeline({
      id: pipelineId,
      repository: result.data.repository,
      branch: result.data.branch,
      commit_sha: result.data.commit_sha,
      commit_message: result.data.commit_message,
      author: result.data.author,
      event: result.data.event,
      status: 'QUEUED',
      started_at: null,
      finished_at: null,
      duration_ms: null,
      duration: null,
    });

    // Trigger execution asynchronously if AUTO_RUN is enabled or in production
    if (process.env.AUTO_RUN === 'true' || process.env.NODE_ENV === 'production') {
      getRunnerService().executePipeline(pipeline.id).catch((err) => {
        console.error('Async pipeline runner error:', err);
      });
    }

    res.status(202).json({
      success: true,
      status: 'QUEUED',
      message: 'Pipeline queued successfully',
      id: pipeline.id,
      pipeline_id: pipeline.id,
      pipeline: {
        id: pipeline.id,
        repository: pipeline.repository,
        branch: pipeline.branch,
        commit_sha: pipeline.commit_sha,
        status: pipeline.status,
      },
    });
    return;
  }
};

// Route definitions for GitHub webhook receiver
webhookRouter.post('/github', githubWebhookMiddleware, handleGithubWebhook);
webhookRouter.post('/github/', githubWebhookMiddleware, handleGithubWebhook);
webhookRouter.post('/', githubWebhookMiddleware, handleGithubWebhook);
