# claude-intent installer for Windows
# Run: powershell -ExecutionPolicy Bypass -File install.ps1

Write-Host ""
Write-Host "========================================"
Write-Host "    Installing claude-intent..."
Write-Host "========================================"
Write-Host ""

# Check Node.js
$nodeCheck = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCheck) {
    Write-Host "ERROR: Node.js not found."
    Write-Host "Install from: https://nodejs.org"
    exit 1
}

$nodeVersion = node --version
Write-Host "Found Node.js $nodeVersion"

# Check version >= 18
$major = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($major -lt 18) {
    Write-Host "ERROR: Node.js 18+ required. You have $nodeVersion"
    exit 1
}

# Install npm dependencies
Write-Host ""
Write-Host "Installing dependencies..."
npm install --silent
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: npm install failed"
    exit 1
}

# Install globally
Write-Host "Installing claude-intent globally..."
npm install -g .
if ($LASTEXITCODE -eq 0) {
    Write-Host "Installed globally."
} else {
    Write-Host "Global install failed, trying fallback..."
    $npmBin = "$env:APPDATA\npm"
    if (-not (Test-Path $npmBin)) {
        New-Item -ItemType Directory -Path $npmBin | Out-Null
    }
    $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
    $wrapper = "@echo off`r`nnode `"$scriptRoot\bin\claude-intent.js`" %*"
    Set-Content -Path "$npmBin\claude-intent.cmd" -Value $wrapper
    Write-Host "Installed to $npmBin\claude-intent.cmd"
}

Write-Host ""
Write-Host "========================================"
Write-Host "    Installation complete!"
Write-Host "========================================"
Write-Host ""
Write-Host "Next step - run setup:"
Write-Host "   claude-intent setup"
Write-Host ""
