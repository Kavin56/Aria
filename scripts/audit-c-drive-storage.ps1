# OpenWork / pnpm dev – C: drive storage audit
# Run in PowerShell to see which known locations use space on C:
#   .\scripts\audit-c-drive-storage.ps1
# Or from repo root:  powershell -File scripts/audit-c-drive-storage.ps1

$ErrorActionPreference = "SilentlyContinue"

$locations = @(
  # Temp – often the largest (leftover from prepare-sidecar and dev runs)
  @{ Name = "Temp: openwork-tauri-* (Cargo dev build)"; Path = "$env:TEMP\openwork-tauri-*" },
  @{ Name = "Temp: opencode-* (prepare-sidecar zip/extract)"; Path = "$env:TEMP\opencode-*" },
  @{ Name = "Temp: openwork-orchestrator-opencode-*"; Path = "$env:TEMP\openwork-orchestrator-opencode-*" },
  # OpenWork app & orchestrator
  @{ Name = ".openwork/openwork-orchestrator-dev (sidecars, DBs, opencode-dev)"; Path = "$env:USERPROFILE\.openwork\openwork-orchestrator-dev" },
  @{ Name = ".openwork/openwork-orchestrator"; Path = "$env:USERPROFILE\.openwork\openwork-orchestrator" },
  @{ Name = "AppData Roaming OpenWork (opencode-dev, workspace state)"; Path = "$env:APPDATA\com.differentai.openwork" },
  @{ Name = "AppData Local OpenWork (cache)"; Path = "$env:LOCALAPPDATA\com.differentai.openwork" },
  # Rust/Cargo – can be 10–30+ GB
  @{ Name = ".cargo (registry + git cache)"; Path = "$env:USERPROFILE\.cargo" },
  @{ Name = ".rustup (toolchains)"; Path = "$env:USERPROFILE\.rustup" },
  # Node/pnpm
  @{ Name = "pnpm store (Local)"; Path = "$env:LOCALAPPDATA\pnpm\store" },
  @{ Name = "pnpm store (home)"; Path = "$env:USERPROFILE\.pnpm-store" },
  @{ Name = "npm cache"; Path = "$env:APPDATA\npm-cache" },
  # Cursor (if you use Cursor for this repo)
  @{ Name = "Cursor cache"; Path = "$env:APPDATA\Cursor\Cache" },
  @{ Name = "Cursor CachedData"; Path = "$env:APPDATA\Cursor\CachedData" },
  @{ Name = "Cursor CachedExtensions"; Path = "$env:APPDATA\Cursor\CachedExtensions" }
)

function Get-SizeMB {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) { return $null }
  $size = (Get-ChildItem -LiteralPath $Path -Recurse -File -ErrorAction SilentlyContinue | Measure-Object -Property Length -Sum).Sum
  if ($null -eq $size) { return $null }
  [math]::Round($size / 1MB, 2)
}

Write-Host ""
Write-Host "OpenWork / pnpm dev – C: drive storage audit" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

$total = 0
foreach ($loc in $locations) {
  $path = $loc.Path
  # Resolve wildcards to first match for size (e.g. openwork-tauri-*)
  if ($path -match '\*') {
    $resolved = Get-Item $path -ErrorAction SilentlyContinue
    if (-not $resolved) {
      Write-Host ("  {0,-55} (not found)" -f $loc.Name)
      continue
    }
    $size = 0
    foreach ($r in $resolved) {
      $s = Get-SizeMB -Path $r.FullName
      if ($null -ne $s) { $size += $s }
    }
    if ($size -eq 0) {
      Write-Host ("  {0,-55} (empty or not found)" -f $loc.Name)
    } else {
      Write-Host ("  {0,-55} {1,10} MB" -f $loc.Name, $size)
      $total += $size
    }
  } else {
    $size = Get-SizeMB -Path $path
    if ($null -eq $size) {
      Write-Host ("  {0,-55} (not found)" -f $loc.Name)
    } else {
      Write-Host ("  {0,-55} {1,10} MB" -f $loc.Name, $size)
      $total += $size
    }
  }
}

Write-Host ""
Write-Host ("  Total (above): {0} MB" -f [math]::Round($total, 2)) -ForegroundColor Yellow
Write-Host ""
Write-Host "Cleanup: see docs/DEV-STORAGE-C-DRIVE.md for safe delete commands." -ForegroundColor Gray
Write-Host ""
