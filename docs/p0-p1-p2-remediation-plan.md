# BrowserMulti Remediation Plan

## Scope

Fix repo blockers identified in `docs/BrowserMulti_repo_detailed_review.md`. Current work completed P0 version identity and dynamic SDK binary resolution. Remaining work focuses on workspace portability, release verification, regression gates, SDK lifecycle, profile lifecycle, evidence, and provenance.

## Current baseline

- Canonical version metadata: `version.json`.
- Current baseline: Chromium/BrowserMulti `152.0.7977.54`.
- `.65` static build completed with exit code `0` and was benchmarked separately.
- `.65` benchmark: `5/5 PASS`.
- `.54` SDK test: exit code `0`.
- Direct extracted CLI smoke remains separate from Playwright benchmark and must not be marked PASS without exit code `0`.

## P0 — release identity and reproducibility

### P0.1 Unified version contract

**Goal:** Make `version.json` sole release identity source.

Actions:

1. Add one loader for PowerShell, Python, and Node consumers.
2. Derive patch filenames, artifact names, manifest checks, SDK version, benchmark report paths, and release labels from metadata.
3. Remove stale `_v154` references from docs and scripts.
4. Add a consistency check that compares:
   - `version.json`;
   - `current_version.txt`;
   - Chromium manifest;
   - ZIP filename;
   - Python package version.
5. Fail before build publication on mismatch.

Acceptance:

- One version change updates all generated paths without source edits in launcher or package metadata.
- Consistency command exits `0` for valid state and nonzero for deliberate mismatch.

### P0.2 Self-contained workspace resolution

**Goal:** Remove mandatory `D:\dichchrome` assumptions.

Actions:

1. Resolve repo root from script location by default.
2. Add explicit `-Workspace` / `BROWSERMULTI_ROOT` override.
3. Resolve Chromium checkout, depot_tools, dist, logs, reports, and private patch directory relative to workspace.
4. Keep private patches outside Git by default; support an explicit private patch directory override.
5. Validate all paths before destructive actions.
6. Add a dirty-worktree refusal by default.
7. Require explicit `-ForceClean` before `git checkout .` and `git clean -df`.
8. Add a single-instance lock so watcher cannot launch concurrent pipelines.

Acceptance:

- Clone moved to another drive works with `-Workspace`.
- Dirty Chromium checkout stops without deleting changes unless `-ForceClean` is passed.
- Concurrent watcher invocation exits with clear lock message.

### P0.3 Release verification pipeline

**Goal:** Treat build, package, extract, launch, shutdown, and benchmark as one gate.

Actions:

1. Build static runtime.
2. Package strict runtime whitelist.
3. Extract into a fresh temporary directory.
4. Verify required files and exact manifest.
5. Launch with controlled profile and exact arguments.
6. Navigate to a local test page to avoid network-only false positives.
7. Close browser and capture process exit code, timeout, stderr, and Windows event evidence.
8. Run external benchmark separately.
9. Write PASS/FAIL report only from exit codes and required artifacts.
10. Publish only after all required gates pass.

Acceptance:

- Release report contains artifact SHA256, process exit code, timeout state, and benchmark result.
- Inconclusive smoke remains `INCONCLUSIVE`, never `PASS`.

### P0.4 Fingerprint regression gate

**Goal:** Detect unintended identity changes after Chromium updates.

Actions:

1. Create JSON baseline for stable version.
2. Capture deterministic browser identity values locally:
   - user agent;
   - client hints;
   - webdriver;
   - plugins/mime types;
   - language/timezone;
   - viewport/screen values;
   - WebGL vendor/renderer where available.
3. Compare new version against baseline with allowlisted expected changes.
4. Fail on unexpected changes.
5. Store environment metadata with each report.

Acceptance:

- New Chromium version cannot publish when identity diff exceeds allowlist.

## P1 — SDK and profile architecture

### P1.1 SDK lifecycle

Replace hidden Playwright lifecycle and monkey-patched context methods with an owned session object:

- `BrowserMultiSession.playwright`;
- `BrowserMultiSession.context`;
- `BrowserMultiSession.close()`;
- typed page/controller helpers.

Keep current functions as compatibility wrappers until migration completes.

Acceptance:

- Playwright and browser processes close deterministically.
- SDK test has no unowned lifecycle warnings where supported by Windows asyncio.

### P1.2 Launch configuration

Add typed `LaunchConfig` containing executable path, version, profile directory, proxy, locale, timezone, viewport, and launch args. Keep precedence:

1. explicit function argument;
2. `BROWSERMULTI_EXECUTABLE`;
3. versioned artifact path;
4. actionable missing-binary error.

Acceptance:

- Config resolution is unit-tested without launching Chromium.

### P1.3 Profile lifecycle

Add minimal profile manager:

- create/open;
- lock/concurrency refusal;
- close;
- clone;
- backup/restore;
- version compatibility marker;
- migration hook;
- corruption detection.

Do not add profile randomization knobs. Preserve coherent identity policy.

Acceptance:

- Two concurrent opens fail cleanly.
- Version migration produces an auditable result.

### P1.4 Evidence model

Every validation result records:

- test name and timestamp;
- browser version;
- Chromium and V8 commit IDs;
- OS build;
- headful/headless;
- viewport;
- proxy class, without secrets;
- profile state;
- artifact SHA256;
- result and evidence class.

Evidence classes:

- A: deterministic automated regression;
- B: reproducible external test;
- C: single-run observation;
- D: architectural assumption.

## P2 — product lifecycle and provenance

### P2.1 Provenance manifest

Generate `release-manifest.json` beside each ZIP with:

- browser version;
- Chromium commit;
- V8 commit;
- patch hashes;
- build args hash;
- toolchain identity;
- SDK version;
- artifact SHA256;
- benchmark report hash;
- verification status.

### P2.2 CI and release channels

Add CI stages for:

1. metadata consistency;
2. patch applicability;
3. GN generation;
4. build smoke;
5. package structure;
6. SDK test;
7. deterministic identity regression;
8. provenance generation.

Use release channels: `nightly`, `candidate`, `stable`. Publish stable only after P0 gates.

### P2.3 Documentation canonical state

Keep architecture and policy docs version-neutral. Generate current release details from `version.json` and release manifests. Mark historical results with exact version and evidence class.

### P2.4 Claim discipline

Use wording such as “PASS on recorded test scenarios.” Do not claim universal anti-bot bypass or undetectability. Keep smooth input documented as UI convenience only.

## Execution order

1. Finish `.65` package and validation evidence.
2. Add metadata consistency checker.
3. Refactor workspace/path resolution.
4. Add dirty-worktree guard and pipeline lock.
5. Add extracted release smoke gate.
6. Add fingerprint snapshot regression.
7. Refactor SDK lifecycle while preserving wrappers.
8. Add profile locking and migration marker.
9. Add provenance manifest.
10. Add CI and release-channel gates.

## Definition of done

BrowserMulti is release-ready when a clean workspace can reproduce the selected version, apply both private patches, build static output, extract and launch it with exit code `0`, pass SDK and regression checks, produce provenance, and refuse publication on any consistency or verification failure.
