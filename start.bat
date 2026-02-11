@echo off
echo ==========================================
echo Crypto Exchange Platform - Setup Script
echo ==========================================

echo.
echo Step 1: Installing dependencies
echo.

cd backend
call npm install
if %errorlevel% neq 0 (
    echo Error: Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo Step 2: Starting MongoDB (local server)
echo Note: If MongoDB is not installed or running, please install and start it manually
echo.

echo.
echo Step 3: Starting backend server
echo.
start "Backend Server" npm run dev

echo.
echo Step 4: Opening frontend and admin panel
echo.
start "" "http://localhost:3000"
start "" "http://localhost:3001"

echo.
echo ==========================================
echo Setup complete!
echo - Backend server: http://localhost:5000
echo - Frontend: http://localhost:3000
echo - Admin Panel: http://localhost:3001
echo ==========================================

pause