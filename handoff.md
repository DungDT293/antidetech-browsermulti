# BrowserMulti Handoff

## Current state — 2026-08-26

- Canonical metadata: `version.json`.
- `.65` static build completed with exit code `0`.
- `.65` package: `D:\dichchrome\dist\browsermulti-152.0.7977.65-win64.zip`.
- `.65` Playwright benchmark: `5/5 PASS`, exit code `0`.
- Detailed remediation plan: `docs\p0-p1-p2-remediation-plan.md`.

## Current state — 2026-08-25

- Stable source target: `152.0.7977.54`.
- Chromium source: `D:\dichchrome\src`.
- Chromium patch and V8 patch stay separate because `src\v8` is independent Git repo.
- Chromium patch applies with `git apply --3way --ignore-whitespace`.
- V8 patch applies in `src\v8`.
- V8 API compatibility fixes required for Chromium 152/V8 headers:
  - `third_party/blink/renderer/bindings/core/v8/v8_gc_for_context_dispose.cc`
  - `third_party/blink/renderer/core/workers/worker_thread.cc`
  - Replaced deprecated `ContextDisposedNotification(bool)` with `ContextDisposedNotification(v8::ContextDependants::...)`.
- `auto_sync_and_build.ps1` runs `gn.bat gen out\Default` before `autoninja` in dry-run and real paths. Packaging copies root manifest/XML files.
- `out\Default\args.gn`: `is_component_build = false`.
- Static build completed with exit code `0` after incremental retries.
  - `chrome.dll`: 444,531,712 bytes, 2026-08-25 15:49:51.
  - `chrome.exe`: 4,039,680 bytes, 2026-08-25 15:50:38.
  - Manifest: `152.0.7977.54.manifest`.
- Official ZIP:
  - `D:\dichchrome\dist\browsermulti-152.0.7977.54-win64.zip`
  - 252,757,503 bytes / 241.05 MB.

## Validation

- Build: **PASS**, exit code `0`.
- Manifest: **PASS**, exact `152.0.7977.54.manifest`; embedded `chrome.exe` references assembly `152.0.7977.54`.
- NTFS test ACL: granted AppContainer/Sandbox SIDs and `Users`/`Everyone` read-execute permissions recursively on `dist\test_extract`.
- Extracted headless direct smoke test: **not cleanly verified**. Earlier runs showed Windows sandbox `Access is denied (0x5)` in protected/ACL test locations; later runs could create profile but did not produce a reliable clean exit within timeout. Do not report standalone smoke PASS from this result alone.
- Playwright benchmark against extracted `D:\dichchrome\dist\test_extract\chrome.exe`: **PASS**, exit code `0`.
  - reCAPTCHA v3: `score=0.9` — PASS.
  - Cloudflare Turnstile: `resolved` — PASS.
  - Sannysoft: WebDriver missing, Chrome present, Plugins=5 — PASS.
  - TLS: `ja3=f403d19ea2a4ac5b88364c9ead063ad5`, `ja4=t13d1517h2_8daaf6152771_cb7bf5808d99`, HTTP/2 — PASS.
  - deviceandbrowserinfo: `isBot=false` — PASS.
  - Total: `5/5 PASS`.

## Lessons

1. Keep Chromium-root and V8 patches separate. `src\v8` is independent Git repo.
2. PowerShell native wrappers must use `$LASTEXITCODE`; Git stderr is not automatically failure.
3. Sort Chrome versions with `System.Version`, not strings.
4. Use single-tag shallow fetch to avoid `git fetch --tags` hangs and rate limits.
5. Use `gclient.bat` on Windows.
6. Google source sync can return HTTP 429; resume with lower concurrency.
7. Regenerate GN after changing Chromium version/build configuration.
8. `is_component_build = true` is developer layout, not portable distribution. It creates DLL/SxS conflicts.
9. `is_component_build = false` produces static portable candidate and avoids component DLL graph.
10. Do not infer success from Ninja dots. Require exit code, artifacts, extracted launch, and benchmark results.
11. Kill only BrowserMulti processes from `D:\dichchrome\src\out\Default`.
12. `crashpad_handler.exe` may be absent in this build output; treat optional unless target requires it.
13. Use `System.IO.Compression.ZipFile` and explicit literal cleanup paths; wildcard cleanup can be blocked or target wrong path.
14. Grant sandbox/AppContainer read-execute ACLs on deployment directories, but still validate on target machines.

## Pending release actions

1. Decide whether smoke-test requirement means strict `Start-Process` exit code `0`; current direct smoke result is unreliable while Playwright benchmark is 5/5 PASS.
2. Keep `test_extract` only for validation, then clean it after final evidence capture.
3. Update automation to enforce exact manifest and static build args before publishing.
4. Commit/push only after reviewing pending diffs. Current standalone smoke uncertainty means no release-verification commit yet.
