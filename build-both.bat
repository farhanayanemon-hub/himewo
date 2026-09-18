@echo off
echo ==============================================
echo Building BOTH HiMewo APKs on your PC...
echo ==============================================
powershell.exe -ExecutionPolicy Bypass -File "%~dp0build-local-apk.ps1" -App both
pause
