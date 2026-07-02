@echo off
chcp 65001 >nul
title NRG-UA Backend API
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                   NRG-UA Backend API                         ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Перевіряємо віртуальне середовище
set PYTHON_CMD=python

if exist "venv\Scripts\python.exe" (
    echo [OK] Використовую venv
    set PYTHON_CMD=venv\Scripts\python.exe
) else if exist ".venv\Scripts\python.exe" (
    echo [OK] Використовую .venv
    set PYTHON_CMD=.venv\Scripts\python.exe
) else (
    echo [УВАГА] Віртуальне середовище не знайдено!
    echo          Запустіть SETUP.bat для налаштування
    echo.
    echo Спробую використати системний Python...
    where python >nul 2>nul
    if %errorlevel% neq 0 (
        echo [ПОМИЛКА] Python не знайдено!
        echo.
        echo Запустіть SETUP.bat для автоматичного налаштування.
        pause
        exit /b 1
    )
)

echo.
echo ════════════════════════════════════════════════════════════════
echo  Запуск Backend API
echo  Python: %PYTHON_CMD%
echo ════════════════════════════════════════════════════════════════
echo.
echo  API доступне на: http://localhost:8000
echo  Документація:    http://localhost:8000/docs
echo.
echo  Для зупинки натисніть Ctrl+C
echo ════════════════════════════════════════════════════════════════
echo.

:: Переходимо в папку backend
cd backend

:: Запускаємо uvicorn
..\%PYTHON_CMD% -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
