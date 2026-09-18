@echo off
echo ==============================================
echo Building HiMewo Social APK on your PC...
echo ==============================================
powershell.exe -ExecutionPolicy Bypass -File "%~dp0build-local-apk.ps1" -App social
pause
