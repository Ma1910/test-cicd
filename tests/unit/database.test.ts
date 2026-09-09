import { describe, it, expect, beforeEach, afterEach, afterAll } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "../../src/db/database.service.js";

// Safe cleanup helper for SQLite on Windows (avoids EBUSY)
function cleanupTestDb(dbPath: string): void {
  for (const ext of ["", "-wal", "-shm"]) {
    const fullPath = dbPath + ext;
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
      } catch {
        // Ignored if file handle is being asynchronously released
      }
    }
  }
}

describe("DatabaseService Unit Tests (Native SQLite Engine)", () => {
  let memoryDb: DatabaseService;
  const tempFilesToClean: string[] = [];

  beforeEach(() => {
    // In-memory instance for isolated unit tests
    memoryDb = new DatabaseService(":memory:");
  });

  afterEach(() => {
    if (memoryDb) {
      memoryDb.close();
    }
  });

  afterAll(() => {
    // Clean up temporary disk files safely
    for (const filePath of tempFilesToClean) {
      cleanupTestDb(filePath);
    }
  });

  // =========================================================================
  // 1. Database Initialization & Pragma Configuration
  // =========================================================================
  describe("1. Database Initialization & Pragma Configuration", () => {
    it("TC-DB-001: Khởi tạo database :memory: và tạo schema bảng thành công", () => {
      expect(memoryDb).toBeDefined();
      const raw = memoryDb.getRawDb();
      const tables = raw
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all() as { name: string }[];
      const names = tables.map((t) => t.name);
      expect(names).toContain("pipelines");
      expect(names).toContain("pipeline_steps");
    });

    it("TC-DB-002: Xác thực PRAGMA foreign_keys = ON (1)", () => {
      const raw = memoryDb.getRawDb();
      const result = raw.prepare("PRAGMA foreign_keys;").get() as { foreign_keys: number };
      expect(result.foreign_keys).toBe(1);
    });

    it("TC-DB-003: Xác thực PRAGMA journal_mode = WAL trên tệp đĩa vật lý", () => {
      const diskDbPath = path.join(os.tmpdir(), `test-cicd-wal-${randomUUID()}.db`);
      tempFilesToClean.push(diskDbPath);

      const diskDb = new DatabaseService(diskDbPath);
      try {
        const raw = diskDb.getRawDb();
        const result = raw.prepare("PRAGMA journal_mode;").get() as { journal_mode: string };
        expect(result.journal_mode.toLowerCase()).toBe("wal");
      } finally {
        diskDb.close();
      }
    });

    it("TC-DB-004: Xác thực cấu hình busy_timeout = 5000 và synchronous = NORMAL", () => {
      const raw = memoryDb.getRawDb();
      const busy = raw.prepare("PRAGMA busy_timeout;").get() as { timeout: number };
      expect(busy.timeout).toBe(5000);

      const sync = raw.prepare("PRAGMA synchronous;").get() as { synchronous: number };
      expect(sync.synchronous).toBe(1); // 1 corresponds to NORMAL
    });
  });

  // =========================================================================
  // 2. Pipeline CRUD Operations
  // =========================================================================
  describe("2. Pipeline CRUD Operations", () => {
    it("TC-PIPE-001: Tạo pipeline mới với các giá trị mặc định chuẩn xác", () => {
      const created = memoryDb.createPipeline({
        repository: "owner/repo",
        branch: "main",
        commit_sha: "abcdef1234567890",
        author: "Developer",
        commit_message: "feat: initialize platform",
      });

      expect(created.id).toBeDefined();
      expect(typeof created.id).toBe("string");
      expect(created.repository).toBe("owner/repo");
      expect(created.branch).toBe("main");
      expect(created.commit_sha).toBe("abcdef1234567890");
      expect(created.status).toBe("QUEUED");
      expect(created.event).toBe("push");
      expect(created.started_at).toBeNull();
      expect(created.finished_at).toBeNull();
      expect(created.duration_ms).toBeNull();
      expect(created.created_at).toBeDefined();
    });

    it("TC-PIPE-002: Cho phép chỉ định id tùy chỉnh hoặc tự động sinh UUID", () => {
      const customId = "pipe-custom-id-999";
      const p1 = memoryDb.createPipeline({
        id: customId,
        repository: "owner/repo",
        branch: "feature",
        commit_sha: "111222333",
      });
      expect(p1.id).toBe(customId);

      const p2 = memoryDb.createPipeline({
        repository: "owner/repo",
        branch: "feature",
        commit_sha: "444555666",
      });
      expect(p2.id).toBeDefined();
      expect(p2.id).not.toBe(customId);
    });

    it("TC-PIPE-003: Truy vấn pipeline theo ID trả về kèm mảng steps", () => {
      const created = memoryDb.createPipeline({
        repository: "owner/repo",
        branch: "main",
        commit_sha: "abc123",
      });

      const fetched = memoryDb.getPipelineById(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.id).toBe(created.id);
      expect(Array.isArray(fetched?.steps)).toBe(true);
      expect(fetched?.steps.length).toBe(0);
    });

    it("TC-PIPE-004: Truy vấn ID không tồn tại trả về null", () => {
      const notFound = memoryDb.getPipelineById("non-existent-id");
      expect(notFound).toBeNull();

      const notFoundFlat = memoryDb.findPipelineById("non-existent-id");
      expect(notFoundFlat).toBeNull();
    });

    it("TC-PIPE-005: Liệt kê danh sách pipelines có phân trang (limit, offset)", () => {
      for (let i = 1; i <= 5; i++) {
        memoryDb.createPipeline({
          id: `pipe-page-${i}`,
          repository: "owner/repo",
          branch: "main",
          commit_sha: `sha-${i}`,
          created_at: new Date(Date.now() + i * 1000).toISOString(),
        });
      }

      const page1 = memoryDb.listPipelines({ limit: 2, offset: 0 });
      expect(page1.total).toBe(5);
      expect(page1.data.length).toBe(2);
      expect(page1.data[0].id).toBe("pipe-page-5"); // Descending order by created_at

      const page2 = memoryDb.listPipelines({ limit: 2, offset: 2 });
      expect(page2.data.length).toBe(2);
      expect(page2.data[0].id).toBe("pipe-page-3");
    });

    it("TC-PIPE-006: Lọc danh sách pipelines theo status, repository, branch", () => {
      const pA = memoryDb.createPipeline({
        repository: "repo-alpha",
        branch: "main",
        commit_sha: "sha1",
        status: "PASSED",
      });
      const pB = memoryDb.createPipeline({
        repository: "repo-beta",
        branch: "develop",
        commit_sha: "sha2",
        status: "FAILED",
      });

      const filterRepo = memoryDb.listPipelines({ repository: "repo-alpha" });
      expect(filterRepo.total).toBe(1);
      expect(filterRepo.data[0].id).toBe(pA.id);

      const filterStatus = memoryDb.listPipelines({ status: "FAILED" });
      expect(filterStatus.total).toBe(1);
      expect(filterStatus.data[0].id).toBe(pB.id);
    });

    it("TC-PIPE-007: Cập nhật trạng thái pipeline chuyển giao vòng đời", () => {
      const p = memoryDb.createPipeline({
        repository: "owner/repo",
        branch: "main",
        commit_sha: "sha1",
      });

      const startedAt = new Date().toISOString();
      const updatedRunning = memoryDb.updatePipelineStatus(p.id, {
        status: "RUNNING",
        started_at: startedAt,
      });
      expect(updatedRunning?.status).toBe("RUNNING");
      expect(updatedRunning?.started_at).toBe(startedAt);

      const finishedAt = new Date(Date.now() + 5000).toISOString();
      const updatedPassed = memoryDb.updatePipelineStatus(p.id, {
        status: "PASSED",
        finished_at: finishedAt,
      });
      expect(updatedPassed?.status).toBe("PASSED");
      expect(updatedPassed?.finished_at).toBe(finishedAt);
      expect(updatedPassed?.duration_ms).toBeGreaterThanOrEqual(0);
    });

    it("TC-PIPE-008: Tự động tính duration_ms chính xác khi có started_at và finished_at", () => {
      const p = memoryDb.createPipeline({
        repository: "owner/repo",
        branch: "main",
        commit_sha: "sha1",
      });

      const t1 = "2026-09-09T00:00:00.000Z";
      const t2 = "2026-09-09T00:00:08.500Z"; // 8500ms difference

      const updated = memoryDb.updatePipelineStatus(p.id, {
        status: "PASSED",
        started_at: t1,
        finished_at: t2,
      });

      expect(updated?.duration_ms).toBe(8500);
      expect(updated?.duration).toBe(8.5);
    });

    it("TC-PIPE-009: Xóa pipeline thành công, trả về true; xóa ID không tồn tại trả về false", () => {
      const p = memoryDb.createPipeline({
        repository: "owner/repo",
        branch: "main",
        commit_sha: "sha1",
      });

      expect(memoryDb.deletePipeline(p.id)).toBe(true);
      expect(memoryDb.getPipelineById(p.id)).toBeNull();
      expect(memoryDb.deletePipeline("unknown-id")).toBe(false);
    });
  });

  // =========================================================================
  // 3. Pipeline Step CRUD & Log Streaming Appending
  // =========================================================================
  describe("3. Pipeline Step CRUD & Log Streaming Appending", () => {
    let pipelineId: string;

    beforeEach(() => {
      const p = memoryDb.createPipeline({
        repository: "owner/repo",
        branch: "main",
        commit_sha: "sha1",
      });
      pipelineId = p.id;
    });

    it("TC-STEP-001: Tạo step mới liên kết với pipeline, mặc định PENDING", () => {
      const step = memoryDb.createStep({
        pipeline_id: pipelineId,
        name: "Install / Prepare",
      });

      expect(step.id).toBeDefined();
      expect(step.pipeline_id).toBe(pipelineId);
      expect(step.name).toBe("Install / Prepare");
      expect(step.status).toBe("PENDING");
      expect(step.stdout).toBe("");
      expect(step.stderr).toBe("");
      expect(step.exit_code).toBeNull();
    });

    it("TC-STEP-002: Tạo hàng loạt 5 steps trong một Transaction nguyên tử (createSteps)", () => {
      const stepNames = [
        "Install / Prepare",
        "Lint & TypeCheck",
        "Unit & Integration Tests",
        "Production Build",
        "Docker Build",
      ];

      const steps = memoryDb.createSteps(
        stepNames.map((name) => ({ pipeline_id: pipelineId, name }))
      );

      expect(steps.length).toBe(5);
      steps.forEach((s, idx) => {
        expect(s.name).toBe(stepNames[idx]);
        expect(s.pipeline_id).toBe(pipelineId);
      });

      const fetchedSteps = memoryDb.getStepsByPipelineId(pipelineId);
      expect(fetchedSteps.length).toBe(5);
    });

    it("TC-STEP-003: getStepsByPipelineId trả về steps theo thứ tự thực thi tăng dần (step_order / id ASC)", () => {
      const s1 = memoryDb.createStep({ pipeline_id: pipelineId, name: "Step 1", step_order: 1 });
      const s2 = memoryDb.createStep({ pipeline_id: pipelineId, name: "Step 2", step_order: 2 });
      const s3 = memoryDb.createStep({ pipeline_id: pipelineId, name: "Step 3", step_order: 3 });

      const steps = memoryDb.getStepsByPipelineId(pipelineId);
      expect(steps.length).toBe(3);
      expect(steps[0].id).toBe(s1.id);
      expect(steps[1].id).toBe(s2.id);
      expect(steps[2].id).toBe(s3.id);
    });

    it("TC-STEP-004: Cập nhật step status, exit_code và thời gian hoàn tất", () => {
      const step = memoryDb.createStep({ pipeline_id: pipelineId, name: "TypeCheck" });
      const now = new Date().toISOString();

      const updated = memoryDb.updateStep(step.id!, {
        status: "PASSED",
        started_at: now,
        finished_at: now,
        exit_code: 0,
      });

      expect(updated?.status).toBe("PASSED");
      expect(updated?.exit_code).toBe(0);
      expect(updated?.finished_at).toBe(now);
    });

    it("TC-STEP-005: Ghi nối tiếp log stdout qua appendStepLog và tích lũy chuỗi", () => {
      const step = memoryDb.createStep({ pipeline_id: pipelineId, name: "Build" });

      memoryDb.appendStepLog(step.id!, "stdout", "Line 1: compile start\n");
      memoryDb.appendStepLog(step.id!, "stdout", "Line 2: 50% completed\n");
      memoryDb.appendStepLog(step.id!, "stdout", "Line 3: done\n");

      const fetched = memoryDb.getStepById(step.id!);
      expect(fetched?.stdout).toBe(
        "Line 1: compile start\nLine 2: 50% completed\nLine 3: done\n"
      );
      expect(fetched?.stderr).toBe("");
    });

    it("TC-STEP-006: Ghi nối tiếp log stderr qua appendStepLog riêng biệt", () => {
      const step = memoryDb.createStep({ pipeline_id: pipelineId, name: "Test" });

      memoryDb.appendStepLog(step.id!, "stderr", "Warning: deprecated API\n");
      memoryDb.appendStepLog(step.id!, "stderr", "Error: assertion failed\n");

      const fetched = memoryDb.getStepById(step.id!);
      expect(fetched?.stderr).toBe("Warning: deprecated API\nError: assertion failed\n");
      expect(fetched?.stdout).toBe("");
    });
  });

  // =========================================================================
  // 4. Foreign Key Constraints & Cascading Deletes
  // =========================================================================
  describe("4. Foreign Key Constraints & Cascading Deletes", () => {
    it("TC-FK-001: Chèn step với pipeline_id không tồn tại sẽ kích hoạt lỗi FOREIGN KEY constraint", () => {
      expect(() => {
        memoryDb.createStep({
          pipeline_id: "non-existent-pipeline",
          name: "Orphan Step",
        });
      }).toThrow(/FOREIGN KEY/i);
    });

    it("TC-FK-002: Xóa pipeline cha sẽ tự động xóa sạch các steps con (ON DELETE CASCADE)", () => {
      const p = memoryDb.createPipeline({
        repository: "owner/repo",
        branch: "main",
        commit_sha: "sha1",
      });

      memoryDb.createSteps([
        { pipeline_id: p.id, name: "Step 1" },
        { pipeline_id: p.id, name: "Step 2" },
        { pipeline_id: p.id, name: "Step 3" },
      ]);

      expect(memoryDb.getStepsByPipelineId(p.id).length).toBe(3);

      // Delete parent pipeline
      const deleted = memoryDb.deletePipeline(p.id);
      expect(deleted).toBe(true);

      // Verify cascading delete
      const remainingSteps = memoryDb.getStepsByPipelineId(p.id);
      expect(remainingSteps).toEqual([]);
    });

    it("TC-FK-003: Xóa pipeline A không làm ảnh hưởng đến steps của pipeline B", () => {
      const pA = memoryDb.createPipeline({ repository: "repo-a", branch: "main", commit_sha: "sha-a" });
      const pB = memoryDb.createPipeline({ repository: "repo-b", branch: "main", commit_sha: "sha-b" });

      memoryDb.createStep({ pipeline_id: pA.id, name: "Step A" });
      memoryDb.createStep({ pipeline_id: pB.id, name: "Step B" });

      memoryDb.deletePipeline(pA.id);

      expect(memoryDb.getStepsByPipelineId(pA.id).length).toBe(0);
      expect(memoryDb.getStepsByPipelineId(pB.id).length).toBe(1);
    });
  });

  // =========================================================================
  // 5. Check Constraints & Validation Enforcement
  // =========================================================================
  describe("5. Check Constraints & Validation Enforcement", () => {
    it("TC-CHK-001: Chèn pipeline với status không hợp lệ sẽ bắn lỗi CHECK constraint", () => {
      expect(() => {
        memoryDb.createPipeline({
          repository: "owner/repo",
          branch: "main",
          commit_sha: "sha1",
          status: "INVALID_STATUS" as any,
        });
      }).toThrow(/CHECK constraint/i);
    });

    it("TC-CHK-002: Chèn step với status không hợp lệ sẽ bắn lỗi CHECK constraint", () => {
      const p = memoryDb.createPipeline({ repository: "repo", branch: "main", commit_sha: "sha" });
      expect(() => {
        memoryDb.createStep({
          pipeline_id: p.id,
          name: "Bad Step",
          status: "UNKNOWN_STATE" as any,
        });
      }).toThrow(/CHECK constraint/i);
    });

    it("TC-CHK-003: Chèn trùng lặp primary key id sẽ bắn lỗi UNIQUE constraint", () => {
      memoryDb.createPipeline({ id: "duplicate-id", repository: "repo", branch: "main", commit_sha: "sha1" });
      expect(() => {
        memoryDb.createPipeline({ id: "duplicate-id", repository: "repo", branch: "main", commit_sha: "sha2" });
      }).toThrow(/UNIQUE constraint/i);
    });
  });

  // =========================================================================
  // 6. Concurrent Reads and Writes (WAL Mode Concurrency)
  // =========================================================================
  describe("6. Concurrent Reads and Writes (WAL Mode Concurrency)", () => {
    it("TC-CONC-001: Thực thi đồng thời nhiều tác vụ đọc/ghi qua Promise.all không phát sinh lỗi lock", async () => {
      const diskDbPath = path.join(os.tmpdir(), `test-cicd-conc-${randomUUID()}.db`);
      tempFilesToClean.push(diskDbPath);

      const dbService = new DatabaseService(diskDbPath);

      try {
        const p = dbService.createPipeline({
          repository: "owner/concurrent-test",
          branch: "main",
          commit_sha: "c0ffee",
        });

        const step = dbService.createStep({
          pipeline_id: p.id,
          name: "Concurrent Step",
        });

        // 30 concurrent read/write operations
        const tasks: Promise<void>[] = [];
        for (let i = 0; i < 30; i++) {
          tasks.push(
            new Promise<void>((resolve) => {
              if (i % 2 === 0) {
                dbService.appendStepLog(step.id!, "stdout", `Chunk ${i}\n`);
              } else {
                const read = dbService.getPipelineById(p.id);
                expect(read).not.toBeNull();
              }
              resolve();
            })
          );
        }

        await Promise.all(tasks);

        const finalStep = dbService.getStepById(step.id!);
        expect(finalStep?.stdout).toContain("Chunk 0");
        expect(finalStep?.stdout).toContain("Chunk 28");
      } finally {
        dbService.close();
      }
    });

    it("TC-CONC-002: Kết nối Reader đọc dữ liệu song song không chặn kết nối Writer trên tệp WAL", () => {
      const diskDbPath = path.join(os.tmpdir(), `test-cicd-multi-conn-${randomUUID()}.db`);
      tempFilesToClean.push(diskDbPath);

      const writerService = new DatabaseService(diskDbPath);
      const readerService = new DatabaseService(diskDbPath);

      try {
        // Writer inserts pipeline
        const p = writerService.createPipeline({
          repository: "multi/conn",
          branch: "main",
          commit_sha: "123456",
        });

        // Reader immediately queries
        const readByReader = readerService.getPipelineById(p.id);
        expect(readByReader).not.toBeNull();
        expect(readByReader?.id).toBe(p.id);

        // Reader inserts another pipeline
        readerService.createPipeline({
          repository: "multi/conn",
          branch: "feature",
          commit_sha: "789012",
        });

        // Writer sees both
        const listByWriter = writerService.listPipelines();
        expect(listByWriter.total).toBe(2);
      } finally {
        readerService.close();
        writerService.close();
      }
    });

    it("TC-CONC-003: Tải đồng thời 50 tác vụ cập nhật log liên tục bảo toàn tính toàn vẹn dữ liệu", async () => {
      const diskDbPath = path.join(os.tmpdir(), `test-cicd-stress-${randomUUID()}.db`);
      tempFilesToClean.push(diskDbPath);

      const db = new DatabaseService(diskDbPath);

      try {
        const p = db.createPipeline({ repository: "stress/test", branch: "main", commit_sha: "stress" });
        const step = db.createStep({ pipeline_id: p.id, name: "Stress Step" });

        const operations = Array.from({ length: 50 }, (_, i) => {
          return new Promise<void>((resolve) => {
            setTimeout(() => {
              db.appendStepLog(step.id!, "stdout", `line_${i};`);
              resolve();
            }, Math.floor(Math.random() * 15));
          });
        });

        await Promise.all(operations);

        const updatedStep = db.getStepById(step.id!);
        const lines = updatedStep?.stdout.split(";").filter(Boolean) || [];
        expect(lines.length).toBe(50);
      } finally {
        db.close();
      }
    });
  });

  // =========================================================================
  // 7. Edge Cases & Resilience
  // =========================================================================
  describe("7. Edge Cases & Resilience", () => {
    it("TC-EDGE-001: Xử lý chuỗi log kích thước lớn (>100KB), ANSI escape, ký tự xuống dòng", () => {
      const p = memoryDb.createPipeline({ repository: "repo", branch: "main", commit_sha: "sha" });
      const step = memoryDb.createStep({ pipeline_id: p.id, name: "BigLog" });

      const ansiChunk = "\u001b[32m[SUCCESS]\u001b[0m \u001b[1mCompiled 1500 modules\u001b[0m\n";
      const largePayload = ansiChunk.repeat(2500); // ~122.5KB (>100KB)
      memoryDb.appendStepLog(step.id!, "stdout", largePayload);

      const fetched = memoryDb.getStepById(step.id!);
      expect(fetched?.stdout.length).toBeGreaterThan(100_000);
      expect(fetched?.stdout).toContain("\u001b[32m[SUCCESS]\u001b[0m");
    });

    it("TC-EDGE-002: Chống SQL Injection qua tham số tên branch, commit message đặc biệt", () => {
      const maliciousBranch = "main'; DROP TABLE pipelines; --";
      const maliciousMessage = "fix: '; DELETE FROM pipeline_steps; --";

      const p = memoryDb.createPipeline({
        repository: "owner/repo",
        branch: maliciousBranch,
        commit_sha: "sha-inject",
        commit_message: maliciousMessage,
      });

      expect(p.branch).toBe(maliciousBranch);
      expect(p.commit_message).toBe(maliciousMessage);

      // Verify tables are intact
      const count = memoryDb.listPipelines();
      expect(count.total).toBe(1);
    });

    it("TC-EDGE-003: Đóng và mở lại kết nối (re-open) tệp đĩa bảo toàn 100% dữ liệu", () => {
      const diskDbPath = path.join(os.tmpdir(), `test-cicd-persist-${randomUUID()}.db`);
      tempFilesToClean.push(diskDbPath);

      // Session 1: Initialize and write
      const db1 = new DatabaseService(diskDbPath);
      const p = db1.createPipeline({
        id: "persist-pipe-1",
        repository: "persist/repo",
        branch: "main",
        commit_sha: "commit-persisted",
      });
      db1.createStep({ pipeline_id: p.id, name: "Persisted Step" });
      db1.close();

      // Session 2: Re-open connection from disk file
      const db2 = new DatabaseService(diskDbPath);
      try {
        const fetched = db2.getPipelineById("persist-pipe-1");
        expect(fetched).not.toBeNull();
        expect(fetched?.repository).toBe("persist/repo");
        expect(fetched?.steps.length).toBe(1);
        expect(fetched?.steps[0].name).toBe("Persisted Step");
      } finally {
        db2.close();
      }
    });
  });
});
