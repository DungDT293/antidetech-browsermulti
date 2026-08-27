# Architecture

## Current status

BrowserMulti `152.0.7977.65` is a static Windows x64 Chromium distribution with Python Playwright delivery. Status: **P1 implementation complete; selected validation gates pending**.

## Repository boundaries

Chromium root and V8 are separate Git repositories:

- Chromium source: `D:\dichchrome\src`
- V8 sub-repository: `D:\dichchrome\src\v8`
- Chromium patch: `<private-patch-dir>\BrowserMulti_chromium_v152.patch`
- V8 patch: `<private-patch-dir>\BrowserMulti_v8_v152.patch`

Apply patches independently:

```powershell
Push-Location D:\dichchrome\src
git apply --3way --ignore-whitespace <private-patch-dir>\BrowserMulti_chromium_v152.patch
Pop-Location
Push-Location D:\dichchrome\src\v8
git apply --3way --ignore-whitespace <private-patch-dir>\BrowserMulti_v8_v152.patch
Pop-Location
```

Private patch paths are examples for the build host. Never copy patches into public Git.

## Source changes

Native Chromium/Blink/V8 changes cover branding, User-Agent/Client Hints, `navigator.webdriver`, default plugins, search migration handling, and selected Inspector runtime behavior. These are source-level changes in a real Chromium build, not JavaScript fingerprint injection.

P1 `browsermulti/fingerprint.py` adds observational hardware presets and locale/timezone/proxy-country coherence warnings. It does not spoof GPU, audio, canvas, screen, OS, or navigator values and does not resolve GeoIP.

## SDK launch path

`browsermulti/launcher.py` resolves the executable, preserves `viewport=None` for native geometry, accepts locale/timezone/proxy settings, and optionally validates a named observational preset. Coherence findings warn without blocking launch.

## Static build

`out\Default\args.gn` uses:

```gn
is_debug = false
is_component_build = false
symbol_level = 0
blink_symbol_level = 0
target_cpu = "x64"
```

Static non-component builds reduce component DLL/SxS conflicts. Validate Windows sandbox and ACL behavior on target systems; direct CLI smoke is currently inconclusive on the build host.
