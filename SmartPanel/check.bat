@echo off
TITLE SmartPanel — Diagnostika
echo.
echo  ============================================
echo   SmartPanel ishlayaptimi? Tekshiruv...
echo  ============================================
echo.

echo [1] Python jarayonlari (pythonw.exe / python.exe):
tasklist /FI "IMAGENAME eq pythonw.exe" 2>nul | findstr /i "pythonw"
IF %ERRORLEVEL% NEQ 0 (
    echo     -- pythonw.exe topilmadi
)
tasklist /FI "IMAGENAME eq python.exe" 2>nul | findstr /i "python"
IF %ERRORLEVEL% NEQ 0 (
    echo     -- python.exe topilmadi
)

echo.
echo [2] Qt / SmartPanel jarayonlari:
tasklist /FI "IMAGENAME eq python.exe" /FO TABLE /NH 2>nul
tasklist /FI "IMAGENAME eq pythonw.exe" /FO TABLE /NH 2>nul

echo.
echo [3] Agar jarayon ko'rinmasa — SmartPanel ishlamayapti.
echo     Agar ko'rinsa — orb ekranda bor, lekin yashiringan.
echo.
echo [4] Barcha ochiq oynalar (tasklist viraqasi):
tasklist /FI "STATUS eq RUNNING" /FO TABLE /NH 2>nul | findstr /i "python"

echo.
echo  ============================================
echo   Natija yuqorida. Enter bosing...
echo  ============================================
pause
