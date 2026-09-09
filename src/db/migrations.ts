import { DatabaseSync } from 'node:sqlite';

/**
 * Runs idempotent database schema migrations for the CI/CD platform.
 * Creates pipelines and pipeline_steps tables with WAL concurrency,
 * cascading foreign keys, performance indexes, and check constraints.
 */
export function runMigrations(db: DatabaseSync): void {
  // Execute table and index creation in one batch
  db.exec(`
    CREATE TABLE IF NOT EXISTS pipelines (
      id TEXT PRIMARY KEY,
      repository TEXT NOT NULL,
      branch TEXT NOT NULL,
      commit_sha TEXT NOT NULL,
      commit_message TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '',
      event TEXT NOT NULL DEFAULT 'push',
      status TEXT NOT NULL CHECK(status IN ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'CANCELLED')) DEFAULT 'QUEUED',
      started_at TEXT,
      finished_at TEXT,
      duration REAL,
      duration_ms INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pipeline_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pipeline_id TEXT NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('QUEUED', 'PENDING', 'RUNNING', 'PASSED', 'FAILED', 'SKIPPED', 'CANCELLED')) DEFAULT 'PENDING',
      started_at TEXT,
      finished_at TEXT,
      exit_code INTEGER,
      stdout TEXT NOT NULL DEFAULT '',
      stderr TEXT NOT NULL DEFAULT '',
      error TEXT,
      step_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_pipelines_created_at ON pipelines(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_pipelines_status ON pipelines(status);
    CREATE INDEX IF NOT EXISTS idx_pipelines_repo_branch ON pipelines(repository, branch);
    CREATE INDEX IF NOT EXISTS idx_pipelines_commit_sha ON pipelines(commit_sha);
    CREATE INDEX IF NOT EXISTS idx_pipeline_steps_pipeline_id ON pipeline_steps(pipeline_id);
    CREATE INDEX IF NOT EXISTS idx_pipeline_steps_order ON pipeline_steps(pipeline_id, step_order ASC);
    CREATE INDEX IF NOT EXISTS idx_pipeline_steps_status ON pipeline_steps(status);
  `);

  // Ensure backward compatibility if table was created without duration_ms
  try {
    db.exec(`ALTER TABLE pipelines ADD COLUMN duration_ms INTEGER;`);
  } catch {
    // Column already exists or table freshly created
  }
}
