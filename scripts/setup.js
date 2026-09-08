#!/usr/bin/env node

/**
 * Enterprise CI/CD & Team Automation Installer
 * Lệnh 1 chạm để cài đặt toàn bộ hệ thống CI/CD, Docker, AI rules, Team Sync vào bất kỳ đồ án mới nào!
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import https from "node:https";

const REPO_RAW = "https://raw.githubusercontent.com/Ma1910/test-cicd/main";
const targetDir = process.cwd();

console.log("\n" + "=".repeat(70));
console.log("🚀 [CI/CD SETUP] Đang khởi tạo hệ thống CI/CD & Team Automation cho đồ án...");
console.log(`📁 Thư mục đích: ${targetDir}`);
console.log("=".repeat(70) + "\n");

// Danh sách các file cần tự động tải về
const filesToFetch = [
  ".github/workflows/ci.yml",
  ".github/copilot-instructions.md",
  ".ai/README.md",
  ".ai/CLAUDE.md",
  ".ai/PONYTAIL.md",
  ".ai/.cursorrules",
  ".ai/.windsurfrules",
  ".ai/AGENTS.md",
  "scripts/check-updates.js",
  "scripts/watch-team.js",
  "scripts/open-cicd.js",
  "Dockerfile",
  ".dockerignore",
  "vitest.config.ts",
];

// Helper tải file qua HTTPS
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        // Handle redirect
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destPath);
        reject(new Error(`HTTP ${response.statusCode} while fetching ${url}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", (err) => {
      fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

async function main() {
  try {
    // 1. Tải toàn bộ cấu hình mẫu về đồ án mới
    console.log("📥 Đang kéo các file cấu hình CI/CD, Docker, AI guidelines...");
    for (const f of filesToFetch) {
      const url = `${REPO_RAW}/${f}`;
      const dest = path.join(targetDir, f);
      process.stdout.write(`  ⏳ Đang tải ${f}... `);
      await downloadFile(url, dest);
      console.log("✓");
    }

    // 2. Cập nhật package.json của đồ án mới
    const pkgPath = path.join(targetDir, "package.json");
    if (fs.existsSync(pkgPath)) {
      console.log("\n📦 Đang tự động tiêm các scripts vào package.json...");
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
      pkg.scripts = pkg.scripts || {};

      const newScripts = {
        "test": pkg.scripts.test || "vitest run",
        "test:coverage": "vitest run --coverage",
        "typecheck": pkg.scripts.typecheck || "tsc --noEmit",
        "sync": "git pull origin main",
        "check:team": "node scripts/check-updates.js",
        "watch:team": "node scripts/watch-team.js",
        "cicd": "node scripts/open-cicd.js",
        "cicd:actions": "node scripts/open-cicd.js actions",
      };

      Object.assign(pkg.scripts, newScripts);
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), "utf8");
      console.log("  ✓ Đã thêm các scripts: sync, check:team, watch:team, cicd, test:coverage");
    } else {
      console.log("\n⚠️ Không tìm thấy package.json. Bạn có thể chạy 'npm init -y' trước.");
    }

    // 3. Tự động cài đặt các dependencies cần thiết cho Vitest & Typescript
    console.log("\n📦 Đang tự động cài đặt các devDependencies kiểm thử (vitest, coverage-v8)...");
    try {
      execSync("npm install -D vitest @vitest/coverage-v8 --quiet", { stdio: "inherit" });
      console.log("  ✓ Cài đặt hoàn tất!");
    } catch {
      console.log("  ⚠️ Vui lòng chạy lệnh: npm install -D vitest @vitest/coverage-v8");
    }

    console.log("\n" + "=".repeat(70));
    console.log("🎉 [THÀNH CÔNG] Đồ án của bạn đã được trang bị đầy đủ hệ thống CI/CD!");
    console.log("=".repeat(70));
    console.log("\n👉 Bạn có thể dùng ngay các lệnh sau trong đồ án mới:");
    console.log("   - npm run test:coverage  (Chạy test đo độ phủ)");
    console.log("   - npm run check:team     (Kiểm tra xem đồng đội có vừa push code không)");
    console.log("   - npm run watch:team     (Bật radar báo động terminal khi đồng đội push code)");
    console.log("   - npm run sync           (Đồng bộ code mới nhất của cả team)");
    console.log("   - npm run cicd           (Bật trình duyệt xem simulator)");
    console.log("\n🚀 Bây giờ chỉ cần 'git add .' và 'git push' lên repo mới là CI/CD tự chạy!\n");

  } catch (err) {
    console.error("\n❌ Có lỗi xảy ra trong quá trình cài đặt:", err.message);
  }
}

main();
