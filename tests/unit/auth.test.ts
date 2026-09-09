import { describe, it, expect, beforeEach } from "vitest";
import { generateToken, verifyToken, revokeToken, clearAllTokens, UserPayload } from "../../src/auth.service.js";

describe("AuthService Unit Tests", () => {
  const mockUser: UserPayload = {
    id: "user-1",
    username: "devops-admin",
    role: "admin",
  };

  beforeEach(() => {
    clearAllTokens();
  });

  it("generates and verifies a valid token", () => {
    const token = generateToken(mockUser, 5000);
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");

    const user = verifyToken(token);
    expect(user).toEqual(mockUser);
  });

  it("returns null for non-existent token", () => {
    expect(verifyToken("non-existent-token")).toBeNull();
  });

  it("returns null and cleans up when token is expired", async () => {
    const token = generateToken(mockUser, 10); // 10ms expiry
    await new Promise((r) => setTimeout(r, 20));

    const user = verifyToken(token);
    expect(user).toBeNull();
  });

  it("revokes token successfully", () => {
    const token = generateToken(mockUser, 5000);
    const revoked = revokeToken(token);
    expect(revoked).toBe(true);

    const user = verifyToken(token);
    expect(user).toBeNull();
  });

  it("clears all tokens", () => {
    const token1 = generateToken(mockUser, 5000);
    const token2 = generateToken({ ...mockUser, id: "user-2" }, 5000);

    clearAllTokens();

    expect(verifyToken(token1)).toBeNull();
    expect(verifyToken(token2)).toBeNull();
  });
});
