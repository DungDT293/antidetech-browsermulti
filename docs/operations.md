# Operations

## Current release

Current release metadata is `152.0.7977.65`; verify `version.json` before operational changes.

## Scheduled watcher

`auto_watcher.ps1` checks Google Stable and invokes the main pipeline only when the local version is older.

Scheduled Task:

```text
BrowserMulti-Auto-Updater
```

Inspect:

```powershell
Get-ScheduledTask -TaskName BrowserMulti-Auto-Updater
Get-Content D:\dichchrome\watcher_build.log -Tail 100
```

## Process cleanup

Stop only BrowserMulti processes whose executable path is under `D:\dichchrome\src\out\Default`. Do not stop installed Chrome processes broadly.

Common locked outputs:

- `atomic.dll`
- `dxcompiler.dll`
- `chrome_elf.dll`

## Failure handling

- HTTP 429 during dependency sync: wait and resume with lower concurrency.
- `gclient` not recognized: use `gclient.bat`.
- GN toolchain error: verify Visual Studio and `DEPOT_TOOLS_WIN_TOOLCHAIN`.
- Deprecated V8 API: update call site to `ContextDependants` overload, then rebuild incrementally.
- SxS failure: verify exact version manifest, static build mode, runtime files, and ACLs.
