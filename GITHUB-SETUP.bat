@echo off
chcp 65001 >nul
title GitHub Pages - Швидке налаштування
cd /d "%~dp0"

cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║         GitHub Pages - Швидке налаштування (3 хв)            ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo.

echo ════════════════════════════════════════════════════════════════
echo  КРОК 1: Створіть репозиторій на GitHub
echo ════════════════════════════════════════════════════════════════
echo.
echo  1. Відкрийте: https://github.com/new
echo  2. Repository name: nrg-ua-energy
echo  3. Public (поставте галочку)
echo  4. НЕ створюйте README, .gitignore
echo  5. Create repository
echo.
pause
echo.

echo ════════════════════════════════════════════════════════════════
echo  КРОК 2: Введіть ваш GitHub username
echo ════════════════════════════════════════════════════════════════
echo.
set /p GITHUB_USER="Ваш GitHub username: "
echo.
echo  Використовую: %GITHUB_USER%
echo.

echo ════════════════════════════════════════════════════════════════
echo  КРОК 3: Підключаю репозиторій
echo ════════════════════════════════════════════════════════════════
echo.

git remote remove origin 2>nul
git remote add origin https://github.com/%GITHUB_USER%/nrg-ua-energy.git

if %errorlevel% equ 0 (
    echo  ✓ Репозиторій підключено
) else (
    echo  ✗ Помилка підключення
    echo.
    echo  Перевірте що репозиторій створено на GitHub!
    pause
    exit /b 1
)
echo.

echo ════════════════════════════════════════════════════════════════
echo  КРОК 4: Перейменовую гілку на main
echo ════════════════════════════════════════════════════════════════
echo.

git branch -M main
echo  ✓ Гілку перейменовано
echo.

echo ════════════════════════════════════════════════════════════════
echo  КРОК 5: Завантажую код на GitHub
echo ════════════════════════════════════════════════════════════════
echo.
echo  Зараз відкриється вікно авторизації GitHub...
echo  Введіть ваш логін та пароль (або Personal Access Token)
echo.
pause
echo.

git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo  ✅ КОД ЗАВАНТАЖЕНО НА GITHUB!
    echo.
) else (
    echo.
    echo  ⚠ Помилка завантаження
    echo.
    echo  Можливі причини:
    echo  - Неправильний логін/пароль
    echo  - Репозиторій не створено
    echo  - Немає інтернету
    echo.
    echo  Спробуйте ще раз або використайте GitHub Desktop
    pause
    exit /b 1
)

echo ════════════════════════════════════════════════════════════════
echo  КРОК 6: Налаштуйте GitHub Pages
echo ════════════════════════════════════════════════════════════════
echo.
echo  1. Відкрийте: https://github.com/%GITHUB_USER%/nrg-ua-energy
echo  2. Settings → Pages
echo  3. Source: GitHub Actions (або Deploy from a branch)
echo  4. Save
echo  5. Дочекайтесь деплою (Actions вкладка, 2-5 хв)
echo.
echo  Ваш сайт буде тут:
echo  https://%GITHUB_USER%.github.io/nrg-ua-energy/nrg-index.html
echo.
echo ════════════════════════════════════════════════════════════════
echo.

:: Відкриваємо GitHub репозиторій
start https://github.com/%GITHUB_USER%/nrg-ua-energy/settings/pages

echo.
echo  🎉 МАЙЖЕ ГОТОВО!
echo.
echo  Налаштуйте GitHub Pages у браузері (відкрилось автоматично)
echo  і через 5 хвилин ваш сайт буде онлайн!
echo.
pause
