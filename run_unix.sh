#!/bin/bash

echo "============================================"
echo "   LinguaLink - Multilingual Duplicate Detection"
echo "============================================"
echo ""
echo "Starting LinguaLink server..."
echo ""

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.11+ from https://python.org"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing/updating dependencies..."
pip install -r requirements.txt

# Check if installation was successful
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies"
    exit 1
fi

# Start the server
echo ""
echo "============================================"
echo "Starting LinguaLink Dashboard..."
echo "============================================"
echo ""
echo "Dashboard will be available at: http://localhost:8000"
echo "API Documentation: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
