# Build and Release

## Manual pipeline

Run only after backing up local Chromium work. Pipeline resets source state with `git checkout .` and `git clean -df`.

```powershell
powershell -ExecutionPolicy Bypass -File D:\dichchrome\auto_sync_and_build.ps1
```

Pipeline stages:

1. Query Chrome Stable Version History API.
2. Select newest valid `[System.Version]`.
3. Reset and clean Chromium checkout.
4. Fetch one version tag.
5. Run `gclient.bat sync`.
6. Apply private Chromium and V8 patches.
7. Run `gn.bat gen out\Default`.
8. Run `autoninja -C out\Default chrome`.
9. Run benchmark.
10. Write version marker and package runtime ZIP.

## Private patches

Patch files must stay outside public Git:

```text
D:\dichchrome_private_patches
```

Pipeline variables:

```powershell
$PatchDir = 'D:\dichchrome_private_patches'
```

Verify before build:

```powershell
Test-Path D:\dichchrome_private_patches\BrowserMulti_chromium_v154.patch
Test-Path D:\dichchrome_private_patches\BrowserMulti_v8_v154.patch
```

## Release checks

Require all checks before calling release ready:

- Build exit code `0`.
- Exact version manifest exists.
- `chrome.exe` and `chrome.dll` timestamps match current build.
- ZIP contains required runtime files, locales, and manifest/XML files.
- Extracted launch result captured with an actual exit code.
- Benchmark report saved separately from public source.
- No secrets, profiles, tokens, or private patches tracked.
