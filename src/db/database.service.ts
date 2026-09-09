import { DatabaseSync, StatementSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { runMigrations } from './migrations.js';

// ==========================================
// 1. Data Transfer Objects & Domain Models
// ==========================================

export type PipelineStatus = 'QUEUED' | 'RUNNING' | 'PASSED' | 'FAILED' | 'CANCELLED';
export type StepStatus = 'QUEUED' | 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';

export interface PipelineRecord {
  id: string;
  repository: string;
  branch: string;
  commit_sha: string;
  commit_message: string;
  author: string;
  event: string;
  status: PipelineStatus;
  started_at: string | null;
  finished_at: string | null;
  duration?: number | null;
  duration_ms: number | null;
  created_at: string;
}

export interface PipelineStepRecord {
  id?: number;
  pipeline_id: string;
  name: string;
  status: StepStatus;
  started_at: string | null;
  finished_at: string | null;
  exit_code: number | null;
  stdout: string;
  stderr: string;
  error: string | null;
  step_order?: number;
}

export interface PipelineWithSteps extends PipelineRecord {
  steps: PipelineStepRecord[];
}

export interface CreatePipelineDto {
  id?: string;
  repository: string;
  branch: string;
  commit_sha: string;
  commit_message?: string;
  author?: string;
  event?: string;
  status?: PipelineStatus;
  started_at?: string | null;
  finished_at?: string | null;
  duration?: number | null;
  duration_ms?: number | null;
  created_at?: string;
}

export interface UpdatePipelineStatusDto {
  status: PipelineStatus;
  started_at?: string | null;
  finished_at?: string | null;
  duration?: number | null;
  duration_ms?: number | null;
}

export interface CreateStepDto {
  pipeline_id: string;
  name: string;
  status?: StepStatus;
  started_at?: string | null;
  finished_at?: string | null;
  exit_code?: number | null;
  stdout?: string;
  stderr?: string;
  error?: string | null;
  step_order?: number;
}

export interface UpdateStepDto {
  status?: StepStatus;
  started_at?: string | null;
  finished_at?: string | null;
  exit_code?: number | null;
  stdout?: string;
  stderr?: string;
  error?: string | null;
  step_order?: number;
}

export interface ListPipelinesOptions {
  limit?: number;
  offset?: number;
  status?: PipelineStatus;
  repository?: string;
  branch?: string;
}

// ==========================================
// 2. Database Service Implementation
// ==========================================

export class DatabaseService {
  private db: DatabaseSync;
  private isClosed: boolean = false;

  // Pre-compiled prepared statements for maximum execution performance
  private stmtInsertPipeline!: StatementSync;
  private stmtGetPipelineById!: StatementSync;
  private stmtCountPipelines!: StatementSync;
  private stmtListPipelinesDefault!: StatementSync;
  private stmtUpdatePipelineStatus!: StatementSync;
  private stmtDeletePipeline!: StatementSync;

  private stmtInsertStep!: StatementSync;
  private stmtGetStepById!: StatementSync;
  private stmtGetStepsByPipelineId!: StatementSync;
  private stmtUpdateStep!: StatementSync;
  private stmtAppendStdout!: StatementSync;
  private stmtAppendStderr!: StatementSync;

  constructor(databasePath?: string) {
    const dbPath = databasePath || process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'cicd.db');
    
    // Auto-create parent directory if disk-backed database
    if (dbPath !== ':memory:') {
      const dir = path.dirname(path.resolve(dbPath));
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    this.db = new DatabaseSync(dbPath, { enableForeignKeyConstraints: true });
    
    // Configure SQLite Pragmas for High Concurrency & Durability
    this.db.exec('PRAGMA journal_mode = WAL;');
    this.db.exec('PRAGMA foreign_keys = ON;');
    this.db.exec('PRAGMA busy_timeout = 5000;');
    this.db.exec('PRAGMA synchronous = NORMAL;');

    // Run migrations to guarantee tables and indexes exist
    runMigrations(this.db);
    this.initPreparedStatements();
  }

  private initPreparedStatements(): void {
    this.stmtInsertPipeline = this.db.prepare(`
      INSERT INTO pipelines (
        id, repository, branch, commit_sha, commit_message, author,
        event, status, started_at, finished_at, duration, duration_ms, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.stmtGetPipelineById = this.db.prepare(`
      SELECT * FROM pipelines WHERE id = ?
    `);

    this.stmtCountPipelines = this.db.prepare(`
      SELECT COUNT(*) as total FROM pipelines
    `);

    this.stmtListPipelinesDefault = this.db.prepare(`
      SELECT * FROM pipelines ORDER BY created_at DESC LIMIT ? OFFSET ?
    `);

    this.stmtUpdatePipelineStatus = this.db.prepare(`
      UPDATE pipelines
      SET status = ?, started_at = ?, finished_at = ?, duration = ?, duration_ms = ?
      WHERE id = ?
    `);

    this.stmtDeletePipeline = this.db.prepare(`
      DELETE FROM pipelines WHERE id = ?
    `);

    this.stmtInsertStep = this.db.prepare(`
      INSERT INTO pipeline_steps (
        pipeline_id, name, status, started_at, finished_at, exit_code, stdout, stderr, error, step_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.stmtGetStepById = this.db.prepare(`
      SELECT * FROM pipeline_steps WHERE id = ?
    `);

    this.stmtGetStepsByPipelineId = this.db.prepare(`
      SELECT * FROM pipeline_steps WHERE pipeline_id = ? ORDER BY step_order ASC, id ASC
    `);

    this.stmtUpdateStep = this.db.prepare(`
      UPDATE pipeline_steps
      SET status = ?, started_at = ?, finished_at = ?, exit_code = ?, stdout = ?, stderr = ?, error = ?, step_order = ?
      WHERE id = ?
    `);

    this.stmtAppendStdout = this.db.prepare(`
      UPDATE pipeline_steps SET stdout = stdout || ? WHERE id = ?
    `);

    this.stmtAppendStderr = this.db.prepare(`
      UPDATE pipeline_steps SET stderr = stderr || ? WHERE id = ?
    `);
  }

  // --------------------------------------------------
  // Pipeline Operations
  // --------------------------------------------------

  public createPipeline(dto: CreatePipelineDto): PipelineRecord {
    const id = dto.id || randomUUID();
    const repository = dto.repository;
    const branch = dto.branch;
    const commit_sha = dto.commit_sha;
    const commit_message = dto.commit_message ?? '';
    const author = dto.author ?? '';
    const event = dto.event ?? 'push';
    const status = dto.status ?? 'QUEUED';
    const started_at = dto.started_at ?? null;
    const finished_at = dto.finished_at ?? null;

    let duration_ms = dto.duration_ms ?? null;
    let duration = dto.duration ?? null;

    if (duration_ms === null && duration !== null) {
      duration_ms = Math.round(duration * 1000);
    } else if (duration === null && duration_ms !== null) {
      duration = duration_ms / 1000;
    } else if (duration_ms === null && duration === null && started_at && finished_at) {
      const diff = new Date(finished_at).getTime() - new Date(started_at).getTime();
      if (diff >= 0) {
        duration_ms = diff;
        duration = diff / 1000;
      }
    }

    const created_at = dto.created_at ?? new Date().toISOString();

    this.stmtInsertPipeline.run(
      id, repository, branch, commit_sha, commit_message, author,
      event, status, started_at, finished_at, duration, duration_ms, created_at
    );

    return {
      id, repository, branch, commit_sha, commit_message, author,
      event, status, started_at, finished_at, duration, duration_ms, created_at
    };
  }

  public getPipelineById(id: string): PipelineWithSteps | null {
    const row = this.stmtGetPipelineById.get(id) as unknown as PipelineRecord | undefined;
    if (!row) return null;

    const steps = this.stmtGetStepsByPipelineId.all(id) as unknown as PipelineStepRecord[];
    return {
      ...row,
      steps: steps || []
    };
  }

  public findPipelineById(id: string): PipelineRecord | null {
    const row = this.stmtGetPipelineById.get(id) as unknown as PipelineRecord | undefined;
    return row || null;
  }

  public listPipelines(options?: ListPipelinesOptions): { total: number; data: PipelineRecord[] } {
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (options?.status) {
      conditions.push('status = ?');
      params.push(options.status);
    }
    if (options?.repository) {
      conditions.push('repository = ?');
      params.push(options.repository);
    }
    if (options?.branch) {
      conditions.push('branch = ?');
      params.push(options.branch);
    }

    if (conditions.length === 0) {
      const countRow = this.stmtCountPipelines.get() as { total: number };
      const data = this.stmtListPipelinesDefault.all(limit, offset) as unknown as PipelineRecord[];
      return { total: countRow.total, data };
    }

    const whereClause = conditions.join(' AND ');
    const countSql = `SELECT COUNT(*) as total FROM pipelines WHERE ${whereClause}`;
    const countStmt = this.db.prepare(countSql);
    const countRow = countStmt.get(...params) as { total: number };

    const dataSql = `SELECT * FROM pipelines WHERE ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const dataStmt = this.db.prepare(dataSql);
    const data = dataStmt.all(...params, limit, offset) as unknown as PipelineRecord[];

    return { total: countRow.total, data };
  }

  public updatePipelineStatus(id: string, updates: UpdatePipelineStatusDto): PipelineRecord | null {
    const current = this.findPipelineById(id);
    if (!current) return null;

    const status = updates.status;
    const started_at = updates.started_at !== undefined ? updates.started_at : current.started_at;
    const finished_at = updates.finished_at !== undefined ? updates.finished_at : current.finished_at;

    let duration_ms: number | null = current.duration_ms;
    let duration: number | null = current.duration ?? (duration_ms !== null ? duration_ms / 1000 : null);

    if (updates.duration_ms !== undefined) {
      duration_ms = updates.duration_ms;
      duration = duration_ms !== null ? duration_ms / 1000 : null;
    } else if (updates.duration !== undefined) {
      duration = updates.duration;
      duration_ms = duration !== null ? Math.round(duration * 1000) : null;
    } else if (finished_at && started_at) {
      const diff = new Date(finished_at).getTime() - new Date(started_at).getTime();
      if (diff >= 0) {
        duration_ms = diff;
        duration = diff / 1000;
      }
    }

    this.stmtUpdatePipelineStatus.run(status, started_at, finished_at, duration, duration_ms, id);
    return this.findPipelineById(id);
  }

  public deletePipeline(id: string): boolean {
    const result = this.stmtDeletePipeline.run(id);
    return Number(result.changes) > 0;
  }

  // --------------------------------------------------
  // Step Operations
  // --------------------------------------------------

  public createStep(dto: CreateStepDto): PipelineStepRecord {
    const status = dto.status ?? 'PENDING';
    const started_at = dto.started_at ?? null;
    const finished_at = dto.finished_at ?? null;
    const exit_code = dto.exit_code ?? null;
    const stdout = dto.stdout ?? '';
    const stderr = dto.stderr ?? '';
    const error = dto.error ?? null;
    const step_order = dto.step_order ?? 0;

    const result = this.stmtInsertStep.run(
      dto.pipeline_id, dto.name, status, started_at, finished_at, exit_code, stdout, stderr, error, step_order
    );

    const insertedId = Number(result.lastInsertRowid);
    return {
      id: insertedId,
      pipeline_id: dto.pipeline_id,
      name: dto.name,
      status,
      started_at,
      finished_at,
      exit_code,
      stdout,
      stderr,
      error,
      step_order
    };
  }

  public createSteps(dtos: CreateStepDto[]): PipelineStepRecord[] {
    this.db.exec('BEGIN TRANSACTION');
    try {
      const records: PipelineStepRecord[] = [];
      for (let i = 0; i < dtos.length; i++) {
        const dto = dtos[i];
        const stepWithOrder = {
          ...dto,
          step_order: dto.step_order ?? i + 1,
        };
        records.push(this.createStep(stepWithOrder));
      }
      this.db.exec('COMMIT');
      return records;
    } catch (err) {
      this.db.exec('ROLLBACK');
      throw err;
    }
  }

  public updateStep(id: number, updates: UpdateStepDto): PipelineStepRecord | null {
    const current = this.getStepById(id);
    if (!current) return null;

    const status = updates.status !== undefined ? updates.status : current.status;
    const started_at = updates.started_at !== undefined ? updates.started_at : current.started_at;
    const finished_at = updates.finished_at !== undefined ? updates.finished_at : current.finished_at;
    const exit_code = updates.exit_code !== undefined ? updates.exit_code : current.exit_code;
    const stdout = updates.stdout !== undefined ? updates.stdout : current.stdout;
    const stderr = updates.stderr !== undefined ? updates.stderr : current.stderr;
    const error = updates.error !== undefined ? updates.error : current.error;
    const step_order = updates.step_order !== undefined ? updates.step_order : (current.step_order ?? 0);

    this.stmtUpdateStep.run(status, started_at, finished_at, exit_code, stdout, stderr, error, step_order, id);
    return this.getStepById(id);
  }

  public appendStepLog(id: number, stream: 'stdout' | 'stderr', chunk: string): void {
    if (this.isClosed) return;
    try {
      if (stream === 'stdout') {
        this.stmtAppendStdout.run(chunk, id);
      } else {
        this.stmtAppendStderr.run(chunk, id);
      }
    } catch {
      // Gracefully ignore if database was closed concurrently during test teardown
    }
  }

  public getStepsByPipelineId(pipelineId: string): PipelineStepRecord[] {
    const rows = this.stmtGetStepsByPipelineId.all(pipelineId) as unknown as PipelineStepRecord[];
    return rows || [];
  }

  public getStepById(id: number): PipelineStepRecord | null {
    const row = this.stmtGetStepById.get(id) as unknown as PipelineStepRecord | undefined;
    return row || null;
  }

  // --------------------------------------------------
  // Database Maintenance & Lifecycle
  // --------------------------------------------------

  public clearDatabase(): void {
    this.db.exec('DELETE FROM pipeline_steps; DELETE FROM pipelines;');
  }

  public close(): void {
    if (!this.isClosed) {
      this.db.close();
      this.isClosed = true;
    }
  }

  public getRawDb(): DatabaseSync {
    return this.db;
  }
}

// ==========================================
// 3. Dynamic Database Service Resolution
// ==========================================

const dbInstances = new Map<string, DatabaseService>();

export function getDatabaseService(customPath?: string): DatabaseService {
  const resolvedPath = customPath || process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'cicd.db');
  let instance = dbInstances.get(resolvedPath);
  if (!instance || (instance as any).isClosed) {
    instance = new DatabaseService(resolvedPath);
    dbInstances.set(resolvedPath, instance);
  }
  return instance;
}

export function resetDatabaseInstances(): void {
  for (const [, inst] of dbInstances) {
    try {
      inst.close();
    } catch {
      // Ignored during cleanup
    }
  }
  dbInstances.clear();
}

// Dynamic proxy ensuring any callers to databaseService resolve the active DATABASE_PATH
export const databaseService: DatabaseService = new Proxy({} as DatabaseService, {
  get(_target, prop) {
    const current = getDatabaseService();
    const val = (current as any)[prop];
    return typeof val === 'function' ? val.bind(current) : val;
  },
});

