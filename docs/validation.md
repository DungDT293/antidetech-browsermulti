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

The watcher detected Chrome `152.0.7977.65` on 2026-08-26 and started source reset, cleanup, and single-tag fetch. Final build, benchmark, and release status must be appended after the pipeline exits.
