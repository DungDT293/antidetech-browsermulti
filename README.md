<p align="center">
  <h1 align="center">🛡️ BrowserMulti — Chromium Core & SDK</h1>
  <p align="center">
    <strong>Custom Chromium build with native C++ source patches and a Python Playwright SDK.</strong>
  </p>
</p>

<p align="center">
  <a href="https://pypi.org/project/browsermulti/"><img src="https://img.shields.io/pypi/v/browsermulti?color=blue&logo=pypi&logoColor=white" alt="PyPI Version"></a>
  <a href="https://pypi.org/project/browsermulti/"><img src="https://img.shields.io/pypi/dm/browsermulti?color=success&logo=pypi&logoColor=white" alt="PyPI Downloads"></a>
  <img src="https://img.shields.io/badge/Chromium-v152.0.7977.54-4285F4?logo=googlechrome&logoColor=white" alt="Chromium Version">
  <img src="https://img.shields.io/badge/Build-Static_x64-0078D4?logo=windows&logoColor=white" alt="Windows x64">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/DungDT293/antidetech-browsermulti?color=green" alt="License"></a>
</p>

> BrowserMulti is an experimental Chromium distribution for authorized browser automation, compatibility testing, and fingerprint research. Changes apply at Chromium C++ source level across Blink and V8; this project does not rely on JavaScript injection.

## 🚀 Key Highlights

- **Native C++ engine patches:** User-Agent and Client Hints branding, `navigator.webdriver`, plugin/mime-type defaults, and selected V8 Inspector behavior.
- **Playwright and CDP integration:** Persistent contexts, profiles, proxy configuration, and Chrome DevTools Protocol workflows.
- **Static non-component runtime:** `is_component_build = false` produces a static Chromium layout centered on `chrome.dll`, with Windows assembly manifest `152.0.7977.54.manifest`.
- **Smooth UI input helpers:** Optional cubic Bézier pointer interpolation and per-character typing delays for authorized UI testing. These helpers are not a security control and do not guarantee human-like behavior or bypass detection.
- **Native network stack:** Chromium SOCKS5, HTTP/HTTPS proxy, proxy authentication, and TLS networking support.
- **Automated upstream pipeline:** Stable version detection, single-tag fetch, dependency sync, separate Chromium/V8 patches, GN regeneration, build, benchmark, and packaging.

## 📊 Benchmark Results — v152.0.7977.54

Results from the project benchmark suite run against an extracted BrowserMulti binary. Results are environment- and profile-dependent; they are not guarantees for other sites, networks, or automation setups.

| Test | Result | Detail |
| :--- | :---: | :--- |
| **Google reCAPTCHA v3** | **PASS** | Score: `0.9` in recorded run |
| **Cloudflare Turnstile** | **PASS** | Resolved in recorded run |
| **Sannysoft Detection Suite** | **PASS** | WebDriver missing, Chrome present, Plugins=5 |
| **TLS fingerprint** | **PASS** | JA4: `t13d1517h2_8daaf6152771_cb7bf5808d99`; HTTP/2 |
| **DeviceAndBrowserInfo** | **PASS** | `isBot=false` in recorded run |

**Recorded total: 5/5 benchmark checks passed.**

> Direct CLI smoke testing on the development Windows host remained sensitive to sandbox token and ACL behavior. See [handoff.md](handoff.md) for evidence, limitations, and troubleshooting notes.

## 📦 Installation

Install SDK from PyPI:

```bash
pip install browsermulti
```

Or install the local checkout:

```bash
git clone https://github.com/DungDT293/antidetech-browsermulti.git
cd antidetech-browsermulti
pip install -e .
```

## 💡 Quick Start — Python Playwright

```python
import asyncio
from browsermulti import launch_persistent_context


async def main():
    context = await launch_persistent_context(
        user_data_dir="./profiles/profile_01",
        headless=False,
        locale="en-US",
        timezone_id="America/New_York",
        enable_smooth_input=True,
        # proxy="socks5://127.0.0.1:1080",
    )
    try:
        page = context.pages[0] if context.pages else await context.new_page()
        await page.goto("https://example.com")
        if hasattr(page, "input_controller"):
            await page.input_controller.move_to(400, 300)
    finally:
        await context.close()


if __name__ == "__main__":
    asyncio.run(main())
```

Use only against sites and systems where you have authorization. Do not use BrowserMulti to bypass access controls, fraud controls, CAPTCHAs, WAFs, or third-party protections without permission.

## 🔄 Feature Comparison

| Capability | Stock Playwright | BrowserMulti Core |
| :--- | :---: | :---: |
| Chromium source build | No | Yes |
| Blink/V8 source patches | No | Yes |
| Static x64 build | Runtime-dependent | `is_component_build = false` |
| Python SDK | Playwright package | `browsermulti` package |
| Persistent context | Yes | Yes |
| Smooth UI input helper | No | Optional |
| Upstream synchronization | User-managed | PowerShell pipeline |

## 🧩 Repository Structure

| Path | Purpose |
| :--- | :--- |
| `browsermulti/` | Python SDK with launcher and UI input helpers |
| `BrowserMulti_chromium_v154.patch` | Chromium-root Blink, branding, UA, plugin, and search patches |
| `BrowserMulti_v8_v154.patch` | V8 Inspector patch |
| `auto_sync_and_build.ps1` | Stable sync, patch, build, benchmark, and package pipeline |
| `auto_benchmark.js` | Playwright benchmark suite |
| `handoff.md` | Architecture notes, failure history, validation status, and lessons |
| `current_version.txt` | Recorded Stable version |
| `setup.py` | Python package metadata |

## 🔄 Upstream Synchronization Pipeline

When a new Chrome Stable version is available, review local changes and disk space before running. The pipeline can reset the Chromium checkout with `git checkout .` and `git clean -df`.

```powershell
powershell -ExecutionPolicy Bypass -File ./auto_sync_and_build.ps1
```

Pipeline stages:

1. Select newest valid Stable version.
2. Fetch one version tag.
3. Sync Chromium dependencies with `gclient.bat`.
4. Apply Chromium-root and V8 patches independently.
5. Regenerate GN files.
6. Build with Ninja.
7. Run benchmark suite.
8. Package runtime files and manifest/XML identity files.

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
- **Asset:** `browsermulti-152.0.7977.54-win64.zip`

## 🏷️ Repository Metadata

**Description:** Custom Chromium core with native Blink/V8 patches and a Python Playwright SDK for authorized automation testing.

**Topics:** `chromium`, `playwright`, `cdp`, `blink`, `v8`, `chromium-build`, `cpp`, `browser-automation`

## 📄 License and Notices

This project contains Chromium-derived source and patches. Review Chromium's license, notices, and redistribution requirements before distributing binaries. Project-specific scripts and documentation are MIT-licensed unless stated otherwise.
