@echo off
echo ==========================================
echo Starting Frontend Servers
echo ==========================================

echo.
echo Step 1: Installing http-server if not installed
echo.

call npm list -g http-server >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing http-server...
    call npm install -g http-server
)

echo.
echo Step 2: Starting frontend server on port 3000
echo.
start "Frontend Server" cmd /k "cd frontend && http-server -p 3000"

echo.
echo Step 3: Starting admin panel server on port 3001
echo.
start "Admin Panel Server" cmd /k "cd admin-panel && http-server -p 3001"

echo.
echo ==========================================
echo Frontend servers are running!
echo - Frontend: http://localhost:3000
echo - Admin Panel: http://localhost:3001
echo ==========================================

pause