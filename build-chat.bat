@echo off
echo ==============================================
echo Building HiMewo Chat APK on your PC...
echo ==============================================
powershell.exe -ExecutionPolicy Bypass -File "%~dp0build-local-apk.ps1" -App chat
pause
