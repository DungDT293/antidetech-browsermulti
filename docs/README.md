# BrowserMulti Documentation

## Current status

`P1 implementation complete; selected validation gates pending.`

Canonical release: `152.0.7977.65`, static Windows x64, tag `v152.0.7977.65`.

| Gate | Current evidence |
|---|---|
| Static build | PASS, exit code `0` |
| Playwright SDK | PASS, local exit code `0` |
| Benchmark | Recorded `5/5 PASS`; scenario evidence only |
| Fingerprint snapshot | Host-relative `157` leaves, `0 diff` on build host |
| Coherence Engine | Implemented; warning-only; no spoofing or GeoIP lookup |
| Direct WebRTC | Single-run `VERIFIED PASS`; mDNS candidates; no literal IP observed |
| Proxy WebRTC | `INCONCLUSIVE_NO_PROXY`; no `TEST_PROXY` in recorded run |
| Direct CLI smoke | `INCONCLUSIVE_TIMEOUT`; no exit code `0` or DOM output |
| Profile lifecycle | Pending verification |

## Documents

- [Architecture](architecture.md) — Chromium/V8 boundaries and static build.
- [Build and Release](build-and-release.md) — sync, private patches, build, packaging, release gates.
- [SDK Usage](sdk-usage.md) — installation, launcher, proxy, coherence options.
- [Security and IP](security-and-ip.md) — secrets, profiles, reports, and safe testing.
- [Operations](operations.md) — watcher, process scope, failure handling.
- [Validation](validation.md) — current evidence and reporting rules.
- [Release Checklist](release-checklist.md) — release gate checklist.
- [P0/P1/P2 remediation](p0-p1-p2-remediation-plan.md) — remaining engineering work.

## P1 tooling

- [`browsermulti/fingerprint.py`](../browsermulti/fingerprint.py) — observational presets and coherence warnings.
- [`test_webrtc_proxy.js`](../test_webrtc_proxy.js) — authorized proxy WebRTC test.
- [`tests/test_fingerprint_snapshot.py`](../tests/test_fingerprint_snapshot.py) — local fingerprint regression.
- [`fingerprint_snapshot_152.json`](../fingerprint_snapshot_152.json) — build-host baseline.

Historical `.54` and v154 research remains labeled in `DEVLOG.md`, `handoff.md`, and validation records. Historical results do not override current `.65` evidence.
