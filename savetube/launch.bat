@echo off
rem 'savetube://' 주소로 불렸을 때 서버 창을 최소화해서 켠다. 이미 켜져 있으면 포트 충돌로 새 창만 닫힌다.
cd /d "%~dp0"
start "SaveTube 서버" /min cmd /c "start.bat"
