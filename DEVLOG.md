# DEVLOG — BrowserMulti Stealth Browser
> Nhật ký kinh nghiệm + kiến thức kiến trúc. Cập nhật liên tục trong quá trình phát triển để các bản update sau hoàn chỉnh hơn.
> Last updated: 2026-08-22 (Phase 1: CDP Hardening)

---

## 1. BỐI CẢNH DỰ ÁN

- **Mục tiêu**: Custom Chromium build ("BrowserMulti") đạt mức stealth của CloakBrowser: reCAPTCHA v3 = 0.9, pass Turnstile/FingerprintJS/BrowserScan, **CDP detection = Not detected** khi drive bằng Playwright/Puppeteer.
- **Mã nguồn**: `D:\dichchrome\src` (Chromium trunk ~v154), build `out\Default`, toolchain depot_tools tại `D:\dichchrome\depot_tools`.
- **Build lệnh**: `$env:PATH = "D:\dichchrome\depot_tools;$env:PATH"; autoninja -C out\Default chrome` (build bù ~30s–2m nếu đổi ít file).
- **Chạy thử**: qua `D:\dichchrome\launch_browser.bat` (profile cố định `D:\dichchrome\user_data`).

### File nguồn đã patch (tính đến hiện tại)
| File | Patch | Lý do |
|---|---|---|
| `components/embedder_support/user_agent_utils.cc` | brand list thêm "Google Chrome"; bỏ tiền tố "Headless" UA | Giống hệt Chrome thật ở Sec-CH-UA & UA headless |
| `third_party/blink/renderer/core/frame/navigator.cc` | `webdriver()` luôn return false | navigator.webdriver |
| `third_party/blink/renderer/core/page/plugin_data.cc` | inject 5 plugin mặc định khi list rỗng | navigator.plugins.length = 5 |
| `components/search_engines/template_url_prepopulate_data_resolver.cc` | NOTREACHED → LOG(WARNING) | Crash khi Playwright thêm flag làm lệch migration-state |
| `chrome/app/theme/chromium/BRANDING` | PRODUCT = BrowserMulti | Branding |
| **`v8/src/inspector/v8-runtime-agent-impl.cc`** | **(1)** `messageAdded`: KHÔNG forward console message tới Runtime-only client; **(2)** `enable()`: bỏ `setMaxCallStackSizeToCapture` | **Vá 2 vector phát hiện CDP chính (xem §3.1, §3.4)** |

---

## 2. KIẾN THỨC KIẾN TRÚC CHROMIUM/V8 ĐÃ ĐỌC RA

### 2.1 Chuỗi User-Agent / Client Hints
- UA product token hardcode `"Chrome/"` tại `components/version_info/version_info_with_user_agent.h` — KHÔNG phụ thuộc branding → Chromium build vẫn gửi `Chrome/xxx`.
- Brand list Sec-CH-UA dựng tại `GenerateBrandVersionList()` trong `components/embedder_support/user_agent_utils.cc`. Khi `CHROMIUM_BRANDING=true`, brand chính thức bị bỏ (`brand = nullopt`) → chỉ còn "Chromium". Patch tại đây thay vì branding file là gọn nhất.
- Headless prefix chèn tại `GetUserAgentInternal()` (cùng file) qua `product.insert(0, "Headless")`.

