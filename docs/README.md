# BrowserMulti Documentation

Documentation index for BrowserMulti Chromium builds and Python SDK.

## Documents

- [Architecture](architecture.md) — Chromium/V8 split, patch boundaries, static build layout.
- [Build and Release](build-and-release.md) — Stable sync, private patches, GN/Ninja, packaging.
- [SDK Usage](sdk-usage.md) — Python package installation and Playwright integration.
- [Security and IP](security-and-ip.md) — Secrets, profiles, patch confidentiality, release hygiene.
- [Operations](operations.md) — Watcher, Scheduled Task, logs, failure handling.
- [Validation](validation.md) — Benchmark evidence, smoke-test limits, and reporting rules.
- [Release Checklist](release-checklist.md) — Metadata, build, SDK, release, and repository hygiene gates.

## Current release

- BrowserMulti/Chromium: `152.0.7977.65`.
- Git tag: `v152.0.7977.65`.
- Runtime asset: `browsermulti-152.0.7977.65-win64.zip`.
- SDK cache: `~/.browsermulti/bin/152.0.7977.65/chrome.exe`.
- Private patch directory: configured outside public Git, commonly `D:\dichchrome_private_patches`.
- Release validation: `.65` build exit code `0`, benchmark `5/5 PASS`; direct CLI smoke remains separate and inconclusive unless clean exit evidence exists.
