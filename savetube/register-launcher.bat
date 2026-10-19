@echo off
chcp 65001 >nul
rem 한 번만 실행하세요. 할 일 앱의 SaveTube 카드가 'savetube://' 주소로 서버를 켤 수 있게 윈도우에 등록합니다. (관리자 권한 불필요)
set "DIR=%~dp0"
reg add "HKCU\Software\Classes\savetube" /ve /d "URL:SaveTube" /f >nul
reg add "HKCU\Software\Classes\savetube" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\savetube\shell\open\command" /ve /d "\"%DIR%launch.bat\"" /f >nul
echo 등록했어요. 이제 할 일 앱에서 SaveTube를 쓰면 서버가 알아서 켜져요.
echo (이 폴더를 옮기면 이 파일을 다시 실행해 주세요.)
pause
