@echo off
chcp 65001 >nul
title NRG-UA - Налаштування середовища

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          NRG-UA Energy - Налаштування середовища             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0auto-setup.ps1"

echo.
echo Для запуску демо використовуйте START-DEMO.bat
echo.
pause
