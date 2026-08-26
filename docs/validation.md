# Validation

## Recorded .54 benchmark

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

The watcher detected Chrome `152.0.7977.65` on 2026-08-26. The `.65` build and benchmark completed; see the recorded section below.

## Recorded .65 benchmark

The static `.65` build completed with exit code `0`. Playwright benchmark completed with exit code `0` and recorded 5/5 PASS:

- reCAPTCHA v3: `0.9`.
- Cloudflare Turnstile: resolved.
- Sannysoft: WebDriver missing, Chrome present, Plugins=5.
- TLS JA4: `t13d1517h2_8daaf6152771_cb7bf5808d99`, HTTP/2.
- DeviceAndBrowserInfo: `isBot=false`.

The `.65` runtime ZIP is `D:\dichchrome\dist\browsermulti-152.0.7977.65-win64.zip`. Direct extracted CLI smoke remains a separate gate and is not marked PASS here without a clean exit-code result.
