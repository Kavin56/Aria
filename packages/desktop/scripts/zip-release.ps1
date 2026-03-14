# Create a single shareable zip from target/release so you can give users one file.
# They extract it and run openwork.exe from the extracted folder.
# Run from repo root: .\packages\desktop\scripts\zip-release.ps1
# Or from packages/desktop: .\scripts\zip-release.ps1

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$releaseDir = Join-Path $scriptDir "..\src-tauri\target\release"
$zipPath = Join-Path $releaseDir "OpenWork-portable.zip"

if (-not (Test-Path $releaseDir)) {
  Write-Error "Release folder not found: $releaseDir. Run 'pnpm run build' from packages/desktop first."
}

$exes = @(
  "openwork.exe",
  "opencode.exe",
  "openwork-server.exe",
  "opencode-router.exe",
  "openwork-orchestrator.exe",
  "chrome-devtools-mcp.exe",
  "versions.json.exe"
)

$toZip = @()
foreach ($name in $exes) {
  $p = Join-Path $releaseDir $name
  if (Test-Path $p) { $toZip += $p }
}
# Include any .dll in release (needed at runtime)
Get-ChildItem -Path $releaseDir -Filter "*.dll" -File | ForEach-Object { $toZip += $_.FullName }

if ($toZip.Count -eq 0) {
  Write-Error "No exe files found in $releaseDir"
}

# Remove old zip if present
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Compress-Archive -Path $toZip -DestinationPath $zipPath -CompressionLevel Optimal
$sizeMB = (Get-Item $zipPath).Length / 1MB
Write-Host "Created: $zipPath"
Write-Host ("Size: {0:N2} MB" -f $sizeMB)
Write-Host "Share this single file. Users extract the zip and run openwork.exe from the extracted folder."
