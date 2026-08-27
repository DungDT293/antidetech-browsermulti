<p align="center">
  <h1 align="center">BrowserMulti — Chromium Core & SDK</h1>
  <p align="center"><strong>Chromium source patches with Python Playwright runtime delivery.</strong></p>
</p>

<p align="center">
  <a href="https://pypi.org/project/browsermulti/"><img src="https://img.shields.io/pypi/v/browsermulti?color=blue&logo=pypi&logoColor=white" alt="PyPI Version"></a>
  <a href="https://github.com/DungDT293/antidetech-browsermulti/releases/tag/v152.0.7977.65"><img src="https://img.shields.io/badge/Chromium-v152.0.7977.65-4285F4?logo=googlechrome&logoColor=white" alt="Chromium Version"></a>
  <img src="https://img.shields.io/badge/Build-Static_x64-0078D4?logo=windows&logoColor=white" alt="Windows x64">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/DungDT293/antidetech-browsermulti?color=green" alt="License"></a>
</p>

BrowserMulti is an experimental Chromium distribution for authorized browser automation, compatibility testing, and fingerprint research. Native Chromium/Blink/V8 changes live in private patch files; this public repository contains the SDK, build tooling, documentation, and release metadata.

Results below are recorded test scenarios, not universal guarantees. Do not use BrowserMulti to bypass access controls, fraud controls, CAPTCHAs, WAFs, or third-party protections without authorization.

## Release labels

- `v154 Research Phase (Historical POC)`: historical CDP/fingerprint research notes only.
- `v152.0.7977.65 (Canonical Stable Distribution)`: current static Windows x64 build and SDK.

## Current project status

`P1 implementation complete; selected validation gates pending.`

| Gate | Status |
|---|---|
| Core `.65` static build | PASS, exit code `0` |
| SDK Playwright runtime | PASS, local exit code `0` |
| Fingerprint snapshot | PASS on build host, `157` leaves, `0` diff |
| Coherence Engine | IMPLEMENTED, warning-only, no spoofing |
| Direct WebRTC privacy | VERIFIED PASS, single run, mDNS candidates |
| WebRTC through proxy | `INCONCLUSIVE_NO_PROXY` |
| Direct CLI smoke | `INCONCLUSIVE_TIMEOUT` |
| Profile lifecycle / production readiness | Pending verification |

## Current release

| Item | Value |
|---|---|
| BrowserMulti / Chromium | `152.0.7977.65` |
| Platform | Windows x64 |
| Build layout | Static, `is_component_build = false` |
| Git tag | [`v152.0.7977.65`](https://github.com/DungDT293/antidetech-browsermulti/releases/tag/v152.0.7977.65) |
| Binary asset | `browsermulti-152.0.7977.65-win64.zip` |
| Version source | [`version.json`](version.json) |

## Recorded validation

The `.65` static build completed with exit code `0`. Playwright benchmark completed with exit code `0`: **5/5 PASS**.

| Scenario | Recorded result |
|---|---|
| reCAPTCHA v3 | `0.9` |
| Cloudflare Turnstile | Resolved |
| Sannysoft | WebDriver missing, Chrome present, Plugins=5 |
| TLS | JA4 `t13d1517h2_8daaf6152771_cb7bf5808d99`, HTTP/2 |
| DeviceAndBrowserInfo | `isBot=false` |

Evidence: [`docs/validation-152.0.7977.65.json`](docs/validation-152.0.7977.65.json) and [`docs/validation.md`](docs/validation.md). WebRTC direct run: VERIFIED PASS for no literal private/public IP candidates; proxy mode remains separate. Direct extracted CLI smoke matrix remains INCONCLUSIVE: no-sandbox and token-sandbox modes timed out without exit code `0`; not release PASS.

## P1 fingerprint validation

- `browsermulti/fingerprint.py` provides three observational hardware presets and local locale/timezone/proxy-country coherence warnings. Presets do not spoof WebGL, audio, screen, OS, or navigator values.
- `tests/test_fingerprint_snapshot.py` captures 157 stable browser identity leaves from local data HTML and compares them with [`fingerprint_snapshot_152.json`](fingerprint_snapshot_152.json). Current `.65` run: `BASELINE_CREATED`, then regression compare `PASS`, `field_count=157`, `diff_count=0`.
- `test_webrtc_proxy.js` requires an operator-supplied authorized `TEST_PROXY`. Without one, current result is `INCONCLUSIVE_NO_PROXY`; no proxy route claim is made. Proxy mode never proves universal WebRTC routing.

Run snapshot regression:

```powershell
python .\tests\test_fingerprint_snapshot.py
```

Run authorized proxy WebRTC validation:

```powershell
$env:TEST_PROXY = 'http://proxy.example:8080'
node .\test_webrtc_proxy.js
```

Do not place proxy credentials in reports or command history.

## Install SDK

```powershell
py -3.11 -m pip install --upgrade browsermulti
```

SDK package includes version identity and can fetch the matching runtime from GitHub Releases when no local binary exists. Cache location:

```text
~/.browsermulti/bin/152.0.7977.65/chrome.exe
```

Automatic download requires the release asset to exist at:

```text
https://github.com/DungDT293/antidetech-browsermulti/releases/download/v152.0.7977.65/browsermulti-152.0.7977.65-win64.zip
```

## Binary resolution

Launcher checks paths in this order:

1. `executable_path` argument.
2. `BROWSERMULTI_EXECUTABLE` environment variable.
3. `~/.browsermulti/bin/<version>/chrome.exe` cache/download path.
4. `dist/browsermulti-<version>-win64/chrome.exe` in a source/build checkout.

Example override:

```powershell
$env:BROWSERMULTI_EXECUTABLE = 'C:\Browsers\BrowserMulti\chrome.exe'
```

## Quick start

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
    )
    try:
        page = context.pages[0] if context.pages else await context.new_page()
        await page.goto("https://example.com")
    finally:
        await context.close()


