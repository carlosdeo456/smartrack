#Requires -Version 5.1
<#
.SYNOPSIS
  Set up a permanent Cloudflare Named Tunnel for SmartTrack API.
#>

$TUNNEL_NAME = 'smartrack-api'
$API_SUBDOMAIN = 'api'
$cfDir = Join-Path $env:USERPROFILE '.cloudflared'
$certPath = Join-Path $cfDir 'cert.pem'

Write-Host "`n=== SmartTrack Permanent Cloudflare Tunnel ===`n" -ForegroundColor Cyan

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Write-Host "Installing cloudflared via winget..." -ForegroundColor Yellow
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')
}

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: cloudflared not found." -ForegroundColor Red
  exit 1
}

Write-Host "cloudflared: $(cloudflared --version)" -ForegroundColor Green
New-Item -ItemType Directory -Force -Path $cfDir | Out-Null

function Ensure-Cert {
  if (Test-Path $certPath) {
    Write-Host "Cloudflare cert found: $certPath" -ForegroundColor Green
    return $true
  }

  $downloads = Join-Path $env:USERPROFILE 'Downloads'
  $downloaded = Get-ChildItem -Path $downloads -Filter '*.pem' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1

  if ($downloaded) {
    Write-Host "Found downloaded cert: $($downloaded.FullName)" -ForegroundColor Yellow
    Copy-Item $downloaded.FullName $certPath -Force
    Write-Host "Copied to $certPath" -ForegroundColor Green
    return $true
  }

  Write-Host "`nStep 1: Cloudflare login (browser opens — pick your domain zone)" -ForegroundColor Yellow
  Write-Host "If login fails, run PowerShell AS ADMINISTRATOR and try again.`n" -ForegroundColor Gray
  cloudflared tunnel login

  if (Test-Path $certPath) { return $true }

  $downloaded = Get-ChildItem -Path $downloads -Filter '*.pem' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if ($downloaded) {
    Copy-Item $downloaded.FullName $certPath -Force
    Write-Host "Copied cert to $certPath" -ForegroundColor Green
    return $true
  }

  Write-Host "`nERROR: cert.pem missing at $certPath" -ForegroundColor Red
  Write-Host "Fix: Run this terminal as Administrator, then:" -ForegroundColor Yellow
  Write-Host "  cloudflared tunnel login"
  Write-Host "Or copy the downloaded .pem file from Downloads to:" -ForegroundColor Yellow
  Write-Host "  $certPath"
  return $false
}

if (-not (Ensure-Cert)) { exit 1 }

Write-Host "`nStep 2: Create tunnel '$TUNNEL_NAME'..." -ForegroundColor Yellow
$listOut = cloudflared tunnel list 2>&1 | Out-String
if ($listOut -notmatch $TUNNEL_NAME) {
  cloudflared tunnel create $TUNNEL_NAME
  if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to create tunnel." -ForegroundColor Red
    exit 1
  }
} else {
  Write-Host "Tunnel '$TUNNEL_NAME' already exists." -ForegroundColor Green
}

$listJson = cloudflared tunnel list --output json 2>&1 | Out-String
$tunnelId = $null
try {
  $tunnels = $listJson | ConvertFrom-Json
  $t = $tunnels | Where-Object { $_.name -eq $TUNNEL_NAME } | Select-Object -First 1
  if ($t) { $tunnelId = $t.id }
} catch {
  if ($listJson -match '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})') {
    $tunnelId = $Matches[1]
  }
}

if (-not $tunnelId) {
  Write-Host "Could not read tunnel ID. Run: cloudflared tunnel list" -ForegroundColor Red
  exit 1
}

Write-Host "Tunnel ID: $tunnelId" -ForegroundColor Green

Write-Host "`nStep 3: Enter your domain on Cloudflare (e.g. example.com):" -ForegroundColor Yellow
$domain = Read-Host "Domain"
$domain = $domain.Trim().ToLower().Replace('https://', '').Replace('http://', '').TrimEnd('/')
$hostname = "$API_SUBDOMAIN.$domain"

$credFile = Join-Path $cfDir "$tunnelId.json"
$configPath = Join-Path $cfDir 'config.yml'
@"
tunnel: $tunnelId
credentials-file: $credFile

ingress:
  - hostname: $hostname
    service: http://localhost:5000
  - service: http_status:404
"@ | Set-Content -Path $configPath -Encoding UTF8

Write-Host "Wrote $configPath" -ForegroundColor Green

Write-Host "`nStep 4: DNS route $hostname ..." -ForegroundColor Yellow
cloudflared tunnel route dns $TUNNEL_NAME $hostname

Write-Host "`nStep 5: Install cloudflared Windows service..." -ForegroundColor Yellow
cloudflared service install 2>&1 | Out-Null
Start-Service cloudflared -ErrorAction SilentlyContinue

$apiUrl = "https://$hostname"
Write-Host "`n=== DONE ===" -ForegroundColor Green
Write-Host "Permanent API URL: $apiUrl" -ForegroundColor Cyan
Write-Host "`n1. npm run dev (if not already running)"
Write-Host "2. Test: $apiUrl/health"
Write-Host "3. Update frontend/public/config.js"
Write-Host "4. npm run deploy:firebase`n"

Set-Content -Path (Join-Path $PSScriptRoot '..' 'PERMANENT_API_URL.txt') -Value $apiUrl
