@echo off
echo.
echo ================================
echo   DocuMind AI - Backend Server
echo ================================
echo.

REM Check if .env has the Gemini key set
findstr /C:"PASTE_YOUR_GEMINI_KEY_HERE" .env >nul 2>&1
if %errorlevel% == 0 (
    echo [ERROR] You haven't set your Gemini API key yet!
    echo.
    echo  1. Open backend\.env in VS Code or Notepad
    echo  2. Replace  PASTE_YOUR_GEMINI_KEY_HERE
    echo     with your actual key from:
    echo     https://makersuite.google.com/app/apikey
    echo.
    pause
    exit /b 1
)

echo [OK] Gemini API key found
echo [OK] Activating virtual environment...
call venv\Scripts\activate

echo [OK] Starting FastAPI server on http://localhost:8000
echo [OK] API docs at http://localhost:8000/docs
echo.
echo Press Ctrl+C to stop the server
echo.

venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
