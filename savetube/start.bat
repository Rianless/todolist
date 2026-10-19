@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo  SaveTube 서버를 켰어요. 이 창을 닫으면 꺼져요.
echo.
echo  폰 크롬에서 아래 주소 뒤에 :8000 을 붙여 접속하세요.
echo  (예: http://192.168.0.12:8000)
echo.
ipconfig | findstr IPv4
echo.
py -m uvicorn app:app --host 0.0.0.0 --port 8000
pause
