# Release Checklist

Current release target: `152.0.7977.65` static Windows x64.

Project status: **P1 implementation complete; selected validation gates pending**.

## Metadata

- [ ] `version.json` contains intended version.
- [ ] `current_version.txt` matches `version.json`.
- [ ] Python package version matches metadata.
- [ ] Chromium manifest, ZIP name, Git tag, and release title match.

## Build and validation

- [ ] Obtain explicit approval before running reset/clean build pipeline.
- [ ] Dependency sync succeeds.
- [ ] Private Chromium and V8 patches apply outside public Git.
- [ ] GN generation succeeds.
- [ ] Static Ninja build exits `0`.
- [ ] ZIP contains `chrome.exe`, `chrome.dll`, exact manifest, locales, and resources.
- [ ] Extracted launch captures actual exit code, timeout, stderr, and sandbox/ACL evidence.
- [ ] Playwright benchmark identifies exact version/environment.
- [ ] Fingerprint snapshot diff reviewed as host-relative.
- [ ] Direct WebRTC and proxy WebRTC results recorded separately.
- [ ] Inconclusive smoke evidence is never labeled PASS.

## SDK distribution

- [ ] `python -m build --outdir dist_pypi` succeeds.
- [ ] `python -m twine check dist_pypi\*` succeeds.
- [ ] Upload with fresh token through environment variable; clear after upload.
- [ ] Install package in clean environment and verify binary resolution.
- [ ] Publish matching GitHub Release ZIP before relying on auto-download.

## P1 gates

- [x] Coherence Engine implemented with three observational presets.
- [x] Snapshot baseline created: `157` leaves; build-host comparison `0 diff`.
- [x] Direct WebRTC single-run mDNS privacy result recorded.
- [ ] Authorized proxy WebRTC test; current state `INCONCLUSIVE_NO_PROXY`.
- [ ] Direct CLI smoke clean exit; current state `INCONCLUSIVE_TIMEOUT`.
- [ ] Profile locking, migration, aging, backup, and restore lifecycle.

## Repository hygiene

- [ ] No private patches, credentials, profiles, cookies, logs, screenshots, Chromium checkout, or build output staged.
- [ ] `git diff --check` succeeds.
- [ ] README/docs describe `.65` current state and label historical records.
- [ ] Commit and tag point to same release metadata.
