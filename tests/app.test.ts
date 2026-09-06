import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { app, calculateSum } from "../src/app.js";
import { productRepo } from "../src/products.service.js";
import { clearAllTokens } from "../src/auth.service.js";

describe("Enterprise CI/CD Test Suite", () => {
  beforeEach(() => {
    productRepo.reset();
    clearAllTokens();
  });

  // ==========================================
  // 1. Math & Utility Unit Tests
  // ==========================================
  it("Unit Test: calculateSum(10, 20) should return 30", () => {
    expect(calculateSum(10, 20)).toBe(30);
  });

  // ==========================================
  // 2. Health & System Integration Tests
  // ==========================================
  it("Integration: GET / should return 200 OK and service metadata", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("OPERATIONAL");
    expect(res.body.version).toBe("2.0.0");
  });

  it("Integration: GET /healthz should return 200 OK and memory metric", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("UP");
    expect(typeof res.body.memoryUsage).toBe("number");
  });

  it("Integration: GET /metrics should export Prometheus metrics format", async () => {
    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.text).toContain("app_requests_total");
    expect(res.text).toContain("app_process_uptime_seconds");
  });

  it("Integration: GET /api/v1/meta should expose system snapshot and endpoints", async () => {
    const res = await request(app).get("/api/v1/meta");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.endpoints)).toBe(true);
  });

  // ==========================================
  // 3. Authentication & Security Tests
  // ==========================================
  it("Auth Test: POST /api/v1/auth/login should issue token for valid admin", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "admin", password: "Admin@Enterprise2026" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.role).toBe("admin");
  });

  it("Auth Test: POST /api/v1/auth/login should issue token for regular user", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "user", password: "User@Enterprise2026" });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe("user");
  });

  it("Auth Test: POST /api/v1/auth/login should reject bad credentials with 401", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "admin", password: "WrongPassword" });
    expect(res.status).toBe(401);
  });

  // ==========================================
  // 4. Products Resource & RBAC Tests
  // ==========================================
  it("Resource Test: GET /api/v1/products should return list of seeded products", async () => {
    const res = await request(app).get("/api/v1/products");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.data.length).toBe(3);
  });

  it("Resource Test: GET /api/v1/products with search & category filters", async () => {
    const res = await request(app).get("/api/v1/products?search=DevOps&category=Books");
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].name).toContain("DevOps");
  });

  it("Resource Test: GET /api/v1/products/:id should return single product", async () => {
    const res = await request(app).get("/api/v1/products/prod_1");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Cloud Native DevOps Handbook");
  });

  it("Resource Test: GET /api/v1/products/:id should return 404 for unknown id", async () => {
    const res = await request(app).get("/api/v1/products/unknown_id");
    expect(res.status).toBe(404);
  });

  it("RBAC Test: POST /api/v1/products should reject unauthenticated request with 401", async () => {
    const res = await request(app)
      .post("/api/v1/products")
      .send({ name: "New Gadget", category: "Tech", price: 99, stock: 10 });
    expect(res.status).toBe(401);
  });

  it("RBAC Test: POST /api/v1/products should reject non-admin users with 403 Forbidden", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "user", password: "User@Enterprise2026" });
    const token = loginRes.body.token;

    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "New Gadget", category: "Tech", price: 99, stock: 10 });
    expect(res.status).toBe(403);
  });

  it("RBAC Test: POST /api/v1/products should succeed for admin user", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "admin", password: "Admin@Enterprise2026" });
    const token = loginRes.body.token;

    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Kubernetes Cluster Controller", category: "DevOps", price: 199.99, stock: 15 });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(productRepo.count()).toBe(4);
  });

  it("Validation Test: POST /api/v1/products should reject invalid payload", async () => {
    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ username: "admin", password: "Admin@Enterprise2026" });
    const token = loginRes.body.token;

    const res = await request(app)
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "", category: "Tech", price: -10, stock: -5 });
    expect(res.status).toBe(400);
  });

  // ==========================================
  // 5. Calculation & Edge Case Tests
  // ==========================================
  it("Integration Test: POST /api/calculate should compute sum correctly", async () => {
    const res = await request(app)
      .post("/api/calculate")
      .send({ a: 15, b: 25 });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe(40);
  });

  it("Integration Test: POST /api/calculate should return 400 for bad input", async () => {
    const res = await request(app)
      .post("/api/calculate")
      .send({ a: "not-a-number", b: 25 });
    expect(res.status).toBe(400);
  });

  it("Integration Test: POST /api/calculate should reject non-finite numbers (NaN/Infinity)", async () => {
    const res1 = await request(app)
      .post("/api/calculate")
      .send({ a: Infinity, b: 20 });
    expect(res1.status).toBe(400);

    const res2 = await request(app)
      .post("/api/calculate")
      .send({});
    expect(res2.status).toBe(400);
  });

  it("Routing Test: Undefined routes should return JSON 404", async () => {
    const res = await request(app).get("/api/unknown-endpoint");
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Endpoint not found");
  });

  it("CI Gate Check: Test suite passes under normal conditions", () => {
    const simulateFail = process.env.SIMULATE_FAIL === "true";
    if (simulateFail) {
      throw new Error("❌ [MÔ PHỎNG LỖI]: Test thất bại có chủ đích để kiểm tra CI Pipeline!");
    }
    expect(true).toBe(true);
  });
});
