@echo off
set ONLY_CHANGED=
if "%~1"=="--only-changed" set ONLY_CHANGED=--only-changed
if not exist "%~dp0analyze_code_config.bat" (
    echo ERROR: analyze_code_config.bat not found.
    echo Copy analyze_code_config.example.bat to analyze_code_config.bat and set your CLI_ANALYZER_PATH and LANGUAGE.
    exit /b 1
)
call "%~dp0analyze_code_config.bat"
cd /d "%~dp0.."

"%CLI_ANALYZER_PATH%\venv\Scripts\python.exe" "%CLI_ANALYZER_PATH%\main.py" --language %LANGUAGE% --path "." %ONLY_CHANGED% --fail-on-warnings --verbosity minimal --output "code_analysis_results" --rules "code_analysis_rules.json"
set RC=%ERRORLEVEL%

cd /d "%~dp0"
exit /b %RC%
