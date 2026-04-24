@echo off
setlocal EnableDelayedExpansion

REM Path to virtual environment
set VENV_DIR=%~dp0venv
set VENV_PYTHON=%VENV_DIR%\Scripts\python.exe

REM Verify venv exists
if not exist "%VENV_PYTHON%" (
    echo Virtual environment not found at %VENV_DIR%
    echo Please create it with: python -m venv venv
    pause
    exit /b 1
)

REM Set PYTHONPATH to include venv site-packages
for /f "delims=" %%i in ('"%VENV_PYTHON%" -c "import site; print(site.getsitepackages()[0])"') do set SITE_PACKAGES=%%i
set PYTHONPATH=%SITE_PACKAGES%;%PYTHONPATH%

REM Run uvicorn with venv Python (without --reload to avoid subprocess issues)
"%VENV_PYTHON%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
