# Handoff Document - BrowserMulti Bot-Detection Fix Project

## 1. Tổng quan dự án (Project Overview)
- **Tên dự án**: BrowserMulti (Build từ mã nguồn Chromium, tại thư mục `D:\dichchrome\src`).
- **Mục tiêu**: Khắc phục lỗi Google nhận diện trình duyệt là bot (hiển thị trang `google.com/sorry reCAPTCHA`) khi mở tìm kiếm bằng cách thực hiện các bản vá mã nguồn C++ (Source-level C++ Patches) định danh trình duyệt hệt như Google Chrome chính thống.

---

## 2. Các yêu cầu bản vá C++ (Requirements & Specifications)
1. **Chuẩn hóa User-Agent & Client Hints (Sec-CH-UA)**:
   - Thay thế brand token `"Chromium"` thành `"Google Chrome"` trong User-Agent string lẫn header `Sec-CH-UA`.
   - Đảm bảo format đầy đủ: `"Google Chrome";v="151", "Chromium";v="151", "Not_A Brand";v="24"`.
   - Các file liên quan: `components/embedder_support/user_agent_utils.cc` (và các file dựng chuỗi UA liên quan).
2. **Vô hiệu hóa hoàn toàn `navigator.webdriver`**:
   - Ép hàm `NavigatorAutomationInformation::webdriver()` luôn trả về `false` trong mọi trường hợp tại `third_party/blink/renderer/core/frame/navigator.cc`.
3. **Bổ sung đầy đủ `window.chrome` & Plugins**:
   - `LocalDOMWindow` / `LoadTimesBindings`: Đảm bảo `window.chrome` tạo đủ các thuộc tính (app, csi, loadTimes, runtime).
   - `plugin_data.cc`: Khởi tạo danh sách `navigator.plugins` mặc định chứa 5 plugin tiêu chuẩn của Chrome thay vì mảng rỗng.
4. **Biên dịch lại (Incremental Build) & Kiểm tra**:
   - Chạy lệnh: `autoninja -C out\Default chrome`
   - Khởi chạy thử: `D:\dichchrome\src\out\Default\chrome.exe https://www.google.com`

---

## 3. Trạng thái hiện tại & Các bước đã thực hiện (Current Progress)
- **ĐÃ HOÀN THÀNH TOÀN BỘ (2026-08-22)**:
  - Patch 1: `components/embedder_support/user_agent_utils.cc` — hàm `GenerateBrandVersionList()` giờ trả về brand list gồm `"Google Chrome"`, `"Chromium"` và grease brand (đã xác minh: header `Sec-Ch-Ua` gửi đi là `"Google Chrome";v="154", "Chromium";v="154", ...`).
  - Patch 2: `third_party/blink/renderer/core/frame/navigator.cc` — `Navigator::webdriver()` luôn trả về `false`.
  - Patch 3: `third_party/blink/renderer/core/page/plugin_data.cc` — khi browser không trả plugin nào, tự động thêm 5 plugin mặc định của Chrome (`navigator.plugins.length == 5`, đã xác minh).
  - `window.chrome` (app/csi/loadTimes) đã có sẵn chuẩn upstream tại `chrome/renderer/loadtimes_bindings.cc` + `chrome_content_renderer_client.cc:1524`, không cần patch.
  - Build incremental `autoninja -C out\Default chrome`: **BUILD SUCCEEDED**.
  - Đã kiểm tra bằng headless chrome:
    - `navigator.webdriver` = false
    - `navigator.plugins.length` = 5
    - `typeof window.chrome` = object
    - UA = `...Chrome/154.0.0.0 Safari/537.36` (tiền tố `HeadlessChrome` chỉ xuất hiện ở chế độ headless; chạy thường sẽ là `Chrome`)
    - Header `Sec-Ch-Ua` chứa brand `"Google Chrome"`
  - **Việc còn lại duy nhất**: khởi chạy giao diện thật `D:\dichchrome\src\out\Default\chrome.exe https://www.google.com` và tìm kiếm thủ công để xác nhận không còn trang `/sorry` reCAPTCHA.

## 4. Bổ sung (2026-08-22, lần 2)
- **Google Search Template URL**: ĐÃ CHUẨN SẴN, không cần patch C++:
  - Template chuẩn upstream tại `third_party/search_engines_data/resources/definitions/prepopulated_engines.json:179` (đã chứa `{google:searchClient}{google:sourceId}`).
  - `components/search_engines/template_url.cc:1450` trả về `sourceid=chrome` trên desktop; suggest client = `chrome`.
- **Launch script**: đã tạo `D:\dichchrome\launch_browser.bat` — chạy chrome.exe với `--user-data-dir="D:\dichchrome\user_data" --no-first-run --no-default-browser-check https://www.google.com`. Profile cookies/cache/session được lưu vĩnh viễn trong `D:\dichchrome\user_data`.
- Không có thay đổi C++ mới → không cần build lại.
- **Việc người dùng cần làm**: vượt CAPTCHA một lần (nếu hiện) bằng chính script `launch_browser.bat`; cookie NID/AEC sẽ được giữ lại cho các phiên sau. Lưu ý: luôn khởi chạy qua script để dùng đúng profile.