### 2.2 V8 Inspector / CDP — đường đi của console message
```
page JS gọi console.debug(obj, ...)
  └─ V8Console::Debug → V8ConsoleMessageStorage::addMessage()
       ├─ lưu vào storage (luôn)
       └─ thông báo tới agent đang enabled:
            ├─ Console domain: V8ConsoleAgentImpl::messageAdded → reportToFrontend(generatePreview=false) ✅ an toàn
            └─ Runtime domain: V8RuntimeAgentImpl::messageAdded → reportMessage(message, TRUE) ⚠️ NGUỒN LEAK
                 └─ reportToFrontend(..., generatePreview)
                      └─ wrapArguments(session, generatePreview)   [v8-console-message.cc:305]
                           └─ session->wrapObject(..., WrapMode::kPreview)  [v8-inspector-session-impl.cc:331]
                                └─ ValueMirror::wrapObject → buildObjectPreview
                                     └─ ĐỌC THUỘC TÍNH OBJECT → GỌI USER GETTER ❌
```
- `WrapMode`: `kIdOnly` (chỉ tham chiếu, không đụng property) vs `kPreview` (dựng preview inline → đọc property/getter).
- Exception path đã an toàn sẵn: injected-script.cc:907/997 dùng `kIdOnly` cho `IsNativeError()`.
- `Runtime.enable` còn gọi: `setMaxCallStackSizeToCapture(128)`, `beginEnsureAllContextsInGroup()` → `Settings::SetForceMainWorldInitialization(true)` (ép khởi tạo WindowProxy mọi frame — chưa xác nhận JS-visible).
- Worker có inspector riêng nhưng dùng cùng code path RuntimeAgent → vá một chỗ phủ cả worker.

### 2.3 Timer clamp (performance.now)
- `third_party/blink/renderer/core/timing/time_clamper.{h,cc}`: coarse=100µs, fine=5µs (chỉ theo crossOriginIsolated). KHÔNG có điều kiện inspector/debugger → timer precision không phải vector leak trong bản upstream này.
- Worker chia sẻ cùng TimeClamper; worker timeOrigin khác main frame là bình thường (spec).

### 2.4 Search engine / Template URL
- Template Google chuẩn nằm ở `third_party/search_engines_data/resources/definitions/prepopulated_engines.json` (không còn ở components/search_engines).
- `sourceid=chrome` sinh tự động desktop tại `template_url.cc:1450`.

---

## 3. KINH NGHIỆM PHÁT HIỆN & CHỮA VECTOR CDP (PHẦN QUAN TRỌNG NHẤT)

### 3.1 Vector phát hiện đã xác minh thực nghiệm
**Kỹ thuật của deviceandbrowserinfo.com (script obfuscate `cstlxp.js`, 637KB):**
```js
// Tạo Error-like object với .stack là getter đặt cờ:
const e = new Error(); 
Object.defineProperty(e, 'stack', { get(){ cdpDetected = true; return ''; } });
console.debug('x', e);   // ← nếu CDP Runtime.enable: inspector serialize arg
                          //    → preview generation đọc .stack → GETTER FIRE → DETECTED!
```
- Camera bắt được họ gọi console.log ×2 + console.debug ×2, tạo 3 Blob Worker (probe trong worker nữa → cờ `isAutomatedWithCDPInWebWorker`).
- **Chỉ riêng `Runtime.enable` là đủ trigger. `Page.enable` sạch hoàn toàn.**

### 3.2 Các vector ĐÃ TEST và KHÔNG phát hiện được (tham khảo để khỏi đoán lại)
| Vector | Kết quả trên Chromium v154 |
|---|---|
| console getter probe (object thường) | Không fire ngay cả khi Runtime.enable |
| performance.now() precision | Clamp 100µs ổn định, không đổi khi attach |
| Error.stack format / stackTraceLimit | Giống hệt (limit 10, không thêm frame async) |
| Promise rejection stack | Không có marker "Caused by"/async |
| setTimeout/rAF/microtask latency | Chỉ nhiễu hệ thống, không systematic |
| Date.now vs timeOrigin skew | Nhiễu |

⚠️ **Bài học**: đừng tin tài liệu cũ nói "console.debug serialize eagerly" đúng cho MỌI object — v154 chỉ eager-preview khi object đi qua đường Runtime domain reporting (đã vá).

### 3.3 Playwright/Puppeteer artifacts KHÁC cần lưu ý
- `Emulation.setDeviceMetricsOverride` → `window.outerWidth/outerHeight == 0` và screen khớp viewport — dấu hiệu automation kinh điển. **Giải pháp đã verify: launch với `viewport: null`** → outer=1296×854 thật.
- Playwright thêm hàng loạt flag (`--disable-field-trial-config`...) có thể gây crash NOTREACHED ở search-engines migration (đã vá).
- Profile keywords DB ghi cờ migration khi chạy thường → chạy lại dưới Playwright mismatch → crash (đã hạ xuống WARNING).

