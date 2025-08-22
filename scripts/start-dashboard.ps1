# PowerShell script to start the Agent Dashboard
# This starts both backend and frontend in separate terminals

Write-Host "Starting Agent Orchestrator Dashboard..." -ForegroundColor Green

# Check if npm is installed
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "Error: npm is not installed. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Check if directories exist
if (-not (Test-Path "backend")) {
    Write-Host "Error: backend directory not found" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "frontend")) {
    Write-Host "Error: frontend directory not found" -ForegroundColor Red
    exit 1
}

# Function to check if port is in use
function Test-Port {
    param($Port)
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    try {
        $tcpClient.Connect("localhost", $Port)
        $tcpClient.Close()
        return $true
    } catch {
        return $false
    }
}

# Check if ports are available
if (Test-Port 3001) {
    Write-Host "Warning: Port 3001 is already in use (backend)" -ForegroundColor Yellow
    $response = Read-Host "Continue anyway? (y/n)"
    if ($response -ne 'y') {
        exit 1
    }
}

if (Test-Port 5173) {
    Write-Host "Warning: Port 5173 is already in use (frontend)" -ForegroundColor Yellow
    $response = Read-Host "Continue anyway? (y/n)"
    if ($response -ne 'y') {
        exit 1
    }
}

# Install dependencies if needed
Write-Host "`nChecking backend dependencies..." -ForegroundColor Cyan
Push-Location backend
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    npm install
}
Pop-Location

Write-Host "`nChecking frontend dependencies..." -ForegroundColor Cyan
Push-Location frontend
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}
Pop-Location

# Start backend in new window
Write-Host "`nStarting backend server on http://localhost:3001" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; Write-Host 'Backend Server' -ForegroundColor Cyan; npm run dev"

# Wait a bit for backend to start
Start-Sleep -Seconds 3

# Start frontend in new window
Write-Host "Starting frontend server on http://localhost:5173" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; Write-Host 'Frontend Server' -ForegroundColor Magenta; npm run dev"

# Wait for services to start
Write-Host "`nWaiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Open browser
Write-Host "`nOpening dashboard in browser..." -ForegroundColor Green
Start-Process "http://localhost:5173"

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "Agent Dashboard is running!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "`nPress Ctrl+C in each terminal window to stop" -ForegroundColor Yellow