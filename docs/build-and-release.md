# Build and Release

## Current release

- Version: `152.0.7977.65`
- Tag: `v152.0.7977.65`
- ZIP: `browsermulti-152.0.7977.65-win64.zip`
- SDK: PyPI package `browsermulti==152.0.7977.65`
- Status: **P1 implementation complete; selected validation gates pending**

## Safety gate

`auto_sync_and_build.ps1` can reset and clean Chromium source with `git checkout .` and `git clean -df`. Do not run it without explicit operator approval, backup, and review of current work. This warning overrides convenience.

## Manual pipeline

```powershell
powershell -ExecutionPolicy Bypass -File .\auto_sync_and_build.ps1
```

Pipeline stages:

1. Query Chrome Stable Version History API.
2. Select newest valid `[System.Version]`.
3. Reset and clean Chromium checkout.
4. Fetch one version tag.
5. Run `gclient.bat sync`.
6. Apply private Chromium and V8 patches independently.
7. Run `gn.bat gen out\Default`.
8. Run `autoninja -C out\Default chrome`.
9. Run benchmark.
10. Write version marker and package strict runtime ZIP.

## Private patches

Patch files stay outside public Git:

```text
<private-patch-dir>\BrowserMulti_chromium_v152.patch
<private-patch-dir>\BrowserMulti_v8_v152.patch
```

The build host commonly uses `D:\dichchrome_private_patches`. Configure paths before another workspace build.

## Release checks

Require all relevant evidence before calling release ready:

- Build exit code `0`.
- Exact `152.0.7977.65.manifest` exists.
- `chrome.exe` and `chrome.dll` exist in static output.
- ZIP contains runtime files, locales, and manifest/XML files.
- Extracted launch captures exit code or explicit inconclusive status.
- SDK and benchmark reports identify version and environment.
- Fingerprint snapshot comparison reviewed as host-relative.
- Direct WebRTC and proxy WebRTC reported separately.
- No secrets, profiles, tokens, logs, or private patches tracked.
- Version metadata, package metadata, tag, ZIP name, and manifest agree.

A benchmark PASS does not override `INCONCLUSIVE_TIMEOUT` direct CLI smoke. P1 status does not mean universal anti-bot bypass or production readiness.

## PyPI upload

```powershell
python -m build --outdir dist_pypi
python -m twine check dist_pypi\*
$env:TWINE_USERNAME = '__token__'
$env:TWINE_PASSWORD = Read-Host 'Fresh PyPI token'
python -m twine upload --skip-existing dist_pypi\*
Remove-Item Env:\TWINE_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:\TWINE_USERNAME -ErrorAction SilentlyContinue
```

Never put token text in source, README, command history, or commits. Revoke exposed tokens.

## GitHub Release

Create release at <https://github.com/DungDT293/antidetech-browsermulti/releases/new> with tag `v152.0.7977.65` and asset `browsermulti-152.0.7977.65-win64.zip`. SDK auto-download works only after matching asset exists.
