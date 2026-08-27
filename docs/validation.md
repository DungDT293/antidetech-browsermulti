# Validation

## Current status

`P1 implementation complete; selected validation gates pending.` Current canonical release is `152.0.7977.65`.

## Historical .54 benchmark

The extracted `.54` binary recorded 5/5 benchmark passes:

- reCAPTCHA v3: `0.9`.
- Cloudflare Turnstile: resolved.
- Sannysoft: WebDriver missing, Chrome present, Plugins=5.
- TLS JA4: `t13d1517h2_8daaf6152771_cb7bf5808d99`.
- DeviceAndBrowserInfo: `isBot=false`.

These are recorded test results, not universal guarantees. Results depend on host, profile, network, Playwright version, flags, and site behavior.

## Smoke test policy

Never label smoke test PASS from process creation alone. Capture:

1. Extracted binary path.
2. Exact arguments.
3. Process exit code or timeout.
4. stderr and Windows Application/SideBySide events.
5. Sandbox and ACL state.

A Playwright benchmark PASS does not erase a failed or inconclusive direct CLI smoke test; report both separately.

## Current update

The watcher detected Chrome `152.0.7977.65` on 2026-08-26. The `.65` build and benchmark completed; see the recorded section below. P1 implementation is complete; selected validation gates remain pending.

## Recorded .65 benchmark

The static `.65` build completed with exit code `0`. Playwright benchmark completed with exit code `0` and recorded 5/5 PASS:

- reCAPTCHA v3: `0.9`.
- Cloudflare Turnstile: resolved.
- Sannysoft: WebDriver missing, Chrome present, Plugins=5.
- TLS JA4: `t13d1517h2_8daaf6152771_cb7bf5808d99`, HTTP/2.
- DeviceAndBrowserInfo: `isBot=false`.

The `.65` runtime ZIP is `D:\dichchrome\dist\browsermulti-152.0.7977.65-win64.zip`.

## P0 validation update

- WebRTC direct ICE run: `VERIFIED PASS` for completed gathering with mDNS host candidates and no literal private/public IP addresses. Proxy mode remains untested.
- Direct extracted CLI smoke matrix: no-sandbox mode and token-sandbox mode both `INCONCLUSIVE_TIMEOUT` after 30 seconds; no exit code `0` or DOM output captured. Full AppContainer mode remains blocked by prior `Access is denied (0x5)` / `STATUS_BREAKPOINT (0x80000003)`. Cleanup completed. This is not a release PASS.

## P1 fingerprint validation

- Coherence engine: three observational hardware presets; locale/timezone/proxy-country checks warn on known mismatches and never spoof browser-exposed hardware values.
- Fingerprint snapshot: `.65` local data-page capture contains `157` leaves. Baseline was created, then immediate regression comparison returned `PASS` with `diff_count=0`.
- Direct WebRTC: `VERIFIED PASS`; gathering completed with mDNS host candidates and no literal private/public IP addresses.
- Proxy WebRTC: `INCONCLUSIVE_NO_PROXY`; `TEST_PROXY` was not configured in this run. No proxy routing claim is valid until an authorized proxy test runs. HTTP proxying alone cannot prove UDP ICE routing.

Snapshot command:

```powershell
python D:\dichchrome\tests\test_fingerprint_snapshot.py
```

Proxy command, only with authorized operator configuration:

```powershell
$env:TEST_PROXY = 'http://proxy.example:8080'
node D:\dichchrome\test_webrtc_proxy.js
```

Reports omit proxy credentials. Results are scenario evidence, not universal anti-bot or privacy guarantees.
