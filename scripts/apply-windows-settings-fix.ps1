param(
    [string]$InstallRoot = (Join-Path $env:LOCALAPPDATA 'Programs\noname'),
    [string]$Rollback
)
$ErrorActionPreference = 'Stop'
$appRoot = [IO.Path]::GetFullPath((Join-Path $InstallRoot 'resources\app'))
if (-not (Test-Path -LiteralPath (Join-Path $appRoot 'noname.js'))) { throw 'Cannot find the installed game.' }
$running = Get-CimInstance Win32_Process -Filter "name='noname.exe'" | Where-Object {
    $_.ExecutablePath -and [IO.Path]::GetFullPath($_.ExecutablePath).Equals([IO.Path]::GetFullPath((Join-Path $InstallRoot 'noname.exe')), [StringComparison]::OrdinalIgnoreCase)
}
if ($running) { throw 'Please close the installed game before applying or rolling back this patch.' }
function Resolve-PatchFile([string]$base, [string]$name) {
    if ($name -notmatch '^(game|noname/util|extension)/' -or $name -match '(^|/)\.\.(/|$)|[\\:]') { throw "Invalid patch path: $name" }
    $result = [IO.Path]::GetFullPath((Join-Path $base $name))
    if (-not $result.StartsWith($base.TrimEnd('\') + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Patch path escapes its directory.' }
    return $result
}
function Get-PatchHash([string]$file) {
    if (Test-Path -LiteralPath $file -PathType Leaf) { return (Get-FileHash -LiteralPath $file -Algorithm SHA256).Hash.ToLowerInvariant() }
    return $null
}
function Restore-Patch([string]$directory) {
    $record = Get-Content -LiteralPath (Join-Path $directory 'backup.json') -Raw -Encoding UTF8 | ConvertFrom-Json
    if ($record.appRoot -ne $appRoot) { throw 'Backup belongs to another installation.' }
    foreach ($file in $record.files) {
        $target = Resolve-PatchFile $appRoot $file.path
        if ($file.existed) {
            $source = Resolve-PatchFile (Join-Path $directory 'files') $file.path
            if ((Get-PatchHash $source) -ne $file.sha256) { throw "Backup checksum mismatch: $($file.path)" }
        }
    }
    foreach ($file in $record.files) {
        $target = Resolve-PatchFile $appRoot $file.path
        if ($file.existed) { Copy-Item -LiteralPath (Resolve-PatchFile (Join-Path $directory 'files') $file.path) -Destination $target -Force }
        elseif (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target }
    }
    Write-Output "Restored program files from $directory"
}
if ($Rollback) { Restore-Patch ([IO.Path]::GetFullPath($Rollback)); exit 0 }
$manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$pending = @()
foreach ($file in $manifest.files) {
    $source = Resolve-PatchFile (Join-Path $PSScriptRoot 'files') $file.path
    if ((Get-PatchHash $source) -ne $file.sha256) { throw "Patch checksum mismatch: $($file.path)" }
    $target = Resolve-PatchFile $appRoot $file.path
    $current = Get-PatchHash $target
    if ($current -eq $file.sha256) { continue }
    if ($current -ne $file.beforeSha256) { throw "Installed file differs from the expected version: $($file.path)" }
    $pending += $file
}
if (-not $pending.Count) { Write-Output 'Patch is already installed.'; exit 0 }
$backup = Join-Path $InstallRoot ('fork-fix-backups\settings-ban-' + (Get-Date -Format 'yyyyMMdd-HHmmss-fff'))
New-Item -ItemType Directory -Path $backup -Force | Out-Null
$records = @()
foreach ($file in $pending) {
    $target = Resolve-PatchFile $appRoot $file.path
    $existed = Test-Path -LiteralPath $target
    if ($existed) {
        $copy = Resolve-PatchFile (Join-Path $backup 'files') $file.path
        New-Item -ItemType Directory -Path (Split-Path $copy) -Force | Out-Null
        Copy-Item -LiteralPath $target -Destination $copy
    }
    $records += @{ path = $file.path; existed = $existed; sha256 = (Get-PatchHash $target) }
}
@{ appRoot = $appRoot; files = $records } | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath (Join-Path $backup 'backup.json') -Encoding UTF8
try {
    foreach ($file in $pending) {
        $target = Resolve-PatchFile $appRoot $file.path
        New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
        Copy-Item -LiteralPath (Resolve-PatchFile (Join-Path $PSScriptRoot 'files') $file.path) -Destination $target -Force
        if ((Get-PatchHash $target) -ne $file.sha256) { throw "Installed checksum mismatch: $($file.path)" }
    }
} catch {
    Restore-Patch $backup
    throw
}
Write-Output "Installed $($pending.Count) program files. Restart the game. Backup: $backup"
