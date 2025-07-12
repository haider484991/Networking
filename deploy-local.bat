@echo off
echo Starting ISP Bandwidth Tracker for Client Demo...
echo.

echo Step 1: Starting Backend Services...
docker-compose up -d
echo Backend services started!
echo.

echo Step 2: Starting Frontend...
cd frontend
start /b npm run dev
echo Frontend starting at http://localhost:3000
echo.

echo Step 3: Waiting for services to be ready...
timeout /t 10 /nobreak > nul

echo.
echo ========================================
echo   ISP BANDWIDTH TRACKER - LIVE DEMO
echo ========================================
echo.
echo Frontend: http://localhost:3000
echo API Backend: http://localhost:8000
echo.
echo Press any key to open the demo in browser...
pause > nul

start http://localhost:3000

echo.
echo Demo is now running!
echo Press Ctrl+C to stop the demo when finished.
pause 