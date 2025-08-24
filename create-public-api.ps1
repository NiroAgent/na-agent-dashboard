# Create a public API endpoint for the dashboard
# This PowerShell script starts the API server with ngrok for public access

Write-Host "Starting Live Agent API with Public Access..."

# Kill any existing servers
Get-Process | Where-Object { $_.Name -eq "node" -and $_.CommandLine -like "*minimal-server*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# Start the minimal API server
$apiJob = Start-Job -ScriptBlock {
    Set-Location "E:\Projects\NiroAgent\na-agent-dashboard"
    $env:PORT = "7779"
    node minimal-server.js
}

Write-Host "API Server started on port 7779"
Start-Sleep -Seconds 3

# Test the API
try {
    $response = Invoke-RestMethod -Uri "http://localhost:7779/api/health"
    Write-Host "API Health Check: $($response.status)"
    Write-Host "Service: $($response.service)"
    Write-Host "Agents: $($response.agents)"
} catch {
    Write-Host "API Health Check Failed: $_"
    exit 1
}

Write-Host "Live Agent API is ready!"
Write-Host "Local URL: http://localhost:7779"
Write-Host ""
Write-Host "Endpoints:"
Write-Host "  Health: http://localhost:7779/health"
Write-Host "  Agents: http://localhost:7779/api/dashboard/agents"
Write-Host ""
Write-Host "Press Ctrl+C to stop the server"

# Keep the script running
try {
    while ($true) {
        Start-Sleep -Seconds 30
        $response = Invoke-RestMethod -Uri "http://localhost:7779/api/health" -ErrorAction SilentlyContinue
        if ($response) {
            Write-Host "$(Get-Date) - API Running - Agents: $($response.agents)"
        }
    }
} catch {
    Write-Host "Shutting down..."
} finally {
    Stop-Job -Job $apiJob -ErrorAction SilentlyContinue
    Remove-Job -Job $apiJob -ErrorAction SilentlyContinue
}