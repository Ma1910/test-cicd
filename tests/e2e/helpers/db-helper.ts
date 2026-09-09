import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { resetDatabaseInstances } from "../../../src/db/database.service.js";

export interface PipelineRow {
  id: string;
  repository: string;
  branch: string;
  commit_sha: string;
  commit_message: string | null;
  author: string | null;
  event: string;
  status: "QUEUED" | "RUNNING" | "PASSED" | "FAILED" | "CANCELLED";
  started_at: string | null;
  finished_at: string | null;
  duration: number | null;
  created_at: string;
}

export interface PipelineStepRow {
  id: number;
  pipeline_id: string;
  name: string;
  status: "QUEUED" | "RUNNING" | "PASSED" | "FAILED" | "SKIPPED" | "CANCELLED";
  started_at: string | null;
  finished_at: string | null;
  exit_code: number | null;
  stdout: string;
  stderr: string;
  error: string | null;
  step_order: number;
}

/**
 * Initializes the SQLite DDL schema with WAL mode as defined in PROJECT.md R5
 */
export function initDatabaseSchema(db: DatabaseSync): void {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec("PRAGMA busy_timeout = 5000;");

  db.exec(`
    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY,
      repository TEXT NOT NULL,
      branch TEXT NOT NULL,
      commit_sha TEXT NOT NULL,
      commit_message TEXT,
      author TEXT,
      event TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'CANCELLED')),
      started_at TEXT,
      finished_at TEXT,
      duration REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pipeline_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pipeline_id TEXT NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'SKIPPED', 'CANCELLED')),
      started_at TEXT,
      finished_at TEXT,
      exit_code INTEGER,
      stdout TEXT DEFAULT '',
      stderr TEXT DEFAULT '',
      error TEXT,
      step_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_pipelines_created_at ON pipelines(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_pipelines_status ON pipelines(status);
    CREATE INDEX IF NOT EXISTS idx_pipelines_commit_sha ON pipelines(commit_sha);
    CREATE INDEX IF NOT EXISTS idx_pipeline_steps_pipeline_id ON pipeline_steps(pipeline_id);
    CREATE INDEX IF NOT EXISTS idx_pipeline_steps_order ON pipeline_steps(pipeline_id, step_order ASC);
  `);
}

/**
 * Opens or creates a DatabaseSync instance with foreign keys and WAL mode
 */
export function openTestDatabase(customPath?: string): DatabaseSync {
  const dbPath = customPath || process.env.DATABASE_PATH || path.resolve(process.cwd(), "data", "cicd.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  initDatabaseSchema(db);
  return db;
}

/**
 * Fetches a single pipeline record by ID
 */
export function queryPipeline(db: DatabaseSync, id: string): PipelineRow | null {
  try {
    const stmt = db.prepare("SELECT * FROM pipelines WHERE id = ?");
    const row = stmt.get(id) as PipelineRow | undefined;
    return row || null;
  } catch {
    return null;
  }
}

/**
 * Fetches all steps for a pipeline ordered by step_order
 */
export function queryPipelineSteps(db: DatabaseSync, pipelineId: string): PipelineStepRow[] {
  try {
    const stmt = db.prepare("SELECT * FROM pipeline_steps WHERE pipeline_id = ? ORDER BY step_order ASC, id ASC");
    return stmt.all(pipelineId) as unknown as PipelineStepRow[];
  } catch {
    return [];
  }
}

/**
 * Returns total count of pipelines
 */
export function countPipelines(db: DatabaseSync): number {
  try {
    const stmt = db.prepare("SELECT COUNT(*) as count FROM pipelines");
    const res = stmt.get() as { count: number } | undefined;
    return res?.count || 0;
  } catch {
    return 0;
  }
}

/**
 * Safely removes a test database file and its WAL / SHM auxiliary files
 */
export function cleanupDatabaseFile(dbPath: string): void {
  try {
    resetDatabaseInstances();
  } catch {}
  for (const ext of ["", "-wal", "-shm"]) {
    const target = `${dbPath}${ext}`;
    try {
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
    } catch {
      // Ignored during cleanup
    }
  }
}
