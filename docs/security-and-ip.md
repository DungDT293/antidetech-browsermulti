# Security and IP Hygiene

## Current status

BrowserMulti `152.0.7977.65` is intended for authorized automation, compatibility testing, and fingerprint research. P1 implementation is complete; selected validation gates remain pending. Recorded benchmark, snapshot, and WebRTC results do not prove universal undetectability, anti-bot bypass, or proxy privacy.

## Private material

Keep these outside public Git:

- `D:\dichchrome_private_patches\*.patch`
- PyPI/GitHub tokens and `.pypirc`.
- Browser profiles, cookies, `User Data`, CDP profiles.
- Logs containing URLs, headers, tokens, or account data.
- Runtime ZIPs, build trees, screenshots, and local audit artifacts unless reviewed for publication.

`.gitignore` blocks common patch, profile, report, runtime, and Python build artifacts. Review staged names before every commit.

## Secret handling

Never place credentials in source, README, command arguments, or commit messages. For uploads use environment variables, preferably read interactively and clear immediately:

```powershell
$env:TWINE_USERNAME = '__token__'
$env:TWINE_PASSWORD = Read-Host 'Fresh PyPI token'
python -m twine upload dist_pypi\*
Remove-Item Env:\TWINE_PASSWORD -ErrorAction SilentlyContinue
Remove-Item Env:\TWINE_USERNAME -ErrorAction SilentlyContinue
```

Revoke any token exposed in chat, logs, shell history, or screenshots.

## Proxy and WebRTC testing

Use only an authorized proxy. Set `TEST_PROXY` temporarily, run `test_webrtc_proxy.js`, inspect the redacted JSON, and clear the variable. Do not claim proxy route verification from a configured flag alone. Complete ICE gathering with no literal private/public address is privacy evidence for that run; relay evidence is needed for stronger route attribution.

## Fingerprint data

`fingerprint_snapshot_152.json` is a host-relative regression baseline. It contains browser identity values such as GPU, screen, CPU count, plugins, permissions, and audio settings. Treat it as test evidence, not a universal profile template. Review before sharing because hardware values can identify a workstation.

Coherence presets describe expected hardware categories only. They do not spoof browser values or resolve GeoIP.

## Chromium notices

Chromium-derived code and binaries carry upstream license and notice obligations. Review Chromium `LICENSE`, `NOTICE`, and component licenses before redistribution. Keep project-specific scripts and docs licensing separate from Chromium licensing.
