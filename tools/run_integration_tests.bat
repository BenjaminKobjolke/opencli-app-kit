@echo off
setlocal
cd /d "%~dp0.."
echo Building compiled sample to verify OpenCLI and daemon imports...
bun build --compile --outfile sample/sample.exe sample/main.js
set TESTRESULT=%ERRORLEVEL%
if not "%TESTRESULT%"=="0" exit /b %TESTRESULT%
echo Compiled sample import check passed.
exit /b %TESTRESULT%
