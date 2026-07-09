#Requires -Version 5.1
<#
.SYNOPSIS
  Set up a permanent Cloudflare Named Tunnel for SmartTrack API.

.DESCRIPTION
  - Installs cloudflared (winget)
  - Logs in to Cloudflare
  - Creates tunnel "smartrack-api"
  - Routes api.<your-domain> to localhost:5000
  - Installs cloudflared as a Windows service (starts on boot)

  You need:
  - A domain added to Cloudflare (free Cloudflare account)
  - Backend running on http://localhost:5000
#>

$ErrorActionPreference = 'Stop'
$TUNNEL_NAME = 'smartrack-api'
$API_SUBDOMAIN = 'api'

Write-Host "`n=== SmartTrack Permanent Cloudflare Tunnel ===`n" -ForegroundColor Cyan

# 1. Install cloudflared
if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Write-Host "Installing cloudflared via winget..." -ForegroundColor Yellow
  winget install --id Cloudflare.cloudflared -e --accept-source-agreements --accept-package-agreements
  $env:Path = [System.Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path', 'User')
}

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Write-Host "ERROR: cloudflared not found. Install manually: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/" -ForegroundColor Red
  exit 1
}

Write-Host "cloudflared version: $(cloudflared --version)" -ForegroundColor Green

# 2. Ensure .cloudflared directory
$cfDir = Join-Path $env:USERPROFILE '.cloudflared'
New-Item -ItemType Directory -Force -Path $cfDir | Out-Null

# 3. Login (opens browser)
Write-Host "`nStep 1: Log in to Cloudflare (browser will open)..." -ForegroundColor Yellow
cloudflared tunnel login

# 4. Create tunnel if not exists
Write-Host "`nStep 2: Create tunnel '$TUNNEL_NAME'..." -ForegroundColor Yellow
$existing = cloudflared tunnel list 2>&1 | Out-String
if ($existing -notmatch $TUNNEL_NAME) {
  cloudflared tunnel create $TUNNEL_NAME
} else {
  Write-Host "Tunnel '$TUNNEL_NAME' already exists." -ForegroundColor Green
}

# Get tunnel ID
$listJson = cloudflared tunnel list --output json 2>&1 | Out-String
$tunnelId = $null
try {
  $tunnels = $listJson | ConvertFrom-Json
  $tunnel = $tunnels | Where-Object { $_.name -eq $TUNNEL_NAME } | Select-Object -First 1
  if ($tunnel) { $tunnelId = $tunnel.id }
} catch {
  $match = [regex]::Match($listJson, '([0-9a-f-]{36})')
  if ($match.Success) { $tunnelId = $match.Groups[1].Value }
}

if (-not $tunnelId) {
  Write-Host "Could not read tunnel ID. Run: cloudflared tunnel list" -ForegroundColor Red
  exit 1
}

Write-Host "Tunnel ID: $tunnelId" -ForegroundColor Green

# 5. Domain
Write-Host "`nStep 3: Enter your domain (must be on Cloudflare DNS, e.g. smartrack.co.tz or mysite.com):" -ForegroundColor Yellow
$domain = Read-Host "Domain"
$domain = $domain.Trim().ToLower().Replace('https://', '').Replace('http://', '').TrimEnd('/')
$hostname = "$API_SUBDOMAIN.$domain"

# 6. Write config.yml
$credFile = Join-Path $cfDir "$tunnelId.json"
$configPath = Join-Path $cfDir 'config.yml'
$config = @"
tunnel: $tunnelId
credentials-file: $credFile

ingress:
  - hostname: $hostname
    service: http://localhost:5000
  - service: http_status:404
"@
Set-Content -Path $configPath -Value $config -Encoding UTF8
Write-Host "Wrote $configPath" -ForegroundColor Green

# 7. DNS route
Write-Host "`nStep 4: Creating DNS route $hostname ..." -ForegroundColor Yellow
cloudflared tunnel route dns $TUNNEL_NAME $hostname

# 8. Install as Windows service
Write-Host "`nStep 5: Installing cloudflared Windows service..." -ForegroundColor Yellow
cloudflared service install 2>&1 | Out-Null
Start-Service cloudflared -ErrorAction SilentlyContinue

$apiUrl = "https://$hostname"

Write-Host "`n=== DONE ===" -ForegroundColor Green
Write-Host "Permanent API URL: $apiUrl" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Start backend: npm run dev"
Write-Host "2. Test: $apiUrl/health"
Write-Host "3. Edit frontend/public/config.js -> API_URL and SOCKET_URL = $apiUrl"
Write-Host "4. Add to backend/.env CORS_ORIGINS: $apiUrl"
Write-Host "5. Redeploy: npm run deploy:firebase"
Write-Host ""

# Save URL for reference
$urlFile = Join-Path $PSScriptRoot '..' 'PERMANENT_API_URL.txt'
Set-Content -Path $urlFile -Value $apiUrl
Write-Host "Saved URL to $urlFile`n" -ForegroundColor Gray
