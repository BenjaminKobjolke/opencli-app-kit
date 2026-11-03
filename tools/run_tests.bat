@echo off
setlocal
cd /d "%~dp0.."
echo Running unit tests...
bun test
set TESTRESULT=%ERRORLEVEL%
exit /b %TESTRESULT%
