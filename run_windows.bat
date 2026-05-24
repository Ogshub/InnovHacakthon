@echo off
echo ============================================
echo    LinguaLink - Multilingual Duplicate Detection
echo ============================================
echo.
echo Starting LinguaLink server...
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing/updating dependencies...
pip install -r requirements.txt

REM Check if installation was successful
if errorlevel 1 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)

REM Start the server
echo.
echo ============================================
echo Starting LinguaLink Dashboard...
echo ============================================
echo.
echo Dashboard will be available at: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

py -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
