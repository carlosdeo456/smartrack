# Run this script as Administrator (right-click PowerShell -> Run as administrator)
# Resets the postgres user password and creates the smartrack database.

$ErrorActionPreference = "Stop"

$pgVersion = "18"
$serviceName = "postgresql-x64-$pgVersion"
$pgBin = "C:\Program Files\PostgreSQL\$pgVersion\bin"
$pgData = "C:\Program Files\PostgreSQL\$pgVersion\data"
$pgHba = Join-Path $pgData "pg_hba.conf"
$psql = Join-Path $pgBin "psql.exe"
$newPassword = "smartrack123"
$backup = "$pgHba.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

if (-not (Test-Path $psql)) {
  Write-Error "psql not found at $psql. Update pgVersion in this script if needed."
}

$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  Write-Error "Run PowerShell as Administrator, then run this script again."
}

Write-Host "Stopping PostgreSQL service..."
Stop-Service $serviceName -Force

Write-Host "Backing up pg_hba.conf..."
Copy-Item $pgHba $backup

Write-Host "Temporarily allowing local trust login..."
$content = Get-Content $pgHba -Raw
$content = $content -replace '127\.0\.0\.1/32\s+scram-sha-256', '127.0.0.1/32            trust'
$content = $content -replace '::1/128\s+scram-sha-256', '::1/128                 trust'
$content = $content -replace '(?m)^local\s+all\s+all\s+scram-sha-256', 'local   all             all                                     trust'
Set-Content -Path $pgHba -Value $content -NoNewline

Write-Host "Starting PostgreSQL service..."
Start-Service $serviceName
Start-Sleep -Seconds 3

Write-Host "Setting new password for postgres user..."
& $psql -U postgres -h localhost -c "ALTER USER postgres WITH PASSWORD '$newPassword';"

Write-Host "Creating smartrack database (if missing)..."
& $psql -U postgres -h localhost -c "SELECT 1 FROM pg_database WHERE datname = 'smartrack'" | Out-Null
$dbExists = & $psql -U postgres -h localhost -tAc "SELECT 1 FROM pg_database WHERE datname = 'smartrack'"
if ($dbExists -ne "1") {
  & $psql -U postgres -h localhost -c "CREATE DATABASE smartrack;"
  Write-Host "Database smartrack created."
} else {
  Write-Host "Database smartrack already exists."
}

Write-Host "Restoring pg_hba.conf security settings..."
Copy-Item $backup $pgHba -Force

Write-Host "Restarting PostgreSQL service..."
Restart-Service $serviceName
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "Done! Use this in backend/.env:"
Write-Host "DATABASE_URL=postgresql://postgres:$newPassword@localhost:5432/smartrack"
Write-Host ""
Write-Host "Next commands (normal PowerShell):"
Write-Host "  cd C:\Users\carlo\OneDrive\Desktop\smartrack"
Write-Host "  npm run migrate"
Write-Host "  npm run dev"
