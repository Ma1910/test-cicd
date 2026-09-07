import { checkRemoteUpdates } from "./check-updates.js";

console.log("\n📡 [Team Sync Daemon] Đang chạy trình giám sát tự động kiểm tra code mới...");
console.log("💡 Mỗi 30 giây sẽ tự động kiểm tra xem đồng đội có vừa push commit mới lên GitHub không.");
console.log("👉 Nhấn Ctrl+C để dừng giám sát bất kỳ lúc nào.\n");

// Kiểm tra ngay khi khởi động
checkRemoteUpdates(true);

// Lặp lại việc kiểm tra mỗi 30 giây (hoặc cấu hình qua biến môi trường SYNC_INTERVAL_SEC)
const intervalSec = Number(process.env.SYNC_INTERVAL_SEC) || 30;
setInterval(() => {
  checkRemoteUpdates(false);
}, intervalSec * 1000);
