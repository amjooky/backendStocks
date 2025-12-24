# Simple CORS Debug Checker
$backendUrl = "https://backend-production-cde7.up.railway.app"

Write-Host "Checking CORS debug configuration..." -ForegroundColor Cyan

# Test new debug endpoint
Write-Host "Testing enhanced debug endpoint..." -ForegroundColor Yellow
try {
    $result = Invoke-RestMethod -Uri "$backendUrl/debug/cors-info" -Method GET
    Write-Host "SUCCESS: Enhanced debug endpoint is available!" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Current Configuration:" -ForegroundColor Cyan
    Write-Host "  Environment: $($result.server.environment)"
    Write-Host "  DEBUG_CORS enabled: $($result.server.debugCorsEnabled)"
    Write-Host "  CORS_ORIGIN env: $($result.server.corsOriginEnv)"
    Write-Host "  FRONTEND_URL env: $($result.server.frontendUrlEnv)"
    Write-Host ""
    
    if ($result.server.debugCorsEnabled -eq $true) {
        Write-Host "DEBUG_CORS is ENABLED - All origins are allowed!" -ForegroundColor Green
        Write-Host "You can now test your frontend requests." -ForegroundColor Green
    } else {
        Write-Host "DEBUG_CORS is DISABLED" -ForegroundColor Yellow
        Write-Host "To enable it:" -ForegroundColor Yellow
        Write-Host "1. Go to Railway dashboard"
        Write-Host "2. Add environment variable: DEBUG_CORS = true"
        Write-Host "3. Wait for redeploy"
    }
    
} catch {
    Write-Host "FAILED: Enhanced debug endpoint not available yet." -ForegroundColor Red
    Write-Host "Railway may still be deploying. Wait a few minutes." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Useful URLs:" -ForegroundColor Cyan
Write-Host "  Debug Info: $backendUrl/debug/cors-info"
Write-Host "  Health: $backendUrl/health"
Write-Host "  API Docs: $backendUrl/api-docs"
