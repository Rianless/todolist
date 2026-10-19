@echo off
rem Run this once. It registers the savetube:// address so the todolist app can start the server.
rem (No administrator rights needed.)
set "DIR=%~dp0"
reg add "HKCU\Software\Classes\savetube" /ve /d "URL:SaveTube" /f >nul
reg add "HKCU\Software\Classes\savetube" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\savetube\shell\open\command" /ve /d "\"%DIR%launch.bat\"" /f >nul
if errorlevel 1 (
  echo FAILED to register.
) else (
  echo Registered. The todolist app can now start the SaveTube server by itself.
  echo If you move this folder, run this file again.
)
pause
