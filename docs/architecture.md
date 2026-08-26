# Architecture

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

## Source changes

Chromium patch covers branding, User-Agent/Client Hints, `navigator.webdriver`, default plugins, and search migration handling. V8 patch covers selected Inspector runtime behavior.

Chromium 152 also required local API compatibility changes for deprecated `ContextDisposedNotification(bool)` call sites. Use `v8::ContextDependants` overloads when rebuilding against current V8 headers.

## Static build

`out\Default\args.gn` uses:

```gn
is_debug = false
is_component_build = false
symbol_level = 0
blink_symbol_level = 0
target_cpu = "x64"
```

Static non-component builds reduce component DLL/SxS conflicts. Still validate Windows sandbox and ACL behavior on target systems.
