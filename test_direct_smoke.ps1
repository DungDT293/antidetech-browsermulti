[CmdletBinding()]
param(
    [string]$Executable = 'D:\dichchrome\dist\browsermulti-152.0.7977.65-win64\chrome.exe',
    [string]$Profile = 'D:\dichchrome\temp_smoke_profile',
    [string]$Output = 'D:\dichchrome\direct_smoke_result.json'
)

$ErrorActionPreference = 'Stop'
$stdoutFile = Join-Path $env:TEMP 'browsermulti-direct-smoke.stdout.txt'
$stderrFile = Join-Path $env:TEMP 'browsermulti-direct-smoke.stderr.txt'
$arguments = @(
    '--headless=new',
    "--user-data-dir=$Profile",
    '--no-first-run',
    '--no-default-browser-check',
    '--dump-dom',
    'data:text/html,%3Chtml%3E%3Chead%3E%3Ctitle%3EDirectSmokePass%3C%2Ftitle%3E%3C%2Fhead%3E%3Cbody%3E%3Ch1%3EDirect%20Smoke%20Test%20OK%3C%2Fh1%3E%3C%2Fbody%3E%3C%2Fhtml%3E'
)
$result = [ordered]@{
    version = '152.0.7977.65'
    executable = $Executable
    arguments = $arguments
    profile = $Profile
    started = $false
    exit_code = $null
    stdout_contains_title = $false
    stdout_contains_body = $false
    cleanup = $false
    verdict = 'INCONCLUSIVE'
}

try {
    if (-not (Test-Path -LiteralPath $Executable -PathType Leaf)) {
        throw "Missing executable: $Executable"
    }
    foreach ($file in @($stdoutFile, $stderrFile)) {
        if (Test-Path -LiteralPath $file) {
            Remove-Item -LiteralPath $file -Force
        }
    }
    if (Test-Path -LiteralPath $Profile) {
        Remove-Item -LiteralPath $Profile -Recurse -Force
    }
    New-Item -ItemType Directory -Path $Profile -Force | Out-Null

    $process = Start-Process -FilePath $Executable -ArgumentList $arguments -NoNewWindow -PassThru -Wait `
        -RedirectStandardOutput $stdoutFile -RedirectStandardError $stderrFile
    $result.started = $true
    $result.exit_code = $process.ExitCode
    $stdout = if (Test-Path -LiteralPath $stdoutFile) { Get-Content -LiteralPath $stdoutFile -Raw } else { '' }
    $stderr = if (Test-Path -LiteralPath $stderrFile) { Get-Content -LiteralPath $stderrFile -Raw } else { '' }
    $result.stdout_contains_title = $stdout -match 'DirectSmokePass'
    $result.stdout_contains_body = $stdout -match 'Direct Smoke Test OK'
    $normalizedStderr = ($stderr -replace '\s+', ' ').Trim()
    $result.stderr_preview = $normalizedStderr.Substring(0, [Math]::Min(500, $normalizedStderr.Length))
    $result.output_nonempty = -not [string]::IsNullOrWhiteSpace($stdout)
    if ($result.exit_code -eq 0 -and $result.output_nonempty) {
        $result.verdict = 'PASS'
    } elseif ($result.exit_code -eq 0) {
        $result.verdict = 'FAIL_OUTPUT'
    } else {
        $result.verdict = 'FAIL_EXIT_CODE'
    }
} catch {
    $result.error = $_.Exception.Message
    $result.verdict = 'FAIL_ERROR'
} finally {
    if (Test-Path -LiteralPath $Profile) {
        Remove-Item -LiteralPath $Profile -Recurse -Force -ErrorAction SilentlyContinue
    }
    $result.cleanup = -not (Test-Path -LiteralPath $Profile)
    foreach ($file in @($stdoutFile, $stderrFile)) {
        if (Test-Path -LiteralPath $file) {
            Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue
        }
    }
    $result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $Output -Encoding UTF8
}

$result | ConvertTo-Json -Depth 5
if ($result.verdict -ne 'PASS') { exit 1 }
exit 0
