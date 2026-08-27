# SPEC — BrowserMulti validation matrix

> `v154 Research Phase (Historical POC)` contains historical notes only. `v152.0.7977.65 (Canonical Stable Distribution)` is current release identity.
> Last current update: 2026-08-27.

## Current status

**P1 implementation complete; selected validation gates pending.**

- Release: `152.0.7977.65`, static Windows x64.
- Build: PASS, exit code `0`.
- Benchmark: recorded `5/5 PASS`; scenario evidence only.
- SDK runtime: PASS, local Playwright test exit code `0`.
- Viewport: PASS; launcher default `viewport=None`.
- Fingerprint snapshot: host-relative baseline, `157` leaves, immediate compare `PASS`, `0 diff`.
- Coherence Engine: IMPLEMENTED; three observational hardware presets and warning-only geo-profile checks.
- Direct WebRTC: single-run `VERIFIED PASS`; mDNS `.local`, no literal private/public IP observed.
- Proxy WebRTC: `INCONCLUSIVE_NO_PROXY`; no authorized `TEST_PROXY` in recorded run.
- Direct CLI smoke: `INCONCLUSIVE_TIMEOUT`; no exit code `0` or DOM output.
- Profile lifecycle and production readiness: pending verification.

PASS states apply only to recorded evidence and environment. They do not prove universal undetectability, anti-bot bypass, proxy routing, or privacy.

## Evidence classes

- **A** — deterministic automated regression.
- **B** — reproducible external test.
- **C** — single-run observation.
- **D** — architectural assumption.

## Tầng 1 — Network & Transport

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| TLS JA3/JA4/JA3N | ✅ (B) | Recorded JA4 `t13d1517h2_8daaf6152771_cb7bf5808d99` |
| GREASE | ✅ (D) | Native Chromium behavior |
| ALPN h2/http1.1 | ✅ (B) | Recorded HTTP/2 |
| HTTP/2 settings | ✅ (B) | Recorded external TLS endpoint |
| TCP/IP p0f | ✅ (D) | Host Windows stack; environment dependent |
| WebRTC direct | ✅ (C) | Complete ICE; mDNS host candidates; no literal private/public IP |
| WebRTC through proxy | ⚠️ INCONCLUSIVE_NO_PROXY (A) | Requires authorized `TEST_PROXY`; route not tested |
| Direct CLI smoke | ⚠️ INCONCLUSIVE_TIMEOUT (C) | No exit code `0` or DOM output |
| Full AppContainer smoke | ⚠️ BLOCKED_BY_OS_ACL_ON_DRIVE_D (C) | Prior `Access is denied (0x5)` and `STATUS_BREAKPOINT (0x80000003)` |
| ECH / DoH | ⚠️ | Requires explicit stable-Chrome policy review |

## Tầng 2 — V8 / Inspector

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| CDP Error.stack behavior | ✅ (B) | Historical/current scenario evidence |
| CDP console getter path | ✅ (B) | Runtime-only preview path changed by private V8 patch |
| CDP per-call timing | ✅ (B) | Historical measurements; recheck after each Chromium update |
| Function.prototype.toString | ✅ (B) | Native source form recorded |
| Math/JIT | ✅ (D) | Native V8 |
| `performance.now()` clamp | ✅ (B) | Recorded 100µs behavior |
| `performance.memory` | ✅ (D) | Native API behavior |

## Tầng 3 — Blink / DOM identity

| Hạng mục | Trạng thái | Kết quả |
|---|---|---|
| `navigator.webdriver` | ✅ (B) | `false`; native getter |
| Automation marker globals | ✅ (D) | No JS injection layer |
| `window.chrome` descriptor | ✅ (B) | Writable/enumerable/configurable |
| `window.chrome.runtime` | ⚠️ (C) | `undefined` in recorded context; builtin extension not present |
| Plugins and MIME types | ✅ (B) | Plugins length `5`; native prototypes |
| Client Hints | ✅ (B) | Brand/version consistency recorded |
| WorkerNavigator | ✅ (B) | Language/timezone/hardware consistency recorded |
| Permissions | ✅ (B) | Query and Notification state synchronized in recorded scenario |

## Tầng 4 — Hardware and subsystems

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| WebGL vendor/renderer | ✅ (C) | Real ANGLE/Direct3D host output; host-relative |
| WebGL limits/extensions | ✅ (C) | Host-relative |
| Canvas | ✅ (D) | Native Skia/DirectWrite; no noise injection |
| AudioContext | ✅ (C) | Native host output; host-relative |
| Font metrics | ✅ (D) | Windows fonts |
| Screen geometry | ✅ (C) | `viewport=None`; native geometry on build host |
| Devices/touch | ✅ (C) | Host-dependent |

## Tầng 5 — Behavioral helpers

Smooth input is a UI automation convenience, not a security control or proof of human behavior.

| Hạng mục | Trạng thái | Phạm vi |
|---|---|---|
| Mouse path and click helper | ✅ (C) | Recorded local trajectory |
| Keyboard timing helper | ✅ (C) | Recorded local dwell/flight ranges |
| Scroll helper | ✅ (C) | Recorded local decay behavior |
| Visibility/focus dynamics | ➖ (D) | Operator/application behavior |

Historical external scenarios recorded reCAPTCHA v3 `0.9`, Turnstile resolved, BrowserScan Normal, Incolumitas `33/33`, and FingerprintJS Pro signals Not Detected. These remain scenario evidence tied to original host, network, profile, and date.

## P1 — Fingerprint coherence and regression

| Hạng mục | Trạng thái | Bằng chứng |
|---|---|---|
| Hardware presets | ✅ (D) | `browsermulti/fingerprint.py`: Windows 11 Intel UHD, Windows 11 NVIDIA RTX, Windows 10 AMD Radeon; observational only |
| Locale/timezone/proxy-country coherence | ✅ (A) | Local warning validator; unknown country remains inconclusive; launch not blocked |
| Fingerprint regression snapshot | ✅ (A) | `fingerprint_snapshot_152.json`: `157` leaves, `.65` compare `0 diff` on build host |
| Proxy WebRTC | ⚠️ (A) | `INCONCLUSIVE_NO_PROXY`; no proxy configured |

## Tầng 6 — IP reputation

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Residential/mobile IP | ➖ (D) | Operator/proxy concern, not browser code |
| GeoIP ↔ locale/timezone | ⚠️ (A) | Coherence warnings only; no GeoIP lookup |
| Proxy/header exposure | ⚠️ | Validate per deployment and authorized network |

## Tầng 7 — Profile lifecycle

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Persistent storage | ✅ (C) | Playwright persistent context |
| History/bookmark aging | ⚠️ (D) | Operator-managed; not automatically verified |
| Profile lock/migration/backup/restore | ⚠️ | Pending implementation/verification |
| Release lifecycle consistency | ✅ (A) | `.65` canonical; v154 notes historical |

## Golden rule

Không inject JavaScript để spoof fingerprint. Fingerprint values should come from the real Chromium build and host hardware. Source patches address specific browser-disclosed behavior only. Current release claim remains: **P1 implementation complete; selected validation gates pending**.
