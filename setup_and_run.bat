@echo off
echo.
echo  ================================================
echo   LinguaLink - One-Click Setup and Launch
echo  ================================================
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)

echo [1/3] Installing Python dependencies...
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

if %errorlevel% neq 0 (
    echo [ERROR] Dependency installation failed. Check your internet connection.
    pause
    exit /b 1
)

echo.
echo [2/3] Dependencies installed successfully!
echo.
echo [3/3] Starting LinguaLink server...
echo.
echo  NOTE: First run will download the LaBSE AI model (~1.8 GB).
echo  This only happens ONCE. Subsequent starts are fast.
echo.
echo  Dashboard will be available at: http://localhost:8000
echo  API Docs will be available at:  http://localhost:8000/docs
echo.
echo  Press Ctrl+C to stop the server.
echo  ================================================
echo.

python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause
