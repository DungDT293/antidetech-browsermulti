# Security and IP Hygiene

## Private material

Keep these outside public Git:

- `D:\dichchrome_private_patches\*.patch`
- PyPI tokens, GitHub tokens, `.pypirc`.
- Browser profiles, cookies, `User Data`, CDP profiles.
- Local logs containing URLs, headers, tokens, or account data.

`.gitignore` blocks patch files, reports, profiles, runtime artifacts, and Python build output. Existing history must be reviewed separately after removing sensitive files from tracking.

## Secret handling

Never place credentials in source, README, command arguments, or commit messages. Use environment variables for Twine:

```powershell
$env:TWINE_USERNAME = '__token__'
$env:TWINE_PASSWORD = 'pypi-REDACTED_NEW_TOKEN'
python -m twine upload dist_pypi\*
Remove-Item Env:\TWINE_PASSWORD
Remove-Item Env:\TWINE_USERNAME
```

Revoke any token exposed in chat, logs, shell history, or screenshots.

## Chromium notices

Chromium-derived code and binaries carry upstream license and notice obligations. Review Chromium `LICENSE`, `NOTICE`, and component licenses before redistribution. Keep project-specific scripts and docs licensing separate from Chromium licensing.
