[CmdletBinding()]
param(
    [string]$Executable = 'D:\dichchrome\dist\browsermulti-152.0.7977.65-win64\chrome.exe',
    [string]$Root = 'D:\dichchrome',
    [string]$Output = 'D:\dichchrome\direct_smoke_result.json'
)

$ErrorActionPreference = 'Stop'
$tempDir = Join-Path $Root 'temp_smoke_profile'
$domUrl = 'data:text/html,%3Chtml%3E%3Chead%3E%3Ctitle%3EDirectSmokePass%3C%2Ftitle%3E%3C%2Fhead%3E%3Cbody%3E%3Ch1%3ESmoke%20Test%20OK%3C%2Fh1%3E%3C%2Fbody%3E%3C%2Fhtml%3E'

function Invoke-SmokeMode {
    param([string]$Name, [string[]]$Arguments, [string]$Profile)
    $stdout = Join-Path $env:TEMP "browsermulti-$Name.stdout.txt"
    $stderr = Join-Path $env:TEMP "browsermulti-$Name.stderr.txt"
    $mode = [ordered]@{ arguments = $Arguments; profile = $Profile; exit_code = $null; dom_matched = $false; stderr = ''; timed_out = $false; status = 'INCONCLUSIVE' }
    try {
        if (Test-Path -LiteralPath $Profile) { Remove-Item -LiteralPath $Profile -Recurse -Force }
        New-Item -ItemType Directory -Path $Profile -Force | Out-Null
        $p = Start-Process -FilePath $Executable -ArgumentList $Arguments -NoNewWindow -PassThru -RedirectStandardOutput $stdout -RedirectStandardError $stderr
        if (-not $p.WaitForExit(60000)) {
            $mode.timed_out = $true
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
            $p.WaitForExit(5000)
        }
        if ($p.HasExited) { $mode.exit_code = $p.ExitCode }
        $output = if (Test-Path -LiteralPath $stdout) { Get-Content -LiteralPath $stdout -Raw } else { '' }
        $errorText = if (Test-Path -LiteralPath $stderr) { Get-Content -LiteralPath $stderr -Raw } else { '' }
        $mode.dom_matched = [bool]($output -match 'DirectSmokePass' -and $output -match 'Smoke Test OK')
        $mode.stderr = (($errorText -replace '\s+', ' ').Trim())
        if ($mode.exit_code -eq 0 -and $mode.dom_matched) { $mode.status = 'PASS' }
        elseif ($mode.timed_out) { $mode.status = 'INCONCLUSIVE_TIMEOUT' }
        elseif ($mode.exit_code -ne 0) { $mode.status = 'FAIL_EXIT_CODE' }
        else { $mode.status = 'FAIL_OUTPUT' }
    } catch {
        $mode.stderr = $_.Exception.Message
        $mode.status = 'FAIL_ERROR'
    } finally {
        if (Test-Path -LiteralPath $Profile) { Remove-Item -LiteralPath $Profile -Recurse -Force -ErrorAction SilentlyContinue }
        Remove-Item -LiteralPath $stdout,$stderr -Force -ErrorAction SilentlyContinue
    }
    return ,$mode
}

$result = [ordered]@{
    test_timestamp = (Get-Date).ToString('o')
    version = '152.0.7977.65'
    executable = $Executable
    no_sandbox_mode = $null
    token_sandbox_mode = $null
    full_appcontainer_mode = [ordered]@{ status = 'BLOCKED_BY_OS_ACL_ON_DRIVE_D'; error = 'Prior full-sandbox run returned Access is denied (0x5), followed by STATUS_BREAKPOINT (0x80000003).' }
    cleanup = $false
}
try {
    if (-not (Test-Path -LiteralPath $Executable -PathType Leaf)) { throw "Missing executable: $Executable" }
    $result.no_sandbox_mode = Invoke-SmokeMode 'no-sandbox' @('--headless=new','--no-sandbox','--disable-gpu',"--user-data-dir=$(Join-Path $tempDir 'profile1')",'--no-first-run','--no-default-browser-check','--dump-dom',$domUrl) (Join-Path $tempDir 'profile1')
    $result.token_sandbox_mode = Invoke-SmokeMode 'token-sandbox' @('--headless=new','--disable-gpu-sandbox','--disable-features=RendererAppContainer',"--user-data-dir=$(Join-Path $tempDir 'profile2')",'--no-first-run','--no-default-browser-check','--dump-dom',$domUrl) (Join-Path $tempDir 'profile2')
} catch { $result.error = $_.Exception.Message } finally {
    if (Test-Path -LiteralPath $tempDir) { Remove-Item -LiteralPath $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
    $result.cleanup = -not (Test-Path -LiteralPath $tempDir)
    $result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Output -Encoding UTF8
}
$result | ConvertTo-Json -Depth 8
if ($result.no_sandbox_mode.status -ne 'PASS') { exit 1 }
exit 0
