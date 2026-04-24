# PowerShell startup script for uvicorn with proper venv handling

$venvDir = Join-Path $PSScriptRoot "venv"
$venvPython = Join-Path $venvDir "Scripts\python.exe"

# Verify venv exists
if (-not (Test-Path $venvPython)) {
    Write-Error "Virtual environment not found at $venvDir"
    Write-Host "Please create it with: python -m venv venv" -ForegroundColor Yellow
    pause
    exit 1
}

# Get venv site-packages and set PYTHONPATH
$sitePackages = & $venvPython -c "import site; print(site.getsitepackages()[0])"
$env:PYTHONPATH = "$sitePackages;$($env:PYTHONPATH)"

# Run uvicorn with venv Python (without --reload to avoid subprocess issues)
& $venvPython -m uvicorn app.main:app --host 0.0.0.0 --port 8000
