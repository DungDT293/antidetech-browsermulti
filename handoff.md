# BrowserMulti Handoff

## Current state — 2026-08-27

**Status: P1 implementation complete; selected validation gates pending.**

- Canonical metadata: `version.json` → `152.0.7977.65`.
- Static Windows x64 build completed with exit code `0`.
- Recorded Playwright benchmark: `5/5 PASS`, exit code `0`.
- SDK local Playwright test: exit code `0`.
- P1 files: `browsermulti/fingerprint.py`, `test_webrtc_proxy.js`, `tests/test_fingerprint_snapshot.py`, `fingerprint_snapshot_152.json`.
- Fingerprint snapshot: host-relative baseline, `157` leaves, immediate comparison `PASS`, `0 diff`.
- Coherence Engine: observational hardware presets and warning-only locale/timezone/proxy-country checks. No hardware spoofing or GeoIP resolution.
- Direct WebRTC: single-run `VERIFIED PASS`; complete gathering, mDNS `.local`, no literal private/public IP.
- Proxy WebRTC: `INCONCLUSIVE_NO_PROXY`; no authorized `TEST_PROXY` was configured.
- Direct CLI smoke: `INCONCLUSIVE_TIMEOUT`; no exit code `0` or DOM output. Full AppContainer mode remains blocked by prior drive ACL evidence.
- Profile lifecycle and production readiness: not fully verified.

## Current verification commands

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

Do not place proxy credentials in reports, source, or shell history.

## Historical `.54` record

> All values in this section are historical and do not describe current `.65` release state.


The `.54` build and validation details below are retained as historical handoff context. They refer to the original binary, host, date, and test conditions. They are not current `.65` evidence.

- Stable source target: `152.0.7977.54`.
- Chromium and V8 remained separate Git repositories.
- Static build and benchmark completed with exit code `0`.
- Extracted direct smoke was not cleanly verified because of Windows sandbox/ACL behavior.
- Historical benchmark recorded `5/5 PASS`.

## Operational lessons

1. Keep Chromium-root and V8 patches separate.
2. Use `$LASTEXITCODE` for PowerShell native command status.
3. Sort Chrome versions with `System.Version`.
4. Use `gclient.bat` on Windows.
5. Regenerate GN after version/config changes.
6. `is_component_build = false` is required for static distribution layout.
7. Require exit codes, artifacts, extracted launch, and reports; never infer success from Ninja dots.
8. Stop only BrowserMulti processes under the known build/runtime path.
9. Keep private patches outside public Git.
10. Treat snapshot results as host-relative.
11. Treat direct WebRTC PASS as single-run evidence; proxy mode needs separate authorized testing.
12. Do not call the project universally undetectable, bypass-capable, or production-ready from recorded scenarios.

## Pending gates

- Run proxy WebRTC with authorized `TEST_PROXY` and review route evidence.
- Resolve or document direct CLI smoke behavior on target Windows environments.
- Add/verify profile locking, migration, aging, backup, and restore lifecycle.
- Verify matching GitHub Release asset before relying on SDK auto-download.
