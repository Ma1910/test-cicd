import { execSync } from "node:child_process";

/**
 * Kiểm tra xem trên GitHub remote có commit mới nào chưa được pull về không.
 * @returns {boolean} true nếu có commit mới cần pull
 */
export function checkRemoteUpdates(verbose = false) {
  try {
    // 1. Fetch metadata mới nhất từ remote origin trong nền mà không can thiệp code local
    execSync("git fetch origin main --quiet", { stdio: "ignore" });

    // 2. Đếm số lượng commit mà origin/main đang đi trước nhánh local main
    const behindCountRaw = execSync("git rev-list --count HEAD..origin/main", {
      encoding: "utf8",
    }).trim();

    const behindCount = parseInt(behindCountRaw, 10) || 0;

    if (behindCount > 0) {
      // Lấy thông tin commit mới nhất từ remote
      const latestLog = execSync(
        'git log -1 --format="%h - %an: %s (%cr)" origin/main',
        { encoding: "utf8" }
      ).trim();

      console.log("\n" + "=".repeat(68));
      console.log(`📢 [THÔNG BÁO TEAM] Có ${behindCount} COMMIT MỚI vừa được đẩy lên GitHub!`);
      console.log(`📌 Commit mới nhất: ${latestLog}`);
      console.log("⚠️  HÀNH ĐỘNG CẦN THIẾT: Hãy chạy lệnh sau để cập nhật code về máy:");
      console.log("👉  npm run sync    (hoặc: git pull origin main)");
      console.log("=".repeat(68) + "\n");
      return true;
    } else if (verbose) {
      console.log("✅ [Team Sync] Mã nguồn của bạn đang đồng bộ 100% với nhánh origin/main.");
    }
  } catch {
    // Bỏ qua nếu máy đang offline hoặc chưa cấu hình git remote
    if (verbose) {
      console.log("ℹ️  [Team Sync] Không thể kết nối tới remote git origin (Offline hoặc chưa cấu hình remote).");
    }
  }
  return false;
}

// Nếu file được chạy trực tiếp từ dòng lệnh (e.g. node scripts/check-updates.js hoặc npm run check:team)
const isDirectRun = process.argv[1]?.endsWith("check-updates.js");
if (isDirectRun) {
  const hasUpdates = checkRemoteUpdates(true);
  process.exit(hasUpdates ? 1 : 0);
}
