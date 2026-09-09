import { Router, Request, Response } from 'express';
import crypto from 'node:crypto';
import { getDatabaseService, PipelineStepRecord } from '../db/database.service.js';
import { getRunnerService } from '../runner/runner.service.js';
import { getRepositoryInfo } from '../git.service.js';

export const pipelinesRouter = Router();

/**
 * GET /api/pipelines
 * Lists recent pipeline executions with metadata and status.
 */
pipelinesRouter.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabaseService();
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;
    const result = db.listPipelines({ limit, offset });

    res.json({
      total: result.total,
      pipelines: result.data,
    });
  } catch (err: any) {
    console.error("GET /api/pipelines error:", err);
    res.status(500).json({ error: 'Failed to list pipelines', message: err.message });
  }
});

/**
 * GET /api/pipelines/:id
 * Retrieves detailed pipeline information along with its executed quality gate steps.
 */
pipelinesRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabaseService();
    const pipeline = db.getPipelineById(req.params.id);

    if (!pipeline) {
      res.status(404).json({ error: `Pipeline not found with id: ${req.params.id}` });
      return;
    }

    res.json(pipeline);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve pipeline', message: err.message });
  }
});

/**
 * GET /api/pipelines/:id/logs
 * Retrieves raw captured stdout and stderr logs for a pipeline.
 */
pipelinesRouter.get('/:id/logs', (req: Request, res: Response) => {
  try {
    const db = getDatabaseService();
    const pipeline = db.getPipelineById(req.params.id);

    if (!pipeline) {
      res.status(404).json({ error: `Pipeline not found with id: ${req.params.id}` });
      return;
    }

    const logs = pipeline.steps.map((s: PipelineStepRecord) => ({
      step: s.name,
      status: s.status,
      exitCode: s.exit_code,
      stdout: s.stdout,
      stderr: s.stderr,
    }));

    res.json({
      id: pipeline.id,
      status: pipeline.status,
      logs,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve logs', message: err.message });
  }
});

/**
 * POST /api/pipelines/run
 * Manually queues and executes a real pipeline run.
 */
pipelinesRouter.post('/run', (req: Request, res: Response) => {
  try {
    const repoInfo = getRepositoryInfo();
    const repository = req.body?.repository || repoInfo.repository || 'local/ci-cd-quicktest';
    const branch = req.body?.branch || repoInfo.branch || 'main';
    const commitSha = req.body?.commit_sha || (repoInfo.commits.length > 0 ? repoInfo.commits[0].hash : 'HEAD');
    const commitMsg = req.body?.commit_message || (repoInfo.commits.length > 0 ? repoInfo.commits[0].message : 'Manual run from dashboard');
    const author = req.body?.author || 'Manual Trigger';

    const db = getDatabaseService();
    const pipelineId = crypto.randomUUID();

    const pipeline = db.createPipeline({
      id: pipelineId,
      repository,
      branch,
      commit_sha: commitSha,
      commit_message: commitMsg,
      author,
      event: 'manual',
      status: 'QUEUED',
      started_at: null,
      finished_at: null,
      duration_ms: null,
      duration: null,
    });

    // Execute asynchronously in background worker
    getRunnerService().executePipeline(pipeline.id).catch((err) => {
      console.error('Async manual runner error:', err);
    });

    res.status(202).json({
      success: true,
      status: 'QUEUED',
      message: 'Pipeline queued successfully',
      id: pipeline.id,
      pipeline_id: pipeline.id,
      pipeline,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to trigger pipeline', message: err.message });
  }
});

/**
 * GET /api/pipelines/:id/stream
 * Server-Sent Events (SSE) realtime log and status streaming endpoint.
 */
pipelinesRouter.get('/:id/stream', (req: Request, res: Response) => {
  const pipelineId = req.params.id;
  const db = getDatabaseService();
  const pipeline = db.getPipelineById(pipelineId);

  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Send initial event
  const initData = {
    id: pipelineId,
    status: pipeline?.status || 'QUEUED',
    steps: pipeline?.steps || [],
  };
  res.write(`event: pipeline:init\ndata: ${JSON.stringify(initData)}\n\n`);

  if (pipeline && (pipeline.status === 'PASSED' || pipeline.status === 'FAILED' || pipeline.status === 'CANCELLED')) {
    res.write(`event: pipeline:done\ndata: ${JSON.stringify({ id: pipelineId, status: pipeline.status })}\n\n`);
    res.end();
    return;
  }

  const runner = getRunnerService();

  const onPipelineStatus = (evt: any) => {
    if (evt.pipelineId === pipelineId) {
      res.write(`event: pipeline:status\ndata: ${JSON.stringify(evt)}\n\n`);
      if (evt.status === 'PASSED' || evt.status === 'FAILED' || evt.status === 'CANCELLED') {
        res.write(`event: pipeline:done\ndata: ${JSON.stringify(evt)}\n\n`);
        cleanup();
        res.end();
      }
    }
  };

  const onStepStatus = (evt: any) => {
    if (evt.pipelineId === pipelineId) {
      res.write(`event: step:status\ndata: ${JSON.stringify(evt)}\n\n`);
    }
  };

  const onStepLog = (evt: any) => {
    if (evt.pipelineId === pipelineId) {
      res.write(`event: step:log\ndata: ${JSON.stringify(evt)}\n\n`);
    }
  };

  const cleanup = () => {
    runner.off('pipeline:status', onPipelineStatus);
    runner.off('step:status', onStepStatus);
    runner.off('step:log', onStepLog);
  };

  runner.on('pipeline:status', onPipelineStatus);
  runner.on('step:status', onStepStatus);
  runner.on('step:log', onStepLog);

  req.on('close', cleanup);
});
