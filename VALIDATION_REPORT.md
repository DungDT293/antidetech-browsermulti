# VALIDATION REPORT — BrowserMulti (Giai đoạn 3: Validation mở rộng)

> Chạy tự động: 2026-08-22 · binary: `src/out/Default/chrome.exe` · profile: `user_data` · viewport: null · human_input.js

## Bảng tổng hợp

| # | Hệ thống | Kết quả thực tế | Trạng thái | Ảnh/Bằng chứng |
|---|----------|-----------------|-----------|----------------|
| 1 | **BrowserScan** Bot Detection | Test Results: **Normal** — Webdriver ✅, User-Agent ✅, CDP ✅, Navigator ✅ | **PASS** | test_reports/phase3_browserscan.png |
| 2 | **Incolumitas** (bot.incolumitas.com) | **33/33 test = OK, 0 FAILED** — gồm: webdriverPresent, puppeteerEvaluationScript, connectionRTT, refMatch, overrideTest, overflowTest, **puppeteerExtraStealthUsed=OK**, inconsistentWebWorkerNavigatorProperty=OK; Intoli battery: userAgent/webDriver/webDriverAdvanced/pluginsLength/pluginArray/languages = OK; fpscanner: PHANTOM_*, HEADCHR_*, SELENIUM_DRIVER, CHR_DEBUG_TOOLS, CHR_BATTERY, CHR_MEMORY, TRANSPARENT_PIXEL, SEQUENTUM... = OK | **PASS** | test_reports/incolumitas_full.txt |
| 3 | **FingerprintJS Pro** Demo | Visitor ID render thành công; Browser Smart Signals: **Bot Detection = Not Detected**, VPN Detection = Not Detected, Browser Tampering = Not Detected, Developer Tools = Not Detected, Virtual Machine = Not Detected, Privacy Settings = Not Detected, IP Blocklist = Not Detected, High Activity Device = Not Detected; Suspect Score = 6 (thấp); Geolocation: Da Nang, VN (khớp IP thật) | **PASS** | test_reports/phase3_fingerprintjs.png |
| 4 | **Antoine Vastel** (arh.antoinevastel.com/bots) | Server trả về **502 Bad Gateway** — dịch vụ đã ngừng hoạt động, không thể kiểm tra | ⚪ UNAVAILABLE | test_reports/phase3_vastel.png |

## Phân tích & nhận xét

### Điểm nhấn quan trọng nhất: `puppeteerExtraStealthUsed: "OK"`
Incolumitas có bài test **chuyên phát hiện việc dùng thư viện stealth-JS injection** (puppeteer-extra-stealth). Các giải pháp JS-injection gần như luôn trượt bài này vì để lại vết trong prototype chain và descriptor. BrowserMulti vượt nhờ đúng triết lý thiết kế: *không inject bất kỳ thứ gì* — mọi tín hiệu đều từ binary C++ thật.

### FingerprintJS Pro — bộ smart signals thương mại
Toàn bộ 8/8 signals trả về **Not Detected**, Suspect Score chỉ 6/100. Geolocation khớp IP thực (Da Nang, VN) → tính nhất quán GeoIP tốt.

### Lưu ý phương pháp
- Lần chạy đầu, heuristic đếm từ khóa "failed" của incolumitas cho kết quả sai (8) do đếm nhầm **văn bản mô tả** của trang ("tests will fail if headless..."). Bài học: luôn dump context quanh từ khóa trước khi kết luận (đã ghi vào DEVLOG.md).
- Antoine Vastel bots test (arh.antoinevastel.com) hiện 502 — trang này là tiền thân của incolumitas (cùng tác giả), nên kết quả incolumitas đã phủ phạm vi tương đương.
- reCAPTCHA v3 = 0.9 và Cloudflare Turnstile PASS đã xác minh ở Giai đoạn 2 (`test_human_behavior.js`).

## Kết luận
BrowserMulti vượt qua toàn bộ các hệ thống phòng thủ thương mại còn hoạt động trong danh sách kiểm thử, ở cả tầng fingerprint tĩnh lẫn tầng hành vi.
