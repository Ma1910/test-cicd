import express, { Express, Request, Response } from "express";

export function calculateSum(a: number, b: number): number {
  return a + b;
}

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  // Root welcome
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      message: "CI/CD QuickTest API is running!",
      status: "SUCCESS",
      timestamp: new Date().toISOString(),
    });
  });

  // Healthcheck for Docker & K8s
  app.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "UP",
      uptime: process.uptime(),
    });
  });

  // Business logic endpoint for testing
  app.post("/api/calculate", (req: Request, res: Response) => {
    const { a, b } = req.body;
    if (typeof a !== "number" || typeof b !== "number") {
      res.status(400).json({ error: "Tham số a và b phải là số!" });
      return;
    }
    const result = calculateSum(a, b);
    res.json({ a, b, result });
  });

  return app;
}

export const app = createApp();
