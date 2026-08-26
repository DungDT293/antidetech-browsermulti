[CmdletBinding()]
param(
    [string]$Root = 'D:\dichchrome'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$LogFile = Join-Path $Root 'watcher_build.log'
$VersionFile = Join-Path $Root 'current_version.txt'
$Pipeline = Join-Path $Root 'auto_sync_and_build.ps1'
$ApiUrl = 'https://versionhistory.googleapis.com/v1/chrome/platforms/win/channels/stable/versions'
$BuildOutput = Join-Path $Root 'src\out\Default'

function Write-Log {
    param([Parameter(Mandatory = $true)][string]$Message)
    $line = '{0} | {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Message
    Add-Content -LiteralPath $LogFile -Value $line -Encoding UTF8
    Write-Host $line
}

function Stop-BrowserMultiProcesses {
    $processes = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
        ($_.ExecutablePath -and $_.ExecutablePath.StartsWith($BuildOutput, [System.StringComparison]::OrdinalIgnoreCase)) -or
        ($_.Name -in @('lld-link.exe', 'siso.exe') -and $_.CommandLine -and $_.CommandLine -match [regex]::Escape($BuildOutput))
    }
    foreach ($process in $processes) {
        Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Log ('Stopped BrowserMulti process {0} ({1}).' -f $process.ProcessId, $process.Name)
    }
}

try {
    Write-Log '=== BEGIN BROWSERMULTI VERSION CHECK ==='
    if (-not (Test-Path -LiteralPath $Pipeline)) { throw "Missing pipeline: $Pipeline" }

    $currentVersion = ''
    if (Test-Path -LiteralPath $VersionFile) {
        $currentVersion = (Get-Content -LiteralPath $VersionFile -Raw).Trim()
    }
    Write-Log ('Current local version: {0}' -f $currentVersion)

    $response = Invoke-RestMethod -Uri $ApiUrl -Method Get -TimeoutSec 15
    $versions = @($response.versions | ForEach-Object {
        try {
            [PSCustomObject]@{
                Text = [string]$_.version
                Parsed = [System.Version][string]$_.version
            }
        } catch { }
    })
    if ($versions.Count -eq 0) { throw 'Version History API returned no valid versions.' }
    $latest = $versions | Sort-Object Parsed -Descending | Select-Object -First 1
    $latestVersion = $latest.Text
    Write-Log ('Latest Google Stable version: {0}' -f $latestVersion)

    if ($currentVersion -and [System.Version]$latestVersion -le [System.Version]$currentVersion) {
        Write-Log ('Version already current: {0}. No build required.' -f $latestVersion)
        Write-Log '=== END: NO BUILD ==='
        exit 0
    }

    Write-Log ('New version detected: {0}. Starting pipeline.' -f $latestVersion)
    Stop-BrowserMultiProcesses
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $Pipeline
    if ($LASTEXITCODE -ne 0) {
        throw "Pipeline failed with exit code $LASTEXITCODE."
    }
    Write-Log ('SUCCESS: build pipeline completed for {0}.' -f $latestVersion)
    Write-Log '=== END: BUILD COMPLETE ==='
    exit 0
}
catch {
    Write-Log ('FAILURE: {0}' -f $_.Exception.Message)
    Write-Log '=== END: FAILURE ==='
    exit 1
}