## 5. Benchmark Suite (2026-08-22, lần 3)
- **Playwright**: đã cài tại `D:\dichchrome\node_modules` (npm install playwright).
- **Script kiểm thử**: `D:\dichchrome\auto_benchmark.js` — chạy `node D:\dichchrome\auto_benchmark.js`.
  - Kết nối `chromium.launchPersistentContext()` vào binary tự build + profile `user_data`, headful.
  - Test: reCAPTCHA v3 (recaptcha-demo.appspot.com), Turnstile (2captcha demo), bot.sannysoft.com, TLS (tls.peet.ws/api/clean), deviceandbrowserinfo.com.
  - Screenshot tự động lưu vào `D:\dichchrome\test_reports\screenshots\`; báo cáo JSON tại `test_reports\report.json`.
- **Patch C++ bổ sung trong giai đoạn này**:
  1. `components/search_engines/template_url_prepopulate_data_resolver.cc:103` — hạ `DUMP_WILL_BE_NOTREACHED()` xuống `LOG(WARNING)` (crash khi Playwright thêm `--disable-field-trial-config` làm lệch migration-state của keywords DB).
  2. `components/embedder_support/user_agent_utils.cc:216-220` — **bỏ tiền tố "Headless"** khỏi UA ở chế độ headless (giờ headless cũng gửi `Chrome/154.0.0.0` như Chrome thật mode new-headless).
- **Kết quả benchmark (binary mới nhất)**:
  - reCAPTCHA v3: **score = 0.9 — PASS**
  - bot.sannysoft.com: WebDriver=missing(passed), Chrome=present(passed), Permissions=prompt, Plugins=5 — **PASS**
  - TLS: ja4 = `t13d1517h2_8daaf6152771_cb7bf5808d99` (giống hệt profile h2 của Chrome thật), http_version=h2 — **PASS**
  - Cloudflare Turnstile: PASS khi click thủ công; flaky khi drive qua Playwright (xem phần 6).
- **KẾT QUẢ QUAN TRỌNG NHẤT — deviceandbrowserinfo.com/are_you_a_bot**:
  - Khi BrowserMulti chạy **THUẦN KHÔNG automation** (`--headless --dump-dom`): **"You are human!" — isBot=false, toàn bộ 22/22 detection flags = false** (hasBotUserAgent, webdriver, Playwright, Phantom, Selenium, HeadlessChrome, WebGL, TimingResolution, CDP, ClientHints, GPU, WorkerValues... tất cả false).
  - Timer clamp `performance.now()` đã xác minh chuẩn upstream: main frame min delta ≈ 0.1ms (100µs) như Chrome thật; code TimeClamper không bị sửa.

## 6. Khoảng cách còn lại so với mục tiêu CloakBrowser & Lộ trình tiếp theo
- **Nguyên nhân còn FAIL khi chạy qua Playwright**: chính kết nối **CDP** gây ra — Playwright bật `Runtime.enable`/`Log.enable` qua pipe → các side-effect (console API getter được gọi sớm, async stack trace trong worker, độ phân giải timer tăng khi debugger gắn) khiến site phát hiện `isAutomatedWithCDP=true`. Fingerprint của binary sạch hoàn toàn khi không có CDP.
- **Lộ trình đề xuất (theo bảng mục tiêu CloakBrowser)**:
  1. **CDP hardening (source-level, khó nhất)**: vá V8 inspector / Blink để vô hiệu hóa side-effects của `Runtime.enable`: (a) console API getter invocation, (b) error.stack async traces, (c) timer precision nâng khi debugger gắn. Tham khảo: các vector phát hiện CDP công khai 2024+.
  2. **Humanize input (một flag `humanize=True`)**: module C++ bọc `Input.dispatchMouseEvent/dispatchKeyEvent` — mouse Bezier curves, keyboard timing jitter, scroll momentum patterns. Có thể đặt trong content/browser devtools hoặc render widget host.
  3. **Mở rộng validation**: thêm FingerprintJS (demo.fingerprint.com), BrowserScan.net, ShieldSquare, deviceandbrowserinfo behavioral test (`/are_you_a_bot_interactions`) vào auto_benchmark.js.
  4. **Lưu ý vận hành**: với tác vụ cần điểm human tối đa, dùng trình duyệt thủ công qua `launch_browser.bat`; tránh drive qua Playwright cho đến khi xong mục 1.
- **File nguồn đã sửa (tổng cộng 5 file)**:
  - `components/embedder_support/user_agent_utils.cc`
  - `third_party/blink/renderer/core/frame/navigator.cc`
  - `third_party/blink/renderer/core/page/plugin_data.cc`
  - `components/search_engines/template_url_prepopulate_data_resolver.cc`
  - `chrome/app/theme/chromium/BRANDING` (BrowserMulti branding)
- **Công cụ test**: `node D:\dichchrome\auto_benchmark.js`; build: `autoninja -C out\Default chrome` từ `D:\dichchrome\src` (thêm `D:\dichchrome\depot_tools` vào PATH).
