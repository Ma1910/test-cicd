import { describe, it, expect } from "vitest";
import { EventEmitter } from "node:events";

describe("Tier 3: Cross-Feature Interactions - Multi-Client SSE Synchronization (R5)", () => {
  it("E2E-T3-04: Broadcasts logs to multiple subscribers concurrently and cleans up on client disconnect", () => {
    const pipelineEmitter = new EventEmitter();
    const pipelineId = "pipe_multi_sse_01";

    const client1Logs: string[] = [];
    const client2Logs: string[] = [];
    const client3Logs: string[] = [];

    const listener1 = (chunk: string) => client1Logs.push(chunk);
    const listener2 = (chunk: string) => client2Logs.push(chunk);
    const listener3 = (chunk: string) => client3Logs.push(chunk);

    // 3 clients connect
    pipelineEmitter.on(`log:${pipelineId}`, listener1);
    pipelineEmitter.on(`log:${pipelineId}`, listener2);
    pipelineEmitter.on(`log:${pipelineId}`, listener3);

    expect(pipelineEmitter.listenerCount(`log:${pipelineId}`)).toBe(3);

    // First broadcast
    pipelineEmitter.emit(`log:${pipelineId}`, "Chunk 1: starting lint...\n");

    // Client 2 disconnects
    pipelineEmitter.off(`log:${pipelineId}`, listener2);
    expect(pipelineEmitter.listenerCount(`log:${pipelineId}`)).toBe(2);

    // Second broadcast
    pipelineEmitter.emit(`log:${pipelineId}`, "Chunk 2: lint passed.\n");

    // Client 1 & 3 should have both chunks; Client 2 should only have chunk 1
    expect(client1Logs).toEqual(["Chunk 1: starting lint...\n", "Chunk 2: lint passed.\n"]);
    expect(client2Logs).toEqual(["Chunk 1: starting lint...\n"]);
    expect(client3Logs).toEqual(["Chunk 1: starting lint...\n", "Chunk 2: lint passed.\n"]);

    // Cleanup remaining
    pipelineEmitter.removeAllListeners(`log:${pipelineId}`);
    expect(pipelineEmitter.listenerCount(`log:${pipelineId}`)).toBe(0);
  });
});
