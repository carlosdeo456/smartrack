#Requires -Version 5.1
param(
  [Parameter(Mandatory = $true)]
  [string]$ApkPath,

  [Parameter(Mandatory = $true)]
  [string]$AppId,

  [string]$Groups = 'testers',
  [string]$ReleaseNotes = 'SmartTrack mobile build'
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ApkPath)) {
  Write-Host "APK not found: $ApkPath" -ForegroundColor Red
  exit 1
}

$repoRoot = Split-Path $PSScriptRoot -Parent
Push-Location $repoRoot

Write-Host "Distributing $ApkPath to Firebase App Distribution..." -ForegroundColor Cyan
npx firebase appdistribution:distribute $ApkPath `
  --app $AppId `
  --groups $Groups `
  --release-notes $ReleaseNotes

Pop-Location
Write-Host "Done. Testers in group '$Groups' will receive an invite email." -ForegroundColor Green
