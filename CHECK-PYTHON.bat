@echo off
chcp 65001 >nul
title NRG-UA - Перевірка Python середовища
cd /d "%~dp0"

echo.
echo Запускаю перевірку Python середовища...
echo.

:: Визначаємо Python
set PYTHON_CMD=python

if exist "venv\Scripts\python.exe" (
    set PYTHON_CMD=venv\Scripts\python.exe
) else if exist ".venv\Scripts\python.exe" (
    set PYTHON_CMD=.venv\Scripts\python.exe
)

:: Запускаємо перевірку
%PYTHON_CMD% check_environment.py

echo.
pause
