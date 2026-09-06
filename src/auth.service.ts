import crypto from "node:crypto";

export interface UserPayload {
  id: string;
  username: string;
  role: "admin" | "user";
}

// In-memory token store with TTL for demo/stateless verification without external heavy dependencies
const tokenStore = new Map<string, { user: UserPayload; expiresAt: number }>();

export function generateToken(user: UserPayload, expiresInMs: number = 3600_000): string {
  const raw = `${user.id}:${user.username}:${user.role}:${Date.now()}:${crypto.randomBytes(16).toString("hex")}`;
  const token = crypto.createHash("sha256").update(raw).digest("hex");
  tokenStore.set(token, {
    user,
    expiresAt: Date.now() + expiresInMs,
  });
  return token;
}

export function verifyToken(token: string): UserPayload | null {
  const session = tokenStore.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    tokenStore.delete(token);
    return null;
  }
  return session.user;
}

export function revokeToken(token: string): boolean {
  return tokenStore.delete(token);
}

export function clearAllTokens(): void {
  tokenStore.clear();
}
