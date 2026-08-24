[CmdletBinding()]
param(
    [string]$Root = 'D:\dichchrome',
    [switch]$DryRun = $false,
    [switch]$ForceBuild = $false
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Src = Join-Path $Root 'src'
$ChromiumPatch = Join-Path $Root 'BrowserMulti_chromium_v154.patch'
$V8Patch = Join-Path $Root 'BrowserMulti_v8_v154.patch'
$Benchmark = Join-Path $Root 'auto_benchmark.js'
$DepotTools = Join-Path $Root 'depot_tools'
$VersionFile = Join-Path $Root 'current_version.txt'
$Dist = Join-Path $Root 'dist'
$LogDir = Join-Path $Root 'logs'
$ApiUrl = 'https://versionhistory.googleapis.com/v1/chrome/platforms/win/channels/stable/versions'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$LogPath = Join-Path $LogDir ('auto-sync-build-{0}.log' -f (Get-Date -Format 'yyyyMMdd-HHmmss'))

function Write-Log {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR', 'SUCCESS')]
        [string]$Level = 'INFO'
    )

    $line = '[{0}] [{1}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
    Write-Host $line
    Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
}

function Invoke-NativeCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Description,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Command,
        [string]$WorkingDirectory
    )

    Write-Log "Starting: $Description..."
    $previousErrorActionPreference = $ErrorActionPreference
    $nativePreferenceVariable = Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue
    $previousNativePreference = if ($null -ne $nativePreferenceVariable) {
        $nativePreferenceVariable.Value
    } else {
        $null
    }
    $oldLocation = Get-Location
    $output = @()
    $exitCode = 0

    try {
        $ErrorActionPreference = 'Continue'
        if ($null -ne $nativePreferenceVariable) {
            $PSNativeCommandUseErrorActionPreference = $false
        }
        if ($WorkingDirectory) {
            Set-Location -LiteralPath $WorkingDirectory
        }

        # Native stderr is captured as output; only process exit code decides failure.
        $output = @(& $Command 2>&1)
        $exitCode = $LASTEXITCODE
    }
    finally {
        $ErrorActionPreference = $previousErrorActionPreference
        if ($null -ne $nativePreferenceVariable) {
            $PSNativeCommandUseErrorActionPreference = $previousNativePreference
        }
        Set-Location -LiteralPath $oldLocation
    }

    foreach ($line in $output) {
        $lineString = $line.ToString()
        Add-Content -LiteralPath $LogPath -Value "  [CMD-OUT] $lineString" -Encoding UTF8
        Write-Host "  $lineString" -ForegroundColor Gray
    }

    if ($exitCode -ne 0) {
        throw "Command failed with actual exit code $exitCode at step: $Description"
    }
    Write-Log "Completed: $Description" -Level 'SUCCESS'
}

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FilePath,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments,
        [Parameter(Mandatory = $true)]
        [string]$Step,
        [string]$WorkingDirectory
    )

    if ($DryRun) {
        $location = if ($WorkingDirectory) { $WorkingDirectory } else { (Get-Location).Path }
        Write-Log ("DRY-RUN: [{0}] {1} {2}" -f $location, $FilePath, ($Arguments -join ' '))
        return
    }

    Invoke-NativeCommand -Description $Step -WorkingDirectory $WorkingDirectory -Command {
        & $FilePath @Arguments
    }
}

function Get-VersionParts {
    param([Parameter(Mandatory = $true)][string]$Version)
    return @($Version.Split('.') | ForEach-Object { [int]$_ })
}

function Compare-ChromeVersion {
    param(
        [Parameter(Mandatory = $true)][string]$Left,
        [Parameter(Mandatory = $true)][string]$Right
    )

    $leftParts = Get-VersionParts $Left
    $rightParts = Get-VersionParts $Right
    $length = [Math]::Max($leftParts.Count, $rightParts.Count)
    for ($i = 0; $i -lt $length; $i++) {
        $leftValue = if ($i -lt $leftParts.Count) { $leftParts[$i] } else { 0 }
        $rightValue = if ($i -lt $rightParts.Count) { $rightParts[$i] } else { 0 }
        if ($leftValue -lt $rightValue) { return -1 }
        if ($leftValue -gt $rightValue) { return 1 }
    }
    return 0
}

function Assert-Path {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Description
    )
    if (-not (Test-Path -LiteralPath $Path)) {
        throw ('Missing {0}: {1}' -f $Description, $Path)
    }
}

