# Operations

## Current state

Current release metadata is `152.0.7977.65`. Project status: **P1 implementation complete; selected validation gates pending**. Verify `version.json` before operational changes.

## Scheduled watcher

`auto_watcher.ps1` checks Chrome Stable and invokes the main pipeline only when local version is older.

Scheduled Task:

```text
BrowserMulti-Auto-Updater
```

Inspect:

```powershell
Get-ScheduledTask -TaskName BrowserMulti-Auto-Updater
Get-Content D:\dichchrome\watcher_build.log -Tail 100
```

The watcher may reach a reset/clean build pipeline. Treat each invocation as destructive until reviewed and approved.

## Process cleanup

Stop only BrowserMulti processes whose executable path is under the known BrowserMulti build/runtime directory. Do not stop installed Chrome processes broadly.

Common locked outputs:

- `atomic.dll`
- `dxcompiler.dll`
- `chrome_elf.dll`

## Validation operations

```powershell
python D:\dichchrome\tests\test_fingerprint_snapshot.py
node D:\dichchrome\test_webrtc_leak.js
```

Proxy WebRTC requires an authorized temporary `TEST_PROXY`. Remove it immediately after testing. Reports must not contain credentials.

## Failure handling

- HTTP 429 during dependency sync: wait and resume with lower concurrency.
- `gclient` not recognized: use `gclient.bat`.
- GN toolchain error: verify Visual Studio and `DEPOT_TOOLS_WIN_TOOLCHAIN`.
- Deprecated V8 API: update call site to `ContextDependants` overload, then rebuild incrementally.
- SxS failure: verify exact manifest, static build mode, runtime files, and ACLs.
- Snapshot diff on another machine: review host hardware/display/permission differences before labeling regression.
- Direct CLI timeout: retain `INCONCLUSIVE_TIMEOUT`; do not convert process creation into PASS.
