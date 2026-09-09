import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn, execSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { getDatabaseService } from '../db/database.service.js';

export interface PipelineExecutionOptions {
  pipelineId: string;
  sourceDir?: string;
}

export interface StepLogEvent {
  pipelineId: string;
  stepName: string;
  type: 'stdout' | 'stderr';
  chunk: string;
}

export interface StepStatusEvent {
  pipelineId: string;
  stepName: string;
  status: 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED';
  exitCode: number | null;
}

export interface PipelineStatusEvent {
  pipelineId: string;
  status: 'QUEUED' | 'RUNNING' | 'PASSED' | 'FAILED' | 'CANCELLED';
  duration?: number;
}

export class RunnerService extends EventEmitter {
  private baseWorkspaceDir: string;
  private activePipelines = new Set<string>();

  constructor(baseWorkspaceDir?: string) {
    super();
    this.baseWorkspaceDir = baseWorkspaceDir || process.env.WORKSPACES_DIR || path.join(os.tmpdir(), 'cicd-workspaces');
    if (!fs.existsSync(this.baseWorkspaceDir)) {
      fs.mkdirSync(this.baseWorkspaceDir, { recursive: true });
    }
  }

  public getBaseWorkspaceDir(): string {
    return this.baseWorkspaceDir;
  }

  public allocateWorkspace(pipelineId: string): string {
    const safeBase = path.resolve(this.baseWorkspaceDir);
    const targetDir = path.resolve(safeBase, `pipeline-${pipelineId}`);

    // Prevent directory traversal
    if (!targetDir.startsWith(safeBase + path.sep)) {
      throw new Error(`Directory traversal attempt detected for pipeline ID: ${pipelineId}`);
    }

    if (fs.existsSync(targetDir)) {
      this.safeRemoveDir(targetDir);
    }
    fs.mkdirSync(targetDir, { recursive: true });
    return targetDir;
  }

  public safeRemoveDir(dirPath: string, retries = 3, delayMs = 200): void {
    for (let i = 0; i < retries; i++) {
      try {
        if (fs.existsSync(dirPath)) {
          fs.rmSync(dirPath, { recursive: true, force: true });
        }
        return;
      } catch {
        if (i === retries - 1) return;
        const end = Date.now() + delayMs;
        while (Date.now() < end) {}
      }
    }
  }

