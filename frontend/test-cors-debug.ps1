# CORS Debug Testing Script
# Run this after Railway has redeployed with the updated server code

$backendUrl = "https://backend-production-cde7.up.railway.app"

Write-Host "🔍 Testing CORS Debug Configuration..." -ForegroundColor Cyan
Write-Host ""

# Test if the new debug endpoint exists
Write-Host "1. Checking if enhanced debug endpoint is available..." -ForegroundColor Yellow
try {
    $corsInfo = Invoke-RestMethod -Uri "$backendUrl/debug/cors-info" -Method GET
    Write-Host "✅ Enhanced debug endpoint is available!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Current Configuration:" -ForegroundColor Cyan
    Write-Host "  Environment: $($corsInfo.server.environment)"
    Write-Host "  DEBUG_CORS: $($corsInfo.server.debugCorsEnabled)"
    Write-Host "  CORS_ORIGIN: $($corsInfo.server.corsOriginEnv)"
    Write-Host "  FRONTEND_URL: $($corsInfo.server.frontendUrlEnv)"
    Write-Host "  Allowed Origins: $($corsInfo.server.allowedOrigins -join ', ')"
    Write-Host ""
    $endpointAvailable = $true
}
catch {
    Write-Host "❌ Enhanced debug endpoint not yet available. Railway may still be deploying..." -ForegroundColor Red
    Write-Host "   Waiting for deployment to complete. Try again in a few minutes." -ForegroundColor Yellow
    Write-Host ""
    $endpointAvailable = $false
}

# Check basic health
Write-Host "2. Checking server health..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$backendUrl/health" -Method GET
    Write-Host "✅ Server is healthy!" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Server health check failed!" -ForegroundColor Red
    Write-Host ""
}

# Show instructions
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host ""

if ($endpointAvailable) {
    if ($corsInfo.server.debugCorsEnabled -eq $false) {
        Write-Host "📝 To enable DEBUG_CORS mode in Railway:" -ForegroundColor Yellow
        Write-Host "   1. Go to Railway dashboard -> your backend project"
        Write-Host "   2. Go to Variables tab"
        Write-Host "   3. Add: DEBUG_CORS = true"
        Write-Host "   4. Railway will automatically redeploy"
        Write-Host ""
        Write-Host "🔄 After enabling DEBUG_CORS=true:" -ForegroundColor Yellow
        Write-Host "   - All origins will be allowed (temporary)"
        Write-Host "   - Test your frontend to see if requests work"
        Write-Host "   - Check Railway logs for detailed CORS debugging"
        Write-Host ""
    }
    else {
        Write-Host "✅ DEBUG_CORS is already enabled!" -ForegroundColor Green
        Write-Host "   - All origins are currently allowed"
        Write-Host "   - Test your frontend now"
        Write-Host "   - Check Railway logs for detailed information"
        Write-Host ""
    }
}
else {
    Write-Host "⌛ Wait for deployment to complete, then run this script again." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "📋 Useful URLs:" -ForegroundColor Cyan
Write-Host "   Debug Info: $backendUrl/debug/cors-info"
Write-Host "   Health Check: $backendUrl/health"
Write-Host "   API Docs: $backendUrl/api-docs"
Write-Host ""

Write-Host "💡 Remember to disable DEBUG_CORS after debugging!" -ForegroundColor Magenta
