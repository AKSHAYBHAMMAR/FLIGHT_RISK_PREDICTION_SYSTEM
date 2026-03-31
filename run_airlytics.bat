@echo off
echo ========================================================
echo   Airlytics Flight Risk Prediction System (ML BACKEND)
echo ========================================================
echo.
echo Starting Python Backend Server...
start /B python run_backend.py
echo Waiting for backend to initialize (5s)...
timeout /t 5 /nobreak > nul

echo.
echo Launching Dashboard Frontend...
start index.html
echo Application is now running.
echo ========================================================
exit
