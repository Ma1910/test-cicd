import express, { Express, Request, Response, NextFunction } from "express";
import { generateToken, verifyToken, UserPayload } from "./auth.service.js";
import { productRepo } from "./products.service.js";
import { metrics } from "./metrics.service.js";
import { renderDashboardHtml } from "./dashboard.template.js";
import { renderHealthHtml } from "./health.template.js";

export function calculateSum(a: number, b: number): number {
  return a + b;
}

// Lightweight rate limiter per IP without redis
const rateLimitWindowMs = 60_000;
const maxRequestsPerWindow = 100;
const ipHits = new Map<string, { count: number; resetAt: number }>();

function rateLimiter(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + rateLimitWindowMs });
    next();
    return;
  }

  entry.count++;
  if (entry.count > maxRequestsPerWindow) {
    res.status(429).json({ error: "Too many requests. Please try again later." });
    return;
  }
  next();
}

// Authentication middleware
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: Missing or malformed Bearer token" });
    return;
  }
  const token = header.slice(7).trim();
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: "Unauthorized: Invalid or expired token" });
    return;
  }
  (req as Request & { user?: UserPayload }).user = user;
  next();
}

export function createApp(): Express {
  const app = express();

  // Security Hardening
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));
  app.use(rateLimiter);

  // Telemetry middleware
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.on("finish", () => {
      metrics.record(res.statusCode);
    });
    next();
  });

  // ==========================================
  // System Endpoints
  // ==========================================
  app.get("/", (req: Request, res: Response) => {
    const isBrowserHtml =
      Boolean(req.headers.accept && req.headers.accept.includes("text/html") && !req.headers.accept.includes("application/json")) ||
      req.query.format === "html";

    if (isBrowserHtml && req.query.format !== "json") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderDashboardHtml());
      return;
    }

    res.json({
      name: "Enterprise CI/CD Automation Platform API",
      version: "2.0.0",
      status: "OPERATIONAL",
      docs: "/api/v1/meta",
      dashboard: "/dashboard",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/dashboard", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(renderDashboardHtml());
  });

  const handleHealthRequest = (req: Request, res: Response) => {
    const isBrowserHtml =
      Boolean(req.headers.accept && req.headers.accept.includes("text/html") && !req.headers.accept.includes("application/json")) ||
      req.query.format === "html";

    if (isBrowserHtml && req.query.format !== "json") {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(renderHealthHtml());
      return;
    }

    res.status(200).json({
      status: "UP",
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage().rss,
    });
  };

  app.get("/healthz", handleHealthRequest);
  app.get("/health", handleHealthRequest);

  app.get("/metrics", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/plain");
    res.send(metrics.toPrometheusFormat());
  });

  app.get("/api/v1/meta", (_req: Request, res: Response) => {
    res.json({
      architecture: "Clean Microservice Core",
      telemetry: metrics.getSnapshot(),
      endpoints: [
        "POST /api/v1/auth/login",
        "GET  /api/v1/products",
        "POST /api/v1/products (Protected: admin)",
        "GET  /api/v1/products/:id",
        "POST /api/calculate",
        "GET  /healthz",
        "GET  /metrics",
      ],
    });
  });

  // ==========================================
  // Auth Endpoints
  // ==========================================
  app.post("/api/v1/auth/login", (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    // Demo enterprise authentication credentials
    if (username === "admin" && password === "Admin@Enterprise2026") {
      const token = generateToken({ id: "usr_admin", username: "admin", role: "admin" });
      res.json({ token, tokenType: "Bearer", role: "admin", expiresIn: 3600 });
      return;
    }
    if (username === "user" && password === "User@Enterprise2026") {
      const token = generateToken({ id: "usr_regular", username: "user", role: "user" });
      res.json({ token, tokenType: "Bearer", role: "user", expiresIn: 3600 });
      return;
    }

    res.status(401).json({ error: "Invalid username or password" });
  });

  // ==========================================
  // Resource Endpoints: Products CRUD
  // ==========================================
  app.get("/api/v1/products", (req: Request, res: Response) => {
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const items = productRepo.findAll({ search, category });
    res.json({
      total: items.length,
      data: items,
    });
  });

  app.get("/api/v1/products/:id", (req: Request, res: Response) => {
    const item = productRepo.findById(req.params.id);
    if (!item) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    res.json(item);
  });

  app.post("/api/v1/products", requireAuth, (req: Request, res: Response) => {
    const user = (req as Request & { user?: UserPayload }).user;
    if (user?.role !== "admin") {
      res.status(403).json({ error: "Forbidden: Admin privileges required" });
      return;
    }

    const { name, category, price, stock } = req.body || {};
    if (
      typeof name !== "string" || !name.trim() ||
      typeof category !== "string" || !category.trim() ||
      typeof price !== "number" || !Number.isFinite(price) || price < 0 ||
      typeof stock !== "number" || !Number.isFinite(stock) || stock < 0
    ) {
      res.status(400).json({ error: "Invalid product payload attributes" });
      return;
    }

    const created = productRepo.create({ name, category, price, stock });
    res.status(201).json(created);
  });

  // Legacy calculate endpoint
  app.post("/api/calculate", (req: Request, res: Response) => {
    const a = req.body?.a;
    const b = req.body?.b;

    const isValid =
      typeof a === "number" &&
      typeof b === "number" &&
      Number.isFinite(a) &&
      Number.isFinite(b);

    if (!isValid) {
      res.status(400).json({
        error: "Tham số a và b phải là số thực hợp lệ (finite number)!",
      });
      return;
    }

    const result = calculateSum(a, b);
    res.json({ a, b, result });
  });

  // 404 handler for undefined routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Endpoint not found" });
  });

  return app;
}

export const app = createApp();
