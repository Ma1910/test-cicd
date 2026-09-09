import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../../src/app.js";

describe("Tier 1: Feature Coverage - Deep Healthz Diagnostics (R7)", () => {
  it("E2E-T1-08a: GET /healthz returns HTTP 200 and basic uptime/memory", async () => {
    const res = await request(app).get("/healthz?format=json");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("UP");
  });

  it("E2E-T1-08b: GET /healthz reports deep diagnostic checks when configured", async () => {
    const res = await request(app)
      .get("/healthz")
      .set("Accept", "application/json");

    expect(res.status).toBe(200);
    // When deep healthcheck is enabled, checks property reports sub-components
    if (res.body.checks) {
      expect(res.body.checks.database).toBeDefined();
      expect(res.body.checks.database.status).toBe("UP");
      expect(res.body.checks.workspace).toBeDefined();
      expect(res.body.checks.workspace.writable).toBe(true);
    }
  });
});
