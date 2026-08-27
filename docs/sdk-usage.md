# Python SDK Usage

## Current status

Package version: `152.0.7977.65`. SDK local Playwright test recorded exit code `0`. Project status remains **P1 implementation complete; selected validation gates pending**.

SDK behavior does not guarantee detection outcomes, proxy routing, or production readiness.

## Install

```powershell
py -3.11 -m pip install --upgrade browsermulti
```

When no executable path is configured, SDK downloads matching runtime from GitHub Releases into:

```text
~/.browsermulti/bin/152.0.7977.65/chrome.exe
```

Automatic download requires matching GitHub Release ZIP asset.

## Launch persistent context

```python
import asyncio
from browsermulti import launch_persistent_context


async def main():
    context = await launch_persistent_context(
        user_data_dir="./profiles/example",
        headless=True,
        locale="en-US",
        timezone_id="America/New_York",
        fingerprint_preset="windows11_intel_uhd",
        proxy_country="US",
        enable_smooth_input=True,
    )
    try:
        page = context.pages[0] if context.pages else await context.new_page()
        await page.goto("https://example.com")
    finally:
        await context.close()


asyncio.run(main())
```

`fingerprint_preset` is observational configuration only. It validates a known preset; it does not override browser hardware APIs. `proxy_country` enables local coherence warnings. A mismatch warns and does not block launch.

Default `viewport=None` preserves native window geometry. Pass an explicit viewport only when test requirements need one.

## Binary resolution

Resolution order: explicit `executable_path`, `BROWSERMULTI_EXECUTABLE`, cached/downloaded runtime, then source-checkout `dist/` fallback.

```powershell
$env:BROWSERMULTI_EXECUTABLE = 'C:\Browsers\BrowserMulti\chrome.exe'
```

## Proxy

Pass a Playwright proxy string or dictionary through `proxy`:

```python
proxy="socks5://127.0.0.1:1080"
```

Use only authorized infrastructure. Never place proxy credentials in source, reports, screenshots, or shell history.

## Validation

```powershell
python D:\dichchrome\tests\test_fingerprint_snapshot.py
node D:\dichchrome\test_webrtc_leak.js
```

For proxy WebRTC, set `TEST_PROXY` only in a temporary session and run `test_webrtc_proxy.js`. Current recorded proxy state is `INCONCLUSIVE_NO_PROXY`.

Smooth input helpers are UI automation conveniences, not security controls or proof of human behavior.