try {
    Write-Log 'Starting BrowserMulti stable sync/build pipeline.'

    Assert-Path $Src 'Chromium source directory'
    Assert-Path $ChromiumPatch 'BrowserMulti Chromium patch'
    Assert-Path $V8Patch 'BrowserMulti V8 patch'
    Assert-Path $Benchmark 'benchmark script'
    Assert-Path $DepotTools 'depot_tools directory'
    Assert-Path (Join-Path $Src '.git') 'Chromium Git metadata'

    Write-Log ('Querying Chrome Stable versions: {0}' -f $ApiUrl)
    $response = Invoke-RestMethod -Uri $ApiUrl -Method Get
    if ($null -eq $response.versions -or $response.versions.Count -eq 0) {
        throw 'Version History API returned no versions.'
    }

    # Lấy và sắp xếp theo System.Version thực tế (không so sánh chuỗi)
    $validVersions = @()
    foreach ($item in $response.versions) {
        $verStr = [string]$item.version
        try {
            $parsed = [System.Version]$verStr
            $validVersions += [PSCustomObject]@{
                VersionString = $verStr
                ParsedVersion = $parsed
            }
        }
        catch {
            # Bỏ qua nếu có chuỗi version không hợp lệ
        }
    }

    if ($validVersions.Count -eq 0) {
        throw 'Could not parse any valid version from Google API.'
    }

    # Sắp xếp giảm dần theo đối tượng Version
    $latestObj = $validVersions | Sort-Object -Property ParsedVersion -Descending | Select-Object -First 1
    $latestVersion = $latestObj.VersionString
    Write-Log "Latest Google Chrome Stable version: $latestVersion" -Level 'SUCCESS'

    $currentVersion = ''
    if (Test-Path -LiteralPath $VersionFile) {
        $currentVersion = (Get-Content -LiteralPath $VersionFile -Raw).Trim()
    }
    if (-not $ForceBuild -and $currentVersion -and (Compare-ChromeVersion $latestVersion $currentVersion) -le 0) {
        Write-Log 'Đã ở bản mới nhất'
        exit 0
    }

    Write-Log 'New version detected. Source reset will discard local Chromium changes.' 'WARN'
    if ($DryRun) {
        Write-Log 'DRY-RUN: no source, version marker, build output, or release archive will be modified.'
        Invoke-Checked 'git' @('checkout', '.') 'Reset source changes' $Src
        Invoke-Checked 'git' @('clean', '-df') 'Clean untracked source files' $Src
        $existingTag = & git tag -l $latestVersion
        if (-not $existingTag) {
            Invoke-Checked 'git' @('fetch', '--depth=1', 'origin', ('refs/tags/{0}:refs/tags/{0}' -f $latestVersion), '--no-tags') "Fetch single tag $latestVersion" $Src
        } else {
            Write-Log "Tag $latestVersion already exists locally; skipping network fetch." -Level 'SUCCESS'
        }
        Invoke-Checked 'git' @('checkout', ('tags/{0}' -f $latestVersion)) 'Checkout Stable tag' $Src
        Invoke-Checked 'gclient.bat' @('sync', '--with_branch_heads', '--with_tags', '-D') 'Sync Chromium dependencies' $Src
        Invoke-Checked 'git' @('apply', '--3way', '--ignore-whitespace', $ChromiumPatch) 'Apply Chromium patch' $Src
        Invoke-Checked 'git' @('apply', '--3way', '--ignore-whitespace', $V8Patch) 'Apply V8 patch' (Join-Path $Src 'v8')
        $env:PATH = '{0};{1}' -f $DepotTools, $env:PATH
        Invoke-Checked 'autoninja' @('-C', 'out\Default', 'chrome') 'Build BrowserMulti' $Src
        Invoke-Checked 'node' @($Benchmark) 'Run BrowserMulti benchmark' $Root
        Write-Log ("DRY-RUN: Set-Content {0} = {1}" -f $VersionFile, $latestVersion)
        Write-Log ("DRY-RUN: Compress-Archive {0} -> {1}" -f (Join-Path $Src 'out\Default'), (Join-Path $Dist ('browsermulti-{0}-win64.zip' -f $latestVersion)))
        exit 0
    }

    Invoke-Checked 'git' @('checkout', '.') 'Reset source changes' $Src
    Invoke-Checked 'git' @('clean', '-df') 'Clean untracked source files' $Src
    $existingTag = & git tag -l $latestVersion
    if (-not $existingTag) {
        Invoke-Checked 'git' @('fetch', '--depth=1', 'origin', ('refs/tags/{0}:refs/tags/{0}' -f $latestVersion), '--no-tags') "Fetch single tag $latestVersion" $Src
    } else {
        Write-Log "Tag $latestVersion already exists locally; skipping network fetch." -Level 'SUCCESS'
    }
    Invoke-Checked 'git' @('checkout', ('tags/{0}' -f $latestVersion)) 'Checkout Stable tag' $Src
    $env:PATH = '{0};{1}' -f $DepotTools, $env:PATH
    Assert-Path (Join-Path $DepotTools 'gclient.bat') 'gclient command'
    Invoke-Checked 'gclient.bat' @('sync', '--with_branch_heads', '--with_tags', '-D') 'Sync Chromium dependencies' $Src

    Write-Log 'Applying BrowserMulti patch.'
    try {
        Invoke-Checked 'git' @('apply', '--3way', '--ignore-whitespace', $ChromiumPatch) 'Apply Chromium patch' $Src
        Invoke-Checked 'git' @('apply', '--3way', '--ignore-whitespace', $V8Patch) 'Apply V8 patch' (Join-Path $Src 'v8')
    }
    catch {
        Write-Log ('Patch application failed: {0}' -f $_.Exception.Message) 'ERROR'
        try { Invoke-Checked 'git' @('status', '--short') 'Collect Chromium patch conflict status' $Src } catch { Write-Log $_.Exception.Message 'ERROR' }
        try { Invoke-Checked 'git' @('status', '--short') 'Collect V8 patch conflict status' (Join-Path $Src 'v8') } catch { Write-Log $_.Exception.Message 'ERROR' }
        $rejects = Get-ChildItem -LiteralPath $Src -Filter '*.rej' -Recurse -ErrorAction SilentlyContinue
        if ($rejects) {
            Write-Log ('Reject files: {0}' -f (($rejects | Select-Object -ExpandProperty FullName) -join ', ')) 'ERROR'
        }
        throw
    }

    $env:PATH = '{0};{1}' -f $DepotTools, $env:PATH
    Invoke-Checked 'autoninja' @('-C', 'out\Default', 'chrome') 'Build BrowserMulti' $Src
    Invoke-Checked 'node' @($Benchmark) 'Run BrowserMulti benchmark' $Root

    Set-Content -LiteralPath $VersionFile -Value $latestVersion -Encoding UTF8

    $buildOutput = Join-Path $Src 'out\Default'
    Assert-Path $buildOutput 'build output directory'
    New-Item -ItemType Directory -Force -Path $Dist | Out-Null
    $releaseZip = Join-Path $Dist ('browsermulti-{0}-win64.zip' -f $latestVersion)
    $stagingDir = Join-Path $Dist 'staging'
    if (Test-Path -LiteralPath $stagingDir) {
        Remove-Item -LiteralPath $stagingDir -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path $stagingDir | Out-Null
    Write-Log 'Staging BrowserMulti strict runtime whitelist.'
    $coreFiles = @(
        'chrome.exe',
        'chrome.dll',
        'chrome_elf.dll',
        'crashpad_handler.exe',
        'icudtl.dat',
        'v8_context_snapshot.bin',
        'resources.pak',
        'chrome_100_percent.pak',
        'chrome_200_percent.pak',
        'libEGL.dll',
        'libGLESv2.dll',
        'vk_swiftshader.dll',
        'vulkan-1.dll',
        'd3dcompiler_47.dll',
        'dxcompiler.dll',
        'dxil.dll'
    )
    foreach ($file in $coreFiles) {
        $sourcePath = Join-Path $buildOutput $file
        if (Test-Path -LiteralPath $sourcePath) {
            Copy-Item -LiteralPath $sourcePath -Destination $stagingDir -Force
        }
    }
    foreach ($directory in @('locales', 'MEIPreload')) {
        $sourceDirectory = Join-Path $buildOutput $directory
        if (Test-Path -LiteralPath $sourceDirectory) {
            Copy-Item -LiteralPath $sourceDirectory -Destination (Join-Path $stagingDir $directory) -Recurse -Force
        }
    }
    if (Test-Path -LiteralPath $releaseZip) {
        Remove-Item -LiteralPath $releaseZip -Force
    }
    Write-Log ('Compressing release: {0}' -f $releaseZip)
    Compress-Archive -Path (Join-Path $stagingDir '*') -DestinationPath $releaseZip -CompressionLevel Optimal -Force
    Remove-Item -LiteralPath $stagingDir -Recurse -Force
    $zipSizeMB = [math]::Round(((Get-Item -LiteralPath $releaseZip).Length / 1MB), 2)
    Write-Log ('Release archive complete: {0} MB' -f $zipSizeMB) -Level 'SUCCESS'

    Write-Log 'BrowserMulti release ready for GitHub Releases.'
    Write-Log ('Version: {0}' -f $latestVersion)
    Write-Log ('Release ZIP: {0}' -f $releaseZip)
    Write-Log ('Log: {0}' -f $LogPath)
}
catch {
    Write-Log $_.Exception.Message 'ERROR'
    exit 1
}
