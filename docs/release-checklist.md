# Release Checklist

## Metadata

- [ ] `version.json` contains intended release version.
- [ ] `current_version.txt` matches `version.json`.
- [ ] Python package version matches metadata.
- [ ] Chromium manifest, ZIP name, Git tag, and release title match.

## Build and validation

- [ ] Dependency sync succeeds.
- [ ] Private Chromium and V8 patches apply from outside public Git.
- [ ] GN generation succeeds.
- [ ] Static Ninja build exits `0`.
- [ ] ZIP contains `chrome.exe`, `chrome.dll`, exact manifest, locales, and required resources.
- [ ] Extracted launch test captures actual exit code, timeout, stderr, and sandbox/ACL evidence.
- [ ] Playwright benchmark result is saved with exact version and environment.
- [ ] Do not call inconclusive smoke evidence PASS.

## SDK distribution

- [ ] `python -m build --outdir dist_pypi` succeeds.
- [ ] `python -m twine check dist_pypi\*` succeeds.
- [ ] Upload with a fresh PyPI token through `TWINE_PASSWORD`; never commit token text.
- [ ] Install package in a clean environment and verify binary resolution.
- [ ] Publish matching GitHub Release ZIP before relying on auto-download.

## Repository hygiene

- [ ] No private patches, credentials, profiles, logs, screenshots, Chromium checkout, or build output staged.
- [ ] `git diff --check` succeeds.
- [ ] README and docs describe current release, not stale historical state.
- [ ] Historical evidence is labeled with its original version.
- [ ] Commit and tag point to same release metadata.
