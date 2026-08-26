[CmdletBinding()]
param(
    [string]$Executable = 'D:\dichchrome\dist\browsermulti-152.0.7977.65-win64\chrome.exe',
    [string]$Profile = 'D:\dichchrome\temp_smoke_profile',
    [string]$Output = 'D:\dichchrome\direct_smoke_result.json'
)

$ErrorActionPreference = 'Stop'
$arguments = @(
    "--user-data-dir=$Profile",
    '--headless=new',
    '--remote-debugging-port=0',
    '--no-first-run',
    '--no-default-browser-check',
    'data:text/html,<title>DirectSmokePass</title>'
)
$result = [ordered]@{
    version = '152.0.7977.65'
    executable = $Executable
    arguments = $arguments
    profile = $Profile
    started = $false
    graceful_close = $false
    forced_close = $false
    timed_out = $false
    exit_code = $null
    cleanup = $false
    verdict = 'INCONCLUSIVE'
}

try {
    if (-not (Test-Path -LiteralPath $Executable -PathType Leaf)) {
        throw "Missing executable: $Executable"
    }
    if (Test-Path -LiteralPath $Profile) {
        Remove-Item -LiteralPath $Profile -Recurse -Force
    }
    New-Item -ItemType Directory -Path $Profile -Force | Out-Null
    $process = Start-Process -FilePath $Executable -ArgumentList $arguments -PassThru
    $result.started = $true
    Start-Sleep -Seconds 3
    if (-not $process.HasExited) {
        if ($process.CloseMainWindow()) {
            $result.graceful_close = $true
        }
        if (-not $process.WaitForExit(10000)) {
            $result.timed_out = $true
            Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
            $result.forced_close = $true
            $process.WaitForExit(5000)
        }
    }
    if ($process.HasExited) {
        $result.exit_code = $process.ExitCode
        if ($result.exit_code -eq 0) {
            $result.verdict = 'PASS'
        } else {
            $result.verdict = 'FAIL_EXIT_CODE'
        }
    } else {
        $result.verdict = 'INCONCLUSIVE_TIMEOUT'
    }
} catch {
    $result.error = $_.Exception.Message
    $result.verdict = 'FAIL_ERROR'
} finally {
    if (Test-Path -LiteralPath $Profile) {
        Remove-Item -LiteralPath $Profile -Recurse -Force -ErrorAction SilentlyContinue
    }
    $result.cleanup = -not (Test-Path -LiteralPath $Profile)
    $result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $Output -Encoding UTF8
}

$result | ConvertTo-Json -Depth 5
if ($result.verdict -ne 'PASS') { exit 1 }
exit 0
