@echo off
cd /d "%~dp0"
echo.
echo  SaveTube server is running. Closing this window stops it.
echo.
echo  On your phone, open this address followed by :8000
echo  (example: http://192.168.0.12:8000)
echo.
ipconfig | findstr IPv4
echo.
py -m uvicorn app:app --host 0.0.0.0 --port 8000
if errorlevel 1 python -m uvicorn app:app --host 0.0.0.0 --port 8000
if errorlevel 1 (
  echo.
  echo  Could not start. Install packages once:  py -m pip install -r requirements.txt
)
pause
