import { exec } from "node:child_process";
import os from "node:os";

const targetUrl = process.argv[2] === "actions"
  ? "https://github.com/Ma1910/test-cicd/actions"
  : "https://ma1910.github.io/test-cicd/";

console.log(`\n🚀 [CI/CD CLI Launcher] Launching browser to view live CI/CD pipeline...`);
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
