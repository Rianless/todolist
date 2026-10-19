@echo off
rem Called through savetube://. Starts the server in a minimized window.
cd /d "%~dp0"
start "SaveTube server" /min cmd /c "start.bat"
