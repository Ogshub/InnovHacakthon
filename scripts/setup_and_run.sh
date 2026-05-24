#!/bin/bash

echo ""
echo " ================================================"
echo "  LinguaLink - One-Click Setup and Launch"
echo " ================================================"
echo ""

# Check Python 3
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 not found. Please install Python 3.11+ from https://python.org"
    exit 1
fi

echo "[1/3] Installing Python dependencies..."
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

if [ $? -ne 0 ]; then
    echo "[ERROR] Dependency installation failed. Check your internet connection."
    exit 1
fi

echo ""
echo "[2/3] Dependencies installed successfully!"
echo ""
echo "[3/3] Starting LinguaLink server..."
echo ""
echo " NOTE: First run will download the LaBSE AI model (~1.8 GB)."
echo " This only happens ONCE. Subsequent starts are fast."
echo ""
echo " Dashboard: http://localhost:8000"
echo " API Docs:  http://localhost:8000/docs"
echo ""
echo " Press Ctrl+C to stop the server."
echo " ================================================"
echo ""

python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