### 3.4 ⭐ Vector thứ hai: PER-CALL LATENCY FINGERPRINT (phát hiện 2026-08-22, muộn hơn console-getter)
Khi `Runtime.enable`, MỖI lệnh gọi console/Error chậm đi một cách hệ thống:
| Operation | Không CDP | Runtime.enable (trước vá) | Sau vá |
|---|---|---|---|
| console.debug(obj) | ~40µs | ~150µs (3.7×) | ~40-66µs ✅ |
| console.log(str) | ~35µs | ~133µs (3.7×) | ~50-67µs ✅ |
| new Error() | ~6.4µs | ~17µs (2.7×) | ~7-10µs ✅ |

Nguyên nhân gốc:
1. `messageAdded` forward message → serialize args thành RemoteObject + emit `consoleAPICalled` qua CDP channel (~110µs/call). → Vá: skip hẳn reporting khi chỉ có Runtime domain (DevTools vẫn ổn nhờ Console domain riêng).
2. `enable()` gọi `setMaxCallStackSizeToCapture(128)` → bật eager stack capture toàn cục cho mọi Error/exception (~10µs/`new Error()`). → Vá: bỏ call này; Debugger domain tự set depth khi được bật.

⚠️ **Hệ quả chấp nhận**: Playwright/Puppeteer `page.on('console')` không còn fire (chúng dựa vào Runtime.consoleAPICalled). DevTools UI vẫn hoạt động bình thường (Console domain path riêng, không preview).

⚠️ **Bài học đo đạc**: vector này KHÔNG thể phát hiện bằng so sánh giá trị (clock quantization, stack format...) — phải micro-benchmark THỜI GIAN GỌI HÀM (µs/call) rồi so none-vs-CDP. Tên cờ "hasInconsistentTimingResolution" của họ là phép đo latency trá hình!

---

## 4. PHƯƠNG PHÁP NGHIÊN CỨU HIỆU QUẢ (đã kiểm chứng)

1. **Domain isolation test** (`cdp_domain_test.js`): raw WebSocket CDP, chỉ bật từng domain một (none/Runtime/Page/full) → bisect chính xác thủ phạm. Công cụ: node + thư viện `ws`.
2. **Camera instrumentation**: `Page.addScriptToEvaluateOnNewDocument` (Page.enable là sạch nên không nhiễu kết quả) cài wrapper quanh console.*, Worker, Object.defineProperty, Date.now → xem script đối thủ CHẠM VÀO GÌ, dump cả descriptor của argument chúng truyền vào console.
3. **Baseline-first**: luôn chạy "không automation" trước để biết trạng thái sạch (binary của ta sạch tuyệt đối không CDP — isBot=false 22/22 flags).
4. **Deobfuscate**: `npm i deobfuscator` (node 20 OK; webcrack cần node 22 + isolated-vm native build fail do thiếu VS). Deobfuscate một phần giúp thấy cấu trúc nhưng runtime instrumentation hiệu quả hơn nhiều.
5. **Không tin suy đoán** — mọi giả thuyết (timer, stack, overhead async) đều phải đo; 3/4 giả thuyết ban đầu đều sai, vector thật là preview serialization.

## 5. PITFALLS ĐÃ GẶP (tránh lặp lại)

- `execFileSync(chrome.exe --dump-dom)` treo khi trang có Worker + virtual-time → dùng HTTP server nội bộ + page POST kết quả về (`fetch('/result')`) hoặc poll evaluate.
- HttpListener PowerShell job đôi khi không start kịp → dùng node http server cho ổn định.
- data: URL là insecure context → `navigator.userAgentData` undefined; muốn test client hints phải qua https hoặc http://127.0.0.1 (trustworthy origin).
- bot.incolamitas.com: DNS không tồn tại công khai (chỉ trong marketing table) → bỏ khỏi suite.
- deviceandbrowserinfo.com rất nặng (~60s+): waitUntil domcontentloaded + poll #jsonResult tới 60s.
- Sannysoft mới: tên dòng chứa "\n(New)" → normalize whitespace trước khi so khớp; giá trị `prompt` của Permissions là PASS.
- tls.peet.ws/api/clean: ja3/ja4 nằm ở TOP-LEVEL JSON (không phải data.tls).
- Build siso offline mode: nếu build fail lạ, xem `out\Default\siso_output`.

