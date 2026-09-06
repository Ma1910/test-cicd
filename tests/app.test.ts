import { describe, it, expect } from "vitest";
import request from "supertest";
import { app, calculateSum } from "../src/app.js";

describe("CI/CD Test Suite", () => {
  it("Unit Test: calculateSum(10, 20) should return 30", () => {
    expect(calculateSum(10, 20)).toBe(30);
  });

  it("Integration Test: GET /healthz should return 200 OK and status UP", async () => {
    const res = await request(app).get("/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("UP");
  });

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

  // Tình huống mô phỏng kiểm thử CI/CD thất bại:
  // Để test xem CI Pipeline có chặn code lỗi hay không, bạn chỉ cần đổi SIMULATE_FAIL thành true
  it("CI Gate Check: Phải vượt qua kiểm tra chất lượng", () => {
    const simulateFail = process.env.SIMULATE_FAIL === "true";
    if (simulateFail) {
      throw new Error("❌ [MÔ PHỎNG LỖI]: Test thất bại có chủ đích để kiểm tra CI Pipeline!");
    }
    expect(true).toBe(true);
  });
});
