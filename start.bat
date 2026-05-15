@echo off
REM Freelance Job Manager - Start Script

echo.
echo ========================================
echo   Freelance Job Manager
echo   Kiếm Tiền Online Dashboard
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env
    echo.
    echo ⚠️  Please edit .env and add your FREELANCER_OAUTH_TOKEN
    echo.
    pause
)

REM Start server
echo Starting server...
echo.
echo 🚀 Dashboard: http://localhost:3000
echo 📡 WebSocket: ws://localhost:3001
echo.
echo Press Ctrl+C to stop
echo.

node backend/server.js

pause