  /**
   * Dispatches commit status to GitHub Commit Status API if GITHUB_TOKEN is configured.
   */
  public async dispatchGithubStatus(
    repository: string,
    commitSha: string,
    state: 'pending' | 'success' | 'failure',
    pipelineId: string,
    description: string
  ): Promise<void> {
    const token = process.env.GITHUB_TOKEN;
    if (!token) {
      return;
    }

    try {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      const [owner, repo] = repository.split('/');
      if (!owner || !repo) return;

      const url = `https://api.github.com/repos/${owner}/${repo}/statuses/${commitSha}`;
      await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Antigravity-CI-Runner',
        },
        body: JSON.stringify({
          state,
          target_url: `${appUrl}/dashboard?id=${pipelineId}`,
          description,
          context: 'continuous-integration/quicktest',
        }),
      });
    } catch {
      // Non-blocking telemetry
    }
  }

  /**
   * Executes a pipeline asynchronously in its isolated workspace.
   */
  public async executePipeline(pipelineId: string, customSourceDir?: string): Promise<void> {
    if (this.activePipelines.has(pipelineId)) return;
    this.activePipelines.add(pipelineId);

    const db = getDatabaseService();
    const pipeline = db.getPipelineById(pipelineId);
    if (!pipeline) {
      this.activePipelines.delete(pipelineId);
      return;
    }

    let workspacePath = '';
    const startTime = Date.now();

    try {
      workspacePath = this.allocateWorkspace(pipelineId);

      // 1. Mark Pipeline as RUNNING
      const startedAt = new Date().toISOString();
      db.updatePipelineStatus(pipelineId, {
        status: 'RUNNING',
        started_at: startedAt,
      });

      this.emit('pipeline:status', { pipelineId, status: 'RUNNING' } as PipelineStatusEvent);
      await this.dispatchGithubStatus(
        pipeline.repository,
        pipeline.commit_sha,
        'pending',
        pipelineId,
        'Pipeline executing quality gates'
      );

      // 2. Checkout source code
      const source = customSourceDir || process.cwd();
      try {
        execSync(`git clone --no-hardlinks --quiet "${source}" "${workspacePath}"`, {
          stdio: 'ignore',
        });
        if (pipeline.commit_sha && pipeline.commit_sha !== 'HEAD') {
          execSync(`git -C "${workspacePath}" checkout --quiet "${pipeline.commit_sha}"`, {
            stdio: 'ignore',
          });
        }
      } catch {
        throw new Error(`Failed to checkout commit SHA: ${pipeline.commit_sha}`);
      }

      // 3. Dynamic Command Discovery
      const pkgPath = path.join(workspacePath, 'package.json');
      let scripts: Record<string, string> = {};
      if (fs.existsSync(pkgPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
          scripts = pkg.scripts || {};
        } catch {}
      }

      const qualityGates: { name: string; cmd: string; args: string[] }[] = [];

      // Gate: Lint / TypeCheck
      if (scripts.lint) {
        qualityGates.push({ name: 'lint', cmd: 'npm', args: ['run', 'lint'] });
      } else if (scripts.typecheck) {
        qualityGates.push({ name: 'typecheck', cmd: 'npm', args: ['run', 'typecheck'] });
      }

      // Gate: Test
      if (scripts.test) {
        qualityGates.push({ name: 'test', cmd: 'npm', args: ['test'] });
      }

      // Gate: Build
      if (scripts.build) {
        qualityGates.push({ name: 'build', cmd: 'npm', args: ['run', 'build'] });
      }

      // Pre-seed steps in database
      const stepRecords = qualityGates.map((g, idx) => {
        return db.createStep({
          pipeline_id: pipelineId,
          name: g.name,
          status: 'PENDING',
          step_order: idx + 1,
        });
      });

      // 4. Sequential Step Execution (Strict Fail-Fast)
      let pipelineFailed = false;

      for (let i = 0; i < qualityGates.length; i++) {
        const gate = qualityGates[i];
        const step = stepRecords[i];

        if (pipelineFailed) {
          db.updateStep(step.id!, { status: 'SKIPPED' });
          this.emit('step:status', {
            pipelineId,
            stepName: gate.name,
            status: 'SKIPPED',
            exitCode: null,
          } as StepStatusEvent);
          continue;
        }

        const stepStartedAt = new Date().toISOString();
        db.updateStep(step.id!, {
          status: 'RUNNING',
          started_at: stepStartedAt,
        });

        this.emit('step:status', {
          pipelineId,
          stepName: gate.name,
          status: 'RUNNING',
          exitCode: null,
        } as StepStatusEvent);

        const execResult = await this.spawnStep(gate.cmd, gate.args, workspacePath, (type, chunk) => {
          db.appendStepLog(step.id!, type, chunk);
          this.emit('step:log', {
            pipelineId,
            stepName: gate.name,
            type,
            chunk,
          } as StepLogEvent);
        });

        const stepFinishedAt = new Date().toISOString();
        const isPassed = execResult.exitCode === 0;

        db.updateStep(step.id!, {
          status: isPassed ? 'PASSED' : 'FAILED',
          finished_at: stepFinishedAt,
          exit_code: execResult.exitCode,
          error: isPassed ? null : `Process exited with code ${execResult.exitCode}`,
        });

        this.emit('step:status', {
          pipelineId,
          stepName: gate.name,
          status: isPassed ? 'PASSED' : 'FAILED',
          exitCode: execResult.exitCode,
        } as StepStatusEvent);

        if (!isPassed) {
          pipelineFailed = true;
        }
      }

      // 5. Finalize Pipeline
      const finishedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;
      const duration = durationMs / 1000;
      const finalStatus = pipelineFailed ? 'FAILED' : 'PASSED';

      db.updatePipelineStatus(pipelineId, {
        status: finalStatus,
        finished_at: finishedAt,
        duration,
        duration_ms: durationMs,
      });

      this.emit('pipeline:status', {
        pipelineId,
        status: finalStatus,
        duration,
      } as PipelineStatusEvent);

      await this.dispatchGithubStatus(
        pipeline.repository,
        pipeline.commit_sha,
        finalStatus === 'PASSED' ? 'success' : 'failure',
        pipelineId,
        finalStatus === 'PASSED'
          ? 'All quality gates passed successfully'
          : 'Quality gate failed. Merge blocked.'
      );
    } catch (err: any) {
      const finishedAt = new Date().toISOString();
      const durationMs = Date.now() - startTime;
      const duration = durationMs / 1000;

      db.updatePipelineStatus(pipelineId, {
        status: 'FAILED',
        finished_at: finishedAt,
        duration,
        duration_ms: durationMs,
      });

      this.emit('pipeline:status', {
        pipelineId,
        status: 'FAILED',
        duration,
      } as PipelineStatusEvent);

      await this.dispatchGithubStatus(
        pipeline.repository,
        pipeline.commit_sha,
        'failure',
        pipelineId,
        `Pipeline execution error: ${err.message}`
      );
    } finally {
      if (workspacePath) {
        this.safeRemoveDir(workspacePath);
      }
      this.activePipelines.delete(pipelineId);
    }
  }

  private spawnStep(
    cmd: string,
    args: string[],
    cwd: string,
    onData: (type: 'stdout' | 'stderr', chunk: string) => void
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';

      const child = spawn(cmd, args, {
        cwd,
        shell: true,
        env: {
          ...process.env,
          CI: 'true',
          FORCE_COLOR: '0',
          NODE_ENV: 'test',
        },
      });

      child.stdout.on('data', (chunk) => {
        const str = chunk.toString();
        stdout += str;
        onData('stdout', str);
      });

      child.stderr.on('data', (chunk) => {
        const str = chunk.toString();
        stderr += str;
        onData('stderr', str);
      });

      child.on('close', (code) => {
        resolve({
          exitCode: code ?? 0,
          stdout,
          stderr,
        });
      });

      child.on('error', (err) => {
        const errMsg = err.message + '\n';
        stderr += errMsg;
        onData('stderr', errMsg);
        resolve({
          exitCode: 1,
          stdout,
          stderr,
        });
      });
    });
  }
}

let runnerInstance: RunnerService | null = null;

export function getRunnerService(): RunnerService {
  if (!runnerInstance) {
    runnerInstance = new RunnerService();
  }
  return runnerInstance;
}
