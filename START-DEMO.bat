@echo off
chcp 65001 >nul
title NRG-UA Demo Server
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                    NRG-UA Demo Server                        ║
echo ║                                                              ║
echo ║  Сайт відкриється автоматично в браузері                     ║
echo ║  Для зупинки натисніть Ctrl+C або закрийте це вікно          ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Встановлюємо Python в змінну
set PYTHON_CMD=python

:: Перевіряємо чи є віртуальне середовище
if exist "venv\Scripts\python.exe" (
    echo [OK] Знайдено віртуальне середовище venv
    set PYTHON_CMD=venv\Scripts\python.exe
    goto :run_server
)

if exist ".venv\Scripts\python.exe" (
    echo [OK] Знайдено віртуальне середовище .venv
    set PYTHON_CMD=.venv\Scripts\python.exe
    goto :run_server
)

:: Перевіряємо чи є системний Python
where python >nul 2>nul
if %errorlevel% equ 0 (
    echo [OK] Знайдено системний Python
    echo [УВАГА] Рекомендується налаштувати віртуальне середовище
    echo          Запустіть SETUP.bat для повного налаштування
    echo.
    goto :run_server
)

:: Python не знайдено - запускаємо автоматичне налаштування
echo [УВАГА] Python не знайдено!
echo.
echo Запускаю автоматичне налаштування середовища...
echo Це може зайняти 3-5 хвилин при першому запуску.
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0auto-setup.ps1"

if %errorlevel% neq 0 (
    echo.
    echo [ПОМИЛКА] Не вдалось налаштувати середовище автоматично
    echo.
    pause
    exit /b 1
)

:: Після налаштування перевіряємо venv
if exist "venv\Scripts\python.exe" (
    set PYTHON_CMD=venv\Scripts\python.exe
) else if exist ".venv\Scripts\python.exe" (
    set PYTHON_CMD=.venv\Scripts\python.exe
) else (
    set PYTHON_CMD=python
)

echo.
echo ✓ Python налаштовано! Продовжую запуск демо...
echo.

:run_server

:run_server
:: Запускаємо сервер на порту 3000
echo.
echo ════════════════════════════════════════════════════════════════
echo  Запуск сервера на http://localhost:3000
echo  Використовую: %PYTHON_CMD%
echo ════════════════════════════════════════════════════════════════
echo.

:: Відкриваємо браузер через 2 секунди
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000/nrg-index.html"

:: Запускаємо Python HTTP сервер
%PYTHON_CMD% -m http.server 3000

pause
