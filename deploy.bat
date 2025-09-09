@echo off
echo ========================================
echo    HealthVolt - Netlify Deployment
echo ========================================
echo.

echo Step 1: Installing dependencies...
call npm install
if errorlevel 1 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Building the project...
call npm run build
if errorlevel 1 (
    echo Error: Build failed
    pause
    exit /b 1
)

echo.
echo Step 3: Build completed successfully!
echo.
echo Your project is ready for deployment.
echo The 'dist' folder contains all the files needed for Netlify.
echo.
echo Next steps:
echo 1. Go to https://netlify.com
echo 2. Drag and drop the 'dist' folder
echo 3. Set environment variables in Netlify dashboard
echo.
echo Environment variables needed:
echo - VITE_SUPABASE_URL
echo - VITE_SUPABASE_ANON_KEY
echo.
pause