asyncio.run(main())
```

Smooth input helpers are optional UI automation conveniences. They are not security controls and do not guarantee human-like behavior or detection outcomes.

## Build and release

Chromium source and V8 are separate Git repositories. Private patch files stay outside public Git at the configured private patch directory. The pipeline performs dependency sync, independent patch application, GN regeneration, static Ninja build, benchmark, and strict runtime packaging.

```powershell
powershell -ExecutionPolicy Bypass -File .\auto_sync_and_build.ps1
```

The pipeline can reset Chromium source state. Back up local work and review the script before running it.

Release checklist:

1. Verify `version.json`, `current_version.txt`, package version, manifest, and artifact name match.
2. Build and capture exit code `0`.
3. Extract ZIP and verify required runtime files.
4. Run SDK and benchmark checks.
5. Capture smoke-test evidence separately; do not infer PASS from process creation.
6. Upload SDK wheels to PyPI using a fresh token through environment variables.
7. Create the GitHub Release for the matching tag and attach the ZIP asset.

## Repository layout

| Path | Purpose |
|---|---|
| `browsermulti/` | Python SDK, downloader, launcher, input helper |
| `version.json` | Canonical release metadata |
| `current_version.txt` | Current release marker |
| `setup.py`, `MANIFEST.in` | Python package build metadata |
| `auto_sync_and_build.ps1` | Stable sync, patch, build, benchmark, package pipeline |
| `auto_benchmark.js` | Playwright benchmark suite |
| `docs/` | Architecture, build, SDK, security, operations, and validation docs |
| `handoff.md` | Build history, evidence, and known limitations |

Private patches, Chromium checkout/build output, profiles, reports, logs, and package artifacts are intentionally not part of public Git.

## Documentation

- [Architecture](docs/architecture.md)
- [Build and release](docs/build-and-release.md)
- [SDK usage](docs/sdk-usage.md)
- [Security and IP hygiene](docs/security-and-ip.md)
- [Operations](docs/operations.md)
- [Validation](docs/validation.md)
- [P0/P1/P2 remediation plan](docs/p0-p1-p2-remediation-plan.md)

## License and notices

Chromium-derived code and binaries carry upstream license, notice, and component-license obligations. Review Chromium `LICENSE`, `NOTICE`, and component licenses before redistribution. Project-specific scripts and docs use the repository's project license unless stated otherwise.
