import { exec } from "node:child_process";
import os from "node:os";

const port = process.env.PORT || 3000;
const defaultDashboardUrl = `http://localhost:${port}/dashboard`;

const targetUrl = process.argv[2] === "actions"
  ? (process.env.GITHUB_ACTIONS_URL || "https://github.com/Ma1910/test-cicd/actions")
  : (process.env.APP_URL || defaultDashboardUrl);

console.log(`\n🚀 [CI/CD CLI Launcher] Launching browser to view live Zero-Mock CI/CD platform...`);
console.log(`🔗 Target URL: ${targetUrl}\n`);

const platform = os.platform();
let cmd = "";

if (platform === "win32") {
  cmd = `start "" "${targetUrl}"`;
} else if (platform === "darwin") {
  cmd = `open "${targetUrl}"`;
} else {
  cmd = `xdg-open "${targetUrl}"`;
}

exec(cmd, (error) => {
  if (error) {
    console.error(`❌ Could not open browser automatically: ${error.message}`);
    console.log(`👉 Please open link manually in browser: ${targetUrl}`);
    return;
  }
  console.log(`✅ Browser launched successfully! Inspecting CI/CD in real time.`);
});