## 6. TRẠNG THÁI & TODO

- [x] Giai đoạn 0: identity patches (webdriver/plugins/chrome/UA/branding) — isBot=false khi không CDP
- [x] **Giai đoạn 1: CDP hardening — HOÀN THÀNH** — isBot=false qua Playwright, 0 cờ true
- [x] **Giai đoạn 2: Humanized Input Engine — HOÀN THÀNH (2026-08-22)**
  - `human_input.js`: humanMouseMove (Bézier + timeWarp velocity + jitter ±1px + overshoot), humanClick (pre-pause/dwell), humanType (dwell/flight/think-pause), humanScroll (decay chunks)
  - Verify: reCAPTCHA v3 score=0.9 với ambient behavior; Turnstile token resolved; keystroke dwell 61-86ms / flight 92-150ms đúng dải người thật
  - Lưu ý: interval thực tế ~30ms do overhead sleep() Node — vẫn trong dải tự nhiên; có thể tối ưu bằng pacing dựa performance.now nếu cần
  - Test w3schools: input có sẵn text "John" → click không clear (hành vi chuẩn của click thật); test script nên select+clear khi cần
- [ ] Giai đoạn 3: mở rộng validation (FingerprintJS, BrowserScan, ShieldSquare, behavioral test `/are_you_a_bot_interactions`)
  - Vector 1 (console-getter): `messageAdded` không serialize args → getter `.stack` poisoned không fire (verify errStackGetterFired=false)
  - Vector 2 (per-call latency): skip reporting + bỏ setMaxCallStackSizeToCapture → console ~40µs, new Error ~7µs ≈ baseline
  - ✅ **VERIFY CUỐI**: raw `Runtime.enable` → deviceandbrowserinfo **isBot=false**; **full Playwright drive → isBot=false, 0 cờ true**; sannysoft/TLS/reCAPTCHA v3=0.9 vẫn PASS
- [x] Verify spec gaps (verify_spec_gaps.js): window.chrome descriptor/branches✅, plugins named+proto✅, Permissions SYNC✅, WorkerNavigator CONSISTENT✅, screen geometry OK (viewport:null)✅, JA4+akamai_hash+h2✅
- [x] Giai đoạn 3: mở rộng validation — HOÀN THÀNH (2026-08-22)
  - BrowserScan: Normal ✅ | Incolumitas: **33/33 OK** (gồm puppeteerExtraStealthUsed=OK) ✅ | FingerprintJS Pro: 8/8 signals Not Detected, Suspect Score 6 ✅ | Vastel bots: server 502 ⚪
  - Báo cáo: VALIDATION_REPORT.md; bằng chứng: test_reports/phase3_*.png + incolumitas_full.txt
- [ ] Cân nhắc sau: `window.chrome.runtime` = undefined (Chrome thật có nhờ builtin extension) — chỉ patch nếu gặp site check
- [ ] Cân nhắc sau: WebRTC IP handling policy khi dùng proxy (`default_public_interface_only`)
- [ ] Cân nhắc sau: residual overhead Runtime-enable (~+26µs/console call, ~+3µs/Error) — đã dưới ngưỡng phát hiện thực nghiệm, theo dõi thêm

## 7. QUY TRÌNH BUILD–TEST CHUẨN

```powershell
# Build
cd D:\dichchrome\src
$env:PATH = "D:\dichchrome\depot_tools;$env:PATH"
autoninja -C out\Default chrome

# Kill instance cũ rồi test
Get-Process chrome | ? { $_.Path -like "D:\dichchrome*" } | Stop-Process -Force

# Benchmark tổng
node D:\dichchrome\auto_benchmark.js

# Domain isolation (CDP research)
node D:\dichchrome\cdp_domain_test.js

# So sánh baseline vs CDP trên probe nội bộ
node D:\dichchrome\cdp_compare.js

# Camera instrumentation trang thật
node D:\dichchrome\camera_test.js
```
