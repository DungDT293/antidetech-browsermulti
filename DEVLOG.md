# DEVLOG — BrowserMulti Core

> Nhật ký nghiên cứu và kiến trúc. Kết quả kiểm định là bằng chứng theo kịch bản, không phải cam kết chống phát hiện phổ quát.
>
> Current release: `152.0.7977.65`.
> Current status: **P1 implementation complete; selected validation gates pending**.
> Last updated: 2026-08-27.

## Current `.65` state

| Hạng mục | Trạng thái | Phạm vi |
|---|---|---|
| Static build | PASS, exit code `0` | Build host, static Windows x64 |
| Playwright benchmark | Recorded `5/5 PASS` | Scenario evidence only |
| SDK runtime | PASS, exit code `0` | Local Playwright wrapper test |
| Viewport | PASS | `viewport=None` preserves native geometry |
| Fingerprint snapshot | PASS, host-relative | `157` leaves, immediate compare `0 diff` |
| Coherence Engine | IMPLEMENTED | Three observational presets; warning-only checks |
| Direct WebRTC | VERIFIED PASS, single run | Complete gathering; mDNS `.local`; no literal IP |
| Proxy WebRTC | `INCONCLUSIVE_NO_PROXY` | `TEST_PROXY` absent in recorded run |
| Direct CLI smoke | `INCONCLUSIVE_TIMEOUT` | No exit code `0` or DOM output |
| Profile lifecycle | PENDING | Locking, migration, aging, backup/restore unverified |

P1 tooling:

- `browsermulti/fingerprint.py`
- `test_webrtc_proxy.js`
- `tests/test_fingerprint_snapshot.py`
- `fingerprint_snapshot_152.json`

### Evidence boundaries

- Snapshot values depend on host hardware, display geometry, permissions, and runtime state. A different host can produce valid differences.
- Hardware presets describe expected categories only. They do not spoof WebGL, audio, canvas, screen, OS, or navigator values.
- Coherence checks perform local locale/timezone/proxy-country policy checks only. They do not resolve GeoIP or inspect proxy credentials.
- Direct WebRTC PASS covers one direct run. It does not verify proxy routing or every network configuration.
- Benchmark PASS does not override inconclusive direct CLI smoke.
- Do not claim universal undetectability, anti-bot bypass, proxy routing, or production readiness from these results.

---

## Historical research record

Sections below preserve earlier v154/v152 experiments. They are historical unless current `.65` evidence explicitly confirms them.

### Historical source and patch boundaries

Chromium root and V8 were separate Git repositories. Private patches remained outside public Git:

- Chromium root patch: `BrowserMulti_chromium_v152.patch`
- V8 patch: `BrowserMulti_v8_v152.patch`

Historical source-level work covered User-Agent/Client Hints branding, `navigator.webdriver`, default plugins, search migration compatibility, BrowserMulti branding, and selected V8 Inspector behavior. It used native C++ changes, not JavaScript fingerprint injection.

### Historical CDP investigation

The investigation found two Runtime Inspector vectors:

1. Runtime console preview could read a user getter such as an `Error.stack` getter.
2. Runtime-enabled console/Error calls showed systematic per-call latency.

The V8 patch removed Runtime-only console reporting and the eager stack-depth setup associated with this research. Accepted compatibility effect: Playwright/Puppeteer console event behavior may differ because those events depend on Runtime console notifications; DevTools Console uses its separate path.

Historical measurements:

| Operation | No CDP | Runtime enabled before patch | After patch |
|---|---:|---:|---:|
| `console.debug(obj)` | ~40µs | ~150µs | ~40–66µs |
| `console.log(str)` | ~35µs | ~133µs | ~50–67µs |
| `new Error()` | ~6.4µs | ~17µs | ~7–10µs |

These measurements describe historical research binaries and do not establish universal detection resistance.

### Historical Playwright geometry lesson

`Emulation.setDeviceMetricsOverride` can produce automation-specific geometry. The launcher now defaults `viewport=None` to preserve native geometry. This is current SDK behavior, not a promise that every host has identical dimensions.

### Historical pitfalls

- `data:` pages are not trustworthy origins for all Client Hints behavior; use local trustworthy origins when that specific behavior needs testing.
- `gclient.bat` is the Windows command.
- Version strings require `[System.Version]` sorting.
- GN must be regenerated after version/config changes.
- Static `is_component_build = false` avoids common component DLL/SxS conflicts.
- Ninja progress dots do not prove build success; require native exit code and artifacts.
- Direct CLI and Playwright launch can have different sandbox/lifecycle behavior.
- WebRTC mDNS names are not literal IP addresses; do not classify them as public IPs.

## Validation commands

```powershell
python D:\dichchrome\tests\test_fingerprint_snapshot.py
node D:\dichchrome\test_webrtc_leak.js
```

Authorized proxy test only:

```powershell
$env:TEST_PROXY = Read-Host "Authorized proxy URL"
node D:\dichchrome\test_webrtc_proxy.js
Remove-Item Env:\TEST_PROXY -ErrorAction SilentlyContinue
```

Do not put credentials in command history or reports.

## Next work

- Run proxy WebRTC with authorized infrastructure and review route evidence.
- Resolve or document direct CLI smoke timeout on target Windows environments.
- Add profile locking, migration, aging, backup, and restore lifecycle.
- Add release provenance and CI regression gates.
