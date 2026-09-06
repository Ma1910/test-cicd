import { app } from "./app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 CI/CD Test Server running at http://localhost:${PORT}`);
  console.log(`🩺 Healthcheck available at http://localhost:${PORT}/healthz`);
});
