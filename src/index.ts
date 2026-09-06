import { app } from "./app.js";

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 CI/CD Test Server running at http://localhost:${PORT}`);
  console.log(`🩺 Healthcheck available at http://localhost:${PORT}/healthz`);
});

// Production Graceful Shutdown for Docker & Kubernetes
function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log("✅ HTTP server closed. Process exiting cleanly.");
    process.exit(0);
  });

  // Force close after 10 seconds if connections hang
  setTimeout(() => {
    console.error("⚠️ Forcing shutdown after timeout.");
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

