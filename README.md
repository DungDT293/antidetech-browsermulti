<p align="center">
  <h1 align="center">🛡️ BrowserMulti — Stealth Chromium Core</h1>
  <p align="center">
    <strong>High-Performance Anti-Detect Chromium Core with Native C++ Patches for Playwright & CDP Automation.</strong>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chromium-v152.0.7977.54-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chromium Version">
  <img src="https://img.shields.io/badge/Build-Static_x64-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Windows x64">
  <img src="https://img.shields.io/badge/reCAPTCHA_v3-0.9_PASS-success?style=for-the-badge&logo=google" alt="reCAPTCHA Score">
  <img src="https://img.shields.io/badge/Turnstile-RESOLVED-orange?style=for-the-badge&logo=cloudflare" alt="Cloudflare Turnstile">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

<br>

<table><tr><td>
<strong>Not a patched config. Not a JS injection.</strong> BrowserMulti is a custom standalone Chromium binary with anti-fingerprint mitigations applied directly at the <strong>C++ source level (Blink DOM & V8 Engine)</strong>. Bot detection systems treat it as a legitimate organic browser — because under the hood, it <em>is</em> a real browser.
</td></tr></table>

<br>

## 🚀 Key Highlights & Architectural Strengths

* **Native C++ Engine Patching:** Loại bỏ triệt để cờ `navigator.webdriver`, ẩn runtime getter traps của V8 Inspector và chuẩn hóa Plugin/MimeType trực tiếp trong mã nguồn C++ mà không cần chèn các đoạn script JavaScript dễ bị WAF phát hiện.
* **100% Playwright & CDP Compatible:** Hoạt động nguyên bản với `launch_persistent_context`, hỗ trợ nạp Chrome Extension (Manifest V3), cookie persistence SQLite qua Windows DPAPI và tương thích tuyệt đối với toàn bộ API automation hiện có.
* **Static Non-Component Distribution:** Toàn bộ engine được biên dịch tĩnh vào một khối `chrome.dll` duy nhất (444 MB) đi kèm Assembly Manifest (`152.0.7977.54.manifest`), giải quyết triệt để lỗi Windows Side-by-Side (SxS) và sẵn sàng chạy độc lập (Portable Runtime).
* **Enterprise Network Stack:** Tích hợp SOCKS5 phân giải DNS từ xa, hỗ trợ Proxy Authentication và bảo toàn nguyên vẹn dấu vân tay mạng TLS JA4 (`t13d1517h2_8daaf6152771_cb7bf5808d99`).
* **Automated Upstream Pipeline:** Bộ kịch bản PowerShell tự động phát hiện phiên bản Chrome Stable từ Google API, kéo single tag và ốp bản vá đa kho (Dual-repo patching) định kỳ.

---

## 📊 Benchmark & Verification Results (v152.0.7977.54)

Toàn bộ các bài kiểm thử được xác thực thực tế trên bản phân phối nhị phân độc lập (Extracted Standalone Binary):

| Detection Engine / Security Suite | Stock Playwright | BrowserMulti Core | Technical Assessment |
| :--- | :---: | :---: | :--- |
| **Google reCAPTCHA v3** | `0.1` (Bot) | **`0.9` (Human)** | Server-side verified (Điểm số tối đa) |
| **Cloudflare Turnstile** | FAIL / Timeout | **RESOLVED** | Vượt qua bài kiểm tra tương tác |
| **Sannysoft Bot Test** | 4 Fails | **ALL PASS** | WebDriver missing, Chrome present, Plugins=5 |
| **deviceandbrowserinfo.com** | `isBot: true` | **`isBot: false`** | 0 true flags / Normal User Agent |
| **TLS Fingerprint (JA4)** | Mismatched | **MATCHED** | `t13d1517h2_8daaf6152771_cb7bf5808d99` |
| **`window.chrome` & Runtime** | Leaked / Null | **`object`** | Khớp hoàn toàn với Google Chrome chuẩn |
| **CDP Automation Signals** | Detected | **Undetected** | `isAutomatedWithCDP: false` |

---

## 🛠️ Quick Start & Integration (Playwright Python)

Bạn không cần thay đổi cấu trúc automation hiện tại. Chỉ cần trỏ `executable_path` vào binary BrowserMulti:

```python
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        # Khởi chạy Persistent Context với lõi BrowserMulti
        context = await p.chromium.launch_persistent_context(
            user_data_dir="./profiles/profile_01",
            executable_path="D:/dichchrome/dist/browsermulti-152.0.7977.54-win64/chrome.exe",
            headless=False,
            args=[
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-blink-features=AutomationControlled",
                "--proxy-bypass-list=<-loopback>" # Chống nghẽn CDP qua proxy
            ],
            # Hỗ trợ Proxy HTTP / SOCKS5 chuẩn
            # proxy={"server": "socks5://127.0.0.1:1080", "username": "user", "password": "pass"}
        )
        
        page = context.pages[0] if context.pages else await context.new_page()
        await page.goto("[https://antcpt.com/score_detector/](https://antcpt.com/score_detector/)")
        await asyncio.sleep(10)
        await context.close()

if __name__ == "__main__":
    asyncio.run(main())
