# BrowserMulti Validation Report

## Current release status

- Release: `152.0.7977.65` static Windows x64.
- Project status: **P1 implementation complete; selected validation gates pending**.
- Evidence scope: recorded scenarios on build host. Results do not establish universal undetectability, anti-bot bypass, proxy routing, or production readiness.

## Current `.65` evidence

| Area | Result | Evidence boundary |
|---|---|---|
| Static build | **PASS** | Exit code `0` |
| Playwright benchmark | **PASS** | Recorded `5/5 PASS`: reCAPTCHA v3 `0.9`, Turnstile resolved, Sannysoft checks, TLS JA4/HTTP2, DeviceAndBrowserInfo `isBot=false`; scenario evidence only |
| SDK runtime | **PASS** | Local Playwright wrapper test exit code `0` |
| Viewport | **PASS** | `viewport=None` preserves native window geometry in launcher |
| Fingerprint snapshot | **PASS, host-relative** | `157` leaves; immediate baseline comparison `0 diff`; host hardware/display/permission changes can produce valid diffs |
| Coherence Engine | **IMPLEMENTED** | Three observational hardware presets; warning-only locale/timezone/proxy-country checks; no spoofing or GeoIP lookup |
| Direct WebRTC privacy | **VERIFIED PASS, single run** | ICE gathering complete; mDNS `.local`; no literal private/public IP in recorded run |
| Proxy WebRTC | **INCONCLUSIVE_NO_PROXY** | `TEST_PROXY` absent; no proxy route claim |
| Direct CLI smoke | **INCONCLUSIVE_TIMEOUT** | No exit code `0` or DOM output; full AppContainer path has drive ACL limitation |
| Profile lifecycle | **PENDING** | Aging, locking, migration, and production workflow remain unverified |

## P1 commands

```powershell
python D:\dichchrome\tests\test_fingerprint_snapshot.py
node D:\dichchrome\test_webrtc_leak.js
```

Proxy test requires authorized operator-provided infrastructure. Keep credentials out of command history and reports:

```powershell
$env:TEST_PROXY = Read-Host "Authorized proxy URL"
node D:\dichchrome\test_webrtc_proxy.js
Remove-Item Env:\TEST_PROXY -ErrorAction SilentlyContinue
```

`PASS_MDNS_OR_RELAY_NO_PUBLIC_IP` means no literal public address was observed in complete gathering. It does not prove every WebRTC packet used proxy transport. Relay evidence is required for stronger route attribution.

## Historical evidence

Older `.54` and v154 BrowserScan, Incolumitas, FingerprintJS, reCAPTCHA, and CDP research records remain in repository history and older artifacts. They describe their original binary, host, date, and network conditions. They must not be read as fresh `.65` validation.

## Reporting rules

1. Require real process exit codes and required output; never infer PASS from process creation or Ninja progress.
2. Separate direct CLI smoke, Playwright benchmark, direct WebRTC, and proxy WebRTC evidence.
3. Treat host-relative fingerprint diffs as review signals, not automatic defects.
4. Do not publish credentials, profiles, cookies, logs, private patches, or unreviewed reports.
