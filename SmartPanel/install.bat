@echo off
TITLE SmartPanel — Installer
echo.
echo  ====================================
echo   SmartPanel — Installing dependencies
echo  ====================================
echo.

REM Check Python
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found. Please install Python 3.10+ from https://python.org
    pause
    exit /b 1
)

echo [1/3] Upgrading pip...
python -m pip install --upgrade pip --quiet

echo [2/3] Installing PySide6 + QtWebEngine...
python -m pip install PySide6 PySide6-Addons requests --quiet

echo [3/3] Installing pynput for global hotkeys...
python -m pip install pynput --quiet

echo.
echo  ====================================
echo   Installation complete!
echo   Run SmartPanel.bat to start the app
echo  ====================================
echo.
pause
