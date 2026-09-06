import express, { Express, Request, Response } from "express";

export function calculateSum(a: number, b: number): number {
  return a + b;
}

export function createApp(): Express {
  const app = express();

  // Security: Disable x-powered-by header to prevent server fingerprinting
  app.disable("x-powered-by");

  // Body parser with strict size limit to guard against memory exhaustion / payload DoS
  app.use(express.json({ limit: "100kb" }));

  // Root welcome & API health descriptor
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      message: "CI/CD QuickTest API is running!",
      status: "SUCCESS",
      timestamp: new Date().toISOString(),
    });
  });

  // Healthcheck for Docker, K8s, and Load Balancers
  app.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "UP",
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage().rss,
    });
  });

  // Business logic endpoint: calculates sum of two numbers with strict validation
  app.post("/api/calculate", (req: Request, res: Response) => {
    const a = req.body?.a;
    const b = req.body?.b;

    // Validate type and ensure numbers are finite (guard against NaN and +/-Infinity)
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
