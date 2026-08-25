# BrowserMulti — High-Performance Anti-Detect Chromium Core

BrowserMulti là lõi trình duyệt Chromium được biên dịch tĩnh tùy chỉnh (Custom Static Chromium Build), tối ưu hóa đặc biệt cho các hệ thống tự động hóa Playwright/CDP với khả năng tàng hình cấp độ C++ (Blink & V8 Engine level).

---

## 🚀 Điểm nổi bật & Tính năng cốt lõi

* **Native C++ Engine Patching:** Ẩn dấu vết can thiệp tự động hóa từ tầng nhân V8 Runtime và Blink DOM, không sử dụng script JS tiêm ngoài.
* **CDP & Playwright Native:** Tương thích với giao thức Chrome DevTools Protocol và Playwright Persistent Context (`launch_persistent_context`).
* **Static Non-Component Distribution:** Toàn bộ engine được đóng gói vào một khối `chrome.dll` duy nhất đi kèm manifest Windows SxS, hướng tới vận hành độc lập (Standalone / Portable).
* **Enterprise Proxy & Network Stack:** Hỗ trợ SOCKS5 (Remote DNS), HTTP/HTTPS Proxy Auth và bảo toàn dấu vân tay mạng TLS JA4.

---

## 📊 Kết quả Benchmark Anti-detect (v152.0.7977.54)

| Bộ kiểm tra / WAF | Trạng thái | Điểm số / Chi tiết |
| :--- | :---: | :--- |
| **Google reCAPTCHA v3** | **PASS** | **Score: 0.9** |
| **Cloudflare Turnstile** | **PASS** | **Interactive Challenge Resolved** |
| **Sannysoft Detection Suite** | **PASS** | WebDriver missing, Chrome present, Plugins=5 |
| **TLS Fingerprint (JA4)** | **PASS** | `t13d1517h2_8daaf6152771_cb7bf5808d99` |
| **DeviceAndBrowserInfo** | **PASS** | **`isBot = false`** |

Benchmark chạy trên binary đã giải nén, tổng kết **5/5 PASS**. Direct CLI smoke test trên Windows vẫn phụ thuộc sandbox token và ACL thư mục; xem [handoff.md](handoff.md) để biết trạng thái chi tiết.

---

## 🛠️ Hướng dẫn tích hợp Playwright (Python)

```python
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir="./profiles/test_profile",
            executable_path="D:/dichchrome/dist/browsermulti-152.0.7977.54-win64/chrome.exe",
            headless=False,
            args=[
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-blink-features=AutomationControlled",
                "--proxy-bypass-list=<-loopback>",
            ],
        )
        page = context.pages[0] if context.pages else await context.new_page()
        await page.goto("https://antcpt.com/score_detector/")
        await asyncio.sleep(10)
        await context.close()


asyncio.run(main())
```

## 🔄 Quy trình Tự động Đồng bộ & Biên dịch

Pipeline PowerShell tự động phát hiện Chrome Stable mới, fetch single tag, đồng bộ dependencies và biên dịch:

```powershell
powershell -ExecutionPolicy Bypass -File ./auto_sync_and_build.ps1
```

Pipeline có thể reset source Chromium và chạy build nặng. Kiểm tra thay đổi, branch và disk space trước khi chạy.

---

## 📦 GitHub Release

ZIP hiện tại:

```text
D:\dichchrome\dist\browsermulti-152.0.7977.54-win64.zip
```

Tạo release tại:

<https://github.com/DungDT293/antidetech-browsermulti/releases/new>

1. **Choose a tag:** `v152.0.7977.54`.
2. **Release title:** `BrowserMulti v152.0.7977.54 - Stable Standalone Release`.
3. **Description:** `Static non-component build, 5/5 anti-detect pass, Playwright/CDP compatible`.
4. Đính kèm `browsermulti-152.0.7977.54-win64.zip`.
5. Publish release.

## 🏷️ About & Topics đề xuất

**Description:** `High-performance anti-detect Chromium core with V8/Blink C++ patches for Playwright & CDP automation.`

**Topics:** `chromium`, `anti-detect`, `playwright`, `cdp`, `fingerprint-spoofing`, `stealth-browser`, `recaptcha-v3`, `cpp`.
