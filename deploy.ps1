Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    HealthVolt - Netlify Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Installing dependencies..." -ForegroundColor Yellow
try {
    npm install
    Write-Host "✓ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "✗ Error: Failed to install dependencies" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Step 2: Building the project..." -ForegroundColor Yellow
try {
    npm run build
    Write-Host "✓ Build completed successfully!" -ForegroundColor Green
} catch {
    Write-Host "✗ Error: Build failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "🚀 Your project is ready for deployment!" -ForegroundColor Green
Write-Host ""
Write-Host "The 'dist' folder contains all the files needed for Netlify." -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://netlify.com" -ForegroundColor White
Write-Host "2. Click 'New site from Git' or drag and drop the 'dist' folder" -ForegroundColor White
Write-Host "3. Set environment variables in Netlify dashboard:" -ForegroundColor White
Write-Host "   - VITE_SUPABASE_URL" -ForegroundColor Yellow
Write-Host "   - VITE_SUPABASE_ANON_KEY" -ForegroundColor Yellow
Write-Host ""
Write-Host "🔗 Deployment Guide: See README_DEPLOYMENT.md for detailed instructions" -ForegroundColor Magenta
Write-Host ""
Read-Host "Press Enter to exit"
