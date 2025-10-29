# Exit script on any error
$ErrorActionPreference = "Stop"

$VENV_NAME = "venv"

# Backend setup
Write-Host "Setting up the backend..." -ForegroundColor Red
Set-Location -Path "backend"

python -m venv $VENV_NAME

# Activate the virtual environment
if (Test-Path "$VENV_NAME\Scripts\Activate.ps1") {
    & "$VENV_NAME\Scripts\Activate.ps1"
} else {
    Write-Host "Error: Unable to find the activation script in '$VENV_NAME'." -ForegroundColor Red
    exit 1
}

pip install -r requirements.txt

& deactivate

Set-Location -Path ".."

# Frontend setup
Write-Host "Setting up the frontend..." -ForegroundColor Red
Set-Location -Path "frontend"

if (-Not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}

npm install
Set-Location -Path ".."

# Initialize Husky
Write-Host "Initializing Husky..." -ForegroundColor Red
npx husky install

Write-Host "Setup completed successfully!" -ForegroundColor Green
