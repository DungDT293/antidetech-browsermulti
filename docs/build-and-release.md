# Build and Release

## Current release

- Version: `152.0.7977.65`
- Tag: `v152.0.7977.65`
- ZIP: `browsermulti-152.0.7977.65-win64.zip`
- SDK: PyPI package `browsermulti==152.0.7977.65`

## Manual pipeline

Run only after backing up local Chromium work. Pipeline can reset source state with `git checkout .` and `git clean -df`.

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

Patch files must stay outside public Git. Current private names:

```text
<private-patch-dir>\BrowserMulti_chromium_v152.patch
<private-patch-dir>\BrowserMulti_v8_v152.patch
```

The pipeline currently uses `D:\dichchrome_private_patches` on the build host. Configure paths for another workspace before running; do not copy private patches into public Git.

## Release checks

Require all checks before calling release ready:

- Build exit code `0`.
- Exact `152.0.7977.65.manifest` exists.
- `chrome.exe` and `chrome.dll` exist in static output.
- ZIP contains required runtime files, locales, and manifest/XML files.
- Extracted launch result captured with an actual exit code or explicitly marked inconclusive.
- SDK test and benchmark reports saved separately from public source.
- No secrets, profiles, tokens, logs, or private patches tracked.
- `version.json`, `current_version.txt`, package metadata, tag, ZIP name, and manifest agree.

## PyPI upload

Build locally and validate before upload:

```powershell
python -m build --outdir dist_pypi
python -m twine check dist_pypi\*
```

Use a fresh token through environment variables. Never put token text in source, README, shell history, or commit messages:

```powershell
$env:TWINE_USERNAME = '__token__'
$env:TWINE_PASSWORD = 'pypi-REDACTED_NEW_TOKEN'
python -m twine upload --skip-existing dist_pypi\*
Remove-Item Env:\TWINE_PASSWORD
Remove-Item Env:\TWINE_USERNAME
```

## GitHub Release

Create release at:

<https://github.com/DungDT293/antidetech-browsermulti/releases/new>

- Tag: `v152.0.7977.65`
- Title: `BrowserMulti v152.0.7977.65 - Stable Standalone Release`
- Asset: `browsermulti-152.0.7977.65-win64.zip`

The SDK auto-downloader works on another machine only after this asset exists at the matching tag URL.
