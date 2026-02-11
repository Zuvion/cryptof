@echo off
echo ==========================================
echo Starting Backend Server
echo ==========================================

cd backend

echo.
echo Step 1: Checking if dependencies are installed
echo.
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install dependencies
        pause
        exit /b 1
    )
)

echo.
echo Step 2: Starting backend server
echo.
call npm run dev