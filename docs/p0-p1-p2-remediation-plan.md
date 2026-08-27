# BrowserMulti Remediation Plan

## Scope

Current release: `152.0.7977.65`. P1 implementation is complete; selected validation gates remain pending. This roadmap tracks reproducibility, evidence, SDK lifecycle, profile lifecycle, and provenance. It does not claim universal undetectability or production readiness.

## Current baseline

- Canonical metadata: `version.json`.
- Static `.65` build exit code `0`.
- Recorded Playwright benchmark: `5/5 PASS`, scenario evidence.
- SDK local Playwright test: exit code `0`.
- Direct CLI smoke: `INCONCLUSIVE_TIMEOUT`; no clean exit code `0` or DOM output.
- Direct WebRTC: single-run `VERIFIED PASS`; mDNS `.local`, no literal IP observed.
- Proxy WebRTC: `INCONCLUSIVE_NO_PROXY`; no `TEST_PROXY` in recorded run.
- Fingerprint snapshot: host-relative baseline, `157` leaves, immediate compare `PASS`, `0 diff`.
- Coherence Engine: three observational presets and warning-only geo-profile checks; no spoofing or GeoIP lookup.

## Completed P1

### P1.0 Fingerprint regression

- `tests/test_fingerprint_snapshot.py` captures local stable browser identity values.
- `fingerprint_snapshot_152.json` records build-host baseline.
- Different host hardware, display, permissions, and runtime state can produce valid differences.

### P1.1 Profile coherence

- `browsermulti/fingerprint.py` defines Windows 11 Intel UHD, Windows 11 NVIDIA RTX, and Windows 10 AMD Radeon observational presets.
- `validate_profile_coherence()` warns on known locale/timezone/proxy-country mismatch.
- Launcher validates optional preset and emits warnings without modifying browser-exposed hardware values.

### P1.2 WebRTC evidence

- `test_webrtc_leak.js` records direct ICE evidence.
- `test_webrtc_proxy.js` requires authorized `TEST_PROXY`, redacts proxy metadata, and distinguishes no-proxy/incomplete/relay outcomes.
- Proxy route remains unverified until a real authorized proxy run supplies evidence.

## Remaining P1/P2 work

### P1.3 SDK lifecycle

Replace hidden Playwright lifecycle and monkey-patched context methods with an owned session object while preserving compatibility wrappers.

Acceptance: deterministic Playwright/browser close with lifecycle warnings reduced where Windows asyncio supports it.

### P1.4 Profile lifecycle

Add profile create/open locking, close, clone, backup/restore, version marker, migration hook, and corruption detection. Do not add profile randomization knobs.

Acceptance: concurrent open refusal and auditable version migration.

### P1.5 Direct release smoke

Resolve or document direct CLI `INCONCLUSIVE_TIMEOUT` behavior on target Windows environments. Require real exit code and expected output before release PASS.

## P2 provenance and channels

Generate release manifest containing browser/V8 commits, patch hashes, build args, toolchain, SDK version, artifact hash, benchmark hash, and verification status. Add CI gates for metadata, patch applicability, GN, build smoke, package structure, SDK, identity regression, and provenance. Use nightly/candidate/stable channels only when evidence supports each channel.

## Operational boundaries

- `auto_sync_and_build.ps1` can reset/clean source. Run only after explicit approval and backup.
- Keep private patches, profiles, cookies, credentials, logs, build output, and local audit artifacts outside public Git.
- Benchmark PASS, snapshot PASS, and direct WebRTC PASS are scoped scenario evidence.
- Do not claim proxy routing, universal privacy, universal anti-bot bypass, or undetectability without specific reproducible evidence.
