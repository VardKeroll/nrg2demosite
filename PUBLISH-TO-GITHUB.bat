@echo off
chcp 65001 >nul
title NRG-UA - Публікація на GitHub
cd /d "%~dp0"

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          NRG-UA Energy - Публікація на GitHub                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Перевірка чи встановлено Git
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ПОМИЛКА] Git не знайдено!
    echo.
    echo Встановіть Git з https://git-scm.com/downloads
    echo.
    pause
    exit /b 1
)

echo [1/5] Перевірка Git...
echo       ✓ Git знайдено
echo.

:: Перевірка чи ініціалізовано Git
if not exist ".git" (
    echo [2/5] Ініціалізація Git репозиторію...
    git init
    echo       ✓ Git ініціалізовано
) else (
    echo [2/5] Git репозиторій вже ініціалізовано
)
echo.

echo [3/5] Додавання файлів...
git add .
echo       ✓ Файли додано
echo.

echo [4/5] Створення коміту...
git commit -m "NRG-UA Energy - готовий до публікації на GitHub Pages"
echo       ✓ Коміт створено
echo.

echo [5/5] Наступні кроки (виконайте вручну):
echo.
echo ════════════════════════════════════════════════════════════════
echo  1. Створіть репозиторій на GitHub.com
echo  2. Скопіюйте URL репозиторію
echo  3. Виконайте команди:
echo.
echo     git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git
echo     git branch -M main
echo     git push -u origin main
echo.
echo  4. GitHub → Settings → Pages → Source: GitHub Actions
echo  5. Дочекайтесь деплою (Actions вкладка)
echo ════════════════════════════════════════════════════════════════
echo.
echo 📚 Детальна інструкція: GITHUB_PAGES.md
echo.

pause
