<p align="center">
  <h1 align="center">🛡️ BrowserMulti — Stealth Chromium Core</h1>
  <p align="center">
    <strong>High-performance Chromium core with native C++ patches for Playwright and CDP automation.</strong>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chromium-v152.0.7977.54-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chromium Version">
  <img src="https://img.shields.io/badge/Build-Static_x64-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Windows x64">
  <img src="https://img.shields.io/badge/reCAPTCHA_v3-0.9_PASS-success?style=for-the-badge&logo=google" alt="reCAPTCHA Score">
  <img src="https://img.shields.io/badge/Turnstile-RESOLVED-orange?style=for-the-badge&logo=cloudflare" alt="Cloudflare Turnstile">
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License">
</p>

<p align="center">
  <a href="https://pypi.org/project/browsermulti/"><img src="https://img.shields.io/pypi/v/browsermulti?color=blue&logo=pypi&logoColor=white" alt="PyPI Version"></a>
  <a href="https://pypi.org/project/browsermulti/"><img src="https://img.shields.io/pypi/dm/browsermulti?color=success&logo=pypi&logoColor=white" alt="PyPI Downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/DungDT293/antidetech-browsermulti" alt="License"></a>
</p>

> **Not a patched config. Not a JavaScript injection.** BrowserMulti applies fingerprint-related changes directly at Chromium C++ source level across Blink and V8. Validate behavior in your own authorized automation and testing environments.

## 🚀 Key Highlights

- **Native C++ engine patching:** Changes `navigator.webdriver`, plugin/mime-type defaults, User-Agent branding, Client Hints, and selected V8 Inspector behavior at source level.
- **Playwright and CDP integration:** Supports Playwright persistent contexts and Chrome DevTools Protocol workflows. Runtime behavior depends on Playwright version, launch flags, profile, and host policy.
- **Static non-component distribution:** `is_component_build = false` produces a static Chromium layout centered on `chrome.dll`, with Windows assembly manifest `152.0.7977.54.manifest`.
- **Network compatibility:** Uses Chromium's native SOCKS5, HTTP/HTTPS proxy, proxy-authentication, and TLS networking stack.
- **Automated upstream pipeline:** PowerShell pipeline detects Stable releases, fetches a single tag, syncs dependencies, applies separate Chromium/V8 patches, regenerates GN files, builds, benchmarks, and packages.

## 📊 Benchmark Results — v152.0.7977.54

Results from the extracted binary using the project benchmark suite:

| Detection or network test | Result | Detail |
| :--- | :---: | :--- |
| **Google reCAPTCHA v3** | **PASS** | Score: `0.9` |
| **Cloudflare Turnstile** | **PASS** | Resolved; token generated |
| **Sannysoft Detection Suite** | **PASS** | WebDriver missing, Chrome present, Plugins=5 |
| **TLS fingerprint** | **PASS** | JA4: `t13d1517h2_8daaf6152771_cb7bf5808d99`; HTTP/2 |
| **DeviceAndBrowserInfo** | **PASS** | `isBot=false` |

**Total: 5/5 benchmark checks passed.**

> Direct command-line smoke testing on this Windows host remains sensitive to sandbox token and ACL behavior. The Playwright benchmark passed against the extracted binary; see [handoff.md](handoff.md) for full validation details and limitations.

## 📦 Python SDK

Install editable package from this repository:

```bash
pip install -e .
```

PyPI page: <https://pypi.org/project/browsermulti/>.

```python
import asyncio
from browsermulti import launch_persistent_context


async def main():
    context = await launch_persistent_context(
        "./profiles/profile_01",
        headless=False,
        proxy={"server": "socks5://127.0.0.1:1080"},
        enable_smooth_input=True,
    )
    page = context.pages[0] if context.pages else await context.new_page()
    await page.goto("https://example.com")
    await context.close()


asyncio.run(main())
```

## 🛠️ Playwright Python Integration

Point `executable_path` at the BrowserMulti binary:

```python
import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as p:
        context = await p.chromium.launch_persistent_context(
            user_data_dir="./profiles/profile_01",
            executable_path=(
                "D:/dichchrome/dist/"
                "browsermulti-152.0.7977.54-win64/chrome.exe"
            ),
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


if __name__ == "__main__":
    asyncio.run(main())
```

Use only against systems and sites where you have authorization. Do not use BrowserMulti to bypass access controls, fraud controls, or third-party protections without permission.

## 🔄 Automated Sync and Build

```powershell
powershell -ExecutionPolicy Bypass -File ./auto_sync_and_build.ps1
```

The pipeline can reset the Chromium source tree with `git checkout .` and `git clean -df`, sync dependencies, and run a long build. Back up local source changes and confirm disk space before execution. The script uses:

- Version-aware Stable version selection.
- Single-tag shallow fetch.
- `gclient.bat` dependency sync.
- Independent Chromium-root and V8 patch application.
- GN regeneration before Ninja.
- Strict runtime packaging with manifest/XML files.

## 🧩 Repository Layout

| Path | Purpose |
| :--- | :--- |
| `BrowserMulti_chromium_v154.patch` | Chromium-root Blink, branding, UA, plugin, and search patches |
| `BrowserMulti_v8_v154.patch` | V8 Inspector patch |
| `auto_sync_and_build.ps1` | Stable sync, patch, build, benchmark, and package pipeline |
| `auto_benchmark.js` | Playwright benchmark suite |
| `handoff.md` | Architecture notes, failure history, validation status, and operational lessons |
| `current_version.txt` | Last recorded Stable version |

## 📦 Release Artifact

Current local artifact:

```text
D:\dichchrome\dist\browsermulti-152.0.7977.54-win64.zip
```

- Size: `252,757,503 bytes` (`241.05 MB`).
- Build: Static x64, `is_component_build = false`.
- Manifest: `152.0.7977.54.manifest`.

Create a GitHub release at:

<https://github.com/DungDT293/antidetech-browsermulti/releases/new>

- **Tag:** `v152.0.7977.54`
- **Title:** `BrowserMulti v152.0.7977.54 - Static Release`
- **Description:** `Static non-component Chromium build with native Blink/V8 patches; benchmark suite 5/5 PASS.`
- **Asset:** `browsermulti-152.0.7977.54-win64.zip`

## 🏷️ Suggested Repository Metadata

**Description:** High-performance Chromium core with native V8/Blink C++ patches for authorized Playwright and CDP testing.

**Topics:** `chromium`, `playwright`, `cdp`, `blink`, `v8`, `chromium-build`, `cpp`, `browser-automation`

## 📄 License

This project contains Chromium-derived source and patches. Review Chromium's license and notices in the source tree before redistribution. Project-specific scripts and documentation are MIT-licensed unless stated otherwise.
