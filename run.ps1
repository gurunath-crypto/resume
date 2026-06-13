# One-shot launcher for the CV Builder (Windows PowerShell).
# Usage:  .\run.ps1
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    python -m venv .venv
    .\.venv\Scripts\python.exe -m pip install --upgrade pip
    .\.venv\Scripts\pip.exe install -r requirements.txt
    Write-Host "Installing Chromium for PDF export..." -ForegroundColor Cyan
    .\.venv\Scripts\python.exe -m playwright install chromium
}

if (-not (Test-Path ".env")) {
    Write-Host "No .env found. Copy .env.example to .env and add your ANTHROPIC_API_KEY." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env — edit it now, then re-run." -ForegroundColor Yellow
    exit 1
}

Write-Host "Starting CV Builder on http://localhost:8000 ..." -ForegroundColor Green
.\.venv\Scripts\python.exe -m uvicorn main:app --app-dir backend --port 8000
