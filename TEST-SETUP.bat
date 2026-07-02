@echo off
chcp 65001 >nul
title NRG-UA - Перевірка налаштування
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║              NRG-UA - Перевірка налаштування                 ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

set ERRORS=0

:: Перевірка 1: Python
echo [1/6] Перевірка Python...
where python >nul 2>nul
if %errorlevel% equ 0 (
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do set PYVER=%%i
    echo       ✓ Python знайдено: !PYVER!
) else (
    echo       ✗ Python НЕ знайдено
    set /a ERRORS+=1
)

:: Перевірка 2: Віртуальне середовище
echo [2/6] Перевірка віртуального середовища...
if exist "venv\Scripts\python.exe" (
    echo       ✓ Віртуальне середовище: venv\
) else if exist ".venv\Scripts\python.exe" (
    echo       ✓ Віртуальне середовище: .venv\
) else (
    echo       ✗ Віртуальне середовище НЕ знайдено
    set /a ERRORS+=1
)

:: Перевірка 3: Конфігураційні файли
echo [3/6] Перевірка конфігураційних файлів...
if exist ".python-version" (
    echo       ✓ .python-version
) else (
    echo       ✗ .python-version відсутній
    set /a ERRORS+=1
)

if exist "pyproject.toml" (
    echo       ✓ pyproject.toml
) else (
    echo       ✗ pyproject.toml відсутній
    set /a ERRORS+=1
)

:: Перевірка 4: Backend
echo [4/6] Перевірка backend файлів...
if exist "backend\requirements.txt" (
    echo       ✓ backend\requirements.txt
) else (
    echo       ⚠ backend\requirements.txt відсутній
)

if exist "backend\main.py" (
    echo       ✓ backend\main.py
) else (
    echo       ⚠ backend\main.py відсутній
)

:: Перевірка 5: Frontend
echo [5/6] Перевірка frontend файлів...
if exist "nrg-index.html" (
    echo       ✓ nrg-index.html
) else (
    echo       ✗ nrg-index.html відсутній
    set /a ERRORS+=1
)

:: Перевірка 6: Скрипти запуску
echo [6/6] Перевірка скриптів запуску...
if exist "START-DEMO.bat" (
    echo       ✓ START-DEMO.bat
) else (
    echo       ✗ START-DEMO.bat відсутній
    set /a ERRORS+=1
)

if exist "auto-setup.ps1" (
    echo       ✓ auto-setup.ps1
) else (
    echo       ✗ auto-setup.ps1 відсутній
    set /a ERRORS+=1
)

:: Підсумок
echo.
echo ════════════════════════════════════════════════════════════════
if %ERRORS% equ 0 (
    echo  ✅ ВСІПЕРЕВІРКИ ПРОЙДЕНО УСПІШНО!
    echo.
    echo  Проект готовий до запуску.
    echo  Використовуйте START-DEMO.bat для запуску.
) else (
    echo  ⚠ ЗНАЙДЕНО %ERRORS% ПРОБЛЕМ
    echo.
    echo  Рекомендовано запустити SETUP.bat для налаштування.
)
echo ════════════════════════════════════════════════════════════════
echo.

pause
