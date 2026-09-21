# =============================================================================
# Aegis Map — Supabase Production Setup Script (PowerShell)
# =============================================================================

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Aegis Map — Supabase Production Setup" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$schemaFile = Join-Path $PSScriptRoot "..\supabase\production-schema.sql"

if (-not (Test-Path $schemaFile)) {
    Write-Host "Generating consolidated schema..." -ForegroundColor Yellow
    node (Join-Path $PSScriptRoot "build-production-schema.mjs")
}

$dbUrl = $env:DATABASE_URL

if (-not $dbUrl) {
    $envProd = Join-Path $PSScriptRoot "..\.env.production"
    $envDev = Join-Path $PSScriptRoot "..\.env"
    
    if (Test-Path $envProd) {
        Get-Content $envProd | ForEach-Object {
            if ($_ -match '^DATABASE_URL=(.+)$') {
                $dbUrl = $matches[1].Trim().Trim('"').Trim("'")
            }
        }
    } elseif (Test-Path $envDev) {
        Get-Content $envDev | ForEach-Object {
            if ($_ -match '^DATABASE_URL=(.+)$') {
                $dbUrl = $matches[1].Trim().Trim('"').Trim("'")
            }
        }
    }
}

if ($dbUrl -and (Get-Command psql -ErrorAction SilentlyContinue)) {
    Write-Host "Applying production schema using psql..." -ForegroundColor Green
    & psql "$dbUrl" -f "$schemaFile"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migrations applied successfully to production Supabase database!" -ForegroundColor Green
        exit 0
    }
}

Write-Host ""
Write-Host "You can apply the production schema directly in your Supabase Dashboard:" -ForegroundColor Cyan
Write-Host "  1. Open your Supabase Dashboard: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "  2. Go to 'SQL Editor' -> 'New Query'" -ForegroundColor White
Write-Host "  3. Paste the contents of: supabase\production-schema.sql" -ForegroundColor Yellow
Write-Host "  4. Click 'Run'" -ForegroundColor Green
Write-Host ""
Write-Host "Schema file location: $schemaFile" -ForegroundColor Gray
