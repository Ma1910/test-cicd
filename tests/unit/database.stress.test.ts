import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { DatabaseService, PipelineStatus, StepStatus } from "../../src/db/database.service.js";

function cleanupTestDb(dbPath: string): void {
  for (const ext of ["", "-wal", "-shm"]) {
    const fullPath = dbPath + ext;
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch {
        // Ignored if file handle is releasing asynchronously
      }
    }
  }
}

describe("Adversarial Stress Test Suite: SQLite Database Engine (DatabaseService)", () => {
  let memoryDb: DatabaseService;
  const tempFilesToClean: string[] = [];

  beforeEach(() => {
    memoryDb = new DatabaseService(":memory:");
  });

  afterEach(() => {
    if (memoryDb) {
      memoryDb.close();
    }
  });

  afterAll(() => {
    for (const file of tempFilesToClean) {
      cleanupTestDb(file);
    }
  });

  // =========================================================================
  // 1. Adversarial Check Constraints & Status Rejection
  // =========================================================================
  describe("1. Adversarial Check Constraints & Status Rejection", () => {
    const invalidStatuses = [
      "INVALID",
      "queued", // Lowercase should fail
      "running",
      "passed",
      "failed",
      "UNKNOWN",
      "", // Empty string
      "   PASSED   ", // With spaces
      "QUEUED; DROP TABLE pipelines;",
      "STATUS_NOT_REAL",
      "undefined",
      "null",
    ];

    it("ADV-CHK-001: createPipeline rejects all invalid status strings with CHECK constraint violation", () => {
      for (const badStatus of invalidStatuses) {
        expect(() => {
          memoryDb.createPipeline({
            repository: "adversary/repo",
            branch: "main",
            commit_sha: "badsha001",
            status: badStatus as any,
          });
        }, `Should have rejected invalid status: ${badStatus}`).toThrow(/CHECK constraint/i);
      }
    });

    it("ADV-CHK-002: updatePipelineStatus rejects invalid status strings with CHECK constraint violation", () => {
      const p = memoryDb.createPipeline({
        repository: "adversary/repo",
        branch: "main",
        commit_sha: "validsha001",
      });

      for (const badStatus of invalidStatuses) {
        expect(() => {
          memoryDb.updatePipelineStatus(p.id, {
            status: badStatus as any,
          });
        }, `Should have rejected update with invalid status: ${badStatus}`).toThrow(/CHECK constraint/i);
      }

      // Ensure original pipeline status remains unchanged
      const current = memoryDb.findPipelineById(p.id);
      expect(current?.status).toBe("QUEUED");
    });

    it("ADV-CHK-003: createStep and updateStep reject all invalid step status strings", () => {
      const p = memoryDb.createPipeline({
        repository: "adversary/repo",
        branch: "main",
        commit_sha: "stepchecksha",
      });

      const invalidStepStatuses = [
        "INVALID",
        "pending", // Lowercase
        "COMPLETE",
        "ERROR",
        "",
        "QUEUED_AND_MORE",
      ];

      for (const badStatus of invalidStepStatuses) {
        expect(() => {
          memoryDb.createStep({
            pipeline_id: p.id,
            name: "Test Step",
            status: badStatus as any,
          });
        }, `Should have rejected step status: ${badStatus}`).toThrow(/CHECK constraint/i);
      }

      const validStep = memoryDb.createStep({
        pipeline_id: p.id,
        name: "Valid Step",
        status: "PENDING",
      });

      for (const badStatus of invalidStepStatuses) {
        expect(() => {
          memoryDb.updateStep(validStep.id!, {
            status: badStatus as any,
          });
        }, `Should have rejected step update with invalid status: ${badStatus}`).toThrow(/CHECK constraint/i);
      }
    });

    it("ADV-CHK-004: All documented valid pipeline statuses are accepted", () => {
      const validStatuses: PipelineStatus[] = ["QUEUED", "RUNNING", "PASSED", "FAILED", "CANCELLED"];
      for (const status of validStatuses) {
        const p = memoryDb.createPipeline({
          repository: "adversary/repo",
          branch: "main",
          commit_sha: `sha_${status}`,
          status,
        });
        expect(p.status).toBe(status);
        const fetched = memoryDb.findPipelineById(p.id);
        expect(fetched?.status).toBe(status);
      }
    });

    it("ADV-CHK-005: All documented valid step statuses are accepted", () => {
      const p = memoryDb.createPipeline({
        repository: "adversary/repo",
        branch: "main",
        commit_sha: "validstepstatuses",
      });

      const validStepStatuses: StepStatus[] = [
        "QUEUED",
        "PENDING",
        "RUNNING",
        "PASSED",
        "FAILED",
        "SKIPPED",
        "CANCELLED",
      ];

      for (const status of validStepStatuses) {
        const step = memoryDb.createStep({
          pipeline_id: p.id,
          name: `Step_${status}`,
          status,
        });
        expect(step.status).toBe(status);
        const fetched = memoryDb.getStepById(step.id!);
        expect(fetched?.status).toBe(status);
      }
    });
  });

  // =========================================================================
  // 2. Transaction Integrity & Rollback Under Failure
  // =========================================================================
  describe("2. Transaction Integrity & Rollback Under Failure", () => {
    it("ADV-TX-001: createSteps completely rolls back all steps if any step violates constraints", () => {
      const p = memoryDb.createPipeline({
        repository: "adversary/repo",
        branch: "main",
        commit_sha: "txsha001",
      });

      // Prepare 5 steps where the 4th step has an invalid status
      const stepsToInsert = [
        { pipeline_id: p.id, name: "Step 1: Init" },
        { pipeline_id: p.id, name: "Step 2: Lint" },
        { pipeline_id: p.id, name: "Step 3: Test" },
        { pipeline_id: p.id, name: "Step 4: Poison", status: "ILLEGAL_STATUS" as any },
        { pipeline_id: p.id, name: "Step 5: Deploy" },
      ];

      expect(() => {
        memoryDb.createSteps(stepsToInsert);
      }).toThrow(/CHECK constraint/i);

      // CRITICAL ORACLE: No partial steps must exist in the database
      const remainingSteps = memoryDb.getStepsByPipelineId(p.id);
      expect(remainingSteps.length).toBe(0);
    });

    it("ADV-TX-002: createSteps rolls back if foreign key constraint is violated", () => {
      const nonExistentPipelineId = "non-existent-uuid-" + randomUUID();

      const stepsToInsert = [
        { pipeline_id: nonExistentPipelineId, name: "Orphan 1" },
        { pipeline_id: nonExistentPipelineId, name: "Orphan 2" },
      ];

      expect(() => {
        memoryDb.createSteps(stepsToInsert);
      }).toThrow(/FOREIGN KEY/i);

      const allSteps = memoryDb.getStepsByPipelineId(nonExistentPipelineId);
      expect(allSteps.length).toBe(0);
    });

    it("ADV-TX-003: Connection remains fully healthy and operational after an aborted transaction", () => {
      const p = memoryDb.createPipeline({
        repository: "adversary/repo",
        branch: "main",
        commit_sha: "txsha003",
      });

      // Cause a rollback
      expect(() => {
        memoryDb.createSteps([
          { pipeline_id: p.id, name: "Will fail", status: "CORRUPT" as any },
        ]);
      }).toThrow();

      // Ensure subsequent transactions succeed immediately on the same connection
      const validSteps = memoryDb.createSteps([
        { pipeline_id: p.id, name: "Recovered Step 1" },
        { pipeline_id: p.id, name: "Recovered Step 2" },
      ]);

      expect(validSteps.length).toBe(2);
      const fetched = memoryDb.getStepsByPipelineId(p.id);
      expect(fetched.length).toBe(2);
      expect(fetched[0].name).toBe("Recovered Step 1");
      expect(fetched[1].name).toBe("Recovered Step 2");
    });
  });

  // =========================================================================
  // 3. Cascading Deletes Under High Volume & Step Load
  // =========================================================================
  describe("3. Cascading Deletes Under High Volume & Step Load", () => {
    it("ADV-DEL-001: Cascading delete purges hundreds of steps belonging to deleted pipeline without touching others", () => {
      const pipelineA = memoryDb.createPipeline({
        repository: "repo/a",
        branch: "main",
        commit_sha: "shaA",
      });
      const pipelineB = memoryDb.createPipeline({
        repository: "repo/b",
        branch: "main",
        commit_sha: "shaB",
      });

      // Create 50 steps for pipeline A
      const stepsA = Array.from({ length: 50 }, (_, i) => ({
        pipeline_id: pipelineA.id,
        name: `Step A-${i}`,
      }));
      memoryDb.createSteps(stepsA);

      // Create 50 steps for pipeline B
      const stepsB = Array.from({ length: 50 }, (_, i) => ({
        pipeline_id: pipelineB.id,
        name: `Step B-${i}`,
      }));
      memoryDb.createSteps(stepsB);

      expect(memoryDb.getStepsByPipelineId(pipelineA.id).length).toBe(50);
      expect(memoryDb.getStepsByPipelineId(pipelineB.id).length).toBe(50);

      // Delete pipeline A
      const deletedA = memoryDb.deletePipeline(pipelineA.id);
      expect(deletedA).toBe(true);

      // Pipeline A and its 50 steps must be gone
      expect(memoryDb.getPipelineById(pipelineA.id)).toBeNull();
      expect(memoryDb.getStepsByPipelineId(pipelineA.id).length).toBe(0);

      // Pipeline B and its 50 steps must remain 100% intact
      expect(memoryDb.getPipelineById(pipelineB.id)).not.toBeNull();
      const remainingB = memoryDb.getStepsByPipelineId(pipelineB.id);
      expect(remainingB.length).toBe(50);
      expect(remainingB[0].name).toBe("Step B-0");
      expect(remainingB[49].name).toBe("Step B-49");
    });

    it("ADV-DEL-002: Cascading delete handles massive log payloads cleanly", () => {
      const p = memoryDb.createPipeline({
        repository: "repo/heavy",
        branch: "main",
        commit_sha: "heavy001",
      });

      const step = memoryDb.createStep({
        pipeline_id: p.id,
        name: "Heavy Step",
      });

      // Append 200KB log
      const largeLog = "LOG_LINE_DATA_STREAM_PAYLOAD_CHUNK_X\n".repeat(5500); // ~203KB
      memoryDb.appendStepLog(step.id!, "stdout", largeLog);

      const fetchedBefore = memoryDb.getStepById(step.id!);
      expect(fetchedBefore?.stdout.length).toBeGreaterThan(200_000);

      // Delete pipeline
      expect(memoryDb.deletePipeline(p.id)).toBe(true);
      expect(memoryDb.getStepById(step.id!)).toBeNull();
    });
  });

  // =========================================================================
  // 4. Log Appending Under Load & Stream Isolation
  // =========================================================================
  describe("4. Log Appending Under Load & Stream Isolation", () => {
    it("ADV-LOG-001: stdout and stderr streams remain strictly isolated under interleaved rapid writes", () => {
      const p = memoryDb.createPipeline({
        repository: "repo/log-iso",
        branch: "main",
        commit_sha: "logiso001",
      });

      const step = memoryDb.createStep({
        pipeline_id: p.id,
        name: "Dual Stream Step",
      });

      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];

      // Interleave 100 writes to stdout and 100 writes to stderr
      for (let i = 0; i < 100; i++) {
        const outChunk = `OUT_${i}: Process running smoothly\n`;
        const errChunk = `ERR_${i}: Warning condition occurred\n`;
        stdoutChunks.push(outChunk);
        stderrChunks.push(errChunk);

        memoryDb.appendStepLog(step.id!, "stdout", outChunk);
        memoryDb.appendStepLog(step.id!, "stderr", errChunk);
      }

      const fetched = memoryDb.getStepById(step.id!);
      expect(fetched).not.toBeNull();

      // Validate stdout stream
      const expectedStdout = stdoutChunks.join("");
      expect(fetched?.stdout).toBe(expectedStdout);
      expect(fetched?.stdout).not.toContain("ERR_");

      // Validate stderr stream
      const expectedStderr = stderrChunks.join("");
      expect(fetched?.stderr).toBe(expectedStderr);
      expect(fetched?.stderr).not.toContain("OUT_");
    });

    it("ADV-LOG-002: Appends massive 1MB log chunk without data corruption or memory faults", () => {
      const p = memoryDb.createPipeline({
        repository: "repo/1mb",
        branch: "main",
        commit_sha: "1mb001",
      });

      const step = memoryDb.createStep({
        pipeline_id: p.id,
        name: "1MB Log Step",
      });

      // 1MB string chunk (1024 * 1024 chars = 1,048,576 bytes)
      const oneMbChunk = "A".repeat(1024 * 1024);
      memoryDb.appendStepLog(step.id!, "stdout", oneMbChunk);

      const fetched = memoryDb.getStepById(step.id!);
      expect(fetched?.stdout.length).toBe(1024 * 1024);
      expect(fetched?.stdout.startsWith("AAAA")).toBe(true);
      expect(fetched?.stdout.endsWith("AAAA")).toBe(true);
    });

    it("ADV-LOG-003: Preserves special unicode, ANSI colors, carriage returns, and emojis in logs", () => {
      const p = memoryDb.createPipeline({
        repository: "repo/unicode",
        branch: "main",
        commit_sha: "unicode001",
      });

      const step = memoryDb.createStep({
        pipeline_id: p.id,
        name: "Unicode Step",
      });

      const complexPayload = [
        "\u001b[32m✔\u001b[39m Test passed successfully! 🚀🎉\r\n",
        "Tiếng Việt có dấu: Kiểm thử tự động hóa Zero-Mock\r\n",
        "Japanese: 自動テストシステム\r\n",
        "Symbols: ⚡ ⚙ 📦 🛡 🔑\r\n",
        'Quotes and JSON: {"status": "ok", "tags": [\'ci\', "cd"]}\n',
      ].join("");

      memoryDb.appendStepLog(step.id!, "stdout", complexPayload);

      const fetched = memoryDb.getStepById(step.id!);
      expect(fetched?.stdout).toBe(complexPayload);
    });

    it("ADV-LOG-004: Appending to a non-existent step ID does not throw unhandled exception", () => {
      expect(() => {
        memoryDb.appendStepLog(9999999, "stdout", "orphaned log chunk");
      }).not.toThrow();
    });
  });

  // =========================================================================
  // 5. High Concurrency under WAL Mode (Multi-Instance & Disk-Backed)
  // =========================================================================
  describe("5. High Concurrency under WAL Mode (Multi-Instance & Disk-Backed)", () => {
    it("ADV-WAL-001: 5 simultaneous DatabaseService instances perform interleaved read/write operations on the same physical WAL database file without collisions", async () => {
      const diskDbPath = path.join(os.tmpdir(), `stress-wal-multi-${randomUUID()}.db`);
      tempFilesToClean.push(diskDbPath);

      // Create 5 concurrent service instances connected to the exact same file
      const instances: DatabaseService[] = Array.from({ length: 5 }, () => new DatabaseService(diskDbPath));

      try {
        // Initial setup on instance 0
        const rootPipeline = instances[0].createPipeline({
          repository: "multi/wal-stress",
          branch: "main",
          commit_sha: "walstress001",
        });

        const rootStep = instances[0].createStep({
          pipeline_id: rootPipeline.id,
          name: "Shared Concurrency Step",
        });

        // Launch 100 concurrent async operations randomly distributed among the 5 instances
        const concurrentOperations: Promise<void>[] = [];

        for (let i = 0; i < 100; i++) {
          const instanceIdx = i % instances.length;
          const service = instances[instanceIdx];

          concurrentOperations.push(
            new Promise<void>((resolve, reject) => {
              // Introduce slight async jitter
              setTimeout(() => {
                try {
                  if (i % 3 === 0) {
                    // Write operation: append log
                    service.appendStepLog(rootStep.id!, "stdout", `chunk_${i};`);
                  } else if (i % 3 === 1) {
                    // Write operation: create new pipeline
                    service.createPipeline({
                      id: `pipe_worker_${i}`,
                      repository: "multi/wal-stress",
                      branch: "worker-branch",
                      commit_sha: `sha_${i}`,
                    });
                  } else {
                    // Read operation: list pipelines or get pipeline
                    const res = service.listPipelines({ limit: 10 });
                    expect(res.total).toBeGreaterThanOrEqual(1);
                  }
                  resolve();
                } catch (err) {
                  reject(err);
                }
              }, Math.floor(Math.random() * 20));
            })
          );
        }

        // Await all concurrent tasks
        await Promise.all(concurrentOperations);

        // Verification Oracle
        const verifyService = instances[0];
        const finalStep = verifyService.getStepById(rootStep.id!);
        expect(finalStep).not.toBeNull();

        // Check that all `i % 3 === 0` chunks were appended
        for (let i = 0; i < 100; i += 3) {
          expect(finalStep?.stdout).toContain(`chunk_${i};`);
        }

        // Check pipelines count
        const totalPipelines = verifyService.listPipelines();
        // 1 root + (number of i % 3 === 1 items: ~33 items)
        expect(totalPipelines.total).toBeGreaterThanOrEqual(30);
      } finally {
        for (const inst of instances) {
          inst.close();
        }
      }
    });
  });

  // =========================================================================
  // 6. SQL Injection Prevention & Malicious Payloads
  // =========================================================================
  describe("6. SQL Injection Prevention & Malicious Payloads", () => {
    it("ADV-SEC-001: Extreme SQL injection vectors across all string fields do not execute or corrupt tables", () => {
      const sqlInjectionVectors = [
        "'; DROP TABLE pipeline_steps; --",
        "' UNION SELECT id, status, '', '', '', '', '', '', '', '', '', '', '' FROM pipelines; --",
        "admin'--",
        "1' OR '1'='1",
        "'; DELETE FROM pipelines WHERE '1'='1",
        "'; ATTACH DATABASE ':memory:' AS evil; --",
      ];

      for (let i = 0; i < sqlInjectionVectors.length; i++) {
        const vector = sqlInjectionVectors[i];
        const p = memoryDb.createPipeline({
          id: `sec_pipe_${i}`,
          repository: vector,
          branch: vector,
          commit_sha: vector,
          commit_message: vector,
          author: vector,
          event: "push",
        });

        expect(p.repository).toBe(vector);
        expect(p.branch).toBe(vector);
        expect(p.commit_message).toBe(vector);

        const fetched = memoryDb.findPipelineById(`sec_pipe_${i}`);
        expect(fetched).not.toBeNull();
        expect(fetched?.repository).toBe(vector);
        expect(fetched?.commit_sha).toBe(vector);
      }

      // Verify that tables are completely intact
      const list = memoryDb.listPipelines();
      expect(list.total).toBe(sqlInjectionVectors.length);
    });

    it("ADV-SEC-002: Filter options in listPipelines with malicious SQL do not breach query isolation", () => {
      memoryDb.createPipeline({
        repository: "safe/repo",
        branch: "main",
        commit_sha: "sec002",
      });

      const maliciousFilter = "safe/repo' OR '1'='1";
      const result = memoryDb.listPipelines({ repository: maliciousFilter });

      // Parameterized query must search for literal string "safe/repo' OR '1'='1" and find 0 matches
      expect(result.total).toBe(0);
      expect(result.data.length).toBe(0);
    });
  });

  // =========================================================================
  // 7. Edge Cases: Duration Calculations & Resiliency
  // =========================================================================
  describe("7. Edge Cases: Duration Calculations & Resiliency", () => {
    it("ADV-EDGE-001: Handles negative time difference gracefully without setting negative duration", () => {
      const p = memoryDb.createPipeline({
        repository: "repo/time",
        branch: "main",
        commit_sha: "time001",
      });

      // finished_at is BEFORE started_at (e.g. clock drift or corrupt input)
      const updated = memoryDb.updatePipelineStatus(p.id, {
        status: "FAILED",
        started_at: "2026-09-09T01:00:00.000Z",
        finished_at: "2026-09-09T00:00:00.000Z",
      });

      expect(updated?.status).toBe("FAILED");
      expect(updated?.duration_ms).toBeNull();
      expect(updated?.duration).toBeNull();
    });

    it("ADV-EDGE-002: Handles explicit duration and duration_ms synchronizing correctly", () => {
      const p = memoryDb.createPipeline({
        repository: "repo/dur",
        branch: "main",
        commit_sha: "dur001",
        duration: 4.5, // 4.5 seconds
      });

      expect(p.duration).toBe(4.5);
      expect(p.duration_ms).toBe(4500);

      const p2 = memoryDb.createPipeline({
        repository: "repo/dur2",
        branch: "main",
        commit_sha: "dur002",
        duration_ms: 3200,
      });

      expect(p2.duration_ms).toBe(3200);
      expect(p2.duration).toBe(3.2);
    });

    it("ADV-EDGE-003: clearDatabase empties all tables cleanly", () => {
      const p = memoryDb.createPipeline({
        repository: "repo/clear",
        branch: "main",
        commit_sha: "clear001",
      });
      memoryDb.createStep({ pipeline_id: p.id, name: "Step" });

      expect(memoryDb.listPipelines().total).toBe(1);

      memoryDb.clearDatabase();

      expect(memoryDb.listPipelines().total).toBe(0);
      expect(memoryDb.getStepsByPipelineId(p.id).length).toBe(0);
    });

    it("ADV-EDGE-004: Calling close() multiple times is safe and idempotent", () => {
      expect(() => {
        memoryDb.close();
        memoryDb.close();
        memoryDb.close();
      }).not.toThrow();
    });
  });
});
